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
import { SocketEvents } from './events'
import { adHocRoomSettings } from '../routes/guest.routes'
import { dispatchWebhookEvent } from '../modules/integration/integration.service'
import { setUserPresenceState } from './presence'
import { cleanupWhiteboard } from './whiteboard'
import { cleanupMeetingQA } from './meetingQA'
import { cleanupPolls } from './poll'
import { cleanupBreakout, getActiveBreakoutSession } from './breakout'
import { liveBroadcastService } from '../modules/webrtc/liveBroadcast.service'
import { liveStreamService } from '../services/livestream.service'
import { telephonyMediaService } from '../services/telephonyMedia.service'
import { cloudRecordingWorker } from '../workers/cloudRecording.worker'
import { clearMeetingPeerSessions } from '../modules/webrtc/peer.manager'

// Track backstage participants per meeting room for Virtual Green Room
const meetingBackstageMap = new Map<string, Set<string>>()
// Track authorized remote control participants per meeting room
const activeRemoteControllers = new Map<string, string>()

export async function verifyIsHostOrCoHost(meetingId: string, checkUserId: string): Promise<boolean> {
    try {
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
            const meeting = await joinMeetingService(payload.meetingId, userId)
            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            socket.join(`meeting:${payload.meetingId}`)
            authSocket.meetingId = payload.meetingId

            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_JOIN, { meetingId: payload.meetingId, participants: meeting.participants })

            // Auto-switch user presence status to in_meeting
            if (!authSocket.isGuest && userId) {
                setUserPresenceState(userId, 'in_meeting')
                io.emit(SocketEvents.PRESENCE_UPDATE, { userId, status: 'in_meeting' })
            }

            // Notify waiting room / lobby guests that the host has arrived
            const isHostOrCoHost = String(meeting.host) === String(userId) || (meeting.coHosts && meeting.coHosts.some(id => String(id) === String(userId)))
            if (isHostOrCoHost) {
                const hostName = authSocket.guestName || 'Organizer'
                io.to(`lobby:${payload.meetingId}`).emit('meeting:host-joined', { hostName, meetingId: payload.meetingId })
            }

            // Sync user role so UI can accurately show host controls or hide them for guests
            socket.emit('meeting:role', {
                role: isHostOrCoHost ? 'host' : 'participant',
                isHost: isHostOrCoHost
            })

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
            } catch (e) {}

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

            // Cleanup transient in-memory meeting state across all modules
            meetingBackstageMap.delete(payload.meetingId)
            activeRemoteControllers.delete(payload.meetingId)
            cleanupWhiteboard(payload.meetingId)
            cleanupMeetingQA(payload.meetingId)
            cleanupPolls(payload.meetingId)
            cleanupBreakout(payload.meetingId)

            io.emit(SocketEvents.MEETING_END, { meetingId: payload.meetingId, status: meeting.status, participants: meeting.participants })
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

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_RAISE_HAND, { userId, meetingId: payload.meetingId, raised: payload.raised })
    })

    socket.on('meeting:speaking', (payload: { meetingId: string; isSpeaking: boolean }) => {
        if (!payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:speaking', {
            userId: userId || authSocket.userId || (socket as any).guestId,
            isSpeaking: !!payload.isSpeaking
        })
    })

    socket.on('meeting:record-toggle', (payload: { meetingId: string; isRecording: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:record-toggle', { userId, isRecording: payload.isRecording })
        if (!payload.isRecording) {
            dispatchWebhookEvent(undefined, 'recording.ready', {
                meetingId: payload.meetingId,
                stoppedBy: userId,
                timestamp: new Date().toISOString()
            })
        }
    })

    socket.on(SocketEvents.LIVESTREAM_TOGGLE, async (payload: { meetingId: string; isStreaming: boolean; platform: string; broadcastTitle?: string; streamUrl?: string; streamKey?: string; resolution?: '720p' | '1080p'; bitrate?: string }) => {
        if (!userId || !payload?.meetingId) return

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

    socket.on('meeting:toggle-watermark', (payload: { meetingId: string; enabled: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:toggle-watermark', { enabled: payload.enabled })
    })

    socket.on(SocketEvents.MEETING_COHOST_PROMOTE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_COHOST_PROMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on(SocketEvents.MEETING_COHOST_DEMOTE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_COHOST_DEMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on('meeting:permission-update', (payload: { meetingId: string; targetUserId: string; permission: 'recording' | 'whiteboard' | 'screen-share'; enabled: boolean }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:permission-update', payload)
    })

    socket.on(SocketEvents.MEETING_WAITING_APPROVE, async (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        try {
            const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
            if (Types.ObjectId.isValid(payload.targetUserId)) {
                await Meeting.updateOne(
                    { meetingId: baseMeetId },
                    {
                        $addToSet: { participants: new Types.ObjectId(payload.targetUserId) },
                        $pull: { waitingRoom: new Types.ObjectId(payload.targetUserId) }
                    }
                ).exec()
            }
        } catch (e) {}

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.MEETING_WAITING_APPROVE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_WAITING_APPROVE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on('guest:approve', async (payload: { socketId?: string; guestSocketId?: string; meetingId?: string }) => {
        const targetSocketId = payload?.socketId || payload?.guestSocketId
        if (!userId || !targetSocketId) return
        
        const guestSocket = io.sockets.sockets.get(targetSocketId) as AuthenticatedSocket
        const targetMeetingId = payload?.meetingId || guestSocket?.meetingId
        if (targetMeetingId) {
            const baseMeetId = targetMeetingId.includes('__sub_') ? targetMeetingId.split('__sub_')[0] : targetMeetingId
            const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
            if (!authorized) {
                socket.emit('error', { message: 'Forbidden: Only host or co-host can approve guests' })
                return
            }
        }

        // Handle locally first (supports single-node in-memory dev fallback)
        if (guestSocket) {
            guestSocket.isPending = false
            guestSocket.leave(`lobby:${guestSocket.meetingId}`)
            
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
            } catch (e) {}

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
        if (targetMeetingId) {
            const baseMeetId = targetMeetingId.includes('__sub_') ? targetMeetingId.split('__sub_')[0] : targetMeetingId
            const authorized = await verifyIsHostOrCoHost(baseMeetId, userId)
            if (!authorized) {
                socket.emit('error', { message: 'Forbidden: Only host or co-host can deny guests' })
                return
            }
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
                    } catch (e) {}

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
        if (!payload?.meetingId) return
        const { meetingId, enabled } = payload

        try {
            await Meeting.findOneAndUpdate({ meetingId }, { isWaitingRoomEnabled: enabled })
        } catch (e) {}

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
                }).catch(() => {})
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
                await liveStreamService.stopStream(baseMeetId).catch(() => {})
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
    socket.on('meeting:set-screen-share-permission', (payload: { meetingId: string; policy: 'everyone' | 'host_only' }) => {
        if (!payload?.meetingId || !payload?.policy) return
        io.to(`meeting:${payload.meetingId}`).emit('meeting:screen-share-permission-changed', {
            meetingId: payload.meetingId,
            policy: payload.policy
        })
        Meeting.updateOne({ meetingId: payload.meetingId }, { screenSharePolicy: payload.policy }).exec().catch(() => {})
    })

    // Remote Desktop Control Events Relay
    socket.on('remote-control:request', (payload: { meetingId: string; requesterId: string; requesterName: string; targetUserId: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId || !payload?.targetUserId) return
        socket.to(`meeting:${mId}`).emit('remote-control:request', {
            ...payload,
            meetingId: mId,
            requesterName: payload.requesterName || authSocket.guestName || 'Participant'
        })
    })

    socket.on('remote-control:response', (payload: { meetingId: string; requesterId: string; granted: boolean; presenterId: string; presenterName?: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId || !payload?.requesterId) return
        if (payload.granted) {
            activeRemoteControllers.set(mId, payload.requesterId)
        } else {
            activeRemoteControllers.delete(mId)
        }
        socket.to(`meeting:${mId}`).emit('remote-control:response', {
            ...payload,
            meetingId: mId
        })
    })

    socket.on('remote-control:revoke', (payload: { meetingId: string; controllerId?: string; presenterId: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId) return
        activeRemoteControllers.delete(mId)
        socket.to(`meeting:${mId}`).emit('remote-control:revoke', {
            ...payload,
            meetingId: mId
        })
    })

    socket.on('remote-control:mouse', (payload: { meetingId: string; controllerId: string; type: string; x: number; y: number; button?: number; deltaY?: number }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId) return
        const authorizedController = activeRemoteControllers.get(mId)
        if (!authorizedController || (authorizedController !== userId && authorizedController !== payload.controllerId)) {
            return
        }
        socket.to(`meeting:${mId}`).emit('remote-control:mouse', {
            ...payload,
            meetingId: mId
        })
    })

    socket.on('remote-control:key', (payload: { meetingId: string; controllerId: string; type: string; key: string; code: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId) return
        const authorizedController = activeRemoteControllers.get(mId)
        if (!authorizedController || (authorizedController !== userId && authorizedController !== payload.controllerId)) {
            return
        }
        socket.to(`meeting:${mId}`).emit('remote-control:key', {
            ...payload,
            meetingId: mId
        })
    })

    socket.on('remote-control:hotkey', (payload: { meetingId: string; controllerId: string; hotkey: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId || !payload?.hotkey) return
        const authorizedController = activeRemoteControllers.get(mId)
        if (!authorizedController || (authorizedController !== userId && authorizedController !== payload.controllerId)) {
            return
        }
        socket.to(`meeting:${mId}`).emit('remote-control:hotkey', {
            ...payload,
            meetingId: mId
        })
    })

    socket.on('remote-control:text', (payload: { meetingId: string; controllerId: string; text: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId || !payload?.text) return
        const authorizedController = activeRemoteControllers.get(mId)
        if (!authorizedController || (authorizedController !== userId && authorizedController !== payload.controllerId)) {
            return
        }
        socket.to(`meeting:${mId}`).emit('remote-control:text', {
            ...payload,
            meetingId: mId
        })
    })

    socket.on('remote-control:launch', (payload: { meetingId: string; controllerId: string; app: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        if (!mId || !payload?.app) return
        const authorizedController = activeRemoteControllers.get(mId)
        if (!authorizedController || (authorizedController !== userId && authorizedController !== payload.controllerId)) {
            return
        }
        socket.to(`meeting:${mId}`).emit('remote-control:launch', {
            ...payload,
            meetingId: mId
        })
    })

    // Presenter Backstage / Virtual Green Room (Enterprise Tier)
    socket.on(SocketEvents.STAGE_STATUS_CHANGE, (payload: { meetingId: string; targetUserId: string; isBackstage: boolean }) => {
        if (!payload?.meetingId || !payload?.targetUserId) return
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
        if (!payload?.meetingId) return
        await liveBroadcastService.toggleWebinarMode(payload.meetingId, payload.enabled)
    })

    socket.on('webinar:request-to-speak', (payload: { meetingId: string; displayName?: string }) => {
        if (!payload?.meetingId) return
        liveBroadcastService.requestToSpeak(payload.meetingId, userId || socket.id, payload.displayName || 'Attendee')
    })

    socket.on('webinar:promote-speaker', async (payload: { meetingId: string; targetUserId: string; hostName?: string }) => {
        if (!payload?.meetingId || !payload?.targetUserId) return
        await liveBroadcastService.promoteSpeaker(payload.meetingId, payload.targetUserId, payload.hostName)
    })

    socket.on('webinar:demote-speaker', async (payload: { meetingId: string; targetUserId: string }) => {
        if (!payload?.meetingId || !payload?.targetUserId) return
        await liveBroadcastService.demoteSpeaker(payload.meetingId, payload.targetUserId)
    })

    socket.on('webinar:reaction', (payload: { meetingId: string; reaction: string; userName?: string }) => {
        if (!payload?.meetingId || !payload?.reaction) return
        liveBroadcastService.broadcastReaction(payload.meetingId, payload.reaction, payload.userName)
    })

    // Disconnect cleanup for active RTMP livestream
    socket.on('disconnect', async () => {
        if (userId) {
            for (const [mId, session] of liveStreamService.getSessions().entries()) {
                if (session.userId === userId) {
                    console.log(`[LiveStream] Host ${userId} disconnected. Stopping active stream for meeting ${mId}.`)
                    await liveStreamService.stopStream(mId).catch(() => {})
                }
            }
        }
    })
}
