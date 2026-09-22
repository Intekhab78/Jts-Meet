export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest'
export type OrganizationStatus = 'active' | 'inactive'
export type InvitationStatus = 'pending' | 'active' | 'removed'

export interface OrganizationMember {
    userId: string | any
    role: OrganizationRole
    joinedAt?: string | null
    invitedBy?: string | any
    status: InvitationStatus
    user?: {
        _id?: string
        fullName?: string
        email?: string
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
