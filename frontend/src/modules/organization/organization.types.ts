export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest'
export type OrganizationStatus = 'active' | 'inactive'
export type InvitationStatus = 'pending' | 'active' | 'removed'

export interface OrganizationMember {
    userId: string
    role: OrganizationRole
    joinedAt?: string | null
    invitedBy: string
    status: InvitationStatus
    user?: {
        fullName: string
        email: string
        profileImage?: string
    }
}

export interface Organization {
    _id: string
    name: string
    slug: string
    logo?: string
    description?: string
    ownerId: string
    members: OrganizationMember[]
    status: OrganizationStatus
    timezone?: string
    createdAt: string
    updatedAt: string
}

export interface CreateOrganizationPayload {
    name: string
    slug: string
    logo?: string
    description?: string
    timezone?: string
}

export interface UpdateOrganizationPayload {
    name?: string
    logo?: string
    description?: string
    timezone?: string
    status?: OrganizationStatus
}

export interface InviteMemberPayload {
    organizationId: string
    userId: string
    role: Exclude<OrganizationRole, 'owner'>
}

export interface InvitationActionPayload {
    organizationId: string
    userId: string
}
