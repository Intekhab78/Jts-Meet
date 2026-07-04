import type { Channel, CreateChannelPayload, UpdateChannelPayload, InviteChannelMemberPayload, ChannelMembershipActionPayload, UpdateChannelMemberRolePayload } from './channel.types'

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

export async function createChannel(payload: CreateChannelPayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function updateChannel(channelId: string, payload: UpdateChannelPayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/${channelId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function archiveChannel(channelId: string, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/${channelId}/archive`, {
        method: 'POST',
        headers: authHeaders(token)
    })
    return parseResponse<Channel>(response)
}

export async function restoreChannel(channelId: string, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/${channelId}/restore`, {
        method: 'POST',
        headers: authHeaders(token)
    })
    return parseResponse<Channel>(response)
}

export async function deleteChannel(channelId: string, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/${channelId}`, {
        method: 'DELETE',
        headers: authHeaders(token)
    })
    return parseResponse<Channel>(response)
}

export async function getChannel(channelId: string, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/${channelId}`, {
        headers: authHeaders(token)
    })
    return parseResponse<Channel>(response)
}

export async function listTeamChannels(teamId: string, token: string): Promise<Channel[]> {
    const response = await fetch(`${API_BASE}/api/channel/team/${teamId}`, {
        headers: authHeaders(token)
    })
    return parseResponse<Channel[]>(response)
}

export async function joinChannel(payload: ChannelMembershipActionPayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/join`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function leaveChannel(payload: ChannelMembershipActionPayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/leave`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function inviteChannelMember(payload: InviteChannelMemberPayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/invite`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function removeChannelMember(payload: ChannelMembershipActionPayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/remove`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function updateChannelMemberRole(payload: UpdateChannelMemberRolePayload, token: string): Promise<Channel> {
    const response = await fetch(`${API_BASE}/api/channel/member-role`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
    })
    return parseResponse<Channel>(response)
}

export async function getChannelMembers(channelId: string, token: string): Promise<Channel['members']> {
    const response = await fetch(`${API_BASE}/api/channel/${channelId}/members`, {
        headers: authHeaders(token)
    })
    return parseResponse<Channel['members']>(response)
}
