import { Schema, model, Document, Types } from 'mongoose'

export interface IMessage extends Document {
    sender: Types.ObjectId
    receiver: Types.ObjectId
    messageType: 'text' | 'call'
    callInfo?: {
        meetingId: string
        callType: 'audio' | 'video' | 'screenshare'
        status: 'completed' | 'missed' | 'declined' | 'cancelled'
        duration: number
        callerId: Types.ObjectId
        startedAt?: Date
        endedAt?: Date
    } | null
    message: string
    isDelivered: boolean
    isSeen: boolean
    reactions: { userId: Types.ObjectId; emoji: string; createdAt: Date }[]
    parentMessageId?: Types.ObjectId | null
    threadCount?: number
    lastReplyAt?: Date | null
    isDeleted?: boolean
    deletedAt?: Date | null
    clearedFor?: Types.ObjectId[]
    createdAt: Date
    updatedAt: Date
}

const ChatSchema = new Schema<IMessage>(
    {
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        messageType: { type: String, enum: ['text', 'call'], default: 'text' },
        callInfo: {
            type: new Schema(
                {
                    meetingId: { type: String, required: true },
                    callType: { type: String, enum: ['audio', 'video', 'screenshare'], default: 'audio' },
                    status: { type: String, enum: ['completed', 'missed', 'declined', 'cancelled'], default: 'missed' },
                    duration: { type: Number, default: 0 },
                    callerId: { type: Schema.Types.ObjectId, ref: 'User' },
                    startedAt: { type: Date },
                    endedAt: { type: Date }
                },
                { _id: false }
            ),
            default: null
        },
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
        lastReplyAt: { type: Date, default: null },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        clearedFor: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }]
    },
    { timestamps: true }
)

ChatSchema.index({ sender: 1, receiver: 1, createdAt: -1 })
ChatSchema.index({ receiver: 1, sender: 1, createdAt: -1 })
ChatSchema.index({ parentMessageId: 1 })
ChatSchema.index({ clearedFor: 1 })
ChatSchema.index({ 'callInfo.meetingId': 1 }, { sparse: true })

export const Message = model<IMessage>('Message', ChatSchema)
