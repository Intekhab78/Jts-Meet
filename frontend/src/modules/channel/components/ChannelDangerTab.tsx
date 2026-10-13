import React from 'react'
import type { Channel } from '../channel.types'

interface ChannelDangerTabProps {
    selectedChannel: Channel
    handleArchiveChannel: () => void
    handleRestoreChannel: () => void
    handleDeleteChannel: () => void
}

export const ChannelDangerTab: React.FC<ChannelDangerTabProps> = ({
    selectedChannel,
    handleArchiveChannel,
    handleRestoreChannel,
    handleDeleteChannel
}) => {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Archive or Restore Channel</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>Archiving makes the channel read-only while keeping message history intact.</div>
                </div>
                {selectedChannel.archived ? (
                    <button
                        onClick={handleRestoreChannel}
                        className="btn btn-success"
                        style={{ height: 30, borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)', border: 'none', cursor: 'pointer' }}
                    >
                        Restore Channel
                    </button>
                ) : (
                    <button
                        onClick={handleArchiveChannel}
                        className="btn btn-secondary"
                        style={{ height: 30, borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer' }}
                    >
                        Archive Channel
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444' }}>Delete Channel Permanently</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>Completely purge #{selectedChannel.name}, shared files, and all chat records.</div>
                </div>
                <button
                    onClick={() => {
                        if (confirm('Delete this channel? This will delete all chat history permanently.')) {
                            handleDeleteChannel()
                        }
                    }}
                    className="btn btn-danger"
                    style={{ height: 30, borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', border: 'none', cursor: 'pointer' }}
                >
                    Delete Channel
                </button>
            </div>
        </div>
    )
}
