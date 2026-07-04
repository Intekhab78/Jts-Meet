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
                borderRadius: '12px',
                padding: '12px 16px',
                transition: 'all 200ms ease-in-out',
                cursor: 'pointer',
                border: isActive ? '1px solid #6366F1' : '1px solid rgba(255, 255, 255, 0.06)',
                background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                color: isActive ? '#fff' : '#A1A1AA',
                boxShadow: isActive ? '0 4px 15px rgba(99, 102, 241, 0.12)' : 'none',
                outline: 'none',
                display: 'block'
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.color = '#A1A1AA';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }
            }}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0" style={{ width: '100%' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: isActive ? '#6366F1' : '#6B7280', fontWeight: 800 }}>#</span>
                        {channel.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                            background: channel.type === 'public' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                            color: channel.type === 'public' ? '#22C55E' : '#8B5CF6',
                            border: channel.type === 'public' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                        }}>
                            {channel.type}
                        </span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>{channel.status}</span>
                        {channel.archived && (
                            <>
                                <span>•</span>
                                <span style={{ color: '#F59E0B', fontWeight: 600 }}>Archived</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </button>
    )
}

