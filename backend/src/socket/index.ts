import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { SocketEvents } from './events'
import { authenticateSocket, AuthenticatedSocket } from './auth'
import { setUserOnline, removeUserSocket, markUserOnline, markUserOffline } from './presence'
import { createMessage, markMessageDelivered, markConversationSeen, addReactionToMessage, removeReactionFromMessage } from '../modules/chat/chat.service'
import { registerMeetingHandlers } from './meeting'
import { registerMeetingChatHandlers } from './meetingChat'
import { registerChannelChatHandlers } from './channelChat'
import { registerWebRTCHandlers } from '../modules/webrtc/webrtc.socket'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { getMeetingSocketId } from '../modules/webrtc/peer.manager'
import { RedisService } from '../services/redis.service'
import { User } from '../models/user.model'
import { Message } from '../modules/chat/chat.model'

export async function initializeSocket(server: HttpServer): Promise<Server> {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    })

    try {
        const redisService = RedisService.getInstance()
        await redisService.connect()

        const pubClient = redisService.getClient()
        const subClient = pubClient.duplicate()

        subClient.on('error', (err) => {
            if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
                return
            }
            // eslint-disable-next-line no-console
            console.error('Redis SubClient Error:', err)
        })
        subClient.on('connect', () => {
            // eslint-disable-next-line no-console
            console.log('Redis SubClient connected successfully')
        })

        await subClient.connect()
        io.adapter(createAdapter(pubClient, subClient))
        // eslint-disable-next-line no-console
        console.log('Redis Socket Adapter mounted successfully')
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn('Redis socket adapter failed to initialize (falling back to standard in-memory Socket.IO adapter).')
    }

    // Server-to-server guest approval/denial handlers
    io.on("internal:guest:approve-cluster", (socketId: string) => {
        const guestSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket
        if (guestSocket) {
            guestSocket.isPending = false
            guestSocket.leave(`lobby:${guestSocket.meetingId}`)
            
            // Generate a NEW guest token with isPending: false to prevent pending limbo on reconnect
            const token = jwt.sign(
                {
                    userId: guestSocket.userId,
                    isGuest: true,
                    guestName: guestSocket.guestName,
                    meetingId: guestSocket.meetingId,
                    isPending: false
                },
                JWT_SECRET,
                { expiresIn: '6h' }
            )
            
            guestSocket.emit('guest:approved', { token })
            
            // Broadcast status change to meeting participants
            io.to(`meeting:${guestSocket.meetingId}`).emit('guest:status-changed', { socketId, status: 'approved' })
        }
    })

    io.on("internal:guest:deny-cluster", (socketId: string) => {
        const guestSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket
        if (guestSocket) {
            guestSocket.emit('guest:denied')
            guestSocket.disconnect(true)
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
        await socket.join(`user:${userId}`)

        // Handle Guest Flow
        if (authSocket.isGuest) {
            if (authSocket.isPending) {
                // Join the guest lobby room
                socket.join(`lobby:${authSocket.meetingId}`)
                
                // Notify the meeting host that a guest is waiting
                const meeting = await getMeetingByMeetingId(authSocket.meetingId || '')
                if (meeting) {
                    const hostId = meeting.host._id.toString()
                    const hostSocketId = getMeetingSocketId(hostId, authSocket.meetingId || '')
                    if (hostSocketId) {
                        io.to(hostSocketId).emit('guest:new-waiting', {
                            socketId: socket.id,
                            userId: authSocket.userId,
                            guestName: authSocket.guestName,
                            email: socket.handshake.query?.email || '',
                            company: socket.handshake.query?.company || ''
                        })
                    }
                }
                
                // Register disconnect handler for pending guest
                socket.on(SocketEvents.DISCONNECT, () => {
                    if (meeting) {
                        const hostId = meeting.host._id.toString()
                        const hostSocketId = getMeetingSocketId(hostId, authSocket.meetingId || '')
                        if (hostSocketId) {
                            io.to(hostSocketId).emit('guest:left-waiting', { socketId: socket.id })
                        }
                    }
                })
                return
            }

            // Approved/public guest: Register meeting, chat and WebRTC handlers
            registerMeetingHandlers(io, socket)
            registerMeetingChatHandlers(io, socket)
            registerWebRTCHandlers(io, socket)

            socket.on(SocketEvents.DISCONNECT, () => {
                // Approved guest disconnect cleanup
            })
            return
        }

        setUserOnline(userId, socket.id)
        await markUserOnline(userId)
        io.emit(SocketEvents.USER_ONLINE, { userId })

        socket.on(SocketEvents.CHAT_SEND, async (payload: { receiverId: string; message: string; parentMessageId?: string }) => {
            const chatMessage = await createMessage(userId, payload)
            const receiver = await User.findById(payload.receiverId).select('status').lean().exec()
            const isOnline = receiver?.status === 'online'
            let delivered = false

            if (payload.parentMessageId) {
                const parentMsg = await Message.findById(payload.parentMessageId).exec()
                io.to(`user:${userId}`).to(`user:${payload.receiverId}`).emit(SocketEvents.THREAD_CREATED, chatMessage)
                if (parentMsg) {
                    io.to(`user:${userId}`).to(`user:${payload.receiverId}`).emit(SocketEvents.THREAD_UPDATED, parentMsg)
                }
                delivered = true
            } else if (isOnline) {
                io.to(`user:${payload.receiverId}`).emit(SocketEvents.CHAT_RECEIVE, chatMessage)
                const deliveredMessage = await markMessageDelivered(chatMessage._id.toString())
                delivered = !!deliveredMessage
            }

            socket.emit(SocketEvents.CHAT_DELIVERED, { messageId: chatMessage._id, receiverId: payload.receiverId, delivered })
            if (delivered) {
                io.to(`user:${userId}`).emit(SocketEvents.MESSAGE_DELIVERED, {
                    messageId: chatMessage._id,
                    userId: payload.receiverId,
                    deliveredAt: new Date()
                })
            }
        })

        socket.on(SocketEvents.CHAT_SEEN, async (payload: { senderId: string }) => {
            if (!payload?.senderId) {
                return
            }
            await markConversationSeen(userId, payload.senderId)
            const sender = await User.findById(payload.senderId).select('status').lean().exec()
            if (sender?.status === 'online') {
                io.to(`user:${payload.senderId}`).emit(SocketEvents.CHAT_SEEN, { userId, senderId: payload.senderId })
                io.to(`user:${payload.senderId}`).emit(SocketEvents.MESSAGE_READ, {
                    userId,
                    readAt: new Date()
                })
            }
        })

        socket.on(SocketEvents.MESSAGE_DELIVERED, async (payload: { messageId: string; receiverId: string }) => {
            if (!payload?.messageId || !payload?.receiverId) return
            io.to(`user:${payload.receiverId}`).emit(SocketEvents.MESSAGE_DELIVERED, {
                messageId: payload.messageId,
                userId,
                deliveredAt: new Date()
            })
        })

        socket.on(SocketEvents.MESSAGE_READ, async (payload: { messageId: string; receiverId: string }) => {
            if (!payload?.messageId || !payload?.receiverId) return
            io.to(`user:${payload.receiverId}`).emit(SocketEvents.MESSAGE_READ, {
                messageId: payload.messageId,
                userId,
                readAt: new Date()
            })
        })

        socket.on('chat:typing', async (payload: { receiverId: string; typing: boolean }) => {
            if (!payload?.receiverId) return
            const receiver = await User.findById(payload.receiverId).select('status').lean().exec()
            if (receiver?.status === 'online') {
                io.to(`user:${payload.receiverId}`).emit('chat:typing', { senderId: userId, typing: payload.typing })
            }
        })

        socket.on(SocketEvents.TYPING_START, (payload: { receiverId: string }) => {
            if (!payload?.receiverId) return
            io.to(`user:${payload.receiverId}`).emit(SocketEvents.TYPING_START, { senderId: userId })
        })

        socket.on(SocketEvents.TYPING_STOP, (payload: { receiverId: string }) => {
            if (!payload?.receiverId) return
            io.to(`user:${payload.receiverId}`).emit(SocketEvents.TYPING_STOP, { senderId: userId })
        })

        socket.on('chat:reaction', async (payload: { receiverId: string; messageId: string; emoji: string }) => {
            if (!payload?.receiverId || !payload?.messageId || !payload?.emoji) return
            try {
                await addReactionToMessage(payload.messageId, userId, payload.emoji)
                const receiver = await User.findById(payload.receiverId).select('status').lean().exec()
                if (receiver?.status === 'online') {
                    io.to(`user:${payload.receiverId}`).emit('chat:reaction', { senderId: userId, messageId: payload.messageId, emoji: payload.emoji })
                }
            } catch (err) {
                console.error('Failed to add DM reaction:', err)
            }
        })

        socket.on(SocketEvents.REACTION_ADD, async (payload: { messageId: string; receiverId: string; emoji: string }) => {
            if (!payload?.messageId || !payload?.receiverId || !payload?.emoji) return
            try {
                const result = await addReactionToMessage(payload.messageId, userId, payload.emoji)
                if (result) {
                    io.to(`user:${userId}`).to(`user:${payload.receiverId}`).emit(SocketEvents.REACTION_ADD, {
                        messageId: payload.messageId,
                        userId,
                        emoji: payload.emoji,
                        createdAt: new Date()
                    })
                }
            } catch (error) {
                console.error('Failed to add reaction via socket:', error)
            }
        })

        socket.on(SocketEvents.REACTION_REMOVE, async (payload: { messageId: string; receiverId: string; emoji: string }) => {
            if (!payload?.messageId || !payload?.receiverId || !payload?.emoji) return
            try {
                const result = await removeReactionFromMessage(payload.messageId, userId, payload.emoji)
                if (result) {
                    io.to(`user:${userId}`).to(`user:${payload.receiverId}`).emit(SocketEvents.REACTION_REMOVE, {
                        messageId: payload.messageId,
                        userId,
                        emoji: payload.emoji
                    })
                }
            } catch (error) {
                console.error('Failed to remove reaction via socket:', error)
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
