import React from 'react'
import type { Team } from '../team.types'
import { IconUsers, IconGlobe, IconLock, IconX } from '../../../components/common/Icons'

interface TeamDirectorySidebarProps {
    teams: Team[]
    filteredTeams: Team[]
    selectedTeam: Team | null
    searchQuery: string
    setSearchQuery: (q: string) => void
    filterCategory: 'all' | 'my' | 'public' | 'private'
    setFilterCategory: (cat: 'all' | 'my' | 'public' | 'private') => void
    onSelectTeam: (teamId: string) => void
    onOpenCreateModal: () => void
    organizationId: string
    isOrgAdminOrOwner: boolean
}

export function TeamDirectorySidebar({
    teams,
    filteredTeams,
    selectedTeam,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    onSelectTeam,
    onOpenCreateModal,
    organizationId,
    isOrgAdminOrOwner
}: TeamDirectorySidebarProps) {
    return (
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
                    onClick={onOpenCreateModal}
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
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.7rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <IconX size={11} />
                        </button>
                    )}
                </div>

                {/* Quick Filter Pills */}
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                    {[
                        { id: 'all', label: 'All', icon: null },
                        { id: 'my', label: 'My Teams', icon: null },
                        { id: 'public', label: 'Public', icon: <IconGlobe size={11} /> },
                        { id: 'private', label: 'Private', icon: <IconLock size={11} /> }
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
                                transition: 'all 0.12s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            {cat.icon}
                            <span>{cat.label}</span>
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
                                onClick={() => onSelectTeam(team._id)}
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
                                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                <IconUsers size={11} /> {team.members.length}
                                            </span>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                {team.visibility === 'public' ? (
                                                    <><IconGlobe size={11} /> Public</>
                                                ) : (
                                                    <><IconLock size={11} /> Private</>
                                                )}
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
                    <IconGlobe size={13} color="#818cf8" />
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
    )
}
