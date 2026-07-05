import { Schema, model, Document, Types } from 'mongoose'

export interface IMeetingChat extends Document {
    meetingId: string
    senderId: Types.ObjectId
    message: string
    messageType: 'text'
    reactions: { userId: Types.ObjectId; emoji: string; createdAt: Date }[]
    createdAt: Date
    updatedAt: Date
    deletedAt?: Date | null
}

const MeetingChatSchema = new Schema<IMeetingChat>(
    {
        meetingId: { type: String, required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true, trim: true },
        messageType: { type: String, enum: ['text'], default: 'text' },
        deletedAt: { type: Date, default: null },
        reactions: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                emoji: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ]
    },
    { timestamps: true }
)

MeetingChatSchema.index({ meetingId: 1, deletedAt: 1, createdAt: -1 })

export const MeetingChat = model<IMeetingChat>('MeetingChat', MeetingChatSchema)
