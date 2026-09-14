import { Schema, model, Document, Types } from 'mongoose'

export interface IClip extends Document {
    title: string
    senderId: Types.ObjectId
    videoUrl: string
    duration: number // in seconds
    fileSize: number
    mimeType: string
    views: number
    channelId?: string
    recipientId?: Types.ObjectId
    createdAt: Date
    updatedAt: Date
}

const ClipSchema = new Schema<IClip>(
    {
        title: { type: String, default: 'Quick Video Clip', trim: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        videoUrl: { type: String, required: true },
        duration: { type: Number, default: 0 },
        fileSize: { type: Number, default: 0 },
        mimeType: { type: String, default: 'video/webm' },
        views: { type: Number, default: 0 },
        channelId: { type: String, default: null, index: true },
        recipientId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
    },
    { timestamps: true }
)

ClipSchema.index({ senderId: 1, createdAt: -1 })

export const Clip = model<IClip>('Clip', ClipSchema)
