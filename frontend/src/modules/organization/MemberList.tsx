import React, { useState, useEffect, useMemo } from 'react'
import type { OrganizationMember, OrganizationRole } from './organization.types'
import { API_BASE } from '../../config'
import { updateOrganizationMemberRole } from './organization.service'

interface MemberListProps {
    organizationId: string
    token: string
    initialMembers?: OrganizationMember[]
    onRemove?: (userId: string) => void
    onRoleUpdated?: () => void
    canManageRoles?: boolean
    onInviteClick?: () => void
}

export function MemberList({
    organizationId,
    token,
    initialMembers = [],
    onRemove,
    onRoleUpdated,
    canManageRoles = true,
    onInviteClick
}: MemberListProps) {
    const [members, setMembers] = useState<OrganizationMember[]>(initialMembers)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null)
    const [quickTab, setQuickTab] = useState<'all' | 'active' | 'pending' | 'admins'>('all')
    const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)

    // Close action dropdown on outside click
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuUserId(null)
        window.addEventListener('click', handleClickOutside)
        return () => window.removeEventListener('click', handleClickOutside)
    }, [])

    // Debounced search query for server fetch
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
        }, 250)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Update members if initialMembers changes and local state is empty
    useEffect(() => {
        if (initialMembers && initialMembers.length > 0 && members.length === 0) {
            setMembers(initialMembers)
        }
    }, [initialMembers])

    const fetchMembers = async (cursorVal?: string, append = false) => {
        if (!organizationId) return

        if (append) {
            setLoadingMore(true)
        } else {
            setLoading(true)
        }

        try {
            let url = `${API_BASE}/api/organization/${organizationId}/members?limit=50`
            if (debouncedSearch.trim()) {
                url += `&search=${encodeURIComponent(debouncedSearch.trim())}`
            }
            if (cursorVal) {
                url += `&cursor=${cursorVal}`
            }

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const json = await res.json()
            if (json.success) {
                let fetchedList: OrganizationMember[] = []
                if (Array.isArray(json.data)) {
                    fetchedList = json.data
                } else if (json.data && Array.isArray(json.data.members)) {
                    fetchedList = json.data.members
                } else if (Array.isArray(json.members)) {
                    fetchedList = json.members
                }

                // If server returned 0 results but we have initialMembers and no search, keep initialMembers
                if (fetchedList.length === 0 && !debouncedSearch.trim() && initialMembers && initialMembers.length > 0 && !cursorVal) {
                    fetchedList = initialMembers
                }

                setMembers(prev => append ? [...prev, ...fetchedList] : fetchedList)
                setNextCursor(json.nextCursor || json.data?.nextCursor || null)
            } else if (initialMembers && initialMembers.length > 0 && !cursorVal) {
                setMembers(initialMembers)
            }
        } catch (err) {
            console.error('Failed to fetch org roster:', err)
            // If network or route issue, fallback to initialMembers
            if (initialMembers && initialMembers.length > 0 && !cursorVal) {
                setMembers(initialMembers)
            }
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    // Trigger fetch on mount or query change
    useEffect(() => {
        fetchMembers()
    }, [organizationId, debouncedSearch])

    const handleLoadMore = () => {
        if (nextCursor && !loadingMore) {
            fetchMembers(nextCursor, true)
        }
    }

    const handleRoleChange = async (targetUserId: string, newRole: OrganizationRole) => {
        try {
            setUpdatingUserId(targetUserId)
            await updateOrganizationMemberRole(organizationId, targetUserId, newRole, token)
            setMembers(prev => prev.map(m => {
                const uid = typeof m.userId === 'object' ? (m.userId?._id || m.userId?.toString?.()) : m.userId
                if (uid === targetUserId) {
                    return { ...m, role: newRole }
                }
                return m
            }))
            onRoleUpdated?.()
        } catch (err: any) {
            alert(err?.message || 'Failed to update member role')
        } finally {
            setUpdatingUserId(null)
        }
    }

    const copyInviteLink = (targetUserId: string) => {
        const inviteUrl = `${window.location.origin}/#organization?invite=${organizationId}`
        navigator.clipboard.writeText(inviteUrl)
        setCopiedUserId(targetUserId)
        setTimeout(() => setCopiedUserId(null), 2000)
    }

    const handleExportCSV = () => {
        if (members.length === 0) return
        const rows = [
            ['Full Name', 'Email', 'Role', 'Status', 'Joined Date'],
            ...filteredMembers.map(m => {
                const u = m.user || (typeof m.userId === 'object' ? m.userId : null)
                const name = u?.fullName || 'Collaborator'
                const email = u?.email || 'N/A'
                const role = m.role
                const status = m.status
                const joined = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'
                return [name, email, role, status, joined]
            })
        ]
        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `jts_meet_members_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Counts for tabs
    const counts = useMemo(() => {
        return {
            all: members.length,
            active: members.filter(m => m.status === 'active').length,
            pending: members.filter(m => m.status === 'pending').length,
            admins: members.filter(m => m.role === 'admin' || m.role === 'owner').length
        }
    }, [members])

    // Filter members
    const filteredMembers = useMemo(() => {
        return members.filter((member) => {
            // Quick tab filter
            if (quickTab === 'active' && member.status !== 'active') return false
            if (quickTab === 'pending' && member.status !== 'pending') return false
            if (quickTab === 'admins' && member.role !== 'admin' && member.role !== 'owner') return false

            // Dropdown filters
            const matchesRole = roleFilter === 'all' || member.role === roleFilter
            const matchesStatus = statusFilter === 'all' || member.status === statusFilter

            // Text search
            const u = member.user || (typeof member.userId === 'object' ? member.userId : null)
            const name = (u?.fullName || '').toLowerCase()
            const email = (u?.email || '').toLowerCase()
            const search = searchQuery.toLowerCase().trim()
            const matchesSearch = !search || name.includes(search) || email.includes(search) || member.role.toLowerCase().includes(search)

            return matchesRole && matchesStatus && matchesSearch
        })
    }, [members, quickTab, roleFilter, statusFilter, searchQuery])

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner': return { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' }
            case 'admin': return { bg: 'rgba(139, 92, 246, 0.12)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)' }
            case 'moderator': return { bg: 'rgba(99, 102, 241, 0.12)', text: '#818CF8', border: 'rgba(99, 102, 241, 0.3)' }
            case 'member': return { bg: 'rgba(34, 197, 94, 0.12)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)' }
            case 'guest': return { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' }
            default: return { bg: 'rgba(255, 255, 255, 0.05)', text: '#A1A1AA', border: 'rgba(255, 255, 255, 0.1)' }
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#4ADE80', fontSize: '0.725rem', fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                        Active
                    </span>
                )
            case 'pending':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#FBBF24', fontSize: '0.725rem', fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
                        Pending Invite
                    </span>
                )
            case 'removed':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#F87171', fontSize: '0.725rem', fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                        Removed
                    </span>
                )
            default:
                return <span style={{ color: '#94A3B8', fontSize: '0.725rem' }}>{status}</span>
        }
    }

    return (
        <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* TOP BAR: Title, Subtitle, and Top Action Tools */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Organization Members</span>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            {members.length} Total
                        </span>
                    </h3>
                    <p style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Manage access permissions, team assignments, and workspace member roles.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {onInviteClick && (
                        <button
                            type="button"
                            onClick={onInviteClick}
                            className="btn btn-primary"
                            style={{
                                height: 30,
                                padding: '0 12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 7,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <span>+</span>
                            <span>Invite Member</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        title="Export members to CSV"
                        style={{
                            height: 30,
                            padding: '0 12px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            borderRadius: 7,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#d4d4d8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* QUICK PILL TABS (Teams Style) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: 10, flexWrap: 'wrap' }}>
                {[
                    { id: 'all', label: 'All Members', count: counts.all },
                    { id: 'active', label: 'Active', count: counts.active },
                    { id: 'pending', label: 'Pending Invites', count: counts.pending },
                    { id: 'admins', label: 'Admins & Owners', count: counts.admins }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setQuickTab(tab.id as any)}
                        style={{
                            background: quickTab === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${quickTab === tab.id ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
                            color: quickTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                            borderRadius: 20,
                            padding: '4px 12px',
                            fontSize: '0.725rem',
                            fontWeight: quickTab === tab.id ? 700 : 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span>{tab.label}</span>
                        <span style={{
                            background: quickTab === tab.id ? '#6366F1' : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            borderRadius: 10,
                            padding: '1px 6px',
                            fontSize: '0.65rem',
                            fontWeight: 700
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220 }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#71717A"
                            strokeWidth="2"
                            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                        >
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Filter by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8,
                                padding: '6px 10px 6px 34px',
                                fontSize: '0.75rem',
                                color: '#fff',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#71717A',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            color: '#fff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Roles</option>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            color: '#fff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="removed">Removed</option>
                    </select>
                </div>
            </div>

            {/* MEMBERS TABLE */}
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
                <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Member Profile</th>
                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Role & Access</th>
                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Joined Date</th>
                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && members.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <div className="animate-spin" style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%', marginRight: '8px', verticalAlign: 'middle' }} />
                                    Loading workspace members roster...
                                </td>
                            </tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>👥</div>
                                    <div style={{ fontWeight: 600, color: '#fff', marginBottom: 2 }}>No organization members found</div>
                                    <div style={{ fontSize: '0.725rem' }}>Try clearing filters or invite new team members to this workspace.</div>
                                </td>
                            </tr>
                        ) : (
                            filteredMembers.map((member) => {
                                const userObj = member.user || (typeof member.userId === 'object' ? member.userId : null)
                                const rawUserId = typeof member.userId === 'object' && member.userId?._id ? member.userId._id : member.userId
                                const userIdStr = String(rawUserId || '')
                                const fullName = userObj?.fullName || `Collaborator ${userIdStr.slice(-4)}`
                                const email = userObj?.email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@jtsmeet.internal`
                                const roleColors = getRoleColor(member.role)
                                const joinedStr = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Pending verification'
                                const isUpdating = updatingUserId === userIdStr

                                return (
                                    <tr key={userIdStr} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 150ms' }} className="hover:bg-white/2">
                                        {/* Member Profile info */}
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {userObj?.profileImage ? (
                                                    <img
                                                        src={userObj.profileImage}
                                                        alt={fullName}
                                                        style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        minWidth: 32,
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        color: '#fff',
                                                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
                                                    }}>
                                                        {fullName.slice(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.8125rem' }}>{fullName}</span>
                                                        {member.role === 'owner' && (
                                                            <span style={{ fontSize: '0.625rem', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                                                OWNER
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role with Dynamic Switcher */}
                                        <td style={{ padding: '10px 14px' }}>
                                            {canManageRoles && member.role !== 'owner' ? (
                                                <select
                                                    value={member.role}
                                                    disabled={isUpdating}
                                                    onChange={(e) => handleRoleChange(userIdStr, e.target.value as OrganizationRole)}
                                                    style={{
                                                        background: roleColors.bg,
                                                        color: roleColors.text,
                                                        border: `1px solid ${roleColors.border}`,
                                                        borderRadius: 6,
                                                        padding: '3px 8px',
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="admin" style={{ background: '#18181b', color: '#A78BFA' }}>Admin</option>
                                                    <option value="member" style={{ background: '#18181b', color: '#4ADE80' }}>Member</option>
                                                    <option value="guest" style={{ background: '#18181b', color: '#94A3B8' }}>Guest</option>
                                                </select>
                                            ) : (
                                                <span style={{
                                                    background: roleColors.bg,
                                                    color: roleColors.text,
                                                    border: `1px solid ${roleColors.border}`,
                                                    borderRadius: 6,
                                                    padding: '2px 8px',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.02em',
                                                    display: 'inline-block'
                                                }}>
                                                    {member.role}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '10px 14px' }}>
                                            {getStatusBadge(member.status)}
                                        </td>

                                        {/* Joined Date */}
                                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                            {joinedStr}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '10px 14px', textAlign: 'right', position: 'relative' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                {/* If Owner: Display Crown Badge */}
                                                {member.role === 'owner' && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        background: 'rgba(245, 158, 11, 0.12)',
                                                        color: '#fbbf24',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                                        padding: '3px 8px',
                                                        borderRadius: 6,
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}>
                                                        👑 Primary Owner
                                                    </span>
                                                )}

                                                {/* If Pending: Quick Link Copy Button */}
                                                {member.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copyInviteLink(userIdStr)}
                                                        title="Copy invite link to share with user"
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: copiedUserId === userIdStr ? '#4ade80' : '#818cf8',
                                                            padding: '4px 8px',
                                                            borderRadius: 6,
                                                            background: 'rgba(99, 102, 241, 0.08)',
                                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {copiedUserId === userIdStr ? '✓ Copied' : '🔗 Invite Link'}
                                                    </button>
                                                )}

                                                {/* 3-Dots Action Dropdown Menu Trigger */}
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpenMenuUserId(openMenuUserId === userIdStr ? null : userIdStr)
                                                        }}
                                                        title="Member options"
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            background: openMenuUserId === userIdStr ? 'rgba(91, 95, 199, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            color: '#e2e4f0',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 700,
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        ⋮
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {openMenuUserId === userIdStr && (
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: 'calc(100% + 4px)',
                                                                zIndex: 9999,
                                                                minWidth: 180,
                                                                background: '#1a1b26',
                                                                border: '1px solid rgba(91, 95, 199, 0.35)',
                                                                borderRadius: 8,
                                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.7), 0 0 15px rgba(91,95,199,0.2)',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 2,
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            {/* Copy Email */}
                                                            {email && email !== 'N/A' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(email)
                                                                        setCopiedUserId(`email-${userIdStr}`)
                                                                        setTimeout(() => setCopiedUserId(null), 2000)
                                                                        setOpenMenuUserId(null)
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '6px 10px',
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: '#d1d3e2',
                                                                        fontSize: '0.75rem',
                                                                        borderRadius: 6,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 8,
                                                                        textAlign: 'left',
                                                                        transition: 'background 0.15s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <span>📧</span>
                                                                    <span>{copiedUserId === `email-${userIdStr}` ? '✓ Copied Email' : 'Copy Email'}</span>
                                                                </button>
                                                            )}

                                                            {/* Copy User ID */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(userIdStr)
                                                                    setCopiedUserId(`id-${userIdStr}`)
                                                                    setTimeout(() => setCopiedUserId(null), 2000)
                                                                    setOpenMenuUserId(null)
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px 10px',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#d1d3e2',
                                                                    fontSize: '0.75rem',
                                                                    borderRadius: 6,
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 8,
                                                                    textAlign: 'left',
                                                                    transition: 'background 0.15s'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                <span>📋</span>
                                                                <span>{copiedUserId === `id-${userIdStr}` ? '✓ Copied ID' : 'Copy User ID'}</span>
                                                            </button>

                                                            {/* Role Promotion / Demotion for Non-Owners */}
                                                            {canManageRoles && member.role !== 'owner' && (
                                                                <>
                                                                    <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '3px 0' }} />
                                                                    {member.role !== 'admin' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleRoleChange(userIdStr, 'admin')
                                                                                setOpenMenuUserId(null)
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '6px 10px',
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: '#c084fc',
                                                                                fontSize: '0.75rem',
                                                                                borderRadius: 6,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 8,
                                                                                textAlign: 'left'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(192, 132, 252, 0.1)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <span>🛡️</span>
                                                                            <span>Promote to Admin</span>
                                                                        </button>
                                                                    )}
                                                                    {member.role !== 'member' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleRoleChange(userIdStr, 'member')
                                                                                setOpenMenuUserId(null)
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '6px 10px',
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: '#4ade80',
                                                                                fontSize: '0.75rem',
                                                                                borderRadius: 6,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 8,
                                                                                textAlign: 'left'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <span>👤</span>
                                                                            <span>Set as Member</span>
                                                                        </button>
                                                                    )}
                                                                    {member.role !== 'guest' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleRoleChange(userIdStr, 'guest')
                                                                                setOpenMenuUserId(null)
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '6px 10px',
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: '#94a3b8',
                                                                                fontSize: '0.75rem',
                                                                                borderRadius: 6,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 8,
                                                                                textAlign: 'left'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <span>👁️</span>
                                                                            <span>Set as Guest</span>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* Remove Member Option for Non-Owners */}
                                                            {onRemove && member.role !== 'owner' && member.status !== 'removed' && (
                                                                <>
                                                                    <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '3px 0' }} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenMenuUserId(null)
                                                                            if (confirm(`Remove ${fullName} from the organization? They will lose workspace access.`)) {
                                                                                onRemove(userIdStr)
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '6px 10px',
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: '#f87171',
                                                                            fontSize: '0.75rem',
                                                                            borderRadius: 6,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 8,
                                                                            textAlign: 'left'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        <span>🗑️</span>
                                                                        <span>Remove Member</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* FOOTER PAGINATION / STATUS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>
                    Showing {filteredMembers.length} of {members.length} members loaded
                </span>
                {nextCursor && (
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        style={{
                            padding: '6px 14px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: 8,
                            color: '#818cf8',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {loadingMore && <div className="animate-spin" style={{ width: 12, height: 12, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />}
                        Load More Members
                    </button>
                )}
            </div>
        </div>
    )
}
