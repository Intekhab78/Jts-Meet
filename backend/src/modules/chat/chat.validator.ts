export interface SendMessagePayload {
    receiverId: string
    message: string
    messageType?: string
    parentMessageId?: string
}

export interface PaginationParams {
    page?: number
    limit?: number
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

function isObjectId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value)
}

export function validateSendMessage(payload: any): ValidationResult {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!isObjectId(payload.receiverId)) {
        errors.push('receiverId is required and must be a valid user id')
    }

    if (!payload.message || typeof payload.message !== 'string' || payload.message.trim().length === 0) {
        errors.push('message is required and must be a non-empty string')
    }

    if (payload.messageType && payload.messageType !== 'text') {
        errors.push('messageType must be text')
    }

    if (payload.parentMessageId !== undefined && !isObjectId(payload.parentMessageId)) {
        errors.push('parentMessageId must be a valid message id')
    }

    return { valid: errors.length === 0, errors }
}

export function validateConversationQuery(query: any): ValidationResult {
    const errors: string[] = []

    if (!query || typeof query !== 'object') {
        errors.push('Query parameters are required')
        return { valid: false, errors }
    }

    if (!isObjectId(query.userId)) {
        errors.push('userId query parameter is required and must be a valid user id')
    }

    if (query.page !== undefined && (!Number.isInteger(Number(query.page)) || Number(query.page) <= 0)) {
        errors.push('page must be a positive integer')
    }

    if (query.limit !== undefined && (!Number.isInteger(Number(query.limit)) || Number(query.limit) <= 0)) {
        errors.push('limit must be a positive integer')
    }

    return { valid: errors.length === 0, errors }
}

export function validateRecentChatsQuery(query: any): ValidationResult {
    const errors: string[] = []

    if (!query || typeof query !== 'object') {
        errors.push('Query parameters are required')
        return { valid: false, errors }
    }

    if (query.page !== undefined && (!Number.isInteger(Number(query.page)) || Number(query.page) <= 0)) {
        errors.push('page must be a positive integer')
    }

    if (query.limit !== undefined && (!Number.isInteger(Number(query.limit)) || Number(query.limit) <= 0)) {
        errors.push('limit must be a positive integer')
    }

    return { valid: errors.length === 0, errors }
}
