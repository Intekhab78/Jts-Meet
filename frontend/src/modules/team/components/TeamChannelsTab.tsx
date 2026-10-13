import React from 'react'
import type { Team } from '../team.types'
import type { Channel } from '../../channel/channel.types'
import { IconHash, IconLock, IconPlus } from '../../../components/common/Icons'

interface TeamChannelsTabProps {
    teamChannels: Channel[]
    selectedTeam: Team
    loadingChannels: boolean
    isOwnerOrAdmin: boolean
    onOpenCreateChannel: () => void
    onOpenChannel: (channel: Channel) => void
    onDeleteChannel: (channelId: string, channelName: string) => void
}

export function TeamChannelsTab({
    teamChannels,
    selectedTeam,
    loadingChannels,
    isOwnerOrAdmin,
    onOpenCreateChannel,
    onOpenChannel,
    onDeleteChannel
}: TeamChannelsTabProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                        Team Channels
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Channels are dedicated spaces where team members hold discussions and share updates.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onOpenCreateChannel}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, borderRadius: 8 }}
                >
                    + Create Channel
                </button>
            </div>

            {loadingChannels ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Loading channels...
                </div>
            ) : teamChannels.length === 0 ? (
                <div className="glass-card" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconHash size={28} color="#818cf8" />
                    </div>
                    <p style={{ margin: '4px 0 10px', fontSize: '0.85rem' }}>No channels created yet for this team.</p>
                    <button
                        type="button"
                        onClick={onOpenCreateChannel}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <IconPlus size={13} /> Create First Channel
                    </button>
                </div>
            ) : (
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 12,
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Channel Name</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Description</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamChannels.map((c) => (
                                <tr
                                    key={c._id}
                                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 120ms' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '0.9rem', color: selectedTeam.color || '#6366F1', display: 'flex', alignItems: 'center' }}>
                                                {c.type === 'private' ? <IconLock size={14} /> : <IconHash size={14} />}
                                            </span>
                                            <span>{c.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className={`badge ${c.type === 'private' ? 'badge-accent' : 'badge-success'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                            {c.type === 'private' ? 'Private' : 'Standard'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '0.78rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.description || 'General discussions and updates.'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                            <button
                                                type="button"
                                                onClick={() => onOpenChannel(c)}
                                                className="btn btn-secondary"
                                                style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <IconHash size={12} /> Open
                                            </button>
                                            {isOwnerOrAdmin && c.name.toLowerCase() !== 'general' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteChannel(c._id, c.name)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#f87171',
                                                        cursor: 'pointer',
                                                        fontSize: '0.72rem',
                                                        padding: '4px 6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
