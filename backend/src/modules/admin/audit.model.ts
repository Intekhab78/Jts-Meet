import { Schema, model, Document, Types } from 'mongoose'

export interface IAuditLog extends Document {
    userId: Types.ObjectId
    action: string
    details: string
    ipAddress?: string
    createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        action: { type: String, required: true, index: true },
        details: { type: String, required: true },
        ipAddress: { type: String, default: '' }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema)
