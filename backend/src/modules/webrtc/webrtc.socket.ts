import { Server, Socket } from 'socket.io'
import { SocketEvents } from '../../socket/events'
import { AuthenticatedSocket } from '../../socket/auth'
import { addPeerSession, removePeerSessionBySocket, getMeetingParticipantSocketIds } from './peer.manager'
import { authorizeMeetingJoin } from './webrtc.service'
import { joinMeeting } from '../meeting/meeting.service'

export function registerWebRTCHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.WEBRTC_JOIN, async (payload: { meetingId: string; displayName?: string; isVideoOff?: boolean }) => {
        if (!userId || !payload?.meetingId) {
            socket.emit('error', { message: 'Unauthorized or invalid meetingId' })
            return
        }

        try {
            if (!authSocket.isGuest) {
                await joinMeeting(payload.meetingId, userId)
            }
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Failed to join meeting in database' })
            return
        }

        const isAuthorized = await authorizeMeetingJoin(
            userId, 
            payload.meetingId, 
            authSocket.isGuest, 
            authSocket.meetingId, 
            authSocket.isPending
        )
        if (!isAuthorized) {
            socket.emit('error', { message: 'Not authorized to join meeting' })
            return
        }

        socket.join(`meeting:${payload.meetingId}`)
        authSocket.meetingId = payload.meetingId

        addPeerSession(userId, payload.meetingId, socket.id)

        if (payload.displayName) {
            authSocket.guestName = payload.displayName;
        }

        // Broadcast to other participants in the room across all nodes
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WEBRTC_USER_JOINED, { 
            userId, 
            meetingId: payload.meetingId,
            displayName: authSocket.guestName || payload.displayName,
            isVideoOff: payload.isVideoOff
        })

        // Get total participants in the meeting room across the entire Redis cluster
        const sockets = await io.in(`meeting:${payload.meetingId}`).allSockets()
        socket.emit(SocketEvents.WEBRTC_JOIN, { meetingId: payload.meetingId, participants: sockets.size })
    })

    socket.on(SocketEvents.WEBRTC_OFFER, async (payload: { targetUserId: string; meetingId: string; offer: any; displayName?: string; isVideoOff?: boolean }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.offer) {
            socket.emit('error', { message: 'Invalid offer payload' })
            return
        }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_OFFER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            offer: payload.offer,
            displayName: payload.displayName || authSocket.guestName,
            isVideoOff: payload.isVideoOff
        })
    })

    socket.on(SocketEvents.WEBRTC_ANSWER, async (payload: { targetUserId: string; meetingId: string; answer: any }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.answer) {
            socket.emit('error', { message: 'Invalid answer payload' })
            return
        }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_ANSWER, {
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

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_ICE_CANDIDATE, {
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

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.SCREEN_START, { userId, meetingId: payload.meetingId })
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.SCREEN_CHANGED, { userId, meetingId: payload.meetingId, active: true })
    })

    socket.on(SocketEvents.SCREEN_STOP, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            socket.emit('error', { message: 'Invalid screen share stop payload' })
            return
        }

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.SCREEN_STOP, { userId, meetingId: payload.meetingId })
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.SCREEN_CHANGED, { userId, meetingId: payload.meetingId, active: false })
    })

    socket.on(SocketEvents.DISCONNECT, () => {
        const session = removePeerSessionBySocket(socket.id)
        const meetingId = session?.meetingId || authSocket.meetingId
        const sUserId = session?.userId || userId

        if (meetingId && sUserId) {
            socket.to(`meeting:${meetingId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId: sUserId,
                meetingId
            })
        }
    })
}
