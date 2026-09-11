import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useMeetingContext } from '../../meeting/context/MeetingContext'
import { useSocketContext } from '../../meeting/context/SocketContext'
import { useWebRTCContext } from '../../meeting/context/WebRTCContext'
import { IncomingCallModal, type IncomingCallData } from '../../meeting/components/IncomingCallModal'
import { SocketEvents } from '../../meeting/services/socket.service'
import { API_BASE } from '../../../config'

const MeetingRoom = React.lazy(() => import('../../meeting/components/MeetingRoom').then(m => ({ default: m.MeetingRoom })))
const OrganizationSettingsPage = React.lazy(() => import('../../organization/OrganizationSettingsPage').then(m => ({ default: m.OrganizationSettingsPage })))
const TeamSettingsPage = React.lazy(() => import('../../team/TeamSettingsPage').then(m => ({ default: m.TeamSettingsPage })))
const ChannelSettingsPage = React.lazy(() => import('../../channel/ChannelSettingsPage').then(m => ({ default: m.ChannelSettingsPage })))
const ConferenceHistoryPage = React.lazy(() => import('../../history/ConferenceHistoryPage').then(m => ({ default: m.ConferenceHistoryPage })))
const ScheduledMeetingsPage = React.lazy(() => import('../../scheduled/ScheduledMeetingsPage').then(m => ({ default: m.ScheduledMeetingsPage })))
const MeetingTrendsChart = React.lazy(() => import('./MeetingTrendsChart').then(m => ({ default: m.MeetingTrendsChart })))
const EnterpriseDashboardHub = React.lazy(() => import('./EnterpriseDashboardHub').then(m => ({ default: m.EnterpriseDashboardHub })))
const UserProfileSettingsHub = React.lazy(() => import('../../profile/UserProfileSettingsHub').then(m => ({ default: m.UserProfileSettingsHub })))
const AdminConsoleHub = React.lazy(() => import('../../admin/AdminConsoleHub').then(m => ({ default: m.AdminConsoleHub })))
const SuperAdminMasterHub = React.lazy(() => import('../../admin/SuperAdminMasterHub').then(m => ({ default: m.SuperAdminMasterHub })))

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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'admin' | 'super-admin' | 'profile'>(() => {
        const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
        const validTabs = ['dashboard', 'meeting', 'history', 'scheduled', 'organization', 'team', 'channel', 'admin', 'super-admin', 'profile']
        if (validTabs.includes(hash)) {
            return hash as any
        }
        try {
            const saved = sessionStorage.getItem('jts_active_tab') || localStorage.getItem('jts_active_tab')
            if (saved && validTabs.includes(saved)) {
                return saved as any
            }
        } catch (_) {}
        return 'dashboard'
    })

    // Keep URL hash & storage synced whenever activeTab changes
    useEffect(() => {
        if (activeTab) {
            const currentHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
            if (currentHash !== activeTab) {
                window.location.hash = `#${activeTab}`
            }
            try {
                sessionStorage.setItem('jts_active_tab', activeTab)
                localStorage.setItem('jts_active_tab', activeTab)
            } catch (_) {}
        }
    }, [activeTab])

    // Listen for browser back/forward and hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
            const validTabs = ['dashboard', 'meeting', 'history', 'scheduled', 'organization', 'team', 'channel', 'admin', 'super-admin', 'profile']
            if (validTabs.includes(hash)) {
                setActiveTab(hash as any)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const [searchQuery, setSearchQuery] = useState('')
    const [historyFilter, setHistoryFilter] = useState<'all' | 'recorded' | 'regular'>('all')

    const { joined, setMeetingId } = useMeetingContext()
    const { socket, connectSocket, connected } = useSocketContext()
    const { stopMedia } = useWebRTCContext()
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
    const [showDirectDialModal, setShowDirectDialModal] = useState(false)
    const [directDialTarget, setDirectDialTarget] = useState('')

    // Automatically release and turn off camera & microphone hardware when switching away from meeting room
    useEffect(() => {
        if (activeTab !== 'meeting' && !joined) {
            stopMedia()
        }
    }, [activeTab, joined, stopMedia])

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

    // Profile States
    const [profileName, setProfileName] = useState('Team Member')
    const [profileEmail, setProfileEmail] = useState('member@jtsmeet.com')
    const [profileImage, setProfileImage] = useState('')
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
    const [loadingOrgs, setLoadingOrgs] = useState(true)
    const [currentOrgId, setCurrentOrgId] = useState<string>(() => {
        try { return localStorage.getItem('jts_current_org_id') || '' } catch { return '' }
    })
    const [teams, setTeams] = useState<any[]>([])
    const [loadingTeams, setLoadingTeams] = useState(false)
    const [currentTeamId, setCurrentTeamId] = useState<string>(() => {
        try { return localStorage.getItem('jts_current_team_id') || '' } catch { return '' }
    })

    useEffect(() => {
        if (currentOrgId) {
            try { localStorage.setItem('jts_current_org_id', currentOrgId) } catch (_) {}
        }
    }, [currentOrgId])

    useEffect(() => {
        if (currentTeamId) {
            try { localStorage.setItem('jts_current_team_id', currentTeamId) } catch (_) {}
        }
    }, [currentTeamId])

    const currentOrg = useMemo(() => organizations.find(org => org._id === currentOrgId), [organizations, currentOrgId])
    const userMemberEntry = useMemo(() => currentOrg?.members?.find((m: any) =>
        (m.userId?._id || m.userId || '').toString() === userId.toString()
    ), [currentOrg, userId])

    const isSuperAdmin = useMemo(() => profileEmail?.toLowerCase().trim() === 'admin@jtsmeet.com', [profileEmail])
    const isOrgAdminOrOwner = useMemo(() => {
        if (isSuperAdmin) return true
        if (!currentOrg || !userId) return false
        const isOwner = (currentOrg.ownerId?._id || currentOrg.ownerId || '').toString() === userId.toString()
        const isMemberAdmin = userMemberEntry && (userMemberEntry.role === 'owner' || userMemberEntry.role === 'admin')
        return Boolean(isOwner || isMemberAdmin)
    }, [isSuperAdmin, currentOrg, userId, userMemberEntry])

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
                    if (data.data.profileImage) {
                        setProfileImage(data.data.profileImage)
                    }
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
                    const history = list.filter(m => m.status === 'ended').map(m => {
                        let durationMinutes = 15
                        if (m.endedAt && m.startedAt) {
                            durationMinutes = Math.max(1, Math.round((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 60000))
                        }
                        const durationDisplay = durationMinutes >= 60
                            ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                            : `${durationMinutes}m`

                        return {
                            id: m.meetingId,
                            title: m.title || `Meeting ${m.meetingId}`,
                            date: m.startedAt ? new Date(m.startedAt).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString(),
                            time: m.startedAt ? new Date(m.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            duration: durationDisplay,
                            durationMinutes,
                            participants: Array.isArray(m.participants) && m.participants.length > 0 ? m.participants.length : 1,
                            participantsList: Array.isArray(m.participants) && m.participants.length > 0
                                ? m.participants
                                : (m.host && typeof m.host === 'object' ? [{ ...m.host, role: 'owner' }] : []),
                            host: m.host || 'Organizer',
                            recorded: !!m.recordingUrl || !!m.isRecordingActive,
                            recordingUrl: m.recordingUrl || '',
                            status: 'Completed',
                            rawStartedAt: m.startedAt || m.createdAt,
                            rawEndedAt: m.endedAt
                        }
                    })

                    // Map to scheduled list
                    const scheduled = list.filter(m => m.status === 'scheduled' || m.status === 'active').map(m => ({
                        id: m.meetingId,
                        title: m.title || `Conference ${m.meetingId}`,
                        date: m.scheduledDate || (m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
                        time: m.scheduledTime ? `${m.scheduledTime}` : (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:00 AM'),
                        duration: '30m',
                        host: typeof m.host === 'object' ? m.host?.fullName || 'Host' : (m.host || 'Host'),
                        hostId: typeof m.host === 'object' ? m.host?._id || m.host?.id : m.host,
                        isRecurring: m.isRecurring || false,
                        recurrencePattern: m.recurrencePattern || 'none',
                        notifyByEmail: m.notifyByEmail !== false,
                        isWaitingRoomEnabled: m.isWaitingRoomEnabled !== false,
                        organizationId: m.organizationId,
                        teamId: m.teamId ? (typeof m.teamId === 'object' ? m.teamId?._id : m.teamId) : '',
                        teamName: m.teamId && typeof m.teamId === 'object' ? m.teamId?.name : '',
                        status: m.status || 'scheduled'
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
        setLoadingOrgs(true)
        try {
            const response = await fetch(`${API_BASE}/api/organization/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data && data.data.length > 0) {
                    setOrganizations(data.data)
                    const savedOrgId = localStorage.getItem('jts_current_org_id')
                    const matched = data.data.find((o: any) => o._id === savedOrgId)
                    if (matched) {
                        setCurrentOrgId(matched._id)
                    } else if (!currentOrgId || !data.data.some((o: any) => o._id === currentOrgId)) {
                        setCurrentOrgId(data.data[0]._id)
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load user organizations:', err)
        } finally {
            setLoadingOrgs(false)
        }
    }

    const fetchTeams = async (orgId: string) => {
        if (!orgId || !token) {
            setTeams([])
            setCurrentTeamId('')
            return
        }
        setLoadingTeams(true)
        try {
            const response = await fetch(`${API_BASE}/api/team/organization/${orgId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data) {
                    setTeams(data.data)
                    const savedTeamId = localStorage.getItem('jts_current_team_id')
                    const matched = data.data.find((t: any) => t._id === savedTeamId)
                    if (matched) {
                        setCurrentTeamId(matched._id)
                    } else if (data.data.length > 0) {
                        setCurrentTeamId(data.data[0]._id)
                    } else {
                        setCurrentTeamId('')
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load teams:', err)
        } finally {
            setLoadingTeams(false)
        }
    }

    useEffect(() => {
        fetchProfile()
        fetchMeetings()
        fetchOrganizations()
    }, [token, activeTab])

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
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', width: '100%', alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center' }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: false, superAdminOnly: false },
                        { id: 'meeting', label: 'Meeting Room', icon: '📹', adminOnly: false, superAdminOnly: false },
                        { id: 'history', label: 'History log', icon: '📜', adminOnly: false, superAdminOnly: false },
                        { id: 'scheduled', label: 'Scheduled', icon: '📅', adminOnly: false, superAdminOnly: false },
                        { id: 'organization', label: 'Organizations', icon: '🏢', adminOnly: false, superAdminOnly: false },
                        { id: 'team', label: 'Teams Settings', icon: '👥', adminOnly: true, superAdminOnly: false },
                        { id: 'channel', label: 'Channels Settings', icon: '💬', adminOnly: true, superAdminOnly: false },
                        { id: 'admin', label: 'Admin Console', icon: '🛡️', adminOnly: true, superAdminOnly: false },
                        { id: 'super-admin', label: 'Platform Center', icon: '🌐', adminOnly: false, superAdminOnly: true },
                        { id: 'profile', label: 'User Profile', icon: '👤', adminOnly: false, superAdminOnly: false }
                    ].filter(item => {
                        if (item.superAdminOnly) return isSuperAdmin
                        if (item.adminOnly) return isOrgAdminOrOwner
                        return true
                    }).map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id as any)
                                window.location.hash = `#${item.id}`
                                try {
                                    sessionStorage.setItem('jts_active_tab', item.id)
                                    localStorage.setItem('jts_active_tab', item.id)
                                } catch (_) {}
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
            <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: (activeTab === 'meeting' || activeTab === 'channel') ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', position: 'relative', outline: 'none' }}>
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
                                 activeTab === 'admin' ? 'Admin Console' :
                                 activeTab === 'super-admin' ? 'Master Platform Center' :
                                 activeTab === 'profile' ? 'Profile' : activeTab}
                            </span>
                        </div>

                        {/* Right Side: Organization Switcher & User Profile Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                            padding: '5px 10px',
                                            color: '#fff',
                                            outline: 'none',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            minWidth: 150,
                                            maxWidth: windowWidth < 480 ? '160px' : 'none',
                                            width: 'auto'
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

                            {/* User Profile Pill button */}
                            <button
                                onClick={() => setActiveTab('profile')}
                                title={`Signed in as ${profileName} - Settings Hub`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: activeTab === 'profile' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                    border: activeTab === 'profile' ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    padding: '3px 10px 3px 4px',
                                    borderRadius: 9999,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                    {profileImage ? (
                                        <img src={profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        profileName.slice(0, 2).toUpperCase()
                                    )}
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hidden sm:inline">
                                    {profileName.split(' ')[0]}
                                </span>
                            </button>
                        </div>
                    </header>
                )}
                <Suspense fallback={<WorkspaceTabSkeleton />}>
                    {/* MEETING TAB */}
                    {activeTab === 'meeting' && (
                        <div style={{ width: '100%', height: '100%' }}>
                            <MeetingRoom initialToken={token} isAdminOrOwner={isOrgAdminOrOwner} />
                        </div>
                    )}

                    {/* DASHBOARD TAB (ENTERPRISE ZOOM / TEAMS GRADE HUB) */}
                    {activeTab === 'dashboard' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1220, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <EnterpriseDashboardHub
                                profileName={profileName}
                                profileEmail={profileEmail}
                                profileImage={profileImage}
                                userId={userId}
                                token={token}
                                historyItems={historyItems}
                                scheduledItems={scheduledItems}
                                organizations={organizations}
                                currentOrgId={currentOrgId}
                                teams={teams}
                                currentTeamId={currentTeamId}
                                onStartMeeting={(meetId) => {
                                    if (meetId) {
                                        setMeetingId(meetId)
                                    }
                                    setActiveTab('meeting')
                                }}
                                onNavigateTab={(tab) => setActiveTab(tab)}
                                onOpenDirectDial={(targetId) => {
                                    if (targetId) {
                                        handleStartDirectCall(targetId)
                                    } else {
                                        setShowDirectDialModal(true)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* HISTORY LOG TAB */}
                    {activeTab === 'history' && (
                        <Suspense fallback={<WorkspaceTabSkeleton />}>
                            <ConferenceHistoryPage
                                historyItems={historyItems}
                                token={token}
                                currentUserId={userId}
                                onStartMeeting={(mId) => {
                                    setMeetingId(mId)
                                    setActiveTab('meeting')
                                }}
                                onRefresh={fetchMeetings}
                                onDeleteSuccess={(mId) => {
                                    setHistoryItems(prev => prev.filter(item => item.id !== mId))
                                }}
                            />
                        </Suspense>
                    )}

                    {/* SCHEDULED CALENDAR TAB */}
                    {activeTab === 'scheduled' && (
                        <Suspense fallback={<WorkspaceTabSkeleton />}>
                            <ScheduledMeetingsPage
                                scheduledItems={scheduledItems}
                                token={token}
                                currentUserId={userId}
                                currentOrgId={currentOrgId || undefined}
                                teams={teams}
                                onStartMeeting={(mId) => {
                                    setMeetingId(mId)
                                    setActiveTab('meeting')
                                }}
                                onRefresh={fetchMeetings}
                                onMeetingCreated={fetchMeetings}
                            />
                        </Suspense>
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
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '6px' : '10px 14px', maxWidth: 1440, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, height: 'calc(100vh - 56px)', minHeight: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
                            {currentTeamId ? (
                                <ChannelSettingsPage
                                    token={token}
                                    organizationId={currentOrgId || undefined}
                                    teamId={currentTeamId}
                                    currentUserId={userId}
                                    teams={teams}
                                    onSelectTeam={(newTeamId) => setCurrentTeamId(newTeamId)}
                                    onStartMeeting={(meetId) => {
                                        setMeetingId(meetId)
                                        setActiveTab('meeting')
                                    }}
                                />
                            ) : (loadingOrgs || loadingTeams) ? (
                                <WorkspaceTabSkeleton />
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

                    {/* ENTERPRISE ADMIN CONSOLE HUB */}
                    {activeTab === 'admin' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1320, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <AdminConsoleHub
                                token={token}
                                currentUserId={userId}
                                currentOrgId={currentOrgId || undefined}
                                organizations={organizations}
                            />
                        </div>
                    )}

                    {/* SUPER ADMIN MASTER PLATFORM CENTER */}
                    {activeTab === 'super-admin' && isSuperAdmin && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1320, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <SuperAdminMasterHub token={token} currentUserId={userId} />
                        </div>
                    )}

                    {/* USER PROFILE & PREFERENCES HUB (Microsoft Teams / Zoom Style) */}
                    {activeTab === 'profile' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <UserProfileSettingsHub
                                token={token}
                                userId={userId}
                                profileName={profileName}
                                setProfileName={setProfileName}
                                profileEmail={profileEmail}
                                profileImage={profileImage}
                                onProfileUpdated={(updated) => {
                                    if (updated.fullName) setProfileName(updated.fullName)
                                    if (updated.profileImage) setProfileImage(updated.profileImage)
                                }}
                            />
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
