import React, { useState, useEffect, Suspense } from 'react'
import { useMeetingContext } from '../../meeting/context/MeetingContext'
import { useSocketContext } from '../../meeting/context/SocketContext'
import { IncomingCallModal, type IncomingCallData } from '../../meeting/components/IncomingCallModal'
import { SocketEvents } from '../../meeting/services/socket.service'
import { API_BASE } from '../../../config'

const MeetingRoom = React.lazy(() => import('../../meeting/components/MeetingRoom').then(m => ({ default: m.MeetingRoom })))
const OrganizationSettingsPage = React.lazy(() => import('../../organization/OrganizationSettingsPage').then(m => ({ default: m.OrganizationSettingsPage })))
const TeamSettingsPage = React.lazy(() => import('../../team/TeamSettingsPage').then(m => ({ default: m.TeamSettingsPage })))
const ChannelSettingsPage = React.lazy(() => import('../../channel/ChannelSettingsPage').then(m => ({ default: m.ChannelSettingsPage })))
const MeetingTrendsChart = React.lazy(() => import('./MeetingTrendsChart').then(m => ({ default: m.MeetingTrendsChart })))

interface AppWorkspaceProps {
    token: string
    onLogout: () => void
}

function WorkspaceTabSkeleton() {
    return (
        <div style={{ padding: 40, width: '100%', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
            <div className="skeleton" style={{ height: 100, width: '100%', borderRadius: 'var(--radius-xl)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
                <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
                <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28 }}>
                <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-xl)' }} />
                <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-xl)' }} />
            </div>
        </div>
    )
}

export function AppWorkspace({ token, onLogout }: AppWorkspaceProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'profile'>(() => {
        const hash = window.location.hash.replace('#', '').split('?')[0]
        const validTabs = ['dashboard', 'meeting', 'history', 'scheduled', 'organization', 'team', 'channel', 'profile']
        if (validTabs.includes(hash)) {
            return hash as any
        }
        return 'dashboard'
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [historyFilter, setHistoryFilter] = useState<'all' | 'recorded' | 'regular'>('all')

    const { joined, setMeetingId } = useMeetingContext()
    const { socket, connectSocket, connected } = useSocketContext()
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
    const [showDirectDialModal, setShowDirectDialModal] = useState(false)
    const [directDialTarget, setDirectDialTarget] = useState('')

    // Ensure socket connected for direct ringing
    useEffect(() => {
        if (token && !connected) {
            connectSocket(token)
        }
    }, [token, connected, connectSocket])

    // Listen to direct call socket events
    useEffect(() => {
        if (!socket) return

        const handleIncomingCall = (data: any) => {
            setIncomingCall({
                callerId: data.callerId,
                callerName: data.callerName || 'Colleague',
                callerAvatar: data.callerAvatar,
                meetingId: data.meetingId,
                callType: data.callType || 'video'
            })
        }

        const handleCallCancelled = () => {
            setIncomingCall(null)
        }

        socket.on(SocketEvents.CALL_INCOMING, handleIncomingCall)
        socket.on(SocketEvents.CALL_CANCELLED, handleCallCancelled)

        return () => {
            socket.off(SocketEvents.CALL_INCOMING, handleIncomingCall)
            socket.off(SocketEvents.CALL_CANCELLED, handleCallCancelled)
        }
    }, [socket])

    const handleAcceptCall = (call: IncomingCallData) => {
        if (socket) {
            socket.emit(SocketEvents.CALL_ACCEPTED, {
                callerId: call.callerId,
                meetingId: call.meetingId
            })
        }
        setMeetingId(call.meetingId)
        setIncomingCall(null)
        setActiveTab('meeting')
    }

    const handleDeclineCall = (call: IncomingCallData) => {
        if (socket) {
            socket.emit(SocketEvents.CALL_REJECTED, {
                callerId: call.callerId,
                meetingId: call.meetingId
            })
        }
        setIncomingCall(null)
    }

    const handleStartDirectCall = (targetId: string) => {
        if (!socket || !targetId.trim()) return
        const newMeetingId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        socket.emit(SocketEvents.CALL_INITIATE, {
            calleeId: targetId.trim(),
            callerName: profileName || 'Colleague',
            meetingId: newMeetingId
        })
        setMeetingId(newMeetingId)
        setShowDirectDialModal(false)
        setDirectDialTarget('')
        setActiveTab('meeting')
    }

    const [sidebarExpanded, setSidebarExpanded] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const showFullSidebar = !joined || sidebarExpanded || isHovered

    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Sync activeTab state to URL hash
    useEffect(() => {
        if (activeTab) {
            const currentHash = window.location.hash.replace('#', '')
            const currentBase = currentHash.split('?')[0]
            const currentQuery = currentHash.includes('?') ? '?' + currentHash.split('?')[1] : ''

            if (activeTab === currentBase && currentQuery) {
                window.history.replaceState(null, '', `/#${activeTab}${currentQuery}`)
            } else {
                window.history.replaceState(null, '', `/#${activeTab}`)
            }
        }
    }, [activeTab])

    // Listen for hash changes (e.g. browser back/forward button)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '').split('?')[0]
            const validTabs = ['dashboard', 'meeting', 'history', 'scheduled', 'organization', 'team', 'channel', 'profile']
            if (validTabs.includes(hash)) {
                setActiveTab(hash as any)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    // Profile States
    const [profileName, setProfileName] = useState('Team Member')
    const [profileEmail, setProfileEmail] = useState('member@jtsmeet.com')
    const [userId, setUserId] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
    const [profileError, setProfileError] = useState('')

    // Connected hardware & preferences
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>(() => localStorage.getItem('jts_default_mic') || '')
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>(() => localStorage.getItem('jts_default_cam') || '')
    const [autoMuteMic, setAutoMuteMic] = useState<boolean>(() => localStorage.getItem('jts_pref_auto_mute') === 'true')
    const [autoMuteCam, setAutoMuteCam] = useState<boolean>(() => localStorage.getItem('jts_pref_auto_cam_off') === 'true')
    const [noiseSuppression, setNoiseSuppression] = useState<boolean>(() => localStorage.getItem('jts_pref_noise_suppr') !== 'false')
    const [isTestingMic, setIsTestingMic] = useState(false)
    const [micLevel, setMicLevel] = useState(0)

    // Dynamic Database meeting lists
    const [historyItems, setHistoryItems] = useState<any[]>([])
    const [scheduledItems, setScheduledItems] = useState<any[]>([])

    // Organization and Team workspace lists
    const [organizations, setOrganizations] = useState<any[]>([])
    const [currentOrgId, setCurrentOrgId] = useState<string>('')
    const [teams, setTeams] = useState<any[]>([])
    const [currentTeamId, setCurrentTeamId] = useState<string>('')

    // State for Scheduler form
    const [scheduleTitle, setScheduleTitle] = useState('')
    const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [scheduleTime, setScheduleTime] = useState('11:00')
    const [scheduleDuration, setScheduleDuration] = useState('30m')
    const [isRecurringDaily, setIsRecurringDaily] = useState(true)
    const [notifyTeamByEmail, setNotifyTeamByEmail] = useState(true)
    const [scheduleTeamId, setScheduleTeamId] = useState('')

    // Fetch user details & meetings from API
    const fetchProfile = async () => {
        if (!token) return
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data) {
                    setProfileName(data.data.fullName)
                    setProfileEmail(data.data.email)
                    setUserId(data.data._id || data.data.id || '')
                    try {
                        if (data.data.fullName) {
                            localStorage.setItem('jts_user_name', data.data.fullName)
                        }
                    } catch (e) {}
                }
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err)
        }
    }

    const fetchMeetings = async () => {
        if (!token) return
        try {
            const response = await fetch(`${API_BASE}/api/meeting/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data) {
                    const list = data.data as any[]

                    // Map to history list
                    const history = list.filter(m => m.status === 'ended').map(m => ({
                        id: m.meetingId,
                        title: m.title,
                        date: m.startedAt ? new Date(m.startedAt).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString(),
                        time: m.startedAt ? new Date(m.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        duration: m.endedAt && m.startedAt ? `${Math.round((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 60000)}m` : '15m',
                        participants: m.participants?.length || 1,
                        recorded: false,
                        status: 'Completed'
                    }))

                    // Map to scheduled list
                    const scheduled = list.filter(m => m.status === 'scheduled' || m.status === 'active').map(m => ({
                        id: m.meetingId,
                        title: m.title,
                        date: m.scheduledDate || new Date(m.createdAt).toLocaleDateString(),
                        time: m.scheduledTime ? `${m.scheduledTime}` : new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        duration: '30m',
                        host: m.host?.fullName || 'Host',
                        isRecurring: m.isRecurring || false,
                        recurrencePattern: m.recurrencePattern || 'none',
                        notifyByEmail: m.notifyByEmail !== false
                    }))

                    setHistoryItems(history)
                    setScheduledItems(scheduled)
                }
            }
        } catch (err) {
            console.error('Failed to fetch meetings:', err)
        }
    }

    const fetchOrganizations = async () => {
        if (!token) return
        try {
            const response = await fetch(`${API_BASE}/api/organization/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data) {
                    setOrganizations(data.data)
                    if (data.data.length > 0 && !currentOrgId) {
                        setCurrentOrgId(data.data[0]._id)
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load user organizations:', err)
        }
    }

    const fetchTeams = async (orgId: string) => {
        if (!orgId || !token) return
        try {
            const response = await fetch(`${API_BASE}/api/team/organization/${orgId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data) {
                    setTeams(data.data)
                    if (data.data.length > 0) {
                        setCurrentTeamId(data.data[0]._id)
                    } else {
                        setCurrentTeamId('')
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load teams:', err)
        }
    }

    useEffect(() => {
        fetchProfile()
        fetchMeetings()
        fetchOrganizations()
    }, [token])

    useEffect(() => {
        if (currentOrgId) {
            fetchTeams(currentOrgId)
        } else {
            setTeams([])
            setCurrentTeamId('')
        }
    }, [currentOrgId])

    // Load available audio & video devices
    useEffect(() => {
        if (activeTab === 'profile' && navigator.mediaDevices?.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const audios = devices.filter(d => d.kind === 'audioinput')
                const videos = devices.filter(d => d.kind === 'videoinput')
                setAudioDevices(audios)
                setVideoDevices(videos)
                if (!selectedAudioDevice && audios.length > 0) {
                    setSelectedAudioDevice(audios[0].deviceId)
                }
                if (!selectedVideoDevice && videos.length > 0) {
                    setSelectedVideoDevice(videos[0].deviceId)
                }
            }).catch(err => {
                console.warn('Media devices enumeration warning:', err)
            })
        }
    }, [activeTab])

    // Live microphone volume test effect
    useEffect(() => {
        let audioCtx: AudioContext | null = null
        let analyser: AnalyserNode | null = null
        let micStream: MediaStream | null = null
        let animId: number

        if (isTestingMic) {
            navigator.mediaDevices?.getUserMedia({
                audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
            }).then(stream => {
                micStream = stream
                const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
                if (!AudioCtxClass) return
                audioCtx = new AudioCtxClass()
                analyser = audioCtx.createAnalyser()
                analyser.fftSize = 256
                const source = audioCtx.createMediaStreamSource(stream)
                source.connect(analyser)
                const dataArray = new Uint8Array(analyser.frequencyBinCount)

                const updateMeter = () => {
                    if (!analyser) return
                    analyser.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i]
                    }
                    const avg = sum / dataArray.length
                    setMicLevel(Math.min(100, Math.round((avg / 128) * 100)))
                    animId = requestAnimationFrame(updateMeter)
                }
                updateMeter()
            }).catch(err => {
                console.error('Microphone test error:', err)
                setIsTestingMic(false)
            })
        } else {
            setMicLevel(0)
        }

        return () => {
            if (animId) cancelAnimationFrame(animId)
            if (micStream) micStream.getTracks().forEach(t => t.stop())
            if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {})
        }
    }, [isTestingMic, selectedAudioDevice])

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profileName.trim()) return
        setIsSavingProfile(true)
        setProfileError('')
        try {
            const res = await fetch(`${API_BASE}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fullName: profileName.trim() })
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                setProfileSaveSuccess(true)
                setTimeout(() => setProfileSaveSuccess(false), 3500)
            } else {
                setProfileError(data?.message || 'Failed to update profile')
            }
        } catch (err: any) {
            setProfileError(err?.message || 'Network error updating profile')
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!scheduleTitle.trim()) return

        try {
            const response = await fetch(`${API_BASE}/api/meeting/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: scheduleTitle.trim(),
                    scheduledDate: scheduleDate,
                    scheduledTime: scheduleTime,
                    isRecurring: isRecurringDaily,
                    recurrencePattern: isRecurringDaily ? 'daily' : 'none',
                    organizationId: currentOrgId || undefined,
                    teamId: scheduleTeamId || undefined,
                    notifyByEmail: notifyTeamByEmail
                })
            })
            if (response.status === 401) {
                onLogout()
                return
            }
            const data = await response.json()
            if (response.ok) {
                fetchMeetings()
                alert(`Meeting scheduled successfully! ${isRecurringDaily ? `It will repeat daily at ${scheduleTime}. ` : ''}${notifyTeamByEmail ? 'Team members will receive automated invitations.' : ''}`)
                setScheduleTitle('')
                setActiveTab('scheduled')
            } else {
                alert(data.message || 'Failed to schedule meeting')
            }
        } catch (err) {
            console.error('Error creating meeting:', err)
        }
    }

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [activeTab])

    const filteredHistory = historyItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase())
        if (historyFilter === 'all') return matchesSearch
        if (historyFilter === 'recorded') return matchesSearch && item.recorded
        return matchesSearch && !item.recorded
    })

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg-base)', overflow: 'hidden', position: 'relative' }}>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* Mobile Sidebar Backdrop Overlay */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="transition-transform duration-300 ease-in-out z-[1000]"
                style={{
                    position: windowWidth < 768 ? 'fixed' : 'static',
                    transform: (windowWidth >= 768 || mobileMenuOpen) ? 'translateX(0)' : 'translateX(-100%)',
                    width: windowWidth < 768 ? (mobileMenuOpen ? 240 : 0) : ((mobileMenuOpen || showFullSidebar) ? 240 : 72),
                    background: 'rgba(10,11,15,0.98)',
                    borderRight: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: (mobileMenuOpen || showFullSidebar) ? '24px 16px' : '24px 8px',
                    flexShrink: 0,
                    alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center',
                    overflow: 'hidden',
                    top: 0,
                    bottom: 0,
                    left: 0
                }}
            >
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: (mobileMenuOpen || showFullSidebar) ? 8 : 0, justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center' }}>
                    <div style={{
                        width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow-accent)', color: '#fff', flexShrink: 0
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    </div>
                    {(mobileMenuOpen || showFullSidebar) && (
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                            JTS<span className="gradient-text">Meet</span>
                        </span>
                    )}
                </div>

                {/* Workspace / Org Switcher Dropdown is now in the top navbar */}

                {/* Team Switcher Dropdown */}
                {activeTab === 'channel' && teams.length > 0 && (mobileMenuOpen || showFullSidebar) && (
                    <div style={{ marginBottom: 16, padding: '0 8px' }}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                            Active Team
                        </label>
                        <select
                            value={currentTeamId}
                            onChange={(e) => setCurrentTeamId(e.target.value)}
                            className="input py-2"
                            style={{ background: 'var(--color-surface-2)', color: '#fff', outline: 'none', fontSize: '0.8125rem' }}
                        >
                            {teams.map((t: any) => (
                                <option key={t._id} value={t._id} style={{ background: 'var(--color-surface-1)', color: '#fff' }}>
                                    👥 {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Nav list */}
                {(() => {
                    const currentOrg = organizations.find(org => org._id === currentOrgId)
                    const userMemberEntry = currentOrg?.members?.find((m: any) =>
                        (m.userId?._id || m.userId || '').toString() === userId.toString()
                    )
                    const isOrgAdminOrOwner =
                        organizations.length === 0 ||
                        (currentOrg && userId && (currentOrg.ownerId?._id || currentOrg.ownerId || '').toString() === userId.toString()) ||
                        (userMemberEntry && (userMemberEntry.role === 'owner' || userMemberEntry.role === 'admin'))

                    return (
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', width: '100%', alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center' }}>
                            {[
                                { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: false },
                                { id: 'meeting', label: 'Meeting Room', icon: '📹', adminOnly: false },
                                { id: 'history', label: 'History log', icon: '📜', adminOnly: false },
                                { id: 'scheduled', label: 'Scheduled', icon: '📅', adminOnly: false },
                                { id: 'organization', label: 'Organizations', icon: '🏢', adminOnly: true },
                                { id: 'team', label: 'Teams Settings', icon: '👥', adminOnly: true },
                                { id: 'channel', label: 'Channels Settings', icon: '💬', adminOnly: true },
                                { id: 'profile', label: 'User Profile', icon: '👤', adminOnly: false }
                            ].filter(item => !item.adminOnly || isOrgAdminOrOwner).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id as any)
                                        setMobileMenuOpen(false)
                                    }}
                                    title={!(mobileMenuOpen || showFullSidebar) ? item.label : undefined}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: (mobileMenuOpen || showFullSidebar) ? '10px 14px' : '10px 0',
                                        justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                                        width: '100%',
                                        border: 'none', background: activeTab === item.id ? 'var(--color-accent-light)' : 'transparent',
                                        color: activeTab === item.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                        borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                    {(mobileMenuOpen || showFullSidebar) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                                </button>
                            ))}
                        </nav>
                    )
                })()}

                {/* Pin/Collapse lock button inside meeting */}
                {joined && (
                    <button
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        className="btn btn-ghost"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: (mobileMenuOpen || showFullSidebar) ? '10px 14px' : '10px 0',
                            justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                            border: 'none', color: 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 600,
                            cursor: 'pointer', margin: '8px 0', width: '100%'
                        }}
                        title={sidebarExpanded ? "Collapse Sidebar" : "Pin Sidebar Open"}
                    >
                        <span>{(mobileMenuOpen || showFullSidebar) ? (sidebarExpanded ? '◀ Collapse' : '📌 Pin Sidebar') : '▶'}</span>
                    </button>
                )}

                {/* Footer sign out */}
                <button
                    onClick={onLogout}
                    title={!(mobileMenuOpen || showFullSidebar) ? "Sign Out" : undefined}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: (mobileMenuOpen || showFullSidebar) ? '10px 14px' : '10px 0',
                        justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        color: '#f87171',
                        borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                        cursor: 'pointer', marginTop: joined ? '0' : 'auto', width: '100%',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                >
                    <span style={{ display: 'flex', color: '#ef4444' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </span>
                    {(mobileMenuOpen || showFullSidebar) && <span style={{ whiteSpace: 'nowrap', color: '#f87171' }}>Sign Out</span>}
                </button>
            </aside>

            {/* Main Content Pane */}
            <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: activeTab === 'meeting' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', position: 'relative', outline: 'none' }}>
                {activeTab !== 'meeting' && (
                    <header style={{
                        position: 'sticky',
                        top: 0,
                        height: '56px',
                        minHeight: '56px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'rgba(10, 11, 15, 0.95)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: windowWidth < 480 ? '0 12px' : '0 20px',
                        boxSizing: 'border-box',
                        zIndex: 50
                    }}>
                        {/* Left Side: Active Tab Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="btn-ghost"
                                style={{
                                    border: 'none', background: 'transparent', color: '#fff', fontSize: '1.25rem',
                                    cursor: 'pointer', padding: '4px 8px', display: windowWidth < 768 ? 'flex' : 'none', 
                                    alignItems: 'center', marginRight: 2
                                }}
                                aria-label="Open navigation menu"
                            >
                                ☰
                            </button>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                                {activeTab === 'dashboard' ? 'Dashboard' : 
                                 activeTab === 'history' ? 'History Log' :
                                 activeTab === 'scheduled' ? 'Scheduled' :
                                 activeTab === 'organization' ? 'Organizations' :
                                 activeTab === 'team' ? 'Teams' :
                                 activeTab === 'channel' ? 'Channels' :
                                 activeTab === 'profile' ? 'Profile' : activeTab}
                            </span>
                        </div>

                        {/* Right Side: Organization Switcher */}
                        {organizations.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="hidden sm:inline" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                    Workspace:
                                </span>
                                <select
                                    value={currentOrgId}
                                    onChange={(e) => setCurrentOrgId(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '4px 8px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        maxWidth: windowWidth < 360 ? '85px' : '120px',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {organizations.map((org: any) => (
                                        <option key={org._id} value={org._id} style={{ background: 'var(--color-surface-1)', color: '#fff' }}>
                                            🏢 {org.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </header>
                )}
                <Suspense fallback={<WorkspaceTabSkeleton />}>
                    {/* MEETING TAB */}
                    {activeTab === 'meeting' && (() => {
                        const currentOrg = organizations.find(org => org._id === currentOrgId)
                        const userMemberEntry = currentOrg?.members?.find((m: any) =>
                            (m.userId?._id || m.userId || '').toString() === userId.toString()
                        )
                        const isOrgAdminOrOwner =
                            organizations.length === 0 ||
                            (currentOrg && userId && (currentOrg.ownerId?._id || currentOrg.ownerId || '').toString() === userId.toString()) ||
                            (userMemberEntry && (userMemberEntry.role === 'owner' || userMemberEntry.role === 'admin'))

                        return (
                            <div style={{ width: '100%', height: '100%' }}>
                                <MeetingRoom initialToken={token} isAdminOrOwner={isOrgAdminOrOwner} />
                            </div>
                        )
                    })()}

                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vw, 24px)', boxSizing: 'border-box' }}>
                            {/* Welcome Banner */}
                            <div className="glass-card flex flex-col md:flex-row gap-4 md:items-center justify-between" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
                                <div>
                                    <h2 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.45rem)', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Welcome back, {profileName}!</h2>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Review scheduled calls, access past session recordings, and host secure instant room calls.</p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <button onClick={() => setActiveTab('meeting')} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
                                        Start New Meeting
                                    </button>
                                    <button onClick={() => setShowDirectDialModal(true)} className="btn btn-secondary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                                        <span>📞</span> Ring Colleague
                                    </button>
                                </div>
                            </div>

                            {/* Stats Cards grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(10px, 2vw, 16px)' }}>
                                {[
                                    { title: 'Ended Meetings', val: `${historyItems.length} sessions`, icon: '📹', desc: 'Secure database logs', trend: '+14.2%', trendUp: true },
                                    { title: 'Calendar Schedule', val: `${scheduledItems.length} planned`, icon: '📅', desc: 'Upcoming presentations', trend: '+8.4%', trendUp: true },
                                    { title: 'Storage quota', val: '1.4 GB / 10 GB', icon: '💾', desc: '14% capacity used', trend: 'Optimal', trendUp: null }
                                ].map((stat, i) => (
                                    <div key={i} className="glass-card-sm" style={{ padding: 'clamp(12px, 2vw, 16px)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ fontSize: '2rem', padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>{stat.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{stat.title}</span>
                                                {stat.trend && (
                                                    <span style={{
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                        color: stat.trendUp === true ? '#4ade80' : stat.trendUp === false ? '#f87171' : 'var(--color-text-secondary)',
                                                        background: stat.trendUp === true ? 'rgba(34,197,94,0.1)' : stat.trendUp === false ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                                        padding: '2px 6px',
                                                        borderRadius: 'var(--radius-xs)',
                                                        border: '1px solid ' + (stat.trendUp === true ? 'rgba(34,197,94,0.15)' : stat.trendUp === false ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)')
                                                    }}>
                                                        {stat.trend}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 4px', color: '#fff' }}>{stat.val}</h3>
                                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{stat.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Visual Analytics Chart Widget */}
                            <div className="flex flex-col lg:flex-row" style={{ gap: 20, alignItems: 'stretch' }}>
                                <MeetingTrendsChart meetings={historyItems} />
                            </div>

                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]" style={{ gap: 28, alignItems: 'start' }}>
                                {/* Upcoming Meetings List */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>Upcoming Scheduled Conferences</h3>
                                    {scheduledItems.length === 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '40px 20px',
                                            textAlign: 'center',
                                            background: 'rgba(255, 255, 255, 0.01)',
                                            border: '1px dashed var(--color-border)',
                                            borderRadius: 'var(--radius-lg)',
                                            margin: '10px 0'
                                        }}>
                                            <span style={{ fontSize: '2rem', marginBottom: 12 }}>📅</span>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>No Scheduled Conferences</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 16px', maxWidth: 280, lineHeight: 1.4 }}>
                                                Plan upcoming room sessions or schedule instant video conferences for your workspace.
                                            </p>
                                            <button onClick={() => {
                                                const inputEl = document.querySelector('input[placeholder*="sync"]') as HTMLInputElement;
                                                if (inputEl) inputEl.focus();
                                            }} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                                                Schedule Call
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {scheduledItems.map(item => (
                                                <div key={item.id} className="glass-card-sm" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{item.title}</h4>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                            📅 Scheduled (ID: {item.id}) • Host: {item.host}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => setActiveTab('meeting')} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                                                        Join Room
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Scheduler form */}
                                <form onSubmit={handleScheduleSubmit} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>Quick Conference Scheduler</h3>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Plan meetings, repeat daily, and auto-email invite links to team members.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setScheduleTitle('JTS Middle East Daily Morning Sync')
                                                setScheduleTime('11:00')
                                                setIsRecurringDaily(true)
                                                setNotifyTeamByEmail(true)
                                            }}
                                            className="btn btn-secondary text-xs"
                                            style={{ padding: '4px 10px', fontSize: '0.725rem', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                                        >
                                            ⚡ 11:00 AM Daily Preset
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Topic / Title</label>
                                        <input
                                            type="text" required value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)}
                                            placeholder="e.g., JTS Middle East Daily Standup"
                                            className="input py-2 px-3"
                                        />
                                    </div>

                                    {teams.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Target Department / Team</label>
                                            <select
                                                value={scheduleTeamId}
                                                onChange={(e) => setScheduleTeamId(e.target.value)}
                                                className="input py-2 px-3"
                                                style={{ cursor: 'pointer', background: '#18181b', color: '#fff' }}
                                            >
                                                <option value="">🏢 Entire Organization (All Members)</option>
                                                {teams.map(t => (
                                                    <option key={t._id} value={t._id}>👥 {t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Date</label>
                                            <input
                                                type="date" required value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                                                className="input py-2 px-3"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Time</label>
                                            <input
                                                type="time" required value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                                                className="input py-2 px-3"
                                            />
                                        </div>
                                    </div>

                                    {/* Automated Scheduling & Notification Options */}
                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#fff' }}>
                                            <input
                                                type="checkbox"
                                                checked={isRecurringDaily}
                                                onChange={(e) => setIsRecurringDaily(e.target.checked)}
                                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span>🔁 <strong>Repeat Daily</strong> (Roz Morning {scheduleTime} baje automatic schedule)</span>
                                        </label>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#fff' }}>
                                            <input
                                                type="checkbox"
                                                checked={notifyTeamByEmail}
                                                onChange={(e) => setNotifyTeamByEmail(e.target.checked)}
                                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span>📧 <strong>Auto-Email & Notify Team</strong> (1-Click Join Link with Email Alert)</span>
                                        </label>
                                    </div>

                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px', width: '100%', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: '10px' }}>
                                        <span>📅</span> Confirm and Schedule Conference
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* HISTORY LOG TAB */}
                    {activeTab === 'history' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vw, 20px)', boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Conference History Log</h2>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Review past sessions, download recordings, and inspect attendee analytics.</p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: windowWidth < 640 ? '100%' : 'auto' }}>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by ID or topic..."
                                        className="input py-2 px-3"
                                        style={{ width: windowWidth < 640 ? '100%' : 240, fontSize: '0.8125rem' }}
                                    />
                                    <button
                                        onClick={() => {
                                            const newRoomId = `instant_${Date.now()}`
                                            setMeetingId(newRoomId)
                                            setActiveTab('meeting')
                                        }}
                                        className="btn btn-primary"
                                        style={{ padding: '8px 14px', fontSize: '0.8125rem', whiteSpace: 'nowrap', borderRadius: '10px' }}
                                    >
                                        ⚡ Instant Room
                                    </button>
                                </div>
                            </div>

                            {/* Summary Metrics Bar */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                                {[
                                    { label: 'Total Sessions', value: historyItems.length, icon: '📅', color: '#6366f1' },
                                    { label: 'Recorded Sessions', value: historyItems.filter(i => i.recorded).length, icon: '📹', color: '#ec4899' },
                                    { label: 'Total Attendees', value: historyItems.reduce((acc, curr) => acc + (curr.participants || 1), 0), icon: '👥', color: '#22c55e' },
                                    {
                                        label: 'Est. Total Time',
                                        value: `${historyItems.reduce((acc, curr) => {
                                            const match = curr.duration?.match(/(\d+)m/)
                                            return acc + (match ? parseInt(match[1], 10) : 15)
                                        }, 0)} mins`,
                                        icon: '⏱️',
                                        color: '#f59e0b'
                                    }
                                ].map((stat, idx) => (
                                    <div key={idx} className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${stat.color}18`, border: `1px solid ${stat.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{stat.value}</div>
                                            <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* History filter tabs */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { id: 'all', label: 'All Sessions' },
                                    { id: 'recorded', label: 'Recorded Only' },
                                    { id: 'regular', label: 'Standard Calls' }
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setHistoryFilter(btn.id as any)}
                                        style={{
                                            border: 'none',
                                            background: historyFilter === btn.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                                            color: historyFilter === btn.id ? '#818cf8' : 'var(--color-text-muted)',
                                            padding: '6px 14px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            {/* History Log Display */}
                            {historyItems.length === 0 ? (
                                <div className="glass-card" style={{ padding: 'clamp(32px, 5vw, 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '260px', height: '160px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                                    <div style={{
                                        width: 68, height: 68, borderRadius: '22px',
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                                        border: '1px solid rgba(99,102,241,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem',
                                        boxShadow: '0 0 25px rgba(99,102,241,0.2)'
                                    }}>
                                        📜
                                    </div>
                                    <div style={{ maxWidth: 480 }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>No Past Sessions Logged</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                                            Your meeting attendance logs, session durations, and cloud recordings will be archived here once your meetings conclude.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                                        <button
                                            onClick={() => {
                                                const newRoomId = `instant_${Date.now()}`
                                                setMeetingId(newRoomId)
                                                setActiveTab('meeting')
                                            }}
                                            className="btn btn-primary"
                                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px' }}
                                        >
                                            <span>⚡</span> Start Instant Meeting
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('dashboard')}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px' }}
                                        >
                                            <span>📅</span> Plan a Meeting
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="responsive-table-container" style={{ margin: 0 }}>
                                    <table className="premium-table">
                                        <thead>
                                            <tr>
                                                <th>Topic / Session ID</th>
                                                <th>Date & Time</th>
                                                <th>Duration</th>
                                                <th>Members</th>
                                                <th>Status</th>
                                                <th>Backups</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHistory.length === 0 ? (
                                                <tr className="empty-row">
                                                    <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: '2rem' }}>🔍</span>
                                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>No matching sessions found</h4>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, maxWidth: 300, lineHeight: 1.4 }}>
                                                                Check your search query or clear the active filter tabs to view past sessions.
                                                            </p>
                                                            {searchQuery && (
                                                                <button onClick={() => setSearchQuery('')} className="btn btn-secondary text-xs" style={{ marginTop: 8, padding: '4px 12px', borderRadius: '8px' }}>
                                                                    Reset Search
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredHistory.map(item => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div style={{ fontWeight: 600, color: '#fff' }}>{item.title}</div>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.id}</span>
                                                        </td>
                                                        <td style={{ color: 'var(--color-text-secondary)' }}>{item.date} at {item.time}</td>
                                                        <td style={{ color: 'var(--color-text-secondary)' }}>{item.duration}</td>
                                                        <td style={{ color: 'var(--color-text-secondary)' }}>👤 {item.participants} users</td>
                                                        <td>
                                                            <span className="badge badge-success">{item.status}</span>
                                                        </td>
                                                        <td>
                                                            {item.recorded ? (
                                                                <span className="badge badge-danger" style={{ display: 'inline-flex', gap: 4, cursor: 'pointer' }} title="Click to download file">
                                                                    ⬇ MP4 Recording
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Unavailable</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SCHEDULED CALENDAR TAB */}
                    {activeTab === 'scheduled' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vw, 20px)', boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Planned Conferences</h2>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Review schedules, share invites, and initiate meeting rooms.</p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px' }}
                                >
                                    <span>📅</span> Schedule New
                                </button>
                            </div>

                            {scheduledItems.length === 0 ? (
                                <div className="glass-card" style={{ padding: 'clamp(32px, 5vw, 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '260px', height: '160px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                                    <div style={{
                                        width: 68, height: 68, borderRadius: '22px',
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                                        border: '1px solid rgba(99,102,241,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem',
                                        boxShadow: '0 0 25px rgba(99,102,241,0.2)'
                                    }}>
                                        📅
                                    </div>
                                    <div style={{ maxWidth: 480 }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>No Planned Conferences</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                                            You don't have any upcoming meetings scheduled. Plan your next conference, invite attendees, or launch an instant meeting right now.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                                        <button
                                            onClick={() => setActiveTab('dashboard')}
                                            className="btn btn-primary"
                                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px' }}
                                        >
                                            <span>📅</span> Schedule a Meeting
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newRoomId = `instant_${Date.now()}`
                                                setMeetingId(newRoomId)
                                                setActiveTab('meeting')
                                            }}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px' }}
                                        >
                                            <span>⚡</span> Start Instant Meeting
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {scheduledItems.map(item => (
                                        <div key={item.id} className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', flexShrink: 0
                                                }}>
                                                    📅
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff' }}>{item.title}</h4>
                                                        {item.isRecurring && (
                                                            <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                                🔁 Daily at {item.time}
                                                            </span>
                                                        )}
                                                        {item.notifyByEmail && (
                                                            <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                                📧 Auto-Email
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: 3 }}>
                                                        Meeting ID: <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{item.id}</span> • Time: {item.date} at {item.time}
                                                    </span>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                        Host: <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{item.host}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', maxWidth: 'max-content' }} className="w-full sm:w-auto">
                                                <button onClick={() => {
                                                    const joinLink = `${window.location.origin}/meet/${item.id}`
                                                    navigator.clipboard.writeText(`Join meeting "${item.title}" via JTS-Meet: ${joinLink}`)
                                                    alert('Invite link copied to clipboard!')
                                                }} className="btn btn-secondary flex-1 sm:flex-none" style={{ padding: '7px 14px', fontSize: '0.75rem', whiteSpace: 'nowrap', borderRadius: '8px' }}>
                                                    Copy Invite
                                                </button>
                                                <button onClick={() => {
                                                    setMeetingId(item.id)
                                                    setActiveTab('meeting')
                                                }} className="btn btn-primary flex-1 sm:flex-none" style={{ padding: '7px 14px', fontSize: '0.75rem', whiteSpace: 'nowrap', borderRadius: '8px' }}>
                                                    Start Room
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ORGANIZATIONS TAB */}
                    {activeTab === 'organization' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
                            <OrganizationSettingsPage
                                token={token}
                                organizationId={currentOrgId || undefined}
                                organizations={organizations}
                                onSelectOrganization={(id) => setCurrentOrgId(id)}
                                onOrganizationCreated={(newOrg) => {
                                    setOrganizations(prev => [...prev, newOrg])
                                    setCurrentOrgId(newOrg._id)
                                    fetchOrganizations()
                                }}
                            />
                        </div>
                    )}

                    {/* TEAMS SETTINGS TAB */}
                    {activeTab === 'team' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
                            <TeamSettingsPage token={token} organizationId={currentOrgId || undefined} currentUserId={userId} />
                        </div>
                    )}

                    {/* CHANNELS SETTINGS TAB */}
                    {activeTab === 'channel' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '10px 8px' : '12px 16px', maxWidth: 1320, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 'calc(100vh - 76px)', boxSizing: 'border-box' }}>
                            {currentTeamId ? (
                                <ChannelSettingsPage token={token} organizationId={currentOrgId || undefined} teamId={currentTeamId} />
                            ) : (
                                <div className="glass-card" style={{ padding: 'clamp(24px, 4vw, 36px)', margin: '16px 0', textAlign: 'center' }}>
                                    <h3 style={{ color: '#fff', marginBottom: 8 }}>No Team Available</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                        Please create a team in the "Teams Settings" tab first.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* USER PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1000, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>User Profile & Preferences</h2>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Configure personal details, connected media hardware, and room defaults.</p>
                            </div>

                            {profileSaveSuccess && (
                                <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '12px 18px', borderRadius: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span>✓</span>
                                    <span>Profile settings updated successfully!</span>
                                </div>
                            )}

                            {profileError && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 18px', borderRadius: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span>⚠</span>
                                    <span>{profileError}</span>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 768 ? '1fr' : '1fr 1fr', gap: 20 }}>
                                {/* Left Column: Identity & Account */}
                                <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{
                                            width: 60, height: 60, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.6rem', fontWeight: 800, color: '#fff', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)', flexShrink: 0
                                        }}>
                                            {profileName.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>{profileName}</h3>
                                                <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                    Member
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                                                <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>Active Online</span>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Full Display Name</label>
                                            <input
                                                type="text"
                                                value={profileName}
                                                onChange={(e) => setProfileName(e.target.value)}
                                                className="input"
                                                style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                                                placeholder="Enter your name"
                                                required
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Email Address</label>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>🔒 Verified</span>
                                            </div>
                                            <input
                                                type="email"
                                                value={profileEmail}
                                                disabled
                                                className="input"
                                                style={{ padding: '10px 14px', fontSize: '0.875rem', opacity: 0.7, cursor: 'not-allowed' }}
                                            />
                                        </div>

                                        {userId && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Personal User ID</label>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <input
                                                        type="text"
                                                        value={userId}
                                                        readOnly
                                                        className="input"
                                                        style={{ padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.8 }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(userId)
                                                            alert('User ID copied to clipboard!')
                                                        }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSavingProfile}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '10px 18px',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                marginTop: 6,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                borderRadius: '10px'
                                            }}
                                        >
                                            {isSavingProfile ? (
                                                <>
                                                    <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <span>💾</span> Save Changes
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>

                                {/* Right Column: Hardware Defaults & Meeting Prefs */}
                                <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>⚙️</span> Connected Hardware & Audio
                                    </h3>

                                    {/* Microphone Selector & Tester */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Default Microphone</label>
                                        <select
                                            value={selectedAudioDevice}
                                            onChange={(e) => {
                                                setSelectedAudioDevice(e.target.value)
                                                localStorage.setItem('jts_default_mic', e.target.value)
                                            }}
                                            className="input"
                                            style={{ padding: '8px 12px', fontSize: '0.8125rem', cursor: 'pointer' }}
                                        >
                                            {audioDevices.length > 0 ? (
                                                audioDevices.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId} style={{ background: '#18181b', color: '#fff' }}>
                                                        {d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" style={{ background: '#18181b', color: '#fff' }}>Default System Microphone</option>
                                            )}
                                        </select>

                                        {/* Mic Test Bar */}
                                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Mic Input Volume:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsTestingMic(!isTestingMic)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '6px' }}
                                                >
                                                    {isTestingMic ? 'Stop Test' : 'Test Mic'}
                                                </button>
                                            </div>
                                            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${micLevel}%`, height: '100%', background: micLevel > 75 ? '#ef4444' : micLevel > 35 ? '#22c55e' : '#6366f1', transition: 'width 60ms linear' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Camera Selector */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Default Video Camera</label>
                                        <select
                                            value={selectedVideoDevice}
                                            onChange={(e) => {
                                                setSelectedVideoDevice(e.target.value)
                                                localStorage.setItem('jts_default_cam', e.target.value)
                                            }}
                                            className="input"
                                            style={{ padding: '8px 12px', fontSize: '0.8125rem', cursor: 'pointer' }}
                                        >
                                            {videoDevices.length > 0 ? (
                                                videoDevices.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId} style={{ background: '#18181b', color: '#fff' }}>
                                                        {d.label || `Camera (${d.deviceId.slice(0, 8)}...)`}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" style={{ background: '#18181b', color: '#fff' }}>Default System Camera</option>
                                            )}
                                        </select>
                                    </div>

                                    <div style={{ width: '100%', height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

                                    {/* Meeting In-Room Defaults */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>In-Call Preferences</label>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                            <input
                                                type="checkbox"
                                                checked={autoMuteMic}
                                                onChange={(e) => {
                                                    setAutoMuteMic(e.target.checked)
                                                    localStorage.setItem('jts_pref_auto_mute', e.target.checked.toString())
                                                }}
                                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span>Mute microphone when entering rooms</span>
                                        </label>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                            <input
                                                type="checkbox"
                                                checked={autoMuteCam}
                                                onChange={(e) => {
                                                    setAutoMuteCam(e.target.checked)
                                                    localStorage.setItem('jts_pref_auto_cam_off', e.target.checked.toString())
                                                }}
                                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span>Turn off camera when entering rooms</span>
                                        </label>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                            <input
                                                type="checkbox"
                                                checked={noiseSuppression}
                                                onChange={(e) => {
                                                    setNoiseSuppression(e.target.checked)
                                                    localStorage.setItem('jts_pref_noise_suppr', e.target.checked.toString())
                                                }}
                                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span>Enable AI background noise suppression</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </Suspense>
            </main>

            {/* 1-on-1 Direct Dialing Modal */}
            {showDirectDialModal && (
                <div className="modal-overlay">
                    <div className="modal-container anim-scale-in" style={{ maxWidth: 440 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>📞</span> Direct Ring Colleague
                            </h3>
                            <button onClick={() => setShowDirectDialModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                            Enter your colleague's User ID to ring their workspace with real-time audio chime signaling.
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); handleStartDirectCall(directDialTarget) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input
                                type="text"
                                required
                                value={directDialTarget}
                                onChange={(e) => setDirectDialTarget(e.target.value)}
                                placeholder="Colleague User ID (e.g. 64f1a...)"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" onClick={() => setShowDirectDialModal(false)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}>Cancel</button>
                                <button type="submit" disabled={!directDialTarget.trim()} className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                                    <span>📞</span> Call Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Incoming Call Ringing Modal */}
            <IncomingCallModal
                call={incomingCall}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
            />
        </div>
    )
}
