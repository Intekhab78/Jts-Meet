import type { Channel, UpdateChannelPayload } from '../channel.types'
import {
    createChannel,
    getChannel,
    listTeamChannels,
    updateChannel,
    archiveChannel,
    restoreChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    inviteChannelMember,
    removeChannelMember,
    updateChannelMemberRole
} from '../channel.service'

interface UseChannelActionsParams {
    teamId?: string
    organizationId?: string
    token: string
    currentUserId?: string
    channels: Channel[]
    setChannels: React.Dispatch<React.SetStateAction<Channel[]>>
    selectedChannel: Channel | null
    setSelectedChannel: React.Dispatch<React.SetStateAction<Channel | null>>
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
    setError: React.Dispatch<React.SetStateAction<string>>
    setUnreadChannelCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export function useChannelActions({
    teamId,
    organizationId,
    token,
    currentUserId,
    channels,
    setChannels,
    selectedChannel,
    setSelectedChannel,
    setLoading,
    setError,
    setUnreadChannelCounts
}: UseChannelActionsParams) {

    const loadChannels = async (tId: string) => {
        setLoading(true)
        setError('')
        try {
            const list = await listTeamChannels(tId, token)
            setChannels(list)
            const savedChannelId = localStorage.getItem('jts_current_channel_id')
            const matchedSaved = list.find((channel) => channel._id === savedChannelId)
            if (matchedSaved) {
                setSelectedChannel(matchedSaved)
            } else if (!selectedChannel && list.length > 0) {
                setSelectedChannel(list[0])
            } else if (selectedChannel) {
                setSelectedChannel(list.find((channel) => channel._id === selectedChannel._id) || list[0] || null)
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to load channels')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateChannel = async (payload: { name: string; description?: string; type: 'public' | 'private' }) => {
        if (!teamId || !organizationId) {
            throw new Error('Organization and team are required')
        }
        const channel = await createChannel({ ...payload, teamId, organizationId }, token)
        await loadChannels(teamId)
        setSelectedChannel(channel)
        try {
            localStorage.setItem('jts_current_channel_id', channel._id)
        } catch (_) { }
    }

    const handleSelectChannel = async (channelId: string) => {
        try {
            localStorage.setItem('jts_current_channel_id', channelId)
        } catch (_) { }
        setUnreadChannelCounts(prev => ({ ...prev, [channelId]: 0 }))
        const channel = channels.find((item) => item._id === channelId)
        if (channel) {
            setSelectedChannel(channel)
            return
        }

        try {
            const loaded = await getChannel(channelId, token)
            setSelectedChannel(loaded)
        } catch (err: any) {
            setError(err?.message || 'Unable to load channel')
        }
    }

    const handleUpdateChannel = async (payload: UpdateChannelPayload) => {
        if (!selectedChannel) return
        try {
            const updated = await updateChannel(selectedChannel._id, payload, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update channel')
        }
    }

    const handleArchiveChannel = async () => {
        if (!selectedChannel) return
        try {
            const updated = await archiveChannel(selectedChannel._id, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to archive channel')
        }
    }

    const handleRestoreChannel = async () => {
        if (!selectedChannel) return
        try {
            const updated = await restoreChannel(selectedChannel._id, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to restore channel')
        }
    }

    const handleDeleteChannel = async () => {
        if (!selectedChannel || !teamId) return
        try {
            await deleteChannel(selectedChannel._id, token)
            await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to delete channel')
        }
    }

    const handleJoinChannel = async () => {
        if (!selectedChannel || !currentUserId) return
        try {
            const updated = await joinChannel({ channelId: selectedChannel._id, userId: currentUserId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to join channel')
        }
    }

    const handleLeaveChannel = async () => {
        if (!selectedChannel || !currentUserId) return
        try {
            const updated = await leaveChannel({ channelId: selectedChannel._id, userId: currentUserId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to leave channel')
        }
    }

    const handleInviteMember = async (userId: string, role: Exclude<Channel['members'][number]['role'], 'owner'>) => {
        if (!selectedChannel) return
        try {
            const updated = await inviteChannelMember({ channelId: selectedChannel._id, userId, role }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!selectedChannel) return
        try {
            const updated = await removeChannelMember({ channelId: selectedChannel._id, userId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to remove member')
        }
    }

    const handleUpdateMemberRole = async (userId: string, role: Exclude<Channel['members'][number]['role'], 'owner'>) => {
        if (!selectedChannel) return
        try {
            const updated = await updateChannelMemberRole({ channelId: selectedChannel._id, userId, role }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update member role')
        }
    }

    return {
        loadChannels,
        handleCreateChannel,
        handleSelectChannel,
        handleUpdateChannel,
        handleArchiveChannel,
        handleRestoreChannel,
        handleDeleteChannel,
        handleJoinChannel,
        handleLeaveChannel,
        handleInviteMember,
        handleRemoveMember,
        handleUpdateMemberRole
    }
}
