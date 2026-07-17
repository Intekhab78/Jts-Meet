import { Types } from 'mongoose'
import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { createMeetingChat, addMeetingChatReaction, removeMeetingChatReaction } from '../modules/meeting-chat/meetingChat.service'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'

function getMeetingRecipientIds(meeting: any): string[] {
    const ids = new Set<string>()
    if (meeting.host) {
        ids.add(typeof meeting.host === 'object' ? meeting.host._id.toString() : meeting.host.toString())
    }
    if (meeting.coHosts && Array.isArray(meeting.coHosts)) {
        meeting.coHosts.forEach((ch: any) => ids.add(ch.toString()))
    }
    if (meeting.participants && Array.isArray(meeting.participants)) {
        meeting.participants.forEach((p: any) => ids.add(p.toString()))
    }
    return Array.from(ids)
}

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

            const recipientIds = getMeetingRecipientIds(meeting)
            recipientIds.forEach((participantId) => {
                io.to(`user:${participantId}`).emit(SocketEvents.MEETING_CHAT_RECEIVE, chat)
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

        const recipientIds = getMeetingRecipientIds(meeting)
        if (!recipientIds.includes(userId)) {
            return
        }

        recipientIds.forEach((participantId) => {
            if (participantId === userId) {
                return
            }

            io.to(`user:${participantId}`).emit(SocketEvents.MEETING_CHAT_TYPING, {
                meetingId: payload.meetingId,
                userId
            })
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

        const recipientIds = getMeetingRecipientIds(meeting)
        if (!recipientIds.includes(userId)) {
            return
        }

        recipientIds.forEach((participantId) => {
            if (participantId === userId) {
                return
            }

            io.to(`user:${participantId}`).emit(SocketEvents.MEETING_CHAT_STOP_TYPING, {
                meetingId: payload.meetingId,
                userId
            })
        })
    })

    socket.on(SocketEvents.MEETING_CHAT_REACTION_ADD, async (payload: { meetingId: string; messageId: string; emoji: string }) => {
        if (!userId || !payload?.meetingId || !payload?.messageId || !payload?.emoji) {
            return
        }

        try {
            const result = await addMeetingChatReaction(payload.messageId, userId, payload.emoji)
            if (result) {
                const meeting = await getMeetingByMeetingId(payload.meetingId)
                if (meeting) {
                    const recipientIds = getMeetingRecipientIds(meeting)
                    recipientIds.forEach((participantId) => {
                        io.to(`user:${participantId}`).emit(SocketEvents.MEETING_CHAT_REACTION_ADD, {
                            meetingId: payload.meetingId,
                            messageId: payload.messageId,
                            userId,
                            emoji: payload.emoji,
                            createdAt: new Date()
                        })
                    })
                }
            }
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Unable to add reaction' })
        }
    })

    socket.on(SocketEvents.MEETING_CHAT_REACTION_REMOVE, async (payload: { meetingId: string; messageId: string; emoji: string }) => {
        if (!userId || !payload?.meetingId || !payload?.messageId || !payload?.emoji) {
            return
        }

        try {
            const result = await removeMeetingChatReaction(payload.messageId, userId, payload.emoji)
            if (result) {
                const meeting = await getMeetingByMeetingId(payload.meetingId)
                if (meeting) {
                    const recipientIds = getMeetingRecipientIds(meeting)
                    recipientIds.forEach((participantId) => {
                        io.to(`user:${participantId}`).emit(SocketEvents.MEETING_CHAT_REACTION_REMOVE, {
                            meetingId: payload.meetingId,
                            messageId: payload.messageId,
                            userId,
                            emoji: payload.emoji
                        })
                    })
                }
            }
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Unable to remove reaction' })
        }
    })
}
