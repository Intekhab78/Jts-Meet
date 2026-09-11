import React, { useState, useEffect } from 'react'
import type { ChannelMember, ChannelRole } from './channel.types'

interface ChannelMembersPageProps {
    members: ChannelMember[]
    currentUserId?: string
    onRemove?: (userId: string) => Promise<void>
    onRoleChange?: (userId: string, role: Exclude<ChannelRole, 'owner'>) => Promise<void>
    onInviteClick?: () => void
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    owner: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' },
    moderator: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' },
    member: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
    guest: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)' }
}

export function ChannelMembersPage({
    members = [],
    currentUserId,
    onRemove,
    onRoleChange,
    onInviteClick
}: ChannelMembersPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [quickTab, setQuickTab] = useState<'all' | 'owners' | 'members' | 'guests'>('all')
    const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null)

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuUserId(null)
        window.addEventListener('click', handleClickOutside)
        return () => window.removeEventListener('click', handleClickOutside)
    }, [])

    // Helper to safely extract user properties
    const getUserData = (member: ChannelMember) => {
        const userObj = typeof member.userId === 'object' && member.userId !== null ? (member.userId as any) : null
        const userIdStr = userObj?._id ? userObj._id.toString() : (typeof member.userId === 'string' ? member.userId : ((member.user as any)?._id || ''))
        const fullName = userObj?.fullName || member.user?.fullName || 'Channel Member'
        const email = userObj?.email || member.user?.email || ''
        const profileImage = userObj?.profileImage || member.user?.profileImage
        const isYou = Boolean(currentUserId && userIdStr === currentUserId)

        return { userIdStr, fullName, email, profileImage, isYou }
    }

    // Filter members
    const filteredMembers = members.filter((member) => {
        const { fullName, email, userIdStr } = getUserData(member)

        // Quick Tab filter
        if (quickTab === 'owners' && member.role !== 'owner' && member.role !== 'moderator') return false
        if (quickTab === 'members' && member.role !== 'member') return false
        if (quickTab === 'guests' && member.role !== 'guest') return false

        // Dropdown filter
        const matchesRole = roleFilter === 'all' || member.role === roleFilter

        // Text search
        const query = searchQuery.toLowerCase().trim()
        const matchesSearch = !query || fullName.toLowerCase().includes(query) || email.toLowerCase().includes(query) || userIdStr.toLowerCase().includes(query)

        return matchesRole && matchesSearch
    })

    const counts = {
        all: members.length,
        owners: members.filter(m => m.role === 'owner' || m.role === 'moderator').length,
        members: members.filter(m => m.role === 'member').length,
        guests: members.filter(m => m.role === 'guest').length
    }

    return (
        <div style={{
            background: '#161722',
            border: '1px solid rgba(91, 95, 199, 0.3)',
            borderRadius: 14,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '20px 22px'
        }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #5b5fc7 0%, #444791 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(91, 95, 199, 0.35)',
                        fontSize: '1.1rem'
                    }}>
                        💬
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                                Channel Members
                            </h3>
                            <span style={{
                                fontSize: '0.72rem',
                                background: 'rgba(91, 95, 199, 0.2)',
                                color: '#93c5fd',
                                border: '1px solid rgba(91, 95, 199, 0.4)',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 700
                            }}>
                                {members.length} Total
                            </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#9d9fb8', margin: '2px 0 0' }}>
                            Manage channel access permissions and conversation roles.
                        </p>
                    </div>
                </div>

                {onInviteClick && (
                    <button
                        type="button"
                        onClick={onInviteClick}
                        style={{
                            background: 'linear-gradient(135deg, #5b5fc7 0%, #444791 100%)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 12px rgba(91, 95, 199, 0.35)'
                        }}
                    >
                        <span>+</span>
                        <span>Add Member</span>
                    </button>
                )}
            </div>

            {/* Quick Filter Tabs & Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14 }}>
                {/* Quick Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { id: 'all', label: 'All Members', count: counts.all },
                        { id: 'owners', label: 'Owners & Mods', count: counts.owners },
                        { id: 'members', label: 'Members', count: counts.members },
                        { id: 'guests', label: 'Guests', count: counts.guests }
                    ].map(tab => {
                        const isActive = quickTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setQuickTab(tab.id as any)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    border: isActive ? '1px solid #5b5fc7' : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: isActive ? 'rgba(91, 95, 199, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                    color: isActive ? '#fff' : '#a1a4c9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span>{tab.label}</span>
                                <span style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 5px',
                                    borderRadius: 10,
                                    background: isActive ? '#5b5fc7' : 'rgba(255, 255, 255, 0.08)',
                                    color: '#fff'
                                }}>
                                    {tab.count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Search & Role Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: 200 }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#7a7e9d', pointerEvents: 'none' }}>
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#101118',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 8,
                                padding: '7px 12px 7px 30px',
                                fontSize: '0.78rem',
                                color: '#fff',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            background: '#101118',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 8,
                            padding: '7px 12px',
                            fontSize: '0.78rem',
                            color: '#fff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Roles</option>
                        <option value="owner">Owner</option>
                        <option value="moderator">Moderator</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, background: '#11121a' }}>
                <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#9da0bd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member Name</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#9da0bd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Channel Role</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#9da0bd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Joined Date</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#9da0bd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#7a7e9d' }}>
                                    <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>👥</div>
                                    <div style={{ fontWeight: 600, color: '#c5c7d8' }}>No channel members found</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6e728e', marginTop: 2 }}>Try changing your search query or role filter.</div>
                                </td>
                            </tr>
                        ) : (
                            filteredMembers.map((member) => {
                                const { userIdStr, fullName, email, profileImage, isYou } = getUserData(member)
                                const joinedStr = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Active'
                                const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.member

                                return (
                                    <tr
                                        key={userIdStr}
                                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Avatar + Full Name + Email */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                {profileImage ? (
                                                    <img
                                                        src={profileImage}
                                                        alt={fullName}
                                                        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 34,
                                                        height: 34,
                                                        minWidth: 34,
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #5b5fc7 0%, #8b5cf6 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 800,
                                                        fontSize: '0.78rem',
                                                        color: '#fff',
                                                        boxShadow: '0 2px 8px rgba(91, 95, 199, 0.3)'
                                                    }}>
                                                        {(fullName.length > 0 && fullName !== 'Channel Member' ? fullName.slice(0, 2) : 'MO').toUpperCase()}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.84rem' }}>
                                                            {fullName}
                                                        </span>
                                                        {isYou && (
                                                            <span style={{
                                                                background: 'rgba(91, 95, 199, 0.2)',
                                                                color: '#93c5fd',
                                                                border: '1px solid rgba(91, 95, 199, 0.4)',
                                                                fontSize: '0.625rem',
                                                                padding: '1px 5px',
                                                                borderRadius: 4,
                                                                fontWeight: 700
                                                            }}>
                                                                You
                                                            </span>
                                                        )}
                                                        {member.role === 'owner' && (
                                                            <span style={{
                                                                background: 'rgba(245, 158, 11, 0.15)',
                                                                color: '#fbbf24',
                                                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                                                fontSize: '0.625rem',
                                                                padding: '1px 5px',
                                                                borderRadius: 4,
                                                                fontWeight: 700
                                                            }}>
                                                                OWNER
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', color: email ? '#8a8da8' : '#5a5d74', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {email || 'Collaborator'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role Selector / Badge */}
                                        <td style={{ padding: '12px 16px' }}>
                                            {onRoleChange && member.role !== 'owner' ? (
                                                <select
                                                    value={member.role}
                                                    onChange={async (e) => {
                                                        await onRoleChange(userIdStr, e.target.value as Exclude<ChannelRole, 'owner'>)
                                                    }}
                                                    style={{
                                                        background: roleStyle.bg,
                                                        color: roleStyle.text,
                                                        border: `1px solid ${roleStyle.border}`,
                                                        borderRadius: 6,
                                                        padding: '3px 8px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="moderator" style={{ background: '#161722', color: '#c084fc' }}>Moderator</option>
                                                    <option value="member" style={{ background: '#161722', color: '#60a5fa' }}>Member</option>
                                                    <option value="guest" style={{ background: '#161722', color: '#94a3b8' }}>Guest</option>
                                                </select>
                                            ) : (
                                                <span style={{
                                                    background: roleStyle.bg,
                                                    color: roleStyle.text,
                                                    border: `1px solid ${roleStyle.border}`,
                                                    borderRadius: 6,
                                                    padding: '3px 8px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.02em',
                                                    display: 'inline-block'
                                                }}>
                                                    {member.role}
                                                </span>
                                            )}
                                        </td>

                                        {/* Joined Date */}
                                        <td style={{ padding: '12px 16px', color: '#8a8da8', fontSize: '0.75rem' }}>
                                            {joinedStr}
                                        </td>

                                        {/* Actions Column with MS Teams 3-Dots Dropdown */}
                                        <td style={{ padding: '12px 16px', textAlign: 'right', position: 'relative' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
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
                                                        👑 Channel Owner
                                                    </span>
                                                )}

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
                                                            fontWeight: 700
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
                                                            {email && (
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
                                                                        textAlign: 'left'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <span>📧</span>
                                                                    <span>{copiedUserId === `email-${userIdStr}` ? '✓ Copied Email' : 'Copy Email'}</span>
                                                                </button>
                                                            )}

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
                                                                    textAlign: 'left'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                <span>📋</span>
                                                                <span>{copiedUserId === `id-${userIdStr}` ? '✓ Copied ID' : 'Copy User ID'}</span>
                                                            </button>

                                                            {onRoleChange && member.role !== 'owner' && (
                                                                <>
                                                                    <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '3px 0' }} />
                                                                    {member.role !== 'moderator' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                await onRoleChange(userIdStr, 'moderator')
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
                                                                            <span>Set as Moderator</span>
                                                                        </button>
                                                                    )}
                                                                    {member.role !== 'member' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                await onRoleChange(userIdStr, 'member')
                                                                                setOpenMenuUserId(null)
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '6px 10px',
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: '#60a5fa',
                                                                                fontSize: '0.75rem',
                                                                                borderRadius: 6,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 8,
                                                                                textAlign: 'left'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <span>👤</span>
                                                                            <span>Set as Member</span>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {onRemove && userIdStr !== currentUserId && member.role !== 'owner' && (
                                                                <>
                                                                    <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '3px 0' }} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            setOpenMenuUserId(null)
                                                                            if (confirm(`Remove ${fullName} from this channel?`)) {
                                                                                await onRemove(userIdStr)
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

            {/* Footer Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#8a8da8', paddingTop: 4 }}>
                <span>Showing {filteredMembers.length} of {members.length} members loaded</span>
            </div>
        </div>
    )
}
