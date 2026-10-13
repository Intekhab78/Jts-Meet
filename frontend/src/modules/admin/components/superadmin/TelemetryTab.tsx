import React from 'react'
import {
    IconUsers,
    IconExternalLink
} from '../../../../components/common/Icons'
import { TelemetryData } from '../../superAdmin.types'

interface TelemetryTabProps {
    telemetry: TelemetryData
    autoRefresh: boolean
    setAutoRefresh: (val: boolean) => void
    formatUptime: (seconds: number) => string
    handleForceEndMeeting: (meetingId: string, title?: string) => void
}

export const TelemetryTab: React.FC<TelemetryTabProps> = ({
    telemetry,
    autoRefresh,
    setAutoRefresh,
    formatUptime,
    handleForceEndMeeting
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Real-time Health Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Live Conferences</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                        {telemetry.platformMetrics.activeConferences}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#34d399' }}>● WebRTC SFU Mesh Active</div>
                </div>

                <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #6366f1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Live Stream Participants</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                        {telemetry.platformMetrics.liveParticipants}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#818cf8' }}>Bandwidth: ~{telemetry.platformMetrics.mediaBandwidthMbps} Mbps</div>
                </div>

                <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Signaling Latency</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                        {telemetry.platformMetrics.signalingLatencyMs} ms
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>Socket Engine: Ultra Low Latency</div>
                </div>

                <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #ec4899' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Server Node Uptime</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                        {formatUptime(telemetry.uptimeSeconds)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Memory: {telemetry.serverMemoryMb} MB (Node {telemetry.nodeVersion})</div>
                </div>
            </div>

            {/* Active Live Rooms List */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)' }} />
                        <span>Live Active Conference Rooms ({telemetry.liveRooms.length})</span>
                    </h3>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh (every 5s)
                    </label>
                </div>

                {telemetry.liveRooms.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                        No active meetings running right now across the platform.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                        {telemetry.liveRooms.map(room => (
                            <div key={room.meetingId} style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, color: '#fff' }}>{room.title}</span>
                                    {room.isRecording && (
                                        <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                                            REC ●
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    Host: <strong style={{ color: '#fff' }}>{room.hostName}</strong> ({room.hostEmail})
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    Meeting ID: <code style={{ color: '#818cf8' }}>{room.meetingId}</code>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <IconUsers size={14} color="#34d399" />
                                        <span>{room.participantsCount} Connected</span>
                                    </span>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <a
                                            href={`/meet/${room.meetingId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-ghost"
                                            style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <span>Inspect</span>
                                            <IconExternalLink size={11} />
                                        </a>
                                        <button
                                            onClick={() => handleForceEndMeeting(room.meetingId, room.title)}
                                            className="btn btn-ghost"
                                            style={{
                                                fontSize: '0.72rem',
                                                padding: '3px 10px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                color: '#f87171',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                            title="Force terminate this active conference immediately"
                                        >
                                            <span>Force End</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
