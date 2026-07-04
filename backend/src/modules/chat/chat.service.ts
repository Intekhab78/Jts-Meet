import { Types } from 'mongoose'
import { Message, IMessage } from './chat.model'

export interface RecentChatItem {
    conversationWith: Types.ObjectId
    latestMessage: IMessage
}

export async function createMessage(senderId: string, payload: { receiverId: string; message: string }): Promise<IMessage> {
    const message = new Message({
        sender: new Types.ObjectId(senderId),
        receiver: new Types.ObjectId(payload.receiverId),
        messageType: 'text',
        message: payload.message.trim(),
        isDelivered: false,
        isSeen: false
    })

    await message.save()
    return message
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
        ]
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

    msg.reactions = (msg.reactions || []).filter((r: any) => !r.userId.equals(userObjectId))
    msg.reactions.push({ userId: userObjectId, emoji })
    return msg.save()
}
