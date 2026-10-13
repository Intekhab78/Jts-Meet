import React from 'react'
import {
    IconVideo,
    IconRefresh,
    IconPlay,
    IconClock,
    IconDownload
} from '../../../../components/common/Icons'

interface DashboardRecordingsVaultProps {
    recordingsList: any[]
    recordingsLoading: boolean
    recordingsError: string | null
    storageMetrics: any
    fetchRecordingsVault: () => Promise<void>
    resolveRecordingUrl: (url?: string) => string
    onSelectRecording: (rec: any) => void
}

export const DashboardRecordingsVault: React.FC<DashboardRecordingsVaultProps> = ({
    recordingsList,
    recordingsLoading,
    recordingsError,
    storageMetrics,
    fetchRecordingsVault,
    resolveRecordingUrl,
    onSelectRecording
}) => {
    return (
        <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconVideo size={18} color="#818cf8" /> Cloud Recordings Vault
                        {!recordingsLoading && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                ({recordingsList.length})
                            </span>
                        )}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Stream and download high-definition conference recordings
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {storageMetrics && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(99, 102, 241, 0.1)', padding: '3px 8px', borderRadius: 9999, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            {storageMetrics.usedGb} GB / {storageMetrics.totalQuotaGb} GB used
                        </span>
                    )}
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '3px 8px', borderRadius: 9999 }}>
                        1080p MP4 Ready
                    </span>
                    <button
                        onClick={fetchRecordingsVault}
                        disabled={recordingsLoading}
                        title="Refresh recordings"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 6,
                            color: '#94a3b8',
                            padding: '5px 7px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <IconRefresh size={14} style={{ animation: recordingsLoading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {/* Storage Usage Bar */}
            {storageMetrics && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                        <span>Storage Utilization</span>
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{storageMetrics.percentage}%</span>
                    </div>
                    <div style={{ width: '100%', height: 5, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${Math.min(100, storageMetrics.percentage)}%`,
                                height: '100%',
                                background: storageMetrics.percentage > 80
                                    ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)'
                                    : 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
                                borderRadius: 3,
                                transition: 'width 0.6s ease'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Loading State */}
            {recordingsLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: 'var(--radius-md)',
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}>
                            <div style={{ height: 110, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite', width: '80%' }} />
                            <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', width: '60%' }} />
                            <div style={{ height: 30, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {!recordingsLoading && recordingsError && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#f87171', fontSize: '0.85rem' }}>
                    ⚠️ {recordingsError} —{' '}
                    <button onClick={fetchRecordingsVault} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                        retry
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!recordingsLoading && !recordingsError && recordingsList.length === 0 && (
                <div style={{ padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'rgba(129, 140, 248, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <IconVideo size={24} color="#818cf8" />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>No cloud recordings yet</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', maxWidth: 300 }}>
                        Start and end a meeting — recordings are automatically archived here for streaming and download.
                    </div>
                </div>
            )}

            {/* Recording Cards */}
            {!recordingsLoading && !recordingsError && recordingsList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {recordingsList.map((rec: any, idx: number) => (
                        <div
                            key={rec._id || rec.id || idx}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 'var(--radius-md)',
                                padding: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {/* Thumbnail / Preview */}
                            <div style={{
                                height: 110,
                                borderRadius: 'var(--radius-sm)',
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer'
                            }} onClick={() => rec.recordingUrl && onSelectRecording(rec)}>
                                {rec.recordingUrl ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectRecording(rec) }}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            backdropFilter: 'blur(8px)',
                                            border: '1px solid rgba(255, 255, 255, 0.4)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'transform 0.15s ease'
                                        }}
                                    >
                                        <IconPlay size={18} />
                                    </button>
                                ) : (
                                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                        <IconVideo size={22} />
                                        <div style={{ marginTop: 4 }}>Processing...</div>
                                    </div>
                                )}
                                <span style={{
                                    position: 'absolute',
                                    bottom: 6,
                                    right: 8,
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <IconClock size={11} /> {rec.duration || '—'}
                                </span>
                                <span style={{
                                    position: 'absolute',
                                    top: 6,
                                    left: 8,
                                    background: 'rgba(239, 68, 68, 0.85)',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em'
                                }}>
                                    ● REC
                                </span>
                            </div>

                            {/* Info */}
                            <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 3px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {rec.title || 'Conference Recording'}
                                </h4>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                    Host: {rec.host?.fullName || 'Organizer'}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <span>{rec.createdAtFormatted || rec.date || '—'}</span>
                                    <span>•</span>
                                    <span>{rec.resolution || '1080p'}</span>
                                    <span>•</span>
                                    <span>{rec.fileSizeDisplay || rec.fileSize || '—'}</span>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                                <button
                                    onClick={() => rec.recordingUrl ? onSelectRecording(rec) : undefined}
                                    disabled={!rec.recordingUrl}
                                    className="btn btn-primary text-xs"
                                    style={{ flex: 1, padding: '5px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: rec.recordingUrl ? 1 : 0.4 }}
                                >
                                    <IconPlay size={12} />
                                    <span>Watch</span>
                                </button>
                                {rec.recordingUrl ? (
                                    <a
                                        href={resolveRecordingUrl(rec.recordingUrl)}
                                        download={`${rec.title || 'recording'}.mp4`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary text-xs"
                                        style={{ padding: '5px 10px', fontSize: '0.72rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Download MP4"
                                    >
                                        <IconDownload size={13} />
                                    </a>
                                ) : (
                                    <button
                                        disabled
                                        className="btn btn-secondary text-xs"
                                        style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}
                                    >
                                        <IconDownload size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
