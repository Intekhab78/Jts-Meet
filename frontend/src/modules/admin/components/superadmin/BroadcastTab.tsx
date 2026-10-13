import React from 'react'
import {
    IconBell,
    IconX,
    IconZap,
    IconRefresh,
    IconLock
} from '../../../../components/common/Icons'
import { TelemetryData, TenantItem } from '../../superAdmin.types'

interface BroadcastTabProps {
    broadcastMsg: string
    setBroadcastMsg: (val: string) => void
    broadcastSeverity: 'info' | 'warning' | 'critical'
    setBroadcastSeverity: (val: 'info' | 'warning' | 'critical') => void
    broadcastActive: boolean
    setBroadcastActive: (val: boolean) => void
    sendingBroadcast: boolean
    handleSendBroadcast: (e: React.FormEvent) => void
    handleStopBroadcast: () => void
    telemetry: TelemetryData | null
    fetchTelemetry: () => void
    tenants: TenantItem[]
}

export const BroadcastTab: React.FC<BroadcastTabProps> = ({
    broadcastMsg,
    setBroadcastMsg,
    broadcastSeverity,
    setBroadcastSeverity,
    broadcastActive,
    setBroadcastActive,
    sendingBroadcast,
    handleSendBroadcast,
    handleStopBroadcast,
    telemetry,
    fetchTelemetry,
    tenants
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, alignItems: 'start', width: '100%' }}>
            {/* Left Column: Broadcast Composer */}
            <div className="glass-card" style={{ padding: '24px 26px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconBell size={18} color="#fbbf24" />
                        <span>Platform-Wide Global Broadcast Center</span>
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                        Push instant real-time announcement banners to all active conferences, dashboards, and connected tenant organizations.
                    </p>
                </div>

                {/* Quick One-Click Announcement Templates */}
                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        One-Click Announcement Templates:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {[
                            {
                                label: 'Scheduled Maintenance',
                                icon: '🛠️',
                                severity: 'warning' as const,
                                text: 'Scheduled system infrastructure maintenance tonight from 02:00 to 03:00 UTC. Live video conferences will remain connected.'
                            },
                            {
                                label: 'AI & Remote Control Release',
                                icon: '🚀',
                                severity: 'info' as const,
                                text: 'New feature update! Google Gemini AI meeting summaries, live captions, and AnyDesk-style native remote control are now active.'
                            },
                            {
                                label: 'Peak Traffic Advisory',
                                icon: '⚡',
                                severity: 'warning' as const,
                                text: 'High conference volume detected across global media nodes. All media relays and telephony bridges are performing normally.'
                            },
                            {
                                label: 'Security & Compliance Patch',
                                icon: '🛡️',
                                severity: 'critical' as const,
                                text: 'Enterprise security update deployed. If prompted, please refresh your browser tab or restart your desktop client.'
                            },
                            {
                                label: 'All Systems Operational',
                                icon: '🟢',
                                severity: 'info' as const,
                                text: 'All global WebRTC media servers, audio dial-in bridges, and recording vaults are operating at 100% health.'
                            }
                        ].map((tpl) => (
                            <button
                                key={tpl.label}
                                type="button"
                                onClick={() => {
                                    setBroadcastMsg(tpl.text)
                                    setBroadcastSeverity(tpl.severity)
                                    setBroadcastActive(true)
                                }}
                                style={{
                                    padding: '6px 11px',
                                    borderRadius: 7,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#e4e4e7',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#6366F1'
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                                }}
                            >
                                <span>{tpl.icon}</span>
                                <span>{tpl.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Broadcast Text Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                Broadcast Notice Message <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                {broadcastMsg.length} characters
                            </span>
                        </div>
                        <textarea
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Enter public alert announcement text that will be displayed across meeting rooms and user dashboards..."
                            rows={4}
                            className="input"
                            style={{
                                background: 'rgba(15, 17, 26, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 8,
                                width: '100%',
                                fontSize: '0.85rem',
                                color: '#fff',
                                padding: '10px 14px',
                                boxSizing: 'border-box',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                            required
                        />
                    </div>

                    {/* Severity Level Cards */}
                    <div>
                        <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                            Notice Urgency & Severity Level:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {[
                                { id: 'info', label: 'Info (Blue)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', desc: 'General news, tips, new features' },
                                { id: 'warning', label: 'Warning (Amber)', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', desc: 'Scheduled maintenance, advisory' },
                                { id: 'critical', label: 'Critical (Red)', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', desc: 'Urgent security, incident alerts' }
                            ].map((s) => {
                                const isSelected = broadcastSeverity === s.id
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => setBroadcastSeverity(s.id as any)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: isSelected ? `1.5px solid ${s.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: isSelected ? s.bg : 'rgba(255, 255, 255, 0.02)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 3,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8125rem', color: isSelected ? s.color : '#fff' }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                                            <span>{s.label}</span>
                                        </div>
                                        <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>
                                            {s.desc}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Active Broadcasting Toggle */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: 10,
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                Enable & Stream Banner Live
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                When checked, the alert banner is pushed in real time via WebSockets to all connected clients.
                            </div>
                        </div>
                        <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={broadcastActive}
                                onChange={(e) => setBroadcastActive(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <div
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    background: broadcastActive ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: 3,
                                        left: broadcastActive ? 23 : 3,
                                        transition: 'left 0.2s ease'
                                    }}
                                />
                            </div>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
                        <button
                            type="button"
                            onClick={() => {
                                setBroadcastMsg('')
                                setBroadcastActive(false)
                            }}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#a1a4c9',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Clear Text
                        </button>

                        <button
                            type="submit"
                            disabled={sendingBroadcast}
                            className="btn btn-primary"
                            style={{
                                padding: '10px 24px',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                border: 'none',
                                borderRadius: 8,
                                color: '#fff',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                                cursor: sendingBroadcast ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            {sendingBroadcast ? 'Publishing Notice...' : (
                                <>
                                    <IconBell size={15} color="#fff" />
                                    <span>Publish Global Announcement</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right Column: Live WYSIWYG Preview & Platform Reach */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Live WYSIWYG Banner Preview Card */}
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📺 Live WYSIWYG Banner Preview</span>
                        </h4>
                        <span
                            style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: broadcastActive ? 'rgba(34, 197, 94, 0.18)' : 'rgba(113, 113, 122, 0.2)',
                                color: broadcastActive ? '#4ade80' : '#a1a1aa',
                                border: `1px solid ${broadcastActive ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                            }}
                        >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: broadcastActive ? '#4ade80' : '#a1a1aa' }} />
                            <span>{broadcastActive ? 'ON AIR' : 'DRAFT'}</span>
                        </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                        Real-time replica of how the alert ticker renders at the top of active video conference rooms and dashboards:
                    </p>

                    {/* Live Replica Render */}
                    <div
                        style={{
                            padding: '12px 16px',
                            borderRadius: 10,
                            background: broadcastSeverity === 'critical'
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(153, 27, 27, 0.35) 100%)'
                                : broadcastSeverity === 'warning'
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.35) 100%)'
                                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(29, 78, 216, 0.35) 100%)',
                            border: `1px solid ${broadcastSeverity === 'critical'
                                    ? 'rgba(239, 68, 68, 0.45)'
                                    : broadcastSeverity === 'warning'
                                        ? 'rgba(245, 158, 11, 0.45)'
                                        : 'rgba(59, 130, 246, 0.45)'
                                }`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    background: broadcastSeverity === 'critical' ? '#ef4444' : broadcastSeverity === 'warning' ? '#f59e0b' : '#3b82f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    flexShrink: 0
                                }}
                            >
                                <IconBell size={14} />
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>
                                {broadcastMsg.trim() || 'No announcement message specified yet. Type your notice on the left or pick a template.'}
                            </div>
                        </div>
                        <button
                            type="button"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: 6,
                                width: 22,
                                height: 22,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <IconX size={12} />
                        </button>
                    </div>
                </div>

                {/* Real-time Audience Telemetry & Broadcast Reach */}
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconZap size={16} color="#6366f1" />
                            <span>Real-Time Platform Audience Reach</span>
                        </h4>
                        <button
                            type="button"
                            onClick={fetchTelemetry}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.75rem'
                            }}
                        >
                            <IconRefresh size={12} /> Refresh
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Live Participants</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80', marginTop: 2 }}>
                                {telemetry?.platformMetrics?.liveParticipants || 0}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Connected on WebRTC</div>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Active Meetings</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#818cf8', marginTop: 2 }}>
                                {telemetry?.platformMetrics?.activeConferences || 0}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Live video rooms</div>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tenant Companies</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                                {telemetry?.platformMetrics?.totalOrgs || tenants.length || 0}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Active SaaS workspaces</div>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Users</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                                {telemetry?.platformMetrics?.totalUsers || 0}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Registered accounts</div>
                        </div>
                    </div>
                </div>

                {/* Active Broadcast Governance, One-Click Takedown & Target Channels */}
                <div className="glass-card" style={{ padding: '20px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconLock size={15} color="#818cf8" />
                            <span>Active Broadcast Governance & Controls</span>
                        </h4>
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: broadcastActive && broadcastMsg.trim() ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: broadcastActive && broadcastMsg.trim() ? '#4ade80' : '#a1a1aa',
                            border: `1px solid ${broadcastActive && broadcastMsg.trim() ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
                        }}>
                            {broadcastActive && broadcastMsg.trim() ? '● LIVE BROADCASTING' : 'IDLE / STANDBY'}
                        </span>
                    </div>

                    {/* Live Status Summary */}
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                    }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                Current Target Scope
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                                All Global Tenants & Live Peer Conferences
                            </div>
                        </div>
                        {broadcastActive && broadcastMsg.trim() ? (
                            <button
                                type="button"
                                onClick={handleStopBroadcast}
                                disabled={sendingBroadcast}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#f87171',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <IconX size={13} color="#f87171" />
                                <span>Takedown Broadcast</span>
                            </button>
                        ) : (
                            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>No active banner live</span>
                        )}
                    </div>

                    {/* Active Delivery Channels Matrix */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                            Broadcasting Channels & Relays:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { name: 'Live Conference Ticker', icon: '🎥', status: 'Active' },
                                { name: 'Web Dashboard Banner', icon: '🌐', status: 'Active' },
                                { name: 'Desktop App Tray Alert', icon: '💻', status: 'Active' },
                                { name: 'WebSocket Relay', icon: '⚡', status: 'Active' }
                            ].map(ch => (
                                <div
                                    key={ch.name}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e7', fontWeight: 500 }}>
                                        <span>{ch.icon}</span>
                                        <span>{ch.name}</span>
                                    </span>
                                    <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.7rem' }}>✓</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
