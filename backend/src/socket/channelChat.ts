import { Server, Socket } from 'socket.io'
import { ChannelChatService } from '../modules/channel-chat/channelChat.service'

export function registerChannelChatHandlers(io: Server, socket: Socket) {
    socket.on('channel:message:send', (payload: any) => {
        if (payload?.channelId) {
            io.to(payload.channelId).emit('channel:message:receive', payload)
        }
    })

    socket.on('channel:join', async (payload: { channelId: string }) => {
        if (payload?.channelId) {
            socket.join(payload.channelId)
            const userId = (socket as any).userId
            if (userId) {
                try {
                    await ChannelChatService.markChannelMessagesRead(payload.channelId, userId)
                    io.to(payload.channelId).emit('channel:read-receipt:update', {
                        channelId: payload.channelId,
                        userId,
                        readAt: new Date()
                    })
                } catch (err) {
                    console.error('Failed to update read receipts on join:', err)
                }
            }
        }
    })

    socket.on('channel:leave', (payload: { channelId: string }) => {
        if (payload?.channelId) {
            socket.leave(payload.channelId)
        }
    })

    socket.on('channel:read-receipt:read', async (payload: { channelId: string }) => {
        const userId = (socket as any).userId
        if (userId && payload?.channelId) {
            try {
                await ChannelChatService.markChannelMessagesRead(payload.channelId, userId)
                io.to(payload.channelId).emit('channel:read-receipt:update', {
                    channelId: payload.channelId,
                    userId,
                    readAt: new Date()
                })
            } catch (err) {
                console.error('Failed to update channel read receipts:', err)
            }
        }
    })

    socket.on('channel:read-receipt:delivered', async (payload: { channelId: string }) => {
        const userId = (socket as any).userId
        if (userId && payload?.channelId) {
            try {
                await ChannelChatService.markChannelMessagesDelivered(payload.channelId, userId)
                io.to(payload.channelId).emit('channel:read-receipt:delivered-update', {
                    channelId: payload.channelId,
                    userId,
                    deliveredAt: new Date()
                })
            } catch (err) {
                console.error('Failed to update channel delivered receipts:', err)
            }
        }
    })

    socket.on('channel:typing', (payload: { channelId: string; userId: string; username: string; typing: boolean }) => {
        if (payload?.channelId) {
            socket.to(payload.channelId).emit('channel:typing', payload)
        }
    })

    socket.on('channel:reaction', async (payload: { channelId: string; messageId: string; userId: string; emoji: string }) => {
        if (payload?.channelId && payload?.messageId) {
            try {
                await ChannelChatService.addReactionToMessage(payload.messageId, payload.userId, payload.emoji)
                io.to(payload.channelId).emit('channel:reaction', payload)
            } catch (err) {
                console.error('Failed to add channel reaction:', err)
            }
        }
    })
}
