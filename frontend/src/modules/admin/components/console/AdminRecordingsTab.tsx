import React from 'react'
import type { StorageMetrics, RecordingItem } from '../../adminConsole.types'
import { resolveRecordingUrl, formatBytes } from '../../adminConsole.types'
import {
    IconVideo,
    IconDownload,
    IconTrash
} from '../../../../components/common/Icons'

interface AdminRecordingsTabProps {
    storageMetrics: StorageMetrics
    selectedRetentionDays: number
    setSelectedRetentionDays: (d: number) => void
    updatingRetention: boolean
    onSaveRetentionPolicy: () => void
    recordings: RecordingItem[]
    recordingsLoading: boolean
    onPlayVideo: (rec: RecordingItem) => void
    onDeleteRecording: (rec: RecordingItem) => void
}

export function AdminRecordingsTab({
    storageMetrics,
    selectedRetentionDays,
    setSelectedRetentionDays,
    updatingRetention,
    onSaveRetentionPolicy,
    recordings,
    recordingsLoading,
    onPlayVideo,
    onDeleteRecording
}: AdminRecordingsTabProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Storage Meter & Policy Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 14
            }}>
                {/* Storage Quota Card */}
                <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 14, border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase' }}>
                            Organization Cloud Storage
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                            Healthy Quota
                        </span>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                            {storageMetrics.usedGb} GB
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            / {storageMetrics.totalQuotaGb} GB allocated
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 8, width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.max(5, storageMetrics.percentage)}%`,
                            background: 'linear-gradient(90deg, #22c55e, #6366f1)',
                            borderRadius: 4
                        }} />
                    </div>

                    <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{storageMetrics.percentage}% capacity utilized</span>
                        <span>{storageMetrics.cloudProvider}</span>
                    </div>
                </div>

                {/* Retention Policy Card */}
                <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                        Auto-Retention Policy
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 12px' }}>
                        Automatically manage cloud storage lifecycle to comply with enterprise data security guidelines.
                    </p>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {[
                            { days: 30, label: '30 Days' },
                            { days: 60, label: '60 Days' },
                            { days: 90, label: '90 Days' },
                            { days: 0, label: 'Unlimited / Forever' }
                        ].map(option => (
                            <button
                                key={option.days}
                                type="button"
                                onClick={() => setSelectedRetentionDays(option.days)}
                                style={{
                                    background: selectedRetentionDays === option.days ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                    border: selectedRetentionDays === option.days ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                    color: selectedRetentionDays === option.days ? '#fff' : '#d1d5db',
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={onSaveRetentionPolicy}
                        disabled={updatingRetention}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {updatingRetention ? 'Saving...' : 'Update Policy'}
                    </button>
                </div>
            </div>

            {/* Recordings Table / Vault */}
            <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                            Organization Conference Recordings ({recordings.length})
                        </h3>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                            All recorded sessions across departments stored with encrypted DTLS-SRTP playback.
                        </p>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Session Topic</th>
                                <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Host</th>
                                <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Recorded Date</th>
                                <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Duration</th>
                                <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>File Size</th>
                                <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recordingsLoading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        Loading recording assets...
                                    </td>
                                </tr>
                            ) : recordings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No cloud recordings found in this workspace.
                                    </td>
                                </tr>
                            ) : (
                                recordings.map((rec) => (
                                    <tr key={rec._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#f87171',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <IconVideo size={14} color="#f87171" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#fff' }}>{rec.title}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                                        ID: {rec.meetingId}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#d1d5db' }}>
                                            {(rec.host as any)?.fullName || 'Host'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                                            {(rec as any).createdAtFormatted || new Date(rec.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#c4b5fd' }}>
                                            {rec.duration}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#86efac' }}>
                                            {(rec as any).fileSizeDisplay || formatBytes(rec.sizeBytes)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => onPlayVideo(rec)}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                        border: 'none',
                                                        color: '#fff',
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                        <polygon points="5 3 19 12 5 21 5 3"/>
                                                    </svg>
                                                    <span>Play</span>
                                                </button>
                                                <a
                                                    href={resolveRecordingUrl(rec.recordingUrl)}
                                                    download={`${rec.title}.mp4`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: '#e2e8f0',
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        fontSize: '0.72rem',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <IconDownload size={11} color="#e2e8f0" />
                                                    <span>MP4</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteRecording(rec)}
                                                    title="Delete Recording Asset"
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                        color: '#f87171',
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        fontSize: '0.72rem',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <IconTrash size={13} color="#f87171" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
