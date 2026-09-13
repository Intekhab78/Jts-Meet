import mongoose, { Schema, Document } from 'mongoose'

export type IntegrationType = 'slack' | 'discord' | 'webhook' | 'googledrive'
export type IntegrationEvent = 'meeting.started' | 'meeting.ended' | 'recording.ready' | 'participant.joined' | 'participant.left'
export type IntegrationStatus = 'active' | 'failed' | 'paused'

export interface IDeliveryLog {
    eventId: string
    eventType: IntegrationEvent
    timestamp: Date
    statusCode: number
    responseBody?: string
    durationMs: number
    success: boolean
}

export interface IIntegration extends Document {
    organizationId?: string
    userId: string
    name: string
    type: IntegrationType
    url: string
    secret?: string
    events: IntegrationEvent[]
    status: IntegrationStatus
    config?: {
        channelName?: string
        googleFolderId?: string
        autoSyncRecordings?: boolean
    }
    lastDeliveredAt?: Date
    deliveryLogs: IDeliveryLog[]
    createdAt: Date
    updatedAt: Date
}

const DeliveryLogSchema = new Schema<IDeliveryLog>({
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    statusCode: { type: Number, required: true },
    responseBody: { type: String, default: '' },
    durationMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true }
}, { _id: false })

const IntegrationSchema = new Schema<IIntegration>({
    organizationId: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['slack', 'discord', 'webhook', 'googledrive'],
        required: true
    },
    url: { type: String, required: true },
    secret: { type: String, default: '' },
    events: {
        type: [String],
        enum: ['meeting.started', 'meeting.ended', 'recording.ready', 'participant.joined', 'participant.left'],
        default: ['meeting.started', 'meeting.ended', 'recording.ready']
    },
    status: {
        type: String,
        enum: ['active', 'failed', 'paused'],
        default: 'active'
    },
    config: {
        channelName: { type: String, default: '' },
        googleFolderId: { type: String, default: '' },
        autoSyncRecordings: { type: Boolean, default: true }
    },
    lastDeliveredAt: { type: Date },
    deliveryLogs: { type: [DeliveryLogSchema], default: [] }
}, {
    timestamps: true
})

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema)
