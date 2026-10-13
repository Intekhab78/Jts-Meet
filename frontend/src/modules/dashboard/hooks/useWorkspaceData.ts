import { useState, useEffect, useMemo, useCallback } from 'react'
import { API_BASE } from '../../../config'
import { useSocketContext } from '../../meeting/context/SocketContext'
import { BroadcastNotice, WorkspaceTab } from '../workspace.types'
import { refreshAccessToken, isUserInActiveMeeting } from '../../../utils/authClient'

interface UseWorkspaceDataProps {
    token: string
    activeTab: WorkspaceTab
}

export function useWorkspaceData({ token, activeTab }: UseWorkspaceDataProps) {
    const { socket } = useSocketContext()

    // Profile States
    const [profileName, setProfileName] = useState('Team Member')
    const [profileEmail, setProfileEmail] = useState('member@jtsmeet.com')
    const [profileImage, setProfileImage] = useState('')
    const [userId, setUserId] = useState('')

    // Meetings list
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

    // Real-Time Platform Broadcast Banner State
    const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotice | null>(null)
    const [dismissedBroadcast, setDismissedBroadcast] = useState(false)

    const fetchBroadcast = useCallback(async () => {
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
    }, [])

    useEffect(() => {
        fetchBroadcast()
        const interval = setInterval(fetchBroadcast, 15000)

        if (socket) {
            const onBroadcastSocket = (notice: any) => {
                if (notice && notice.active && notice.message) {
                    setActiveBroadcast(notice)
                    setDismissedBroadcast(false)
                } else {
                    setActiveBroadcast(null)
                }
            }
            socket.on('platform:broadcast', onBroadcastSocket)
            return () => {
                clearInterval(interval)
                socket.off('platform:broadcast', onBroadcastSocket)
            }
        }

        return () => clearInterval(interval)
    }, [socket, fetchBroadcast])

    // Fetch user profile
    const fetchProfile = useCallback(async () => {
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
            } else if (response.status === 401) {
                const refreshed = await refreshAccessToken()
                if (!refreshed) {
                    if (isUserInActiveMeeting()) {
                        console.warn('[WorkspaceData] Token refresh deferred because user is in an active meeting')
                        try {
                            sessionStorage.setItem('jts_pending_logout', 'true')
                        } catch (_) {}
                    } else {
                        localStorage.removeItem('jts_token')
                        window.location.hash = '#login'
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err)
        }
    }, [token])

    // Fetch meetings
    const fetchMeetings = useCallback(async () => {
        if (!token) return
        try {
            const response = await fetch(`${API_BASE}/api/meeting/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                if (data?.data) {
                    const list = data.data as any[]

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
    }, [token])

    // Fetch organizations
    const fetchOrganizations = useCallback(async () => {
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
                    const activeOrg = matched || data.data.find((o: any) => ['enterprise', 'pro', 'starter'].includes(o?.planTier?.toLowerCase())) || data.data[0]
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
    }, [token])

    // Fetch teams
    const fetchTeams = useCallback(async (orgId: string) => {
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
    }, [token])

    useEffect(() => {
        fetchProfile()
        fetchMeetings()
        fetchOrganizations()
    }, [fetchProfile, fetchMeetings, fetchOrganizations, activeTab])

    useEffect(() => {
        if (currentOrgId) {
            fetchTeams(currentOrgId)
        } else {
            setTeams([])
            setCurrentTeamId('')
        }
    }, [currentOrgId, fetchTeams])

    const impersonatedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('jts_impersonated_org_name') : null

    const handleExitSupportMode = () => {
        const orig = sessionStorage.getItem('jts_original_admin_token')
        if (orig) {
            localStorage.setItem('token', orig)
        }
        sessionStorage.removeItem('jts_original_admin_token')
        sessionStorage.removeItem('jts_impersonated_org_name')
        window.location.hash = '#super-admin'
        window.location.reload()
    }

    return {
        profileName,
        setProfileName,
        profileEmail,
        setProfileEmail,
        profileImage,
        setProfileImage,
        userId,
        historyItems,
        setHistoryItems,
        scheduledItems,
        setScheduledItems,
        organizations,
        setOrganizations,
        loadingOrgs,
        currentOrgId,
        setCurrentOrgId,
        currentOrg,
        teams,
        loadingTeams,
        currentTeamId,
        setCurrentTeamId,
        isSuperAdmin,
        isOrgAdminOrOwner,
        activeBroadcast,
        dismissedBroadcast,
        setDismissedBroadcast,
        impersonatedOrgName,
        handleExitSupportMode,
        fetchMeetings,
        fetchOrganizations
    }
}
