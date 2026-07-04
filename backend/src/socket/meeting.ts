import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { getUserSocket } from './presence'
import {
    createMeeting,
    joinMeeting as joinMeetingService,
    leaveMeeting as leaveMeetingService,
    endMeeting as endMeetingService
} from '../modules/meeting/meeting.service'
import { SocketEvents } from './events'
import { getMeetingParticipantSocketIds, getMeetingSocketId } from '../modules/webrtc/peer.manager'

export function registerMeetingHandlers(io: Server, socket: Socket) {
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
        if (!userId) {
            return
        }

        const meeting = await joinMeetingService(payload.meetingId, userId)
        if (!meeting) {
            socket.emit('error', { message: 'Meeting not found' })
            return
        }

        io.emit(SocketEvents.MEETING_JOIN, { meetingId: payload.meetingId, participants: meeting.participants })
    })

    socket.on(SocketEvents.MEETING_LEAVE, async (payload: { meetingId: string }) => {
        if (!userId) {
            return
        }

        const meeting = await leaveMeetingService(payload.meetingId, userId)
        if (!meeting) {
            socket.emit('error', { message: 'Meeting not found' })
            return
        }

        io.emit(SocketEvents.MEETING_LEAVE, { meetingId: payload.meetingId, participants: meeting.participants })
    })

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

            io.emit(SocketEvents.MEETING_END, { meetingId: payload.meetingId, status: meeting.status, participants: meeting.participants })
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Forbidden' })
        }
    })

    socket.on(SocketEvents.MEETING_MUTE_USER, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        
        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_MUTE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        })
    })

    socket.on(SocketEvents.MEETING_REMOVE_USER, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_REMOVE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        })

        const targetSocketId = getMeetingSocketId(payload.targetUserId, payload.meetingId)
        if (targetSocketId) {
            io.to(targetSocketId).emit(SocketEvents.MEETING_REMOVE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId, kicked: true })
        }
    })

    socket.on(SocketEvents.MEETING_RAISE_HAND, (payload: { meetingId: string; raised: boolean }) => {
        if (!userId || !payload?.meetingId) return

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_RAISE_HAND, { userId, meetingId: payload.meetingId, raised: payload.raised })
        })
    })

    socket.on(SocketEvents.MEETING_REACTION, (payload: { meetingId: string; emoji: string }) => {
        if (!userId || !payload?.meetingId || !payload?.emoji) return

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_REACTION, { userId, meetingId: payload.meetingId, emoji: payload.emoji })
        })
    })

    socket.on(SocketEvents.MEETING_COHOST_PROMOTE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_COHOST_PROMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        })
    })

    socket.on(SocketEvents.MEETING_COHOST_DEMOTE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_COHOST_DEMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        })
    })

    socket.on(SocketEvents.MEETING_WAITING_APPROVE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        const otherSocketIds = getMeetingParticipantSocketIds(payload.meetingId, userId)
        otherSocketIds.forEach((otherSocketId) => {
            io.to(otherSocketId).emit(SocketEvents.MEETING_WAITING_APPROVE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        })
    })
}
