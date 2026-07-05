import { Schema, model, Document, Types } from 'mongoose'

export interface IChannelChat extends Document {
    channelId: string
    senderId: Types.ObjectId
    messageType: 'text'
    content: string
    replyTo?: Types.ObjectId | null
    reactions: { userId: Types.ObjectId; emoji: string }[]
    readBy: {
        userId: Types.ObjectId
        deliveredAt?: Date
        readAt?: Date
    }[]
    edited: boolean
    deleted: boolean
    createdAt: Date
    updatedAt: Date
}

const ChannelChatSchema = new Schema<IChannelChat>(
    {
        channelId: { type: String, required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        messageType: { type: String, enum: ['text'], default: 'text' },
        content: { type: String, required: true, trim: true },
        replyTo: { type: Schema.Types.ObjectId, ref: 'ChannelChat', default: null },
        reactions: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                emoji: { type: String, required: true }
            }
        ],
        readBy: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                deliveredAt: { type: Date },
                readAt: { type: Date }
            }
        ],
        edited: { type: Boolean, default: false },
        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
)

ChannelChatSchema.index({ channelId: 1, deleted: 1, replyTo: 1, createdAt: -1 })

export const ChannelChat = model<IChannelChat>('ChannelChat', ChannelChatSchema)
