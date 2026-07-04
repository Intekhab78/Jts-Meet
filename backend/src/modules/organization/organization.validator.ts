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
    status?: 'active' | 'inactive'
}

export interface InviteMemberPayload {
    organizationId: string
    userId: string
    role: 'admin' | 'member' | 'guest'
}

export interface InvitationActionPayload {
    organizationId: string
    userId: string
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

export function validateCreateOrganization(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!isNonEmptyString(payload.name)) {
        errors.push('name is required')
    }

    if (!isNonEmptyString(payload.slug)) {
        errors.push('slug is required')
    }

    if (payload.timezone && typeof payload.timezone !== 'string') {
        errors.push('timezone must be a string')
    }

    return { valid: errors.length === 0, errors }
}

export function validateUpdateOrganization(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
        errors.push('name must be a non-empty string')
    }

    if (payload.logo !== undefined && typeof payload.logo !== 'string') {
        errors.push('logo must be a string')
    }

    if (payload.description !== undefined && typeof payload.description !== 'string') {
        errors.push('description must be a string')
    }

    if (payload.timezone !== undefined && typeof payload.timezone !== 'string') {
        errors.push('timezone must be a string')
    }

    if (payload.status !== undefined && !['active', 'inactive'].includes(payload.status)) {
        errors.push('status must be active or inactive')
    }

    return { valid: errors.length === 0, errors }
}

export function validateInviteMember(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!isNonEmptyString(payload.organizationId)) {
        errors.push('organizationId is required')
    }

    if (!isNonEmptyString(payload.userId)) {
        errors.push('userId is required')
    }

    if (!['admin', 'member', 'guest'].includes(payload.role)) {
        errors.push('role must be admin, member, or guest')
    }

    return { valid: errors.length === 0, errors }
}

export function validateInvitationAction(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!isNonEmptyString(payload.organizationId)) {
        errors.push('organizationId is required')
    }

    if (!isNonEmptyString(payload.userId)) {
        errors.push('userId is required')
    }

    return { valid: errors.length === 0, errors }
}
