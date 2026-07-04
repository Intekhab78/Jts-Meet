import { Schema, model, Document, Types } from 'mongoose'

export interface ISession extends Document {
    userId: Types.ObjectId
    refreshToken: string
    deviceInfo?: string
    ipAddress?: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
}

const SessionSchema = new Schema<ISession>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        refreshToken: { type: String, required: true, unique: true, index: true },
        deviceInfo: { type: String, default: '' },
        ipAddress: { type: String, default: '' },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
)

export const Session = model<ISession>('Session', SessionSchema)
