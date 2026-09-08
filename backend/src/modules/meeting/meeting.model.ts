import { Schema, model, Document, Types } from 'mongoose'

export interface IMeeting extends Document {
    title: string
    meetingId: string
    host: Types.ObjectId
    coHosts: Types.ObjectId[]
    participants: Types.ObjectId[]
    waitingRoom: Types.ObjectId[]
    mutedUsers: Types.ObjectId[]
    blockedUsers: Types.ObjectId[]
    isWaitingRoomEnabled: boolean
    isGuestJoinEnabled: boolean
    screenShareBy?: Types.ObjectId | null
    isRecordingActive: boolean
    recordingUrl?: string
    status: 'scheduled' | 'active' | 'ended'
    isRecurring?: boolean
    recurrencePattern?: 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'none'
    scheduledDate?: string
    scheduledTime?: string
    organizationId?: Types.ObjectId | null
    teamId?: Types.ObjectId | null
    notifyByEmail?: boolean
    lastNotifiedAt?: Date | null
    startedAt?: Date | null
    endedAt?: Date | null
    createdAt: Date
    updatedAt: Date
}

const MeetingSchema = new Schema<IMeeting>(
    {
        title: { type: String, required: true, trim: true },
        meetingId: { type: String, required: true, unique: true, index: true },
        host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        coHosts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        waitingRoom: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        mutedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        isWaitingRoomEnabled: { type: Boolean, default: false },
        isGuestJoinEnabled: { type: Boolean, default: true },
        screenShareBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        isRecordingActive: { type: Boolean, default: false },
        recordingUrl: { type: String, default: '' },
        status: { type: String, enum: ['scheduled', 'active', 'ended'], default: 'scheduled' },
        isRecurring: { type: Boolean, default: false },
        recurrencePattern: { type: String, enum: ['daily', 'weekly', 'weekdays', 'monthly', 'none'], default: 'none' },
        scheduledDate: { type: String, default: '' },
        scheduledTime: { type: String, default: '' },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
        notifyByEmail: { type: Boolean, default: true },
        lastNotifiedAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null }
    },
    { timestamps: true }
)

MeetingSchema.index({ participants: 1, status: 1, createdAt: -1 })
MeetingSchema.index({ status: 1, createdAt: -1 })
MeetingSchema.index({ title: 1 })

export const Meeting = model<IMeeting>('Meeting', MeetingSchema)
