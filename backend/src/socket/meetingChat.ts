import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { createMeetingChat, addMeetingChatReaction, removeMeetingChatReaction } from '../modules/meeting-chat/meetingChat.service'

export function registerMeetingChatHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.MEETING_CHAT_SEND, async (payload: { meetingId: string; message: string; recipientId?: string; recipientName?: string; attachment?: any; messageType?: string }) => {
        if (!userId || !payload?.meetingId || (!payload?.message && !payload?.attachment)) {
            socket.emit('error', { message: 'Invalid meeting chat payload' })
            return
        }

        try {
            socket.join(`meeting:${payload.meetingId}`)
            const senderDisplayName = authSocket.guestName || (socket.handshake.query?.displayName as string) || undefined
            let chatObj: any
            try {
                const chat = await createMeetingChat(payload.meetingId, userId, payload.message, senderDisplayName)
                chatObj = (chat as any).toObject ? (chat as any).toObject() : { ...chat }
            } catch (e) {
                chatObj = {
                    _id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    meetingId: payload.meetingId,
                    senderId: userId,
                    senderName: senderDisplayName || 'Participant',
                    message: payload.message,
                    createdAt: new Date(),
                    reactions: []
                }
            }

            if (payload.attachment) {
                chatObj.attachment = payload.attachment
                chatObj.messageType = payload.messageType || 'file'
            }

            if (payload.recipientId && payload.recipientId !== 'everyone') {
                const privateChat = {
                    ...chatObj,
                    recipientId: payload.recipientId,
                    recipientName: payload.recipientName,
                    isPrivate: true
                }
                // Deliver to sender and recipient only
                socket.emit(SocketEvents.MEETING_CHAT_RECEIVE, privateChat)
                io.to(`user:${payload.recipientId}`).emit(SocketEvents.MEETING_CHAT_RECEIVE, privateChat)
            } else {
                // Broadcast to the entire meeting room (Host, members, and all guests)
                io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CHAT_RECEIVE, chatObj)
            }
        } catch (error: any) {
            console.error('[MeetingChat] Error sending chat message:', error)
            socket.emit('error', { message: error.message || 'Unable to send meeting chat' })
        }
    })

    socket.on(SocketEvents.MEETING_CHAT_TYPING, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        socket.join(`meeting:${payload.meetingId}`)
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CHAT_TYPING, {
            meetingId: payload.meetingId,
            userId
        })
    })

    socket.on(SocketEvents.MEETING_CHAT_STOP_TYPING, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CHAT_STOP_TYPING, {
            meetingId: payload.meetingId,
            userId
        })
    })

    socket.on(SocketEvents.MEETING_CHAT_REACTION_ADD, async (payload: { meetingId: string; messageId: string; emoji: string }) => {
        if (!userId || !payload?.meetingId || !payload?.messageId || !payload?.emoji) {
            return
        }

        try {
            const result = await addMeetingChatReaction(payload.messageId, userId, payload.emoji)
            if (result) {
                io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CHAT_REACTION_ADD, {
                    meetingId: payload.meetingId,
                    messageId: payload.messageId,
                    userId,
                    emoji: payload.emoji,
                    createdAt: new Date()
                })
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
                io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CHAT_REACTION_REMOVE, {
                    meetingId: payload.meetingId,
                    messageId: payload.messageId,
                    userId,
                    emoji: payload.emoji
                })
            }
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Unable to remove reaction' })
        }
    })
}
