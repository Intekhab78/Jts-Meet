import { Server, Socket } from 'socket.io'
import { ChannelChatService } from '../modules/channel-chat/channelChat.service'

export function registerChannelChatHandlers(io: Server, socket: Socket) {
    socket.on('channel:message:send', (payload: any) => {
        if (payload?.channelId) {
            io.to(payload.channelId).emit('channel:message:receive', payload)
        }
    })

    socket.on('channel:join', (payload: { channelId: string }) => {
        if (payload?.channelId) {
            socket.join(payload.channelId)
        }
    })

    socket.on('channel:leave', (payload: { channelId: string }) => {
        if (payload?.channelId) {
            socket.leave(payload.channelId)
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
