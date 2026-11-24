import { Server, Socket } from 'socket.io'
import { ChannelChatService } from '../modules/channel-chat/channelChat.service'
import * as ChannelService from '../modules/channel/channel.service'

export interface HuddleParticipant {
    userId: string
    username: string
    muted: boolean
    joinedAt: number
}

// channelId -> Map<userId, HuddleParticipant>
const channelHuddles = new Map<string, Map<string, HuddleParticipant>>()

function emitHuddleParticipants(io: Server, channelId: string) {
    const map = channelHuddles.get(channelId)
    const participants = map ? Array.from(map.values()) : []
    io.to(channelId).to(`channel:${channelId}`).emit('channel:huddle:participants', {
        channelId,
        participants
    })
}

export function registerChannelChatHandlers(io: Server, socket: Socket) {
    socket.on('channel:message:send', async (payload: any) => {
        const userId = (socket as any).userId
        if (payload?.channelId && userId) {
            const cId = (payload.channelId?._id || payload.channelId).toString()
            try {
                await ChannelService.ensureMember(cId, userId)
            } catch {
                socket.emit('error', { message: 'Forbidden: Not a member of this channel' })
                return
            }
            io.to(cId).to(`channel:${cId}`).emit('channel:message:receive', payload)
        }
    })

    socket.on('channel:join', async (payload: { channelId: string }) => {
        const userId = (socket as any).userId
        if (payload?.channelId && userId) {
            const cId = (payload.channelId as any)?._id ? (payload.channelId as any)._id.toString() : payload.channelId.toString()
            try {
                await ChannelService.ensureMember(cId, userId)
            } catch {
                socket.emit('error', { message: 'Forbidden: Not a member of this channel' })
                return
            }
            socket.join(cId)
            socket.join(`channel:${cId}`)
            // Sync current channel huddle roster to newly joined member
            const map = channelHuddles.get(cId)
            socket.emit('channel:huddle:participants', {
                channelId: cId,
                participants: map ? Array.from(map.values()) : []
            })
            try {
                await ChannelChatService.markChannelMessagesRead(cId, userId)
                io.to(cId).to(`channel:${cId}`).emit('channel:read-receipt:update', {
                    channelId: cId,
                    userId,
                    readAt: new Date()
                })
            } catch (err) {
                console.error('Failed to update read receipts on join:', err)
            }
        }
    })

    socket.on('channel:leave', (payload: { channelId: string }) => {
        if (payload?.channelId) {
            const cId = (payload.channelId as any)?._id ? (payload.channelId as any)._id.toString() : payload.channelId.toString()
            socket.leave(cId)
            socket.leave(`channel:${cId}`)
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

    socket.on('channel:reaction', async (payload: { channelId: string; messageId: string; userId?: string; emoji: string }) => {
        const userId = (socket as any).userId
        if (userId && payload?.channelId && payload?.messageId && payload?.emoji) {
            const cId = payload.channelId.toString()
            try {
                await ChannelService.ensureMember(cId, userId)
                const updated = await ChannelChatService.addReactionToMessage(payload.messageId, userId, payload.emoji, cId)
                if (!updated) return
                io.to(cId).to(`channel:${cId}`).emit('channel:reaction', { ...payload, userId })
            } catch (err) {
                console.error('Failed to add channel reaction:', err)
            }
        }
    })

    // Live Channel Huddle signaling (join / leave / mute / disconnect cleanup)
    socket.on('channel:huddle:join', async (payload: { channelId: string; userId?: string; username?: string }) => {
        const userId = ((socket as any).userId || payload?.userId || '').toString()
        if (!payload?.channelId || !userId) return
        const cId = payload.channelId.toString()
        try {
            await ChannelService.ensureMember(cId, userId)
        } catch {
            return
        }
        if (!channelHuddles.has(cId)) {
            channelHuddles.set(cId, new Map())
        }
        channelHuddles.get(cId)!.set(userId, {
            userId,
            username: payload.username || 'Member',
            muted: false,
            joinedAt: Date.now()
        })
        emitHuddleParticipants(io, cId)
    })

    socket.on('channel:huddle:mute', (payload: { channelId: string; userId?: string; muted: boolean }) => {
        const userId = ((socket as any).userId || payload?.userId || '').toString()
        if (!payload?.channelId || !userId) return
        const cId = payload.channelId.toString()
        const room = channelHuddles.get(cId)
        const existing = room?.get(userId)
        if (existing) {
            existing.muted = Boolean(payload.muted)
            emitHuddleParticipants(io, cId)
        }
    })

    socket.on('channel:huddle:leave', (payload: { channelId: string; userId?: string }) => {
        const userId = ((socket as any).userId || payload?.userId || '').toString()
        if (!payload?.channelId || !userId) return
        const cId = payload.channelId.toString()
        const room = channelHuddles.get(cId)
        if (room && room.delete(userId)) {
            if (room.size === 0) channelHuddles.delete(cId)
            emitHuddleParticipants(io, cId)
        }
    })

    socket.on('disconnect', () => {
        const userId = ((socket as any).userId || '').toString()
        if (!userId) return
        for (const [cId, room] of channelHuddles.entries()) {
            if (room.delete(userId)) {
                if (room.size === 0) channelHuddles.delete(cId)
                emitHuddleParticipants(io, cId)
            }
        }
    })
}
