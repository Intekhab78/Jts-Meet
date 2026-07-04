export interface ValidationResult {
    valid: boolean
    errors: string[]
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isValidChannelType(value: unknown): boolean {
    return value === 'public' || value === 'private'
}

function isValidChannelRole(value: unknown): boolean {
    return value === 'owner' || value === 'moderator' || value === 'member' || value === 'guest'
}

function isValidChannelStatus(value: unknown): boolean {
    return value === 'active' || value === 'inactive'
}

export function validateCreateChannel(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Request body must be an object'] }
    }

    if (!isNonEmptyString(payload.organizationId)) {
        errors.push('organizationId is required')
    }

    if (!isNonEmptyString(payload.teamId)) {
        errors.push('teamId is required')
    }

    if (!isNonEmptyString(payload.name)) {
        errors.push('name is required')
    }

    if (!isValidChannelType(payload.type)) {
        errors.push('type must be public or private')
    }

    return { valid: errors.length === 0, errors }
}

export function validateUpdateChannel(payload: any): ValidationResult {
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

    if (payload.type !== undefined && !isValidChannelType(payload.type)) {
        errors.push('type must be public or private')
    }

    if (payload.status !== undefined && !isValidChannelStatus(payload.status)) {
        errors.push('status must be active or inactive')
    }

    return { valid: errors.length === 0, errors }
}

export function validateChannelMembershipAction(payload: any): ValidationResult {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Request body must be an object'] }
    }

    if (!isNonEmptyString(payload.channelId)) {
        errors.push('channelId is required')
    }

    if (!isNonEmptyString(payload.userId)) {
        errors.push('userId is required')
    }

    return { valid: errors.length === 0, errors }
}

export function validateInviteChannelMember(payload: any): ValidationResult {
    const errors = validateChannelMembershipAction(payload).errors
    if (!isValidChannelRole(payload.role) || payload.role === 'owner') {
        errors.push('role must be moderator, member, or guest')
    }
    return { valid: errors.length === 0, errors }
}

export function validateUpdateChannelMemberRole(payload: any): ValidationResult {
    const errors = validateChannelMembershipAction(payload).errors
    if (!isValidChannelRole(payload.role) || payload.role === 'owner') {
        errors.push('role must be moderator, member, or guest')
    }
    return { valid: errors.length === 0, errors }
}
