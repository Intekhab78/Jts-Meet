export interface CreateMeetingPayload {
    title: string
}

export interface MeetingActionPayload {
    meetingId: string
}

export function validateCreateMeeting(payload: any) {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
        errors.push('title is required')
    }

    return { valid: errors.length === 0, errors }
}

export function validateMeetingAction(payload: any) {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
        errors.push('Request body must be an object')
        return { valid: false, errors }
    }

    if (!payload.meetingId || typeof payload.meetingId !== 'string' || payload.meetingId.trim().length === 0) {
        errors.push('meetingId is required')
    }

    return { valid: errors.length === 0, errors }
}
