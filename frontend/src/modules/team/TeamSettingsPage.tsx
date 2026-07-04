import React, { useEffect, useMemo, useState } from 'react'
import type { Team, CreateTeamPayload, UpdateTeamPayload } from './team.types'
import { createTeam, getTeam, inviteTeamMember, joinPublicTeam, leaveTeam, listOrganizationTeams, removeTeamMember, updateTeam, updateTeamMemberRole } from './team.service'
import { CreateTeamModal } from './CreateTeamModal'
import { InviteTeamMemberModal } from './InviteTeamMemberModal'

interface TeamSettingsPageProps {
    token: string
    organizationId?: string
    currentUserId?: string
}

export function TeamSettingsPage({ token, organizationId, currentUserId }: TeamSettingsPageProps) {
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState('')
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeDrawerTab, setActiveDrawerTab] = useState<'overview' | 'members' | 'settings'>('overview')

    const loadTeams = async (orgId: string) => {
        setLoading(true)
        try {
            const list = await listOrganizationTeams(orgId, token)
            setTeams(list)
            if (selectedTeam) {
                const refreshed = list.find((team) => team._id === selectedTeam._id)
                if (refreshed) {
                    setSelectedTeam(refreshed)
                }
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to load teams')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (organizationId) {
            loadTeams(organizationId)
        } else {
            setTeams([])
            setSelectedTeam(null)
            setIsDrawerOpen(false)
        }
    }, [organizationId, token])

    const handleCreateTeam = async (payload: CreateTeamPayload) => {
        if (!organizationId) {
            throw new Error('Organization is required')
        }
        const team = await createTeam({ ...payload, organizationId }, token)
        await loadTeams(organizationId)
        setSelectedTeam(team)
        setIsDrawerOpen(true)
    }

    const handleUpdateTeam = async (payload: UpdateTeamPayload) => {
        if (!selectedTeam) {
            return
        }
        setUpdating(true)
        setError('')
        try {
            const updated = await updateTeam(selectedTeam._id, payload, token)
            setSelectedTeam(updated)
            await loadTeams(selectedTeam.organizationId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update team')
        } finally {
            setUpdating(false)
        }
    }

    const handleSelectTeam = async (teamId: string) => {
        const team = teams.find((item) => item._id === teamId)
        if (team) {
            setSelectedTeam(team)
            setIsDrawerOpen(true)
        } else {
            try {
                const loaded = await getTeam(teamId, token)
                setSelectedTeam(loaded)
                setIsDrawerOpen(true)
            } catch (err: any) {
                setError(err?.message || 'Unable to load team')
            }
        }
    }

    const handleInviteMember = async (userId: string, role: Exclude<Team['members'][number]['role'], 'owner'>) => {
        if (!selectedTeam) {
            return
        }
        setUpdating(true)
        setError('')
        try {
            const updated = await inviteTeamMember({ teamId: selectedTeam._id, userId, role }, token)
            setSelectedTeam(updated)
            await loadTeams(selectedTeam.organizationId)
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        } finally {
            setUpdating(false)
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!selectedTeam) {
            return
        }
        setUpdating(true)
        setError('')
        try {
            const updated = await removeTeamMember({ teamId: selectedTeam._id, userId }, token)
            setSelectedTeam(updated)
            await loadTeams(selectedTeam.organizationId)
        } catch (err: any) {
            setError(err?.message || 'Unable to remove member')
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdateMemberRole = async (userId: string, role: Exclude<Team['members'][number]['role'], 'owner'>) => {
        if (!selectedTeam) {
            return
        }
        setUpdating(true)
        setError('')
        try {
            const updated = await updateTeamMemberRole({ teamId: selectedTeam._id, userId, role }, token)
            setSelectedTeam(updated)
            await loadTeams(selectedTeam.organizationId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update member role')
        } finally {
            setUpdating(false)
        }
    }

    const handleJoinSelectedTeam = async () => {
        if (!selectedTeam) {
            return
        }
        setUpdating(true)
        setError('')
        try {
            const updated = await joinPublicTeam({ teamId: selectedTeam._id, userId: currentUserId || '' }, token)
            setSelectedTeam(updated)
            await loadTeams(selectedTeam.organizationId)
        } catch (err: any) {
            setError(err?.message || 'Unable to join team')
        } finally {
            setUpdating(false)
        }
    }

    const handleLeaveSelectedTeam = async () => {
        if (!selectedTeam || !currentUserId) {
            return
        }
        setUpdating(true)
        setError('')
        try {
            const updated = await leaveTeam({ teamId: selectedTeam._id, userId: currentUserId }, token)
            setSelectedTeam(updated)
            await loadTeams(selectedTeam.organizationId)
        } catch (err: any) {
            setError(err?.message || 'Unable to leave team')
        } finally {
            setUpdating(false)
        }
    }

    const isMember = useMemo(() => {
        return selectedTeam?.members.some((member) => member.userId === currentUserId)
    }, [selectedTeam, currentUserId])

    const currentMemberRole = useMemo(() => {
        return selectedTeam?.members.find((member) => member.userId === currentUserId)?.role
    }, [selectedTeam, currentUserId])

    // Derive Statistics from State
    const stats = useMemo(() => {
        const total = teams.length
        const publicCount = teams.filter(t => t.visibility === 'public').length
        const privateCount = teams.filter(t => t.visibility === 'private').length
        const totalMembers = Array.from(new Set(teams.flatMap(t => t.members.map(m => m.userId)))).length
        const pendingCount = teams.filter(t => t.status === 'inactive').length
        return { total, publicCount, privateCount, totalMembers, pendingCount }
    }, [teams])

    // Apply Search and Filters
    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (team.description || '').toLowerCase().includes(searchQuery.toLowerCase())
            const matchesVisibility = visibilityFilter === 'all' || team.visibility === visibilityFilter
            const matchesStatus = statusFilter === 'all' || team.status === statusFilter
            return matchesSearch && matchesVisibility && matchesStatus
        })
    }, [teams, searchQuery, visibilityFilter, statusFilter])

    return (
        <div style={{ background: '#09090B', minHeight: '100vh', color: '#fff', padding: '24px 32px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                        <span>Teams</span>
                        <span>/</span>
                        <span style={{ color: 'var(--color-accent)' }}>Team Management</span>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', background: 'linear-gradient(to right, #ffffff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Team Management
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        Manage teams inside your organization.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Create Team Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                        style={{
                            height: '44px',
                            borderRadius: '12px',
                            padding: '0 20px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: 'var(--shadow-glow-accent)',
                            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <span>+</span> Create Team
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', fontSize: '0.875rem' }}>
                    ⚠ {error}
                </div>
            )}

            {/* Statistics Dashboard Cards */}
            <div className="grid grid-cols-5 gap-4">
                {[
                    { title: 'Total Teams', value: stats.total, desc: 'Teams created', icon: '👥', color: '#6366F1' },
                    { title: 'Public Teams', value: stats.publicCount, desc: 'Visible to all', icon: '🌍', color: '#22C55E' },
                    { title: 'Private Teams', value: stats.privateCount, desc: 'Invite only', icon: '🔒', color: '#8B5CF6' },
                    { title: 'Total Members', value: stats.totalMembers, desc: 'Across all teams', icon: '👤', color: '#06B6D4' },
                    { title: 'Inactive Teams', value: stats.pendingCount, desc: 'Archived workspace logs', icon: '⏳', color: '#F59E0B' }
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        className="glass-card-sm"
                        style={{
                            padding: '16px 20px',
                            borderRadius: '14px',
                            background: '#111827',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            transition: 'transform 200ms ease, border-color 200ms ease',
                            cursor: 'default',
                            minWidth: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', padding: '10px', background: `${stat.color}15`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: '1.25' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.title}</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0', color: '#fff' }}>{stat.value}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar section: search + filters */}
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                    {/* Search Field */}
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)', display: 'flex' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search teams by name or description..."
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                padding: '10px 12px 10px 38px',
                                fontSize: '0.875rem',
                                color: '#fff',
                                outline: 'none',
                                transition: 'border-color 150ms'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Visibility Filter */}
                    <select
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value as any)}
                        className="input"
                        style={{ width: '130px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', fontSize: '0.8125rem', color: '#fff', outline: 'none' }}
                    >
                        <option value="all">All Visibility</option>
                        <option value="public">🌍 Public</option>
                        <option value="private">🔒 Private</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="input"
                        style={{ width: '130px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', fontSize: '0.8125rem', color: '#fff', outline: 'none' }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* View switcher Grid/List Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '2px' }}>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '8px 12px', border: 'none', background: viewMode === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--color-text-muted)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                        📝 List
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{ padding: '8px 12px', border: 'none', background: viewMode === 'grid' ? 'rgba(255,255,255,0.08)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                        🔲 Grid
                    </button>
                </div>
            </div>

            {/* List / Grid view selection */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9375rem', animation: 'jts-blink 1.5s ease-in-out infinite' }}>
                    Loading organization teams...
                </div>
            ) : !organizationId ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No active organization selected. Please select one in the sidebar switch.
                </div>
            ) : filteredTeams.length === 0 ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '18px', background: '#111827' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>👥</span>
                    <h3 style={{ fontSize: '1rem', color: '#fff', margin: '0 0 4px', fontWeight: 700 }}>No Teams Found</h3>
                    <p style={{ fontSize: '0.8125rem', margin: 0 }}>Try clearing filters or search queries to locate your organization teams.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid view cards */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {filteredTeams.map((team) => (
                        <div
                            key={team._id}
                            style={{
                                background: '#111827',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '18px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                transition: 'all 200ms ease',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={() => handleSelectTeam(team._id)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)'
                                e.currentTarget.style.borderColor = team.color || 'var(--color-accent)'
                                e.currentTarget.style.boxShadow = `0 10px 30px -10px ${team.color || 'var(--color-accent)'}1A`
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        >
                            {/* Accent highlight strip */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: team.color || 'var(--color-accent)' }} />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${team.color || 'var(--color-accent)'}20`, color: team.color || 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700 }}>
                                        {team.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#fff' }}>{team.name}</h3>
                                </div>
                                <span className={`badge ${team.status === 'active' ? 'badge-success' : 'badge-accent'}`} style={{ fontSize: '0.625rem', padding: '2px 8px', textTransform: 'uppercase' }}>
                                    {team.status}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '36px', lineHeight: 1.4 }}>
                                {team.description || 'No description provided.'}
                            </p>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {team.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                                </span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>
                                    👤 {team.members.length} member{team.members.length > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List view (Professional SaaS Table) */
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}>
                                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Name</th>
                                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Visibility</th>
                                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Members</th>
                                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team) => (
                                <tr
                                    key={team._id}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 150ms' }}
                                    onClick={() => handleSelectTeam(team._id)}
                                    className="table-row-hover"
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Team Name */}
                                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#fff' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color || 'var(--color-accent)', boxShadow: `0 0 8px ${team.color || 'var(--color-accent)'}` }} />
                                            {team.name}
                                        </div>
                                    </td>

                                    {/* Description */}
                                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {team.description || 'No description provided.'}
                                    </td>

                                    {/* Visibility */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <span className={`badge ${team.visibility === 'public' ? 'badge-success' : 'badge-accent'}`} style={{ fontSize: '0.6875rem', padding: '2px 8px', textTransform: 'capitalize' }}>
                                            {team.visibility === 'public' ? '🌍 public' : '🔒 private'}
                                        </span>
                                    </td>

                                    {/* Members Count */}
                                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                                        👤 {team.members.length} members
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 500, color: team.status === 'active' ? '#4ade80' : 'var(--color-text-muted)' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: team.status === 'active' ? '#22C55E' : 'var(--color-text-muted)' }} />
                                            {team.status}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleSelectTeam(team._id)
                                            }}
                                        >
                                            Manage ➔
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SIDE DRAWER (selected team details panel) */}
            {selectedTeam && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        opacity: isDrawerOpen ? 1 : 0,
                        pointerEvents: isDrawerOpen ? 'all' : 'none',
                        transition: 'opacity 280ms ease'
                    }}
                    onClick={() => setIsDrawerOpen(false)}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: 'min(520px, 95vw)',
                            background: '#111827',
                            borderLeft: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: 'var(--shadow-xl)',
                            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                            transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '30px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${selectedTeam.color || 'var(--color-accent)'}20`, color: selectedTeam.color || 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                                    {selectedTeam.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>{selectedTeam.name}</h2>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Organization workspace team settings</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="btn btn-ghost"
                                style={{ padding: '6px', borderRadius: '50%', display: 'flex', color: 'var(--color-text-muted)' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Drawer tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '16px', marginBottom: '24px' }}>
                            {[
                                { id: 'overview', label: 'Overview' },
                                { id: 'members', label: 'Members' },
                                { id: 'settings', label: 'Settings' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveDrawerTab(tab.id as any)}
                                    style={{
                                        padding: '10px 4px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeDrawerTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                                        color: activeDrawerTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 150ms'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Drawer body tabs contents */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* OVERVIEW TAB */}
                            {activeDrawerTab === 'overview' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div className="glass-card-sm" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', background: 'rgba(255,255,255,0.01)' }}>
                                        <h4 style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</h4>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#fff', lineHeight: 1.5 }}>
                                            {selectedTeam.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    <div className="glass-card-sm" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Stats</h4>
                                        
                                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Visibility</span>
                                            <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{selectedTeam.visibility}</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                                            <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{selectedTeam.status}</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Owner</span>
                                            <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{selectedTeam.ownerId}</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Member count</span>
                                            <span style={{ fontWeight: 600, color: '#fff' }}>{selectedTeam.members.length} members</span>
                                        </div>
                                    </div>

                                    {/* Join/Leave/Actions buttons */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        {selectedTeam.visibility === 'public' && !isMember && (
                                            <button onClick={handleJoinSelectedTeam} className="btn btn-success" style={{ flex: 1, height: '44px', borderRadius: '12px', fontWeight: 600 }}>
                                                Join Public Team
                                            </button>
                                        )}
                                        {isMember && currentMemberRole !== 'owner' && (
                                            <button onClick={handleLeaveSelectedTeam} className="btn btn-danger" style={{ flex: 1, height: '44px', borderRadius: '12px', fontWeight: 600 }}>
                                                Leave Team
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MEMBERS TAB */}
                            {activeDrawerTab === 'members' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                                            Team Members ({selectedTeam.members.length})
                                        </h4>
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="btn btn-primary"
                                            style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', padding: '0 14px', fontWeight: 600 }}
                                        >
                                            + Invite Member
                                        </button>
                                    </div>

                                    {/* Custom Redesigned Members List inside Side Drawer */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedTeam.members.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>No members joined yet.</div>
                                        ) : (
                                            selectedTeam.members.map((member) => {
                                                const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null
                                                const userIdStr = userObj ? userObj._id : (member.userId as string)
                                                const fullName = userObj ? userObj.fullName : (member.user?.fullName || userIdStr)
                                                const email = userObj ? userObj.email : (member.user?.email || 'No email registered')

                                                return (
                                                    <div
                                                        key={userIdStr}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.02)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                            borderRadius: '14px',
                                                            padding: '14px 16px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                            <div style={{
                                                                width: '38px', height: '38px', borderRadius: '50%',
                                                                background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'}80 0%, ${selectedTeam.color || '#6366F1'}FF 100%)`,
                                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0
                                                            }}>
                                                                {fullName.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{fullName}</span>
                                                                    {userIdStr === currentUserId && (
                                                                        <span className="badge badge-accent" style={{ fontSize: '0.5625rem', padding: '1px 6px' }}>You</span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                                                    {email}
                                                                </div>
                                                                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', display: 'inline-block', marginTop: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                    {member.role}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions role update/remove */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {member.role !== 'owner' && (
                                                                <select
                                                                    value={member.role}
                                                                    onChange={(e) => handleUpdateMemberRole(userIdStr, e.target.value as any)}
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.03)',
                                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                                        color: '#fff',
                                                                        padding: '6px 8px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.75rem',
                                                                        outline: 'none',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <option value="admin" style={{ background: '#111827' }}>Admin</option>
                                                                    <option value="member" style={{ background: '#111827' }}>Member</option>
                                                                    <option value="guest" style={{ background: '#111827' }}>Guest</option>
                                                                </select>
                                                            )}
                                                            {userIdStr !== currentUserId && member.role !== 'owner' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveMember(userIdStr)}
                                                                    className="btn btn-ghost"
                                                                    style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--color-danger)', borderRadius: '8px' }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SETTINGS TAB */}
                            {activeDrawerTab === 'settings' && (
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault()
                                        await handleUpdateTeam({
                                            description: selectedTeam.description || '',
                                            visibility: selectedTeam.visibility,
                                            color: selectedTeam.color
                                        })
                                        setSuccessMessage('Team settings updated successfully')
                                        setTimeout(() => setSuccessMessage(''), 4000)
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
                                >
                                    {successMessage && (
                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', color: '#4ade80', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8125rem' }}>
                                            ✓ {successMessage}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Description</label>
                                        <textarea
                                            value={selectedTeam.description || ''}
                                            onChange={(e) => setSelectedTeam(curr => curr && { ...curr, description: e.target.value })}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                fontSize: '0.875rem',
                                                color: '#fff',
                                                resize: 'none',
                                                height: '80px',
                                                outline: 'none',
                                                transition: 'border-color 150ms'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Visibility</label>
                                            <select
                                                value={selectedTeam.visibility}
                                                onChange={(e) => setSelectedTeam(curr => curr && { ...curr, visibility: e.target.value as any })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '10px 12px',
                                                    fontSize: '0.875rem',
                                                    color: '#fff',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="private" style={{ background: '#111827' }}>🔒 Private</option>
                                                <option value="public" style={{ background: '#111827' }}>🌍 Public</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Accent Color</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="color"
                                                    value={selectedTeam.color || '#6366F1'}
                                                    onChange={(e) => setSelectedTeam(curr => curr && { ...curr, color: e.target.value })}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        background: 'transparent',
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        overflow: 'hidden'
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                                                    {selectedTeam.color || '#6366F1'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="btn btn-primary"
                                        style={{
                                            height: '44px',
                                            borderRadius: '12px',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            marginTop: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {updating ? 'Saving Changes…' : 'Save Team Configuration'}
                                    </button>
                                </form>
                            )}

                        </div>
                    </div>
                </div>
            )}

            <CreateTeamModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateTeam} />
            <InviteTeamMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={handleInviteMember} />
        </div>
    )
}

