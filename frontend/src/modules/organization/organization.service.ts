import { Organization, CreateOrganizationPayload, UpdateOrganizationPayload, InviteMemberPayload, OrganizationMember, OrganizationRole } from './organization.types'

import { API_BASE } from '../../config'

function buildAuthHeaders(token?: string) {
    return token ? { Authorization: `Bearer ${token}` } : undefined
}

async function parseResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error((data as any)?.message || response.statusText || 'Request failed')
    }
    return (data as any).data as T
}

export async function createOrganization(payload: CreateOrganizationPayload, token: string): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify(payload)
    })
    return parseResponse<Organization>(response)
}

export async function getOrganization(organizationId: string, token: string): Promise<Organization> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)
    try {
        const response = await fetch(`${API_BASE}/api/organization/${organizationId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...buildAuthHeaders(token)
            },
            signal: controller.signal
        })
        clearTimeout(timeoutId)
        return parseResponse<Organization>(response)
    } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
            throw new Error('Network timeout while loading workspace profile. Please try again.')
        }
        throw err
    }
}

export async function updateOrganization(
    organizationId: string,
    payload: UpdateOrganizationPayload,
    token: string
): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization/${organizationId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify(payload)
    })
    return parseResponse<Organization>(response)
}

export async function inviteOrganizationMember(payload: InviteMemberPayload, token: string): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization/invite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify(payload)
    })
    return parseResponse<Organization>(response)
}

export async function acceptOrganizationInvitation(payload: { organizationId: string; userId: string }, token: string): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization/invite/accept`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify(payload)
    })
    return parseResponse<Organization>(response)
}

export async function removeOrganizationMember(payload: { organizationId: string; userId: string }, token: string): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization/remove`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify(payload)
    })
    return parseResponse<Organization>(response)
}

export async function leaveOrganization(payload: { organizationId: string; userId: string }, token: string): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization/leave`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify(payload)
    })
    return parseResponse<Organization>(response)
}

export async function getOrganizationMembers(organizationId: string, token: string): Promise<OrganizationMember[]> {
    const response = await fetch(`${API_BASE}/api/organization/${organizationId}/members`, {
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        }
    })
    const data = await parseResponse<any>(response)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.members)) return data.members
    return []
}

export async function updateOrganizationMemberRole(
    organizationId: string,
    targetUserId: string,
    role: OrganizationRole,
    token: string
): Promise<Organization> {
    const response = await fetch(`${API_BASE}/api/organization/${organizationId}/members/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        },
        body: JSON.stringify({ role })
    })
    return parseResponse<Organization>(response)
}
