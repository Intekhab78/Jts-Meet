import { Types } from 'mongoose'
import { ChannelChat, IChannelChat } from './channelChat.model'
import { getChannel } from '../channel/channel.service'

export class ChannelChatService {
    static async createMessage(channelId: string, senderId: string, content: string) {
        const channel = await getChannel(channelId)
        if (!channel) {
            throw new Error('Channel not found')
        }

        const message = new ChannelChat({
            channelId,
            senderId: new Types.ObjectId(senderId),
            content
        })
        await message.save()

        const populated = await message.populate('senderId', 'fullName email profileImage')
        return populated.toObject()
    }

    static async getMessages(channelId: string, limit = 50, before?: string) {
        const query: Record<string, any> = {
            channelId,
            deleted: false
        }
        if (before) {
            query.createdAt = { $lt: new Date(before) }
        }

        return ChannelChat.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('senderId', 'name email')
            .lean()
    }

    static async getMessageById(messageId: string) {
        return ChannelChat.findById(messageId).populate('senderId', 'name email').lean()
    }

    static async editMessage(messageId: string, senderId: string, content: string) {
        const message = await ChannelChat.findById(messageId)
        if (!message || message.deleted) {
            throw new Error('Message not found')
        }
        if (message.senderId.toString() !== senderId) {
            throw new Error('Forbidden')
        }

        message.content = content
        message.edited = true
        await message.save()
        const populated = await message.populate('senderId', 'name email')
        return populated.toObject()
    }

    static async deleteMessage(messageId: string, senderId: string) {
        const message = await ChannelChat.findById(messageId)
        if (!message || message.deleted) {
            throw new Error('Message not found')
        }
        if (message.senderId.toString() !== senderId) {
            throw new Error('Forbidden')
        }

        message.deleted = true
        await message.save()
        return message
    }

    static async addReactionToMessage(messageId: string, userId: string, emoji: string) {
        const userObjectId = new Types.ObjectId(userId)
        const msg = await ChannelChat.findById(messageId)
        if (!msg) return null

        msg.reactions = (msg.reactions || []).filter((r: any) => !r.userId.equals(userObjectId))
        msg.reactions.push({ userId: userObjectId, emoji })
        return msg.save()
    }
}
