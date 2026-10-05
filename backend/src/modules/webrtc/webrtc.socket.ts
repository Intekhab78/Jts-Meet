import { Server, Socket } from 'socket.io'
import { SocketEvents } from '../../socket/events'
import { AuthenticatedSocket } from '../../socket/auth'
import { addPeerSession, removePeerSessionBySocket, removePeerSessionByUserId, getPeerSessionBySocketId, getMeetingParticipantSocketIds, getMeetingPeersInfo, updatePeerSession } from './peer.manager'
import { authorizeMeetingJoin } from './webrtc.service'
import { joinMeeting } from '../meeting/meeting.service'
import { User } from '../../models/user.model'

// Google Meet / Zoom style Reconnection Grace Period (15 seconds)
// Prevents meetings from auto-cutting when mobile/Wi-Fi has a momentary connection jitter
const pendingDisconnectTimeouts = new Map<string, NodeJS.Timeout>()

export function registerWebRTCHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.WEBRTC_JOIN, async (payload: { meetingId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
        if (!userId || !payload?.meetingId) {
            socket.emit('error', { message: 'Unauthorized or invalid meetingId' })
            return
        }

        const baseMeetingId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        try {
            if (!authSocket.isGuest) {
                await joinMeeting(baseMeetingId, userId)
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

        if (authSocket.meetingId && authSocket.meetingId !== payload.meetingId) {
            socket.leave(`meeting:${authSocket.meetingId}`)
            socket.to(`meeting:${authSocket.meetingId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                userId,
                meetingId: authSocket.meetingId
            })
            removePeerSessionBySocket(socket.id)
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

        const sessionKey = `${userId}:${payload.meetingId}`
        if (pendingDisconnectTimeouts.has(sessionKey)) {
            clearTimeout(pendingDisconnectTimeouts.get(sessionKey)!)
            pendingDisconnectTimeouts.delete(sessionKey)
            console.log(`[WebRTC Socket] User ${userId} successfully reconnected to meeting ${payload.meetingId} within grace period.`)
            socket.to(`meeting:${payload.meetingId}`).emit('webrtc:user-reconnected', {
                userId,
                meetingId: payload.meetingId
            })
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

        // Get total participants in the meeting room and existing peer roster (excluding the joining user themselves)
        let participantCount = 1
        try {
            const sockets = await io.in(`meeting:${payload.meetingId}`).allSockets()
            participantCount = sockets.size
        } catch (_) {
            participantCount = getMeetingPeersInfo(payload.meetingId).length
        }
        const peers = getMeetingPeersInfo(payload.meetingId).filter((p) => p.userId !== userId)

        socket.emit(SocketEvents.WEBRTC_JOIN, { 
            meetingId: payload.meetingId, 
            participants: participantCount,
            peers 
        })

        // If a host joins the meeting, notify guests in the waiting room lobby
        if (!authSocket.isGuest && userId) {
            io.to(`lobby:${baseMeetingId}`).emit('meeting:host-joined', {
                hostName: effectiveName || 'Organizer',
                meetingId: baseMeetingId
            })
            // Also notify the host of existing waiting guests in the lobby
            const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${baseMeetingId}`)
            if (lobbyRoom && lobbyRoom.size > 0) {
                const waitingList: any[] = []
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
                if (waitingList.length > 0) {
                    // Emit as raw array — frontend handleWaitingList accepts both shapes
                    socket.emit('guest:waiting-list', waitingList)
                }
            }
        }
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

    socket.on(SocketEvents.SCREEN_START, async (payload?: { meetingId?: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        const sUserId = String(userId || authSocket.userId || socket.id || '')
        if (!sUserId || !mId) {
            socket.emit('error', { message: 'Invalid screen share start payload' })
            return
        }

        updatePeerSession(sUserId, { isScreenSharing: true })
        io.to(`meeting:${mId}`).emit(SocketEvents.SCREEN_START, { userId: sUserId, meetingId: mId })
        io.to(`meeting:${mId}`).emit(SocketEvents.SCREEN_CHANGED, { userId: sUserId, meetingId: mId, active: true })
    })

    socket.on(SocketEvents.SCREEN_STOP, async (payload?: { meetingId?: string }) => {
        const mId = payload?.meetingId || authSocket.meetingId
        const sUserId = String(userId || authSocket.userId || socket.id || '')
        if (!sUserId || !mId) {
            socket.emit('error', { message: 'Invalid screen share stop payload' })
            return
        }

        updatePeerSession(sUserId, { isScreenSharing: false })
        io.to(`meeting:${mId}`).emit(SocketEvents.SCREEN_STOP, { userId: sUserId, meetingId: mId })
        io.to(`meeting:${mId}`).emit(SocketEvents.SCREEN_CHANGED, { userId: sUserId, meetingId: mId, active: false })
    })

    const handleLeaveOrDisconnect = (payloadMeetingId?: string, forceUserId?: string) => {
        const session = removePeerSessionBySocket(socket.id) || (forceUserId ? removePeerSessionByUserId(forceUserId) : null)
        const targetMeetingId = payloadMeetingId || session?.meetingId || authSocket.meetingId
        const sUserId = forceUserId || session?.userId || userId

        if (targetMeetingId) {
            try {
                socket.leave(`meeting:${targetMeetingId}`)
            } catch (e) {}

            if (sUserId) {
                io.to(`meeting:${targetMeetingId}`).emit(SocketEvents.WEBRTC_USER_LEFT, {
                    userId: sUserId,
                    meetingId: targetMeetingId
                })
                io.to(`meeting:${targetMeetingId}`).emit(SocketEvents.MEETING_LEAVE, {
                    userId: sUserId,
                    meetingId: targetMeetingId
                })
            }
        }
    }

    socket.on(SocketEvents.MEETING_LEAVE, (payload?: { meetingId?: string }) => {
        const targetMeetingId = payload?.meetingId || authSocket.meetingId
        const sUserId = userId || authSocket.userId
        if (sUserId && targetMeetingId) {
            const sessionKey = `${sUserId}:${targetMeetingId}`
            if (pendingDisconnectTimeouts.has(sessionKey)) {
                clearTimeout(pendingDisconnectTimeouts.get(sessionKey)!)
                pendingDisconnectTimeouts.delete(sessionKey)
            }
        }
        handleLeaveOrDisconnect(payload?.meetingId, sUserId)
    })

    socket.on('meeting:leave', (payload?: { meetingId?: string }) => {
        const targetMeetingId = payload?.meetingId || authSocket.meetingId
        const sUserId = userId || authSocket.userId
        if (sUserId && targetMeetingId) {
            const sessionKey = `${sUserId}:${targetMeetingId}`
            if (pendingDisconnectTimeouts.has(sessionKey)) {
                clearTimeout(pendingDisconnectTimeouts.get(sessionKey)!)
                pendingDisconnectTimeouts.delete(sessionKey)
            }
        }
        handleLeaveOrDisconnect(payload?.meetingId, sUserId)
    })

    socket.on(SocketEvents.DISCONNECT, () => {
        const session = getPeerSessionBySocketId(socket.id)
        const targetMeetingId = session?.meetingId || authSocket.meetingId
        const sUserId = session?.userId || userId

        if (!targetMeetingId || !sUserId) {
            handleLeaveOrDisconnect()
            return
        }

        const sessionKey = `${sUserId}:${targetMeetingId}`
        // Clear any prior timer for this session key
        if (pendingDisconnectTimeouts.has(sessionKey)) {
            clearTimeout(pendingDisconnectTimeouts.get(sessionKey)!)
        }

        // Notify room participants that the user has a momentary network interruption
        // Peers will NOT close or destroy their RTCPeerConnection during grace period
        io.to(`meeting:${targetMeetingId}`).emit('webrtc:user-reconnecting', {
            userId: sUserId,
            meetingId: targetMeetingId
        })

        console.log(`[WebRTC Socket] Socket ${socket.id} (user ${sUserId}) dropped unexpectedly. Starting 15s grace window...`)

        const timer = setTimeout(() => {
            pendingDisconnectTimeouts.delete(sessionKey)
            console.log(`[WebRTC Socket] Grace period expired for user ${sUserId} in ${targetMeetingId}. Cleaning up session.`)
            handleLeaveOrDisconnect(targetMeetingId, sUserId)
        }, 15000)

        pendingDisconnectTimeouts.set(sessionKey, timer)
    })
}
