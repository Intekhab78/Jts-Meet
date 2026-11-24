import React, { useState, Suspense } from 'react'
import { SocketProvider } from './modules/meeting/context/SocketContext'
import { MeetingProvider } from './modules/meeting/context/MeetingContext'
import { WebRTCProvider } from './modules/meeting/context/WebRTCContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { API_BASE } from './config'
import { onTokenRefreshed, onAuthLogout, refreshAccessToken, getJwtExpiryMs, isUserInActiveMeeting, decodeJwtPayload } from './utils/authClient'

const LandingPage = React.lazy(() => import('./modules/landing/components/LandingPage').then(m => ({ default: m.LandingPage })))
const AppWorkspace = React.lazy(() => import('./modules/dashboard/components/AppWorkspace').then(m => ({ default: m.AppWorkspace })))
const MeetingRoom = React.lazy(() => import('./modules/meeting/components/MeetingRoom').then(m => ({ default: m.MeetingRoom })))
const AuthPages = React.lazy(() => import('./modules/auth/components/AuthPages').then(m => ({ default: m.AuthPages })))
const GuestJoinPage = React.lazy(() => import('./modules/meeting/components/GuestJoinPage').then(m => ({ default: m.GuestJoinPage })))
const WaitingRoom = React.lazy(() => import('./modules/meeting/components/WaitingRoom').then(m => ({ default: m.WaitingRoom })))

function AppLoadingFallback() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100dvh',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-secondary)',
            gap: 16
        }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
            <span style={{ fontSize: '0.875rem' }}>Loading workspace...</span>
        </div>
    )
}


type ViewType = 'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification' | 'app' | 'guest-preview' | 'guest-waiting' | 'microsoft-callback' | 'google-callback'

const getMeetingIdFromUrl = (): string | null => {
    // 1. Pathname /meet/:id, /meeting/:id or /join/:id
    const match = window.location.pathname.match(/^\/(?:meet|meeting|join)\/([a-zA-Z0-9\-_]+)/)
    if (match) return match[1]

    // 2. Hash /#meeting?id=xxx or #meeting?id=xxx
    try {
        const hash = window.location.hash
        if (hash.includes('meeting')) {
            const hashParts = hash.split('?')
            if (hashParts.length > 1) {
                const params = new URLSearchParams(hashParts[1])
                const id = params.get('id') || params.get('meetingId') || params.get('room')
                if (id) return id
            }
        }
    } catch (e) { }

    // 3. Search query ?id=xxx or ?meetingId=xxx or ?room=xxx
    try {
        const searchParams = new URLSearchParams(window.location.search)
        const id = searchParams.get('id') || searchParams.get('meetingId') || searchParams.get('room')
        if (id) return id
    } catch (e) { }

    // 4. Stored active meeting ID ONLY if currently on a meeting route
    try {
        if (window.location.pathname.startsWith('/meet') || window.location.pathname.startsWith('/meeting') || window.location.pathname.startsWith('/join') || window.location.hash.startsWith('#meeting')) {
            const active = sessionStorage.getItem('jts_active_meeting_id')
            if (active) return active
        }
    } catch (e) { }

    return null
}

const parseJwt = (token: string) => {
    return decodeJwtPayload<any>(token)
}

function App() {
    const [meetingIdFromUrl, setMeetingIdFromUrl] = useState<string | null>(getMeetingIdFromUrl)

    React.useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            if (
                event.reason?.message?.includes('message channel closed before a response was received') ||
                event.reason?.message?.includes('A listener indicated an asynchronous response')
            ) {
                event.preventDefault()
            }
        }
        window.addEventListener('unhandledrejection', handleUnhandledRejection)
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }, [])
    const [guestToken, setGuestToken] = useState<string>(() => {
        try {
            return localStorage.getItem('jts_guest_token') || ''
        } catch {
            return ''
        }
    })
    const [guestUserId, setGuestUserId] = useState<string>(() => {
        try {
            return localStorage.getItem('jts_guest_user_id') || ''
        } catch {
            return ''
        }
    })
    const [guestDetails, setGuestDetails] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('jts_guest_details')
            return saved ? JSON.parse(saved) : null
        } catch {
            return null
        }
    })

    const [view, setView] = useState<ViewType>(() => {
        if (window.location.pathname.startsWith('/auth/microsoft/callback')) {
            return 'microsoft-callback'
        }
        if (window.location.pathname.startsWith('/auth/google/callback')) {
            return 'google-callback'
        }
        if (window.location.pathname === '/login' || window.location.hash === '#login') {
            return 'login'
        }
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')
        const userToken = urlToken || localStorage.getItem('jts_token')
        const savedGuestToken = localStorage.getItem('jts_guest_token')
        const meetId = getMeetingIdFromUrl()

        // If user has a registered member token, enter app
        if (userToken) {
            return 'app'
        }

        // If URL has a meeting ID or hash route #meeting
        if (meetId || window.location.hash.startsWith('#meeting')) {
            const isRefreshed = sessionStorage.getItem('jts_meeting_joined') === 'true'
            const activeMeetingInSession = sessionStorage.getItem('jts_active_meeting_id')

            if (savedGuestToken && isRefreshed && (!activeMeetingInSession || activeMeetingInSession === meetId)) {
                const decoded = parseJwt(savedGuestToken)
                if (decoded && (!decoded.isPending || meetId?.startsWith('room-'))) {
                    return 'app'
                }
                if (decoded && decoded.isPending) {
                    return 'guest-waiting'
                }
            }
            return meetId ? 'guest-preview' : 'landing'
        }

        return 'landing'
    })

    const [token, setToken] = useState<string>(() => {
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')
        if (urlToken) {
            localStorage.setItem('jts_token', urlToken)
            const cleanUrl = window.location.pathname + (window.location.hash || '')
            window.history.pushState({}, '', cleanUrl)
            return urlToken
        }
        return localStorage.getItem('jts_token') || ''
    })

    const handleAuthSuccess = (accessToken: string) => {
        localStorage.setItem('jts_token', accessToken)
        setToken(accessToken)
        setView('app')
    }

    const handleLogout = () => {
        const storedRefreshToken = localStorage.getItem('jts_refresh_token') || ''
        fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(storedRefreshToken ? { refreshToken: storedRefreshToken } : {})
        }).catch(() => {})

        localStorage.removeItem('jts_token')
        localStorage.removeItem('jts_refresh_token')
        localStorage.removeItem('jts_guest_token')
        localStorage.removeItem('jts_guest_user_id')
        localStorage.removeItem('jts_guest_details')
        localStorage.removeItem('jts_guest_name')
        localStorage.removeItem('jts_last_meeting_id')
        sessionStorage.removeItem('jts_active_meeting_id')
        sessionStorage.removeItem('jts_meeting_joined')
        sessionStorage.removeItem('jts_pending_logout')
        setToken('')
        setGuestToken('')
        setMeetingIdFromUrl(null)
        setView('landing')
        window.history.pushState({}, '', '/')
    }

    // Enterprise Silent Token Refresh: listens for refresh/logout events and periodically refreshes before expiry
    React.useEffect(() => {
        const unsubRefresh = onTokenRefreshed((newToken) => {
            setToken(newToken)
        })
        const unsubLogout = onAuthLogout(() => {
            if (isUserInActiveMeeting()) {
                console.warn('[App] User is currently in a meeting. Deferring logout until meeting ends.')
                try {
                    sessionStorage.setItem('jts_pending_logout', 'true')
                } catch (_) {}
                return
            }
            handleLogout()
        })

        if (!token) {
            return () => {
                unsubRefresh()
                unsubLogout()
            }
        }

        const checkAndRefresh = () => {
            const expMs = getJwtExpiryMs(token)
            if (expMs) {
                const msRemaining = expMs - Date.now()
                // Refresh if token expires in less than 4 minutes
                if (msRemaining < 4 * 60 * 1000) {
                    refreshAccessToken()
                }
            } else {
                refreshAccessToken()
            }
        }

        // Initial check in background
        checkAndRefresh()
        const interval = setInterval(checkAndRefresh, 3 * 60 * 1000) // check every 3 minutes

        return () => {
            unsubRefresh()
            unsubLogout()
            clearInterval(interval)
        }
    }, [token])

    // Auto-generate guest token ONLY if user was already actively joined in a meeting and refreshed
    React.useEffect(() => {
        const isJoined = sessionStorage.getItem('jts_meeting_joined') === 'true'
        const meetId = getMeetingIdFromUrl()
        if (!token && !guestToken && isJoined && meetId) {
            const savedGuestName = localStorage.getItem('jts_guest_name') || 'Guest'
            const savedGuestUserId = localStorage.getItem('jts_guest_user_id') || undefined
            fetch(`${API_BASE}/api/guest/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId: meetId, guestName: savedGuestName, existingUserId: savedGuestUserId })
            })
                .then(res => res.json())
                .then(data => {
                    if (data?.success && data?.data?.token) {
                        setGuestToken(data.data.token)
                        setGuestUserId(data.data.userId)
                        try {
                            localStorage.setItem('jts_guest_token', data.data.token)
                            localStorage.setItem('jts_guest_user_id', data.data.userId)
                        } catch (e) { }
                        if (!data.data.isPending) {
                            setView('app')
                        } else {
                            setView('guest-waiting')
                        }
                    }
                })
                .catch(() => { })
        }
    }, [token, guestToken])

    // Cleanup stale meeting data if at root landing page
    React.useEffect(() => {
        const isMeetingRoute = window.location.pathname.startsWith('/meet') || window.location.pathname.startsWith('/meeting') || window.location.pathname.startsWith('/join') || window.location.hash.startsWith('#meeting') || window.location.search.includes('id=') || window.location.search.includes('room=')
        if (!isMeetingRoute) {
            try {
                localStorage.removeItem('jts_guest_token')
                localStorage.removeItem('jts_guest_user_id')
                localStorage.removeItem('jts_guest_details')
                sessionStorage.removeItem('jts_active_meeting_id')
                sessionStorage.removeItem('jts_meeting_joined')
                localStorage.removeItem('jts_last_meeting_id')
            } catch (e) { }
            if (!token && guestToken) {
                setGuestToken('')
                setGuestUserId('')
                setView('landing')
            }
        }
    }, [token, guestToken])

    // Sync view on browser hash change or back/forward buttons
    React.useEffect(() => {
        const handleHashOrPopState = () => {
            const currentMeetId = getMeetingIdFromUrl()
            setMeetingIdFromUrl(currentMeetId)

            const userToken = localStorage.getItem('jts_token')
            const savedGuest = localStorage.getItem('jts_guest_token')

            if (userToken) {
                setView('app')
                return
            }

            if (currentMeetId || window.location.pathname.startsWith('/meet') || window.location.pathname.startsWith('/join') || (window.location.hash.startsWith('#meeting') && currentMeetId)) {
                const isRefreshed = sessionStorage.getItem('jts_meeting_joined') === 'true'
                const activeMeetingInSession = sessionStorage.getItem('jts_active_meeting_id')
                if (savedGuest && isRefreshed && (!activeMeetingInSession || activeMeetingInSession === currentMeetId)) {
                    const decodedGuest = parseJwt(savedGuest)
                    if (decodedGuest && (!decodedGuest.isPending || currentMeetId?.startsWith('room-'))) {
                        setView('app')
                        return
                    }
                }
                setView(currentMeetId ? 'guest-preview' : 'landing')
                return
            }

            if (window.location.hash === '#login' || window.location.pathname === '/login') {
                setView('login')
                return
            }

            // Default to landing page when at home root /
            try {
                localStorage.removeItem('jts_guest_token')
                localStorage.removeItem('jts_guest_user_id')
                sessionStorage.removeItem('jts_active_meeting_id')
                sessionStorage.removeItem('jts_meeting_joined')
            } catch (e) { }
            setGuestToken('')
            setView('landing')
        }

        const onForceLogout = () => {
            handleLogout()
            setView('login')
        }
        window.addEventListener('jts:force-logout', onForceLogout)
        window.addEventListener('hashchange', handleHashOrPopState)
        window.addEventListener('popstate', handleHashOrPopState)
        return () => {
            window.removeEventListener('jts:force-logout', onForceLogout)
            window.removeEventListener('hashchange', handleHashOrPopState)
            window.removeEventListener('popstate', handleHashOrPopState)
        }
    }, [])

    if (view === 'microsoft-callback') {
        return (
            <MicrosoftCallbackPage
                onAuthSuccess={handleAuthSuccess}
                onAuthFailure={(err) => {
                    alert('Microsoft Authentication failed: ' + err)
                    setView('login')
                    window.history.pushState({}, '', '/')
                }}
            />
        )
    }

    if (view === 'google-callback') {
        return (
            <GoogleCallbackPage
                onAuthSuccess={handleAuthSuccess}
                onAuthFailure={(err) => {
                    alert('Google Authentication failed: ' + err)
                    setView('login')
                    window.history.pushState({}, '', '/')
                }}
            />
        )
    }

    if (view === 'landing') {
        return (
            <Suspense fallback={<AppLoadingFallback />}>
                <LandingPage onNavigate={setView} />
            </Suspense>
        )
    }

    if (view === 'guest-preview' && meetingIdFromUrl) {
        return (
            <Suspense fallback={<AppLoadingFallback />}>
                <GuestJoinPage
                    meetingId={meetingIdFromUrl}
                    onNavigate={setView}
                    onGuestRequestSuccess={(tokenVal, userIdVal, isPending, details) => {
                        setGuestToken(tokenVal)
                        setGuestUserId(userIdVal)
                        setGuestDetails(details)
                        try {
                            localStorage.setItem('jts_guest_token', tokenVal)
                            if (details?.guestName) {
                                localStorage.setItem('jts_guest_name', details.guestName)
                            }
                        } catch (e) { }
                        if (isPending) {
                            setView('guest-waiting')
                        } else {
                            setView('app')
                        }
                    }}
                />
            </Suspense>
        )
    }

    if (view === 'guest-waiting' && meetingIdFromUrl && guestToken) {
        return (
            <Suspense fallback={<AppLoadingFallback />}>
                <WaitingRoom
                    meetingId={meetingIdFromUrl}
                    guestToken={guestToken}
                    guestName={guestDetails?.guestName || 'Guest'}
                    meetingTitle={guestDetails?.meetingTitle || 'Meeting'}
                    hostName={guestDetails?.hostName || 'Organizer'}
                    onApproved={(approvedToken) => {
                        if (approvedToken) {
                            setGuestToken(approvedToken)
                        }
                        setView('app')
                    }}
                    onLeave={() => {
                        handleLogout()
                    }}
                />
            </Suspense>
        )
    }

    if (view !== 'app') {
        return (
            <Suspense fallback={<AppLoadingFallback />}>
                <AuthPages
                    view={view as any}
                    onNavigate={setView}
                    onAuthSuccess={handleAuthSuccess}
                />
            </Suspense>
        )
    }

    const currentMeetId = meetingIdFromUrl || getMeetingIdFromUrl()
    const isMeetingRoute = !!currentMeetId || window.location.pathname.startsWith('/meet') || window.location.pathname.startsWith('/join') || (window.location.hash.startsWith('#meeting') && !!currentMeetId)

    // Only render guest MeetingRoom if user is on a valid meeting route WITH a meetingId
    if (!token && isMeetingRoute && (guestToken || currentMeetId)) {
        return (
            <SocketProvider>
                <MeetingProvider>
                    <WebRTCProvider>
                        <ErrorBoundary fallbackTitle="Meeting Room Error">
                            <Suspense fallback={<AppLoadingFallback />}>
                                <div style={{ width: '100%', height: '100dvh', background: 'var(--color-bg-base)' }}>
                                    <MeetingRoom
                                        initialToken={guestToken}
                                        initialMeetingId={currentMeetId || undefined}
                                        autoJoin={true}
                                        isAdminOrOwner={false}
                                        planTier={guestDetails?.planTier}
                                        onLeave={handleLogout}
                                    />
                                </div>
                            </Suspense>
                        </ErrorBoundary>
                    </WebRTCProvider>
                </MeetingProvider>
            </SocketProvider>
        )
    }

    // If not logged in and not on a meeting route, always show LandingPage
    if (!token) {
        return (
            <Suspense fallback={<AppLoadingFallback />}>
                <LandingPage onNavigate={setView} />
            </Suspense>
        )
    }

    return (
        <SocketProvider>
            <MeetingProvider>
                <WebRTCProvider>
                    <ErrorBoundary fallbackTitle="Workspace Error">
                        <Suspense fallback={<AppLoadingFallback />}>
                            <AppWorkspace
                                token={token}
                                initialMeetingId={currentMeetId || undefined}
                                onClearMeetingUrl={() => setMeetingIdFromUrl(null)}
                                onLogout={handleLogout}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </WebRTCProvider>
            </MeetingProvider>
        </SocketProvider>
    )
}

export default App

function MicrosoftCallbackPage({ onAuthSuccess, onAuthFailure }: { onAuthSuccess: (token: string) => void, onAuthFailure: (error: string) => void }) {
    const submittedRef = React.useRef(false)
    React.useEffect(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const error = params.get('error')
        const errorDescription = params.get('error_description')

        if (error) {
            onAuthFailure(errorDescription || error)
            return
        }

        if (!code) {
            onAuthFailure('Authorization code not found in callback parameters.')
            return
        }

        const redirectUri = window.location.origin + window.location.pathname
        fetch(`${API_BASE}/api/auth/microsoft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code, redirectUri })
        })
            .then(async (res) => {
                const data = await res.json()
                if (!res.ok) {
                    throw new Error(data.error || 'Microsoft authentication failed')
                }
                if (data.data?.refreshToken) {
                    localStorage.setItem('jts_refresh_token', data.data.refreshToken)
                }
                window.history.pushState({}, '', '/')
                onAuthSuccess(data.data.accessToken)
            })
            .catch((err) => {
                onAuthFailure(err.message || 'Identity Provider authentication failed.')
            })
    }, [])

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100dvh',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            gap: 16
        }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Authenticating with Microsoft...</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>Please wait while we establish your secure session.</p>
        </div>
    )
}

function GoogleCallbackPage({ onAuthSuccess, onAuthFailure }: { onAuthSuccess: (token: string) => void, onAuthFailure: (error: string) => void }) {
    const submittedRef = React.useRef(false)
    React.useEffect(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const idToken = hashParams.get('id_token')
        const error = hashParams.get('error')

        if (error) {
            onAuthFailure(error)
            return
        }

        if (!idToken) {
            onAuthFailure('Google ID Token not found in callback parameters.')
            return
        }

        fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ idToken })
        })
            .then(async (res) => {
                const data = await res.json()
                if (!res.ok) {
                    throw new Error(data.error || 'Google authentication failed')
                }
                if (data.data?.refreshToken) {
                    localStorage.setItem('jts_refresh_token', data.data.refreshToken)
                }
                window.history.pushState({}, '', '/')
                onAuthSuccess(data.data.accessToken)
            })
            .catch((err) => {
                onAuthFailure(err.message || 'Identity Provider authentication failed.')
            })
    }, [])

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100dvh',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            gap: 16
        }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Authenticating with Google...</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>Please wait while we establish your secure session.</p>
        </div>
    )
}

