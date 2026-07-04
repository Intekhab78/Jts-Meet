export interface CreateTeamPayload {
    organizationId: string
    name: string
    description?: string
    icon?: string
    color?: string
    visibility: 'public' | 'private'
}

export interface UpdateTeamPayload {
    name?: string
    description?: string
    icon?: string
    color?: string
    visibility?: 'public' | 'private'
    status?: 'active' | 'inactive'
}

export interface InviteTeamMemberPayload {
    teamId: string
    userId: string
    role: 'admin' | 'member' | 'guest'
}

export interface TeamMembershipActionPayload {
    teamId: string
    userId: string
}

export interface UpdateTeamMemberRolePayload {
    teamId: string
    userId: string
    role: 'admin' | 'member' | 'guest'
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

export function validateCreateTeam(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Request body must be an object'] }
    }

    if (!isNonEmptyString(payload.organizationId)) {
        errors.push('organizationId is required')
    }

    if (!isNonEmptyString(payload.name)) {
        errors.push('name is required')
    }

    if (!['public', 'private'].includes(payload.visibility)) {
        errors.push('visibility must be public or private')
    }

    return { valid: errors.length === 0, errors }
}

export function validateUpdateTeam(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Request body must be an object'] }
    }

    if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
        errors.push('name must be a non-empty string')
    }

    if (payload.description !== undefined && typeof payload.description !== 'string') {
        errors.push('description must be a string')
    }

    if (payload.icon !== undefined && typeof payload.icon !== 'string') {
        errors.push('icon must be a string')
    }

    if (payload.color !== undefined && typeof payload.color !== 'string') {
        errors.push('color must be a string')
    }

    if (payload.visibility !== undefined && !['public', 'private'].includes(payload.visibility)) {
        errors.push('visibility must be public or private')
    }

    if (payload.status !== undefined && !['active', 'inactive'].includes(payload.status)) {
        errors.push('status must be active or inactive')
    }

    return { valid: errors.length === 0, errors }
}

export function validateInviteTeamMember(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Request body must be an object'] }
    }

    if (!isNonEmptyString(payload.teamId)) {
        errors.push('teamId is required')
    }

    if (!isNonEmptyString(payload.userId)) {
        errors.push('userId is required')
    }

    if (!['admin', 'member', 'guest'].includes(payload.role)) {
        errors.push('role must be admin, member, or guest')
    }

    return { valid: errors.length === 0, errors }
}

export function validateTeamMembershipAction(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Request body must be an object'] }
    }

    if (!isNonEmptyString(payload.teamId)) {
        errors.push('teamId is required')
    }

    if (!isNonEmptyString(payload.userId)) {
        errors.push('userId is required')
    }

    return { valid: errors.length === 0, errors }
}

export function validateUpdateTeamMemberRole(payload: any): ValidationResult {
    const errors = validateTeamMembershipAction(payload).errors

    if (!['admin', 'member', 'guest'].includes(payload.role)) {
        errors.push('role must be admin, member, or guest')
    }

    return { valid: errors.length === 0, errors }
}
