export interface RegisterPayload {
    fullName: string
    email: string
    password: string
    profileImage?: string
}

export interface LoginPayload {
    email: string
    password: string
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

function isValidEmail(email: unknown): email is string {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateRegister(payload: any): ValidationResult {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!payload.fullName || typeof payload.fullName !== 'string' || payload.fullName.trim().length < 2) {
        errors.push('fullName is required and must be at least 2 characters')
    }

    if (!isValidEmail(payload.email)) {
        errors.push('email is required and must be a valid email address')
    }

    if (!payload.password || typeof payload.password !== 'string' || payload.password.length < 8) {
        errors.push('password is required and must be at least 8 characters')
    }

    if (payload.profileImage && typeof payload.profileImage !== 'string') {
        errors.push('profileImage must be a string when provided')
    }

    return { valid: errors.length === 0, errors }
}

export function validateLogin(payload: any): ValidationResult {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!isValidEmail(payload.email)) {
        errors.push('email is required and must be a valid email address')
    }

    if (!payload.password || typeof payload.password !== 'string' || payload.password.length === 0) {
        errors.push('password is required')
    }

    return { valid: errors.length === 0, errors }
}
