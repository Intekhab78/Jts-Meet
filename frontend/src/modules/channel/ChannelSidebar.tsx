import React from 'react'
import type { Channel } from './channel.types'
import { ChannelCard } from './ChannelCard'

interface ChannelSidebarProps {
    channels: Channel[]
    selectedChannelId?: string
    onSelectChannel: (channelId: string) => void
}

export function ChannelSidebar({ channels, selectedChannelId, onSelectChannel }: ChannelSidebarProps) {
    return (
        <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '18px',
            padding: '20px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <h3 style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.4)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
            }}>
                Channels
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {channels.length === 0 ? (
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.3)', padding: '8px 0' }}>No channels yet.</div>
                ) : (
                    channels.map((channel) => (
                        <ChannelCard key={channel._id} channel={channel} isActive={selectedChannelId === channel._id} onSelect={onSelectChannel} />
                    ))
                )}
            </div>
        </div>
    )
}

