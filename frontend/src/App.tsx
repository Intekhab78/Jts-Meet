import React, { useState } from 'react'
import { SocketProvider } from './modules/meeting/context/SocketContext'
import { MeetingProvider } from './modules/meeting/context/MeetingContext'
import { WebRTCProvider } from './modules/meeting/context/WebRTCContext'
import { AppWorkspace } from './modules/dashboard/components/AppWorkspace'
import { LandingPage } from './modules/landing/components/LandingPage'
import { AuthPages } from './modules/auth/components/AuthPages'
import { GuestJoinPage } from './modules/meeting/components/GuestJoinPage'
import { WaitingRoom } from './modules/meeting/components/WaitingRoom'
import { MeetingRoom } from './modules/meeting/components/MeetingRoom'
import { API_BASE } from './config'

type ViewType = 'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification' | 'app' | 'guest-preview' | 'guest-waiting' | 'microsoft-callback' | 'google-callback'

const getMeetingIdFromUrl = (): string | null => {
    const match = window.location.pathname.match(/^\/meet\/([a-zA-Z0-9\-_]+)/)
    return match ? match[1] : null
}

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]))
    } catch (e) {
        return null
    }
}

function App() {
    const [meetingIdFromUrl] = useState<string | null>(getMeetingIdFromUrl)
    const [guestToken, setGuestToken] = useState<string>('')
    const [guestUserId, setGuestUserId] = useState<string>('')
    const [guestDetails, setGuestDetails] = useState<any>(null)

    const [view, setView] = useState<ViewType>(() => {
        if (window.location.pathname.startsWith('/auth/microsoft/callback')) {
            return 'microsoft-callback'
        }
        if (window.location.pathname.startsWith('/auth/google/callback')) {
            return 'google-callback'
        }
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')
        const savedToken = urlToken || localStorage.getItem('jts_token')
        const meetId = getMeetingIdFromUrl()
        if (meetId) {
            return savedToken ? 'app' : 'guest-preview'
        }
        return savedToken ? 'app' : 'landing'
    })
    
    const [token, setToken] = useState<string>(() => {
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')
        if (urlToken) {
            localStorage.setItem('jts_token', urlToken)
            window.history.pushState({}, '', '/')
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
        localStorage.removeItem('jts_token')
        setToken('')
        setGuestToken('')
        setView('landing')
    }

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
        return <LandingPage onNavigate={setView} />
    }

    if (view === 'guest-preview' && meetingIdFromUrl) {
        return (
            <GuestJoinPage
                meetingId={meetingIdFromUrl}
                onNavigate={setView}
                onGuestRequestSuccess={(tokenVal, userIdVal, isPending, details) => {
                    setGuestToken(tokenVal)
                    setGuestUserId(userIdVal)
                    setGuestDetails(details)
                    if (isPending) {
                        setView('guest-waiting')
                    } else {
                        setView('app')
                    }
                }}
            />
        )
    }

    if (view === 'guest-waiting' && meetingIdFromUrl && guestToken) {
        return (
            <WaitingRoom
                meetingId={meetingIdFromUrl}
                guestToken={guestToken}
                guestName={guestDetails?.guestName || 'Guest'}
                meetingTitle={guestDetails?.meetingTitle || 'Meeting'}
                hostName={guestDetails?.hostName || 'Organizer'}
                onApproved={() => setView('app')}
                onLeave={() => {
                    setView('landing')
                    window.history.pushState({}, '', '/')
                }}
            />
        )
    }

    if (view !== 'app') {
        return (
            <AuthPages
                view={view as any}
                onNavigate={setView}
                onAuthSuccess={handleAuthSuccess}
            />
        )
    }

    const activeToken = token || guestToken
    const decoded = parseJwt(activeToken)
    const isGuest = decoded?.isGuest

    if (isGuest) {
        return (
            <SocketProvider>
                <MeetingProvider>
                    <WebRTCProvider>
                        <div style={{ width: '100%', height: '100dvh', background: 'var(--color-bg-base)' }}>
                            <MeetingRoom initialToken={activeToken} isAdminOrOwner={false} />
                        </div>
                    </WebRTCProvider>
                </MeetingProvider>
            </SocketProvider>
        )
    }

    return (
        <SocketProvider>
            <MeetingProvider>
                <WebRTCProvider>
                    <AppWorkspace token={token} onLogout={handleLogout} />
                </WebRTCProvider>
            </MeetingProvider>
        </SocketProvider>
    )
}

export default App

function MicrosoftCallbackPage({ onAuthSuccess, onAuthFailure }: { onAuthSuccess: (token: string) => void, onAuthFailure: (error: string) => void }) {
    React.useEffect(() => {
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
            body: JSON.stringify({ code, redirectUri })
        })
        .then(async (res) => {
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Microsoft authentication failed')
            }
            window.history.pushState({}, '', '/')
            onAuthSuccess(data.data.accessToken)
        })
        .catch((err) => {
            onAuthFailure(err.message || 'Identity Provider authentication failed.')
        })
    }, [onAuthSuccess, onAuthFailure])

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
    React.useEffect(() => {
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
            body: JSON.stringify({ idToken })
        })
        .then(async (res) => {
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Google authentication failed')
            }
            window.history.pushState({}, '', '/')
            onAuthSuccess(data.data.accessToken)
        })
        .catch((err) => {
            onAuthFailure(err.message || 'Identity Provider authentication failed.')
        })
    }, [onAuthSuccess, onAuthFailure])

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

