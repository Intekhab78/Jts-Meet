import React, { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../../../config'

interface GuestJoinPageProps {
    meetingId: string
    onNavigate: (view: any) => void
    onGuestRequestSuccess: (token: string, userId: string, isPending: boolean, details: any) => void
}

export const GuestJoinPage: React.FC<GuestJoinPageProps> = ({ meetingId, onNavigate, onGuestRequestSuccess }) => {
    const [meetingTitle, setMeetingTitle] = useState('Meeting Room')
    const [hostName, setHostName] = useState('Organizer')
    const [loadingInfo, setLoadingInfo] = useState(true)
    const [errorInfo, setErrorInfo] = useState<string | null>(null)
    const [isRestricted, setIsRestricted] = useState(false)

    // Form inputs
    const [guestName, setGuestName] = useState('')
    const [email, setEmail] = useState('')
    const [company, setCompany] = useState('')
    const [requesting, setRequesting] = useState(false)

    // Media states
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [cameraOn, setCameraOn] = useState(true)
    const [micOn, setMicOn] = useState(true)
    
    // Devices
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedVideoId, setSelectedVideoId] = useState('')
    const [selectedAudioId, setSelectedAudioId] = useState('')

    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000)
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Fetch meeting details
    useEffect(() => {
        const fetchMeetingDetails = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/guest/meeting/${meetingId}`)
                const data = await response.json()
                if (response.ok && data?.success) {
                    setMeetingTitle(data.data.title)
                    setHostName(data.data.hostName)
                    if (data.data.isGuestJoinEnabled === false) {
                        setIsRestricted(true)
                    }
                } else {
                    setErrorInfo(data.message || 'Failed to fetch meeting info')
                }
            } catch (err) {
                setErrorInfo('Failed to connect to server')
            } finally {
                setLoadingInfo(false)
            }
        }
        fetchMeetingDetails()
    }, [meetingId])

    // Load available hardware devices
    const getDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const video = devices.filter(d => d.kind === 'videoinput')
            const audio = devices.filter(d => d.kind === 'audioinput')
            setVideoDevices(video)
            setAudioDevices(audio)
            if (video.length > 0 && !selectedVideoId) setSelectedVideoId(video[0].deviceId)
            if (audio.length > 0 && !selectedAudioId) setSelectedAudioId(audio[0].deviceId)
        } catch (err) {
            // Ignore
        }
    }

    // Setup local media stream preview
    const startPreview = async (videoDeviceId = '', audioDeviceId = '') => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
        }
        try {
            const constraints: MediaStreamConstraints = {
                video: cameraOn ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true) : false,
                audio: micOn ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false
            }
            const media = await navigator.mediaDevices.getUserMedia(constraints)
            setStream(media)
            if (videoRef.current && cameraOn) {
                videoRef.current.srcObject = media
            }
            // Update the device lists now that permission is active
            getDevices()
        } catch (err) {
            console.error('Failed to get media stream preview:', err)
        }
    }

    useEffect(() => {
        startPreview(selectedVideoId, selectedAudioId)
        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop())
            }
        }
    }, [cameraOn, micOn])

    useEffect(() => {
        const initDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                await getDevices()
            } catch (err) {
                await getDevices()
            }
        }
        initDevices()
    }, [])

    const handleJoinRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!guestName.trim()) return

        setRequesting(true)
        try {
            const response = await fetch(`${API_BASE}/api/guest/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId,
                    guestName: guestName.trim(),
                    email: email.trim() || undefined,
                    company: company.trim() || undefined
                })
            })
            const data = await response.json()
            if (response.ok && data?.success) {
                const { token, userId, isPending } = data.data
                // Stop local preview so it doesn't conflict with main WebRTC connection
                if (stream) {
                    stream.getTracks().forEach(t => t.stop())
                }
                onGuestRequestSuccess(token, userId, isPending, {
                    guestName: guestName.trim(),
                    meetingTitle,
                    hostName
                })
            } else {
                alert(data.message || 'Failed to submit guest request')
            }
        } catch (err) {
            alert('Failed to connect to the backend server')
        } finally {
            setRequesting(false)
        }
    }

    if (loadingInfo) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: 50, height: 50, animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading meeting details...</p>
                </div>
            </div>
        )
    }

    if (errorInfo) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', color: '#fff', padding: 24 }}>
                <div className="glass-card" style={{ maxWidth: 440, padding: 36, textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>⚠️</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12, color: '#f87171' }}>Meeting Unavailable</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9375rem', lineHeight: 1.5 }}>{errorInfo}</p>
                    <button onClick={() => window.location.href = '/'} className="btn btn-primary" style={{ width: '100%' }}>
                        Back to Home
                    </button>
                </div>
            </div>
        )
    }

    if (isRestricted) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', color: '#fff', padding: 24 }}>
                <div className="glass-card" style={{ maxWidth: 440, padding: '40px 36px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(15, 17, 23, 0.65)', backdropFilter: 'blur(20px)' }}>
                    <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 20 }}>🚫</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12, color: '#f87171' }}>Join Restricted</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 28, fontSize: '0.9375rem', lineHeight: 1.5 }}>
                        This meeting is restricted to organization members. External guests are not allowed to join this session.
                    </p>
                    <button onClick={() => window.location.href = '/'} className="btn btn-primary" style={{ width: '100%', padding: 12, fontWeight: 750 }}>
                        Back to Home
                    </button>
                </div>
            </div>
        )
    }

    const isMobile = windowWidth < 768

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: 'radial-gradient(circle at top left, #12131a 0%, #08090d 100%)',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '20px 16px' : '30px 24px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1.10fr 0.90fr',
                gap: isMobile ? 20 : 28,
                width: '100%',
                maxWidth: 960,
                alignItems: 'center'
            }}>
                
                {/* Left Side: Video Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
                    <div className="glass-card" style={{
                        padding: isMobile ? 16 : 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        background: 'rgba(30, 30, 35, 0.55)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 16,
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Device Preview
                            </h4>
                        </div>
                        
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#050508', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {cameraOn ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>📷</div>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Camera is turned off</span>
                                </div>
                            )}

                            {/* Mic indicator */}
                            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                                <span>{micOn ? '🎙️ Mic Active' : '🔇 Muted'}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                onClick={() => setCameraOn(!cameraOn)}
                                className={`btn ${cameraOn ? 'btn-ghost' : 'btn-primary'}`}
                                style={{
                                    borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                    background: cameraOn ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.2)',
                                    color: cameraOn ? '#fff' : '#f87171',
                                    border: '1px solid ' + (cameraOn ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)'),
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                🎥
                            </button>
                            <button
                                onClick={() => setMicOn(!micOn)}
                                className={`btn ${micOn ? 'btn-ghost' : 'btn-primary'}`}
                                style={{
                                    borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                    background: micOn ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.2)',
                                    color: micOn ? '#fff' : '#f87171',
                                    border: '1px solid ' + (micOn ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)'),
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                🎙️
                            </button>
                        </div>
                    </div>

                    {/* Hardware Selectors */}
                    <div className="glass-card" style={{
                        padding: 16,
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: 12,
                        background: 'rgba(30, 30, 35, 0.55)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 16,
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Camera Device</label>
                            <select
                                value={selectedVideoId}
                                onChange={(e) => {
                                    setSelectedVideoId(e.target.value)
                                    startPreview(e.target.value, selectedAudioId)
                                }}
                                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                            >
                                {videoDevices.length === 0 ? (
                                    <option value="" style={{ background: '#12131a' }}>No Camera Found / Blocked</option>
                                ) : (
                                    videoDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId} style={{ background: '#12131a' }}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Microphone Device</label>
                            <select
                                value={selectedAudioId}
                                onChange={(e) => {
                                    setSelectedAudioId(e.target.value)
                                    startPreview(selectedVideoId, e.target.value)
                                }}
                                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                            >
                                {audioDevices.length === 0 ? (
                                    <option value="" style={{ background: '#12131a' }}>No Microphone Found / Blocked</option>
                                ) : (
                                    audioDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId} style={{ background: '#12131a' }}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Right Side: Welcome Details and Join form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="glass-card" style={{
                        padding: isMobile ? 24 : 32,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                        background: 'rgba(30, 30, 35, 0.55)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 16,
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'inline-block', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, marginBottom: 8 }}>
                                Guest Lobby
                            </span>
                            <h2 style={{ fontSize: isMobile ? '1.35rem' : '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '0 0 6px' }}>{meetingTitle}</h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                Organized by: <span style={{ color: '#fff', fontWeight: 600 }}>{hostName}</span>
                            </p>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />

                        <form onSubmit={handleJoinRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                    Your Full Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter your name to show in call"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                        Email <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(Optional)</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                        Company <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ABC Tech"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={requesting || !guestName.trim()}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '12px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', marginTop: 10 }}
                            >
                                {requesting ? 'Requesting Admission...' : 'Ask to Join'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
