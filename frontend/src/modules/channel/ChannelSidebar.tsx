import React, { useState } from 'react'
import type { Channel } from './channel.types'
import { ChannelCard } from './ChannelCard'

interface ChannelSidebarProps {
    channels: Channel[]
    selectedChannelId?: string
    onSelectChannel: (channelId: string) => void
    onCreateClick?: () => void
}

export function ChannelSidebar({ channels, selectedChannelId, onSelectChannel, onCreateClick }: ChannelSidebarProps) {
    const [search, setSearch] = useState('')

    const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase().trim()))

    return (
        <div className="glass-card" style={{
            padding: '12px 14px',
            borderRadius: 12,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Channels ({channels.length})
                    </span>
                </div>
                {onCreateClick && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#818cf8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                        }}
                        title="Create new channel"
                    >
                        <span>+</span>
                        <span>New</span>
                    </button>
                )}
            </div>

            {channels.length > 4 && (
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
                            left: 8,
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
                        placeholder="Search channels..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 6,
                            padding: '4px 8px 4px 28px',
                            fontSize: '0.75rem',
                            color: '#fff',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '12px 0', textAlign: 'center' }}>
                        {search ? 'No matching channels' : 'No channels created yet.'}
                    </div>
                ) : (
                    filtered.map((channel) => (
                        <ChannelCard
                            key={channel._id}
                            channel={channel}
                            isActive={selectedChannelId === channel._id}
                            onSelect={onSelectChannel}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
