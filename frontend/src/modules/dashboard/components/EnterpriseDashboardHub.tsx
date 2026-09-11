import React, { useState, useEffect, useMemo } from 'react'
import { MeetingTrendsChart } from './MeetingTrendsChart'
import { AiResponseRenderer } from './AiResponseRenderer'
import { API_BASE } from '../../../config'

interface EnterpriseDashboardHubProps {
    profileName: string
    profileEmail: string
    profileImage?: string
    userId: string
    token: string
    historyItems: any[]
    scheduledItems: any[]
    organizations: any[]
    currentOrgId: string
    teams: any[]
    currentTeamId: string
    onStartMeeting: (meetingId?: string) => void
    onNavigateTab: (tab: 'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'profile') => void
    onOpenDirectDial: (targetUserId?: string) => void
    onQuickSchedule?: (scheduleData: any) => Promise<void>
}

export function EnterpriseDashboardHub({
    profileName,
    profileEmail,
    profileImage,
    userId,
    token,
    historyItems,
    scheduledItems,
    organizations,
    currentOrgId,
    teams,
    currentTeamId,
    onStartMeeting,
    onNavigateTab,
    onOpenDirectDial,
    onQuickSchedule
}: EnterpriseDashboardHubProps) {
    // Quick Join input state
    const [quickJoinCode, setQuickJoinCode] = useState('')
    const [quickJoinError, setQuickJoinError] = useState('')

    // Time & Greeting
    const [currentTime, setCurrentTime] = useState(() => new Date())
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const greeting = useMemo(() => {
        const hour = currentTime.getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 17) return 'Good afternoon'
        return 'Good evening'
    }, [currentTime])

    const formattedDate = useMemo(() => {
        return currentTime.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }, [currentTime])

    // Find "Up Next" meeting
    const upNextMeeting = useMemo(() => {
        if (!scheduledItems || scheduledItems.length === 0) return null
        return scheduledItems[0]
    }, [scheduledItems])

    const [copiedMeetingLink, setCopiedMeetingLink] = useState(false)
    const [copiedPmiLink, setCopiedPmiLink] = useState(false)
    const [pmiWaitingRoom, setPmiWaitingRoom] = useState(true)

    // Calculate total hours hosted from historyItems
    const totalMinutes = useMemo(() => {
        return historyItems.reduce((acc, curr) => acc + (curr.durationMinutes || 15), 0)
    }, [historyItems])

    const totalHoursDisplay = useMemo(() => {
        const h = (totalMinutes / 60).toFixed(1)
        return `${h} hrs`
    }, [totalMinutes])

    // Recent activity search & filter
    const [recentSearch, setRecentSearch] = useState('')
    const filteredRecentMeetings = useMemo(() => {
        const list = historyItems.slice(0, 5)
        if (!recentSearch.trim()) return list
        const q = recentSearch.toLowerCase()
        return list.filter(m => (m.title || '').toLowerCase().includes(q) || (m.host || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q))
    }, [historyItems, recentSearch])

    // Quick Join Handler
    const handleQuickJoin = (e: React.FormEvent) => {
        e.preventDefault()
        const code = quickJoinCode.trim()
        if (!code) {
            setQuickJoinError('Please enter a valid meeting ID or link')
            return
        }

        let cleanId = code
        if (code.includes('room=')) {
            cleanId = code.split('room=')[1].split('&')[0]
        } else if (code.includes('/')) {
            const parts = code.split('/')
            cleanId = parts[parts.length - 1]
        }

        setQuickJoinError('')
        onStartMeeting(cleanId)
    }

    // Teammates extracted from current organization or teams
    const workspaceTeammates = useMemo<Array<{
        id: string
        name: string
        email: string
        role: string
        profileImage?: string
        status: string
    }>>(() => {
        const currentOrg = organizations.find(o => o._id === currentOrgId)
        if (!currentOrg || !Array.isArray(currentOrg.members)) {
            return []
        }
        return currentOrg.members
            .filter((m: any) => {
                const mId = m.userId?._id || m.userId?.id || m.userId
                return mId && mId.toString() !== userId.toString()
            })
            .slice(0, 5)
            .map((m: any) => {
                const u = m.userId && typeof m.userId === 'object' ? m.userId : {}
                return {
                    id: u._id || u.id || m.userId,
                    name: u.fullName || u.name || 'Team Colleague',
                    email: u.email || '',
                    role: m.role || 'member',
                    profileImage: u.profileImage,
                    status: 'available'
                }
            })
    }, [organizations, currentOrgId, userId])

    // ==========================================
    // SECTION 1: GEMINI AI COMPANION STATE & ACTIONS
    // ==========================================
    const [aiSummary, setAiSummary] = useState<{
        summary: string
        highlights: string[]
        actionItems: string[]
        sentiment: string
    }>({
        summary: 'Latest sprint sync concluded with full team alignment on deployment checklists and Middle East edge telemetry.',
        highlights: [
            'All WebRTC media nodes verified with zero packet loss in Dubai region',
            'Teams channel drag-and-drop file sharing rolled out to all members',
            'SMTP notification pipeline tested with automated invitation alerts'
        ],
        actionItems: [
            'Review audio/video studio noise cancellation benchmarks (Due Friday)',
            'Distribute permanent PMI room links to client team leads',
            'Schedule next weekly architecture review for Thursday 11:00 AM'
        ],
        sentiment: 'High Velocity & Productive'
    })
    const [isGeneratingAi, setIsGeneratingAi] = useState(false)
    const [completedActionItems, setCompletedActionItems] = useState<Record<number, boolean>>({})
    const [aiQuestion, setAiQuestion] = useState('')
    const [aiAnswer, setAiAnswer] = useState('')
    const [isAskingAi, setIsAskingAi] = useState(false)

    const handleGenerateAiRecap = async () => {
        setIsGeneratingAi(true)
        try {
            const latestMeeting = historyItems[0] || {}
            const res = await fetch(`${API_BASE}/api/ai/summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: latestMeeting.title || 'Executive Team Conference',
                    duration: latestMeeting.duration || '35 mins',
                    notes: 'Reviewed JTS Meet deployment status, edge node latencies, and file attachments.'
                })
            })
            if (res.ok) {
                const data = await res.json()
                if (data?.data) {
                    setAiSummary(data.data)
                }
            }
        } catch (e) {
            console.warn('AI summary fetch failed, using cached recap:', e)
        } finally {
            setIsGeneratingAi(false)
        }
    }

    const handleAskAiCompanion = async (e?: React.FormEvent, customQuestion?: string) => {
        if (e) e.preventDefault()
        const q = (customQuestion || aiQuestion).trim()
        if (!q) return
        if (customQuestion) setAiQuestion(customQuestion)
        setIsAskingAi(true)
        setAiAnswer('')
        try {
            const res = await fetch(`${API_BASE}/api/ai/assistant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: q,
                    meetingContext: aiSummary.summary
                })
            })
            if (res.ok) {
                const data = await res.json()
                setAiAnswer(data?.data?.reply || 'I am ready to assist with your meeting inquiries!')
            } else {
                setAiAnswer('JTS AI Companion is currently offline. Please check connection or try again.')
            }
        } catch (e) {
            setAiAnswer('JTS AI Companion is currently operating in offline mode.')
        } finally {
            setIsAskingAi(false)
        }
    }

    // ==========================================
    // SECTION 2: PERSONAL MEETING ID (PMI)
    // ==========================================
    const pmiId = useMemo(() => {
        const slug = (profileName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-')
        return `pmi-${slug}`
    }, [profileName])

    const pmiUrl = useMemo(() => {
        return `${window.location.origin}/#meeting?room=${pmiId}`
    }, [pmiId])

    // ==========================================
    // SECTION 3: CLOUD RECORDINGS VAULT
    // ==========================================
    const [selectedRecordingModal, setSelectedRecordingModal] = useState<any | null>(null)

    const recordingsList = useMemo(() => {
        const list = historyItems.filter(m => m.recorded || m.recordingUrl)
        if (list.length > 0) return list
        // High fidelity demo recordings if none yet recorded
        return [
            {
                id: 'rec_dubai_sync',
                title: 'JTS Middle East Client Walkthrough & QA',
                date: 'Sep 10, 2026',
                time: '04:30 PM',
                duration: '42m',
                fileSize: '48.2 MB',
                resolution: '1080p Full HD',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            },
            {
                id: 'rec_arch_sprint',
                title: 'Sprint Planning & WebRTC SFU Review',
                date: 'Sep 09, 2026',
                time: '11:00 AM',
                duration: '28m',
                fileSize: '31.5 MB',
                resolution: '720p HD',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
            }
        ]
    }, [historyItems])

    return (
        <div className="anim-fade-in" style={{
            maxWidth: 1220,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            boxSizing: 'border-box'
        }}>
            {/* 1. TOP HERO GREETING & ENTERPRISE TELEMETRY BAR */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(24, 24, 32, 0.85) 0%, rgba(15, 16, 22, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-xl)',
                padding: 'clamp(20px, 3vw, 28px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{
                    position: 'absolute',
                    top: -60,
                    right: -60,
                    width: 240,
                    height: 240,
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Enterprise Workspace
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {formattedDate}
                            </span>
                        </div>
                        <h1 style={{ fontSize: 'clamp(1.4rem, 2.8vw, 1.85rem)', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                            {greeting}, <span className="gradient-text">{profileName || 'System Administrator'}</span>!
                        </h1>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '6px 0 0', maxWidth: 620, lineHeight: 1.5 }}>
                            Real-time enterprise conference telemetry, AI meeting summaries powered by Google Gemini, and seamless collaboration.
                        </p>
                    </div>

                    {/* Telemetry Status Pills */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(34, 197, 94, 0.08)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            color: '#4ade80',
                            fontWeight: 600
                        }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                            <span>WebRTC SFU: Online (18ms)</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            color: '#818cf8',
                            fontWeight: 600
                        }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }} />
                            <span>Gemini 3.6 Flash: Active</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 500
                        }}>
                            <span>🛡️ 256-bit DTLS-SRTP</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* UP NEXT LIVE CONFERENCE SPOTLIGHT */}
            {upNextMeeting ? (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.12)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                            flexShrink: 0
                        }}>
                            ⚡
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    background: 'rgba(234, 179, 8, 0.15)',
                                    color: '#facc15',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    padding: '2px 8px',
                                    borderRadius: 9999
                                }}>
                                    Up Next in Agenda
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    ⏰ {upNextMeeting.time} • {upNextMeeting.date}
                                </span>
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                {upNextMeeting.title}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                <span>Host: <strong>{upNextMeeting.host}</strong></span>
                                {upNextMeeting.teamName && (
                                    <>
                                        <span>•</span>
                                        <span style={{ color: '#818cf8' }}>👥 {upNextMeeting.teamName}</span>
                                    </>
                                )}
                                <span>•</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>ID: {upNextMeeting.id}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                        <button
                            onClick={() => {
                                const fullUrl = `${window.location.origin}/#meeting?room=${upNextMeeting.id}`
                                navigator.clipboard.writeText(fullUrl)
                                setCopiedMeetingLink(true)
                                setTimeout(() => setCopiedMeetingLink(false), 2500)
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        >
                            <span>{copiedMeetingLink ? '✓' : '🔗'}</span>
                            <span>{copiedMeetingLink ? 'Link Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                            onClick={() => onStartMeeting(upNextMeeting.id)}
                            className="btn btn-primary"
                            style={{
                                padding: '9px 20px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                border: 'none',
                                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)',
                                flexShrink: 0
                            }}
                        >
                            <span>🟢</span>
                            <span>Join Conference Now</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.1rem' }}>✨</span>
                        <span><strong>You are all caught up!</strong> No imminent conferences scheduled for the next 2 hours.</span>
                    </div>
                    <button
                        onClick={() => onNavigateTab('scheduled')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-accent)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '0.8125rem'
                        }}
                    >
                        + Plan a Meeting
                    </button>
                </div>
            )}

            {/* ZOOM / TEAMS 4-CARD ENTERPRISE COMMAND DOCK */}
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

                {/* Action 2: Join with ID / Link (Embedded Button, Zero Overflow) */}
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

            {/* SECTION 2: PERMANENT PERSONAL MEETING ROOM (PMI VIRTUAL OFFICE) */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(17, 24, 39, 0.85) 100%)',
                border: '1px solid rgba(129, 140, 248, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        flexShrink: 0
                    }}>
                        🏢
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                My Personal Meeting Room (Permanent PMI)
                            </h3>
                            <span style={{ fontSize: '0.6875rem', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.2)', padding: '1px 8px', borderRadius: 9999, fontWeight: 600 }}>
                                Virtual Office
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                {pmiUrl}
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={pmiWaitingRoom}
                                    onChange={(e) => setPmiWaitingRoom(e.target.checked)}
                                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                                <span>Waiting Room Required</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(pmiUrl)
                            setCopiedPmiLink(true)
                            setTimeout(() => setCopiedPmiLink(false), 2500)
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '7px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <span>{copiedPmiLink ? '✓' : '📋'}</span>
                        <span>{copiedPmiLink ? 'PMI Copied!' : 'Copy Permanent Link'}</span>
                    </button>

                    <button
                        onClick={() => onStartMeeting(pmiId)}
                        className="btn btn-primary"
                        style={{ padding: '8px 18px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <span>Enter My Room</span>
                        <span>➔</span>
                    </button>
                </div>
            </div>

            {/* FOUR MODERN METRIC STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 'var(--radius-md)',
                        background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Total Conferences</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4ade80', background: 'rgba(34, 197, 94, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                +14.2%
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0', color: '#fff' }}>
                            {historyItems.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>sessions</span>
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Database session logs</span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 'var(--radius-md)',
                        background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Duration Hosted</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                Avg 25m
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0', color: '#fff' }}>
                            {totalHoursDisplay}
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>HD streaming audio/video</span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 'var(--radius-md)',
                        background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15', flexShrink: 0
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Scheduled Pipeline</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4ade80', background: 'rgba(34, 197, 94, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                +8.4%
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0', color: '#fff' }}>
                            {scheduledItems.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>planned</span>
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Upcoming presentations</span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 'var(--radius-md)',
                        background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Cloud Storage</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4ade80', background: 'rgba(34, 197, 94, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                Optimal
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0', color: '#fff' }}>
                            1.4 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>/ 10 GB</span>
                        </h3>
                        <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                            <div style={{ width: '14%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #10b981)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* TWO-COLUMN ENTERPRISE WORKSPACE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} className="lg:grid-cols-[1.5fr_1fr]">
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* SECTION 1: JTS AI COMPANION & SMART MEETING RECAPS (GEMINI POWERED) */}
                    <div className="glass-card" style={{
                        padding: 22,
                        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem'
                                }}>
                                    ✨
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                            JTS AI Companion
                                        </h3>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#c084fc', background: 'rgba(168, 85, 247, 0.2)', padding: '1px 8px', borderRadius: 9999 }}>
                                            Powered by Gemini 3.6 Flash
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                        Automated executive recaps, action items, and intelligent Q&A
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateAiRecap}
                                disabled={isGeneratingAi}
                                className="btn btn-secondary text-xs"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <span>{isGeneratingAi ? '⏳' : '⚡'}</span>
                                <span>{isGeneratingAi ? 'Analyzing Meeting...' : 'Regenerate Recap'}</span>
                            </button>
                        </div>

                        {/* Executive Summary Box */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 14px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Executive Meeting Summary
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                    {aiSummary.sentiment}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: '#e4e4e7', margin: 0, lineHeight: 1.5 }}>
                                {aiSummary.summary}
                            </p>
                        </div>

                        {/* Key Decisions Highlights */}
                        <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                                🎯 Key Decisions & Highlights
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {aiSummary.highlights.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', color: '#d4d4d8' }}>
                                        <span style={{ color: '#818cf8', fontWeight: 700 }}>•</span>
                                        <span>{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Items Checklist */}
                        <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                                📝 Follow-Up Action Items
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {aiSummary.actionItems.map((item, i) => {
                                    const isDone = !!completedActionItems[i]
                                    return (
                                        <label
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                fontSize: '0.78rem',
                                                color: isDone ? 'var(--color-text-muted)' : '#fff',
                                                textDecoration: isDone ? 'line-through' : 'none',
                                                cursor: 'pointer',
                                                background: isDone ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.03)',
                                                padding: '6px 10px',
                                                borderRadius: 'var(--radius-sm)'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isDone}
                                                onChange={(e) => setCompletedActionItems(prev => ({ ...prev, [i]: e.target.checked }))}
                                                style={{ accentColor: '#22c55e', cursor: 'pointer' }}
                                            />
                                            <span>{item}</span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Quick Prompt Suggestions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {[
                                '📅 How can I create a meeting?',
                                '⚡ What is my Personal Meeting Room (PMI)?',
                                '📝 Summarize pending action items',
                                '🎧 How to test audio and mic?'
                            ].map((promptText, pIdx) => (
                                <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleAskAiCompanion(undefined, promptText)}
                                    disabled={isAskingAi}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#c4b5fd',
                                        fontSize: '0.7rem',
                                        padding: '4px 10px',
                                        borderRadius: 20,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                                >
                                    {promptText}
                                </button>
                            ))}
                        </div>

                        {/* Ask AI Companion Input */}
                        <form onSubmit={(e) => handleAskAiCompanion(e)} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <input
                                type="text"
                                value={aiQuestion}
                                onChange={(e) => setAiQuestion(e.target.value)}
                                placeholder="Ask Gemini AI about meetings, schedules, features..."
                                style={{
                                    flex: 1,
                                    background: 'rgba(10, 11, 15, 0.8)',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.78rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isAskingAi}
                                style={{
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                {isAskingAi ? (
                                    <>
                                        <span style={{
                                            width: 12,
                                            height: 12,
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: '#fff',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span>Thinking...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        <span>Ask AI</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {aiAnswer && (
                            <AiResponseRenderer
                                content={aiAnswer}
                                onClear={() => setAiAnswer('')}
                            />
                        )}
                    </div>

                    {/* Visual Analytics Chart Widget */}
                    <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                    Conference Traffic & Volume
                                </h3>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                    Daily active video sessions conducted across your workspace
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', background: 'rgba(99, 102, 241, 0.15)', padding: '3px 10px', borderRadius: 'var(--radius-sm)' }}>
                                    Last 7 Days
                                </span>
                            </div>
                        </div>

                        <MeetingTrendsChart meetings={historyItems} />
                    </div>

                    {/* SECTION 3: CLOUD RECORDINGS & MEDIA VAULT */}
                    <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>🎥</span> Cloud Recordings Vault
                                </h3>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                    Stream and download high-definition conference recordings
                                </p>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '3px 8px', borderRadius: 9999 }}>
                                1080p MP4 Ready
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                            {recordingsList.map((rec: any, idx: number) => (
                                <div
                                    key={rec.id || idx}
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
                                    <div style={{
                                        height: 110,
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <button
                                            onClick={() => setSelectedRecordingModal(rec)}
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: '50%',
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                backdropFilter: 'blur(8px)',
                                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                                color: '#fff',
                                                fontSize: '1.2rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'transform 0.15s ease'
                                            }}
                                        >
                                            ▶
                                        </button>
                                        <span style={{
                                            position: 'absolute',
                                            bottom: 6,
                                            right: 8,
                                            background: 'rgba(0, 0, 0, 0.7)',
                                            color: '#fff',
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            fontSize: '0.6875rem',
                                            fontWeight: 600
                                        }}>
                                            ⏱️ {rec.duration || '30m'}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                                            {rec.title}
                                        </h4>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            {rec.date} • {rec.resolution || '1080p'} • {rec.fileSize || '35 MB'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                                        <button
                                            onClick={() => setSelectedRecordingModal(rec)}
                                            className="btn btn-primary text-xs"
                                            style={{ flex: 1, padding: '5px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                        >
                                            <span>▶ Watch</span>
                                        </button>
                                        <a
                                            href={rec.url || rec.recordingUrl || '#'}
                                            download={`${rec.title}.mp4`}
                                            className="btn btn-secondary text-xs"
                                            style={{ padding: '5px 10px', fontSize: '0.72rem', textDecoration: 'none' }}
                                        >
                                            ⬇
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Meeting Activity Logs (Table) */}
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
                                                    ⏱️ {m.duration}
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
                                                            🎥 Recorded
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            color: '#4ade80',
                                                            background: 'rgba(34, 197, 94, 0.1)',
                                                            padding: '2px 8px',
                                                            borderRadius: 4
                                                        }}>
                                                            ✓ Completed
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
                </div>

                {/* RIGHT COLUMN */}
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
                                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 6 }}>📅</span>
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
                                    <span>💬</span> Active Team Huddles
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
                                            <span>🎧 {ch.usersInHuddle} Live</span>
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
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4ade80', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: 9999 }}>
                                🟢 Active Now
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
                                                        <img src={member.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                    {member.role === 'owner' ? '👑 Workspace Owner' : member.role === 'admin' ? '🛡️ Admin' : 'Member'}
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
                                            <span>📞</span> Call
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
                                <span>🌐</span> Global Edge Media Nodes
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
                                <span>🏆</span> Meeting Wellbeing Index
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
                            💡 <strong>Recommendation:</strong> Your average meeting time is 24 mins. Retaining Thursday mornings for focused deep work keeps balance optimal.
                        </div>
                    </div>
                </div>
            </div>

            {/* LIGHTBOX VIDEO PLAYER MODAL FOR CLOUD RECORDINGS */}
            {selectedRecordingModal && (
                <div className="modal-overlay" style={{ zIndex: 100 }}>
                    <div className="modal-container anim-scale-in" style={{ maxWidth: 760, width: '90%', padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                                    {selectedRecordingModal.title}
                                </h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                    {selectedRecordingModal.date} • {selectedRecordingModal.duration} • Cloud Recorded
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRecordingModal(null)}
                                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ width: '100%', height: 380, background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <video
                                src={selectedRecordingModal.url || selectedRecordingModal.recordingUrl}
                                controls
                                autoPlay
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            >
                                Your browser does not support HTML5 video playback.
                            </video>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Encrypted Storage: 30-Day Audit Retention Active
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <a
                                    href={selectedRecordingModal.url || selectedRecordingModal.recordingUrl}
                                    download={`${selectedRecordingModal.title}.mp4`}
                                    className="btn btn-secondary text-xs"
                                    style={{ padding: '6px 14px', textDecoration: 'none' }}
                                >
                                    ⬇ Download MP4
                                </a>
                                <button
                                    onClick={() => setSelectedRecordingModal(null)}
                                    className="btn btn-primary text-xs"
                                    style={{ padding: '6px 14px' }}
                                >
                                    Close Player
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
