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
import { CreateTeamModal } from './CreateTeamModal'
import { InviteTeamMemberModal } from './InviteTeamMemberModal'

interface TeamSettingsPageProps {
    token: string
    organizationId?: string
    currentUserId?: string
}

export function TeamSettingsPage({ token, organizationId, currentUserId }: TeamSettingsPageProps) {
    const [teams, setTeams] = useState<Team[]>([])
    const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([])
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState('')
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all')
    const [activeTab, setActiveTab] = useState<'members' | 'overview' | 'settings'>('members')

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

            setTeams(Array.isArray(teamsList) ? teamsList : [])
            setOrgMembers(membersList)

            // Select team: keep existing selection if available, else select first team
            setSelectedTeam((prev) => {
                if (prev) {
                    const found = (Array.isArray(teamsList) ? teamsList : []).find(t => t._id === prev._id)
                    if (found) return found
                }
                return (Array.isArray(teamsList) && teamsList.length > 0) ? teamsList[0] : null
            })
        } catch (err: any) {
            setError(err?.message || 'Unable to load teams')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (organizationId) {
            loadTeamsAndMembers(organizationId)
        } else {
            setTeams([])
            setOrgMembers([])
            setSelectedTeam(null)
        }
    }, [organizationId, token])

    // Sync edit form whenever selectedTeam changes
    useEffect(() => {
        if (selectedTeam) {
            setEditName(selectedTeam.name || '')
            setEditDesc(selectedTeam.description || '')
            setEditColor(selectedTeam.color || '#6366F1')
            setEditVisibility(selectedTeam.visibility || 'public')
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

    const handleCreateTeam = async (payload: CreateTeamPayload) => {
        if (!organizationId) throw new Error('Organization is required')
        const team = await createTeam({ ...payload, organizationId }, token)
        await loadTeamsAndMembers(organizationId)
        setSelectedTeam(team)
    }

    const handleUpdateTeam = async (payload: UpdateTeamPayload) => {
        if (!selectedTeam) return
        setUpdating(true)
        setError('')
        try {
            const updated = await updateTeam(selectedTeam._id, payload, token)
            setSelectedTeam(updated)
            setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSuccessMessage('Team configuration updated successfully')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to update team')
        } finally {
            setUpdating(false)
        }
    }

    const handleDeleteSelectedTeam = async () => {
        if (!selectedTeam) return
        if (!window.confirm(`Are you sure you want to delete the team "${selectedTeam.name}"? This action cannot be undone.`)) return

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
            setSelectedTeam(loaded)
            setTeams(prev => prev.map(t => t._id === loaded._id ? loaded : t))
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
            setSelectedTeam(updated)
            setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSuccessMessage('Member invited successfully!')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        } finally {
            setUpdating(false)
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!selectedTeam) return
        if (!window.confirm('Are you sure you want to remove this member from the team?')) return

        setUpdating(true)
        setError('')
        try {
            const updated = await removeTeamMember({ teamId: selectedTeam._id, userId }, token)
            setSelectedTeam(updated)
            setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSuccessMessage('Member removed from team')
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
            setSelectedTeam(updated)
            setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSuccessMessage('Member role updated')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to update member role')
        } finally {
            setUpdating(false)
        }
    }

    const handleJoinSelectedTeam = async () => {
        if (!selectedTeam) return
        setUpdating(true)
        setError('')
        try {
            const updated = await joinPublicTeam({ teamId: selectedTeam._id, userId: currentUserId || '' }, token)
            setSelectedTeam(updated)
            setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSuccessMessage('You joined this team')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to join team')
        } finally {
            setUpdating(false)
        }
    }

    const handleLeaveSelectedTeam = async () => {
        if (!selectedTeam || !currentUserId) return
        if (!window.confirm('Are you sure you want to leave this team?')) return
        setUpdating(true)
        setError('')
        try {
            const updated = await leaveTeam({ teamId: selectedTeam._id, userId: currentUserId }, token)
            setSelectedTeam(updated)
            setTeams(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSuccessMessage('You left this team')
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (err: any) {
            setError(err?.message || 'Unable to leave team')
        } finally {
            setUpdating(false)
        }
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
            isSelf
        }
    }

    const isMember = useMemo(() => {
        if (!selectedTeam || !currentUserId) return false
        return selectedTeam.members.some((m) => {
            const uId = typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
            return uId === currentUserId
        })
    }, [selectedTeam, currentUserId])

    const isOwnerOrAdmin = useMemo(() => {
        if (!selectedTeam || !currentUserId) return false
        const m = selectedTeam.members.find((item) => {
            const uId = typeof item.userId === 'object' && item.userId ? (item.userId as any)._id : String(item.userId)
            return uId === currentUserId
        })
        return m?.role === 'owner' || m?.role === 'admin'
    }, [selectedTeam, currentUserId])

    // Filter teams in left pane
    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const matchesSearch = !searchQuery.trim() ||
                team.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase().trim()))
            const matchesVisibility = visibilityFilter === 'all' || team.visibility === visibilityFilter
            return matchesSearch && matchesVisibility
        })
    }, [teams, searchQuery, visibilityFilter])

    // Filter members in active team
    const filteredTeamMembers = useMemo(() => {
        if (!selectedTeam) return []
        const q = memberSearchQuery.toLowerCase().trim()
        return selectedTeam.members
            .map(resolveMemberDetails)
            .filter(m => !q || m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    }, [selectedTeam, memberSearchQuery, orgMemberMap])

    const currentTeamMemberIds = useMemo(() => {
        if (!selectedTeam) return []
        return selectedTeam.members.map(m => {
            return typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : String(m.userId)
        })
    }, [selectedTeam])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', color: '#fff', fontFamily: 'var(--font-sans)' }}>
            
            {/* Top Alerts */}
            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {error}</span>
                    <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {successMessage && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', color: '#4ade80', padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✓ {successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading teams & members...
                </div>
            ) : !organizationId ? (
                <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    🏢 No active organization selected. Please select one in the workspace sidebar.
                </div>
            ) : (
                /* UNIFIED FULL-HEIGHT WORKSPACE CONTAINER (Zero dead space!) */
                <div
                    className="glass-card"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '270px 1fr',
                        minHeight: 'calc(100vh - 120px)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: 0
                    }}
                    id="unified-teams-container"
                >
                    <style>{`
                        @media (max-width: 768px) {
                            #unified-teams-container {
                                grid-template-columns: 1fr !important;
                            }
                        }
                    `}</style>

                    {/* LEFT PANE: TEAMS DIRECTORY */}
                    <div style={{
                        background: 'rgba(10, 11, 16, 0.6)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        {/* Directory Header */}
                        <div style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Teams ({teams.length})
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                + New Team
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 6, width: '100%' }}
                            />
                            <select
                                value={visibilityFilter}
                                onChange={(e) => setVisibilityFilter(e.target.value as any)}
                                className="input"
                                style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: 6, width: '100%' }}
                            >
                                <option value="all">All Visibility</option>
                                <option value="public">🌍 Public Teams</option>
                                <option value="private">🔒 Private Teams</option>
                            </select>
                        </div>

                        {/* Teams Scrollable List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {filteredTeams.length === 0 ? (
                                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                                    No teams match filter.
                                </div>
                            ) : (
                                filteredTeams.map((team) => {
                                    const isSelected = selectedTeam?._id === team._id
                                    return (
                                        <div
                                            key={team._id}
                                            onClick={() => handleSelectTeam(team._id)}
                                            style={{
                                                padding: '9px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                                                border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                transition: 'all 120ms ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.background = 'transparent'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                                                <div style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 6,
                                                    background: `${team.color || '#6366F1'}25`,
                                                    border: `1px solid ${team.color || '#6366F1'}60`,
                                                    color: team.color || '#6366F1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                }}>
                                                    {team.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.8125rem',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {team.name}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                    👤 {team.members.length}
                                                </span>
                                                <span style={{ fontSize: '0.65rem' }}>
                                                    {team.visibility === 'public' ? '🌍' : '🔒'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Bottom Quick Actions */}
                        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                Active Org: <strong style={{ color: '#e4e4e7' }}>{organizationId.slice(0, 8)}...</strong>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANE: ACTIVE TEAM HUB */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        background: 'rgba(18, 19, 26, 0.75)',
                        overflow: 'hidden'
                    }}>
                        {!selectedTeam ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                Select a team from the left sidebar to view members and settings.
                            </div>
                        ) : (
                            <>
                                {/* Active Team Header Bar */}
                                <div style={{
                                    padding: '14px 20px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    background: 'rgba(255, 255, 255, 0.01)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                        <div style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 10,
                                            background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'} 0%, ${selectedTeam.color || '#6366F1'}99 100%)`,
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.875rem',
                                            fontWeight: 800,
                                            boxShadow: `0 4px 12px ${selectedTeam.color || '#6366F1'}40`,
                                            flexShrink: 0
                                        }}>
                                            {selectedTeam.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                                    {selectedTeam.name}
                                                </h2>
                                                <span className={`badge ${selectedTeam.visibility === 'public' ? 'badge-success' : 'badge-accent'}`} style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                                                    {selectedTeam.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
                                                    👤 {selectedTeam.members.length} members
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 450 }}>
                                                {selectedTeam.description || 'No description provided.'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {!isMember && selectedTeam.visibility === 'public' && (
                                            <button
                                                type="button"
                                                onClick={handleJoinSelectedTeam}
                                                disabled={updating}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8 }}
                                            >
                                                Join Team
                                            </button>
                                        )}
                                        {isMember && !isOwnerOrAdmin && (
                                            <button
                                                type="button"
                                                onClick={handleLeaveSelectedTeam}
                                                disabled={updating}
                                                className="btn btn-ghost"
                                                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, color: '#f87171' }}
                                            >
                                                Leave Team
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(true)}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '6px 14px',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                borderRadius: 8,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}
                                        >
                                            <span>+</span> Invite Member
                                        </button>
                                    </div>
                                </div>

                                {/* Navigation Tabs Bar */}
                                <div style={{
                                    display: 'flex',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    padding: '0 20px',
                                    background: 'rgba(0, 0, 0, 0.15)',
                                    gap: 20
                                }}>
                                    {[
                                        { id: 'members', label: `👥 Members (${selectedTeam.members.length})` },
                                        { id: 'overview', label: '📊 Overview' },
                                        { id: 'settings', label: '⚙️ Settings' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id as any)}
                                            style={{
                                                padding: '11px 0',
                                                fontSize: '0.8rem',
                                                fontWeight: activeTab === tab.id ? 700 : 500,
                                                color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                                                border: 'none',
                                                borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
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
                                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

                                    {/* TAB 1: MEMBERS */}
                                    {activeTab === 'members' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {/* Member Search Bar */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Filter members by name or email..."
                                                    value={memberSearchQuery}
                                                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                    className="input"
                                                    style={{ maxWidth: 320, padding: '7px 12px', fontSize: '0.78rem', borderRadius: 8 }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                    Showing {filteredTeamMembers.length} of {selectedTeam.members.length} members
                                                </span>
                                            </div>

                                            {/* High-density SaaS Members Table */}
                                            <div style={{
                                                background: 'rgba(0, 0, 0, 0.25)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                                borderRadius: 12,
                                                overflow: 'hidden'
                                            }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Member Name</th>
                                                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Email Address</th>
                                                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Team Role</th>
                                                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredTeamMembers.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                                    No team members matched the filter query.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredTeamMembers.map((m) => {
                                                                const roleBg = m.role === 'owner'
                                                                    ? 'rgba(168, 85, 247, 0.15)'
                                                                    : m.role === 'admin'
                                                                    ? 'rgba(59, 130, 246, 0.15)'
                                                                    : 'rgba(34, 197, 94, 0.15)'
                                                                const roleColor = m.role === 'owner'
                                                                    ? '#c084fc'
                                                                    : m.role === 'admin'
                                                                    ? '#60a5fa'
                                                                    : '#4ade80'

                                                                return (
                                                                    <tr
                                                                        key={m.userId}
                                                                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 120ms' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        {/* Full Name & Avatar */}
                                                                        <td style={{ padding: '10px 14px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                                <div style={{
                                                                                    width: 32,
                                                                                    height: 32,
                                                                                    borderRadius: '50%',
                                                                                    background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'}80 0%, ${selectedTeam.color || '#6366F1'} 100%)`,
                                                                                    color: '#fff',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '0.72rem',
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
                                                                        <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
                                                                            {m.email}
                                                                        </td>

                                                                        {/* Role */}
                                                                        <td style={{ padding: '10px 14px' }}>
                                                                            {isOwnerOrAdmin && m.role !== 'owner' ? (
                                                                                <select
                                                                                    value={m.role}
                                                                                    onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value as any)}
                                                                                    style={{
                                                                                        background: 'rgba(255,255,255,0.05)',
                                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                                        color: '#fff',
                                                                                        padding: '4px 8px',
                                                                                        borderRadius: 6,
                                                                                        fontSize: '0.72rem',
                                                                                        outline: 'none',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                >
                                                                                    <option value="admin" style={{ background: '#18181b' }}>Admin</option>
                                                                                    <option value="member" style={{ background: '#18181b' }}>Member</option>
                                                                                    <option value="guest" style={{ background: '#18181b' }}>Guest</option>
                                                                                </select>
                                                                            ) : (
                                                                                <span style={{
                                                                                    background: roleBg,
                                                                                    color: roleColor,
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: 4,
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 600,
                                                                                    textTransform: 'uppercase',
                                                                                    letterSpacing: '0.04em'
                                                                                }}>
                                                                                    {m.role}
                                                                                </span>
                                                                            )}
                                                                        </td>

                                                                        {/* Actions */}
                                                                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                                            {isOwnerOrAdmin && !m.isSelf && m.role !== 'owner' ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveMember(m.userId)}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        color: '#f87171',
                                                                                        cursor: 'pointer',
                                                                                        fontSize: '0.72rem',
                                                                                        fontWeight: 600,
                                                                                        padding: '3px 8px',
                                                                                        borderRadius: 4
                                                                                    }}
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            ) : (
                                                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>—</span>
                                                                            )}
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

                                    {/* TAB 2: OVERVIEW */}
                                    {activeTab === 'overview' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                                                <div className="glass-card" style={{ padding: '14px 16px', borderRadius: 10 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Members</span>
                                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>{selectedTeam.members.length}</h3>
                                                </div>
                                                <div className="glass-card" style={{ padding: '14px 16px', borderRadius: 10 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Visibility</span>
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 0', color: '#fff', textTransform: 'capitalize' }}>
                                                        {selectedTeam.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                                                    </h3>
                                                </div>
                                                <div className="glass-card" style={{ padding: '14px 16px', borderRadius: 10 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 0', color: selectedTeam.status === 'active' ? '#4ade80' : 'var(--color-text-muted)' }}>
                                                        ● {selectedTeam.status}
                                                    </h3>
                                                </div>
                                                <div className="glass-card" style={{ padding: '14px 16px', borderRadius: 10 }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Created Date</span>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '6px 0 0', color: '#fff' }}>
                                                        {selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString() : 'Active'}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="glass-card" style={{ padding: 18, borderRadius: 12 }}>
                                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>About this Team</h4>
                                                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                                    {selectedTeam.description || 'No description provided for this team yet. Use the Settings tab to add a clear mission statement and purpose for your colleagues.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 3: SETTINGS */}
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
                                            style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Name</label>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="input"
                                                    style={{ padding: '9px 12px', fontSize: '0.85rem' }}
                                                    required
                                                />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Description</label>
                                                <textarea
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                    className="input"
                                                    style={{ padding: '9px 12px', fontSize: '0.82rem', height: 80, resize: 'none' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Visibility</label>
                                                    <select
                                                        value={editVisibility}
                                                        onChange={(e) => setEditVisibility(e.target.value as any)}
                                                        className="input"
                                                        style={{ padding: '8px 10px', fontSize: '0.82rem' }}
                                                    >
                                                        <option value="public">🌍 Public (Open to org)</option>
                                                        <option value="private">🔒 Private (Invite-only)</option>
                                                    </select>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Accent Color</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <input
                                                            type="color"
                                                            value={editColor}
                                                            onChange={(e) => setEditColor(e.target.value)}
                                                            style={{ width: 36, height: 36, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0 }}
                                                        />
                                                        <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{editColor}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={updating}
                                                className="btn btn-primary"
                                                style={{ alignSelf: 'flex-start', padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600, borderRadius: 8, marginTop: 8 }}
                                            >
                                                {updating ? 'Saving...' : 'Save Configuration'}
                                            </button>

                                            {/* Danger Zone */}
                                            {isOwnerOrAdmin && (
                                                <div style={{
                                                    marginTop: 24,
                                                    padding: 16,
                                                    borderRadius: 10,
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    background: 'rgba(239, 68, 68, 0.05)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 12
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171', display: 'block' }}>Delete Team</span>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                            Permanently delete this team and unlink discussions.
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
                                                            padding: '7px 14px',
                                                            borderRadius: 8,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
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
        </div>
    )
}
