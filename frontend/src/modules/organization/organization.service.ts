import { Organization, CreateOrganizationPayload, UpdateOrganizationPayload, InviteMemberPayload, OrganizationMember } from './organization.types'

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
    const response = await fetch(`${API_BASE}/api/organization/${organizationId}`, {
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token)
        }
    })
    return parseResponse<Organization>(response)
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
    return parseResponse<OrganizationMember[]>(response)
}
