import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { SocketEvents } from './events'
import { authenticateSocket, AuthenticatedSocket } from './auth'
import { setUserOnline, removeUserSocket, markUserOnline, markUserOffline, getUserSocket } from './presence'
import { createMessage, markMessageDelivered, markConversationSeen, addReactionToMessage } from '../modules/chat/chat.service'
import { registerMeetingHandlers } from './meeting'
import { registerMeetingChatHandlers } from './meetingChat'
import { registerChannelChatHandlers } from './channelChat'
import { registerWebRTCHandlers } from '../modules/webrtc/webrtc.socket'

export function initializeSocket(server: HttpServer) {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    })

    io.on(SocketEvents.CONNECTION, async (socket: Socket) => {
        const authSocket = socket as AuthenticatedSocket
        const isAuthenticated = authenticateSocket(authSocket)

        if (!isAuthenticated || !authSocket.userId) {
            socket.disconnect(true)
            return
        }

        const userId = authSocket.userId
        setUserOnline(userId, socket.id)
        await markUserOnline(userId)
        io.emit(SocketEvents.USER_ONLINE, { userId })

        socket.on(SocketEvents.CHAT_SEND, async (payload: { receiverId: string; message: string }) => {
            const chatMessage = await createMessage(userId, payload)
            const receiverSocketId = getUserSocket(payload.receiverId)
            let delivered = false

            if (receiverSocketId) {
                io.to(receiverSocketId).emit(SocketEvents.CHAT_RECEIVE, chatMessage)
                const deliveredMessage = await markMessageDelivered(chatMessage._id.toString())
                delivered = !!deliveredMessage
                socket.emit(SocketEvents.CHAT_DELIVERED, { messageId: chatMessage._id, receiverId: payload.receiverId, delivered })
            }

            if (!receiverSocketId) {
                socket.emit(SocketEvents.CHAT_DELIVERED, { messageId: chatMessage._id, receiverId: payload.receiverId, delivered })
            }
        })

        socket.on(SocketEvents.CHAT_SEEN, async (payload: { senderId: string }) => {
            if (!payload?.senderId) {
                return
            }
            await markConversationSeen(userId, payload.senderId)
            const senderSocketId = getUserSocket(payload.senderId)
            if (senderSocketId) {
                io.to(senderSocketId).emit(SocketEvents.CHAT_SEEN, { userId, senderId: payload.senderId })
            }
        })

        socket.on('chat:typing', (payload: { receiverId: string; typing: boolean }) => {
            if (!payload?.receiverId) return
            const receiverSocketId = getUserSocket(payload.receiverId)
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('chat:typing', { senderId: userId, typing: payload.typing })
            }
        })

        socket.on('chat:reaction', async (payload: { receiverId: string; messageId: string; emoji: string }) => {
            if (!payload?.receiverId || !payload?.messageId || !payload?.emoji) return
            try {
                await addReactionToMessage(payload.messageId, userId, payload.emoji)
                const receiverSocketId = getUserSocket(payload.receiverId)
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('chat:reaction', { senderId: userId, messageId: payload.messageId, emoji: payload.emoji })
                }
            } catch (err) {
                console.error('Failed to add DM reaction:', err)
            }
        })

        registerMeetingHandlers(io, socket)
        registerMeetingChatHandlers(io, socket)
        registerChannelChatHandlers(io, socket)
        registerWebRTCHandlers(io, socket)

        socket.on(SocketEvents.DISCONNECT, async () => {
            removeUserSocket(userId)
            await markUserOffline(userId)
            io.emit(SocketEvents.USER_OFFLINE, { userId })
        })
    })

    return io
}
