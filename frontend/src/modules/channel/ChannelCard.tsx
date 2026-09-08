import React from 'react'
import type { Channel } from './channel.types'

interface ChannelCardProps {
    channel: Channel
    isActive?: boolean
    onSelect: (channelId: string) => void
}

export function ChannelCard({ channel, isActive, onSelect }: ChannelCardProps) {
    return (
        <button
            type="button"
            onClick={() => onSelect(channel._id)}
            style={{
                width: '100%',
                textAlign: 'left',
                borderRadius: 8,
                padding: '8px 12px',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                border: isActive ? '1px solid #6366F1' : '1px solid rgba(255, 255, 255, 0.05)',
                background: isActive ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.15)' : 'none',
                outline: 'none',
                display: 'block'
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: isActive ? '#818cf8' : '#6B7280', fontWeight: 800, fontSize: '0.85rem' }}>#</span>
                    <span style={{ fontWeight: isActive ? 700 : 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {channel.name}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{
                        background: channel.type === 'public' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                        color: channel.type === 'public' ? '#4ade80' : '#c084fc',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                        textTransform: 'uppercase'
                    }}>
                        {channel.type}
                    </span>
                    {channel.archived && (
                        <span style={{ fontSize: '0.625rem', color: '#fbbf24', fontWeight: 600 }}>Archived</span>
                    )}
                </div>
            </div>
        </button>
    )
}
