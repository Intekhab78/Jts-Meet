import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../../../config'

interface WaitingRoomProps {
    meetingId: string
    guestToken: string
    guestName: string
    meetingTitle: string
    hostName: string
    onApproved: (approvedToken?: string) => void
    onLeave: () => void
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
    meetingId,
    guestToken,
    guestName,
    meetingTitle,
    hostName,
    onApproved,
    onLeave
}) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [isCameraOn, setIsCameraOn] = useState(true)
    const [isMicOn, setIsMicOn] = useState(true)
    const [isBlurred, setIsBlurred] = useState(false)
    const [audioLevel, setAudioLevel] = useState(0)
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
    const [isHostOnline, setIsHostOnline] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const animFrameRef = useRef<number | null>(null)

    // Socket listener for approval/denial and host presence
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            auth: { token: guestToken },
            transports: ['websocket']
        })

        socket.on('meeting:host-joined', () => {
            setIsHostOnline(true)
        })

        socket.on('guest:approved', (data?: { token?: string }) => {
            const approvedToken = data?.token || guestToken
            try {
                localStorage.setItem('jts_guest_token', approvedToken)
                localStorage.setItem('jts_token', approvedToken)
            } catch (e) {}
            // Stop preview stream before moving into room
            stopMediaStream()
            socket.disconnect()
            onApproved(approvedToken)
        })

        socket.on('guest:denied', () => {
            alert('Your request to join was declined by the host.')
            stopMediaStream()
            socket.disconnect()
            onLeave()
        })

        return () => {
            socket.disconnect()
        }
    }, [guestToken, onApproved, onLeave])

    const stopMediaStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current)
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => {})
        }
    }

    // Media Initialization
    const initMedia = async (videoDeviceId?: string, audioDeviceId?: string) => {
        try {
            stopMediaStream()

            const constraints: MediaStreamConstraints = {
                video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
                audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream
            setLocalStream(stream)

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(() => {})
            }

            // Audio level meter
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            if (AudioCtxClass) {
                const ctx = new AudioCtxClass()
                audioCtxRef.current = ctx
                const source = ctx.createMediaStreamSource(stream)
                const analyser = ctx.createAnalyser()
                analyser.fftSize = 64
                source.connect(analyser)

                const dataArray = new Uint8Array(analyser.frequencyBinCount)
                const checkVolume = () => {
                    analyser.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i]
                    }
                    const avg = sum / dataArray.length
                    setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
                    animFrameRef.current = requestAnimationFrame(checkVolume)
                }
                checkVolume()
            }

            // Enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices()
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
        } catch (err) {
            console.warn('Green room camera/mic preview permission or device error:', err)
        }
    }

    useEffect(() => {
        initMedia()
        return () => {
            stopMediaStream()
        }
    }, [])

    const toggleCamera = () => {
        if (streamRef.current) {
            const vTrack = streamRef.current.getVideoTracks()[0]
            if (vTrack) {
                vTrack.enabled = !vTrack.enabled
                setIsCameraOn(vTrack.enabled)
            }
        }
    }

    const toggleMic = () => {
        if (streamRef.current) {
            const aTrack = streamRef.current.getAudioTracks()[0]
            if (aTrack) {
                aTrack.enabled = !aTrack.enabled
                setIsMicOn(aTrack.enabled)
            }
        }
    }

    const handleLeave = () => {
        stopMediaStream()
        onLeave()
    }

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/)
        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                maxWidth: 960,
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 32,
                alignItems: 'center'
            }}>
                {/* Left: Green Room Video Preview Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16/9',
                        background: '#0a0d14',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6), 0 0 1px 1px rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        {/* Video Element */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transform: 'scaleX(-1)', // mirror view
                                display: isCameraOn && localStream ? 'block' : 'none',
                                filter: isBlurred ? 'blur(12px) contrast(1.05)' : 'none',
                                transition: 'filter 0.3s ease'
                            }}
                        />

                        {/* Camera Off Avatar Placeholder */}
                        {(!isCameraOn || !localStream) && (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#131b2e'
                            }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
                                }}>
                                    {getInitials(guestName)}
                                </div>
                                <span style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                    Camera is off
                                </span>
                            </div>
                        )}

                        {/* Name tag in bottom left */}
                        <div style={{
                            position: 'absolute',
                            bottom: 14,
                            left: 14,
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(10px)',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <span>{guestName}</span>
                            {/* Live Audio Visualizer Dots */}
                            {isMicOn && (
                                <div style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }} title="Microphone volume">
                                    <span style={{
                                        width: 4,
                                        height: 8,
                                        borderRadius: 2,
                                        background: audioLevel > 5 ? '#22c55e' : 'rgba(255,255,255,0.25)',
                                        transition: 'background 0.1s ease'
                                    }} />
                                    <span style={{
                                        width: 4,
                                        height: 12,
                                        borderRadius: 2,
                                        background: audioLevel > 25 ? '#22c55e' : 'rgba(255,255,255,0.25)',
                                        transition: 'background 0.1s ease'
                                    }} />
                                    <span style={{
                                        width: 4,
                                        height: 16,
                                        borderRadius: 2,
                                        background: audioLevel > 50 ? '#22c55e' : 'rgba(255,255,255,0.25)',
                                        transition: 'background 0.1s ease'
                                    }} />
                                </div>
                            )}
                        </div>

                        {/* Floating Quick Action Bar at bottom center */}
                        <div style={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            {/* Mic Toggle */}
                            <button
                                onClick={toggleMic}
                                title={isMicOn ? "Turn microphone off" : "Turn microphone on"}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: isMicOn ? 'rgba(255,255,255,0.18)' : '#ef4444',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.1rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: !isMicOn ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none'
                                }}
                            >
                                {isMicOn ? '🎙️' : '🔇'}
                            </button>

                            {/* Camera Toggle */}
                            <button
                                onClick={toggleCamera}
                                title={isCameraOn ? "Turn camera off" : "Turn camera on"}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: isCameraOn ? 'rgba(255,255,255,0.18)' : '#ef4444',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.1rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: !isCameraOn ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none'
                                }}
                            >
                                {isCameraOn ? '📹' : '🚫'}
                            </button>

                            {/* Background Blur Toggle */}
                            <button
                                onClick={() => setIsBlurred(prev => !prev)}
                                title={isBlurred ? "Remove background blur" : "Blur your background"}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    border: isBlurred ? '1.5px solid #818cf8' : 'none',
                                    background: isBlurred ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255,255,255,0.18)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ✨
                            </button>
                        </div>
                    </div>

                    {/* Hardware Device Selectors */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        {videoDevices.length > 0 && (
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    CAMERA
                                </label>
                                <select
                                    value={selectedVideoDevice}
                                    onChange={(e) => {
                                        setSelectedVideoDevice(e.target.value)
                                        initMedia(e.target.value, selectedAudioDevice)
                                    }}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        fontSize: '0.75rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {videoDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId} style={{ background: '#1e293b' }}>
                                            {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {audioDevices.length > 0 && (
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    MICROPHONE
                                </label>
                                <select
                                    value={selectedAudioDevice}
                                    onChange={(e) => {
                                        setSelectedAudioDevice(e.target.value)
                                        initMedia(selectedVideoDevice, e.target.value)
                                    }}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        fontSize: '0.75rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {audioDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId} style={{ background: '#1e293b' }}>
                                            {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Google Meet Style Status & Admission Card */}
                <div className="glass-card" style={{
                    padding: '36px 32px',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}>
                    {/* Header badge & title */}
                    <div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: isHostOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isHostOnline ? '#4ade80' : '#fbbf24',
                            border: `1px solid ${isHostOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            marginBottom: 14
                        }}>
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: isHostOnline ? '#4ade80' : '#fbbf24',
                                animation: 'jts-pulse-dot 1.4s infinite'
                            }} />
                            {isHostOnline ? '🟢 Host is in the meeting' : '⏳ Waiting for Host to start...'}
                        </div>
                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                            {isHostOnline
                                ? `Asking ${hostName || 'the host'} to admit you into the call`
                                : `The meeting will begin when ${hostName || 'the organizer'} joins`}
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                            {isHostOnline
                                ? "The host has arrived and has been notified that you're waiting in the lobby."
                                : "We've sent a notification to the host. You'll be admitted as soon as the session begins."}
                        </p>
                    </div>

                    {/* Meeting details */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                    }}>
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
                                Meeting
                            </span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                                {meetingTitle || 'Scheduled Meeting'}
                            </span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
                                Host / Organizer
                            </span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#93c5fd' }}>
                                👤 {hostName || 'Meeting Organizer'}
                            </span>
                        </div>
                    </div>

                    {/* Cancel button */}
                    <button
                        onClick={handleLeave}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#f87171',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        ✕ Cancel Request
                    </button>
                </div>
            </div>
        </div>
    )
}
