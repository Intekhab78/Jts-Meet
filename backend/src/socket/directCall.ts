import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { User } from '../models/user.model'
import { Meeting } from '../modules/meeting/meeting.model'
import { createMeeting } from '../modules/meeting/meeting.service'
import { NotificationService } from '../modules/notification/notification.service'

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
        const singleTarget = payload?.targetUserId || payload?.calleeId
        let targetUserIds: string[] = []
        if (Array.isArray(payload?.targetUserIds) && payload.targetUserIds.length > 0) {
            targetUserIds = payload.targetUserIds.map(String).filter(id => id && id !== String(userId))
        } else if (singleTarget && String(singleTarget) !== String(userId)) {
            targetUserIds = [String(singleTarget)]
        }

        if (!userId || targetUserIds.length === 0) {
            socket.emit('error', { message: 'Invalid call target' })
            return
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
                const { Types } = await import('mongoose')
                for (const tId of targetUserIds) {
                    if (Types.ObjectId.isValid(tId)) {
                        callMeeting.participants.push(new Types.ObjectId(tId) as any)
                    }
                }
                await callMeeting.save()
            } catch (_) {}

            const meetingId = payload.meetingId || callMeeting.meetingId

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

            // 1. Emit to all target users' personal rooms (for open/connected browser tabs)
            for (const tId of targetUserIds) {
                io.to(`user:${tId}`).emit(SocketEvents.CALL_INCOMING, incomingCallPayload)

                // 2. Dispatch High-Priority Web Push (rings device even if browser tabs are closed)
                const pushCallerTitle = channelName ? `${callerName} (#${channelName})` : callerName
                NotificationService.sendIncomingCallPush(tId, {
                    meetingId,
                    callerName: pushCallerTitle,
                    callerAvatar,
                    callType: payload.callType || 'video',
                    callerId: userId
                }).catch(err => {
                    console.warn('[DirectCall] Push dispatch error:', err?.message || err)
                })
            }

            // Confirm initiation to caller with the meetingId
            socket.emit('call:initiated', {
                meetingId,
                targetUserId: targetUserIds[0],
                targetUserIds
            })
        } catch (error: any) {
            socket.emit('error', { message: error?.message || 'Failed to initiate direct call' })
        }
    })

    socket.on(SocketEvents.CALL_ACCEPTED, async (payload: {
        meetingId: string
        callerId?: string
    }) => {
        if (!userId || !payload?.meetingId) return

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

    socket.on(SocketEvents.CALL_CANCELLED, (payload: {
        targetUserId?: string
        calleeId?: string
        targetUserIds?: string[]
        meetingId?: string
    }) => {
        if (!userId) return

        const cancelData = {
            callerId: userId,
            meetingId: payload?.meetingId
        }

        const targets = new Set<string>()
        if (payload?.targetUserId) targets.add(String(payload.targetUserId))
        if (payload?.calleeId) targets.add(String(payload.calleeId))
        if (Array.isArray(payload?.targetUserIds)) {
            payload.targetUserIds.forEach(id => {
                if (id) targets.add(String(id))
            })
        }

        targets.forEach(tId => {
            io.to(`user:${tId}`).emit(SocketEvents.CALL_CANCELLED, cancelData)
        })

        if (payload?.meetingId) {
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.CALL_CANCELLED, cancelData)
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId,
                meetingId: payload.meetingId
            })
        }
    })
}
