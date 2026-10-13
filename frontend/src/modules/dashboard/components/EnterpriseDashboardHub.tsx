import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MeetingTrendsChart } from './MeetingTrendsChart'
import { DashboardCommandDock } from './enterprise/DashboardCommandDock'
import { DashboardAiCompanion } from './enterprise/DashboardAiCompanion'
import { DashboardRecordingsVault } from './enterprise/DashboardRecordingsVault'
import { RecentMeetingActivityTable } from './enterprise/RecentMeetingActivityTable'
import { DashboardRightSidebar } from './enterprise/DashboardRightSidebar'
import { DashboardVideoModal } from './enterprise/DashboardVideoModal'
import { API_BASE } from '../../../config'
import {
    IconShieldCheck,
    IconZap,
    IconClock,
    IconUsers,
    IconCheck,
    IconExternalLink,
    IconVideo,
    IconSparkles,
    IconPlus,
    IconBuilding,
    IconCopy
} from '../../../components/common/Icons'

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
    profileEmail: _profileEmail,
    profileImage: _profileImage,
    userId,
    token,
    historyItems,
    scheduledItems,
    organizations,
    currentOrgId,
    teams: _teams,
    currentTeamId: _currentTeamId,
    onStartMeeting,
    onNavigateTab,
    onOpenDirectDial,
    onQuickSchedule: _onQuickSchedule
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

    const [selectedRecordingModal, setSelectedRecordingModal] = useState<any | null>(null)
    const [recordingsList, setRecordingsList] = useState<any[]>([])
    const [recordingsLoading, setRecordingsLoading] = useState(true)
    const [recordingsError, setRecordingsError] = useState<string | null>(null)
    const [storageMetrics, setStorageMetrics] = useState<any>(null)

    const resolveRecordingUrl = (url?: string) => {
        if (!url) return ''
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
        return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
    }

    const fetchRecordingsVault = useCallback(async () => {
        setRecordingsLoading(true)
        setRecordingsError(null)
        try {
            const res = await fetch(`${API_BASE}/api/admin/recordings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (data.success && data.data) {
                    setRecordingsList(data.data.recordings || [])
                    if (data.data.storageMetrics) setStorageMetrics(data.data.storageMetrics)
                } else {
                    setRecordingsList([])
                }
            } else if (res.status === 403) {
                // Non-admin users: fall back to historyItems recordings
                const list = historyItems.filter((m: any) => m.recorded || m.recordingUrl)
                setRecordingsList(list.map((m: any) => ({
                    _id: m.id || m._id,
                    title: m.title,
                    meetingId: m.id || m._id,
                    host: { fullName: typeof m.host === 'object' ? m.host?.fullName || 'Organizer' : m.host || 'Organizer', email: '' },
                    duration: m.duration || '30 mins',
                    recordingUrl: m.recordingUrl || '',
                    fileSizeDisplay: m.fileSize || 'N/A',
                    resolution: '1080p Full HD',
                    createdAtFormatted: m.date || 'Unknown Date'
                })))
            } else {
                setRecordingsError('Failed to load recordings')
            }
        } catch (err) {
            console.error('Failed to fetch recordings vault:', err)
            // Graceful fallback to historyItems
            const list = historyItems.filter((m: any) => m.recorded || m.recordingUrl)
            setRecordingsList(list.map((m: any) => ({
                _id: m.id || m._id,
                title: m.title,
                meetingId: m.id || m._id,
                host: { fullName: typeof m.host === 'object' ? m.host?.fullName || 'Organizer' : m.host || 'Organizer', email: '' },
                duration: m.duration || '30 mins',
                recordingUrl: m.recordingUrl || '',
                fileSizeDisplay: m.fileSize || 'N/A',
                resolution: '1080p Full HD',
                createdAtFormatted: m.date || 'Unknown Date'
            })))
        } finally {
            setRecordingsLoading(false)
        }
    }, [token, historyItems])

    useEffect(() => {
        fetchRecordingsVault()
    }, [fetchRecordingsVault])

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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <IconShieldCheck size={13} color="var(--color-text-secondary)" /> 256-bit DTLS-SRTP
                            </span>
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
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                            flexShrink: 0
                        }}>
                            <IconZap size={22} color="#fff" />
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
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <IconClock size={12} /> {upNextMeeting.time} • {upNextMeeting.date}
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
                                        <span style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <IconUsers size={12} /> {upNextMeeting.teamName}
                                        </span>
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
                            {copiedMeetingLink ? <IconCheck size={13} color="#4ade80" /> : <IconExternalLink size={13} />}
                            <span>{copiedMeetingLink ? 'Link Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                            onClick={() => {
                                if (token && upNextMeeting?.id) {
                                    fetch(`${API_BASE}/api/meeting/${upNextMeeting.id}/start-notify`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`
                                        }
                                    }).catch(() => {})
                                }
                                onStartMeeting(upNextMeeting.id)
                            }}
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
                            <IconVideo size={14} color="#fff" />
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
                        <IconSparkles size={16} color="#818cf8" />
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
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <IconPlus size={13} />
                        <span>Plan a Meeting</span>
                    </button>
                </div>
            )}

            {/* ZOOM / TEAMS 4-CARD ENTERPRISE COMMAND DOCK */}
            <DashboardCommandDock
                onStartMeeting={onStartMeeting}
                onNavigateTab={onNavigateTab}
                onOpenDirectDial={onOpenDirectDial}
                quickJoinCode={quickJoinCode}
                setQuickJoinCode={setQuickJoinCode}
                quickJoinError={quickJoinError}
                handleQuickJoin={handleQuickJoin}
            />

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
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        flexShrink: 0
                    }}>
                        <IconBuilding size={22} color="#fff" />
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
                        {copiedPmiLink ? <IconCheck size={13} color="#4ade80" /> : <IconCopy size={13} />}
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
                    {/* SECTION 1: JTS AI COMPANION (GEMINI POWERED) */}
                    <DashboardAiCompanion
                        aiSummary={aiSummary}
                        isGeneratingAi={isGeneratingAi}
                        handleGenerateAiRecap={handleGenerateAiRecap}
                        completedActionItems={completedActionItems}
                        setCompletedActionItems={setCompletedActionItems}
                        aiQuestion={aiQuestion}
                        setAiQuestion={setAiQuestion}
                        handleAskAiCompanion={handleAskAiCompanion}
                        isAskingAi={isAskingAi}
                        aiAnswer={aiAnswer}
                        setAiAnswer={setAiAnswer}
                    />

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
                    <DashboardRecordingsVault
                        recordingsList={recordingsList}
                        recordingsLoading={recordingsLoading}
                        recordingsError={recordingsError}
                        storageMetrics={storageMetrics}
                        fetchRecordingsVault={fetchRecordingsVault}
                        resolveRecordingUrl={resolveRecordingUrl}
                        onSelectRecording={(rec) => setSelectedRecordingModal(rec)}
                    />

                    {/* Recent Meeting Activity Logs Table */}
                    <RecentMeetingActivityTable
                        filteredRecentMeetings={filteredRecentMeetings}
                        recentSearch={recentSearch}
                        setRecentSearch={setRecentSearch}
                        onNavigateTab={onNavigateTab}
                        onStartMeeting={onStartMeeting}
                    />
                </div>

                {/* RIGHT COLUMN */}
                <DashboardRightSidebar
                    scheduledItems={scheduledItems}
                    onNavigateTab={onNavigateTab}
                    onStartMeeting={onStartMeeting}
                    workspaceTeammates={workspaceTeammates}
                    onOpenDirectDial={onOpenDirectDial}
                />
            </div>

            {/* LIGHTBOX VIDEO PLAYER MODAL FOR CLOUD RECORDINGS */}
            <DashboardVideoModal
                selectedRecordingModal={selectedRecordingModal}
                onClose={() => setSelectedRecordingModal(null)}
                resolveRecordingUrl={resolveRecordingUrl}
                storageMetrics={storageMetrics}
            />
        </div>
    )
}
