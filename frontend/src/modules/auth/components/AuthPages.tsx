import React, { useState } from 'react'

/* ──────────────────────────────────────────────────────────
   Inline SVG Icons for Auth Pages
   ────────────────────────────────────────────────────────── */
const IconVideo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
)
const IconEye = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
)
const IconEyeOff = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
)
const IconArrowLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
)
const IconGithub = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
)
const IconGoogle = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.988 0-.746-.08-1.32-.176-1.886H12.24z" />
    </svg>
)

const IconMicrosoft = () => (
    <svg width="18" height="18" viewBox="0 0 23 23" fill="currentColor">
        <rect x="0" y="0" width="10.5" height="10.5" fill="#f25022" />
        <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7fba00" />
        <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00a4ef" />
        <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900" />
    </svg>
)

import { API_BASE, AZURE_CLIENT_ID, AZURE_TENANT_ID, GOOGLE_CLIENT_ID } from '../../../config'

interface AuthPagesProps {
    view: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification'
    onNavigate: (view: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification' | 'app' | 'landing') => void
    onAuthSuccess: (token: string) => void
}

export const AuthPages: React.FC<AuthPagesProps> = ({ view, onNavigate, onAuthSuccess }) => {
    // Form states
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
    const [confirmPassword, setConfirmPassword] = useState('')
    const [resetCode, setResetCode] = useState('')
    const [verifiedToken, setVerifiedToken] = useState('')

    // SSO states
    const [ssoOrgSlug, setSsoOrgSlug] = useState('')
    const [ssoEmail, setSsoEmail] = useState('')
    const [showSsoForm, setShowSsoForm] = useState(false)

    // Show/hide passwords
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Loading & feedback states
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [shake, setShake] = useState(false)

    // Trigger error animation
    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 500)
    }

    // Handle Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields')
            triggerShake()
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Login failed. Please check credentials.')
            }

            setSuccess('Login successful! Connecting...')
            setTimeout(() => {
                onAuthSuccess(data.data.accessToken)
            }, 1000)
        } catch (err: any) {
            setError(err?.message || 'Connection error. Please try again.')
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    // Handle SSO Login
    const handleSsoSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ssoOrgSlug.trim() || !ssoEmail.trim()) {
            setError('Please enter your Organization Slug and Email')
            triggerShake()
            return
        }

        setError(null)
        setLoading(true)

        try {
            const ssoUrl = `${API_BASE}/api/auth/sso/login/${ssoOrgSlug.toLowerCase().trim()}`
            const checkRes = await fetch(ssoUrl)
            const checkData = await checkRes.json()

            if (!checkRes.ok) {
                throw new Error(checkData.error || 'Organization slug not found.')
            }

            setSuccess('Redirecting to Enterprise Identity Provider...')
            
            setTimeout(async () => {
                try {
                    const callbackRes = await fetch(`${API_BASE}/api/auth/sso/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: ssoEmail, orgSlug: ssoOrgSlug })
                    })

                    const callbackData = await callbackRes.json()

                    if (!callbackRes.ok) {
                        throw new Error(callbackData.error || 'SSO authentication failed.')
                    }

                    setSuccess(`Welcome to JTS Meet! Signed in via SSO.`)
                    setTimeout(() => {
                        onAuthSuccess(callbackData.data.accessToken)
                    }, 1200)
                } catch (err: any) {
                    setError(err?.message || 'Identity Provider authentication failed.')
                    setLoading(false)
                    triggerShake()
                }
            }, 1500)

        } catch (err: any) {
            setError(err?.message || 'Failed to initiate SSO login.')
            setLoading(false)
            triggerShake()
        }
    }

    const handleMicrosoftRedirect = () => {
        if (!AZURE_CLIENT_ID) {
            console.error('AZURE_CLIENT_ID is not configured')
            alert('Microsoft Client ID is not configured in the application environment.')
            return
        }
        const redirectUri = encodeURIComponent(window.location.origin + '/auth/microsoft/callback')
        const scope = encodeURIComponent('openid profile email User.Read')
        const authUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize?client_id=${AZURE_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}`
        window.location.href = authUrl
    }

    const handleGoogleRedirect = () => {
        window.location.href = `${API_BASE}/api/auth/google`
    }

    // Handle Register
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fullName.trim() || !email.trim() || !password.trim()) {
            setError('All fields are required')
            triggerShake()
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long')
            triggerShake()
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed.')
            }

            setSuccess('Account created successfully!')
            setTimeout(() => {
                onNavigate('otp-verification')
            }, 1200)
        } catch (err: any) {
            setError(err?.message || 'Connection error. Please try again.')
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    // Handle Forgot Password (Real)
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) {
            setError('Please enter your email address')
            triggerShake()
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Verification email failed')
            }

            setSuccess('Reset code sent! Please check your inbox.')
            setTimeout(() => {
                onNavigate('reset-password')
            }, 1800)
        } catch (err: any) {
            setError(err?.message || 'Connection error. Please try again.')
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    // Handle Reset Password (Real)
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            triggerShake()
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long')
            triggerShake()
            return
        }

        if (!resetCode.trim()) {
            setError('Please enter the reset verification code')
            triggerShake()
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: resetCode, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password.')
            }

            setSuccess('Password updated successfully! Redirecting to sign in...')
            setTimeout(() => {
                onNavigate('login')
            }, 1800)
        } catch (err: any) {
            setError(err?.message || 'Connection error. Please try again.')
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    // Handle OTP Verify Code Input Change
    const handleOtpChange = (index: number, val: string) => {
        if (isNaN(Number(val))) return
        const newOtp = [...otpCode]
        newOtp[index] = val.substring(val.length - 1)
        setOtpCode(newOtp)

        // Auto focus next input
        if (val && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`)
            nextInput?.focus()
        }
    }

    // Handle OTP Submit (Real)
    const handleOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        const code = otpCode.join('')
        if (code.length < 6) {
            setError('Please enter all 6 digits')
            triggerShake()
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed.')
            }

            setVerifiedToken(data.data.accessToken)
            setSuccess('OTP Verified successfully!')
            setTimeout(() => {
                onNavigate('email-verification')
            }, 1200)
        } catch (err: any) {
            setError(err?.message || 'Connection error. Please try again.')
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    // Resend OTP (Real)
    const handleResendOtp = async () => {
        if (!email.trim()) {
            setError('Email is required to resend verification code')
            triggerShake()
            return
        }

        setError(null)
        try {
            const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Resend request failed.')
            }

            setSuccess('A new verification code has been sent!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err?.message || 'Connection error. Please try again.')
        }
    }

    // Handle Email Verification Continue (Real)
    const handleEmailVerifiedContinue = () => {
        if (verifiedToken) {
            onAuthSuccess(verifiedToken)
        } else {
            onNavigate('login')
        }
    }

    return (
        <div style={{
            minHeight: '100dvh', background: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background blur blobs */}
            <div aria-hidden="true" style={{
                position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                top: '-10%', left: '-10%', pointerEvents: 'none'
            }} />
            <div aria-hidden="true" style={{
                position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                bottom: '-10%', right: '-10%', pointerEvents: 'none'
            }} />

            {/* Back to Home Button */}
            <button onClick={() => onNavigate('landing')} className="btn btn-ghost" style={{
                position: 'absolute', top: 24, left: 24, gap: 8, fontSize: '0.8125rem'
            }}>
                <IconArrowLeft />
                Back to Home
            </button>

            {/* Brand Logo */}
            <div style={{ textAlign: 'center', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => onNavigate('landing')}>
                <div style={{
                    width: 40, height: 40, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-accent)', color: '#fff'
                }}>
                    <IconVideo />
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0 }}>
                    JTS<span className="gradient-text">Meet</span>
                </h1>
            </div>

            {/* Main Auth Card Container */}
            <div className={`glass-card anim-scale-in ${shake ? 'shake-animation' : ''}`} style={{
                width: '100%', maxWidth: 440, padding: 36, position: 'relative', zIndex: 1
            }}>
                {/* ── 1. LOGIN VIEW ── */}
                {view === 'login' && (
                    !showSsoForm ? (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Sign in to JTS Meet</h2>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                    Enter your credentials to access your rooms
                                </p>
                            </div>

                            {error && (
                                <div className="badge badge-danger text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="badge badge-success text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                    {success}
                                </div>
                            )}

                            <div>
                                <label className="label" htmlFor="auth-email">Email Address</label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label className="label" htmlFor="auth-password" style={{ margin: 0 }}>Password</label>
                                    <span onClick={() => onNavigate('forgot-password')} style={{ fontSize: '0.8125rem', color: '#818cf8', cursor: 'pointer' }} className="hover:underline">
                                        Forgot password?
                                    </span>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="auth-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input"
                                        placeholder="Enter your password"
                                        required
                                        style={{ paddingRight: 40 }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                                    }}>
                                        {showPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                                {loading ? (
                                    <>
                                        <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                                        Signing in...
                                    </>
                                ) : 'Sign In'}
                            </button>

                            <div className="divider" />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <button type="button" onClick={() => { setShowSsoForm(true); setError(null); }} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8, border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    Single Sign-On (SSO)
                                </button>
                                <button type="button" onClick={handleGoogleRedirect} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                                    <IconGoogle />
                                    Continue with Google
                                </button>
                                <button type="button" onClick={handleMicrosoftRedirect} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                                    <IconMicrosoft />
                                    Continue with Microsoft
                                </button>
                            </div>

                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '12px 0 0' }}>
                                Don't have an account?{' '}
                                <span onClick={() => onNavigate('register')} style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }} className="hover:underline">
                                    Sign up
                                </span>
                            </p>
                        </form>
                    ) : (
                        <form onSubmit={handleSsoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Enterprise SSO Login</h2>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                    Sign in using your organization identity provider
                                </p>
                            </div>

                            {error && (
                                <div className="badge badge-danger text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="badge badge-success text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                    {success}
                                </div>
                            )}

                            <div>
                                <label className="label" htmlFor="sso-slug">Organization Slug</label>
                                <input
                                    id="sso-slug"
                                    type="text"
                                    value={ssoOrgSlug}
                                    onChange={(e) => setSsoOrgSlug(e.target.value)}
                                    className="input"
                                    placeholder="e.g. acme-corp"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label" htmlFor="sso-email">Work Email Address</label>
                                <input
                                    id="sso-email"
                                    type="email"
                                    value={ssoEmail}
                                    onChange={(e) => setSsoEmail(e.target.value)}
                                    className="input"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>

                            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                                {loading ? 'Processing SSO Authenticate...' : 'Log in with SSO'}
                            </button>

                            <button type="button" onClick={() => { setShowSsoForm(false); setError(null); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}>
                                Back to regular sign in
                            </button>
                        </form>
                    )
                )}

                {/* ── 2. REGISTER VIEW ── */}
                {view === 'register' && (
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Create an Account</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Join JTS Meet to host premium meetings
                            </p>
                        </div>

                        {error && (
                            <div className="badge badge-danger text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="badge badge-success text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="label" htmlFor="reg-name">Full Name</label>
                            <input
                                id="reg-name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input"
                                placeholder="Your Name"
                                required
                            />
                        </div>

                        <div>
                            <label className="label" htmlFor="reg-email">Email Address</label>
                            <input
                                id="reg-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="label" htmlFor="reg-password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reg-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="At least 8 characters"
                                    required
                                    style={{ paddingRight: 40 }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                                }}>
                                    {showPassword ? <IconEyeOff /> : <IconEye />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                            {loading ? (
                                <>
                                    <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                                    Creating account...
                                </>
                            ) : 'Sign Up'}
                        </button>

                        <div className="divider" />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button type="button" onClick={handleGoogleRedirect} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                                <IconGoogle />
                                Continue with Google
                            </button>
                            <button type="button" onClick={handleMicrosoftRedirect} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                                <IconMicrosoft />
                                Continue with Microsoft
                            </button>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '12px 0 0' }}>
                            Already have an account?{' '}
                            <span onClick={() => onNavigate('login')} style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }} className="hover:underline">
                                Sign in
                            </span>
                        </p>
                    </form>
                )}

                {/* ── 3. FORGOT PASSWORD VIEW ── */}
                {view === 'forgot-password' && (
                    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Reset password</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Enter email address and we'll send reset instructions
                            </p>
                        </div>

                        {error && (
                            <div className="badge badge-danger text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="badge badge-success text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="label" htmlFor="forgot-email">Email Address</label>
                            <input
                                id="forgot-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {loading ? 'Sending link...' : 'Send Reset Link'}
                        </button>

                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '12px 0 0' }}>
                            Remember password?{' '}
                            <span onClick={() => onNavigate('login')} style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }} className="hover:underline">
                                Back to sign in
                            </span>
                        </p>
                    </form>
                )}

                {/* ── 4. RESET PASSWORD VIEW ── */}
                {view === 'reset-password' && (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Set new password</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Choose a strong, unique password for your account
                            </p>
                        </div>

                        {error && (
                            <div className="badge badge-danger text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="badge badge-success text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="label" htmlFor="reset-code">Reset Verification Code</label>
                            <input
                                id="reset-code"
                                type="text"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                className="input"
                                placeholder="Enter 6-digit code from email"
                                required
                            />
                        </div>

                        <div>
                            <label className="label" htmlFor="reset-pwd">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reset-pwd"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="Minimum 8 characters"
                                    required
                                    style={{ paddingRight: 40 }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                                }}>
                                    {showPassword ? <IconEyeOff /> : <IconEye />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="label" htmlFor="reset-pwd-conf">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reset-pwd-conf"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input"
                                    placeholder="Re-enter password"
                                    required
                                    style={{ paddingRight: 40 }}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                                }}>
                                    {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {loading ? 'Updating password...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* ── 5. OTP VERIFICATION VIEW ── */}
                {view === 'otp-verification' && (
                    <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Verify OTP</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                We've sent a 6-digit confirmation code to your email.
                            </p>
                        </div>

                        {error && (
                            <div className="badge badge-danger text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="badge badge-success text-center" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="label" style={{ textAlign: 'center', marginBottom: 12 }}>Confirmation Code</label>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                {otpCode.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !digit && index > 0) {
                                                const prevInput = document.getElementById(`otp-${index - 1}`)
                                                prevInput?.focus()
                                            }
                                        }}
                                        className="input"
                                        style={{
                                            width: 44, height: 48, padding: 0, textAlign: 'center', fontSize: '1.25rem',
                                            fontWeight: 700, background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                            {loading ? 'Verifying OTP...' : 'Verify OTP'}
                        </button>

                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '8px 0 0' }}>
                            Didn't receive code?{' '}
                            <span onClick={handleResendOtp} style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }} className="hover:underline">
                                Resend Code
                            </span>
                        </p>
                    </form>
                )}

                {/* ── 6. EMAIL VERIFICATION VIEW ── */}
                {view === 'email-verification' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignSelf: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>

                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Email Verified</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                Your email address has been successfully verified. Your account is fully active and ready to host meetings.
                            </p>
                        </div>

                        <button onClick={handleEmailVerifiedContinue} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            Continue to Sign In
                        </button>
                    </div>
                )}
            </div>

            {/* Global Shake Keyframes Injection */}
            <style dangerouslySetInnerHTML={{ __html: `
                .shake-animation {
                    animation: auth-shake 0.4s ease-in-out;
                }
                @keyframes auth-shake {
                    0%, 100% { transform: translateX(0) scale(1); }
                    20%, 60% { transform: translateX(-6px) scale(1); }
                    40%, 80% { transform: translateX(6px) scale(1); }
                }
            ` }} />
        </div>
    )
}
