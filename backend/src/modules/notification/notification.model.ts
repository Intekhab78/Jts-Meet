import { Schema, model, Document, Types } from 'mongoose'

export interface INotification extends Document {
    recipientId: Types.ObjectId
    title: string
    body: string
    type: string
    metadata?: Record<string, any>
    isRead: boolean
    readAt?: Date | null
    createdAt: Date
    updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
    {
        recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true },
        type: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date, default: null }
    },
    { timestamps: true }
)

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 })

export const Notification = model<INotification>('Notification', NotificationSchema)
