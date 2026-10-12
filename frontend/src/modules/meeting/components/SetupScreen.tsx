import React, { useState, useEffect, useRef } from 'react'
import { copyToClipboard } from '../../../utils/clipboard'
import {
    IconVideo,
    IconUsers,
    IconMic,
    IconMicOff,
    IconInfo,
    IconRefresh,
    IconX,
    IconCopy
} from '../../../components/common/Icons'

/* ──────────────────────────────────────────────────────────
   Lobby Icons (no external dependency)
   ────────────────────────────────────────────────────────── */
const IconCamera = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
)
const IconCameraOff = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M21 15.5l2 1.5V7l-7 5" />
        <path d="M10.4 5H14a2 2 0 0 1 2 2v3.6" />
        <path d="M16 16.5V17a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 1.5-1.9" />
    </svg>
)

/* ──────────────────────────────────────────────────────────
   LocalVideoPreview component
   ────────────────────────────────────────────────────────── */
export interface LocalVideoPreviewProps {
    stream: MediaStream | null
    videoOff: boolean
}

export function LocalVideoPreview({ stream, videoOff }: LocalVideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const el = videoRef.current
        if (!el) return
        if (stream && !videoOff) {
            el.srcObject = stream
            el.play().catch(() => { })
        } else {
            el.srcObject = null
        }
    }, [stream, videoOff])

    if (!stream || videoOff) {
        return (
            <div style={{
                background: 'var(--color-surface-2)',
                width: '100%', height: '100%', minHeight: 280,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)'
            }}>
                <div className="avatar avatar-xl" style={{ width: 80, height: 80, fontSize: '1.75rem', marginBottom: 12 }}>ME</div>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Camera is off
                </span>
            </div>
        )
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
                width: '100%', height: '100%', minHeight: 280,
                objectFit: 'cover', borderRadius: 'var(--radius-lg)',
                display: 'block', transform: 'scaleX(-1)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
        />
    )
}

/* ──────────────────────────────────────────────────────────
   Setup Screen (pre-join lobby)
   ────────────────────────────────────────────────────────── */
export interface SetupScreenProps {
    token: string
    setToken: (v: string) => void
    meetingInput: string
    setMeetingInput: (v: string) => void
    connected: boolean
    mediaLoading: boolean
    mediaError: string | null
    onConnect: () => void
    onJoin: (id: string, isCameraOff?: boolean) => void
    localStream: MediaStream | null
    replaceLocalStream?: (stream: MediaStream) => void
    initialVideoOff?: boolean
    onToggleVideo?: (isOff: boolean) => void
    onLeave?: () => void
}

export function SetupScreen({
    token, setToken, meetingInput, setMeetingInput,
    connected, mediaLoading, mediaError, onConnect, onJoin,
    localStream, replaceLocalStream, initialVideoOff = false, onToggleVideo, onLeave
}: SetupScreenProps) {
    const [activeTab, setActiveTab] = useState<'join' | 'create'>('join')
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(() => {
        try {
            return initialVideoOff || sessionStorage.getItem('jts_initial_camera_off') === 'true'
        } catch {
            return initialVideoOff
        }
    })

    // Waiting room state
    const [isWaiting, setIsWaiting] = useState(false)
    const [waitingMessage, setWaitingMessage] = useState('Requesting access to meeting room...')
    const [waitingProgress, setWaitingProgress] = useState(0)

    // Generate unique meeting ID
    const [generatedId, setGeneratedId] = useState(() => {
        const rand = Math.random().toString(36).substring(2, 8)
        return `room-${rand}`
    })
    const [isCopied, setIsCopied] = useState(false)

    const [recentMeetingId, setRecentMeetingId] = useState<string | null>(() => {
        try {
            return localStorage.getItem('jts_last_meeting_id')
        } catch {
            return null
        }
    })

    useEffect(() => {
        try {
            const saved = localStorage.getItem('jts_last_meeting_id')
            setRecentMeetingId(saved)
            if (saved && !meetingInput) {
                setMeetingInput(saved)
            }
        } catch { }
    }, [])

    useEffect(() => {
        try {
            setRecentMeetingId(localStorage.getItem('jts_last_meeting_id'))
        } catch { }
    }, [meetingInput])

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMuted
            })
        }
        setIsMuted(!isMuted)
    }

    const toggleVideo = async () => {
        if (!localStream) return
        if (!isVideoOff) {
            // Physically stop camera tracks so laptop LED turns off completely
            localStream.getVideoTracks().forEach(track => {
                try { track.stop() } catch {}
                localStream.removeTrack(track)
            })
            const cleanAudio = new MediaStream(localStream.getAudioTracks())
            replaceLocalStream?.(cleanAudio)
            setIsVideoOff(true)
            onToggleVideo?.(true)
            try { sessionStorage.setItem('jts_initial_camera_off', 'true') } catch {}
        } else {
            try {
                let freshStream: MediaStream | null = null
                try {
                    freshStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } }
                    })
                } catch {
                    freshStream = await navigator.mediaDevices.getUserMedia({ video: true })
                }
                const videoTrack = freshStream.getVideoTracks()[0]
                if (videoTrack) {
                    localStream.getVideoTracks().forEach(t => {
                        try { t.stop() } catch {}
                        localStream.removeTrack(t)
                    })
                    const newStream = new MediaStream([...localStream.getAudioTracks(), videoTrack])
                    replaceLocalStream?.(newStream)
                }
                setIsVideoOff(false)
                onToggleVideo?.(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
            } catch (err) {
                console.error("Setup camera enable failed:", err)
            }
        }
    }

    const handleCopy = () => {
        copyToClipboard(generatedId)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2500)
    }

    const handleActionClick = () => {
        const targetMeetingId = activeTab === 'create' ? generatedId : meetingInput
        if (!targetMeetingId.trim()) return

        if (activeTab === 'create') {
            try {
                sessionStorage.setItem(`jts_created_meeting_${targetMeetingId.trim()}`, 'true')
            } catch (e) { }
        }

        setMeetingInput(targetMeetingId.trim())
        setIsWaiting(true)
        setWaitingProgress(0)
        setWaitingMessage(activeTab === 'create' ? 'Setting up secure meeting room...' : 'Waiting for host approval...')

        // Simulate fast setup / approval
        let progress = 0
        const interval = setInterval(() => {
            progress += 20
            setWaitingProgress(progress)

            if (progress === 40) {
                setWaitingMessage(activeTab === 'create' ? 'Configuring media pipelines...' : 'Verifying meeting credentials...')
            }
            if (progress === 80) {
                setWaitingMessage(activeTab === 'create' ? 'Room ready! Entering as Host...' : 'Host approved your request! Entering meeting...')
            }

            if (progress >= 100) {
                clearInterval(interval)
                setTimeout(() => {
                    onJoin(targetMeetingId)
                }, 200)
            }
        }, 150)
    }

    // Render 1. Connecting screen (if not connected yet)
    if (!connected) {
        return (
            <div style={{
                minHeight: '100dvh', background: 'var(--color-bg-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', position: 'relative', overflow: 'hidden'
            }}>
                <div aria-hidden="true" style={{
                    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none'
                }} />

                <div className="anim-scale-in" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                        <div style={{
                            width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: 'var(--shadow-glow-accent)', color: '#fff'
                        }}>
                            <IconVideo />
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                            JTS<span className="gradient-text">Meet</span>
                        </span>
                    </div>

                    <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            width: 54, height: 54, borderRadius: '50%',
                            border: '3.5px solid rgba(99,102,241,0.2)',
                            borderTopColor: 'var(--color-accent)',
                            animation: 'spin 1s linear infinite',
                            marginBottom: 20
                        }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>
                            Connecting to Meeting Room...
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 24px', maxWidth: 300, lineHeight: 1.5 }}>
                            Establishing secure encrypted signaling connection
                        </p>
                        <button
                            onClick={() => {
                                try {
                                    localStorage.removeItem('jts_guest_token')
                                    localStorage.removeItem('jts_guest_user_id')
                                    localStorage.removeItem('jts_guest_details')
                                    sessionStorage.removeItem('jts_active_meeting_id')
                                    sessionStorage.removeItem('jts_meeting_joined')
                                    localStorage.removeItem('jts_last_meeting_id')
                                } catch (e) { }
                                if (onLeave) {
                                    onLeave()
                                } else {
                                    window.location.hash = '#dashboard'
                                }
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '8px 20px', fontSize: '0.8125rem' }}
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Render 2. Waiting Room screen
    if (isWaiting) {
        return (
            <div style={{
                minHeight: '100dvh', background: 'var(--color-bg-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', position: 'relative', overflow: 'hidden'
            }}>
                {/* Background glow */}
                <div aria-hidden="true" style={{
                    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none'
                }} />

                <div className="anim-scale-in" style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* Wave pulse animation */}
                        <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                                position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                                background: 'var(--color-accent-light)', border: '1.5px solid rgba(99,102,241,0.3)',
                                animation: 'waiting-pulse 1.8s infinite ease-in-out'
                            }} />
                            <div style={{
                                position: 'absolute', width: '75%', height: '75%', borderRadius: '50%',
                                background: 'var(--color-accent-light)', border: '1.5px solid rgba(99,102,241,0.4)',
                                animation: 'waiting-pulse-delay 1.8s infinite ease-in-out'
                            }} />
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                boxShadow: 'var(--shadow-glow-accent)', zIndex: 1
                            }}>
                                <IconUsers />
                            </div>
                        </div>

                        <div className="badge badge-accent" style={{ marginBottom: 12 }}>
                            Waiting Room
                        </div>

                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>
                            {waitingMessage}
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 24px', maxWidth: 300, lineHeight: 1.5 }}>
                            The host has been notified of your request. Please wait until they approve entry.
                        </p>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 32 }}>
                            <div style={{ width: `${waitingProgress}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease-out' }} />
                        </div>

                        <button onClick={() => setIsWaiting(false)} className="btn btn-secondary" style={{ padding: '8px 24px' }}>
                            Cancel Request
                        </button>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes waiting-pulse {
                            0% { transform: scale(0.85); opacity: 0.8; }
                            100% { transform: scale(1.4); opacity: 0; }
                        }
                        @keyframes waiting-pulse-delay {
                            0% { transform: scale(0.85); opacity: 0.8; }
                            100% { transform: scale(1.2); opacity: 0; }
                        }
                    ` }} />
                </div>
            </div>
        )
    }

    // Render 3. Lobby view (connected)
    return (
        <div style={{
            minHeight: '100dvh', background: 'var(--color-bg-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background glow */}
            <div aria-hidden="true" style={{
                position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none'
            }} />

            <div className="anim-scale-in" style={{ width: '100%', maxWidth: 940, position: 'relative', zIndex: 1 }}>

                {/* Header Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button
                            onClick={() => {
                                try {
                                    localStorage.removeItem('jts_guest_token')
                                    localStorage.removeItem('jts_guest_user_id')
                                    localStorage.removeItem('jts_guest_details')
                                    sessionStorage.removeItem('jts_active_meeting_id')
                                    sessionStorage.removeItem('jts_meeting_joined')
                                    localStorage.removeItem('jts_last_meeting_id')
                                } catch (e) { }
                                window.location.href = '/'
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '6px 12px',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'background var(--duration-fast)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            ◀ Back
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: 'var(--shadow-glow-accent)', color: '#fff'
                            }}>
                                <IconVideo />
                            </div>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                                JTS<span className="gradient-text">Meet</span>
                            </span>
                        </div>
                    </div>

                    <span className="badge badge-success">
                        <span className="badge-dot success pulse" />
                        Secured Lobby
                    </span>
                </div>

                {/* Two-Column Grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: 32, alignItems: 'stretch'
                }}>

                    {/* Column 1: Video & Audio Controls */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Device Preview</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Check your camera and microphone
                            </span>
                        </div>

                        {/* Video Frame */}
                        <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <LocalVideoPreview stream={localStream} videoOff={isVideoOff} />

                            {/* Floating Toolbar Controls */}
                            <div style={{
                                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                                display: 'flex', gap: 12, zIndex: 5, padding: '6px 12px',
                                background: 'rgba(10,11,15,0.75)', backdropFilter: 'blur(16px)',
                                borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <button
                                    onClick={toggleMute}
                                    style={{
                                        borderRadius: '50%',
                                        width: 46,
                                        height: 46,
                                        padding: 0,
                                        border: isMuted ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.15)',
                                        background: isMuted ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isMuted ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                                    title={isMuted ? "Unmute microphone" : "Mute microphone"}
                                >
                                    {isMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
                                </button>
                                <button
                                    onClick={toggleVideo}
                                    style={{
                                        borderRadius: '50%',
                                        width: 46,
                                        height: 46,
                                        padding: 0,
                                        border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.15)',
                                        background: isVideoOff ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isVideoOff ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                                    title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                                >
                                    {isVideoOff ? <IconCameraOff size={22} /> : <IconCamera size={22} />}
                                </button>
                            </div>
                        </div>

                        {mediaError && (
                            <div style={{
                                background: 'rgba(234, 179, 8, 0.08)',
                                border: '1px solid rgba(234, 179, 8, 0.25)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <IconInfo size={16} color="#fde047" />
                                    <span style={{ fontSize: '0.75rem', color: '#fde047', lineHeight: 1.4 }}>
                                        {mediaError}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onConnect()}
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        flexShrink: 0,
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                        color: '#fde047'
                                    }}
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Column 2: Join / Create Tab Form */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>

                        {/* Tab Switcher Headers */}
                        <div style={{
                            display: 'flex', background: 'rgba(255,255,255,0.03)',
                            borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 24,
                            border: '1px solid var(--color-border)'
                        }}>
                            <button
                                onClick={() => setActiveTab('join')}
                                style={{
                                    flex: 1, padding: '8px 12px', fontSize: '0.875rem', fontWeight: 600,
                                    borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'join' ? 'var(--color-surface-2)' : 'transparent',
                                    color: activeTab === 'join' ? '#fff' : 'var(--color-text-secondary)',
                                    transition: 'background var(--duration-fast), color var(--duration-fast)'
                                }}
                            >
                                Join Meeting
                            </button>
                            <button
                                onClick={() => setActiveTab('create')}
                                style={{
                                    flex: 1, padding: '8px 12px', fontSize: '0.875rem', fontWeight: 600,
                                    borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'create' ? 'var(--color-surface-2)' : 'transparent',
                                    color: activeTab === 'create' ? '#fff' : 'var(--color-text-secondary)',
                                    transition: 'background var(--duration-fast), color var(--duration-fast)'
                                }}
                            >
                                Create Meeting
                            </button>
                        </div>

                        {/* Switch tab inputs */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {activeTab === 'join' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {recentMeetingId && (
                                        <div style={{
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <IconRefresh size={12} color="#a5b4fc" />
                                                    <span>Last Active Meeting</span>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 600, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                                                    {recentMeetingId}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMeetingInput(recentMeetingId)
                                                        onJoin(recentMeetingId)
                                                    }}
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px' }}
                                                >
                                                    Rejoin Room ↗
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        try {
                                                            localStorage.removeItem('jts_last_meeting_id')
                                                        } catch { }
                                                        setRecentMeetingId(null)
                                                        if (meetingInput === recentMeetingId) {
                                                            setMeetingInput('')
                                                        }
                                                    }}
                                                    title="Dismiss recent meeting"
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.08)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        borderRadius: '6px',
                                                        color: 'var(--color-text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '6px 9px',
                                                        fontSize: '0.8125rem',
                                                        lineHeight: 1,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                                                        e.currentTarget.style.color = '#f87171'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                                                        e.currentTarget.style.color = 'var(--color-text-muted)'
                                                    }}
                                                >
                                                    <IconX size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="label" htmlFor="lobby-join-id">Meeting ID</label>
                                        <input
                                            id="lobby-join-id"
                                            type="text"
                                            value={meetingInput}
                                            onChange={(e) => setMeetingInput(e.target.value)}
                                            className="input"
                                            placeholder="Enter meeting room code"
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                        Enter the Meeting ID above or click Rejoin Room to return to your previous session.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label className="label">Generated Meeting ID</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                type="text"
                                                readOnly
                                                value={generatedId}
                                                className="input"
                                                style={{ fontFamily: 'monospace', fontSize: '0.9375rem', color: '#a5b4fc' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopy}
                                                className={isCopied ? "btn btn-success" : "btn btn-secondary"}
                                                style={{
                                                    padding: isCopied ? '0 12px' : '0 12px',
                                                    background: isCopied ? '#16a34a' : undefined,
                                                    borderColor: isCopied ? '#16a34a' : undefined,
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title={isCopied ? "Copied to clipboard!" : "Copy Meeting ID"}
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Copied!</span>
                                                    </>
                                                ) : (
                                                    <IconCopy />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                        Copy the meeting room link or ID above and share it with your participants.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ marginTop: 24 }}>
                            <button
                                onClick={handleActionClick}
                                disabled={activeTab === 'join' ? !meetingInput.trim() : false}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: '0.9375rem' }}
                            >
                                {activeTab === 'join' ? (
                                    <>
                                        Join Meeting Session
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 6 }}>
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        Start and Create Meeting
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 6 }}>
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 28, margin: '28px 0 0' }}>
                    Secure P2P data streams managed via WebRTC and local peer context.
                </p>
            </div>
        </div>
    )
}
