import { Server, Socket } from 'socket.io'
import { SocketEvents } from '../../socket/events'
import { AuthenticatedSocket } from '../../socket/auth'
import { addPeerSession, removePeerSessionBySocket, getMeetingParticipantSocketIds, getMeetingSocketId } from './peer.manager'
import { authorizeMeetingJoin } from './webrtc.service'
import { joinMeeting } from '../meeting/meeting.service'

export function registerWebRTCHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.WEBRTC_JOIN, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            socket.emit('error', { message: 'Unauthorized or invalid meetingId' })
            return
        }

        try {
            await joinMeeting(payload.meetingId, userId)
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Failed to join meeting in database' })
            return
        }

        const isAuthorized = await authorizeMeetingJoin(userId, payload.meetingId)
        if (!isAuthorized) {
            socket.emit('error', { message: 'Not authorized to join meeting' })
            return
        }

        addPeerSession(userId, payload.meetingId, socket.id)

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.WEBRTC_USER_JOINED, { userId, meetingId: payload.meetingId })
        })

        socket.emit(SocketEvents.WEBRTC_JOIN, { meetingId: payload.meetingId, participants: otherSocketIds.length + 1 })
    })

    socket.on(SocketEvents.WEBRTC_OFFER, async (payload: { targetUserId: string; meetingId: string; offer: any }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.offer) {
            socket.emit('error', { message: 'Invalid offer payload' })
            return
        }

        const targetSocketId = getMeetingSocketId(payload.targetUserId, payload.meetingId)
        if (!targetSocketId) {
            socket.emit('error', { message: 'Target user not available' })
            return
        }

        io.to(targetSocketId).emit(SocketEvents.WEBRTC_OFFER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            offer: payload.offer
        })
    })

    socket.on(SocketEvents.WEBRTC_ANSWER, async (payload: { targetUserId: string; meetingId: string; answer: any }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.answer) {
            socket.emit('error', { message: 'Invalid answer payload' })
            return
        }

        const targetSocketId = getMeetingSocketId(payload.targetUserId, payload.meetingId)
        if (!targetSocketId) {
            socket.emit('error', { message: 'Target user not available' })
            return
        }

        io.to(targetSocketId).emit(SocketEvents.WEBRTC_ANSWER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            answer: payload.answer
        })
    })

    socket.on(SocketEvents.WEBRTC_ICE_CANDIDATE, async (payload: { targetUserId: string; meetingId: string; candidate: any }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.candidate) {
            socket.emit('error', { message: 'Invalid ICE candidate payload' })
            return
        }

        const targetSocketId = getMeetingSocketId(payload.targetUserId, payload.meetingId)
        if (!targetSocketId) {
            socket.emit('error', { message: 'Target user not available' })
            return
        }

        io.to(targetSocketId).emit(SocketEvents.WEBRTC_ICE_CANDIDATE, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            candidate: payload.candidate
        })
    })

    socket.on(SocketEvents.SCREEN_START, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            socket.emit('error', { message: 'Invalid screen share start payload' })
            return
        }

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.SCREEN_START, { userId, meetingId: payload.meetingId })
            io.to(otherSocketId).emit(SocketEvents.SCREEN_CHANGED, { userId, meetingId: payload.meetingId, active: true })
        })
    })

    socket.on(SocketEvents.SCREEN_STOP, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            socket.emit('error', { message: 'Invalid screen share stop payload' })
            return
        }

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.SCREEN_STOP, { userId, meetingId: payload.meetingId })
            io.to(otherSocketId).emit(SocketEvents.SCREEN_CHANGED, { userId, meetingId: payload.meetingId, active: false })
        })
    })

    socket.on(SocketEvents.DISCONNECT, () => {
        const session = removePeerSessionBySocket(socket.id)
        if (!session) {
            return
        }

        const otherSocketIds = getMeetingParticipantSocketIds(session.meetingId, session.userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId: session.userId,
                meetingId: session.meetingId
            })
        })
    })
}
