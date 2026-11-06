import { Server, Socket } from 'socket.io'
import { Types } from 'mongoose'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { User } from '../models/user.model'
import { Meeting } from '../modules/meeting/meeting.model'
import { Channel } from '../modules/channel/channel.model'
import { createMeeting } from '../modules/meeting/meeting.service'
import { NotificationService } from '../modules/notification/notification.service'

const activeRingTimeouts = new Map<string, NodeJS.Timeout>()
const RING_TIMEOUT_MS = 60000 // 60 seconds ring timeout
const recentlyInitiatedCalls = new Map<string, number>()
const recentlyAcceptedCalls = new Map<string, number>()

export async function initiateDirectCall(
    io: Server | null,
    userId: string,
    payload: {
        targetUserId?: string
        calleeId?: string
        targetUserIds?: string[]
        channelName?: string
        channelId?: string
        callType?: 'video' | 'audio' | 'screenshare'
        callerName?: string
        callerAvatar?: string
        meetingId?: string
    }
): Promise<{ success: boolean; meetingId?: string; targetUserIds?: string[]; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Unauthorized user' }
    }

    // Deduplication check: if call with meetingId was processed in the last 15 seconds, avoid duplicate pushes/timeouts
    if (payload.meetingId && recentlyInitiatedCalls.has(payload.meetingId)) {
        console.log(`[DirectCall] Call ${payload.meetingId} already initiated within deduplication window. Returning success.`)
        return { success: true, meetingId: payload.meetingId }
    }

    let targetUserIds: string[] = []

    // 1. Channel Call member resolution: If channelId or channelName is provided
    if (payload?.channelId || payload?.channelName) {
        try {
            let channelDoc = null
            if (payload.channelId && Types.ObjectId.isValid(payload.channelId)) {
                channelDoc = await Channel.findById(payload.channelId).select('members').lean().exec()
            }
            if (!channelDoc && payload.channelName) {
                channelDoc = await Channel.findOne({ name: payload.channelName }).select('members').lean().exec()
            }
            if (channelDoc && Array.isArray(channelDoc.members)) {
                targetUserIds = channelDoc.members
                    .map((m: any) => m.userId?.toString())
                    .filter((id: string) => id && id !== String(userId))
            }
        } catch (err) {
            console.warn('[DirectCall] Error resolving channel members for group call:', err)
        }
    }

    // 2. Direct 1-to-1 or explicit targetUserIds call
    if (targetUserIds.length === 0) {
        const singleTarget = payload?.targetUserId || payload?.calleeId
        if (Array.isArray(payload?.targetUserIds) && payload.targetUserIds.length > 0) {
            targetUserIds = payload.targetUserIds.map(String).filter(id => id && id !== String(userId))
        } else if (singleTarget && String(singleTarget) !== String(userId)) {
            targetUserIds = [String(singleTarget)]
        }
    }

    if (targetUserIds.length === 0) {
        console.warn(`[DirectCall] Call rejected: No valid target user IDs found for caller ${userId}. Payload:`, payload)
        return { success: false, error: 'Invalid call target' }
    }

    try {
        // Fetch caller user information if not provided
        let callerName = payload.callerName
        let callerAvatar = payload.callerAvatar
        if (!callerName) {
            const caller = await User.findById(userId).select('fullName profileImage').lean().exec()
            callerName = caller?.fullName || 'Colleague'
            callerAvatar = caller?.profileImage || ''
        }

        const channelName = payload.channelName
        const channelId = payload.channelId
        const isGroupCall = targetUserIds.length > 1 || Boolean(channelName)

        // Create an instant meeting room for the call
        const meetingTitle = channelName
            ? `Channel Call: #${channelName}`
            : isGroupCall
                ? `Group Call: ${callerName}`
                : `Direct Call: ${callerName}`

        const callMeeting = await createMeeting(userId, meetingTitle)
        try {
            for (const tId of targetUserIds) {
                if (Types.ObjectId.isValid(tId)) {
                    callMeeting.participants.push(new Types.ObjectId(tId) as any)
                }
            }
            await callMeeting.save()
        } catch (_) {}

        const meetingId = payload.meetingId || callMeeting.meetingId

        // Mark as recently initiated for deduplication
        recentlyInitiatedCalls.set(meetingId, Date.now())
        setTimeout(() => recentlyInitiatedCalls.delete(meetingId), 15000)

        const incomingCallPayload = {
            meetingId,
            callerId: userId,
            callerName,
            callerAvatar,
            callType: payload.callType || 'video',
            channelName,
            channelId,
            isGroupCall,
            createdAt: new Date()
        }

        console.log(`[DirectCall] Initiating call ${meetingId}: caller=${callerName} (${userId}) -> targets=[${targetUserIds.join(', ')}]`)

        // 1. Emit to all target users' personal socket rooms (for open/connected browser tabs & active mobile sessions)
        if (io) {
            for (const tId of targetUserIds) {
                io.to(`user:${tId}`).emit(SocketEvents.CALL_INCOMING, incomingCallPayload)
            }
        }

        // 2. Dispatch High-Priority Web Push & Native Android FCM (rings device even if phone is locked/app closed)
        const pushCallerTitle = channelName ? `${callerName} (#${channelName})` : callerName
        for (const tId of targetUserIds) {
            if (String(tId) === String(userId)) continue
            NotificationService.sendIncomingCallPush(tId, {
                meetingId,
                callerName: pushCallerTitle,
                callerAvatar,
                callType: payload.callType || 'video',
                callerId: userId
            }).catch(err => {
                console.warn(`[DirectCall] Push dispatch error for user ${tId}:`, err?.message || err)
            })
        }

        // 60-second automatic call ringing timeout
        if (activeRingTimeouts.has(meetingId)) {
            clearTimeout(activeRingTimeouts.get(meetingId))
        }
        const timeoutHandle = setTimeout(() => {
            activeRingTimeouts.delete(meetingId)
            console.log(`[DirectCall] Call ${meetingId} timed out after 60s (no answer)`)
            const timeoutPayload = {
                meetingId,
                callerId: userId,
                calleeId: targetUserIds[0],
                reason: 'no_answer'
            }
            if (io) {
                for (const tId of targetUserIds) {
                    io.to(`user:${tId}`).emit(SocketEvents.CALL_CANCELLED, timeoutPayload)
                    NotificationService.sendMissedCallPush(tId, {
                        callerName,
                        callerAvatar,
                        callType: payload.callType || 'video',
                    }).catch(() => {})
                }
                io.to(`user:${userId}`).emit(SocketEvents.CALL_REJECTED, timeoutPayload)
                io.to(`meeting:${meetingId}`).emit(SocketEvents.CALL_CANCELLED, timeoutPayload)
            }
        }, RING_TIMEOUT_MS)
        activeRingTimeouts.set(meetingId, timeoutHandle)

        return {
            success: true,
            meetingId,
            targetUserIds
        }
    } catch (error: any) {
        console.error(`[DirectCall] Error in initiateDirectCall:`, error)
        return { success: false, error: error?.message || 'Failed to initiate direct call' }
    }
}

export async function cancelOrEndDirectCall(
    io: Server | null,
    userId: string,
    payload: {
        targetUserId?: string
        calleeId?: string
        targetUserIds?: string[]
        meetingId?: string
    }
) {
    if (!userId) return

    const mId = payload?.meetingId
    // Clear 60s ringing timeout
    if (mId && activeRingTimeouts.has(mId)) {
        clearTimeout(activeRingTimeouts.get(mId))
        activeRingTimeouts.delete(mId)
    }

    const cancelData = {
        callerId: userId,
        userId,
        meetingId: mId
    }

    const targets = new Set<string>()
    if (payload?.targetUserId) targets.add(String(payload.targetUserId))
    if (payload?.calleeId) targets.add(String(payload.calleeId))
    if (Array.isArray(payload?.targetUserIds)) {
        payload.targetUserIds.forEach(id => {
            if (id) targets.add(String(id))
        })
    }

    // If target not provided directly in payload, lookup meeting host and participants in database
    if (mId && targets.size === 0) {
        try {
            const meetingDoc = await Meeting.findOne({ meetingId: mId }).select('participants host').lean().exec()
            if (meetingDoc) {
                if (meetingDoc.host && String(meetingDoc.host) !== String(userId)) {
                    targets.add(String(meetingDoc.host))
                }
                if (Array.isArray(meetingDoc.participants)) {
                    meetingDoc.participants.forEach((p: any) => {
                        const pId = String(p?._id || p)
                        if (pId && pId !== String(userId)) {
                            targets.add(pId)
                        }
                    })
                }
            }
        } catch (_) {}
    }

    if (io) {
        targets.forEach(tId => {
            io.to(`user:${tId}`).emit(SocketEvents.CALL_CANCELLED, cancelData)
            io.to(`user:${tId}`).emit('call:ended', cancelData)
        })

        if (mId) {
            io.to(`meeting:${mId}`).emit(SocketEvents.CALL_CANCELLED, cancelData)
            io.to(`meeting:${mId}`).emit('call:ended', cancelData)
            io.to(`meeting:${mId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId,
                meetingId: mId
            })
            io.to(`meeting:${mId}`).emit(SocketEvents.MEETING_LEAVE, {
                userId,
                meetingId: mId
            })
        }
    }
}

export function registerDirectCallHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.CALL_INITIATE, async (payload: {
        targetUserId?: string
        calleeId?: string
        targetUserIds?: string[]
        channelName?: string
        channelId?: string
        callType?: 'video' | 'audio' | 'screenshare'
        callerName?: string
        callerAvatar?: string
        meetingId?: string
    }) => {
        if (!userId) {
            socket.emit('error', { message: 'Unauthorized' })
            return
        }

        const result = await initiateDirectCall(io, userId, payload)
        if (!result.success) {
            socket.emit('error', { message: result.error || 'Failed to initiate direct call' })
            return
        }

        // Confirm initiation to caller with the meetingId
        socket.emit('call:initiated', {
            meetingId: result.meetingId,
            targetUserId: result.targetUserIds?.[0] || payload.targetUserId,
            targetUserIds: result.targetUserIds
        })
    })

    socket.on(SocketEvents.CALL_ACCEPTED, async (payload: {
        meetingId: string
        callerId?: string
    }) => {
        if (!userId || !payload?.meetingId) return

        // Deduplication: prevent rapid repeat accept signals from breaking active WebRTC peer connection
        const lastAccepted = recentlyAcceptedCalls.get(payload.meetingId)
        if (lastAccepted && Date.now() - lastAccepted < 15000) {
            console.log(`[directCall] Call ${payload.meetingId} already accepted within deduplication window. Suppressing duplicate accept.`)
            return
        }
        recentlyAcceptedCalls.set(payload.meetingId, Date.now())
        setTimeout(() => recentlyAcceptedCalls.delete(payload.meetingId), 20000)

        // Clear 60s ringing timeout
        if (payload?.meetingId && activeRingTimeouts.has(payload.meetingId)) {
            clearTimeout(activeRingTimeouts.get(payload.meetingId))
            activeRingTimeouts.delete(payload.meetingId)
        }

        const acceptData = {
            meetingId: payload.meetingId,
            calleeId: userId
        }

        // 1. Emit to caller's personal user room if callerId provided
        if (payload.callerId) {
            io.to(`user:${payload.callerId}`).emit(SocketEvents.CALL_ACCEPTED, acceptData)
        }

        // 2. Also broadcast to meeting room
        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.CALL_ACCEPTED, acceptData)

        // 3. Fallback: If callerId was not provided (e.g. from push click), lookup meeting host
        if (!payload.callerId) {
            try {
                const meeting = await Meeting.findOne({ meetingId: payload.meetingId }).select('host').lean().exec()
                if (meeting?.host) {
                    io.to(`user:${meeting.host}`).emit(SocketEvents.CALL_ACCEPTED, acceptData)
                }
            } catch (err) {
                console.warn('[directCall] Failed to lookup host for call accept:', err)
            }
        }
    })

    socket.on(SocketEvents.CALL_REJECTED, (payload: {
        callerId: string
        meetingId?: string
        reason?: string
    }) => {
        if (!userId || !payload?.callerId) return

        // Clear 60s ringing timeout
        if (payload?.meetingId && activeRingTimeouts.has(payload.meetingId)) {
            clearTimeout(activeRingTimeouts.get(payload.meetingId))
            activeRingTimeouts.delete(payload.meetingId)
        }

        const rejectData = {
            calleeId: userId,
            meetingId: payload.meetingId,
            reason: payload.reason || 'declined'
        }

        io.to(`user:${payload.callerId}`).emit(SocketEvents.CALL_REJECTED, rejectData)
        if (payload?.meetingId) {
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.CALL_REJECTED, rejectData)
        }
    })

    const handleEndDirectCall = async (payload: {
        targetUserId?: string
        calleeId?: string
        targetUserIds?: string[]
        meetingId?: string
    }) => {
        if (!userId) return

        const mId = payload?.meetingId
        // Clear 60s ringing timeout
        if (mId && activeRingTimeouts.has(mId)) {
            clearTimeout(activeRingTimeouts.get(mId))
            activeRingTimeouts.delete(mId)
        }

        const cancelData = {
            callerId: userId,
            userId,
            meetingId: mId
        }

        const targets = new Set<string>()
        if (payload?.targetUserId) targets.add(String(payload.targetUserId))
        if (payload?.calleeId) targets.add(String(payload.calleeId))
        if (Array.isArray(payload?.targetUserIds)) {
            payload.targetUserIds.forEach(id => {
                if (id) targets.add(String(id))
            })
        }

        // If target not provided directly in payload, lookup meeting host and participants in database
        if (mId && targets.size === 0) {
            try {
                const meetingDoc = await Meeting.findOne({ meetingId: mId }).select('participants host').lean().exec()
                if (meetingDoc) {
                    if (meetingDoc.host && String(meetingDoc.host) !== String(userId)) {
                        targets.add(String(meetingDoc.host))
                    }
                    if (Array.isArray(meetingDoc.participants)) {
                        meetingDoc.participants.forEach((p: any) => {
                            const pId = String(p?._id || p)
                            if (pId && pId !== String(userId)) {
                                targets.add(pId)
                            }
                        })
                    }
                }
            } catch (_) {}
        }

        targets.forEach(tId => {
            io.to(`user:${tId}`).emit(SocketEvents.CALL_CANCELLED, cancelData)
            io.to(`user:${tId}`).emit('call:ended', cancelData)
        })

        if (mId) {
            io.to(`meeting:${mId}`).emit(SocketEvents.CALL_CANCELLED, cancelData)
            io.to(`meeting:${mId}`).emit('call:ended', cancelData)
            io.to(`meeting:${mId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId,
                meetingId: mId
            })
            io.to(`meeting:${mId}`).emit(SocketEvents.MEETING_LEAVE, {
                userId,
                meetingId: mId
            })
        }
    }

    socket.on(SocketEvents.CALL_CANCELLED, handleEndDirectCall)
    socket.on('call:ended', handleEndDirectCall)
    socket.on('call:hangup', handleEndDirectCall)
}
