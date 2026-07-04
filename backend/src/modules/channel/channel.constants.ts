export const ChannelTypes = {
    PUBLIC: 'public',
    PRIVATE: 'private'
} as const

export const ChannelRoles = {
    OWNER: 'owner',
    MODERATOR: 'moderator',
    MEMBER: 'member',
    GUEST: 'guest'
} as const

export const ChannelStatuses = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
} as const

export const GeneralChannelName = 'General'

export type ChannelType = typeof ChannelTypes[keyof typeof ChannelTypes]
export type ChannelRoleType = typeof ChannelRoles[keyof typeof ChannelRoles]
export type ChannelStatusType = typeof ChannelStatuses[keyof typeof ChannelStatuses]
