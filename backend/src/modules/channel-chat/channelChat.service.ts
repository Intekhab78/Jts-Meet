import { Types } from 'mongoose'
import { ChannelChat, IChannelChat } from './channelChat.model'
import { getChannel } from '../channel/channel.service'

export class ChannelChatService {
    static async createMessage(channelId: string, senderId: string, content: string, replyTo?: string) {
        const channel = await getChannel(channelId)
        if (!channel) {
            throw new Error('Channel not found')
        }

        const message = new ChannelChat({
            channelId,
            senderId: new Types.ObjectId(senderId),
            content,
            replyTo: replyTo ? new Types.ObjectId(replyTo) : null
        })
        await message.save()

        const populated = await message.populate('senderId', 'fullName email profileImage')
        return populated.toObject()
    }

    static async getMessages(channelId: string, limit = 50, before?: string, threadParentId?: string, cursor?: string, search?: string) {
        const query: Record<string, any> = {
            channelId,
            deleted: false
        }
        if (before) {
            query.createdAt = { $lt: new Date(before) }
        }
        if (threadParentId) {
            query.replyTo = new Types.ObjectId(threadParentId)
        } else {
            query.replyTo = null
        }

        if (search && search.trim()) {
            const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            query.content = new RegExp(escapedSearch, 'i')
        }

        if (cursor && Types.ObjectId.isValid(cursor)) {
            query._id = { $lt: new Types.ObjectId(cursor) }
        }

        return ChannelChat.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .populate('senderId', 'fullName email profileImage')
            .lean()
    }

    static async getMessageById(messageId: string) {
        return ChannelChat.findById(messageId).populate('senderId', 'fullName email profileImage').lean()
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
        const populated = await message.populate('senderId', 'fullName email profileImage')
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

    static async markChannelMessagesDelivered(channelId: string, userId: string): Promise<void> {
        const userObjectId = new Types.ObjectId(userId)

        await ChannelChat.updateMany(
            {
                channelId,
                deleted: false,
                'readBy.userId': { $ne: userObjectId }
            },
            {
                $push: {
                    readBy: {
                        userId: userObjectId,
                        deliveredAt: new Date()
                    }
                }
            }
        )
    }

    static async markChannelMessagesRead(channelId: string, userId: string): Promise<void> {
        const userObjectId = new Types.ObjectId(userId)
        const now = new Date()

        await ChannelChat.updateMany(
            {
                channelId,
                deleted: false,
                'readBy': {
                    $elemMatch: {
                        userId: userObjectId,
                        readAt: null
                    }
                }
            },
            {
                $set: {
                    'readBy.$.readAt': now
                }
            }
        )

        await ChannelChat.updateMany(
            {
                channelId,
                deleted: false,
                'readBy.userId': { $ne: userObjectId }
            },
            {
                $push: {
                    readBy: {
                        userId: userObjectId,
                        deliveredAt: now,
                        readAt: now
                    }
                }
            }
        )
    }
}
