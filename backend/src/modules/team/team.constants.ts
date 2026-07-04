export const TeamVisibility = {
    PUBLIC: 'public',
    PRIVATE: 'private'
} as const

export const TeamRoles = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
    GUEST: 'guest'
} as const

export const TeamStatuses = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
} as const

export type TeamVisibilityType = typeof TeamVisibility[keyof typeof TeamVisibility]
export type TeamRoleType = typeof TeamRoles[keyof typeof TeamRoles]
export type TeamStatusType = typeof TeamStatuses[keyof typeof TeamStatuses]
