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

    // Check if user is Organization Owner or Admin
    const isOrgAdminOrOwner = useMemo(() => {
        if (!currentUserId || !orgMembers || orgMembers.length === 0) return false
        const currentMember = orgMembers.find(m => {
            if (!m) return false
            const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
            return uId === currentUserId
        })
        return currentMember?.role === 'owner' || currentMember?.role === 'admin'
    }, [orgMembers, currentUserId])

    // Check if user is Member of the active team
    const isMember = useMemo(() => {
        if (!selectedTeam || !currentUserId) return false
        return selectedTeam.members.some((m) => {
            const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
            return uId === currentUserId
        })
    }, [selectedTeam, currentUserId])

    // Check if user is Team Owner/Admin OR Org Owner/Admin
    const isOwnerOrAdmin = useMemo(() => {
        if (!selectedTeam || !currentUserId) return false
        if (isOrgAdminOrOwner) return true
        const m = selectedTeam.members.find((item) => {
            const uId = typeof item.userId === 'object' && item.userId ? (item.userId as any)._id : String(item.userId)
            return uId === currentUserId
        })
        return m?.role === 'owner' || m?.role === 'admin'
    }, [selectedTeam, currentUserId, isOrgAdminOrOwner])

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
                    <span>⚠️ {error}</span>
                    <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                </div>
            )}

            {successMessage && (
                <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '10px 16px', borderRadius: 10, fontSize: '0.8125rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✓ {successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading team directory and workspace settings...
                </div>
            ) : !organizationId ? (
                <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    🏢 No active organization selected. Please select one in the workspace sidebar.
                </div>
            ) : (
                /* UNIFIED MICROSOFT TEAMS WORKSPACE CONTAINER */
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

                    {/* LEFT PANE: TEAMS DIRECTORY */}
                    <div style={{
                        background: 'rgba(10, 11, 16, 0.75)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        {/* Directory Header */}
                        <div style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Teams
                                </span>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                                    {teams.length}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>+</span> New Team
                            </button>
                        </div>

                        {/* Search & Filter Controls */}
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        position: 'absolute',
                                        left: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-muted)',
                                        pointerEvents: 'none',
                                        opacity: 0.75
                                    }}
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input"
                                    style={{
                                        width: '100%',
                                        paddingLeft: '32px',
                                        paddingRight: searchQuery ? '26px' : '10px',
                                        paddingTop: '6px',
                                        paddingBottom: '6px',
                                        fontSize: '0.78rem',
                                        borderRadius: 8,
                                        background: 'rgba(0,0,0,0.3)',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Quick Filter Pills */}
                            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'my', label: 'My Teams' },
                                    { id: 'public', label: '🌍 Public' },
                                    { id: 'private', label: '🔒 Private' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setFilterCategory(cat.id as any)}
                                        style={{
                                            padding: '3px 8px',
                                            borderRadius: 6,
                                            fontSize: '0.6875rem',
                                            fontWeight: filterCategory === cat.id ? 700 : 500,
                                            border: 'none',
                                            background: filterCategory === cat.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                            color: filterCategory === cat.id ? '#c7d2fe' : 'var(--color-text-muted)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.12s ease'
                                        }}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Teams Scrollable List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {filteredTeams.length === 0 ? (
                                <div style={{ padding: '30px 14px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                    No teams found matching filter.
                                </div>
                            ) : (
                                filteredTeams.map((team) => {
                                    const isSelected = selectedTeam?._id === team._id
                                    const teamColor = team.color || '#6366F1'
                                    return (
                                        <div
                                            key={team._id}
                                            onClick={() => handleSelectTeam(team._id)}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                                                border: isSelected ? `1px solid ${teamColor}80` : '1px solid rgba(255, 255, 255, 0.04)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 10,
                                                transition: 'all 120ms ease',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                                            }}
                                        >
                                            {isSelected && (
                                                <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 4px 4px 0', background: teamColor }} />
                                            )}

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}AA 100%)`,
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0,
                                                    boxShadow: isSelected ? `0 2px 8px ${teamColor}60` : 'none'
                                                }}>
                                                    {team.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontSize: '0.8125rem',
                                                            fontWeight: isSelected ? 700 : 500,
                                                            color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={team.name}
                                                    >
                                                        {team.name}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                                            👥 {team.members.length}
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                                            {team.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Bottom Workspace Badge */}
                        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>🏢</span>
                                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    Org: <strong style={{ color: '#e4e4e7' }}>{organizationId.slice(0, 10)}...</strong>
                                </span>
                            </div>
                            {isOrgAdminOrOwner && (
                                <span className="badge badge-accent" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                                    Admin
                                </span>
                            )}
                        </div>
                    </div>

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
                                <span style={{ fontSize: '2.5rem' }}>👥</span>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e4e4e7', margin: 0 }}>Select or Create a Team</h3>
                                <p style={{ fontSize: '0.8125rem', maxWidth: 360, textAlign: 'center', margin: 0 }}>
                                    Organize discussions, schedule conferences, and manage members in dedicated team spaces.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, marginTop: 8 }}
                                >
                                    + Create New Team
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Active Team Header Bar */}
                                <div style={{
                                    padding: '18px 24px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 14,
                                    background: 'rgba(255, 255, 255, 0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                        <div style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'} 0%, ${selectedTeam.color || '#6366F1'}AA 100%)`,
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            boxShadow: `0 4px 16px ${selectedTeam.color || '#6366F1'}50`,
                                            flexShrink: 0
                                        }}>
                                            {selectedTeam.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                                                    {selectedTeam.name}
                                                </h2>
                                                <span className={`badge ${selectedTeam.visibility === 'public' ? 'badge-success' : 'badge-accent'}`} style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
                                                    {selectedTeam.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                                                </span>
                                                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#d4d4d8' }}>
                                                    👥 {selectedTeam.members.length} members
                                                </span>
                                                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#d4d4d8' }}>
                                                    # {teamChannels.length} channels
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 540 }}>
                                                {selectedTeam.description || '24/7 collaboration and mission-critical communications space.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons (Microsoft Teams style) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        {/* Meet Now Button */}
                                        <button
                                            type="button"
                                            onClick={handleStartTeamMeeting}
                                            style={{
                                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '7px 14px',
                                                borderRadius: 8,
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                                            }}
                                            title="Start an instant conference for this team"
                                        >
                                            <span>🎥</span> Meet Now
                                        </button>

                                        {/* Add Channel */}
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateChannelModal(true)}
                                            className="btn btn-secondary"
                                            style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <span>#</span> + Channel
                                        </button>

                                        {/* Add Member */}
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(true)}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '7px 14px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                borderRadius: 8,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}
                                        >
                                            <span>+</span> Invite Member
                                        </button>

                                        {/* Join Team if public and not member */}
                                        {!isMember && selectedTeam.visibility === 'public' && (
                                            <button
                                                type="button"
                                                onClick={handleJoinSelectedTeam}
                                                disabled={updating}
                                                className="btn btn-secondary"
                                                style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: 8 }}
                                            >
                                                Join Team
                                            </button>
                                        )}

                                        {/* Leave Team if member and not owner */}
                                        {isMember && !isOwnerOrAdmin && (
                                            <button
                                                type="button"
                                                onClick={handleLeaveSelectedTeam}
                                                disabled={updating}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    color: '#f87171',
                                                    padding: '7px 12px',
                                                    fontSize: '0.78rem',
                                                    borderRadius: 8,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Leave Team
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Navigation Tabs Bar */}
                                <div style={{
                                    display: 'flex',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    padding: '0 24px',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    gap: 24
                                }}>
                                    {[
                                        { id: 'members', label: `👥 Members (${selectedTeam.members.length})` },
                                        { id: 'channels', label: `#️⃣ Channels (${teamChannels.length})` },
                                        { id: 'overview', label: '📊 Overview' },
                                        { id: 'settings', label: '⚙️ Settings' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id as any)}
                                            style={{
                                                padding: '12px 0',
                                                fontSize: '0.8125rem',
                                                fontWeight: activeTab === tab.id ? 700 : 500,
                                                color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                                                border: 'none',
                                                borderBottom: activeTab === tab.id ? `2px solid ${selectedTeam.color || '#6366f1'}` : '2px solid transparent',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                transition: 'all 120ms ease'
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Body Contents */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                                    {/* ============================================================ */}
                                    {/* TAB 1: MEMBERS */}
                                    {/* ============================================================ */}
                                    {activeTab === 'members' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {/* Filter & Search Bar */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                {/* Role Pills */}
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {[
                                                        { id: 'all', label: `All (${selectedTeam.members.length})` },
                                                        { id: 'owner', label: `👑 Owners (${roleStats.owners})` },
                                                        { id: 'admin', label: `🛡️ Admins (${roleStats.admins})` },
                                                        { id: 'member', label: `👤 Members (${roleStats.members})` },
                                                        { id: 'guest', label: `👥 Guests (${roleStats.guests})` }
                                                    ].map((r) => (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() => setRoleFilter(r.id as any)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                borderRadius: 20,
                                                                fontSize: '0.75rem',
                                                                fontWeight: roleFilter === r.id ? 700 : 500,
                                                                border: 'none',
                                                                background: roleFilter === r.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                                                color: roleFilter === r.id ? '#c7d2fe' : 'var(--color-text-muted)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.12s ease'
                                                            }}
                                                        >
                                                            {r.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Search Box */}
                                                <div style={{ position: 'relative', width: 'clamp(200px, 30vw, 300px)' }}>
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        style={{
                                                            position: 'absolute',
                                                            left: 10,
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            color: 'var(--color-text-muted)',
                                                            pointerEvents: 'none',
                                                            opacity: 0.75
                                                        }}
                                                    >
                                                        <circle cx="11" cy="11" r="8" />
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                    </svg>
                                                    <input
                                                        type="text"
                                                        placeholder="Filter members by name or email..."
                                                        value={memberSearchQuery}
                                                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                        className="input"
                                                        style={{
                                                            width: '100%',
                                                            paddingLeft: '34px',
                                                            paddingRight: memberSearchQuery ? '26px' : '12px',
                                                            paddingTop: '6px',
                                                            paddingBottom: '6px',
                                                            fontSize: '0.78rem',
                                                            borderRadius: 8,
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                    {memberSearchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setMemberSearchQuery('')}
                                                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.7rem' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* High-density SaaS Members Table */}
                                            <div style={{
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                                borderRadius: 12,
                                                overflow: 'hidden'
                                            }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member Name</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Address</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Role</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredTeamMembers.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                                    No team members match your criteria.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredTeamMembers.map((m) => {
                                                                const roleBg = m.role === 'owner'
                                                                    ? 'rgba(168, 85, 247, 0.15)'
                                                                    : m.role === 'admin'
                                                                    ? 'rgba(59, 130, 246, 0.15)'
                                                                    : m.role === 'guest'
                                                                    ? 'rgba(148, 163, 184, 0.15)'
                                                                    : 'rgba(34, 197, 94, 0.15)'
                                                                const roleColor = m.role === 'owner'
                                                                    ? '#c084fc'
                                                                    : m.role === 'admin'
                                                                    ? '#60a5fa'
                                                                    : m.role === 'guest'
                                                                    ? '#94a3b8'
                                                                    : '#4ade80'

                                                                const roleIcon = m.role === 'owner' ? '👑' : m.role === 'admin' ? '🛡️' : m.role === 'guest' ? '👥' : '👤'

                                                                return (
                                                                    <tr
                                                                        key={m.userId}
                                                                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 120ms' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        {/* Full Name & Avatar */}
                                                                        <td style={{ padding: '12px 16px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                                <div style={{
                                                                                    width: 34,
                                                                                    height: 34,
                                                                                    borderRadius: '50%',
                                                                                    background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'}80 0%, ${selectedTeam.color || '#6366F1'} 100%)`,
                                                                                    color: '#fff',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '0.75rem',
                                                                                    fontWeight: 700,
                                                                                    flexShrink: 0
                                                                                }}>
                                                                                    {m.fullName.slice(0, 2).toUpperCase()}
                                                                                </div>
                                                                                <div>
                                                                                    <div style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                        <span>{m.fullName}</span>
                                                                                        {m.isSelf && (
                                                                                            <span className="badge badge-accent" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>You</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        {/* Email Address */}
                                                                        <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                                                                            {m.email}
                                                                        </td>

                                                                        {/* Role */}
                                                                        <td style={{ padding: '12px 16px' }}>
                                                                            {isOwnerOrAdmin && m.role !== 'owner' ? (
                                                                                <select
                                                                                    value={m.role}
                                                                                    onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value as any)}
                                                                                    style={{
                                                                                        background: 'rgba(255,255,255,0.06)',
                                                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                                                        color: '#fff',
                                                                                        padding: '5px 10px',
                                                                                        borderRadius: 6,
                                                                                        fontSize: '0.75rem',
                                                                                        outline: 'none',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                >
                                                                                    <option value="admin" style={{ background: '#18181b' }}>🛡️ Admin</option>
                                                                                    <option value="member" style={{ background: '#18181b' }}>👤 Member</option>
                                                                                    <option value="guest" style={{ background: '#18181b' }}>👥 Guest</option>
                                                                                </select>
                                                                            ) : (
                                                                                <span style={{
                                                                                    background: roleBg,
                                                                                    color: roleColor,
                                                                                    padding: '3px 10px',
                                                                                    borderRadius: 6,
                                                                                    fontSize: '0.72rem',
                                                                                    fontWeight: 700,
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 4,
                                                                                    letterSpacing: '0.02em'
                                                                                }}>
                                                                                    <span>{roleIcon}</span>
                                                                                    <span>{m.role.toUpperCase()}</span>
                                                                                </span>
                                                                            )}
                                                                        </td>

                                                                        {/* Actions */}
                                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                                                {/* Chat Button */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        window.location.hash = '#channel'
                                                                                    }}
                                                                                    style={{
                                                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                                        color: '#e4e4e7',
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: 6,
                                                                                        fontSize: '0.72rem',
                                                                                        cursor: 'pointer',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 4
                                                                                    }}
                                                                                    title="Message in channel"
                                                                                >
                                                                                    <span>💬</span> Chat
                                                                                </button>

                                                                                {/* Remove Button */}
                                                                                {isOwnerOrAdmin && !m.isSelf && m.role !== 'owner' && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRemoveMember(m.userId, m.fullName)}
                                                                                        style={{
                                                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                                            color: '#f87171',
                                                                                            cursor: 'pointer',
                                                                                            fontSize: '0.72rem',
                                                                                            fontWeight: 600,
                                                                                            padding: '4px 10px',
                                                                                            borderRadius: 6
                                                                                        }}
                                                                                    >
                                                                                        Remove
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* ============================================================ */}
                                    {/* TAB 2: CHANNELS */}
                                    {/* ============================================================ */}
                                    {activeTab === 'channels' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                                <div>
                                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                                        Team Channels
                                                    </h3>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                                        Channels are dedicated spaces where team members hold discussions and share updates.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCreateChannelModal(true)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, borderRadius: 8 }}
                                                >
                                                    + Create Channel
                                                </button>
                                            </div>

                                            {loadingChannels ? (
                                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                    Loading channels...
                                                </div>
                                            ) : teamChannels.length === 0 ? (
                                                <div className="glass-card" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                    <span style={{ fontSize: '2rem' }}>#️⃣</span>
                                                    <p style={{ margin: '8px 0 14px', fontSize: '0.85rem' }}>No channels created yet for this team.</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateChannelModal(true)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8 }}
                                                    >
                                                        + Create First Channel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                                    borderRadius: 12,
                                                    overflow: 'hidden'
                                                }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Channel Name</th>
                                                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Type</th>
                                                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Description</th>
                                                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {teamChannels.map((c) => (
                                                                <tr
                                                                    key={c._id}
                                                                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 120ms' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            <span style={{ fontSize: '0.9rem', color: selectedTeam.color || '#6366F1' }}>
                                                                                {c.type === 'private' ? '🔒' : '#'}
                                                                            </span>
                                                                            <span>{c.name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '12px 16px' }}>
                                                                        <span className={`badge ${c.type === 'private' ? 'badge-accent' : 'badge-success'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                                                            {c.type === 'private' ? 'Private' : 'Standard'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '0.78rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {c.description || 'General discussions and updates.'}
                                                                    </td>
                                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenChannel(c)}
                                                                                className="btn btn-secondary"
                                                                                style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: 6 }}
                                                                            >
                                                                                💬 Open
                                                                            </button>
                                                                            {isOwnerOrAdmin && c.name.toLowerCase() !== 'general' && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteChannel(c._id, c.name)}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        color: '#f87171',
                                                                                        cursor: 'pointer',
                                                                                        fontSize: '0.72rem',
                                                                                        padding: '4px 6px'
                                                                                    }}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ============================================================ */}
                                    {/* TAB 3: OVERVIEW */}
                                    {/* ============================================================ */}
                                    {activeTab === 'overview' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                            {/* Metrics Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                                                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Members</span>
                                                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>{selectedTeam.members.length}</h3>
                                                    <span style={{ fontSize: '0.7rem', color: '#4ade80', marginTop: 4, display: 'block' }}>● Active workspace members</span>
                                                </div>

                                                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Channels</span>
                                                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>{teamChannels.length}</h3>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>Text & Voice spaces</span>
                                                </div>

                                                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Privacy Mode</span>
                                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '8px 0 0', color: '#fff', textTransform: 'capitalize' }}>
                                                        {selectedTeam.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                                                    </h3>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                                                        {selectedTeam.visibility === 'public' ? 'Open to all colleagues' : 'Restricted to invited members'}
                                                    </span>
                                                </div>

                                                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Created Date</span>
                                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '8px 0 0', color: '#fff' }}>
                                                        {selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Active'}
                                                    </h3>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>Status: ● Active</span>
                                                </div>
                                            </div>

                                            {/* Mission & Description */}
                                            <div className="glass-card" style={{ padding: '20px 22px', borderRadius: 12 }}>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>About this Team</h4>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                                    {selectedTeam.description || 'No description provided for this team yet. Use the Settings tab to add a clear mission statement and purpose for your colleagues.'}
                                                </p>
                                            </div>

                                            {/* Quick Actions Card */}
                                            <div className="glass-card" style={{ padding: '20px 22px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff' }}>Quick Collaboration</h4>
                                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={handleStartTeamMeeting}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        <span>🎥</span> Launch Instant Video Conference
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleScheduleTeamMeeting}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        <span>📅</span> Schedule a Team Sync
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowInviteModal(true)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        <span>👤</span> Invite New Colleagues
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ============================================================ */}
                                    {/* TAB 4: SETTINGS */}
                                    {/* ============================================================ */}
                                    {activeTab === 'settings' && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault()
                                                handleUpdateTeam({
                                                    name: editName,
                                                    description: editDesc,
                                                    color: editColor,
                                                    visibility: editVisibility
                                                })
                                            }}
                                            style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 580 }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Name</label>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="input"
                                                    style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                                                    required
                                                />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Description</label>
                                                <textarea
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                    className="input"
                                                    style={{ padding: '10px 14px', fontSize: '0.825rem', height: 85, resize: 'none' }}
                                                    placeholder="Describe the team's mission, goals, or schedule..."
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Privacy & Visibility</label>
                                                    <select
                                                        value={editVisibility}
                                                        onChange={(e) => setEditVisibility(e.target.value as any)}
                                                        className="input"
                                                        style={{ padding: '9px 12px', fontSize: '0.82rem' }}
                                                    >
                                                        <option value="public">🌍 Public (Open to org)</option>
                                                        <option value="private">🔒 Private (Invite-only)</option>
                                                    </select>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Custom Color</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <input
                                                            type="color"
                                                            value={editColor}
                                                            onChange={(e) => setEditColor(e.target.value)}
                                                            style={{ width: 40, height: 38, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0 }}
                                                        />
                                                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#e4e4e7', fontWeight: 600 }}>{editColor}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Curated Color Swatches */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Preset Color Themes</label>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {PRESET_COLORS.map((c) => (
                                                        <button
                                                            key={c.color}
                                                            type="button"
                                                            onClick={() => setEditColor(c.color)}
                                                            style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: 8,
                                                                background: c.color,
                                                                border: editColor.toLowerCase() === c.color.toLowerCase() ? '2px solid #fff' : '2px solid transparent',
                                                                cursor: 'pointer',
                                                                boxShadow: editColor.toLowerCase() === c.color.toLowerCase() ? `0 0 10px ${c.color}` : 'none',
                                                                transition: 'all 0.12s ease'
                                                            }}
                                                            title={c.label}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={updating}
                                                className="btn btn-primary"
                                                style={{ alignSelf: 'flex-start', padding: '10px 22px', fontSize: '0.85rem', fontWeight: 700, borderRadius: 8, marginTop: 10 }}
                                            >
                                                {updating ? 'Saving Changes...' : 'Save Team Configuration'}
                                            </button>

                                            {/* Danger Zone */}
                                            {isOwnerOrAdmin && (
                                                <div style={{
                                                    marginTop: 28,
                                                    padding: 18,
                                                    borderRadius: 12,
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    background: 'rgba(239, 68, 68, 0.05)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 16
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f87171', display: 'block' }}>Delete Team</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>
                                                            Permanently delete this team space, associated channels, and team membership logs.
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleDeleteSelectedTeam}
                                                        disabled={updating}
                                                        style={{
                                                            background: '#ef4444',
                                                            border: 'none',
                                                            color: '#fff',
                                                            padding: '8px 16px',
                                                            borderRadius: 8,
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        Delete Team
                                                    </button>
                                                </div>
                                            )}
                                        </form>
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
