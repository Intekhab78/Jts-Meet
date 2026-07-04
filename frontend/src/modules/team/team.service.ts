import type { Team, CreateTeamPayload, UpdateTeamPayload, InviteTeamMemberPayload, TeamMembershipActionPayload, UpdateTeamMemberRolePayload } from './team.types'

import { API_BASE } from '../../config'

function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function parseResponse<T>(response: Response): Promise<T> {
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error((body as any)?.message || response.statusText || 'Request failed')
    }
    return (body as any).data as T
}

export async function createTeam(payload: CreateTeamPayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function updateTeam(teamId: string, payload: UpdateTeamPayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/${teamId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function deleteTeam(teamId: string, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/${teamId}`, {
        method: 'DELETE',
        headers: authHeaders(token)
    })
    return parseResponse<Team>(response)
}

export async function getTeam(teamId: string, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/${teamId}`, {
        headers: authHeaders(token)
    })
    return parseResponse<Team>(response)
}

export async function listOrganizationTeams(organizationId: string, token: string): Promise<Team[]> {
    const response = await fetch(`${API_BASE}/api/team/organization/${organizationId}`, {
        headers: authHeaders(token)
    })
    return parseResponse<Team[]>(response)
}

export async function inviteTeamMember(payload: InviteTeamMemberPayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/invite`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function joinPublicTeam(payload: TeamMembershipActionPayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/join`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function leaveTeam(payload: TeamMembershipActionPayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/leave`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function removeTeamMember(payload: TeamMembershipActionPayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/remove`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function updateTeamMemberRole(payload: UpdateTeamMemberRolePayload, token: string): Promise<Team> {
    const response = await fetch(`${API_BASE}/api/team/member-role`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Team>(response)
}

export async function getTeamMembers(teamId: string, token: string): Promise<Team['members']> {
    const response = await fetch(`${API_BASE}/api/team/${teamId}/members`, {
        headers: authHeaders(token)
    })
    return parseResponse<Team['members']>(response)
}
