import { Schema, model, Document, Types } from 'mongoose'
import { TeamRoleType, TeamStatusType, TeamVisibilityType } from './team.constants'

export interface ITeamMember {
    userId: Types.ObjectId
    role: TeamRoleType
    joinedAt: Date
    invitedBy: Types.ObjectId
}

export interface ITeam extends Document {
    organizationId: Types.ObjectId
    name: string
    description?: string
    icon?: string
    color?: string
    visibility: TeamVisibilityType
    ownerId: Types.ObjectId
    createdBy: Types.ObjectId
    status: TeamStatusType
    deletedAt?: Date | null
    members: ITeamMember[]
    createdAt: Date
    updatedAt: Date
}

const TeamMemberSchema = new Schema<ITeamMember>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member', 'guest'], required: true },
        joinedAt: { type: Date, required: true, default: () => new Date() },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { _id: false }
)

const TeamSchema = new Schema<ITeam>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        icon: { type: String, default: '' },
        color: { type: String, default: '#3366FF' },
        visibility: { type: String, enum: ['public', 'private'], default: 'private' },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        deletedAt: { type: Date, default: null },
        members: { type: [TeamMemberSchema], default: [] }
    },
    { timestamps: true }
)

TeamSchema.index({ organizationId: 1, name: 1 }, { unique: true })

export const Team = model<ITeam>('Team', TeamSchema)
