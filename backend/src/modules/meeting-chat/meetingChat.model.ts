import { Schema, model, Document, Types } from 'mongoose'

export interface IMeetingChat extends Document {
    meetingId: string
    senderId: Types.ObjectId
    message: string
    messageType: 'text'
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
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
)

export const MeetingChat = model<IMeetingChat>('MeetingChat', MeetingChatSchema)
