import { Schema, model, Document, Types } from 'mongoose'

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest'
export type OrganizationStatus = 'active' | 'inactive'
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
    createdAt: Date
    updatedAt: Date
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member', 'guest'], required: true },
        joinedAt: { type: Date, default: null },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['pending', 'active', 'removed'], required: true, default: 'pending' }
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
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        timezone: { type: String, default: 'UTC' }
    },
    { timestamps: true }
)

OrganizationSchema.index({ slug: 1 }, { unique: true })

export const Organization = model<IOrganization>('Organization', OrganizationSchema)
