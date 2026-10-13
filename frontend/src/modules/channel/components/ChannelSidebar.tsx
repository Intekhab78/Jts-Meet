import React from 'react'
import type { Channel } from '../channel.types'
import { IconLock } from '../../../components/common/Icons'

interface ChannelSidebarProps {
    isCollapsed: boolean
    currentTeam?: any
    teams: any[]
    teamId?: string
    onSelectTeam?: (teamId: string) => void
    channels: Channel[]
    filteredChannels: Channel[]
    selectedChannelId?: string
    channelSearch: string
    setChannelSearch: (query: string) => void
    unreadChannelCounts: Record<string, number>
    onSelectChannel: (channelId: string) => void
    onCreateChannelClick: () => void
    onToggleCollapse: () => void
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
    isCollapsed,
    currentTeam,
    teams,
    teamId,
    onSelectTeam,
    channels,
    filteredChannels,
    selectedChannelId,
    channelSearch,
    setChannelSearch,
    unreadChannelCounts,
    onSelectChannel,
    onCreateChannelClick,
    onToggleCollapse
}) => {
    return (
        <div
            style={{
                width: isCollapsed ? 0 : 250,
                minWidth: isCollapsed ? 0 : 250,
                maxWidth: isCollapsed ? 0 : 250,
                borderRight: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.015)',
                overflow: 'hidden',
                transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.22s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                flexShrink: 0
            }}
        >
            <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.015)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: 5,
                            background: currentTeam?.color ? `${currentTeam.color}30` : 'rgba(99, 102, 241, 0.25)',
                            border: `1px solid ${currentTeam?.color || '#6366F1'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 800, color: currentTeam?.color || '#6366F1'
                        }}>
                            {currentTeam?.name ? currentTeam.name.slice(0, 2).toUpperCase() : 'DE'}
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentTeam?.name || 'Department'}
                        </span>
                    </div>

                    {teams.length > 1 && onSelectTeam && (
                        <select
                            value={teamId}
                            onChange={(e) => onSelectTeam(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 6,
                                padding: '2px 6px',
                                fontSize: '0.65rem',
                                color: '#818cf8',
                                outline: 'none',
                                cursor: 'pointer',
                                maxWidth: 90
                            }}
                            title="Switch Department"
                        >
                            {teams.map(t => (
                                <option key={t._id} value={t._id} style={{ background: '#18181b', color: '#fff' }}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Channels ({channels.length})
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            type="button"
                            onClick={onCreateChannelClick}
                            style={{
                                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                border: 'none',
                                borderRadius: 6,
                                padding: '3px 9px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                            }}
                            title="Create new channel"
                        >
                            <span>+</span>
                            <span>New</span>
                        </button>
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 6,
                                padding: '3px 6px',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                            }}
                            title="Collapse channels sidebar"
                            aria-label="Collapse channels sidebar"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                                e.currentTarget.style.color = '#fff'
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                e.currentTarget.style.color = 'var(--color-text-muted)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="m14 9-3 3 3 3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            {channels.length > 2 && (
                <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                position: 'absolute',
                                left: 9,
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
                            placeholder="Filter channels..."
                            value={channelSearch}
                            onChange={(e) => setChannelSearch(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 6,
                                padding: '5px 8px 5px 28px',
                                fontSize: '0.75rem',
                                color: '#fff',
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Channel Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 3, scrollbarWidth: 'thin' }}>
                {filteredChannels.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '16px 8px', textAlign: 'center' }}>
                        {channelSearch ? 'No matching channel' : 'No channels in this department'}
                    </div>
                ) : (
                    filteredChannels.map((channel) => {
                        const isActive = selectedChannelId === channel._id
                        return (
                            <button
                                key={channel._id}
                                type="button"
                                onClick={() => onSelectChannel(channel._id)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    borderRadius: 7,
                                    padding: '8px 10px',
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer',
                                    border: isActive ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid transparent',
                                    background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                                    color: isActive ? '#fff' : '#a1a1aa',
                                    outline: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 6
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    {channel.type === 'private' ? (
                                        <IconLock size={13} color={isActive ? '#c084fc' : '#a1a1aa'} style={{ flexShrink: 0 }} />
                                    ) : (
                                        <span style={{ color: isActive ? '#818cf8' : '#71717A', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0 }}>#</span>
                                    )}
                                    <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {channel.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    {unreadChannelCounts[channel._id] > 0 && !isActive && (
                                        <span style={{
                                            background: '#6366f1',
                                            color: '#fff',
                                            fontSize: '0.625rem',
                                            fontWeight: 800,
                                            padding: '1px 6px',
                                            borderRadius: 10,
                                            boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)'
                                        }}>
                                            {unreadChannelCounts[channel._id] > 99 ? '99+' : unreadChannelCounts[channel._id]}
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        color: channel.type === 'public' ? '#4ade80' : '#c084fc',
                                        textTransform: 'uppercase',
                                        flexShrink: 0
                                    }}>
                                        {channel.type}
                                    </span>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
