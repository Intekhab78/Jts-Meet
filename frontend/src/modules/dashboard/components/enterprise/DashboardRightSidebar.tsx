import React from 'react'
import {
    IconCalendar,
    IconHash,
    IconCrown,
    IconShield,
    IconVideo,
    IconGlobe,
    IconZap,
    IconSparkles
} from '../../../../components/common/Icons'
import { normalizeMediaUrl } from '../../../../config'

interface DashboardRightSidebarProps {
    scheduledItems: any[]
    onNavigateTab: (tab: 'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'profile') => void
    onStartMeeting: (meetingId?: string) => void
    workspaceTeammates: Array<{
        id: string
        name: string
        email: string
        role: string
        profileImage?: string
        status: string
    }>
    onOpenDirectDial: (targetUserId?: string) => void
}

export const DashboardRightSidebar: React.FC<DashboardRightSidebarProps> = ({
    scheduledItems,
    onNavigateTab,
    onStartMeeting,
    workspaceTeammates,
    onOpenDirectDial
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Today's Agenda & Upcoming Timeline */}
            <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                            Today's Agenda
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                            Scheduled conferences & team syncs
                        </p>
                    </div>
                    <button
                        onClick={() => onNavigateTab('scheduled')}
                        className="btn btn-secondary text-xs"
                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                    >
                        + Schedule
                    </button>
                </div>

                {scheduledItems.length === 0 ? (
                    <div style={{
                        padding: '28px 16px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                            <IconCalendar size={32} color="#818cf8" strokeWidth={1.5} />
                        </div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>No Upcoming Calls</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
                            Your schedule is completely clear today.
                        </p>
                        <button
                            onClick={() => onNavigateTab('scheduled')}
                            className="btn btn-primary text-xs"
                            style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                        >
                            Schedule a Conference
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {scheduledItems.slice(0, 4).map((item, i) => (
                            <div
                                key={item.id || i}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        color: '#818cf8',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textAlign: 'center',
                                        minWidth: 55
                                    }}>
                                        {item.time || '11:00 AM'}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>
                                            {item.title}
                                        </h4>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            Host: {item.host || 'Colleague'} {item.teamName && `• ${item.teamName}`}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onStartMeeting(item.id)}
                                    className="btn btn-secondary text-xs"
                                    style={{
                                        padding: '5px 12px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        color: '#4ade80',
                                        border: '1px solid rgba(34, 197, 94, 0.25)',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Join
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 5: ACTIVE TEAM HUDDLES & CHANNELS */}
            <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconHash size={18} color="#818cf8" /> Active Team Huddles
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                            Fast-jump to channel chats & ongoing voice rooms
                        </p>
                    </div>
                    <button
                        onClick={() => onNavigateTab('channel')}
                        className="btn btn-secondary text-xs"
                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                    >
                        Channels ➔
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                        { name: 'general', desc: 'Company announcements & discussions', activeHuddle: true, usersInHuddle: 2 },
                        { name: 'engineering', desc: 'Architecture, PRs & deployments', activeHuddle: false, usersInHuddle: 0 },
                        { name: 'middle-east-projects', desc: 'Dubai enterprise rollout team', activeHuddle: true, usersInHuddle: 3 }
                    ].map((ch, idx) => (
                        <div
                            key={idx}
                            onClick={() => onNavigateTab('channel')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>#</span>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{ch.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{ch.desc}</div>
                                </div>
                            </div>

                            {ch.activeHuddle ? (
                                <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    color: '#22c55e',
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.25)',
                                    padding: '2px 8px',
                                    borderRadius: 9999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                                    <span>{ch.usersInHuddle} Live</span>
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Open ➔</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Workspace Teammates & Speed Dial */}
            <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                            Active Teammates
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                            Speed-dial colleagues for instant 1-on-1 calls
                        </p>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4ade80', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                        Active Now
                    </span>
                </div>

                {workspaceTeammates.length === 0 ? (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        <span>No other teammates in this workspace yet.</span>
                        <div style={{ marginTop: 8 }}>
                            <button
                                onClick={() => onNavigateTab('organization')}
                                className="btn btn-secondary text-xs"
                                style={{ padding: '4px 10px' }}
                            >
                                + Invite Colleagues
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {workspaceTeammates.map((member) => (
                            <div
                                key={member.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.04)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem', fontWeight: 700, color: '#fff', overflow: 'hidden'
                                        }}>
                                            {member.profileImage ? (
                                                <img
                                                    src={normalizeMediaUrl(member.profileImage)}
                                                    alt=""
                                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                member.name.slice(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <span style={{
                                            position: 'absolute', bottom: 0, right: 0, width: 9, height: 9,
                                            borderRadius: '50%', background: '#22c55e', border: '2px solid #0f1016'
                                        }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
                                            {member.name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {member.role === 'owner' ? (
                                                <><IconCrown size={11} color="#fbbf24" /> <span>Workspace Owner</span></>
                                            ) : member.role === 'admin' ? (
                                                <><IconShield size={11} color="#c084fc" /> <span>Admin</span></>
                                            ) : (
                                                <span>Member</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onOpenDirectDial(member.id)}
                                    className="btn btn-secondary text-xs"
                                    title={`Direct Ring ${member.name}`}
                                    style={{
                                        padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center',
                                        gap: 4, color: '#4ade80', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)'
                                    }}
                                >
                                    <IconVideo size={12} color="#4ade80" />
                                    <span>Call</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 4: GLOBAL EDGE TELEMETRY & LATENCY MAP */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconGlobe size={15} color="#818cf8" /> Global Edge Media Nodes
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600 }}>All Operational</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { city: 'Dubai (UAE)', node: 'Primary SFU', ping: '18ms', status: 'optimal' },
                        { city: 'Mumbai (IN)', node: 'Edge Relay', ping: '24ms', status: 'optimal' },
                        { city: 'Frankfurt (DE)', node: 'EU Gateway', ping: '68ms', status: 'good' },
                        { city: 'Singapore (SG)', node: 'APAC Relay', ping: '74ms', status: 'good' }
                    ].map((node, i) => (
                        <div key={i} style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{node.city}</span>
                                <span style={{ fontSize: '0.6875rem', color: '#4ade80', fontWeight: 700 }}>{node.ping}</span>
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                {node.node}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{
                    background: 'rgba(34, 197, 94, 0.06)',
                    border: '1px solid rgba(34, 197, 94, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem'
                }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Bandwidth Throughput:</span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>52 Mbps (4K / 60fps Ready)</span>
                </div>
            </div>

            {/* SECTION 6: WORKPLACE PRODUCTIVITY & WELLBEING INSIGHTS */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconZap size={15} color="#fbbf24" /> Meeting Wellbeing Index
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: 9999, fontWeight: 700 }}>
                        94/100 Score
                    </span>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Focus Work (68%)</span>
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>Meetings (32%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: '68%', height: '100%', background: '#22c55e' }} />
                        <div style={{ width: '32%', height: '100%', background: '#6366f1' }} />
                    </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconSparkles size={12} color="#fbbf24" /> <strong>Recommendation:</strong></span> Your average meeting time is 24 mins. Retaining Thursday mornings for focused deep work keeps balance optimal.
                </div>
            </div>
        </div>
    )
}
