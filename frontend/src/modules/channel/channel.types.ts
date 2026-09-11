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

export interface ChannelAttachment {
    name: string
    url: string
    fileType: 'pdf' | 'image' | 'sheet' | 'doc' | 'archive' | 'code' | 'other' | string
    size?: number
    mimeType?: string
}

export interface CodeSnippet {
    language: string
    code: string
    title?: string
}

export interface ChannelMessage {
    _id: string
    channelId: string
    senderId: {
        _id: string
        fullName: string
        email: string
        profileImage?: string
    } | string
    messageType?: 'text' | 'file' | 'code' | 'image'
    content: string
    attachments?: ChannelAttachment[]
    codeSnippet?: CodeSnippet
    replyTo?: string | null
    replyCount?: number
    reactions?: { userId: string; emoji: string }[]
    edited?: boolean
    deleted?: boolean
    createdAt: string
    updatedAt?: string
}
