import { Schema, model, Document, Types } from 'mongoose'

export interface IMessage extends Document {
    sender: Types.ObjectId
    receiver: Types.ObjectId
    messageType: 'text'
    message: string
    isDelivered: boolean
    isSeen: boolean
    reactions: { userId: Types.ObjectId; emoji: string }[]
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
                emoji: { type: String, required: true }
            }
        ]
    },
    { timestamps: true }
)

export const Message = model<IMessage>('Message', ChatSchema)
