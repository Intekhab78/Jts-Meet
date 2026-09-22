import { Schema, model, Document, Types } from 'mongoose'

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest'
export type OrganizationStatus = 'active' | 'inactive' | 'deleted'
export type OrganizationMemberStatus = 'pending' | 'active' | 'removed'

export interface IOrganizationMember {
    userId: Types.ObjectId
    role: OrganizationRole
    joinedAt?: Date | null
    invitedBy: Types.ObjectId
    status: OrganizationMemberStatus
}

export interface IOrganization extends Document {
    name: string
    slug: string
    logo?: string
    description?: string
    ownerId: Types.ObjectId
    members: IOrganizationMember[]
    status: OrganizationStatus
    timezone?: string
    planTier?: string
    maxSeats?: number
    maxStorageGb?: number

    // Enterprise Profile & Localization
    website?: string
    supportEmail?: string
    billingContactEmail?: string
    industry?: string
    companySize?: string
    headquarters?: string
    country?: string
    locale?: string
    workingDays?: string[]
    workingHoursStart?: string
    workingHoursEnd?: string
    dateFormat?: string
    timeFormat?: string

    // Teams-Grade Policies & Defaults
    lobbyPolicy?: string
    allowGuestAccess?: boolean
    recordingPolicy?: string
    e2eeEnabledByDefault?: boolean
    watermarkingEnabled?: boolean
    aiSummaryPolicy?: string
    cloudRetentionDays?: number
    fileRetentionDays?: number
    allowExternalSharing?: boolean
    requireMeetingPasscode?: boolean

    createdAt: Date
    updatedAt: Date
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member', 'guest'], required: true },
        joinedAt: { type: Date, default: Date.now },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['pending', 'active', 'removed'], required: true, default: 'active' }
    },
    { _id: false }
)

const OrganizationSchema = new Schema<IOrganization>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        logo: { type: String, default: '' },
        description: { type: String, default: '' },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        members: { type: [OrganizationMemberSchema], default: [] },
        status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        planTier: { type: String, default: 'free' },
        maxSeats: { type: Number, default: 15 },
        maxStorageGb: { type: Number, default: 5 },

        // Enterprise Profile & Localization
        website: { type: String, default: '' },
        supportEmail: { type: String, default: '' },
        billingContactEmail: { type: String, default: '' },
        industry: { type: String, default: 'Technology & Software' },
        companySize: { type: String, default: '11-50' },
        headquarters: { type: String, default: '' },
        country: { type: String, default: 'India' },
        locale: { type: String, default: 'en-US' },
        workingDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        workingHoursStart: { type: String, default: '09:00' },
        workingHoursEnd: { type: String, default: '18:00' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeFormat: { type: String, default: '12h' },

        // Teams-Grade Policies & Defaults
        lobbyPolicy: { type: String, enum: ['everyone', 'guests_only', 'disabled'], default: 'guests_only' },
        allowGuestAccess: { type: Boolean, default: true },
        recordingPolicy: { type: String, enum: ['host_only', 'automatic', 'disabled'], default: 'host_only' },
        e2eeEnabledByDefault: { type: Boolean, default: false },
        watermarkingEnabled: { type: Boolean, default: false },
        aiSummaryPolicy: { type: String, enum: ['auto', 'host_controlled', 'disabled'], default: 'host_controlled' },
        cloudRetentionDays: { type: Number, default: 90 },
        fileRetentionDays: { type: Number, default: 365 },
        allowExternalSharing: { type: Boolean, default: true },
        requireMeetingPasscode: { type: Boolean, default: false }
    },
    { timestamps: true }
)

OrganizationSchema.index({ slug: 1 }, { unique: true })

export const Organization = model<IOrganization>('Organization', OrganizationSchema)
