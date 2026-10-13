import React from 'react'
import {
    IconClock,
    IconVideo,
    IconCheck
} from '../../../../components/common/Icons'

interface RecentMeetingActivityTableProps {
    filteredRecentMeetings: any[]
    recentSearch: string
    setRecentSearch: (val: string) => void
    onNavigateTab: (tab: 'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'profile') => void
    onStartMeeting: (meetingId?: string) => void
}

export const RecentMeetingActivityTable: React.FC<RecentMeetingActivityTableProps> = ({
    filteredRecentMeetings,
    recentSearch,
    setRecentSearch,
    onNavigateTab,
    onStartMeeting
}) => {
    return (
        <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                        Recent Meeting Activity
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Audit history of recently ended rooms and recordings
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        type="text"
                        value={recentSearch}
                        onChange={(e) => setRecentSearch(e.target.value)}
                        placeholder="Search past logs..."
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--radius-md)',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            color: '#fff',
                            outline: 'none',
                            width: 150
                        }}
                    />
                    <button
                        onClick={() => onNavigateTab('history')}
                        className="btn btn-secondary text-xs"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                    >
                        View All ➔
                    </button>
                </div>
            </div>

            {filteredRecentMeetings.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    <span>No meeting records found. Start your first session to see logs here!</span>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Topic / ID</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Date & Time</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Duration</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecentMeetings.map((m, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <td style={{ padding: '12px 10px' }}>
                                        <div style={{ fontWeight: 600, color: '#fff' }}>{m.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                            ID: {m.id} • Host: {typeof m.host === 'object' ? m.host?.fullName || 'Host' : m.host}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                        <div>{m.date}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{m.time}</div>
                                    </td>
                                    <td style={{ padding: '12px 10px', color: '#e4e4e7', whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconClock size={11} /> {m.duration}</span>
                                    </td>
                                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                                        {m.recorded ? (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: '#c084fc',
                                                background: 'rgba(168, 85, 247, 0.15)',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <IconVideo size={12} color="#c084fc" /> Recorded
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: '#4ade80',
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <IconCheck size={12} color="#4ade80" /> Completed
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <button
                                            onClick={() => onStartMeeting(m.id)}
                                            className="btn btn-secondary text-xs"
                                            style={{ padding: '4px 10px', fontSize: '0.725rem' }}
                                        >
                                            Re-Open
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
