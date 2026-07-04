export type ChannelType = 'public' | 'private'
export type ChannelRole = 'owner' | 'moderator' | 'member' | 'guest'
export type ChannelStatus = 'active' | 'inactive'

export interface ChannelMember {
    userId: string
    role: ChannelRole
    joinedAt: string
    invitedBy: string
    user?: {
        fullName: string
        email: string
        profileImage?: string
    }
}

export interface Channel {
    _id: string
    organizationId: string
    teamId: string
    name: string
    description?: string
    type: ChannelType
    createdBy: string
    ownerId: string
    members: ChannelMember[]
    status: ChannelStatus
    archived: boolean
    createdAt: string
    updatedAt: string
}

export interface CreateChannelPayload {
    organizationId: string
    teamId: string
    name: string
    description?: string
    type: ChannelType
}

export interface UpdateChannelPayload {
    name?: string
    description?: string
    type?: ChannelType
    status?: ChannelStatus
}

export interface ChannelMembershipActionPayload {
    channelId: string
    userId: string
}

export interface InviteChannelMemberPayload {
    channelId: string
    userId: string
    role: Exclude<ChannelRole, 'owner'>
}

export interface UpdateChannelMemberRolePayload {
    channelId: string
    userId: string
    role: Exclude<ChannelRole, 'owner'>
}
