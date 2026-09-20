import React, { useState, useEffect, useRef } from 'react'
import { useWebRTCContext } from '../context/WebRTCContext'
import { useSocketContext } from '../context/SocketContext'
import {
    IconMic,
    IconMicOff,
    IconPhoneOff,
    IconVideo,
    IconVideoOff,
    IconMonitor
} from '../../../components/common/Icons'

const IconMaximize2 = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
)

const IconMinimize2 = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 14 10 14 10 20" />
        <polyline points="20 10 14 10 14 4" />
        <line x1="14" y1="10" x2="21" y2="3" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
)

const IconSettings = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
)

export interface ActiveCallData {
    meetingId: string
    peerId: string
    peerName: string
    peerAvatar?: string
    callType: 'audio' | 'video' | 'screenshare'
}

interface ActiveAudioCallModalProps {
    call: ActiveCallData | null
    onEndCall: () => void
    onUpgradeToVideo?: () => void
}

export function ActiveAudioCallModal({ call, onEndCall, onUpgradeToVideo }: ActiveAudioCallModalProps) {
    const {
        localStream,
        remoteStreams,
        startScreenShare,
        stopScreenShare,
        screenSharingUserId,
        requestMedia,
        networkStatus,
        isReconnecting,
        replaceTrackOnPeers,
        switchAudioDevice,
        switchVideoDevice
    } = useWebRTCContext()
    const { socket } = useSocketContext()

    const [secondsElapsed, setSecondsElapsed] = useState(0)
    const [isMuted, setIsMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(call?.callType === 'audio')
    const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false)

    // Quick Device Switcher state
    const [showDevicePicker, setShowDevicePicker] = useState(false)
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
    const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedAudioId, setSelectedAudioId] = useState<string>('')
    const [selectedVideoId, setSelectedVideoId] = useState<string>('')
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('')

    const loadDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
            setSpeakerDevices(devices.filter(d => d.kind === 'audiooutput'))

            const aTrack = localStream?.getAudioTracks()[0]
            const vTrack = localStream?.getVideoTracks()[0]
            if (aTrack?.getSettings().deviceId) setSelectedAudioId(aTrack.getSettings().deviceId!)
            if (vTrack?.getSettings().deviceId) setSelectedVideoId(vTrack.getSettings().deviceId!)
        } catch (e) {
            console.warn('[DirectCall] Device enumeration error:', e)
        }
    }

    useEffect(() => {
        if (showDevicePicker) {
            loadDevices()
        }
    }, [showDevicePicker, localStream])

    const handleSelectMic = async (devId: string) => {
        setSelectedAudioId(devId)
        await switchAudioDevice(devId, (newTrack) => {
            replaceTrackOnPeers(newTrack)
        })
    }

    const handleSelectCamera = async (devId: string) => {
        setSelectedVideoId(devId)
        await switchVideoDevice(devId, (newTrack) => {
            replaceTrackOnPeers(newTrack)
        })
    }

    const handleSelectSpeaker = async (devId: string) => {
        setSelectedSpeakerId(devId)
        try {
            const audioEls = document.querySelectorAll('audio')
            audioEls.forEach((el: any) => {
                if (typeof el.setSinkId === 'function') {
                    el.setSinkId(devId).catch(() => {})
                }
            })
        } catch {}
    }

    // Sync camera state with call type
    useEffect(() => {
        if (call?.callType === 'audio') {
            setIsCameraOff(true)
        } else {
            setIsCameraOff(false)
        }
    }, [call?.callType])

    // Call duration timer
    useEffect(() => {
        if (!call) {
            setSecondsElapsed(0)
            return
        }
        const interval = setInterval(() => {
            setSecondsElapsed(prev => prev + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [call?.meetingId])

    // Listen for remote camera toggle
    useEffect(() => {
        if (!socket) return
        const handleCameraToggle = (data: { userId: string; isVideoOff: boolean }) => {
            setIsRemoteCameraOff(data.isVideoOff)
        }
        socket.on('meeting:camera-toggle', handleCameraToggle)
        return () => {
            socket.off('meeting:camera-toggle', handleCameraToggle)
        }
    }, [socket])

    // Format MM:SS
    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60)
        const s = totalSec % 60
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }

    // Toggle Microphone
    const handleToggleMute = () => {
        if (!localStream) return
        const audioTracks = localStream.getAudioTracks()
        if (audioTracks.length > 0) {
            const nextState = !audioTracks[0].enabled
            audioTracks.forEach(t => (t.enabled = nextState))
            setIsMuted(!nextState)
            if (socket && call?.meetingId) {
                socket.emit('meeting:mic-toggle', {
                    meetingId: call.meetingId,
                    isMuted: !nextState
                })
            }
        }
    }

    // Toggle Camera
    const handleToggleCamera = async () => {
        if (!localStream) {
            try {
                await requestMedia(false)
                setIsCameraOff(false)
            } catch {}
            return
        }
        const videoTracks = localStream.getVideoTracks()
        if (videoTracks.length > 0) {
            const nextState = !videoTracks[0].enabled
            videoTracks.forEach(t => (t.enabled = nextState))
            setIsCameraOff(!nextState)
            if (socket && call?.meetingId) {
                socket.emit('meeting:camera-toggle', {
                    meetingId: call.meetingId,
                    isVideoOff: !nextState
                })
            }
        } else {
            // Need to acquire video stream
            try {
                await requestMedia(false)
                setIsCameraOff(false)
            } catch (err) {
                console.warn('Failed to turn on camera:', err)
            }
        }
    }

    // Toggle Screen Share
    const handleToggleScreenShare = async () => {
        if (screenSharingUserId === 'me') {
            stopScreenShare()
        } else {
            try {
                await startScreenShare()
            } catch (err) {
                console.warn('Screen share error:', err)
            }
        }
    }

    // Find remote stream
    const remoteStreamList = Object.values(remoteStreams)
    const primaryRemoteStream = remoteStreamList[0] || null

    // Web Audio Voice Activity Detection for Remote audio
    useEffect(() => {
        if (!primaryRemoteStream) {
            setIsRemoteSpeaking(false)
            return
        }

        let audioCtx: AudioContext | null = null
        let animFrame: number | null = null

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
            audioCtx = new AudioContextClass()
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            const source = audioCtx.createMediaStreamSource(primaryRemoteStream)
            source.connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const checkVolume = () => {
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                const avg = sum / dataArray.length
                setIsRemoteSpeaking(avg > 14)
                animFrame = requestAnimationFrame(checkVolume)
            }
            checkVolume()
        } catch (e) {
            // AudioContext restricted or unsupported
        }

        return () => {
            if (animFrame) cancelAnimationFrame(animFrame)
            if (audioCtx && audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {})
            }
        }
    }, [primaryRemoteStream])

    if (!call) return null

    const isVideoOrScreen = call.callType === 'video' || call.callType === 'screenshare'
    const hasRemoteVideo = Boolean(
        primaryRemoteStream &&
        primaryRemoteStream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled) &&
        !isRemoteCameraOff
    )

    // ─────────────────────────────────────────────────────────────
    // 1. MINIMIZED FLOATING WINDOW (Allows multitasking in Teams chat/files)
    // ─────────────────────────────────────────────────────────────
    if (isMinimized) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 99999,
                    background: '#12141e',
                    border: '1px solid rgba(98, 100, 167, 0.45)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(98,100,167,0.3)',
                    color: '#fff',
                    animation: 'fadeIn 0.2s ease-out',
                    width: isVideoOrScreen ? 280 : 'auto',
                    minWidth: isVideoOrScreen ? 280 : 310
                }}
            >
                {/* Remote Audio output */}
                {remoteStreamList.map((stream, idx) => (
                    <audio
                        key={idx}
                        ref={(el) => {
                            if (el && el.srcObject !== stream) {
                                el.srcObject = stream
                                el.play().catch(() => {})
                            }
                        }}
                        autoPlay
                        playsInline
                    />
                ))}

                {isVideoOrScreen && (
                    <div style={{ position: 'relative', width: '100%', height: 160, background: '#0a0b10', overflow: 'hidden' }}>
                        {hasRemoteVideo ? (
                            <video
                                ref={(el) => {
                                    if (el && el.srcObject !== primaryRemoteStream) {
                                        el.srcObject = primaryRemoteStream
                                        el.play().catch(() => {})
                                    }
                                }}
                                autoPlay
                                muted={true}
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg, #181b2a 0%, #0d0f17 100%)' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#6264a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', border: isRemoteSpeaking ? '1.5px solid #3b82f6' : 'none' }}>
                                    {call.peerName.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Camera Off</span>
                            </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '2px 8px', borderRadius: 10, fontSize: '0.6875rem', fontWeight: 600 }}>
                            {formatTime(secondsElapsed)}
                        </div>
                    </div>
                )}

                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    {!isVideoOrScreen && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ position: 'relative', width: 34, height: 34 }}>
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '50%',
                                        background: '#6264a7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                        border: isRemoteSpeaking ? '1.5px solid #3b82f6' : '1.5px solid transparent'
                                    }}
                                >
                                    {call.peerName.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{call.peerName}</div>
                                <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{formatTime(secondsElapsed)}</div>
                            </div>
                        </div>
                    )}

                    {isVideoOrScreen && (
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                            {call.peerName}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            type="button"
                            onClick={handleToggleMute}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                                border: 'none',
                                color: isMuted ? '#ef4444' : '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isMuted ? <IconMicOff size={13} /> : <IconMic size={13} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsMinimized(false)}
                            title="Expand to Full View"
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.12)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <IconMaximize2 size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={onEndCall}
                            title="End Call"
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: '#ef4444',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <IconPhoneOff size={13} />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────
    // 2. DEDICATED 1-ON-1 TEAMS VIDEO CALL STAGE (No complex conference meeting clutter!)
    // ─────────────────────────────────────────────────────────────
    if (isVideoOrScreen) {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: '#0a0b12',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* AutoPlay all incoming audio streams */}
                {remoteStreamList.map((stream, idx) => (
                    <audio
                        key={idx}
                        ref={(el) => {
                            if (el && el.srcObject !== stream) {
                                el.srcObject = stream
                                el.play().catch(e => console.warn('[DirectCall] Audio play error:', e))
                            }
                        }}
                        autoPlay
                        playsInline
                    />
                ))}

                {/* Top Glassmorphic Header */}
                <div
                    style={{
                        position: 'absolute',
                        top: 20,
                        left: 24,
                        right: 24,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pointerEvents: 'none'
                    }}
                >
                    {/* Left: Contact Info + Live Call Duration */}
                    <div
                        style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: 'rgba(18, 20, 32, 0.75)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '8px 16px',
                            borderRadius: 24,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                        }}
                    >
                        {call.peerAvatar ? (
                            <img
                                src={call.peerAvatar}
                                alt={call.peerName}
                                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    background: '#6264a7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: '#fff'
                                }}
                            >
                                {call.peerName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{call.peerName}</span>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            </div>
                            <div style={{ fontSize: '0.71875rem', color: '#94a3b8', fontWeight: 600 }}>
                                {formatTime(secondsElapsed)} &bull; {call.callType === 'screenshare' ? 'Screen Share' : 'HD Video Call'}
                            </div>
                        </div>
                    </div>

                    {/* Right: Minimize button */}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        title="Minimize to Picture-in-Picture"
                        style={{
                            pointerEvents: 'auto',
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: 'rgba(18, 20, 32, 0.75)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(98, 100, 167, 0.4)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(18, 20, 32, 0.75)')}
                    >
                        <IconMinimize2 size={16} />
                    </button>
                </div>

                {/* Main Video Viewport (Remote Peer Video) */}
                <div
                    style={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: '#07080d'
                    }}
                >
                    {/* 📶 Network Instability / Reconnecting Alert Banner */}
                    {(isReconnecting || networkStatus !== 'online') && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 35,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                background: 'rgba(217, 119, 6, 0.92)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                padding: '8px 20px',
                                borderRadius: 24,
                                color: '#fff',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                                animation: 'pulse 1.6s infinite'
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffea00', display: 'inline-block' }} />
                            <span>📶 Connection unstable. Reconnecting call & ICE restart...</span>
                        </div>
                    )}

                    {/* 📶 Full Stage Reconnection Overlay on Prolonged Disconnection */}
                    {(isReconnecting || networkStatus === 'offline') && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 25,
                                background: 'rgba(10, 11, 18, 0.85)',
                                backdropFilter: 'blur(14px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 16,
                                color: '#fff'
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(98, 100, 167, 0.3)',
                                    borderTopColor: '#6264a7',
                                    animation: 'spin 1s linear infinite'
                                }}
                            />
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                                    Reconnecting Call...
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                    Restoring WebRTC media stream & ICE candidate mesh
                                </div>
                            </div>
                        </div>
                    )}

                    {hasRemoteVideo ? (
                        <video
                            ref={(el) => {
                                if (el && el.srcObject !== primaryRemoteStream) {
                                    el.srcObject = primaryRemoteStream
                                    el.play().catch(e => console.warn('[DirectCall] Remote video play error:', e))
                                }
                            }}
                            autoPlay
                            muted={true}
                            playsInline
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: call.callType === 'screenshare' ? 'contain' : 'cover'
                            }}
                        />
                    ) : (
                        /* Remote Camera Off: Sleek Teams Avatar with Sound Waves */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                            <div style={{ position: 'relative', width: 140, height: 140 }}>
                                {isRemoteSpeaking && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: -14,
                                                borderRadius: '50%',
                                                border: '2px solid rgba(98, 100, 167, 0.7)',
                                                animation: 'pulse 1.8s infinite ease-out'
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: -28,
                                                borderRadius: '50%',
                                                border: '1.5px solid rgba(98, 100, 167, 0.35)',
                                                animation: 'pulse 1.8s 0.6s infinite ease-out'
                                            }}
                                        />
                                    </>
                                )}
                                {call.peerAvatar ? (
                                    <img
                                        src={call.peerAvatar}
                                        alt={call.peerName}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: isRemoteSpeaking ? '4px solid #6264a7' : '4px solid rgba(255, 255, 255, 0.15)',
                                            boxShadow: '0 12px 35px rgba(0,0,0,0.6)'
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6264a7 0%, #464775 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '3rem',
                                            fontWeight: 800,
                                            color: '#fff',
                                            border: isRemoteSpeaking ? '4px solid #6264a7' : '4px solid rgba(255, 255, 255, 0.15)',
                                            boxShadow: '0 12px 35px rgba(0,0,0,0.6)'
                                        }}
                                    >
                                        {call.peerName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                                    {call.peerName}
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                    {isRemoteSpeaking ? 'Speaking...' : 'Camera is off'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Local Self-View Video in Picture-in-Picture (Bottom-Right) */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 100,
                            right: 28,
                            width: 200,
                            height: 130,
                            borderRadius: 16,
                            overflow: 'hidden',
                            background: '#121420',
                            border: '2px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: '0 12px 35px rgba(0,0,0,0.7)',
                            zIndex: 15
                        }}
                    >
                        {!isCameraOff && localStream ? (
                            <video
                                ref={(el) => {
                                    if (el && el.srcObject !== localStream) {
                                        el.srcObject = localStream
                                        el.play().catch(e => console.warn('[DirectCall] Local video play error:', e))
                                    }
                                }}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)'
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    background: 'linear-gradient(135deg, #1e2030 0%, #12141f 100%)',
                                    color: '#94a3b8',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}
                            >
                                <IconVideoOff size={20} color="#94a3b8" />
                                <span>You (Camera Off)</span>
                            </div>
                        )}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 6,
                                left: 8,
                                background: 'rgba(0,0,0,0.65)',
                                backdropFilter: 'blur(6px)',
                                padding: '2px 8px',
                                borderRadius: 8,
                                fontSize: '0.625rem',
                                color: '#fff',
                                fontWeight: 700
                            }}
                        >
                            You
                        </div>
                    </div>
                </div>

                {/* Bottom Floating Call Toolbar (Microsoft Teams Style) */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        background: 'rgba(18, 20, 32, 0.88)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '10px 20px',
                        borderRadius: 36,
                        boxShadow: '0 16px 45px rgba(0, 0, 0, 0.75)'
                    }}
                >
                    {/* Microphone Mute / Unmute */}
                    <button
                        type="button"
                        onClick={handleToggleMute}
                        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: isMuted ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {isMuted ? <IconMicOff size={20} /> : <IconMic size={20} />}
                    </button>

                    {/* Camera On / Off */}
                    <button
                        type="button"
                        onClick={handleToggleCamera}
                        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: isCameraOff ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: isCameraOff ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {isCameraOff ? <IconVideoOff size={20} /> : <IconVideo size={20} />}
                    </button>

                    {/* Screen Share */}
                    <button
                        type="button"
                        onClick={handleToggleScreenShare}
                        title={screenSharingUserId === 'me' ? 'Stop Sharing Screen' : 'Share Screen'}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: screenSharingUserId === 'me' ? '#22c55e' : 'rgba(255, 255, 255, 0.12)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <IconMonitor size={20} />
                    </button>

                    {/* ⚙️ Quick Device Switcher Button */}
                    <button
                        type="button"
                        onClick={() => setShowDevicePicker(prev => !prev)}
                        title="Quick Camera & Microphone Settings"
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: showDevicePicker ? '#6264a7' : 'rgba(255, 255, 255, 0.12)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: showDevicePicker ? '0 4px 15px rgba(98, 100, 167, 0.5)' : 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <IconSettings size={20} />
                    </button>

                    {/* Quick Device Switcher Floating Glassmorphic Popover */}
                    {showDevicePicker && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 72,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 310,
                                background: 'rgba(18, 20, 32, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.16)',
                                borderRadius: 20,
                                padding: '16px 18px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
                                color: '#fff',
                                zIndex: 40,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 14,
                                animation: 'fadeIn 0.2s ease-out'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>⚙️ Mid-Call Device Settings</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDevicePicker(false)}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}
                                >
                                    &times;
                                </button>
                            </div>

                            {/* Microphone Selector */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    🎙️ Microphone (Audio Input)
                                </label>
                                <select
                                    value={selectedAudioId}
                                    onChange={(e) => handleSelectMic(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: '#0d0e17',
                                        border: '1px solid rgba(255, 255, 255, 0.18)',
                                        borderRadius: 10,
                                        padding: '8px 10px',
                                        color: '#fff',
                                        fontSize: '0.8125rem',
                                        outline: 'none'
                                    }}
                                >
                                    {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                                    {audioDevices.map((d, i) => (
                                        <option key={d.deviceId || i} value={d.deviceId}>
                                            {d.label || `Microphone ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Camera Selector */}
                            {call.callType !== 'audio' && (
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        📹 Camera (Video Input)
                                    </label>
                                    <select
                                        value={selectedVideoId}
                                        onChange={(e) => handleSelectCamera(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: '#0d0e17',
                                            border: '1px solid rgba(255, 255, 255, 0.18)',
                                            borderRadius: 10,
                                            padding: '8px 10px',
                                            color: '#fff',
                                            fontSize: '0.8125rem',
                                            outline: 'none'
                                        }}
                                    >
                                        {videoDevices.length === 0 && <option value="">Default Camera</option>}
                                        {videoDevices.map((d, i) => (
                                            <option key={d.deviceId || i} value={d.deviceId}>
                                                {d.label || `Camera ${i + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Speaker Selector */}
                            {speakerDevices.length > 0 && (
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        🔊 Speaker (Audio Output)
                                    </label>
                                    <select
                                        value={selectedSpeakerId}
                                        onChange={(e) => handleSelectSpeaker(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: '#0d0e17',
                                            border: '1px solid rgba(255, 255, 255, 0.18)',
                                            borderRadius: 10,
                                            padding: '8px 10px',
                                            color: '#fff',
                                            fontSize: '0.8125rem',
                                            outline: 'none'
                                        }}
                                    >
                                        {speakerDevices.map((d, i) => (
                                            <option key={d.deviceId || i} value={d.deviceId}>
                                                {d.label || `Speaker ${i + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

                    {/* Red End Call Button */}
                    <button
                        type="button"
                        onClick={onEndCall}
                        title="End Call"
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 8px 25px rgba(239, 68, 68, 0.5)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <IconPhoneOff size={22} />
                    </button>
                </div>
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────
    // 3. DEDICATED 1-ON-1 TEAMS AUDIO CALL STAGE
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="modal-overlay" style={{ zIndex: 99999, backdropFilter: 'blur(16px)', background: 'rgba(5, 6, 12, 0.88)' }}>
            {/* AutoPlay all incoming audio streams */}
            {remoteStreamList.map((stream, idx) => (
                <audio
                    key={idx}
                    ref={(el) => {
                        if (el && el.srcObject !== stream) {
                            el.srcObject = stream
                            el.play().catch(e => console.warn('[ActiveCall] Audio play error:', e))
                        }
                    }}
                    autoPlay
                    playsInline
                />
            ))}

            <div
                className="modal-container anim-scale-in"
                style={{
                    maxWidth: 440,
                    width: '92%',
                    padding: 'clamp(28px, 5vw, 40px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 24,
                    background: 'linear-gradient(180deg, rgba(22, 24, 37, 0.98) 0%, rgba(14, 16, 24, 0.98) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 24,
                    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 50px rgba(98, 100, 167, 0.25)',
                    position: 'relative'
                }}
            >
                {/* Minimize Button in Top-Right */}
                <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize call (multitask in chat)"
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                >
                    <IconMinimize2 size={15} />
                </button>

                {/* Top Status Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#4ade80',
                        fontSize: '0.71875rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                        <span>CONNECTED &bull; JTS MEET HD VOICE</span>
                    </div>

                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: 6 }}>
                        {formatTime(secondsElapsed)}
                    </div>
                </div>

                {/* Large Center Avatar with Dynamic Speaking Waves */}
                <div style={{ position: 'relative', width: 120, height: 120, margin: '8px 0' }}>
                    {isRemoteSpeaking && (
                        <>
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: -16,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(98, 100, 167, 0.7)',
                                    animation: 'pulse 1.8s infinite ease-out'
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: -32,
                                    borderRadius: '50%',
                                    border: '1.5px solid rgba(98, 100, 167, 0.35)',
                                    animation: 'pulse 1.8s 0.6s infinite ease-out'
                                }}
                            />
                        </>
                    )}

                    {call.peerAvatar ? (
                        <img
                            src={call.peerAvatar}
                            alt={call.peerName}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isRemoteSpeaking ? '4px solid #6264a7' : '4px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: isRemoteSpeaking ? '0 0 30px rgba(98, 100, 167, 0.5)' : '0 10px 30px rgba(0,0,0,0.5)',
                                transition: 'all 0.2s ease'
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6264a7 0%, #464775 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.8rem',
                                fontWeight: 800,
                                color: '#fff',
                                border: isRemoteSpeaking ? '4px solid #6264a7' : '4px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: isRemoteSpeaking ? '0 0 30px rgba(98, 100, 167, 0.5)' : '0 10px 30px rgba(0,0,0,0.5)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {call.peerName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Contact Name and Speaking Status */}
                <div>
                    <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
                        {call.peerName}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: isRemoteSpeaking ? '#818cf8' : '#94a3b8', fontWeight: isRemoteSpeaking ? 700 : 500 }}>
                        {isRemoteSpeaking ? 'Speaking...' : 'Live 1-on-1 Voice Call'}
                    </p>
                </div>

                {/* Call Control Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                    {/* Mute Mic Button */}
                    <button
                        type="button"
                        onClick={handleToggleMute}
                        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: isMuted ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {isMuted ? <IconMicOff size={20} /> : <IconMic size={20} />}
                    </button>

                    {/* Switch to Video Call */}
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await requestMedia(false)
                                if (call) {
                                    call.callType = 'video'
                                    setIsCameraOff(false)
                                }
                            } catch (e) {
                                console.warn('Upgrade to video error:', e)
                            }
                        }}
                        title="Turn on Camera / Video"
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <IconVideo size={20} />
                    </button>

                    {/* Red End Call Button */}
                    <button
                        type="button"
                        onClick={onEndCall}
                        title="End Call"
                        style={{
                            width: 58,
                            height: 58,
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 8px 25px rgba(239, 68, 68, 0.45)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <IconPhoneOff size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}
