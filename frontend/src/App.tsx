import React, { useState } from 'react'
import { SocketProvider } from './modules/meeting/context/SocketContext'
import { MeetingProvider } from './modules/meeting/context/MeetingContext'
import { WebRTCProvider } from './modules/meeting/context/WebRTCContext'
import { AppWorkspace } from './modules/dashboard/components/AppWorkspace'
import { LandingPage } from './modules/landing/components/LandingPage'
import { AuthPages } from './modules/auth/components/AuthPages'

type ViewType = 'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification' | 'app'

function App() {
    const [view, setView] = useState<ViewType>(() => {
        const savedToken = localStorage.getItem('jts_token')
        return savedToken ? 'app' : 'landing'
    })
    const [token, setToken] = useState<string>(() => {
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
        setView('landing')
    }

    if (view === 'landing') {
        return <LandingPage onNavigate={setView} />
    }

    if (view !== 'app') {
        return (
            <AuthPages
                view={view}
                onNavigate={setView}
                onAuthSuccess={handleAuthSuccess}
            />
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

