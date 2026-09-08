import { Server, Socket } from 'socket.io'
import { SocketEvents } from '../../socket/events'
import { AuthenticatedSocket } from '../../socket/auth'
import { addPeerSession, removePeerSessionBySocket, getMeetingParticipantSocketIds, getMeetingPeersInfo, updatePeerSession } from './peer.manager'
import { authorizeMeetingJoin } from './webrtc.service'
import { joinMeeting } from '../meeting/meeting.service'
import { User } from '../../models/user.model'

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

        let effectiveName = payload.displayName || authSocket.guestName
        if (!effectiveName && !authSocket.isGuest && userId) {
            try {
                const userDoc = await User.findById(userId).select('fullName').lean()
                if (userDoc?.fullName) {
                    effectiveName = userDoc.fullName
                    authSocket.guestName = userDoc.fullName
                }
            } catch (e) {}
        }
        if (effectiveName) {
            authSocket.guestName = effectiveName
        }

        addPeerSession(userId, payload.meetingId, socket.id, effectiveName, payload.isVideoOff)

        // Broadcast to other participants in the room across all nodes
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WEBRTC_USER_JOINED, { 
            userId, 
            meetingId: payload.meetingId,
            displayName: effectiveName,
            isVideoOff: payload.isVideoOff
        })

        // Get total participants in the meeting room and existing peer roster
        const sockets = await io.in(`meeting:${payload.meetingId}`).allSockets()
        const peers = getMeetingPeersInfo(payload.meetingId)

        socket.emit(SocketEvents.WEBRTC_JOIN, { 
            meetingId: payload.meetingId, 
            participants: sockets.size,
            peers 
        })
    })

    socket.on(SocketEvents.WEBRTC_OFFER, async (payload: { targetUserId: string; meetingId: string; offer: any; displayName?: string; isVideoOff?: boolean }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.offer) {
            socket.emit('error', { message: 'Invalid offer payload' })
            return
        }

        const offerSenderName = payload.displayName || authSocket.guestName
        if (offerSenderName) {
            updatePeerSession(userId, { displayName: offerSenderName })
        }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_OFFER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            offer: payload.offer,
            displayName: offerSenderName,
            isVideoOff: payload.isVideoOff
        })
    })

    socket.on(SocketEvents.WEBRTC_ANSWER, async (payload: { targetUserId: string; meetingId: string; answer: any; displayName?: string; isVideoOff?: boolean }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.answer) {
            socket.emit('error', { message: 'Invalid answer payload' })
            return
        }

        const answerSenderName = payload.displayName || authSocket.guestName
        if (answerSenderName) {
            updatePeerSession(userId, { displayName: answerSenderName })
        }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_ANSWER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            answer: payload.answer,
            displayName: answerSenderName,
            isVideoOff: payload.isVideoOff
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
