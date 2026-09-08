import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { User } from '../models/user.model'
import { createMeeting } from '../modules/meeting/meeting.service'

export function registerDirectCallHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.CALL_INITIATE, async (payload: {
        targetUserId: string
        callType?: 'video' | 'audio'
        callerName?: string
        callerAvatar?: string
    }) => {
        if (!userId || !payload?.targetUserId || userId === payload.targetUserId) {
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

            // Create an instant meeting room for the direct call
            const callMeeting = await createMeeting(userId, `Direct Call: ${callerName}`)
            const meetingId = callMeeting.meetingId

            // Emit to target user's personal room
            io.to(`user:${payload.targetUserId}`).emit(SocketEvents.CALL_INCOMING, {
                meetingId,
                callerId: userId,
                callerName,
                callerAvatar,
                callType: payload.callType || 'video',
                createdAt: new Date()
            })

            // Confirm initiation to caller with the meetingId
            socket.emit('call:initiated', {
                meetingId,
                targetUserId: payload.targetUserId
            })
        } catch (error: any) {
            socket.emit('error', { message: error?.message || 'Failed to initiate direct call' })
        }
    })

    socket.on(SocketEvents.CALL_ACCEPTED, (payload: {
        meetingId: string
        callerId: string
    }) => {
        if (!userId || !payload?.callerId || !payload?.meetingId) return

        io.to(`user:${payload.callerId}`).emit(SocketEvents.CALL_ACCEPTED, {
            meetingId: payload.meetingId,
            calleeId: userId
        })
    })

    socket.on(SocketEvents.CALL_REJECTED, (payload: {
        callerId: string
        meetingId?: string
        reason?: string
    }) => {
        if (!userId || !payload?.callerId) return

        io.to(`user:${payload.callerId}`).emit(SocketEvents.CALL_REJECTED, {
            calleeId: userId,
            meetingId: payload.meetingId,
            reason: payload.reason || 'declined'
        })
    })

    socket.on(SocketEvents.CALL_CANCELLED, (payload: {
        targetUserId: string
        meetingId?: string
    }) => {
        if (!userId || !payload?.targetUserId) return

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.CALL_CANCELLED, {
            callerId: userId,
            meetingId: payload.meetingId
        })
    })
}
