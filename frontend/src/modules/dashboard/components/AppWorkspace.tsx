import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useMeetingContext } from '../../meeting/context/MeetingContext'
import { useSocketContext } from '../../meeting/context/SocketContext'
import { useWebRTCContext } from '../../meeting/context/WebRTCContext'
import { IncomingCallModal, type IncomingCallData } from '../../meeting/components/IncomingCallModal'
import { OutgoingCallModal, type OutgoingCallData } from '../../meeting/components/OutgoingCallModal'
import { ActiveAudioCallModal, type ActiveCallData } from '../../meeting/components/ActiveAudioCallModal'
import { SocketEvents } from '../../meeting/services/socket.service'
import { API_BASE } from '../../../config'
import { IconPhone, IconX } from '../../../components/common/Icons'
import { UserStatusSelectorPopover } from '../../../components/common/UserStatusSelectorPopover'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { pushNotificationService } from '../../../services/pushNotification.service'

const MeetingRoom = React.lazy(() => import('../../meeting/components/MeetingRoom').then(m => ({ default: m.MeetingRoom })))
const DirectMessagesHub = React.lazy(() => import('../../chat/components/DirectMessagesHub').then(m => ({ default: m.DirectMessagesHub })))
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
    initialMeetingId?: string
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

export function AppWorkspace({ token, initialMeetingId, onLogout }: AppWorkspaceProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'meeting' | 'chat' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'admin' | 'super-admin' | 'profile'>(() => {
        // If there is an active meeting from URL or props, navigate directly to meeting tab!
        const pathnameMatch = window.location.pathname.match(/^\/(?:meet|join)\/([a-zA-Z0-9\-_]+)/)
        const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
        const searchParams = new URLSearchParams(window.location.search)
        const hasMeetingInUrl = !!initialMeetingId || !!pathnameMatch || hash === 'meeting' || searchParams.has('id') || searchParams.has('meetingId')
        if (hasMeetingInUrl) {
            return 'meeting'
        }

        const validTabs = ['dashboard', 'meeting', 'chat', 'history', 'scheduled', 'organization', 'team', 'channel', 'admin', 'super-admin', 'profile']
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
            const validTabs = ['dashboard', 'meeting', 'chat', 'history', 'scheduled', 'organization', 'team', 'channel', 'admin', 'super-admin', 'profile']
            if (validTabs.includes(hash)) {
                setActiveTab(hash as any)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const [searchQuery, setSearchQuery] = useState('')
    const [historyFilter, setHistoryFilter] = useState<'all' | 'recorded' | 'regular'>('all')

    // Profile States
    const [profileName, setProfileName] = useState('Team Member')
    const [profileEmail, setProfileEmail] = useState('member@jtsmeet.com')
    const [profileImage, setProfileImage] = useState('')
    const [profileImageError, setProfileImageError] = useState(false)
    const [userId, setUserId] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
    const [profileError, setProfileError] = useState('')

    useEffect(() => {
        setProfileImageError(false)
    }, [profileImage])

    const { joined, setMeetingId, meetingId } = useMeetingContext()
    const { socket, connectSocket, connected } = useSocketContext()
    const { connectToMeeting, leaveMeeting, requestMedia, stopMedia, startScreenShare } = useWebRTCContext()
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
    const [outgoingCall, setOutgoingCall] = useState<OutgoingCallData | null>(null)
    const [activeAudioCall, setActiveAudioCall] = useState<ActiveCallData | null>(() => {
        try {
            const saved = sessionStorage.getItem('jts_active_direct_call')
            if (saved) {
                return JSON.parse(saved)
            }
        } catch (_) {}
        return null
    })
    const outgoingCallRef = React.useRef<OutgoingCallData | null>(null)
    outgoingCallRef.current = outgoingCall
    const activeAudioCallRef = React.useRef<ActiveCallData | null>(null)
    activeAudioCallRef.current = activeAudioCall
    const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(false)

    // Register Web Push Service Worker and prompt for notifications
    useEffect(() => {
        if (pushNotificationService.isSupported()) {
            pushNotificationService.registerServiceWorker()

            if (Notification.permission === 'granted') {
                pushNotificationService.subscribeUser(token).catch(() => {})
            } else if (Notification.permission === 'default') {
                const dismissed = localStorage.getItem('jts_push_prompt_dismissed') === 'true'
                if (!dismissed) {
                    const timer = setTimeout(() => setShowNotificationPrompt(true), 4000)
                    return () => clearTimeout(timer)
                }
            }
        }
    }, [token])

    // Pending call to auto-accept once socket is connected (when tab is opened via push notification)
    const [pendingPushCall, setPendingPushCall] = useState<IncomingCallData | null>(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search)
            const callMeetingId = searchParams.get('callMeetingId')
            const autoAccept = searchParams.get('autoAccept') === 'true'
            if (callMeetingId && autoAccept) {
                const callerId = searchParams.get('callerId') || ''
                const callerName = searchParams.get('callerName') || 'Colleague'
                const callerAvatar = searchParams.get('callerAvatar') || ''
                const callType = (searchParams.get('callType') as any) || 'video'
                window.history.replaceState(null, '', window.location.pathname + '#chat')
                return {
                    meetingId: callMeetingId,
                    callerId,
                    callerName,
                    callerAvatar,
                    callType
                }
            }
        } catch {}
        return null
    })

    // Sync activeAudioCall with sessionStorage for refresh restoration
    useEffect(() => {
        if (activeAudioCall) {
            try {
                sessionStorage.setItem('jts_active_direct_call', JSON.stringify(activeAudioCall))
            } catch (_) {}
        } else {
            try {
                sessionStorage.removeItem('jts_active_direct_call')
            } catch (_) {}
        }
    }, [activeAudioCall])
    const pendingScreenStreamRef = React.useRef<MediaStream | null>(null)
    const [showDirectDialModal, setShowDirectDialModal] = useState(false)
    const [directDialTarget, setDirectDialTarget] = useState('')

    const [activeMeetingRoomId, setActiveMeetingRoomId] = useState<string>(() => {
        if (initialMeetingId) return initialMeetingId
        try {
            const pathnameMatch = window.location.pathname.match(/^\/(?:meet|join)\/([a-zA-Z0-9\-_]+)/)
            if (pathnameMatch) return pathnameMatch[1]

            const searchParams = new URLSearchParams(window.location.search)
            const queryId = searchParams.get('id') || searchParams.get('meetingId')
            if (queryId) return queryId

            const hashParts = window.location.hash.split('?')
            if (hashParts.length > 1) {
                const params = new URLSearchParams(hashParts[1])
                const qId = params.get('id') || params.get('meetingId')
                if (qId) return qId
            }
            return sessionStorage.getItem('jts_active_meeting_id') || ''
        } catch {
            return ''
        }
    })

    // If initialMeetingId was provided or changes, activate meeting tab
    useEffect(() => {
        const targetId = initialMeetingId || window.location.pathname.match(/^\/(?:meet|join)\/([a-zA-Z0-9\-_]+)/)?.[1]
        if (targetId) {
            setActiveMeetingRoomId(targetId)
            setMeetingId(targetId)
            setActiveTab('meeting')
            sessionStorage.setItem('jts_active_meeting_id', targetId)
        }
    }, [initialMeetingId, setMeetingId])

    const handleLaunchMeeting = useCallback((targetMeetingId?: string) => {
        const cleanId = (targetMeetingId || `room-${Math.random().toString(36).substring(2, 8)}`).trim()
        try {
            sessionStorage.setItem('jts_active_meeting_id', cleanId)
            sessionStorage.setItem(`jts_created_meeting_${cleanId}`, 'true')
            localStorage.setItem('jts_last_meeting_id', cleanId)
        } catch (e) { }
        setMeetingId(cleanId)
        setActiveMeetingRoomId(cleanId)
        window.history.replaceState(null, '', `/#meeting?id=${encodeURIComponent(cleanId)}`)
        setActiveTab('meeting')
    }, [setMeetingId])

    const handleLeaveMeetingRoom = useCallback(() => {
        setActiveMeetingRoomId('')
        setMeetingId('')
        try {
            sessionStorage.removeItem('jts_active_meeting_id')
            sessionStorage.removeItem('jts_meeting_joined')
            localStorage.removeItem('jts_last_meeting_id')
        } catch (e) { }
        window.history.replaceState(null, '', '/#dashboard')
        window.location.hash = '#dashboard'
        setActiveTab('dashboard')
    }, [setMeetingId])

    useEffect(() => {
        if (!joined) {
            const stored = sessionStorage.getItem('jts_active_meeting_id')
            if (!stored && activeMeetingRoomId) {
                setActiveMeetingRoomId('')
            }
        }
    }, [joined, activeMeetingRoomId])

    // Automatically release and turn off camera & microphone hardware when switching away from meeting room
    // BUT: do NOT stop media if a direct call is active (it uses the same streams!)
    useEffect(() => {
        if (activeTab !== 'meeting' && !joined && !activeAudioCall) {
            stopMedia()
        }
    }, [activeTab, joined, stopMedia, activeAudioCall])

    // Ensure socket connected for direct ringing
    useEffect(() => {
        if (token && !connected) {
            connectSocket(token)
        }
    }, [token, connected, connectSocket])

    // Auto-reconnect restored direct call after page refresh
    useEffect(() => {
        if (activeAudioCall && connected && socket && !joined) {
            console.log('[AppWorkspace] Restoring active direct call after refresh:', activeAudioCall)
            const restoreCall = async () => {
                try {
                    if (activeAudioCall.callType === 'audio') {
                        await requestMedia(true)
                    } else {
                        await requestMedia(false)
                    }
                    connectToMeeting(activeAudioCall.meetingId, profileName || 'Colleague', true)
                } catch (err) {
                    console.error('[AppWorkspace] Failed to restore active direct call media:', err)
                }
            }
            restoreCall()
        }
    }, [activeAudioCall, connected, socket, joined, requestMedia, connectToMeeting, profileName])

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

            // Electron desktop app: Flash taskbar & restore window
            if ((window as any).electronAPI?.notifyIncomingCall) {
                (window as any).electronAPI.notifyIncomingCall(data)
            }

            // Show interactive system notification with [Accept] & [Decline] if tab is in background
            if (document.hidden) {
                pushNotificationService.showIncomingCallNotification(data)
            }
        }

        const handleCallCancelled = (data?: any) => {
            console.log('[AppWorkspace] Direct call cancelled or terminated:', data)
            if ((window as any).electronAPI?.dismissIncomingCallAlert) {
                (window as any).electronAPI.dismissIncomingCallAlert()
            }
            if (pendingScreenStreamRef.current) {
                pendingScreenStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch {} })
                pendingScreenStreamRef.current = null
            }
            setIncomingCall(null)
            setOutgoingCall(null)
            if (activeAudioCallRef.current) {
                leaveMeeting()
                stopMedia()
                setActiveAudioCall(null)
            }
        }

        const handleCallAccepted = async (data: any) => {
            console.log('[AppWorkspace] Outgoing call was accepted by peer:', data)
            const target = outgoingCallRef.current
            setOutgoingCall(null)
            const activeMeetingId = data?.meetingId || target?.meetingId
            if (!activeMeetingId) return

            const callType = target?.callType || 'audio'

            // ⚠️ CRITICAL: Switch away from 'meeting' tab and clear meeting room ID
            // so that connectToMeeting (which sets meetingId context) does NOT cause
            // MeetingRoom to auto-join and open in the background.
            setActiveMeetingRoomId('')
            setActiveTab('chat')
            // Clear URL and sessionStorage so hash-based tab detection doesn't re-open meeting room
            window.history.replaceState(null, '', '/#chat')
            try { sessionStorage.removeItem('jts_active_meeting_id') } catch {}

            setActiveAudioCall({
                meetingId: activeMeetingId,
                peerId: target?.targetUserId || data?.calleeId || '',
                peerName: target?.targetName || 'Colleague',
                peerAvatar: target?.targetAvatar,
                callType
            })
            try {
                if (callType === 'audio') {
                    await requestMedia(true)
                } else {
                    await requestMedia(false)
                }
                connectToMeeting(activeMeetingId, profileName || 'Colleague', true)
                if (callType === 'screenshare' && pendingScreenStreamRef.current) {
                    const screenStream = pendingScreenStreamRef.current
                    setTimeout(() => {
                        startScreenShare(screenStream).catch(err => {
                            console.warn('[AppWorkspace] Error starting screen share:', err)
                        })
                    }, 500)
                }
            } catch (err) {
                console.error('[AppWorkspace] Failed to connect call media:', err)
            }
        }

        const handleCallRejected = (data: any) => {
            console.log('[AppWorkspace] Outgoing call was declined by peer:', data)
            if ((window as any).electronAPI?.dismissIncomingCallAlert) {
                (window as any).electronAPI.dismissIncomingCallAlert()
            }
            if (pendingScreenStreamRef.current) {
                pendingScreenStreamRef.current.getTracks().forEach(t => {
                    try { t.stop() } catch {}
                })
                pendingScreenStreamRef.current = null
            }
            leaveMeeting()
            stopMedia()
            setOutgoingCall(prev => prev ? { ...prev, status: 'declined' } : null)
            setTimeout(() => {
                setOutgoingCall(null)
            }, 2500)
        }

        const handleCallInitiated = (data: any) => {
            if (data?.meetingId) {
                setOutgoingCall(prev => prev ? { ...prev, meetingId: data.meetingId } : null)
            }
        }

        const handleDirectCallPeerLeft = (data: any) => {
            if (activeAudioCallRef.current) {
                const currentPeerId = activeAudioCallRef.current.peerId
                if (!data?.userId || data.userId === currentPeerId) {
                    console.log('[AppWorkspace] Peer left active direct call:', data)
                    handleCallCancelled(data)
                }
            }
        }

        socket.on(SocketEvents.CALL_INCOMING, handleIncomingCall)
        socket.on(SocketEvents.CALL_CANCELLED, handleCallCancelled)
        socket.on(SocketEvents.CALL_ACCEPTED, handleCallAccepted)
        socket.on(SocketEvents.CALL_REJECTED, handleCallRejected)
        socket.on('call:initiated', handleCallInitiated)
        socket.on(SocketEvents.WEBRTC_USER_LEFT, handleDirectCallPeerLeft)

        return () => {
            socket.off(SocketEvents.CALL_INCOMING, handleIncomingCall)
            socket.off(SocketEvents.CALL_CANCELLED, handleCallCancelled)
            socket.off(SocketEvents.CALL_ACCEPTED, handleCallAccepted)
            socket.off(SocketEvents.CALL_REJECTED, handleCallRejected)
            socket.off('call:initiated', handleCallInitiated)
            socket.off(SocketEvents.WEBRTC_USER_LEFT, handleDirectCallPeerLeft)
        }
    }, [socket, profileName, connectToMeeting, leaveMeeting, requestMedia, stopMedia, startScreenShare])

    const handleAcceptCall = useCallback(async (call: IncomingCallData) => {
        if ((window as any).electronAPI?.dismissIncomingCallAlert) {
            (window as any).electronAPI.dismissIncomingCallAlert()
        }
        if ((window as any).electronAPI?.focusApp) {
            (window as any).electronAPI.focusApp()
        }
        if (socket) {
            socket.emit(SocketEvents.CALL_ACCEPTED, {
                callerId: call.callerId,
                meetingId: call.meetingId
            })
        }
        setIncomingCall(null)

        // ⚠️ CRITICAL: Switch away from 'meeting' tab and clear meeting room ID
        // so that connectToMeeting (which sets meetingId context) does NOT cause
        // MeetingRoom to auto-join and open in the background.
        setActiveMeetingRoomId('')
        setActiveTab('chat')
        // Clear URL and sessionStorage so hash-based tab detection doesn't re-open meeting room
        window.history.replaceState(null, '', '/#chat')
        try { sessionStorage.removeItem('jts_active_meeting_id') } catch {}

        const callType = call.callType || 'audio'
        setActiveAudioCall({
            meetingId: call.meetingId,
            peerId: call.callerId,
            peerName: call.callerName || 'Colleague',
            peerAvatar: call.callerAvatar,
            callType
        })
        try {
            if (callType === 'audio') {
                await requestMedia(true)
            } else {
                await requestMedia(false)
            }
            connectToMeeting(call.meetingId, profileName || 'Colleague', true)
        } catch (err) {
            console.error('[AppWorkspace] Failed to connect call media:', err)
        }
    }, [socket, requestMedia, connectToMeeting, profileName])

    // Listen for Service Worker postMessage (when 'Accept' is clicked in push notification while tab was already open)
    useEffect(() => {
        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === 'JTS_PUSH_ACCEPT_CALL') {
                const callData = event.data.data
                console.log('[AppWorkspace] Received JTS_PUSH_ACCEPT_CALL from SW:', callData)
                if (callData?.meetingId) {
                    handleAcceptCall({
                        meetingId: callData.meetingId,
                        callerId: callData.callerId || '',
                        callerName: callData.callerName || 'Colleague',
                        callerAvatar: callData.callerAvatar,
                        callType: callData.callType || 'video'
                    })
                }
            }
        }
        navigator.serviceWorker?.addEventListener('message', handleSwMessage)
        return () => {
            navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
        }
    }, [handleAcceptCall])

    // Connect pending call from push notification once socket is connected (when tab is launched fresh from push click)
    useEffect(() => {
        if (pendingPushCall && socket && connected) {
            console.log('[AppWorkspace] Auto-accepting pending push call:', pendingPushCall)
            const call = pendingPushCall
            setPendingPushCall(null)
            handleAcceptCall(call)
        }
    }, [pendingPushCall, socket, connected, handleAcceptCall])

    const handleDeclineCall = (call: IncomingCallData) => {
        if ((window as any).electronAPI?.dismissIncomingCallAlert) {
            (window as any).electronAPI.dismissIncomingCallAlert()
        }
        if (socket) {
            socket.emit(SocketEvents.CALL_REJECTED, {
                callerId: call.callerId,
                meetingId: call.meetingId,
                reason: 'declined'
            })
        }
        setIncomingCall(null)
    }

    const handleCancelOutgoingCall = () => {
        if (pendingScreenStreamRef.current) {
            pendingScreenStreamRef.current.getTracks().forEach(t => {
                try { t.stop() } catch {}
            })
            pendingScreenStreamRef.current = null
        }
        if (outgoingCall && socket) {
            socket.emit(SocketEvents.CALL_CANCELLED, {
                targetUserId: outgoingCall.targetUserId,
                meetingId: outgoingCall.meetingId
            })
        }
        leaveMeeting()
        stopMedia()
        setOutgoingCall(null)
    }

    const handleEndActiveAudioCall = () => {
        if (pendingScreenStreamRef.current) {
            pendingScreenStreamRef.current.getTracks().forEach(t => {
                try { t.stop() } catch {}
            })
            pendingScreenStreamRef.current = null
        }
        if (activeAudioCall && socket) {
            socket.emit(SocketEvents.CALL_CANCELLED, {
                targetUserId: activeAudioCall.peerId,
                meetingId: activeAudioCall.meetingId
            })
        }
        leaveMeeting()
        stopMedia()
        setActiveAudioCall(null)
    }

    const handleStartDirectCall = (
        targetId: string,
        callType: 'video' | 'audio' | 'screenshare' = 'audio',
        targetName?: string,
        targetAvatar?: string,
        screenStream?: MediaStream
    ) => {
        if (!socket || !targetId.trim()) return
        if (screenStream) {
            pendingScreenStreamRef.current = screenStream
        }
        const newMeetingId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        socket.emit(SocketEvents.CALL_INITIATE, {
            targetUserId: targetId.trim(),
            calleeId: targetId.trim(),
            callerName: profileName || 'Colleague',
            callerAvatar: profileImage,
            callType,
            meetingId: newMeetingId
        })
        setOutgoingCall({
            meetingId: newMeetingId,
            targetUserId: targetId.trim(),
            targetName: targetName || 'Colleague',
            targetAvatar,
            callType,
            status: 'ringing'
        })
        setShowDirectDialModal(false)
        setDirectDialTarget('')
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

    useEffect(() => {
        if (currentOrg?.planTier) {
            try { localStorage.setItem('jts_active_plan_tier', currentOrg.planTier) } catch (_) {}
        }
    }, [currentOrg?.planTier])

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

    // Real-Time Platform Broadcast Banner State
    const [activeBroadcast, setActiveBroadcast] = useState<{ message: string; severity: 'info' | 'warning' | 'critical'; active: boolean } | null>(null)
    const [dismissedBroadcast, setDismissedBroadcast] = useState(false)

    const fetchBroadcast = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/broadcast/active`)
            if (res.ok) {
                const json = await res.json()
                if (json.data && json.data.active && json.data.message) {
                    setActiveBroadcast(json.data)
                } else {
                    setActiveBroadcast(null)
                }
            }
        } catch (_) {}
    }

    useEffect(() => {
        fetchBroadcast()
        const interval = setInterval(fetchBroadcast, 15000)
        return () => clearInterval(interval)
    }, [])

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

                    // Helper to compute next occurrence date for recurring series
                    const computeNextDate = (currentDateStr?: string, pattern?: string) => {
                        const today = new Date()
                        const base = currentDateStr ? new Date(currentDateStr) : today
                        let d = isNaN(base.getTime()) ? new Date() : new Date(base)
                        const nowZero = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
                        const dZero = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
                        if (dZero <= nowZero) {
                            d = new Date(today)
                            if (pattern === 'daily') d.setDate(d.getDate() + 1)
                            else if (pattern === 'weekdays') {
                                const day = d.getDay()
                                if (day === 5) d.setDate(d.getDate() + 3)
                                else if (day === 6) d.setDate(d.getDate() + 2)
                                else d.setDate(d.getDate() + 1)
                            }
                            else if (pattern === 'weekly') d.setDate(d.getDate() + 7)
                            else if (pattern === 'monthly') d.setMonth(d.getMonth() + 1)
                            else d.setDate(d.getDate() + 1)
                        }
                        return d.toISOString().slice(0, 10)
                    }

                    // Map to scheduled list (includes active, scheduled, and all recurring series)
                    const scheduled = list.filter(m => m.status === 'scheduled' || m.status === 'active' || (m.isRecurring && m.recurrencePattern && m.recurrencePattern !== 'none')).map(m => {
                        const isRecurringSeries = Boolean(m.isRecurring && m.recurrencePattern && m.recurrencePattern !== 'none')
                        let meetingDate = m.scheduledDate || (m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
                        if (isRecurringSeries && m.status === 'ended') {
                            meetingDate = computeNextDate(meetingDate, m.recurrencePattern)
                        }
                        return {
                            id: m.meetingId,
                            title: m.title || `Conference ${m.meetingId}`,
                            date: meetingDate,
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
                            status: isRecurringSeries && m.status === 'ended' ? 'scheduled' : (m.status || 'scheduled')
                        }
                    })

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
                    const activeOrg = matched || data.data[0]
                    if (activeOrg) {
                        setCurrentOrgId(activeOrg._id)
                        if (activeOrg.planTier) {
                            try { localStorage.setItem('jts_active_plan_tier', activeOrg.planTier) } catch (_) {}
                        }
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
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Nav list */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', width: '100%', alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center' }}>
                    {[
                        {
                            id: 'dashboard',
                            label: 'Dashboard',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="9" rx="1.5" />
                                    <rect x="14" y="3" width="7" height="5" rx="1.5" />
                                    <rect x="14" y="12" width="7" height="9" rx="1.5" />
                                    <rect x="3" y="16" width="7" height="5" rx="1.5" />
                                </svg>
                            )
                        },
                        {
                            id: 'meeting',
                            label: 'Meeting Room',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="23 7 16 12 23 17 23 7" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            )
                        },
                        {
                            id: 'chat',
                            label: 'Direct Messages',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                </svg>
                            )
                        },
                        {
                            id: 'history',
                            label: 'History log',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <polyline points="12 7 12 12 15 15" />
                                </svg>
                            )
                        },
                        {
                            id: 'scheduled',
                            label: 'Scheduled',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            )
                        },
                        {
                            id: 'organization',
                            label: 'Organizations',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                                    <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
                                    <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
                                    <line x1="10" y1="6" x2="14" y2="6" />
                                    <line x1="10" y1="10" x2="14" y2="10" />
                                    <line x1="10" y1="14" x2="14" y2="14" />
                                </svg>
                            )
                        },
                        {
                            id: 'team',
                            label: 'Teams Settings',
                            adminOnly: true,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            )
                        },
                        {
                            id: 'channel',
                            label: 'Channels Settings',
                            adminOnly: true,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            )
                        },
                        {
                            id: 'admin',
                            label: 'Admin Console',
                            adminOnly: true,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            )
                        },
                        {
                            id: 'super-admin',
                            label: 'Platform Center',
                            adminOnly: false,
                            superAdminOnly: true,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                            )
                        },
                        {
                            id: 'profile',
                            label: 'User Profile',
                            adminOnly: false,
                            superAdminOnly: false,
                            icon: (active: boolean) => (
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )
                        }
                    ].filter(item => {
                        if (item.superAdminOnly) return isSuperAdmin
                        if (item.adminOnly) return isOrgAdminOrOwner
                        return true
                    }).map(item => {
                        const isActive = activeTab === item.id
                        return (
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
                                    display: 'flex', alignItems: 'center', gap: 12, padding: (mobileMenuOpen || showFullSidebar) ? '9px 12px' : '9px 0',
                                    justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                                    width: '100%',
                                    border: 'none',
                                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    color: isActive ? '#818cf8' : 'var(--color-text-secondary)',
                                    borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                        e.currentTarget.style.color = '#fff'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = 'var(--color-text-secondary)'
                                    }
                                }}
                            >
                                <span style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 7,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    background: isActive ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                                    color: isActive ? '#a5b4fc' : '#94a3b8',
                                    transition: 'all 0.15s ease'
                                }}>
                                    {item.icon(isActive)}
                                </span>
                                {(mobileMenuOpen || showFullSidebar) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                            </button>
                        )
                    })}
                </nav>

                {/* Pin/Collapse lock button inside meeting */}
                {joined && (
                    <button
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        className="btn btn-ghost"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: (mobileMenuOpen || showFullSidebar) ? '9px 12px' : '9px 0',
                            justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                            border: 'none', color: 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 600,
                            cursor: 'pointer', margin: '8px 0', width: '100%',
                            transition: 'all 0.15s ease'
                        }}
                        title={sidebarExpanded ? "Collapse Sidebar" : "Pin Sidebar Open"}
                    >
                        <span style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: '#94a3b8',
                            flexShrink: 0
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sidebarExpanded ? 'rotate(-45deg)' : 'none', transition: 'transform 0.2s ease' }}>
                                <line x1="12" y1="17" x2="12" y2="22"/>
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a3 3 0 0 0-6 0v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"/>
                            </svg>
                        </span>
                        {(mobileMenuOpen || showFullSidebar) && (
                            <span style={{ whiteSpace: 'nowrap' }}>
                                {sidebarExpanded ? 'Collapse Sidebar' : 'Pin Sidebar'}
                            </span>
                        )}
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
            <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: (activeTab === 'meeting' || activeTab === 'channel' || activeTab === 'chat') ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', position: 'relative', outline: 'none' }}>
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
                                    border: 'none', background: 'transparent', color: '#fff',
                                    cursor: 'pointer', padding: '6px 8px', display: windowWidth < 768 ? 'flex' : 'none', 
                                    alignItems: 'center', marginRight: 2
                                }}
                                aria-label="Open navigation menu"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            </button>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                                {activeTab === 'dashboard' ? 'Dashboard' : 
                                 activeTab === 'chat' ? 'Direct Messages' :
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

                        {/* Right Side: Status Indicator, Organization Switcher & User Profile Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Live Presence & Custom Status Popover */}
                            <UserStatusSelectorPopover
                                token={token}
                                currentUserId={userId}
                                userName={profileName}
                            />
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
                                                {org.name}
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
                                <UserAvatar src={profileImage} name={profileName} size={26} fontSize="0.72rem" />
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hidden sm:inline">
                                    {profileName.split(' ')[0]}
                                </span>
                            </button>
                        </div>
                    </header>
                )}

                {/* Global Platform Broadcast Alert Banner (Super Admin Broadcast Stream) */}
                {activeBroadcast && activeBroadcast.active && !dismissedBroadcast && (
                    <div style={{
                        background: activeBroadcast.severity === 'critical'
                            ? 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)'
                            : activeBroadcast.severity === 'warning'
                            ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: '#fff',
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                        zIndex: 40,
                        position: 'relative',
                        borderBottom: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span style={{ fontSize: '1.1rem' }}>
                                {activeBroadcast.severity === 'critical' ? '🚨' : activeBroadcast.severity === 'warning' ? '⚠️' : '📢'}
                            </span>
                            <span style={{ lineHeight: 1.4 }}>{activeBroadcast.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDismissedBroadcast(true)}
                            title="Dismiss notification"
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '50%',
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
                )}
                <Suspense fallback={<WorkspaceTabSkeleton />}>
                    {/* MEETING TAB */}
                    {activeTab === 'meeting' && (
                        <div style={{ width: '100%', height: '100%' }}>
                            <MeetingRoom
                                key={activeMeetingRoomId || meetingId || 'lobby'}
                                initialToken={token}
                                initialMeetingId={activeMeetingRoomId || meetingId || undefined}
                                autoJoin={Boolean(activeMeetingRoomId || meetingId)}
                                isAdminOrOwner={isOrgAdminOrOwner}
                                planTier={currentOrg?.planTier || localStorage.getItem('jts_active_plan_tier') || 'free'}
                                onUpgradePlanRequest={() => setActiveTab('organization')}
                                onLeave={handleLeaveMeetingRoom}
                            />
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
                                onStartMeeting={handleLaunchMeeting}
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

                    {/* DIRECT MESSAGES HUB (TEAMS / SLACK STYLE 1-ON-1 & GROUP DMS) */}
                    {activeTab === 'chat' && (
                        <div className="anim-fade-in" style={{ flex: 1, height: 'calc(100vh - 56px)', minHeight: 0, overflow: 'hidden' }}>
                            <DirectMessagesHub
                                token={token}
                                currentUserId={userId}
                                currentUserName={profileName}
                                userPlan={organizations.find(o => o._id === currentOrgId)?.planTier || 'free'}
                                onStartCall={(targetUserId, targetName, callType, targetAvatar, screenStream) => handleStartDirectCall(targetUserId, callType || 'audio', targetName, targetAvatar, screenStream)}
                                onStartMeeting={(roomId: string) => handleLaunchMeeting(roomId)}
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
                                onStartMeeting={handleLaunchMeeting}
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
                                onStartMeeting={handleLaunchMeeting}
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
                                    onStartMeeting={handleLaunchMeeting}
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
                                <IconPhone size={18} color="#6366f1" /> Direct Ring Colleague
                            </h3>
                            <button onClick={() => setShowDirectDialModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconX size={16} />
                            </button>
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
                                    <IconPhone size={15} color="#ffffff" /> Call Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Outgoing Call Ringing Modal (Caller Side) */}
            <OutgoingCallModal
                call={outgoingCall}
                onCancel={handleCancelOutgoingCall}
            />

            {/* Global Incoming Call Ringing Modal (Callee Side) */}
            <IncomingCallModal
                call={incomingCall}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
            />

            {/* Live 1-on-1 Teams Audio Call Modal */}
            <ActiveAudioCallModal
                call={activeAudioCall}
                onEndCall={handleEndActiveAudioCall}
                onUpgradeToVideo={() => {
                    if (activeAudioCall) {
                        const mId = activeAudioCall.meetingId
                        handleEndActiveAudioCall()
                        handleLaunchMeeting(mId)
                    }
                }}
            />

            {/* Background Incoming Call Push Notifications Permission Toast */}
            {showNotificationPrompt && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    background: '#13151f',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    maxWidth: 420,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>Enable Call Alerts</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
                            Receive incoming video and audio call alerts even when your browser tab is closed.
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            setShowNotificationPrompt(false)
                            await pushNotificationService.subscribeUser(token)
                        }}
                        style={{
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Enable
                    </button>
                    <button
                        onClick={() => {
                            setShowNotificationPrompt(false)
                            localStorage.setItem('jts_push_prompt_dismissed', 'true')
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <IconX size={16} />
                    </button>
                </div>
            )}
        </div>
    )
}
