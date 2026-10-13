import React from 'react'
import type { Channel } from '../channel.types'

interface ChannelInfoTabProps {
    selectedChannel: Channel
    currentTeamName?: string
    messageCount: number
    fileCount: number
}

export function ChannelInfoTab({
    selectedChannel,
    currentTeamName,
    messageCount,
    fileCount
}: ChannelInfoTabProps) {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div className="glass-card" style={{ padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                    Channel Specification
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Channel Name:</span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>#{selectedChannel.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Department:</span>
                        <span style={{ fontWeight: 600, color: '#818cf8' }}>{currentTeamName || 'Department'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Access Type:</span>
                        <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{selectedChannel.type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                        <span style={{ fontWeight: 600, color: selectedChannel.archived ? '#fbbf24' : '#4ade80', textTransform: 'capitalize' }}>
                            {selectedChannel.archived ? 'Archived (Read Only)' : selectedChannel.status}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Total Messages:</span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{messageCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Shared Files:</span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{fileCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Created:</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{new Date(selectedChannel.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                    Topic & Mission
                </h4>
                <p style={{ fontSize: '0.8125rem', color: '#d1d5db', lineHeight: 1.5, margin: 0 }}>
                    {selectedChannel.description || 'No description has been added for this channel yet. Use the Edit button in the header toolbar to configure topics and team objectives.'}
                </p>
            </div>
        </div>
    )
}
