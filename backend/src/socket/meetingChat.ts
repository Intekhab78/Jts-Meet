import { Types } from 'mongoose'
import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { createMeetingChat } from '../modules/meeting-chat/meetingChat.service'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'
import { getUserSocket } from './presence'

export function registerMeetingChatHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.MEETING_CHAT_SEND, async (payload: { meetingId: string; message: string }) => {
        if (!userId || !payload?.meetingId || !payload?.message || typeof payload.message !== 'string') {
            socket.emit('error', { message: 'Invalid meeting chat payload' })
            return
        }

        try {
            const chat = await createMeetingChat(payload.meetingId, userId, payload.message)
            const meeting = await getMeetingByMeetingId(payload.meetingId)
            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            meeting.participants.forEach((participant) => {
                const participantId = participant.toString()
                const participantSocketId = getUserSocket(participantId)
                if (participantSocketId) {
                    io.to(participantSocketId).emit(SocketEvents.MEETING_CHAT_RECEIVE, chat)
                }
            })
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Unable to send meeting chat' })
        }
    })

    socket.on(SocketEvents.MEETING_CHAT_TYPING, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        const meeting = await getMeetingByMeetingId(payload.meetingId)
        if (!meeting) {
            return
        }

        const currentUserId = new Types.ObjectId(userId)
        if (!meeting.participants.some((participant) => participant.equals(currentUserId))) {
            return
        }

        meeting.participants.forEach((participant) => {
            const participantId = participant.toString()
            if (participantId === userId) {
                return
            }

            const participantSocketId = getUserSocket(participantId)
            if (participantSocketId) {
                io.to(participantSocketId).emit(SocketEvents.MEETING_CHAT_TYPING, {
                    meetingId: payload.meetingId,
                    userId
                })
            }
        })
    })

    socket.on(SocketEvents.MEETING_CHAT_STOP_TYPING, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        const meeting = await getMeetingByMeetingId(payload.meetingId)
        if (!meeting) {
            return
        }

        const currentUserId = new Types.ObjectId(userId)
        if (!meeting.participants.some((participant) => participant.equals(currentUserId))) {
            return
        }

        meeting.participants.forEach((participant) => {
            const participantId = participant.toString()
            if (participantId === userId) {
                return
            }

            const participantSocketId = getUserSocket(participantId)
            if (participantSocketId) {
                io.to(participantSocketId).emit(SocketEvents.MEETING_CHAT_STOP_TYPING, {
                    meetingId: payload.meetingId,
                    userId
                })
            }
        })
    })
}
