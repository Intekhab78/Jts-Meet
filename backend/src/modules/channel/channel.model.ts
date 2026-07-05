import { Schema, model, Document, Types } from 'mongoose'
import { ChannelType, ChannelRoleType, ChannelStatusType } from './channel.constants'

export interface IChannelMember {
    userId: Types.ObjectId
    role: ChannelRoleType
    joinedAt: Date
    invitedBy: Types.ObjectId
}

export interface IChannel extends Document {
    organizationId: Types.ObjectId
    teamId: Types.ObjectId
    name: string
    description?: string
    type: ChannelType
    createdBy: Types.ObjectId
    ownerId: Types.ObjectId
    members: IChannelMember[]
    status: ChannelStatusType
    archived: boolean
    deletedAt?: Date | null
    createdAt: Date
    updatedAt: Date
}

const ChannelMemberSchema = new Schema<IChannelMember>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'moderator', 'member', 'guest'], required: true },
        joinedAt: { type: Date, required: true, default: () => new Date() },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { _id: false }
)

const ChannelSchema = new Schema<IChannel>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        type: { type: String, enum: ['public', 'private'], default: 'private' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        members: { type: [ChannelMemberSchema], default: [] },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        archived: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
)

ChannelSchema.index({ teamId: 1, name: 1 }, { unique: true })
ChannelSchema.index({ teamId: 1, deletedAt: 1, type: 1, archived: 1, createdAt: 1 })

export const Channel = model<IChannel>('Channel', ChannelSchema)
