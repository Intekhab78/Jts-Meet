import React from 'react'

interface DashboardCommandDockProps {
    onStartMeeting: (meetingId?: string) => void
    onNavigateTab: (tab: 'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'profile') => void
    onOpenDirectDial: (targetUserId?: string) => void
    quickJoinCode: string
    setQuickJoinCode: (val: string) => void
    quickJoinError: string
    handleQuickJoin: (e: React.FormEvent) => void
}

export const DashboardCommandDock: React.FC<DashboardCommandDockProps> = ({
    onStartMeeting,
    onNavigateTab,
    onOpenDirectDial,
    quickJoinCode,
    setQuickJoinCode,
    quickJoinError,
    handleQuickJoin
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {/* Action 1: New Instant Meeting */}
            <div
                onClick={() => onStartMeeting()}
                className="glass-card-interactive"
                style={{
                    padding: '20px 22px',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.04) 100%)',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fb923c', background: 'rgba(249, 115, 22, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>
                        Instant Call
                    </span>
                </div>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                        New Meeting
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Host an immediate HD room session with screen share & audio.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.78rem', fontWeight: 600, color: '#fb923c' }}>
                    <span>Start Meeting Now</span>
                    <span>➔</span>
                </div>
            </div>

            {/* Action 2: Join with ID / Link */}
            <div
                className="glass-card"
                style={{
                    padding: '20px 22px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.04) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 6px 18px rgba(59, 130, 246, 0.35)'
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>
                        Direct Entry
                    </span>
                </div>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                        Join with Code
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Enter 9-digit conference ID or invite URL to connect.
                    </p>
                </div>
                <form onSubmit={handleQuickJoin} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}>
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <input
                            type="text"
                            value={quickJoinCode}
                            onChange={(e) => setQuickJoinCode(e.target.value)}
                            placeholder="Meeting ID or link..."
                            style={{
                                width: '100%',
                                minWidth: 0,
                                background: 'rgba(10, 11, 15, 0.85)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 64px 8px 10px',
                                color: '#fff',
                                fontSize: '0.78rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                position: 'absolute',
                                right: 3,
                                top: 3,
                                bottom: 3,
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none',
                                color: '#fff',
                                padding: '0 12px',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Join
                        </button>
                    </div>
                    {quickJoinError && (
                        <span style={{ fontSize: '0.7rem', color: '#f87171', marginTop: 4, display: 'block' }}>{quickJoinError}</span>
                    )}
                </form>
            </div>

            {/* Action 3: Schedule Conference */}
            <div
                onClick={() => onNavigateTab('scheduled')}
                className="glass-card-interactive"
                style={{
                    padding: '20px 22px',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.04) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 6px 18px rgba(168, 85, 247, 0.35)'
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>
                        Calendar Sync
                    </span>
                </div>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                        Schedule Call
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Set up daily standups, repeat syncs, and auto-email invite links.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.78rem', fontWeight: 600, color: '#c084fc' }}>
                    <span>Open Conference Planner</span>
                    <span>➔</span>
                </div>
            </div>

            {/* Action 4: Ring Colleague (1-on-1 Direct Dial) */}
            <div
                onClick={() => onOpenDirectDial()}
                className="glass-card-interactive"
                style={{
                    padding: '20px 22px',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.04) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 6px 18px rgba(34, 197, 94, 0.35)'
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>
                        Direct Ring
                    </span>
                </div>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                        Ring Colleague
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Direct 1-on-1 encrypted audio/video ring to any workspace teammate.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.78rem', fontWeight: 600, color: '#4ade80' }}>
                    <span>Call Teammate Now</span>
                    <span>➔</span>
                </div>
            </div>
        </div>
    )
}
