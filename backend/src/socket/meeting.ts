import { Server, Socket } from 'socket.io'
import { Types } from 'mongoose'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { AuthenticatedSocket } from './auth'
import {
    createMeeting,
    joinMeeting as joinMeetingService,
    leaveMeeting as leaveMeetingService,
    endMeeting as endMeetingService,
    computeNextOccurrenceDate,
    getMeetingByMeetingId
} from '../modules/meeting/meeting.service'
import { Meeting } from '../modules/meeting/meeting.model'
import { getEffectivePlanForOrg, getEffectivePlanForUser } from '../modules/plan/planEntitlements'
import { SocketEvents } from './events'
import { adHocRoomSettings } from '../routes/guest.routes'
import { dispatchWebhookEvent } from '../modules/integration/integration.service'
import { setUserPresenceState } from './presence'
import { cleanupWhiteboard } from './whiteboard'
import { cleanupMeetingQA } from './meetingQA'
import { cleanupPolls } from './poll'
import { cleanupBreakout, getActiveBreakoutSession } from './breakout'
import { registerApprovedGuestHandlers } from './index'
import { liveBroadcastService } from '../modules/webrtc/liveBroadcast.service'
import { liveStreamService } from '../services/livestream.service'
import { telephonyMediaService } from '../services/telephonyMedia.service'
import { cloudRecordingWorker } from '../workers/cloudRecording.worker'
import { clearMeetingPeerSessions } from '../modules/webrtc/peer.manager'
import { saveMeetingState, loadMeetingState, deleteMeetingState } from '../services/meetingStateStore'

// Track backstage participants per meeting room for Virtual Green Room
const meetingBackstageMap = new Map<string, Set<string>>()
// Track authorized remote control session per meeting room
const activeRemoteControllers = new Map<string, { controllerId: string; presenterId: string }>()
// Track promoted Co-Hosts per meeting room in memory (supports both ObjectId members & guest IDs / ad-hoc rooms)
const meetingCoHostsMap = new Map<string, Set<string>>()
// Track active Confidential Watermark state per meeting room
const meetingWatermarkMap = new Map<string, boolean>()
// Track raised hands per meeting room so refreshing users keep hand-raise state
const meetingRaisedHandsMap = new Map<string, Set<string>>()
// Track shared meeting notes per meeting room (synced with Redis + MongoDB)
const meetingNotesMap = new Map<string, string>()

export async function verifyIsHostOrCoHost(meetingId: string, checkUserId: string): Promise<boolean> {
    try {
        if (!meetingId || !checkUserId) return false
        if (meetingCoHostsMap.get(meetingId)?.has(String(checkUserId))) {
            return true
        }
        const meeting = await getMeetingByMeetingId(meetingId)
        if (!meeting) return false
        const hostId = (meeting.host as any)?._id ? String((meeting.host as any)._id) : String(meeting.host)
        if (hostId === String(checkUserId)) return true
        if (Array.isArray(meeting.coHosts) && meeting.coHosts.some(id => {
            const coHostId = (id as any)?._id ? String((id as any)._id) : String(id)
            return coHostId === String(checkUserId)
        })) return true
        return false
    } catch {
        return false
    }
}

let liveStreamStatusListenerInitialized = false
function ensureLiveStreamStatusListener(io: Server) {
    if (liveStreamStatusListenerInitialized) return
    liveStreamStatusListenerInitialized = true
    liveStreamService.on('stream:status', ({ meetingId, status, error, code }: any) => {
        io.to(`meeting:${meetingId}`).emit(SocketEvents.LIVESTREAM_STATUS, {
            meetingId,
            isStreaming: status === 'live',
            status,
            error,
            code
        })
    })
    liveStreamService.on('stream:request-keyframe', ({ meetingId }: any) => {
        io.to(`meeting:${meetingId}`).emit('meeting:livestream-request-keyframe', { meetingId })
    })
}

export function registerMeetingHandlers(io: Server, socket: Socket) {
    ensureLiveStreamStatusListener(io)
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.MEETING_CREATE, async (payload: { title: string }) => {
        if (!userId || !payload?.title || typeof payload.title !== 'string') {
            socket.emit('error', { message: 'Invalid meeting creation payload' })
            return
        }

        const meeting = await createMeeting(userId, payload.title)
        socket.emit(SocketEvents.MEETING_CREATE, meeting)
        io.emit(SocketEvents.MEETING_CREATE, meeting)
    })

    socket.on(SocketEvents.MEETING_JOIN, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        try {
            const existingMeeting = await getMeetingByMeetingId(payload.meetingId)
            const orgIdRaw = (existingMeeting?.organizationId as any)?._id || existingMeeting?.organizationId
            const hostIdRaw = (existingMeeting?.host as any)?._id || existingMeeting?.host
            const [orgPlan, hostUserPlan, joiningUserPlan] = await Promise.all([
                orgIdRaw ? getEffectivePlanForOrg(String(orgIdRaw)) : Promise.resolve(null),
                getEffectivePlanForUser(String(hostIdRaw || userId)),
                String(hostIdRaw || userId) !== String(userId) ? getEffectivePlanForUser(String(userId)) : Promise.resolve(null)
            ])
            const candidatePlans = [orgPlan, hostUserPlan, joiningUserPlan].filter(Boolean) as any[]
            candidatePlans.sort((a, b) => {
                if (a.planTier === 'enterprise' && b.planTier !== 'enterprise') return -1
                if (b.planTier === 'enterprise' && a.planTier !== 'enterprise') return 1
                if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1
                return (b.priceMonthly || 0) - (a.priceMonthly || 0)
            })
            const effectivePlan = candidatePlans[0] || hostUserPlan

            const roomSize = io.sockets.adapter.rooms.get(`meeting:${payload.meetingId}`)?.size || 0
            const dbParticipantCount = existingMeeting?.participants?.length || 0
            const liveCount = Math.max(dbParticipantCount, roomSize)
            const alreadyIn = Boolean(
                existingMeeting?.participants?.some(p => String((p as any)?._id || p) === String(userId)) ||
                socket.rooms.has(`meeting:${payload.meetingId}`)
            )
            if (!alreadyIn && liveCount >= effectivePlan.limits.maxParticipantsPerCall) {
                socket.emit('error', {
                    message: `Room capacity reached (${effectivePlan.limits.maxParticipantsPerCall} max participants for ${effectivePlan.planTier.toUpperCase()} plan).`
                })
                return
            }

            const meeting = await joinMeetingService(payload.meetingId, userId)
            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            socket.join(`meeting:${payload.meetingId}`)
            authSocket.meetingId = payload.meetingId

            socket.emit('meeting:plan-limits', {
                planTier: effectivePlan.planTier,
                isPaid: effectivePlan.isPaid,
                maxMeetingDurationMins: effectivePlan.limits.maxMeetingDurationMins,
                maxParticipantsPerCall: effectivePlan.limits.maxParticipantsPerCall,
                features: effectivePlan.features
            })

            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_JOIN, { meetingId: payload.meetingId, participants: meeting.participants })

            // Auto-switch user presence status to in_meeting
            if (!authSocket.isGuest && userId) {
                setUserPresenceState(userId, 'in_meeting')
                io.emit(SocketEvents.PRESENCE_UPDATE, { userId, status: 'in_meeting' })
            }

            // Notify waiting room / lobby guests that the host has arrived
            const inMemoryCoHosts = meetingCoHostsMap.get(payload.meetingId)
            const isHostOrCoHost =
                String(meeting.host) === String(userId) ||
                Boolean(inMemoryCoHosts?.has(String(userId))) ||
                Boolean(meeting.coHosts && meeting.coHosts.some(id => String((id as any)?._id || id) === String(userId)))
            if (isHostOrCoHost) {
                const hostName = authSocket.guestName || 'Organizer'
                io.to(`lobby:${payload.meetingId}`).emit('meeting:host-joined', { hostName, meetingId: payload.meetingId })
            }

            // Sync user role so UI can accurately show host controls or hide them for guests
            socket.emit('meeting:role', {
                role: isHostOrCoHost ? 'host' : 'participant',
                isHost: String(meeting.host) === String(userId)
            })

            // Sync active raised hands to joining/refreshing participant
            let raisedHandsSet = meetingRaisedHandsMap.get(payload.meetingId)
            if (!raisedHandsSet) {
                const restoredHands = await loadMeetingState<string[]>('hands', payload.meetingId)
                if (restoredHands && restoredHands.length > 0) {
                    raisedHandsSet = new Set(restoredHands)
                    meetingRaisedHandsMap.set(payload.meetingId, raisedHandsSet)
                }
            }
            if (raisedHandsSet && raisedHandsSet.size > 0) {
                socket.emit('meeting:hands-sync', {
                    meetingId: payload.meetingId,
                    raisedUserIds: Array.from(raisedHandsSet)
                })
            }

            // Sync persisted Shared Meeting Notes to joining/refreshing participant
            let sharedNotes = meetingNotesMap.get(payload.meetingId)
            if (sharedNotes === undefined) {
                const restoredNotes = await loadMeetingState<string>('notes', payload.meetingId)
                if (typeof restoredNotes === 'string') {
                    sharedNotes = restoredNotes
                } else if (typeof (meeting as any).sharedNotes === 'string' && (meeting as any).sharedNotes) {
                    sharedNotes = (meeting as any).sharedNotes
                }
                if (sharedNotes !== undefined) {
                    meetingNotesMap.set(payload.meetingId, sharedNotes)
                }
            }
            if (sharedNotes) {
                socket.emit('meeting:notes-sync', {
                    meetingId: payload.meetingId,
                    notes: sharedNotes
                })
            }

            // Sync all active Co-Hosts to the joining/refreshing user
            const allCoHosts = new Set<string>([
                ...(inMemoryCoHosts ? Array.from(inMemoryCoHosts) : []),
                ...(Array.isArray(meeting.coHosts) ? meeting.coHosts.map(id => String((id as any)?._id || id)) : [])
            ])
            allCoHosts.forEach(coHostUserId => {
                socket.emit(SocketEvents.MEETING_COHOST_PROMOTE, {
                    targetUserId: coHostUserId,
                    meetingId: payload.meetingId
                })
            })

            // Sync room lock and confidential watermark states on join or page refresh
            if (meeting.isLocked) {
                socket.emit('meeting:lock-toggle', { meetingId: payload.meetingId, isLocked: true })
            }
            if (meetingWatermarkMap.get(payload.meetingId)) {
                socket.emit('meeting:toggle-watermark', { enabled: true })
            }
            if (meeting.isWebinarMode) {
                socket.emit('webinar:mode-changed', { isWebinarMode: true })
            }
            if (meeting.screenSharePolicy) {
                socket.emit('meeting:screen-share-policy', { policy: meeting.screenSharePolicy })
            }

            // Sync virtual green room / backstage state to the joining user
            const currentBackstage = meetingBackstageMap.get(payload.meetingId)
            socket.emit(SocketEvents.STAGE_STATE_SYNC, {
                meetingId: payload.meetingId,
                backstageUsers: Array.from(currentBackstage || [])
            })

            // Sync live stream state to user on join or page refresh
            const activeLiveSession = liveStreamService.getStreamSession(payload.meetingId)
            if (activeLiveSession && !activeLiveSession.isExplicitlyStopped && activeLiveSession.status !== 'stopped') {
                socket.emit(SocketEvents.LIVESTREAM_STATUS, {
                    userId: activeLiveSession.userId,
                    meetingId: payload.meetingId,
                    isStreaming: true,
                    platform: activeLiveSession.options.platform || 'youtube',
                    broadcastTitle: activeLiveSession.options.broadcastTitle || 'Live Conference Broadcast',
                    startedAt: activeLiveSession.startedAt.toISOString()
                })
            }

            // Sync active breakout session to user on join or page refresh
            const activeBreakout = getActiveBreakoutSession(payload.meetingId)
            if (activeBreakout && activeBreakout.isActive) {
                socket.emit('breakout:started', {
                    meetingId: payload.meetingId,
                    rooms: activeBreakout.rooms,
                    endsAt: activeBreakout.endsAt
                })
            }
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Failed to join meeting' })
        }
    })

    const handleMeetingLeaveAction = async (payload?: { meetingId?: string }) => {
        const targetMeetingId = payload?.meetingId || authSocket.meetingId
        const effectiveUserId = userId || authSocket.userId || socket.id
        if (!targetMeetingId || !effectiveUserId) {
            return
        }

        try {
            socket.leave(`meeting:${targetMeetingId}`)
            let participants: any[] = []
            try {
                if (!authSocket.isGuest && userId) {
                    const meeting = await leaveMeetingService(targetMeetingId, userId)
                    if (meeting?.participants) {
                        participants = meeting.participants
                    }
                    // Restore user presence status to online
                    setUserPresenceState(userId, 'online')
                    io.emit(SocketEvents.PRESENCE_UPDATE, { userId, status: 'online' })
                }
            } catch (e) { }

            io.to(`meeting:${targetMeetingId}`).emit(SocketEvents.MEETING_LEAVE, {
                userId: effectiveUserId,
                meetingId: targetMeetingId,
                participants
            })
            io.to(`meeting:${targetMeetingId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId: effectiveUserId,
                meetingId: targetMeetingId
            })
        } catch (error: any) {
            console.warn('[MeetingSocket] Error in MEETING_LEAVE handler:', error)
        }
    }

    socket.on(SocketEvents.MEETING_LEAVE, handleMeetingLeaveAction)
    socket.on('meeting:leave', handleMeetingLeaveAction)

    socket.on(SocketEvents.MEETING_END, async (payload: { meetingId: string }) => {
        if (!userId) {
            return
        }

        try {
            const meeting = await endMeetingService(payload.meetingId, userId)
            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            // Cleanup transient in-memory & Redis meeting state across all modules
            meetingBackstageMap.delete(payload.meetingId)
            activeRemoteControllers.delete(payload.meetingId)
            meetingCoHostsMap.delete(payload.meetingId)
            meetingWatermarkMap.delete(payload.meetingId)
            meetingRaisedHandsMap.delete(payload.meetingId)
            meetingNotesMap.delete(payload.meetingId)
            void deleteMeetingState('hands', payload.meetingId)
            void deleteMeetingState('notes', payload.meetingId)
            cleanupWhiteboard(payload.meetingId)
            cleanupMeetingQA(payload.meetingId)
            cleanupPolls(payload.meetingId)
            cleanupBreakout(payload.meetingId)

            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_END, { meetingId: payload.meetingId, status: meeting.status, participants: meeting.participants })
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Forbidden' })
        }
    })

    const handleMuteUser = async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can mute participants' })
            return
        }

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_MUTE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`meeting:${payload.meetingId}`).emit('meeting:mute-user', { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.MEETING_MUTE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`user:${payload.targetUserId}`).emit('meeting:mute-user', { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    }
    socket.on(SocketEvents.MEETING_MUTE_USER, handleMuteUser)
    socket.on('meeting:mute-user', handleMuteUser)

    const handleUnmuteUser = async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can unmute participants' })
            return
        }

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_UNMUTE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`meeting:${payload.meetingId}`).emit('meeting:unmute-user', { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.MEETING_UNMUTE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`user:${payload.targetUserId}`).emit('meeting:unmute-user', { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    }
    socket.on(SocketEvents.MEETING_UNMUTE_USER, handleUnmuteUser)
    socket.on('meeting:unmute-user', handleUnmuteUser)

    socket.on(SocketEvents.MEETING_REMOVE_USER, async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const authorized = await verifyIsHostOrCoHost(payload.meetingId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can remove participants' })
            return
        }

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_REMOVE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId, kicked: true })
        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.MEETING_REMOVE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId, kicked: true })
    })

    socket.on(SocketEvents.MEETING_RAISE_HAND, (payload: { meetingId: string; raised: boolean }) => {
        if (!userId || !payload?.meetingId) return

        let raisedSet = meetingRaisedHandsMap.get(payload.meetingId)
        if (!raisedSet) {
            raisedSet = new Set<string>()
            meetingRaisedHandsMap.set(payload.meetingId, raisedSet)
        }
        if (payload.raised) {
            raisedSet.add(String(userId))
        } else {
            raisedSet.delete(String(userId))
        }
        void saveMeetingState('hands', payload.meetingId, Array.from(raisedSet))

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_RAISE_HAND, { userId, meetingId: payload.meetingId, raised: payload.raised })
    })

    socket.on('meeting:notes-update', async (payload: { meetingId: string; notes: string }) => {
        if (!userId || !payload?.meetingId || typeof payload.notes !== 'string') return
        const safeNotes = payload.notes.slice(0, 50000)
        meetingNotesMap.set(payload.meetingId, safeNotes)
        void saveMeetingState('notes', payload.meetingId, safeNotes)

        socket.to(`meeting:${payload.meetingId}`).emit('meeting:notes-sync', {
            meetingId: payload.meetingId,
            notes: safeNotes,
            updatedBy: userId
        })

        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        Meeting.updateOne({ meetingId: baseMeetId }, { $set: { sharedNotes: safeNotes } }).catch(() => {})
    })

    socket.on('meeting:speaking', (payload: { meetingId: string; isSpeaking: boolean }) => {
        if (!payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:speaking', {
            userId: userId || authSocket.userId || (socket as any).guestId,
            isSpeaking: !!payload.isSpeaking
        })
    })

    socket.on('meeting:record-toggle', async (payload: { meetingId: string; isRecording: boolean }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can toggle recording' })
            return
        }
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:record-toggle', { userId, isRecording: payload.isRecording })
        if (!payload.isRecording) {
            const meetingDoc = await Meeting.findOne({ meetingId: baseMeetId }).select('organizationId').lean().exec()
            if (meetingDoc?.organizationId) {
                dispatchWebhookEvent(String(meetingDoc.organizationId), 'recording.ready', {
                    meetingId: payload.meetingId,
                    stoppedBy: userId,
                    timestamp: new Date().toISOString()
                })
            }
        }
    })

    socket.on(SocketEvents.LIVESTREAM_TOGGLE, async (payload: { meetingId: string; isStreaming: boolean; platform: string; broadcastTitle?: string; streamUrl?: string; streamKey?: string; resolution?: '720p' | '1080p'; bitrate?: string }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can control livestream' })
            return
        }

        if (payload.isStreaming) {
            try {
                await liveStreamService.startStream({
                    meetingId: payload.meetingId,
                    userId,
                    platform: (payload.platform as any) || 'youtube',
                    serverUrl: payload.streamUrl,
                    streamKey: payload.streamKey || '',
                    broadcastTitle: payload.broadcastTitle,
                    resolution: payload.resolution || '720p',
                    bitrate: payload.bitrate
                })
                io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.LIVESTREAM_STATUS, {
                    userId,
                    meetingId: payload.meetingId,
                    isStreaming: true,
                    platform: payload.platform || 'youtube',
                    broadcastTitle: payload.broadcastTitle || 'Live Conference Broadcast',
                    startedAt: new Date().toISOString()
                })
            } catch (err: any) {
                console.error(`[LiveStream] Failed to start stream for meeting ${payload.meetingId}:`, err)
                socket.emit('meeting:livestream-error', { message: err?.message || 'Failed to start RTMP stream' })
            }
        } else {
            await liveStreamService.stopStream(payload.meetingId)
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.LIVESTREAM_STATUS, {
                userId,
                meetingId: payload.meetingId,
                isStreaming: false,
                platform: payload.platform || 'youtube',
                stoppedAt: new Date().toISOString()
            })
        }
    })

    socket.on(SocketEvents.LIVESTREAM_CHUNK, (payload: { meetingId: string; chunk: any }) => {
        if (!payload?.meetingId || !payload?.chunk) return
        liveStreamService.pushChunk(payload.meetingId, payload.chunk)
    })

    socket.on('meeting:audio-chunk-to-pstn', (payload: { meetingId: string; mulawBase64: string }) => {
        if (!payload?.meetingId || !payload?.mulawBase64) return
        telephonyMediaService.sendAudioToPstn(payload.meetingId, payload.mulawBase64)
    })

    socket.on('meeting:cloud-recording-chunk', (payload: { meetingId: string; chunk: any }) => {
        if (!payload?.meetingId || !payload?.chunk) return
        cloudRecordingWorker.pushRecordingChunk(payload.meetingId, payload.chunk)
    })

    socket.on(SocketEvents.MEETING_REACTION, (payload: { meetingId: string; emoji: string; senderName?: string }) => {
        if (!userId || !payload?.meetingId || !payload?.emoji) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_REACTION, {
            userId,
            meetingId: payload.meetingId,
            emoji: payload.emoji,
            senderName: payload.senderName || 'Participant'
        })
    })

    const handleWatermarkToggle = async (payload: { meetingId: string; enabled: boolean }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        meetingWatermarkMap.set(baseMeetId, Boolean(payload.enabled))
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:toggle-watermark', { enabled: Boolean(payload.enabled) })
    }
    socket.on('meeting:toggle-watermark', handleWatermarkToggle)

    socket.on(SocketEvents.MEETING_COHOST_PROMOTE, async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can promote co-hosts' })
            return
        }
        if (!meetingCoHostsMap.has(baseMeetId)) {
            meetingCoHostsMap.set(baseMeetId, new Set())
        }
        meetingCoHostsMap.get(baseMeetId)!.add(String(payload.targetUserId))
        if (Types.ObjectId.isValid(payload.targetUserId)) {
            try {
                await Meeting.updateOne(
                    { meetingId: baseMeetId },
                    { $addToSet: { coHosts: new Types.ObjectId(payload.targetUserId) } }
                ).exec()
            } catch (_) { }
        }
        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_COHOST_PROMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on(SocketEvents.MEETING_COHOST_DEMOTE, async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can demote co-hosts' })
            return
        }
        meetingCoHostsMap.get(baseMeetId)?.delete(String(payload.targetUserId))
        if (Types.ObjectId.isValid(payload.targetUserId)) {
            try {
                await Meeting.updateOne(
                    { meetingId: baseMeetId },
                    { $pull: { coHosts: new Types.ObjectId(payload.targetUserId) } }
                ).exec()
            } catch (_) { }
        }
        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_COHOST_DEMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on('meeting:permission-update', async (payload: { meetingId: string; targetUserId: string; permission: 'recording' | 'whiteboard' | 'screen-share'; enabled: boolean }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:permission-update', payload)
    })

    socket.on(SocketEvents.MEETING_WAITING_APPROVE, async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can approve participants' })
            return
        }

        try {
            if (Types.ObjectId.isValid(payload.targetUserId)) {
                await Meeting.updateOne(
                    { meetingId: baseMeetId },
                    {
                        $addToSet: { participants: new Types.ObjectId(payload.targetUserId) },
                        $pull: { waitingRoom: new Types.ObjectId(payload.targetUserId) }
                    }
                ).exec()
            }
        } catch (e) { }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.MEETING_WAITING_APPROVE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_WAITING_APPROVE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on('guest:approve', async (payload: { socketId?: string; guestSocketId?: string; meetingId?: string }) => {
        const targetSocketId = payload?.socketId || payload?.guestSocketId
        if (!userId || !targetSocketId) return

        const guestSocket = io.sockets.sockets.get(targetSocketId) as AuthenticatedSocket
        const targetMeetingId = payload?.meetingId || guestSocket?.meetingId
        if (!targetMeetingId) {
            socket.emit('error', { message: 'Forbidden: Meeting context is required to approve guests' })
            return
        }
        const baseMeetId = targetMeetingId.includes('__sub_') ? targetMeetingId.split('__sub_')[0] : targetMeetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can approve guests' })
            return
        }

        // Handle locally first (supports single-node in-memory dev fallback)
        if (guestSocket) {
            guestSocket.isPending = false
            guestSocket.leave(`lobby:${guestSocket.meetingId}`)
            registerApprovedGuestHandlers(io, guestSocket)

            // Persist approved participant in MongoDB Meeting document
            try {
                const baseMeetId = guestSocket.meetingId?.includes('__sub_') ? guestSocket.meetingId.split('__sub_')[0] : guestSocket.meetingId
                if (guestSocket.userId && Types.ObjectId.isValid(guestSocket.userId)) {
                    await Meeting.updateOne(
                        { meetingId: baseMeetId },
                        {
                            $addToSet: { participants: new Types.ObjectId(guestSocket.userId) },
                            $pull: { waitingRoom: new Types.ObjectId(guestSocket.userId) }
                        }
                    ).exec()
                }
            } catch (e) { }

            // Generate updated token
            const token = jwt.sign(
                {
                    userId: guestSocket.userId,
                    isGuest: guestSocket.isGuest || false,
                    guestName: guestSocket.guestName,
                    meetingId: guestSocket.meetingId,
                    isPending: false
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            )
            guestSocket.emit('guest:approved', { token })
            io.to(`user:${guestSocket.userId}`).emit('guest:approved', { token })
            io.to(`meeting:${guestSocket.meetingId}`).emit('guest:status-changed', { socketId: targetSocketId, status: 'approved' })
        }

        // Also emit to cluster
        io.serverSideEmit("internal:guest:approve-cluster", targetSocketId)
    })

    socket.on('guest:deny', async (payload: { socketId?: string; guestSocketId?: string; meetingId?: string }) => {
        const targetSocketId = payload?.socketId || payload?.guestSocketId
        if (!userId || !targetSocketId) return

        const guestSocket = io.sockets.sockets.get(targetSocketId) as AuthenticatedSocket
        const targetMeetingId = payload?.meetingId || guestSocket?.meetingId
        if (!targetMeetingId) {
            socket.emit('error', { message: 'Forbidden: Meeting context is required to deny guests' })
            return
        }
        const baseMeetId = targetMeetingId.includes('__sub_') ? targetMeetingId.split('__sub_')[0] : targetMeetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can deny guests' })
            return
        }

        // Handle locally first
        if (guestSocket) {
            guestSocket.emit('guest:denied')
            io.to(`user:${guestSocket.userId}`).emit('guest:denied')
            guestSocket.disconnect(true)
        }

        // Also emit to cluster
        io.serverSideEmit("internal:guest:deny-cluster", targetSocketId)
    })

    socket.on('guest:get-waiting', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${payload.meetingId}`)
        const waitingList: any[] = []
        if (lobbyRoom) {
            for (const sId of Array.from(lobbyRoom)) {
                const s = io.sockets.sockets.get(sId) as AuthenticatedSocket
                if (s && s.isPending) {
                    waitingList.push({
                        socketId: s.id,
                        userId: s.userId,
                        guestName: s.guestName || 'Guest',
                        email: s.email || '',
                        company: s.company || ''
                    })
                }
            }
        }
        // Emit as a raw array so the frontend handleWaitingList can process it directly
        socket.emit('guest:waiting-list', waitingList)
    })

    socket.on('guest:approve-all', async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can approve guests' })
            return
        }

        const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${payload.meetingId}`)
        if (lobbyRoom) {
            for (const sId of Array.from(lobbyRoom)) {
                const guestSocket = io.sockets.sockets.get(sId) as AuthenticatedSocket
                if (guestSocket && guestSocket.isPending) {
                    guestSocket.isPending = false
                    guestSocket.leave(`lobby:${guestSocket.meetingId}`)
                    registerApprovedGuestHandlers(io, guestSocket)

                    try {
                        const baseMeetId = guestSocket.meetingId?.includes('__sub_') ? guestSocket.meetingId.split('__sub_')[0] : guestSocket.meetingId
                        if (guestSocket.userId && Types.ObjectId.isValid(guestSocket.userId)) {
                            await Meeting.updateOne(
                                { meetingId: baseMeetId },
                                {
                                    $addToSet: { participants: new Types.ObjectId(guestSocket.userId) },
                                    $pull: { waitingRoom: new Types.ObjectId(guestSocket.userId) }
                                }
                            ).exec()
                        }
                    } catch (e) { }

                    const token = jwt.sign(
                        {
                            userId: guestSocket.userId,
                            isGuest: guestSocket.isGuest || false,
                            guestName: guestSocket.guestName,
                            email: guestSocket.email,
                            company: guestSocket.company,
                            meetingId: guestSocket.meetingId,
                            isPending: false
                        },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    )
                    guestSocket.emit('guest:approved', { token })
                }
            }
            io.to(`meeting:${payload.meetingId}`).emit('guest:status-changed', { status: 'all-approved' })
        }
    })

    socket.on('meeting:waiting-room-toggle', async (payload: { meetingId: string; enabled: boolean }) => {
        if (!userId || !payload?.meetingId) return
        const { meetingId, enabled } = payload
        const baseMeetId = meetingId.includes('__sub_') ? meetingId.split('__sub_')[0] : meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can toggle the waiting room' })
            return
        }

        try {
            await Meeting.findOneAndUpdate({ meetingId }, { isWaitingRoomEnabled: enabled })
        } catch (e) { }

        if (!adHocRoomSettings[meetingId]) adHocRoomSettings[meetingId] = {}
        adHocRoomSettings[meetingId].isWaitingRoomEnabled = enabled

        io.to(`meeting:${meetingId}`).emit('meeting:waiting-room-toggle', { meetingId, enabled })

        // If toggled OFF (Allow everyone without approval), auto-approve any guests currently waiting
        if (!enabled) {
            const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${meetingId}`)
            if (lobbyRoom) {
                for (const sId of Array.from(lobbyRoom)) {
                    const guestSocket = io.sockets.sockets.get(sId) as AuthenticatedSocket
                    if (guestSocket && guestSocket.isPending) {
                        guestSocket.isPending = false
                        guestSocket.leave(`lobby:${guestSocket.meetingId}`)
                        registerApprovedGuestHandlers(io, guestSocket)
                        const token = jwt.sign(
                            {
                                userId: guestSocket.userId,
                                isGuest: true,
                                guestName: guestSocket.guestName,
                                email: guestSocket.email,
                                company: guestSocket.company,
                                meetingId: guestSocket.meetingId,
                                isPending: false
                            },
                            JWT_SECRET,
                            { expiresIn: '24h' }
                        )
                        guestSocket.emit('guest:approved', { token })
                    }
                }
                io.to(`meeting:${meetingId}`).emit('guest:status-changed', { status: 'all-approved' })
            }
        }
    })

    const handleCameraToggle = (payload: { meetingId: string; isVideoOff: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:camera-toggle', {
            userId,
            isVideoOff: payload.isVideoOff
        })
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:video-toggle', {
            userId,
            isVideoOff: payload.isVideoOff
        })
    }
    socket.on('meeting:camera-toggle', handleCameraToggle)
    socket.on('meeting:video-toggle', handleCameraToggle)

    socket.on('meeting:mic-toggle', (payload: { meetingId: string; isMuted: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:mic-toggle', {
            userId,
            isMuted: payload.isMuted
        })
    })

    // Screen sharing broadcast relays
    socket.on('screen:start', (payload: { meetingId: string; userId?: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId) return
        io.to(`meeting:${mId}`).emit('screen:start', {
            meetingId: mId,
            userId: payload?.userId || userId || socket.id
        })
    })

    socket.on('screen:stop', (payload: { meetingId: string; userId?: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId) return
        const activeRemote = activeRemoteControllers.get(mId)
        if (activeRemote && userId && String(activeRemote.presenterId) === String(userId)) {
            activeRemoteControllers.delete(mId)
        }
        io.to(`meeting:${mId}`).emit('screen:stop', {
            meetingId: mId,
            userId: payload?.userId || userId || socket.id
        })
    })

    socket.on('screen:changed', (payload: { meetingId: string; userId?: string; active?: boolean }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId) return
        io.to(`meeting:${mId}`).emit('screen:changed', {
            meetingId: mId,
            userId: payload?.userId || userId || socket.id,
            active: payload?.active !== false
        })
    })

    socket.on(SocketEvents.MEETING_LOCK_TOGGLE, async (payload: { meetingId: string; isLocked: boolean }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can lock the meeting' })
            return
        }
        try {
            await Meeting.findOneAndUpdate({ meetingId: payload.meetingId }, { isLocked: payload.isLocked })
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_LOCK_TOGGLE, {
                meetingId: payload.meetingId,
                isLocked: payload.isLocked
            })
        } catch (err) {
            console.error('Failed to toggle meeting lock:', err)
        }
    })

    const handleMuteAll = async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can mute all participants' })
            return
        }
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_MUTE_ALL, {
            meetingId: payload.meetingId
        })
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:mute-all', {
            meetingId: payload.meetingId
        })
    }
    socket.on(SocketEvents.MEETING_MUTE_ALL, handleMuteAll)
    socket.on('meeting:mute-all', handleMuteAll)

    const handleUnmuteAll = async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can unmute all participants' })
            return
        }
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_UNMUTE_ALL, {
            meetingId: payload.meetingId
        })
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:unmute-all', {
            meetingId: payload.meetingId
        })
    }
    socket.on(SocketEvents.MEETING_UNMUTE_ALL, handleUnmuteAll)
    socket.on('meeting:unmute-all', handleUnmuteAll)

    socket.on(SocketEvents.MEETING_CAPTION, (payload: { meetingId: string; text: string; isFinal: boolean; speakerName?: string }) => {
        if (!userId || !payload?.meetingId || !payload?.text) return
        const speakerName = payload.speakerName || authSocket.guestName || 'Speaker'
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CAPTION, {
            userId,
            speakerName,
            text: payload.text,
            isFinal: payload.isFinal,
            timestamp: new Date()
        })
    })

    socket.on(SocketEvents.MEETING_NOTES_UPDATE, (payload: { meetingId: string; content: string }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_NOTES_UPDATE, {
            content: payload.content,
            updatedBy: authSocket.guestName || 'Participant',
            updatedAt: new Date()
        })
    })

    const handleEndMeeting = async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!authorized) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can end the meeting for all' })
            return
        }
        try {
            const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
            const meeting = await Meeting.findOne({ meetingId: baseMeetId })
            if (meeting) {
                meeting.endedAt = new Date()
                if (meeting.isRecurring && meeting.recurrencePattern && meeting.recurrencePattern !== 'none') {
                    const baseDate = meeting.scheduledDate || new Date().toISOString().slice(0, 10)
                    meeting.scheduledDate = computeNextOccurrenceDate(baseDate, meeting.recurrencePattern)
                    meeting.status = 'scheduled'
                    meeting.startedAt = null
                } else {
                    meeting.status = 'ended'
                }
                await meeting.save()
                dispatchWebhookEvent(meeting.organizationId?.toString(), 'meeting.ended', {
                    meetingId: payload.meetingId,
                    title: meeting.title,
                    endedAt: meeting.endedAt || new Date()
                }).catch(() => { })
            }
            // Broadcast meeting end to all participants in this room and subrooms
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_END, {
                meetingId: payload.meetingId,
                endedByHost: true
            })
            io.to(`meeting:${payload.meetingId}`).emit('meeting:end-all', {
                meetingId: payload.meetingId,
                endedByHost: true
            })
            if (baseMeetId !== payload.meetingId) {
                io.to(`meeting:${baseMeetId}`).emit(SocketEvents.MEETING_END, {
                    meetingId: baseMeetId,
                    endedByHost: true
                })
                io.to(`meeting:${baseMeetId}`).emit('meeting:end-all', {
                    meetingId: baseMeetId,
                    endedByHost: true
                })
            }
            if (baseMeetId) {
                await liveStreamService.stopStream(baseMeetId).catch(() => { })
            }
            clearMeetingPeerSessions(payload.meetingId)
            if (baseMeetId && baseMeetId !== payload.meetingId) {
                clearMeetingPeerSessions(baseMeetId)
            }
            io.serverSideEmit("internal:meeting:end-cluster", payload.meetingId)
        } catch (err) {
            console.error('Failed to end meeting for all:', err)
        }
    }

    socket.on(SocketEvents.MEETING_END_ALL, handleEndMeeting)
    socket.on('meeting:end-all', handleEndMeeting)
    socket.on(SocketEvents.MEETING_END, handleEndMeeting)
    socket.on('meeting:end', handleEndMeeting)

    socket.on('meeting:reaction', (payload: { meetingId: string; emoji: string; senderName?: string; senderId?: string }) => {
        if (!payload?.meetingId || !payload?.emoji) return
        const senderName = payload.senderName || authSocket.guestName || 'Participant'
        io.to(`meeting:${payload.meetingId}`).emit('meeting:reaction', {
            id: 'react_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            emoji: payload.emoji,
            senderName,
            senderId: payload.senderId || userId,
            left: 15 + Math.floor(Math.random() * 70), // Random swaying horizontal placement
            timestamp: Date.now()
        })
    })

    socket.on('meeting:soundboard', (payload: { meetingId: string; sound?: string; soundType?: string; senderName?: string }) => {
        const sound = payload?.sound || payload?.soundType
        if (!payload?.meetingId || !sound) return
        io.to(`meeting:${payload.meetingId}`).emit('meeting:soundboard', {
            sound,
            soundType: sound,
            senderName: payload.senderName || authSocket.guestName || 'Participant'
        })
    })

    // Meeting File Shared Broadcast
    socket.on('meeting:file:share', (payload: { meetingId: string; file: any; senderName?: string }) => {
        if (!payload?.meetingId || !payload?.file) return
        const senderDisplayName = payload.senderName || authSocket.guestName || (socket.handshake.query?.displayName as string) || 'A participant'
        io.to(`meeting:${payload.meetingId}`).emit('meeting:file:shared', {
            meetingId: payload.meetingId,
            file: payload.file,
            senderName: senderDisplayName,
            sharedAt: new Date()
        })
    })

    // Screen Share Annotation Events Relay
    socket.on('screen:annotation:stroke-start', (payload: { meetingId: string; stroke: any }) => {
        if (!payload?.meetingId || !payload?.stroke) return
        socket.to(`meeting:${payload.meetingId}`).emit('screen:annotation:stroke-start', payload)
    })

    socket.on('screen:annotation:stroke-point', (payload: { meetingId: string; strokeId: string; point: any }) => {
        if (!payload?.meetingId || !payload?.strokeId || !payload?.point) return
        socket.to(`meeting:${payload.meetingId}`).emit('screen:annotation:stroke-point', payload)
    })

    socket.on('screen:annotation:stroke-end', (payload: { meetingId: string; strokeId?: string }) => {
        if (!payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('screen:annotation:stroke-end', payload)
    })

    socket.on('screen:annotation:laser', (payload: { meetingId: string; point: any }) => {
        if (!payload?.meetingId || !payload?.point) return
        socket.to(`meeting:${payload.meetingId}`).emit('screen:annotation:laser', payload)
    })

    socket.on('screen:annotation:clear', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('screen:annotation:clear', payload)
    })

    socket.on('screen:annotation:toggle-permission', (payload: { meetingId: string; allowed: boolean }) => {
        if (!payload?.meetingId) return
        io.to(`meeting:${payload.meetingId}`).emit('screen:annotation:permission-changed', payload)
    })

    // Host Screen Sharing Policy Permissions Relay
    socket.on('meeting:set-screen-share-permission', async (payload: { meetingId: string; policy: 'everyone' | 'host_only' }) => {
        if (!userId || !payload?.meetingId || !payload?.policy) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        io.to(`meeting:${payload.meetingId}`).emit('meeting:screen-share-permission-changed', {
            meetingId: payload.meetingId,
            policy: payload.policy
        })
        Meeting.updateOne({ meetingId: payload.meetingId }, { screenSharePolicy: payload.policy }).exec().catch(() => { })
    })

    // Remote Desktop Control Events Relay
    socket.on('remote-control:request', (payload: { meetingId: string; requesterId: string; requesterName: string; targetUserId: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!userId || !mId || !payload?.targetUserId || !socket.rooms.has(`meeting:${mId}`)) return
        socket.to(`meeting:${mId}`).emit('remote-control:request', {
            ...payload,
            requesterId: userId,
            meetingId: mId,
            requesterName: authSocket.guestName || payload.requesterName || 'Participant'
        })
    })

    socket.on('remote-control:response', (payload: { meetingId: string; requesterId: string; granted: boolean; presenterId: string; presenterName?: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!userId || !mId || !payload?.requesterId || !socket.rooms.has(`meeting:${mId}`)) return
        if (String(payload.requesterId) === String(userId)) return
        if (payload.presenterId && String(payload.presenterId) !== String(userId)) {
            socket.emit('error', { message: 'Forbidden: Only the presenter can respond to remote control requests' })
            return
        }
        if (payload.granted) {
            activeRemoteControllers.set(mId, { controllerId: String(payload.requesterId), presenterId: String(userId) })
        } else {
            const current = activeRemoteControllers.get(mId)
            if (!current || String(current.presenterId) === String(userId)) {
                activeRemoteControllers.delete(mId)
            }
        }
        socket.to(`meeting:${mId}`).emit('remote-control:response', {
            ...payload,
            presenterId: userId,
            meetingId: mId
        })
    })

    socket.on('remote-control:revoke', async (payload: { meetingId: string; controllerId?: string; presenterId: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!userId || !mId || !socket.rooms.has(`meeting:${mId}`)) return
        const current = activeRemoteControllers.get(mId)
        const isCurrentParticipant =
            current && (String(current.presenterId) === String(userId) || String(current.controllerId) === String(userId))
        const baseMeetId = mId.includes('__sub_') ? mId.split('__sub_')[0] : mId
        const isHostOrCoHost = isCurrentParticipant ? true : await verifyIsHostOrCoHost(baseMeetId, userId)
        if (!isCurrentParticipant && !isHostOrCoHost) {
            socket.emit('error', { message: 'Forbidden: Only presenter, controller, or host can revoke remote control' })
            return
        }
        activeRemoteControllers.delete(mId)
        socket.to(`meeting:${mId}`).emit('remote-control:revoke', {
            ...payload,
            meetingId: mId
        })
    })

    const relayRemoteControlInput = (eventName: string, payload: any, hasRequiredField: boolean = true) => {
        if (!hasRequiredField || !userId) return
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId || !socket.rooms.has(`meeting:${mId}`)) return
        const activeSession = activeRemoteControllers.get(mId)
        if (!activeSession || String(activeSession.controllerId) !== String(userId)) {
            return
        }
        io.to(`user:${activeSession.presenterId}`).emit(eventName, {
            ...payload,
            controllerId: userId,
            meetingId: mId
        })
    }

    socket.on('remote-control:mouse', (payload: { meetingId: string; controllerId: string; type: string; x: number; y: number; button?: number; deltaY?: number }) => {
        relayRemoteControlInput('remote-control:mouse', payload)
    })

    socket.on('remote-control:key', (payload: { meetingId: string; controllerId: string; type: string; key: string; code: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean }) => {
        relayRemoteControlInput('remote-control:key', payload)
    })

    socket.on('remote-control:hotkey', (payload: { meetingId: string; controllerId: string; hotkey: string }) => {
        relayRemoteControlInput('remote-control:hotkey', payload, Boolean(payload?.hotkey))
    })

    socket.on('remote-control:text', (payload: { meetingId: string; controllerId: string; text: string }) => {
        relayRemoteControlInput('remote-control:text', payload, Boolean(payload?.text))
    })

    socket.on('remote-control:launch', (payload: { meetingId: string; controllerId: string; app: string }) => {
        relayRemoteControlInput('remote-control:launch', payload, Boolean(payload?.app))
    })

    // Presenter Backstage / Virtual Green Room (Enterprise Tier)
    socket.on(SocketEvents.STAGE_STATUS_CHANGE, async (payload: { meetingId: string; targetUserId: string; isBackstage: boolean }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        let backstageSet = meetingBackstageMap.get(payload.meetingId)
        if (!backstageSet) {
            backstageSet = new Set<string>()
            meetingBackstageMap.set(payload.meetingId, backstageSet)
        }

        if (payload.isBackstage) {
            backstageSet.add(payload.targetUserId)
        } else {
            backstageSet.delete(payload.targetUserId)
        }

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.STAGE_STATUS_CHANGE, {
            meetingId: payload.meetingId,
            targetUserId: payload.targetUserId,
            isBackstage: payload.isBackstage,
            backstageUsers: Array.from(backstageSet)
        })
    })

    // Webinar Mode (1000+ View-Only Stage & Hand-Raise Engine)
    socket.on('webinar:toggle-mode', async (payload: { meetingId: string; enabled: boolean }) => {
        if (!userId || !payload?.meetingId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        await liveBroadcastService.toggleWebinarMode(payload.meetingId, payload.enabled)
    })

    socket.on('webinar:request-to-speak', (payload: { meetingId: string; displayName?: string }) => {
        if (!payload?.meetingId) return
        liveBroadcastService.requestToSpeak(payload.meetingId, userId || socket.id, payload.displayName || 'Attendee')
    })

    socket.on('webinar:promote-speaker', async (payload: { meetingId: string; targetUserId: string; hostName?: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        await liveBroadcastService.promoteSpeaker(payload.meetingId, payload.targetUserId, payload.hostName)
    })

    socket.on('webinar:demote-speaker', async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) return
        await liveBroadcastService.demoteSpeaker(payload.meetingId, payload.targetUserId)
    })

    socket.on('webinar:reaction', (payload: { meetingId: string; reaction: string; userName?: string }) => {
        if (!payload?.meetingId || !payload?.reaction) return
        liveBroadcastService.broadcastReaction(payload.meetingId, payload.reaction, payload.userName)
    })

    // Disconnect cleanup for active RTMP livestream (with 15s grace window so page refresh doesn't kill stream)
    socket.on('disconnect', () => {
        if (userId) {
            setTimeout(async () => {
                for (const [mId, session] of liveStreamService.getSessions().entries()) {
                    if (session.userId === userId) {
                        const roomSockets = io.sockets.adapter.rooms.get(`meeting:${mId}`)
                        const hostReconnected = roomSockets && Array.from(roomSockets).some(sId => {
                            const s = io.sockets.sockets.get(sId) as AuthenticatedSocket | undefined
                            return s && String(s.userId) === String(userId)
                        })
                        if (!hostReconnected) {
                            console.log(`[LiveStream] Host ${userId} did not reconnect within grace period. Stopping active stream for meeting ${mId}.`)
                            await liveStreamService.stopStream(mId).catch(() => { })
                        }
                    }
                }
            }, 15000)
        }
    })
}
