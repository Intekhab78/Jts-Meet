import React, { useState, useMemo } from 'react'
import { API_BASE } from '../../config'

export interface ScheduledMeeting {
    id: string
    title: string
    date: string
    time: string
    duration: string
    host: string
    hostId?: string
    isRecurring?: boolean
    recurrencePattern?: string
    notifyByEmail?: boolean
    isWaitingRoomEnabled?: boolean
    organizationId?: string
    teamId?: string
    teamName?: string
    status: string
    rawDate?: string
}

interface ScheduledMeetingsPageProps {
    scheduledItems: ScheduledMeeting[]
    token: string
    currentUserId?: string
    currentOrgId?: string
    teams?: Array<{ _id: string; name: string }>
    onStartMeeting: (meetingId: string) => void
    onRefresh: () => void
    onMeetingCreated?: () => void
}

export function ScheduledMeetingsPage({
    scheduledItems,
    token,
    currentUserId,
    currentOrgId,
    teams = [],
    onStartMeeting,
    onRefresh,
    onMeetingCreated
}: ScheduledMeetingsPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterTab, setFilterTab] = useState<'all' | 'today' | 'recurring' | 'my_hosted'>('all')
    const [viewMode, setViewMode] = useState<'list' | 'agenda'>('list')
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Modal state for Create / Edit
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMeeting, setEditingMeeting] = useState<ScheduledMeeting | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [modalError, setModalError] = useState('')

    // Form fields
    const [formTitle, setFormTitle] = useState('')
    const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [formTime, setFormTime] = useState('11:00')
    const [formDuration, setFormDuration] = useState('30m')
    const [formRecurring, setFormRecurring] = useState(false)
    const [formPattern, setFormPattern] = useState<'daily' | 'weekly' | 'weekdays' | 'monthly' | 'none'>('daily')
    const [formTeamId, setFormTeamId] = useState('')
    const [formNotifyEmail, setFormNotifyEmail] = useState(true)
    const [formWaitingRoom, setFormWaitingRoom] = useState(false)

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3500)
    }

    // Open Modal for Create
    const handleOpenCreateModal = () => {
        setEditingMeeting(null)
        setFormTitle('')
        setFormDate(new Date().toISOString().slice(0, 10))
        setFormTime('11:00')
        setFormDuration('30m')
        setFormRecurring(false)
        setFormPattern('daily')
        setFormTeamId(teams.length > 0 ? teams[0]._id : '')
        setFormNotifyEmail(true)
        setFormWaitingRoom(false)
        setModalError('')
        setIsModalOpen(true)
    }

    // Open Modal for Edit
    const handleOpenEditModal = (item: ScheduledMeeting) => {
        setEditingMeeting(item)
        setFormTitle(item.title)
        setFormDate(item.date && item.date.includes('-') ? item.date : new Date().toISOString().slice(0, 10))
        setFormTime(item.time || '11:00')
        setFormDuration(item.duration || '30m')
        setFormRecurring(!!item.isRecurring)
        setFormPattern((item.recurrencePattern as any) || 'daily')
        setFormTeamId(item.teamId || (teams.length > 0 ? teams[0]._id : ''))
        setFormNotifyEmail(item.notifyByEmail !== false)
        setFormWaitingRoom(!!item.isWaitingRoomEnabled)
        setModalError('')
        setIsModalOpen(true)
    }

    // Dynamic metrics
    const metrics = useMemo(() => {
        const total = scheduledItems.length
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayCount = scheduledItems.filter(i => i.date === todayStr || i.isRecurring).length
        const recurringCount = scheduledItems.filter(i => i.isRecurring).length
        const autoEmailCount = scheduledItems.filter(i => i.notifyByEmail !== false).length

        return {
            total,
            todayCount,
            recurringCount,
            autoEmailCount
        }
    }, [scheduledItems])

    // Filtered meetings
    const filteredMeetings = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10)
        const q = searchQuery.toLowerCase().trim()

        return scheduledItems.filter(item => {
            const matchesQuery = !q ||
                item.title.toLowerCase().includes(q) ||
                item.id.toLowerCase().includes(q) ||
                item.host.toLowerCase().includes(q)

            if (!matchesQuery) return false

            if (filterTab === 'today') {
                return item.date === todayStr || item.isRecurring
            }
            if (filterTab === 'recurring') {
                return !!item.isRecurring
            }
            if (filterTab === 'my_hosted') {
                if (!currentUserId) return true
                return String(item.hostId) === String(currentUserId) || item.host.toLowerCase().includes('admin')
            }
            return true
        })
    }, [scheduledItems, searchQuery, filterTab, currentUserId])

    // Submit Create or Edit Form
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formTitle.trim()) {
            setModalError('Please enter a conference title')
            return
        }

        setIsSubmitting(true)
        setModalError('')

        try {
            if (editingMeeting) {
                // UPDATE (PUT)
                const res = await fetch(`${API_BASE}/api/meeting/${editingMeeting.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: formTitle.trim(),
                        scheduledDate: formDate,
                        scheduledTime: formTime,
                        isRecurring: formRecurring,
                        recurrencePattern: formRecurring ? formPattern : 'none',
                        teamId: formTeamId || undefined,
                        notifyByEmail: formNotifyEmail,
                        isWaitingRoomEnabled: formWaitingRoom
                    })
                })

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.message || 'Failed to update meeting schedule')
                }

                showToast(`Conference "${formTitle.trim()}" updated successfully!`)
            } else {
                // CREATE (POST)
                const res = await fetch(`${API_BASE}/api/meeting/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: formTitle.trim(),
                        scheduledDate: formDate,
                        scheduledTime: formTime,
                        isRecurring: formRecurring,
                        recurrencePattern: formRecurring ? formPattern : 'none',
                        organizationId: currentOrgId || undefined,
                        teamId: formTeamId || undefined,
                        notifyByEmail: formNotifyEmail,
                        isWaitingRoomEnabled: formWaitingRoom
                    })
                })

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.message || 'Failed to schedule conference')
                }

                showToast(`Conference "${formTitle.trim()}" scheduled successfully!`)
            }

            setIsModalOpen(false)
            onRefresh()
            if (onMeetingCreated) onMeetingCreated()
        } catch (err: any) {
            setModalError(err?.message || 'Error saving conference')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Delete / Cancel Meeting
    const handleDeleteMeeting = async (meetingId: string, title: string) => {
        if (!confirm(`Are you sure you want to cancel and remove scheduled conference "${title}"?`)) {
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
                showToast(`Conference "${title}" cancelled successfully`)
                onRefresh()
            } else {
                const err = await res.json().catch(() => ({}))
                showToast(err.message || 'Failed to cancel conference')
            }
        } catch (e: any) {
            showToast(e.message || 'Network error cancelling meeting')
        } finally {
            setDeletingId(null)
        }
    }

    // Start room and send live email notification to team
    const handleStartRoom = (item: ScheduledMeeting) => {
        if (token && item.id) {
            fetch(`${API_BASE}/api/meeting/${item.id}/start-notify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(() => {})
        }
        showToast(`🚀 Starting "${item.title}" — Live link sent to team!`)
        onStartMeeting(item.id)
    }

    // Copy formatted invitation
    const handleCopyInvite = (item: ScheduledMeeting) => {
        const link = `${window.location.origin}/meet/${item.id}`
        const inviteText = `📅 JTS-Meet Conference Invitation\n\nTopic: ${item.title}\nTime: ${item.date} at ${item.time}\nMeeting ID: ${item.id}\n${item.isRecurring ? `Recurrence: Repeats ${item.recurrencePattern || 'Daily'}\n` : ''}\nJoin directly via link:\n${link}`
        navigator.clipboard.writeText(inviteText).then(() => {
            showToast(`📋 Formatted invite copied for "${item.title}"`)
        }).catch(() => {
            showToast(`Link: ${link}`)
        })
    }

    // Export .ics Calendar File (Outlook / Google Calendar)
    const handleDownloadICS = (item: ScheduledMeeting) => {
        const link = `${window.location.origin}/meet/${item.id}`
        const cleanTitle = item.title.replace(/[^\w\s-]/g, '')
        const icsData = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JTS Meet//Conference Scheduler//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${item.id}@jtsmeet.com`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
            `SUMMARY:${cleanTitle}`,
            `DESCRIPTION:Join video conference: ${link}\\nOrganized via JTS-Meet`,
            `URL:${link}`,
            `STATUS:CONFIRMED`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n')

        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${cleanTitle.replace(/\s+/g, '_')}.ics`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast(`📅 Calendar (.ics) file downloaded for "${item.title}"!`)
    }

    return (
        <div className="anim-fade-in" style={{ padding: '16px 20px', maxWidth: '100%', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, boxSizing: 'border-box' }}>
            
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
                            Calendar & Planned Conferences
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
                            Microsoft Teams Hub
                        </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        Coordinate shifts, schedule recurring department conferences, invite attendees, and sync with Outlook & Google Calendar.
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
                        onClick={() => {
                            const newRoomId = `instant_${Date.now()}`
                            onStartMeeting(newRoomId)
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '0.8125rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <span>⚡</span> Meet Now
                    </button>

                    <button
                        onClick={handleOpenCreateModal}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8125rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                    >
                        <span>📅</span> + Schedule Conference
                    </button>
                </div>
            </div>

            {/* SUMMARY METRICS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                    { label: 'Planned Conferences', value: metrics.total, icon: '📅', color: '#6366f1', subtitle: 'Upcoming on schedule' },
                    { label: "Today's Agenda", value: metrics.todayCount, icon: '⚡', color: '#22c55e', subtitle: 'Active or scheduled today' },
                    { label: 'Recurring Series', value: metrics.recurringCount, icon: '🔁', color: '#a855f7', subtitle: 'Daily & weekly series' },
                    { label: 'Auto-Email Active', value: metrics.autoEmailCount, icon: '📧', color: '#06b6d4', subtitle: 'Automatic team invites' }
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

            {/* FILTER & SEARCH CONTROLS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(18, 20, 29, 0.6)', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { id: 'all', label: `All Planned (${scheduledItems.length})` },
                        { id: 'today', label: `Today (${metrics.todayCount})` },
                        { id: 'recurring', label: `Recurring (${metrics.recurringCount})` },
                        { id: 'my_hosted', label: 'Hosted by Me' }
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

                {/* Search & Layout toggle */}
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
                            placeholder="Search planned conferences..."
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

                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                border: 'none',
                                background: viewMode === 'list' ? '#6366f1' : 'transparent',
                                color: '#fff',
                                padding: '5px 10px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                            title="List View"
                        >
                            📋 List
                        </button>
                        <button
                            onClick={() => setViewMode('agenda')}
                            style={{
                                border: 'none',
                                background: viewMode === 'agenda' ? '#6366f1' : 'transparent',
                                color: '#fff',
                                padding: '5px 10px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                            title="Agenda View"
                        >
                            🗓️ Agenda
                        </button>
                    </div>
                </div>
            </div>

            {/* CONFERENCES DISPLAY */}
            {scheduledItems.length === 0 ? (
                <div className="glass-card" style={{ padding: 'clamp(40px, 6vw, 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
                    <div style={{
                        width: 68, height: 68, borderRadius: '22px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem'
                    }}>
                        📅
                    </div>
                    <div style={{ maxWidth: 480 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>No Planned Conferences</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                            You don't have any upcoming meetings scheduled. Plan your next enterprise conference, invite attendees with automated alerts, or launch an instant meeting right now.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                        <button
                            onClick={handleOpenCreateModal}
                            className="btn btn-primary"
                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <span>📅</span> Schedule a Meeting
                        </button>
                        <button
                            onClick={() => onStartMeeting(`instant_${Date.now()}`)}
                            className="btn btn-secondary"
                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <span>⚡</span> Start Instant Meeting
                        </button>
                    </div>
                </div>
            ) : filteredMeetings.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderRadius: 16 }}>
                    <span style={{ fontSize: '2.5rem' }}>🔍</span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 12 }}>No matching planned conferences</h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', maxWidth: 360, margin: '6px auto 16px' }}>
                        No upcoming sessions match your search filter "{searchQuery}".
                    </p>
                    <button onClick={() => { setSearchQuery(''); setFilterTab('all') }} className="btn btn-secondary text-xs" style={{ padding: '6px 16px', borderRadius: 8 }}>
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filteredMeetings.map((item) => {
                        const isToday = item.date === new Date().toISOString().slice(0, 10) || item.isRecurring

                        return (
                            <div
                                key={item.id}
                                className="glass-card"
                                style={{
                                    padding: '16px 20px',
                                    border: isToday ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                                    background: isToday ? 'rgba(24, 28, 48, 0.75)' : 'rgba(18, 20, 29, 0.7)',
                                    borderRadius: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    {/* Left: Icon & Details */}
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 14,
                                            background: isToday ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(99,102,241,0.15)',
                                            border: '1px solid rgba(99,102,241,0.3)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            flexShrink: 0
                                        }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>CAL</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{item.date ? item.date.slice(-2) : '📅'}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                                                    {item.title}
                                                </h3>

                                                {isToday && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 8px', borderRadius: 6 }}>
                                                        ⚡ Today
                                                    </span>
                                                )}

                                                {item.isRecurring && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 8px', borderRadius: 6 }}>
                                                        🔁 Repeats {item.recurrencePattern || 'Daily'} at {item.time}
                                                    </span>
                                                )}

                                                {item.notifyByEmail && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '2px 8px', borderRadius: 6 }}>
                                                        📧 Auto-Email
                                                    </span>
                                                )}

                                                {item.isWaitingRoomEnabled && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '2px 8px', borderRadius: 6 }}>
                                                        🔒 Waiting Room
                                                    </span>
                                                )}
                                            </div>

                                            {/* Telemetry info */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.775rem', color: 'var(--color-text-secondary)' }}>
                                                <span>
                                                    Session ID: <strong style={{ fontFamily: 'monospace', color: '#818cf8' }}>{item.id}</strong>
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    📅 <strong>{item.date}</strong> at <strong>{item.time}</strong> ({item.duration || '30m'})
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Organizer: <strong style={{ color: '#e4e4e7' }}>{item.host}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions Toolbar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => handleStartRoom(item)}
                                            className="btn btn-primary"
                                            style={{ padding: '7px 14px', fontSize: '0.775rem', fontWeight: 700, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                            title="Launch meeting room now"
                                        >
                                            <span>📹</span> Start Room
                                        </button>

                                        <button
                                            onClick={() => handleCopyInvite(item)}
                                            className="btn btn-secondary"
                                            style={{ padding: '7px 10px', fontSize: '0.775rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                            title="Copy formatted Teams invitation"
                                        >
                                            <span>📋</span> Copy Invite
                                        </button>

                                        <button
                                            onClick={() => handleDownloadICS(item)}
                                            className="btn btn-secondary"
                                            style={{ padding: '7px 10px', fontSize: '0.775rem', borderRadius: 8 }}
                                            title="Add to Outlook / Google Calendar (.ics)"
                                        >
                                            <span>🗓️</span> .ICS
                                        </button>

                                        <button
                                            onClick={() => handleOpenEditModal(item)}
                                            className="btn btn-secondary"
                                            style={{ padding: '7px 10px', fontSize: '0.775rem', borderRadius: 8 }}
                                            title="Edit conference parameters"
                                        >
                                            ✏️ Edit
                                        </button>

                                        <button
                                            onClick={() => handleDeleteMeeting(item.id, item.title)}
                                            disabled={deletingId === item.id}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                color: '#ef4444',
                                                padding: '7px 10px',
                                                borderRadius: 8,
                                                fontSize: '0.775rem',
                                                cursor: 'pointer'
                                            }}
                                            title="Cancel planned conference"
                                        >
                                            {deletingId === item.id ? '...' : '🗑️ Cancel'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* SCHEDULE / EDIT CONFERENCE MODAL */}
            {isModalOpen && (
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
                        maxWidth: 540,
                        background: '#0f111a',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 20,
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                        boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1.4rem' }}>{editingMeeting ? '✏️' : '📅'}</span>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                                    {editingMeeting ? 'Edit Planned Conference' : 'Schedule Enterprise Conference'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}
                            >
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: 10, fontSize: '0.8125rem' }}>
                                ⚠️ {modalError}
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Title */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                                    Meeting Topic / Agenda
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="e.g. Weekly Executive Sync, Engineering Sprint Review"
                                    className="input py-2 px-3"
                                    style={{ borderRadius: 10, fontSize: '0.875rem' }}
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Date, Time & Duration row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formDate}
                                        onChange={(e) => setFormDate(e.target.value)}
                                        className="input py-2 px-2"
                                        style={{ borderRadius: 10, fontSize: '0.8125rem' }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formTime}
                                        onChange={(e) => setFormTime(e.target.value)}
                                        className="input py-2 px-2"
                                        style={{ borderRadius: 10, fontSize: '0.8125rem' }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                                        Duration
                                    </label>
                                    <select
                                        value={formDuration}
                                        onChange={(e) => setFormDuration(e.target.value)}
                                        className="input py-2 px-2"
                                        style={{ borderRadius: 10, fontSize: '0.8125rem', color: '#fff' }}
                                    >
                                        <option value="15m">15 mins</option>
                                        <option value="30m">30 mins</option>
                                        <option value="45m">45 mins</option>
                                        <option value="1h">1 hour</option>
                                        <option value="1.5h">1.5 hours</option>
                                        <option value="2h">2 hours</option>
                                    </select>
                                </div>
                            </div>

                            {/* Team / Department Selector */}
                            {teams.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                                        Target Team / Department
                                    </label>
                                    <select
                                        value={formTeamId}
                                        onChange={(e) => setFormTeamId(e.target.value)}
                                        className="input py-2 px-3"
                                        style={{ borderRadius: 10, fontSize: '0.8125rem', color: '#fff' }}
                                    >
                                        <option value="">(All Organization Members)</option>
                                        {teams.map(t => (
                                            <option key={t._id} value={t._id}>🏢 {t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Recurrence Settings */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#fff', fontWeight: 600 }}>
                                    <input
                                        type="checkbox"
                                        checked={formRecurring}
                                        onChange={(e) => setFormRecurring(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                    />
                                    <span>🔁 <strong>Recurring Conference Series</strong></span>
                                </label>

                                {formRecurring && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 26 }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Repeat Pattern:</span>
                                        <select
                                            value={formPattern}
                                            onChange={(e) => setFormPattern(e.target.value as any)}
                                            className="input py-1 px-2"
                                            style={{ borderRadius: 8, fontSize: '0.75rem', color: '#fff', width: 'auto' }}
                                        >
                                            <option value="daily">Daily (Every Day)</option>
                                            <option value="weekdays">Weekdays (Mon - Fri)</option>
                                            <option value="weekly">Weekly (Once a Week)</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Security & Notification Options */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                                    <input
                                        type="checkbox"
                                        checked={formNotifyEmail}
                                        onChange={(e) => setFormNotifyEmail(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                    />
                                    <span>📧 <strong>Auto-Email & Notify Team</strong> (Sends 1-Click Join Link with Email Alert)</span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                                    <input
                                        type="checkbox"
                                        checked={formWaitingRoom}
                                        onChange={(e) => setFormWaitingRoom(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                    />
                                    <span>🔒 <strong>Enable Waiting Room</strong> (Host must admit participants before entering)</span>
                                </label>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn btn-secondary"
                                    style={{ padding: '9px 18px', borderRadius: 10, fontSize: '0.8125rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary"
                                    style={{ padding: '9px 22px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 700 }}
                                >
                                    {isSubmitting ? 'Saving...' : editingMeeting ? 'Update Conference' : 'Schedule Conference'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
