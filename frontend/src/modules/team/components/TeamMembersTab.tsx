import React from 'react'
import type { Team } from '../team.types'
import {
    IconCrown, IconShield, IconUser, IconUsers,
    IconSearch, IconX, IconMessage, IconTrash
} from '../../../components/common/Icons'

export interface FilteredMemberItem {
    userId: string
    fullName: string
    email: string
    role: string
    joinedAt?: string
    isSelf: boolean
}

interface TeamMembersTabProps {
    selectedTeam: Team
    filteredTeamMembers: FilteredMemberItem[]
    roleFilter: 'all' | 'owner' | 'admin' | 'member' | 'guest'
    setRoleFilter: (r: 'all' | 'owner' | 'admin' | 'member' | 'guest') => void
    roleStats: { owners: number; admins: number; members: number; guests: number }
    memberSearchQuery: string
    setMemberSearchQuery: (q: string) => void
    onUpdateMemberRole: (userId: string, role: Exclude<Team['members'][number]['role'], 'owner'>) => void
    onRemoveMember: (userId: string, memberName: string) => void
}

export function TeamMembersTab({
    selectedTeam,
    filteredTeamMembers,
    roleFilter,
    setRoleFilter,
    roleStats,
    memberSearchQuery,
    setMemberSearchQuery,
    onUpdateMemberRole,
    onRemoveMember
}: TeamMembersTabProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Role Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { id: 'all', label: 'All', count: selectedTeam.members.length, icon: null },
                        { id: 'owner', label: 'Owners', count: roleStats.owners, icon: <IconCrown size={12} /> },
                        { id: 'admin', label: 'Admins', count: roleStats.admins, icon: <IconShield size={12} /> },
                        { id: 'member', label: 'Members', count: roleStats.members, icon: <IconUser size={12} /> },
                        { id: 'guest', label: 'Guests', count: roleStats.guests, icon: <IconUsers size={12} /> }
                    ].map((r) => {
                        const isSelected = roleFilter === r.id
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setRoleFilter(r.id as any)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 20,
                                    fontSize: '0.75rem',
                                    fontWeight: isSelected ? 600 : 500,
                                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                                    color: isSelected ? '#e0e7ff' : '#a1a1aa',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                {r.icon && <span style={{ opacity: isSelected ? 1 : 0.7 }}>{r.icon}</span>}
                                <span>{r.label}</span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    opacity: isSelected ? 1 : 0.7,
                                    padding: '1px 6px',
                                    borderRadius: 10,
                                    background: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.06)'
                                }}>
                                    {r.count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Search Box */}
                <div style={{ position: 'relative', width: 'clamp(220px, 32vw, 320px)' }}>
                    <div style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#71717a',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <IconSearch size={14} />
                    </div>
                    <input
                        type="text"
                        placeholder="Filter members by name or email..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            paddingLeft: 34,
                            paddingRight: memberSearchQuery ? 30 : 12,
                            height: 34,
                            fontSize: '0.8rem',
                            borderRadius: 8,
                            boxSizing: 'border-box',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            outline: 'none',
                            transition: 'all 0.15s ease'
                        }}
                    />
                    {memberSearchQuery && (
                        <button
                            type="button"
                            onClick={() => setMemberSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#a1a1aa',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 4,
                                borderRadius: 4
                            }}
                        >
                            <IconX size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* High-density SaaS Members Table */}
            <div style={{
                background: 'rgba(15, 17, 24, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <th style={{ padding: '12px 18px', fontWeight: 600, color: '#71717a', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Member Name</th>
                            <th style={{ padding: '12px 18px', fontWeight: 600, color: '#71717a', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</th>
                            <th style={{ padding: '12px 18px', fontWeight: 600, color: '#71717a', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Team Role</th>
                            <th style={{ padding: '12px 18px', fontWeight: 600, color: '#71717a', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeamMembers.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                                    No team members match your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredTeamMembers.map((m) => {
                                return (
                                    <tr
                                        key={m.userId}
                                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 120ms' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Full Name & Avatar */}
                                        <td style={{ padding: '12px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 10,
                                                    background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'}80 0%, ${selectedTeam.color || '#6366F1'} 100%)`,
                                                    color: '#fff',
                                                    border: '1px solid rgba(255, 255, 255, 0.12)',
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
                                                    <div style={{ fontWeight: 600, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span>{m.fullName}</span>
                                                        {m.isSelf && (
                                                            <span style={{
                                                                fontSize: '0.6rem',
                                                                fontWeight: 600,
                                                                padding: '1px 6px',
                                                                borderRadius: 4,
                                                                background: 'rgba(99, 102, 241, 0.2)',
                                                                color: '#a5b4fc',
                                                                border: '1px solid rgba(99, 102, 241, 0.3)'
                                                            }}>You</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email Address */}
                                        <td style={{ padding: '12px 18px', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                            {m.email}
                                        </td>

                                        {/* Role */}
                                        <td style={{ padding: '12px 18px' }}>
                                            {m.role === 'owner' || m.userId === selectedTeam.ownerId ? (
                                                <span style={{
                                                    background: 'rgba(168, 85, 247, 0.12)',
                                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                                    color: '#d8b4fe',
                                                    padding: '4px 10px',
                                                    borderRadius: 7,
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    letterSpacing: '0.02em'
                                                }}>
                                                    <span><IconCrown size={12} /></span>
                                                    <span>OWNER</span>
                                                </span>
                                            ) : m.isSelf ? (
                                                <span style={{
                                                    background: 'rgba(56, 189, 248, 0.12)',
                                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                                    color: '#7dd3fc',
                                                    padding: '4px 10px',
                                                    borderRadius: 7,
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    letterSpacing: '0.02em'
                                                }}>
                                                    <span><IconShield size={12} /></span>
                                                    <span>{m.role.toUpperCase()}</span>
                                                </span>
                                            ) : (
                                                <select
                                                    value={m.role}
                                                    onChange={(e) => onUpdateMemberRole(m.userId, e.target.value as any)}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.14)',
                                                        color: '#f4f4f5',
                                                        padding: '5px 12px',
                                                        borderRadius: 7,
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)'
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)'
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                                    }}
                                                >
                                                    <option value="admin" style={{ background: '#18181b', color: '#fff' }}>Admin</option>
                                                    <option value="member" style={{ background: '#18181b', color: '#fff' }}>Member</option>
                                                    <option value="guest" style={{ background: '#18181b', color: '#fff' }}>Guest</option>
                                                </select>
                                            )}
                                        </td>

                                        {/* Actions (Icon-only buttons) */}
                                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                {/* Chat Button (Icon Only) */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        window.location.hash = '#chat'
                                                    }}
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 8,
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: '#818cf8',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)'
                                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                                                        e.currentTarget.style.color = '#c7d2fe'
                                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                                                        e.currentTarget.style.color = '#818cf8'
                                                        e.currentTarget.style.transform = 'none'
                                                    }}
                                                    title={`Chat with ${m.fullName}`}
                                                    aria-label={`Chat with ${m.fullName}`}
                                                >
                                                    <IconMessage size={15} />
                                                </button>

                                                {/* Remove Button (Icon Only, Hidden for self and owner) */}
                                                {!m.isSelf && m.role !== 'owner' && m.userId !== selectedTeam.ownerId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveMember(m.userId, m.fullName)}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 8,
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                                            color: '#f87171',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'
                                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)'
                                                            e.currentTarget.style.color = '#fca5a5'
                                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'
                                                            e.currentTarget.style.color = '#f87171'
                                                            e.currentTarget.style.transform = 'none'
                                                        }}
                                                        title={`Remove ${m.fullName} from team`}
                                                        aria-label={`Remove ${m.fullName}`}
                                                    >
                                                        <IconTrash size={14} />
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
    )
}
