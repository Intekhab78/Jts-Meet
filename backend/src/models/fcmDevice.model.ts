import { Schema, model, Document, Types } from 'mongoose'

export interface IFcmDevice extends Document {
    userId: Types.ObjectId
    fcmToken: string
    platform: string
    updatedAt: Date
    createdAt: Date
}

const FcmDeviceSchema = new Schema<IFcmDevice>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        fcmToken: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        platform: {
            type: String,
            default: 'android'
        }
    },
    {
        timestamps: true
    }
)

export const FcmDevice = model<IFcmDevice>('FcmDevice', FcmDeviceSchema)
