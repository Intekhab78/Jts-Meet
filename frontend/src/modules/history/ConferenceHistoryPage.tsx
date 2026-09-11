import React, { useState, useMemo } from 'react'
import { API_BASE } from '../../config'

export interface HistoryMeeting {
    id: string
    title: string
    date: string
    time: string
    duration: string
    durationMinutes: number
    participants: number
    participantsList?: Array<{
        _id?: string
        fullName?: string
        email?: string
        avatar?: string
        status?: string
        role?: string
    }>
    host?: {
        _id?: string
        fullName?: string
        email?: string
        avatar?: string
    } | string
    recorded: boolean
    recordingUrl?: string
    status: string
    rawStartedAt?: string | Date
    rawEndedAt?: string | Date
}

interface ConferenceHistoryPageProps {
    historyItems: HistoryMeeting[]
    token: string
    currentUserId?: string
    onStartMeeting: (meetingId: string) => void
    onRefresh: () => void
    onDeleteSuccess?: (meetingId: string) => void
}

export function ConferenceHistoryPage({
    historyItems,
    token,
    currentUserId,
    onStartMeeting,
    onRefresh,
    onDeleteSuccess
}: ConferenceHistoryPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterTab, setFilterTab] = useState<'all' | 'recorded' | 'my_hosted' | 'standard'>('all')
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration' | 'attendees'>('newest')
    const [inspectingMeeting, setInspectingMeeting] = useState<HistoryMeeting | null>(null)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3000)
    }

    // Dynamic metrics computed in real-time from DB
    const metrics = useMemo(() => {
        const totalSessions = historyItems.length
        const recordedCount = historyItems.filter(i => i.recorded || !!i.recordingUrl).length
        const totalAttendees = historyItems.reduce((acc, curr) => acc + (curr.participants || 1), 0)
        const totalMinutes = historyItems.reduce((acc, curr) => acc + (curr.durationMinutes || 15), 0)
        const avgMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0

        const totalHours = Math.floor(totalMinutes / 60)
        const remMins = totalMinutes % 60
        const totalTimeDisplay = totalHours > 0 ? `${totalHours}h ${remMins}m` : `${totalMinutes} mins`

        return {
            totalSessions,
            recordedCount,
            totalAttendees,
            totalTimeDisplay,
            avgMinutes
        }
    }, [historyItems])

    // Filtered & sorted meetings
    const filteredMeetings = useMemo(() => {
        return historyItems
            .filter(item => {
                const q = searchQuery.toLowerCase().trim()
                const matchesQuery = !q ||
                    item.title.toLowerCase().includes(q) ||
                    item.id.toLowerCase().includes(q) ||
                    (typeof item.host === 'object' && item.host?.fullName?.toLowerCase().includes(q)) ||
                    (typeof item.host === 'object' && item.host?.email?.toLowerCase().includes(q)) ||
                    (item.participantsList && item.participantsList.some(p => p.fullName?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)))

                if (!matchesQuery) return false

                if (filterTab === 'recorded') {
                    return item.recorded || !!item.recordingUrl
                }
                if (filterTab === 'my_hosted') {
                    if (!currentUserId) return true
                    const hostId = typeof item.host === 'object' ? item.host?._id : item.host
                    return String(hostId) === String(currentUserId)
                }
                if (filterTab === 'standard') {
                    return !item.recorded && !item.recordingUrl
                }
                return true
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    const timeA = a.rawStartedAt ? new Date(a.rawStartedAt).getTime() : 0
                    const timeB = b.rawStartedAt ? new Date(b.rawStartedAt).getTime() : 0
                    return timeB - timeA
                }
                if (sortBy === 'oldest') {
                    const timeA = a.rawStartedAt ? new Date(a.rawStartedAt).getTime() : 0
                    const timeB = b.rawStartedAt ? new Date(b.rawStartedAt).getTime() : 0
                    return timeA - timeB
                }
                if (sortBy === 'duration') {
                    return (b.durationMinutes || 0) - (a.durationMinutes || 0)
                }
                if (sortBy === 'attendees') {
                    return (b.participants || 0) - (a.participants || 0)
                }
                return 0
            })
    }, [historyItems, searchQuery, filterTab, sortBy, currentUserId])

    // Export CSV report
    const handleExportCSV = () => {
        if (historyItems.length === 0) {
            showToast('No sessions available to export')
            return
        }

        const headers = ['Topic', 'Session ID', 'Date', 'Time', 'Duration', 'Duration (Mins)', 'Host Name', 'Host Email', 'Total Attendees', 'Status', 'Recording URL']
        const rows = historyItems.map(item => {
            const hostName = typeof item.host === 'object' ? item.host?.fullName || 'N/A' : 'N/A'
            const hostEmail = typeof item.host === 'object' ? item.host?.email || 'N/A' : 'N/A'
            return [
                `"${(item.title || '').replace(/"/g, '""')}"`,
                `"${item.id}"`,
                `"${item.date}"`,
                `"${item.time}"`,
                `"${item.duration}"`,
                item.durationMinutes || 15,
                `"${hostName}"`,
                `"${hostEmail}"`,
                item.participants || 1,
                `"${item.status}"`,
                `"${item.recordingUrl || 'None'}"`
            ].join(',')
        })

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `JTS-Meet-Conference-History-${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('📁 Conference History CSV exported successfully!')
    }

    // Copy link helper
    const handleCopyLink = (meetingId: string) => {
        const link = `${window.location.origin}/meet/${meetingId}`
        navigator.clipboard.writeText(link).then(() => {
            showToast(`📋 Copied meeting link: ${meetingId}`)
        }).catch(() => {
            showToast(`Room ID: ${meetingId}`)
        })
    }

    // Delete session helper
    const handleDeleteMeeting = async (meetingId: string) => {
        if (!confirm(`Are you sure you want to remove meeting "${meetingId}" from your conference history log?`)) {
            return
        }

        setDeletingId(meetingId)
        try {
            const res = await fetch(`${API_BASE}/api/meeting/${meetingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (res.ok) {
                showToast(`Meeting ${meetingId} removed from history`)
                if (onDeleteSuccess) {
                    onDeleteSuccess(meetingId)
                } else {
                    onRefresh()
                }
            } else {
                const err = await res.json().catch(() => ({}))
                showToast(err.message || 'Failed to remove meeting')
            }
        } catch (e: any) {
            showToast(e.message || 'Network error removing meeting')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="anim-fade-in" style={{ padding: '16px 20px', maxWidth: '100%', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
            
            {/* TOAST NOTIFICATION */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: '#1e1b4b',
                    border: '1px solid #6366f1',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span>✨</span> {toastMessage}
                </div>
            )}

            {/* HEADER TOOLBAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                            Conference History Log
                        </h2>
                        <span style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                            Enterprise Archive
                        </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        Review past sessions, inspect attendee analytics, download cloud recordings, and export compliance audit reports.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={onRefresh}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '0.8125rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                        title="Sync with database"
                    >
                        <span>🔄</span> Refresh
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '0.8125rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                        title="Download Attendance CSV"
                    >
                        <span>📥</span> Export CSV
                    </button>

                    <button
                        onClick={() => {
                            const newRoomId = `instant_${Date.now()}`
                            onStartMeeting(newRoomId)
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8125rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                    >
                        <span>⚡</span> Instant Room
                    </button>
                </div>
            </div>

            {/* DYNAMIC SUMMARY METRICS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                    { label: 'Total Sessions', value: metrics.totalSessions, icon: '📅', color: '#6366f1', subtitle: 'Concluded meetings' },
                    { label: 'Recorded Sessions', value: metrics.recordedCount, icon: '📹', color: '#ec4899', subtitle: 'Cloud backups ready' },
                    { label: 'Total Attendees', value: metrics.totalAttendees, icon: '👥', color: '#22c55e', subtitle: 'Participants engaged' },
                    { label: 'Est. Total Time', value: metrics.totalTimeDisplay, icon: '⏱️', color: '#f59e0b', subtitle: 'Minutes elapsed' },
                    { label: 'Avg. Duration', value: `${metrics.avgMinutes} mins`, icon: '⚡', color: '#06b6d4', subtitle: 'Per conference' }
                ].map((stat, idx) => (
                    <div key={idx} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(18, 20, 29, 0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}18`, border: `1px solid ${stat.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{stat.value}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>{stat.label}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{stat.subtitle}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* FILTER, SEARCH & SORT BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(18, 20, 29, 0.6)', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { id: 'all', label: `All Sessions (${historyItems.length})` },
                        { id: 'recorded', label: `Recorded (${metrics.recordedCount})` },
                        { id: 'my_hosted', label: 'Hosted by Me' },
                        { id: 'standard', label: 'Standard Calls' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setFilterTab(btn.id as any)}
                            style={{
                                border: 'none',
                                background: filterTab === btn.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.04)',
                                color: filterTab === btn.id ? '#818cf8' : 'var(--color-text-muted)',
                                borderBottom: filterTab === btn.id ? '2px solid #6366f1' : '2px solid transparent',
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: '0.8125rem',
                                fontWeight: filterTab === btn.id ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Search and sort inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', minWidth: 280 }}>
                    <div style={{ position: 'relative', width: 'clamp(220px, 30vw, 340px)' }}>
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-muted)',
                                pointerEvents: 'none',
                                opacity: 0.75
                            }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by topic, ID, host, attendee..."
                            className="input"
                            style={{
                                width: '100%',
                                paddingLeft: '38px',
                                paddingRight: searchQuery ? '32px' : '14px',
                                paddingTop: '8px',
                                paddingBottom: '8px',
                                fontSize: '0.8125rem',
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.25)',
                                boxSizing: 'border-box'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    border: 'none',
                                    color: '#ccc',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    width: 18,
                                    height: 18,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    padding: 0
                                }}
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="input py-2 px-3"
                        style={{ fontSize: '0.8125rem', borderRadius: 8, background: 'rgba(0,0,0,0.25)', cursor: 'pointer', color: '#e2e8f0', width: 'auto' }}
                    >
                        <option value="newest">🕒 Newest First</option>
                        <option value="oldest">🕰️ Oldest First</option>
                        <option value="duration">⏱️ Longest Duration</option>
                        <option value="attendees">👥 Most Attendees</option>
                    </select>
                </div>
            </div>

            {/* SESSIONS TABLE */}
            {historyItems.length === 0 ? (
                <div className="glass-card" style={{ padding: 'clamp(40px, 6vw, 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
                    <div style={{ width: 68, height: 68, borderRadius: '22px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
                        📜
                    </div>
                    <div style={{ maxWidth: 480 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>No Past Sessions Logged</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                            Your meeting attendance logs, session durations, and cloud recordings will be archived here once your meetings conclude.
                        </p>
                    </div>
                    <button
                        onClick={() => onStartMeeting(`instant_${Date.now()}`)}
                        className="btn btn-primary"
                        style={{ padding: '10px 22px', fontSize: '0.875rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <span>⚡</span> Start Instant Conference
                    </button>
                </div>
            ) : filteredMeetings.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderRadius: 16 }}>
                    <span style={{ fontSize: '2.5rem' }}>🔍</span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 12 }}>No matching sessions found</h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', maxWidth: 360, margin: '6px auto 16px' }}>
                        No conference records match your search filter "{searchQuery}".
                    </p>
                    <button onClick={() => { setSearchQuery(''); setFilterTab('all') }} className="btn btn-secondary text-xs" style={{ padding: '6px 16px', borderRadius: 8 }}>
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div className="responsive-table-container" style={{ margin: 0, background: 'rgba(18, 20, 29, 0.7)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <table className="premium-table" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>TOPIC / SESSION ID</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>ORGANIZER / HOST</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>DATE & TIME</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>DURATION</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>ATTENDEES</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>RECORDING / STATUS</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', minWidth: 140 }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMeetings.map((item) => {
                                const hostName = typeof item.host === 'object' ? item.host?.fullName || 'Organizer' : 'Host'
                                const hostEmail = typeof item.host === 'object' ? item.host?.email || '' : ''
                                const userCount = item.participants > 0 ? item.participants : 1

                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s ease' }}>
                                        {/* TOPIC & ID */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem', lineHeight: 1.3 }}>
                                                    {item.title}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#818cf8', fontFamily: 'monospace', background: 'rgba(99, 102, 241, 0.12)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.2)' }}>
                                                        {item.id}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyLink(item.id)}
                                                        title="Copy invite link"
                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                                    >
                                                        📋
                                                    </button>
                                                </div>
                                            </div>
                                        </td>

                                        {/* HOST */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {hostName.slice(0, 1).toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{hostName}</span>
                                                    {hostEmail && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{hostEmail}</span>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* DATE & TIME */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{item.date}</span>
                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.725rem' }}>at {item.time}</span>
                                            </div>
                                        </td>

                                        {/* DURATION */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            <span style={{
                                                fontSize: '0.725rem',
                                                fontWeight: 700,
                                                color: '#f59e0b',
                                                background: 'rgba(245, 158, 11, 0.12)',
                                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                ⏱️ {item.duration}
                                            </span>
                                        </td>

                                        {/* ATTENDEES */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            <button
                                                onClick={() => setInspectingMeeting(item)}
                                                style={{
                                                    background: 'rgba(34, 197, 94, 0.12)',
                                                    border: '1px solid rgba(34, 197, 94, 0.25)',
                                                    color: '#4ade80',
                                                    fontSize: '0.725rem',
                                                    fontWeight: 700,
                                                    padding: '3px 9px',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Inspect attendee list"
                                            >
                                                <span>👥</span> {userCount} {userCount === 1 ? 'user' : 'users'}
                                                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>🔍</span>
                                            </button>
                                        </td>

                                        {/* RECORDING / STATUS */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                                <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                                                    ✓ {item.status || 'Completed'}
                                                </span>

                                                {item.recordingUrl ? (
                                                    <a
                                                        href={item.recordingUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            color: '#f43f5e',
                                                            background: 'rgba(244, 63, 94, 0.12)',
                                                            border: '1px solid rgba(244, 63, 94, 0.25)',
                                                            padding: '2px 7px',
                                                            borderRadius: 6,
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        📹 Download MP4
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                                        No Recording
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* ACTIONS */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 140 }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                <button
                                                    onClick={() => onStartMeeting(item.id)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                    title="Re-launch room"
                                                >
                                                    <span>⚡</span> Rejoin
                                                </button>

                                                <button
                                                    onClick={() => setInspectingMeeting(item)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '5px 8px', borderRadius: 8, fontSize: '0.75rem' }}
                                                    title="Inspect Attendees"
                                                >
                                                    👥
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteMeeting(item.id)}
                                                    disabled={deletingId === item.id}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.12)',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                        color: '#ef4444',
                                                        padding: '5px 8px',
                                                        borderRadius: 8,
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Delete history log"
                                                >
                                                    {deletingId === item.id ? '...' : '🗑️'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ATTENDEE INSPECTOR MODAL */}
            {inspectingMeeting && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div className="glass-card anim-scale-in" style={{
                        width: '100%',
                        maxWidth: 580,
                        background: '#0f111a',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 20,
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                        boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                                    Attendee Intelligence & Analytics
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                    Session: <strong style={{ color: '#818cf8' }}>{inspectingMeeting.title}</strong> ({inspectingMeeting.id})
                                </p>
                            </div>
                            <button
                                onClick={() => setInspectingMeeting(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Summary Badges */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                            <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>📅 {inspectingMeeting.date} at {inspectingMeeting.time}</span>
                            <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>⏱️ Duration: {inspectingMeeting.duration}</span>
                            <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>👥 Total: {inspectingMeeting.participants} {inspectingMeeting.participants === 1 ? 'attendee' : 'attendees'}</span>
                        </div>

                        {/* Attendees List */}
                        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {inspectingMeeting.participantsList && inspectingMeeting.participantsList.length > 0 ? (
                                inspectingMeeting.participantsList.map((p, idx) => {
                                    const isHost = typeof inspectingMeeting.host === 'object'
                                        ? inspectingMeeting.host?._id === p._id
                                        : false

                                    return (
                                        <div key={p._id || idx} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: 12
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: isHost ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    color: '#fff',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {(p.fullName || 'User').slice(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                                                        {p.fullName || 'Conference Participant'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                        {p.email || 'Verified Attendee'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                {isHost ? (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                                        👑 Organizer
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', padding: '3px 8px', borderRadius: 8 }}>
                                                        ✓ Attended
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                    <span>👥 {inspectingMeeting.participants} attendees logged during this conference session.</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <button
                                onClick={() => {
                                    if (inspectingMeeting.participantsList?.length) {
                                        const emails = inspectingMeeting.participantsList.map(p => p.email).filter(Boolean).join(', ')
                                        navigator.clipboard.writeText(emails)
                                        showToast('📋 Copied attendee emails to clipboard!')
                                    } else {
                                        showToast('No emails recorded')
                                    }
                                }}
                                className="btn btn-secondary text-xs"
                                style={{ padding: '8px 14px', borderRadius: 8 }}
                            >
                                📋 Copy Attendee Emails
                            </button>

                            <button
                                onClick={() => setInspectingMeeting(null)}
                                className="btn btn-primary text-xs"
                                style={{ padding: '8px 18px', borderRadius: 8, fontWeight: 700 }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
