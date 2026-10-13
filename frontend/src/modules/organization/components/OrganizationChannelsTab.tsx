import React from 'react'
import type { Channel } from '../../channel/channel.types'
import { IconHash } from '../../../components/common/Icons'

interface OrganizationChannelsTabProps {
    channels: (Channel & { teamName?: string })[]
}

export function OrganizationChannelsTab({ channels }: OrganizationChannelsTabProps) {
    return (
        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Organization Channels & Chat Streams</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                        {channels.length} Total
                    </span>
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    Persistent chat rooms, topic threads, and announcement channels across all departments.
                </p>
            </div>

            {channels.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <IconHash size={36} color="#818cf8" strokeWidth={1.5} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>No channels found in this organization</div>
                    <p style={{ fontSize: '0.75rem', margin: '4px 0 12px' }}>Channels are hosted within departments. Open a department to create channels.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
                    <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Channel Name</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Department</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Type</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Members</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map((ch) => (
                                <tr key={ch._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/2">
                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.85rem' }}>#</span>
                                            <div>
                                                <span style={{ fontWeight: 600, color: '#fff' }}>{ch.name}</span>
                                                {ch.description && (
                                                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                                        {ch.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 14px', color: '#e4e4e7', fontWeight: 500 }}>
                                        {ch.teamName || 'General'}
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: ch.type === 'public' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                            color: ch.type === 'public' ? '#4ade80' : '#fbbf24',
                                            textTransform: 'uppercase'
                                        }}>
                                            {ch.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                        {ch.members?.length || 0} participants
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                window.location.hash = '#channel'
                                            }}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                                borderRadius: 6,
                                                color: '#4ade80',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Open Chat →
                                        </button>
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
