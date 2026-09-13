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

    socket.on(SocketEvents.WEBRTC_JOIN, async (payload: { meetingId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
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

        addPeerSession(userId, payload.meetingId, socket.id, effectiveName, payload.isVideoOff, payload.isMuted)

        // Broadcast to other participants in the room across all nodes
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WEBRTC_USER_JOINED, { 
            userId, 
            meetingId: payload.meetingId,
            displayName: effectiveName,
            isVideoOff: payload.isVideoOff,
            isMuted: payload.isMuted
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

    socket.on(SocketEvents.WEBRTC_OFFER, async (payload: { targetUserId: string; meetingId: string; offer: any; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.offer) {
            socket.emit('error', { message: 'Invalid offer payload' })
            return
        }

        const offerSenderName = payload.displayName || authSocket.guestName
        if (offerSenderName || payload.isMuted !== undefined) {
            updatePeerSession(userId, { 
                displayName: offerSenderName,
                isMuted: payload.isMuted
            })
        }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_OFFER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            offer: payload.offer,
            displayName: offerSenderName,
            isVideoOff: payload.isVideoOff,
            isMuted: payload.isMuted
        })
    })

    socket.on(SocketEvents.WEBRTC_ANSWER, async (payload: { targetUserId: string; meetingId: string; answer: any; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
        if (!userId || !payload?.targetUserId || !payload?.meetingId || !payload?.answer) {
            socket.emit('error', { message: 'Invalid answer payload' })
            return
        }

        const answerSenderName = payload.displayName || authSocket.guestName
        if (answerSenderName || payload.isMuted !== undefined) {
            updatePeerSession(userId, { 
                displayName: answerSenderName,
                isMuted: payload.isMuted
            })
        }

        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.WEBRTC_ANSWER, {
            fromUserId: userId,
            meetingId: payload.meetingId,
            answer: payload.answer,
            displayName: answerSenderName,
            isVideoOff: payload.isVideoOff,
            isMuted: payload.isMuted
        })
    })

    socket.on('meeting:mic-toggle', (payload: { meetingId: string; isMuted: boolean }) => {
        if (!userId || !payload?.meetingId) return
        updatePeerSession(userId, { isMuted: payload.isMuted })
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:mic-toggle', {
            userId,
            isMuted: payload.isMuted
        })
    })

    socket.on('meeting:audio-toggle', (payload: { meetingId: string; isMuted: boolean }) => {
        if (!userId || !payload?.meetingId) return
        updatePeerSession(userId, { isMuted: payload.isMuted })
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:mic-toggle', {
            userId,
            isMuted: payload.isMuted
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

    const handleLeaveOrDisconnect = (payloadMeetingId?: string) => {
        const session = removePeerSessionBySocket(socket.id)
        const targetMeetingId = payloadMeetingId || session?.meetingId || authSocket.meetingId
        const sUserId = session?.userId || userId

        if (targetMeetingId) {
            try {
                socket.leave(`meeting:${targetMeetingId}`)
            } catch (e) {}

            if (sUserId) {
                socket.to(`meeting:${targetMeetingId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                    userId: sUserId,
                    meetingId: targetMeetingId
                })
                socket.to(`meeting:${targetMeetingId}`).emit(SocketEvents.MEETING_LEAVE, {
                    userId: sUserId,
                    meetingId: targetMeetingId
                })
            }
        }
    }

    socket.on(SocketEvents.MEETING_LEAVE, (payload?: { meetingId?: string }) => {
        handleLeaveOrDisconnect(payload?.meetingId)
    })

    socket.on('meeting:leave', (payload?: { meetingId?: string }) => {
        handleLeaveOrDisconnect(payload?.meetingId)
    })

    socket.on(SocketEvents.DISCONNECT, () => {
        handleLeaveOrDisconnect()
    })
}
