export type TeamVisibility = 'public' | 'private'
export type TeamRole = 'owner' | 'admin' | 'member' | 'guest'
export type TeamStatus = 'active' | 'inactive'

export interface TeamMember {
    userId: string
    role: TeamRole
    joinedAt: string
    invitedBy: string
    status?: string
    user?: {
        fullName: string
        email: string
        profileImage?: string
    }
}

export interface Team {
    _id: string
    organizationId: string
    name: string
    description?: string
    icon?: string
    color?: string
    visibility: TeamVisibility
    ownerId: string
    createdBy: string
    status: TeamStatus
    createdAt: string
    updatedAt: string
    members: TeamMember[]
}

export interface CreateTeamPayload {
    organizationId: string
    name: string
    description?: string
    icon?: string
    color?: string
    visibility: TeamVisibility
}

export interface UpdateTeamPayload {
    name?: string
    description?: string
    icon?: string
    color?: string
    visibility?: TeamVisibility
    status?: TeamStatus
}

export interface InviteTeamMemberPayload {
    teamId: string
    userId: string
    role: Exclude<TeamRole, 'owner'>
}

export interface TeamMembershipActionPayload {
    teamId: string
    userId: string
}

export interface UpdateTeamMemberRolePayload {
    teamId: string
    userId: string
    role: Exclude<TeamRole, 'owner'>
}
