import React, { useEffect, useMemo, useState } from 'react'
import type { Team, CreateTeamPayload, UpdateTeamPayload, TeamMember } from './team.types'
import {
    createTeam,
    getTeam,
    inviteTeamMember,
    joinPublicTeam,
    leaveTeam,
    listOrganizationTeams,
    removeTeamMember,
    updateTeam,
    updateTeamMemberRole,
    deleteTeam
} from './team.service'
import { getOrganizationMembers } from '../organization/organization.service'
import type { OrganizationMember } from '../organization/organization.types'
import { listTeamChannels, createChannel, deleteChannel } from '../channel/channel.service'
import type { Channel } from '../channel/channel.types'
import { CreateTeamModal } from './CreateTeamModal'
import { InviteTeamMemberModal } from './InviteTeamMemberModal'
import { CreateChannelDialog } from '../channel/CreateChannelDialog'
import { TeamDirectorySidebar } from './components/TeamDirectorySidebar'
import { TeamActiveHeader } from './components/TeamActiveHeader'
import { TeamMembersTab } from './components/TeamMembersTab'
import { TeamChannelsTab } from './components/TeamChannelsTab'
import { TeamOverviewTab } from './components/TeamOverviewTab'
import { TeamSettingsTab } from './components/TeamSettingsTab'
import {
    IconUsers, IconHash, IconSettings,
    IconChart, IconAlertTriangle, IconCheck, IconPlus, IconX,
    IconBuilding
} from '../../components/common/Icons'

interface TeamSettingsPageProps {
    token: string
    organizationId?: string
    currentUserId?: string
}

const PRESET_COLORS = [
    { label: 'Indigo', color: '#6366F1' },
    { label: 'Violet', color: '#8B5CF6' },
    { label: 'Blue', color: '#3B82F6' },
    { label: 'Cyan', color: '#06B6D4' },
    { label: 'Emerald', color: '#10B981' },
    { label: 'Amber', color: '#F59E0B' },
    { label: 'Rose', color: '#F43F5E' },
    { label: 'Slate', color: '#64748B' }
]

export function TeamSettingsPage({ token, organizationId, currentUserId }: TeamSettingsPageProps) {
    const [teams, setTeams] = useState<Team[]>([])
    const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([])
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [teamChannels, setTeamChannels] = useState<Channel[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingChannels, setLoadingChannels] = useState(false)
    const [error, setError] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState('')
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState<'all' | 'my' | 'public' | 'private'>('all')
    const [activeTab, setActiveTab] = useState<'members' | 'channels' | 'overview' | 'settings'>(() => {
        try {
            const saved = localStorage.getItem('jts_team_tab')
            if (saved && ['members', 'channels', 'overview', 'settings'].includes(saved)) {
                return saved as any
            }
        } catch (_) {}
        return 'members'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_team_tab', activeTab)
        } catch (_) {}
    }, [activeTab])
    const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'admin' | 'member' | 'guest'>('all')

    // Settings tab local form state
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [editColor, setEditColor] = useState('#6366F1')
    const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public')

    const loadTeamsAndMembers = async (orgId: string) => {
        setLoading(true)
        setError('')
        try {
            const [teamsList, rawMembers] = await Promise.all([
                listOrganizationTeams(orgId, token).catch(() => [] as Team[]),
                getOrganizationMembers(orgId, token).catch(() => [] as OrganizationMember[])
            ])

            const membersList = Array.isArray(rawMembers)
                ? rawMembers
                : (rawMembers && Array.isArray((rawMembers as any).members) ? (rawMembers as any).members : [])

            const safeTeams = Array.isArray(teamsList) ? teamsList : []
            setTeams(safeTeams)
            setOrgMembers(membersList)

            setSelectedTeam((prev) => {
                const savedTeamId = localStorage.getItem('jts_current_team_id')
                if (savedTeamId) {
                    const found = safeTeams.find(t => t._id === savedTeamId)
                    if (found) return found
                }
                if (prev) {
                    const found = safeTeams.find(t => t._id === prev._id)
                    if (found) return found
                }
                return safeTeams.length > 0 ? safeTeams[0] : null
            })
        } catch (err: any) {
            setError(err?.message || 'Unable to load teams')
        } finally {
            setLoading(false)
        }
    }

    const loadChannelsForTeam = async (teamId: string) => {
        setLoadingChannels(true)
        try {
            const list = await listTeamChannels(teamId, token)
            setTeamChannels(Array.isArray(list) ? list : [])
        } catch (err) {
            console.error('Failed to load team channels:', err)
            setTeamChannels([])
        } finally {
            setLoadingChannels(false)
        }
    }

    useEffect(() => {
        if (organizationId) {
            loadTeamsAndMembers(organizationId)
        } else {
            setTeams([])
            setOrgMembers([])
            setSelectedTeam(null)
            setTeamChannels([])
        }
    }, [organizationId, token])

    useEffect(() => {
        if (selectedTeam?._id) {
            try {
                localStorage.setItem('jts_current_team_id', selectedTeam._id)
            } catch (_) {}
            setEditName(selectedTeam.name || '')
            setEditDesc(selectedTeam.description || '')
            setEditColor(selectedTeam.color || '#6366F1')
            setEditVisibility(selectedTeam.visibility || 'public')
            loadChannelsForTeam(selectedTeam._id)
        } else {
            setTeamChannels([])
        }
    }, [selectedTeam?._id])

    // Fast map of org members by userId for bulletproof user info fallback
    const orgMemberMap = useMemo(() => {
        const map = new Map<string, { fullName: string; email: string; profileImage?: string; role?: string }>()
        const list = Array.isArray(orgMembers) ? orgMembers : (orgMembers && Array.isArray((orgMembers as any).members) ? (orgMembers as any).members : [])
        for (const m of list) {
            if (!m) continue
            const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
            map.set(uId, {
                fullName: m.user?.fullName || uId,
                email: m.user?.email || '',
                profileImage: m.user?.profileImage,
                role: m.role
            })
        }
        return map
    }, [orgMembers])

    // Fallback effective user ID from token if not explicitly passed
    const effectiveUserId = useMemo(() => {
        if (currentUserId) return currentUserId
        try {
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                return payload?.userId || payload?.id || payload?._id || ''
            }
        } catch (_) {}
        return ''
    }, [currentUserId, token])

    // Check if user is Organization Owner or Admin
    const isOrgAdminOrOwner = useMemo(() => {
        if (!effectiveUserId || !orgMembers || orgMembers.length === 0) return true
        const currentMember = orgMembers.find(m => {
            if (!m) return false
            const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
            return uId === effectiveUserId
        })
        return currentMember ? (currentMember.role === 'owner' || currentMember.role === 'admin') : true
    }, [orgMembers, effectiveUserId])

    // Check if user is Member of the active team
    const isMember = useMemo(() => {
        if (!selectedTeam || !effectiveUserId) return false
        return selectedTeam.members.some((m) => {
            const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
            return uId === effectiveUserId
        })
    }, [selectedTeam, effectiveUserId])

    // Check if user is Team Owner/Admin OR Org Owner/Admin
    const isOwnerOrAdmin = useMemo(() => {
        if (!selectedTeam) return false
        if (isOrgAdminOrOwner) return true
        if (!effectiveUserId) return true
        if (selectedTeam.ownerId === effectiveUserId) return true
        const m = selectedTeam.members.find((item) => {
            const uId = typeof item.userId === 'object' && item.userId ? (item.userId as any)._id : String(item.userId)
            return uId === effectiveUserId
        })
        if (!m) return true
        return m?.role === 'owner' || m?.role === 'admin'
    }, [selectedTeam, effectiveUserId, isOrgAdminOrOwner])

    const handleCreateTeam = async (payload: CreateTeamPayload) => {
        if (!organizationId) throw new Error('Organization is required')
        const team = await createTeam({ ...payload, organizationId }, token)
        await loadTeamsAndMembers(organizationId)
        setSelectedTeam(team)
        setSuccessMessage(`Team "${team.name}" created successfully!`)
        setTimeout(() => setSuccessMessage(''), 3000)
    }

    const handleUpdateTeam = async (payload: UpdateTeamPayload) => {
        if (!selectedTeam) return
        setUpdating(true)
        setError('')
        try {
            const updated = await updateTeam(selectedTeam._id, payload, token)
            if (updated) {
                setSelectedTeam(updated)
                setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            }
            setSuccessMessage('Team settings updated successfully!')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to update team')
        } finally {
            setUpdating(false)
        }
    }

    const handleDeleteSelectedTeam = async () => {
        if (!selectedTeam) return
        if (!window.confirm(`Are you sure you want to delete the team "${selectedTeam.name}"? All associated channels and configurations will be removed.`)) return

        setUpdating(true)
        setError('')
        try {
            await deleteTeam(selectedTeam._id, token)
            const remaining = teams.filter(t => t._id !== selectedTeam._id)
            setTeams(remaining)
            setSelectedTeam(remaining.length > 0 ? remaining[0] : null)
            setSuccessMessage('Team deleted successfully')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to delete team')
        } finally {
            setUpdating(false)
        }
    }

    const handleSelectTeam = async (teamId: string) => {
        const team = teams.find((item) => item._id === teamId)
        if (team) {
            setSelectedTeam(team)
        }
        try {
            const loaded = await getTeam(teamId, token)
            if (loaded) {
                setSelectedTeam(loaded)
                setTeams(prev => prev.map(t => t._id === loaded._id ? loaded : t))
            }
        } catch (err) {
            console.error('Failed to refresh selected team:', err)
        }
    }

    const handleInviteMember = async (userId: string, role: Exclude<Team['members'][number]['role'], 'owner'>) => {
        if (!selectedTeam) return
        setUpdating(true)
        setError('')
        try {
            const updated = await inviteTeamMember({ teamId: selectedTeam._id, userId, role }, token)
            if (updated) {
                setSelectedTeam(updated)
                setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            }
            setSuccessMessage('Member invited to team successfully!')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        } finally {
            setUpdating(false)
        }
    }

    const handleRemoveMember = async (userId: string, memberName: string) => {
        if (!selectedTeam) return
        if (!window.confirm(`Are you sure you want to remove "${memberName}" from this team?`)) return

        setUpdating(true)
        setError('')
        try {
            const updated = await removeTeamMember({ teamId: selectedTeam._id, userId }, token)
            if (updated) {
                setSelectedTeam(updated)
                setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            }
            setSuccessMessage(`"${memberName}" has been removed from the team.`)
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to remove member')
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdateMemberRole = async (userId: string, role: Exclude<Team['members'][number]['role'], 'owner'>) => {
        if (!selectedTeam) return
        setUpdating(true)
        setError('')
        try {
            const updated = await updateTeamMemberRole({ teamId: selectedTeam._id, userId, role }, token)
            if (updated) {
                setSelectedTeam(updated)
                setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            }
            setSuccessMessage('Member role updated successfully!')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to update member role')
        } finally {
            setUpdating(false)
        }
    }

    const handleJoinSelectedTeam = async () => {
        if (!selectedTeam || !currentUserId) return
        setUpdating(true)
        setError('')
        try {
            const updated = await joinPublicTeam({ teamId: selectedTeam._id, userId: currentUserId }, token)
            if (updated) {
                setSelectedTeam(updated)
                setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            }
            setSuccessMessage(`You have joined "${selectedTeam.name}"`)
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to join team')
        } finally {
            setUpdating(false)
        }
    }

    const handleLeaveSelectedTeam = async () => {
        if (!selectedTeam || !currentUserId) return
        if (!window.confirm(`Are you sure you want to leave "${selectedTeam.name}"?`)) return
        setUpdating(true)
        setError('')
        try {
            const updated = await leaveTeam({ teamId: selectedTeam._id, userId: currentUserId }, token)
            if (updated) {
                setSelectedTeam(updated)
                setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            }
            setSuccessMessage(`You left "${selectedTeam.name}"`)
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to leave team')
        } finally {
            setUpdating(false)
        }
    }

    const handleCreateChannelInTeam = async (payload: { name: string; description?: string; type: 'public' | 'private' }) => {
        if (!selectedTeam || !organizationId) return
        await createChannel({
            organizationId,
            teamId: selectedTeam._id,
            name: payload.name,
            description: payload.description,
            type: payload.type
        }, token)
        await loadChannelsForTeam(selectedTeam._id)
        setSuccessMessage(`Channel #${payload.name} created successfully!`)
        setTimeout(() => setSuccessMessage(''), 3000)
    }

    const handleDeleteChannel = async (channelId: string, channelName: string) => {
        if (!selectedTeam) return
        if (!window.confirm(`Are you sure you want to delete channel #${channelName}? Messages will be lost.`)) return
        setUpdating(true)
        try {
            await deleteChannel(channelId, token)
            await loadChannelsForTeam(selectedTeam._id)
            setSuccessMessage(`Channel #${channelName} deleted.`)
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to delete channel')
        } finally {
            setUpdating(false)
        }
    }

    const handleOpenChannel = (channel: Channel) => {
        localStorage.setItem('jts_active_channel_id', channel._id)
        window.location.hash = '#channel'
    }

    const handleStartTeamMeeting = () => {
        if (!selectedTeam) return
        const roomCode = `team-${selectedTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`
        window.location.hash = `#meeting?room=${roomCode}&team=${encodeURIComponent(selectedTeam.name)}`
    }

    const handleScheduleTeamMeeting = () => {
        if (!selectedTeam) return
        window.location.hash = `#scheduled?team=${encodeURIComponent(selectedTeam.name)}`
    }

    // Helper to resolve human-readable details for a team member
    const resolveMemberDetails = (member: TeamMember) => {
        const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null
        const userIdStr = userObj ? (userObj._id || userObj.id) : String(member.userId)
        const orgInfo = orgMemberMap.get(userIdStr)

        const fullName = userObj?.fullName || member.user?.fullName || orgInfo?.fullName || (userIdStr === currentUserId ? 'You' : `Colleague (${userIdStr.slice(-4)})`)
        const email = userObj?.email || member.user?.email || orgInfo?.email || 'No email registered'
        const isSelf = userIdStr === currentUserId

        return {
            userId: userIdStr,
            fullName,
            email,
            role: member.role,
            joinedAt: member.joinedAt,
            isSelf
        }
    }

    // Filter teams in left pane
    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const matchesSearch = !searchQuery.trim() ||
                team.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase().trim()))

            let matchesCategory = true
            if (filterCategory === 'my') {
                matchesCategory = team.members.some(m => {
                    const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
                    return uId === currentUserId
                })
            } else if (filterCategory === 'public') {
                matchesCategory = team.visibility === 'public'
            } else if (filterCategory === 'private') {
                matchesCategory = team.visibility === 'private'
            }

            return matchesSearch && matchesCategory
        })
    }, [teams, searchQuery, filterCategory, currentUserId])

    // Filter members in active team
    const filteredTeamMembers = useMemo(() => {
        if (!selectedTeam) return []
        const q = memberSearchQuery.toLowerCase().trim()
        return selectedTeam.members
            .map(resolveMemberDetails)
            .filter(m => {
                const matchesText = !q || m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
                const matchesRole = roleFilter === 'all' || m.role === roleFilter
                return matchesText && matchesRole
            })
    }, [selectedTeam, memberSearchQuery, roleFilter, orgMemberMap])

    const currentTeamMemberIds = useMemo(() => {
        if (!selectedTeam) return []
        return selectedTeam.members.map(m => {
            return typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
        })
    }, [selectedTeam])

    // Role count stats
    const roleStats = useMemo(() => {
        if (!selectedTeam) return { owners: 0, admins: 0, members: 0, guests: 0 }
        let owners = 0, admins = 0, members = 0, guests = 0
        for (const m of selectedTeam.members) {
            if (m.role === 'owner') owners++
            else if (m.role === 'admin') admins++
            else if (m.role === 'member') members++
            else if (m.role === 'guest') guests++
        }
        return { owners, admins, members, guests }
    }, [selectedTeam])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', color: '#fff', fontFamily: 'var(--font-sans)' }}>
            
            {/* Top Alerts */}
            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 16px', borderRadius: 10, fontSize: '0.8125rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconAlertTriangle size={15} color="#f87171" /> {error}</span>
                    <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}><IconX size={14} /></button>
                </div>
            )}

            {successMessage && (
                <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '10px 16px', borderRadius: 10, fontSize: '0.8125rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconCheck size={15} color="#4ade80" /> {successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}><IconX size={14} /></button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading team directory and workspace settings...
                </div>
            ) : !organizationId ? (
                <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <IconBuilding size={16} /> <span>No active organization selected. Please select one in the workspace sidebar.</span>
                </div>
            ) : (
                /* UNIFIED WORKSPACE CONTAINER */
                <div
                    className="glass-card"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '290px 1fr',
                        minHeight: 'calc(100vh - 120px)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: 0
                    }}
                    id="unified-teams-container"
                >
                    <style>{`
                        @media (max-width: 820px) {
                            #unified-teams-container {
                                grid-template-columns: 1fr !important;
                            }
                        }
                    `}</style>

                    {/* LEFT PANE: TEAMS DIRECTORY SIDEBAR */}
                    <TeamDirectorySidebar
                        teams={teams}
                        filteredTeams={filteredTeams}
                        selectedTeam={selectedTeam}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filterCategory={filterCategory}
                        setFilterCategory={setFilterCategory}
                        onSelectTeam={handleSelectTeam}
                        onOpenCreateModal={() => setShowCreateModal(true)}
                        organizationId={organizationId}
                        isOrgAdminOrOwner={isOrgAdminOrOwner}
                    />

                    {/* RIGHT PANE: ACTIVE TEAM HUB */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        background: 'rgba(18, 19, 26, 0.85)',
                        overflow: 'hidden'
                    }}>
                        {!selectedTeam ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--color-text-muted)', gap: 12 }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconUsers size={32} color="#818cf8" />
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e4e4e7', margin: 0 }}>Select or Create a Team</h3>
                                <p style={{ fontSize: '0.8125rem', maxWidth: 360, textAlign: 'center', margin: 0 }}>
                                    Organize discussions, schedule conferences, and manage members in dedicated team spaces.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    <IconPlus size={14} /> Create New Team
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Active Team Header Bar */}
                                <TeamActiveHeader
                                    selectedTeam={selectedTeam}
                                    teamChannelsCount={teamChannels.length}
                                    isMember={isMember}
                                    isOwnerOrAdmin={isOwnerOrAdmin}
                                    updating={updating}
                                    onStartMeeting={handleStartTeamMeeting}
                                    onOpenCreateChannel={() => setShowCreateChannelModal(true)}
                                    onOpenInviteModal={() => setShowInviteModal(true)}
                                    onJoinTeam={handleJoinSelectedTeam}
                                    onLeaveTeam={handleLeaveSelectedTeam}
                                />

                                {/* Navigation Tabs Bar */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    padding: '0 24px',
                                    background: 'rgba(10, 11, 16, 0.5)',
                                    gap: 12
                                }}>
                                    {[
                                        { id: 'members', label: 'Members', count: selectedTeam.members.length, icon: <IconUsers size={15} /> },
                                        { id: 'channels', label: 'Channels', count: teamChannels.length, icon: <IconHash size={15} /> },
                                        { id: 'overview', label: 'Overview', count: null, icon: <IconChart size={15} /> },
                                        { id: 'settings', label: 'Settings', count: null, icon: <IconSettings size={15} /> }
                                    ].map((tab) => {
                                        const isActive = activeTab === tab.id
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id as any)}
                                                style={{
                                                    position: 'relative',
                                                    padding: '13px 12px',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: isActive ? 600 : 500,
                                                    color: isActive ? '#ffffff' : '#94a3b8',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 7
                                                }}
                                            >
                                                <span style={{ color: isActive ? (selectedTeam.color || '#818cf8') : '#64748b', display: 'flex', alignItems: 'center' }}>
                                                    {tab.icon}
                                                </span>
                                                <span>{tab.label}</span>
                                                {tab.count !== null && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        padding: '1px 6px',
                                                        borderRadius: 9999,
                                                        background: isActive ? `${selectedTeam.color || '#6366F1'}30` : 'rgba(255, 255, 255, 0.06)',
                                                        color: isActive ? '#ffffff' : '#94a3b8',
                                                        border: `1px solid ${isActive ? `${selectedTeam.color || '#6366F1'}60` : 'rgba(255, 255, 255, 0.06)'}`
                                                    }}>
                                                        {tab.count}
                                                    </span>
                                                )}
                                                {/* Active Underline Glow */}
                                                {isActive && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: -1,
                                                        left: 8,
                                                        right: 8,
                                                        height: 2,
                                                        background: selectedTeam.color || '#6366f1',
                                                        borderRadius: '2px 2px 0 0',
                                                        boxShadow: `0 0 10px ${selectedTeam.color || '#6366f1'}`
                                                    }} />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Tab Body Contents */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                                    {/* TAB 1: MEMBERS */}
                                    {activeTab === 'members' && (
                                        <TeamMembersTab
                                            selectedTeam={selectedTeam}
                                            filteredTeamMembers={filteredTeamMembers}
                                            roleFilter={roleFilter}
                                            setRoleFilter={setRoleFilter}
                                            roleStats={roleStats}
                                            memberSearchQuery={memberSearchQuery}
                                            setMemberSearchQuery={setMemberSearchQuery}
                                            onUpdateMemberRole={handleUpdateMemberRole}
                                            onRemoveMember={handleRemoveMember}
                                        />
                                    )}

                                    {/* TAB 2: CHANNELS */}
                                    {activeTab === 'channels' && (
                                        <TeamChannelsTab
                                            teamChannels={teamChannels}
                                            selectedTeam={selectedTeam}
                                            loadingChannels={loadingChannels}
                                            isOwnerOrAdmin={isOwnerOrAdmin}
                                            onOpenCreateChannel={() => setShowCreateChannelModal(true)}
                                            onOpenChannel={handleOpenChannel}
                                            onDeleteChannel={handleDeleteChannel}
                                        />
                                    )}

                                    {/* TAB 3: OVERVIEW */}
                                    {activeTab === 'overview' && (
                                        <TeamOverviewTab
                                            selectedTeam={selectedTeam}
                                            teamChannelsCount={teamChannels.length}
                                            onStartTeamMeeting={handleStartTeamMeeting}
                                            onScheduleTeamMeeting={handleScheduleTeamMeeting}
                                            onOpenInviteModal={() => setShowInviteModal(true)}
                                        />
                                    )}

                                    {/* TAB 4: SETTINGS */}
                                    {activeTab === 'settings' && (
                                        <TeamSettingsTab
                                            editName={editName}
                                            setEditName={setEditName}
                                            editDesc={editDesc}
                                            setEditDesc={setEditDesc}
                                            editColor={editColor}
                                            setEditColor={setEditColor}
                                            editVisibility={editVisibility}
                                            setEditVisibility={setEditVisibility}
                                            updating={updating}
                                            isOwnerOrAdmin={isOwnerOrAdmin}
                                            presetColors={PRESET_COLORS}
                                            onSubmit={handleUpdateTeam}
                                            onDeleteTeam={handleDeleteSelectedTeam}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* MODALS */}
            <CreateTeamModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateTeam}
            />

            <InviteTeamMemberModal
                open={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={handleInviteMember}
                teamName={selectedTeam?.name}
                availableOrgMembers={(Array.isArray(orgMembers) ? orgMembers : []).map(m => {
                    if (!m) return { userId: '', fullName: '', email: '' }
                    const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
                    return {
                        userId: uId,
                        fullName: m.user?.fullName || uId,
                        email: m.user?.email || '',
                        role: m.role
                    }
                }).filter(m => !!m.userId)}
                currentTeamMemberIds={currentTeamMemberIds}
            />

            <CreateChannelDialog
                open={showCreateChannelModal}
                onClose={() => setShowCreateChannelModal(false)}
                onCreate={handleCreateChannelInTeam}
            />
        </div>
    )
}
