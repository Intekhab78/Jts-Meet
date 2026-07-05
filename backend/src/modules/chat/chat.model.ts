import { Schema, model, Document, Types } from 'mongoose'

export interface IMessage extends Document {
    sender: Types.ObjectId
    receiver: Types.ObjectId
    messageType: 'text'
    message: string
    isDelivered: boolean
    isSeen: boolean
    reactions: { userId: Types.ObjectId; emoji: string; createdAt: Date }[]
    parentMessageId?: Types.ObjectId | null
    threadCount?: number
    lastReplyAt?: Date | null
    createdAt: Date
    updatedAt: Date
}

const ChatSchema = new Schema<IMessage>(
    {
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        messageType: { type: String, enum: ['text'], default: 'text' },
        message: { type: String, required: true, trim: true },
        isDelivered: { type: Boolean, default: false },
        isSeen: { type: Boolean, default: false },
        reactions: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                emoji: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        parentMessageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
        threadCount: { type: Number, default: 0 },
        lastReplyAt: { type: Date, default: null }
    },
    { timestamps: true }
)

ChatSchema.index({ sender: 1, receiver: 1, createdAt: -1 })
ChatSchema.index({ receiver: 1, sender: 1, createdAt: -1 })
ChatSchema.index({ parentMessageId: 1 })

export const Message = model<IMessage>('Message', ChatSchema)
