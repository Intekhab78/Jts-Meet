import { Types, startSession } from 'mongoose'
import { Message, IMessage } from './chat.model'
import { User } from '../../models/user.model'
import { NotificationService } from '../notification/notification.service'

export interface RecentChatItem {
    conversationWith: Types.ObjectId
    latestMessage: IMessage
}

export async function createMessage(
    senderId: string, 
    payload: { receiverId: string; message: string; parentMessageId?: string }
): Promise<IMessage> {
    const msgData: any = {
        sender: new Types.ObjectId(senderId),
        receiver: new Types.ObjectId(payload.receiverId),
        messageType: 'text',
        message: payload.message.trim(),
        isDelivered: false,
        isSeen: false
    }

    if (payload.parentMessageId) {
        msgData.parentMessageId = new Types.ObjectId(payload.parentMessageId)
    }

    const session = await startSession()
    let savedMessage: IMessage

    try {
        session.startTransaction()

        const message = new Message(msgData)
        savedMessage = await message.save({ session })

        if (payload.parentMessageId) {
            await Message.findByIdAndUpdate(
                payload.parentMessageId,
                {
                    $inc: { threadCount: 1 },
                    $set: { lastReplyAt: new Date() }
                },
                { session }
            ).exec()
        }

        await session.commitTransaction()

        // Asynchronously dispatch message notification
        const senderUser = await User.findById(senderId)
        const senderName = senderUser?.fullName || 'Someone'

        NotificationService.send({
            recipientId: payload.receiverId,
            title: 'New Message',
            body: `${senderName}: ${payload.message.trim()}`,
            type: 'chat_message',
            metadata: { messageId: savedMessage._id.toString(), senderId, senderName }
        }).catch((err) => {
            console.error('Failed to dispatch message notification:', err)
        })
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }

    return savedMessage
}

export async function markMessageDelivered(messageId: string): Promise<IMessage | null> {
    return Message.findByIdAndUpdate(messageId, { isDelivered: true }, { new: true }).exec()
}

export async function markConversationSeen(userId: string, senderId: string): Promise<void> {
    await Message.updateMany(
        {
            sender: new Types.ObjectId(senderId),
            receiver: new Types.ObjectId(userId),
            isSeen: false
        },
        { isSeen: true }
    ).exec()
}

export async function getConversationBetweenUsers(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 20
): Promise<IMessage[]> {
    const skip = (page - 1) * limit
    const userObjectId = new Types.ObjectId(userId)
    const otherObjectId = new Types.ObjectId(otherUserId)

    return Message.find({
        $or: [
            { sender: userObjectId, receiver: otherObjectId },
            { sender: otherObjectId, receiver: userObjectId }
        ],
        parentMessageId: null
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()
}

export async function getRecentChats(userId: string, page = 1, limit = 20): Promise<RecentChatItem[]> {
    const skip = (page - 1) * limit
    const userObjectId = new Types.ObjectId(userId)

    return Message.aggregate<RecentChatItem>([
        {
            $match: {
                $or: [{ sender: userObjectId }, { receiver: userObjectId }]
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $addFields: {
                conversationWith: {
                    $cond: [{ $eq: ['$sender', userObjectId] }, '$receiver', '$sender']
                }
            }
        },
        {
            $group: {
                _id: '$conversationWith',
                latestMessage: { $first: '$$ROOT' }
            }
        },
        {
            $project: {
                conversationWith: '$_id',
                latestMessage: 1,
                _id: 0
            }
        },
        { $skip: skip },
        { $limit: limit }
    ]).exec()
}

export async function addReactionToMessage(messageId: string, userId: string, emoji: string): Promise<IMessage | null> {
    const userObjectId = new Types.ObjectId(userId)
    const msg = await Message.findById(messageId).exec()
    if (!msg) return null

    // Prevent duplicate reaction of same emoji from same user
    const exists = msg.reactions.some(r => r.userId.equals(userObjectId) && r.emoji === emoji)
    if (exists) {
        return msg
    }

    msg.reactions.push({ userId: userObjectId, emoji, createdAt: new Date() })
    return msg.save()
}

export async function removeReactionFromMessage(messageId: string, userId: string, emoji: string): Promise<IMessage | null> {
    const userObjectId = new Types.ObjectId(userId)
    const msg = await Message.findById(messageId).exec()
    if (!msg) return null

    msg.reactions = msg.reactions.filter(r => !(r.userId.equals(userObjectId) && r.emoji === emoji))
    return msg.save()
}
