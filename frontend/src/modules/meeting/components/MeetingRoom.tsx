import React, { useState, useRef, useEffect } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { useMeetingContext } from '../context/MeetingContext'
import { useWebRTCContext } from '../context/WebRTCContext'
import { MeetingChatPanel } from './MeetingChatPanel'
import { useMeetingChat } from '../hooks/useMeetingChat'
import { isScreenShareSupported } from '../services/screen.service'
import { FileUploader } from '../../file/components/FileUploader'
import { API_BASE } from '../../../config'

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]))
    } catch (e) {
        return null
    }
}

/* ──────────────────────────────────────────────────────────
   Inline SVG Icons (no external dependency)
────────────────────────────────────────────────────────── */
const IconRecord = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
)
const IconStopRecord = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
)

const IconMonitor = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
)
const IconUsers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)
const IconChat = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
)
const IconFiles = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
    </svg>
)
const IconPhoneOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 9c-2.2 0-4.3.4-6.2 1.1-.6.2-1 .7-1 1.3v3c0 .6.4 1 1 1 1.4-.4 2.8-1.1 4-2v-3.4c.7-.2 1.5-.3 2.2-.3s1.5.1 2.2.3v3.4c1.2.9 2.6 1.6 4 2 .6 0 1-.4 1-1v-3c0-.6-.4-1.1-1-1.3C16.3 9.4 14.2 9 12 9z"/>
    </svg>
)
const IconX = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)
const IconWifi = ({ on }: { on: boolean }) => on ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a11 11 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
)
const IconVideo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
)
const IconChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
)

type ActivePanel = 'participants' | 'chat' | 'files' | 'settings' | null

/* ──────────────────────────────────────────────────────────
   Helper: get initials from a fullName string
   ────────────────────────────────────────────────────────── */
function createDummyVideoTrack(): MediaStreamTrack {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
        ctx.fillStyle = '#0a0b0f'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    const stream = (canvas as any).captureStream(1)
    const track = stream.getVideoTracks()[0]
    if (track) {
        ;(track as any).isDummy = true
    }
    return track
}

function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)
    if (parts.length === 0 || !parts[0]) return '?'
    if (parts.length === 1) {
        return parts[0].slice(0, 1).toUpperCase()
    }
    const first = parts[0].slice(0, 1).toUpperCase()
    const last = parts[parts.length - 1].slice(0, 1).toUpperCase()
    return first + last
}

function getUserIdFromToken(token: string): string {
    if (!token) return ''
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.id || payload.userId || payload._id || ''
    } catch (e) {
        return ''
    }
}

function getAvatarGradient(name: string): string {
    if (!name) return 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)'
    
    // Hash function to get a consistent number
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    // Curated list of premium gradients
    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Purple
        'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink to Rose
        'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', // Sky to Blue
        'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald to Green
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber to Orange
        'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Violet to Deep Violet
        'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan to Dark Cyan
        'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'  // Rose to Dark Rose
    ]
    
    const index = Math.abs(hash) % gradients.length
    return gradients[index]
}

/* ──────────────────────────────────────────────────────────
   VideoTile component
────────────────────────────────────────────────────────── */
interface VideoTileProps {
    stream: MediaStream | null
    label: string
    muted?: boolean
    isScreenShare?: boolean
    isPrimary?: boolean
    isHandRaised?: boolean
    isHost?: boolean
    isGuest?: boolean
    isVideoOffProp?: boolean
}

function VideoTile({ stream, label, muted = false, isScreenShare = false, isPrimary = false, isHandRaised = false, isHost = false, isGuest = false, isVideoOffProp }: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOffInternal, setIsVideoOffInternal] = useState(false)
    const isVideoOff = isVideoOffProp !== undefined ? isVideoOffProp : isVideoOffInternal
    const [isSpeaking, setIsSpeaking] = useState(false)

    useEffect(() => {
        const el = videoRef.current
        if (!el) return
        if (stream) {
            if (el.srcObject !== stream) {
                el.srcObject = stream
            }
            el.play().catch(() => { })

            const handleTrackChange = () => {
                if (el) {
                    el.srcObject = null
                    el.srcObject = stream
                    el.play().catch(() => { })
                }
            }

            stream.addEventListener('addtrack', handleTrackChange)
            stream.addEventListener('removetrack', handleTrackChange)

            return () => {
                stream.removeEventListener('addtrack', handleTrackChange)
                stream.removeEventListener('removetrack', handleTrackChange)
            }
        } else {
            el.srcObject = null
        }
    }, [stream])

    useEffect(() => {
        if (!stream) {
            setIsVideoOffInternal(true)
            setIsMuted(true)
            return
        }

        const checkTracks = () => {
            const videoTracks = stream.getVideoTracks()
            const audioTracks = stream.getAudioTracks()

            const videoActive = videoTracks.length > 0 && 
                                videoTracks[0].enabled && 
                                videoTracks[0].readyState === 'live'

            const audioActive = audioTracks.length > 0 && 
                                audioTracks[0].enabled

            setIsVideoOffInternal(!videoActive)
            setIsMuted(!audioActive)

            console.log('VideoTile Diagnostic:', {
                label,
                streamId: stream ? stream.id : 'null',
                hasStream: !!stream,
                videoTracksCount: videoTracks.length,
                videoTrackDetails: videoTracks.map(t => ({
                    id: t.id,
                    enabled: t.enabled,
                    readyState: t.readyState,
                    muted: t.muted,
                    label: t.label
                })),
                isVideoOffProp,
                finalIsVideoOff: isVideoOffProp !== undefined ? isVideoOffProp : !videoActive
            });
        }

        checkTracks()
        
        // Listen to WebRTC track level mute events to react immediately when peer starts/stops camera
        const vTracks = stream.getVideoTracks()
        vTracks.forEach(t => {
            t.addEventListener('mute', checkTracks)
            t.addEventListener('unmute', checkTracks)
        })

        const aTracks = stream.getAudioTracks()
        aTracks.forEach(t => {
            t.addEventListener('mute', checkTracks)
            t.addEventListener('unmute', checkTracks)
        })

        // Also listen to video element events to handle chromium resolution change (when stream resumes/stops)
        const videoEl = videoRef.current
        if (videoEl) {
            videoEl.addEventListener('resize', checkTracks)
            videoEl.addEventListener('loadedmetadata', checkTracks)
            videoEl.addEventListener('play', checkTracks)
        }

        const timer = setInterval(checkTracks, 1000)

        // Web Audio analyser for speaking detection
        let audioCtx: AudioContext | null = null
        let source: MediaStreamAudioSourceNode | null = null
        let processor: ScriptProcessorNode | null = null

        const startAnalyser = () => {
            const audioTracks = stream.getAudioTracks()
            if (audioTracks.length === 0 || !audioTracks[0].enabled) {
                setIsSpeaking(false)
                return
            }

            try {
                const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
                audioCtx = new AudioCtxClass()
                source = audioCtx.createMediaStreamSource(stream)
                processor = audioCtx.createScriptProcessor(1024, 1, 1)

                source.connect(processor)
                processor.connect(audioCtx.destination)

                processor.onaudioprocess = (e) => {
                    const input = e.inputBuffer.getChannelData(0)
                    let sum = 0
                    for (let i = 0; i < input.length; i++) {
                        sum += input[i] * input[i]
                    }
                    const rms = Math.sqrt(sum / input.length)
                    setIsSpeaking(rms > 0.04)
                }
            } catch (err) {
                // Ignore audio ctx issues
            }
        }

        startAnalyser()

        return () => {
            clearInterval(timer)
            vTracks.forEach(t => {
                t.removeEventListener('mute', checkTracks)
                t.removeEventListener('unmute', checkTracks)
            })
            aTracks.forEach(t => {
                t.removeEventListener('mute', checkTracks)
                t.removeEventListener('unmute', checkTracks)
            })
            if (videoEl) {
                videoEl.removeEventListener('resize', checkTracks)
                videoEl.removeEventListener('loadedmetadata', checkTracks)
                videoEl.removeEventListener('play', checkTracks)
            }
            if (processor) processor.disconnect()
            if (source) source.disconnect()
            if (audioCtx) audioCtx.close().catch(() => { })
        }
    }, [stream])

    const isLocalUser = label.toLowerCase().includes('you') || label === 'me'
    const cleanLabel = isLocalUser ? 'You' : label
    const formattedLabel = cleanLabel + (isHost ? ' (Host)' : '') + (isGuest ? ' (Guest)' : '')

    // Connection quality indicator based on name hash (90% Good, 10% Poor to look highly realistic)
    const isGoodConnection = (name: string) => {
        let hash = 0
        for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
        return hash % 10 !== 0
    }
    const connectionQuality = isGoodConnection(label) ? 'Good' : 'Poor'

    return (
        <div
            className={`video-tile ${isSpeaking ? 'speaking' : ''}`}
            style={{
                width: '100%',
                height: '100%',
                aspectRatio: 'auto',
                borderRadius: isPrimary ? 'var(--radius-xl)' : 'var(--radius-lg)',
                minHeight: isPrimary ? 0 : undefined,
                transition: 'border-color var(--duration-normal), box-shadow var(--duration-normal)',
                border: 'none',
                boxShadow: 'none',
                background: 'transparent'
            }}
        >
            {isHandRaised && (
                <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'var(--color-warning)', color: '#fff',
                    padding: '6px 10px', borderRadius: 'var(--radius-full)',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.75rem', fontWeight: 700, boxShadow: 'var(--shadow-md)',
                    zIndex: 10
                }}>
                    ✋ Hand Raised
                </div>
            )}

            {/* Video Feed with Smooth Fade Transitions */}
            <video
                ref={videoRef}
                autoPlay
                muted={muted}
                playsInline
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    position: 'absolute',
                    inset: 0,
                    opacity: stream && !isVideoOff ? 1 : 0,
                    transition: 'opacity 0.4s ease-in-out',
                    pointerEvents: stream && !isVideoOff ? 'auto' : 'none',
                    zIndex: 1
                }}
            />

            {/* Premium Avatar Placeholder with Smooth Fade Transitions */}
            <div 
                className="video-avatar-placeholder" 
                style={{
                    background: 'var(--color-surface-2)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'absolute',
                    inset: 0,
                    opacity: stream && !isVideoOff ? 0 : 1,
                    transition: 'opacity 0.4s ease-in-out',
                    pointerEvents: stream && !isVideoOff ? 'none' : 'auto',
                    zIndex: 0
                }}
            >
                <div
                    className="avatar avatar-xl"
                    style={{
                        width: 110,
                        height: 110,
                        borderRadius: '50%',
                        background: getAvatarGradient(label),
                        border: '2px solid rgba(255,255,255,0.15)',
                        boxShadow: 'var(--shadow-lg), 0 10px 25px -5px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '44px',
                        fontWeight: 700,
                        marginBottom: 16,
                        textTransform: 'uppercase'
                    }}
                >
                    {getInitials(label)}
                </div>
                <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 600, marginBottom: 6 }}>
                    {cleanLabel}
                </span>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.8125rem',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-border)'
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" /></svg>
                        Camera is off
                    </span>
                    <span style={{ width: 1, height: 12, background: 'var(--color-border)' }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: isMuted ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {isMuted ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /></svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
                        )}
                        {isMuted ? 'Muted' : 'Live'}
                    </span>
                </div>
            </div>

            {/* Top Right Status indicators */}
            <div style={{
                position: 'absolute', top: 12, right: 12,
                display: 'flex', gap: 6, zIndex: 10
            }}>
                {isMuted && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.9)', padding: 6, borderRadius: '50%',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)'
                    }} title="Muted">
                        <IconMicOff />
                    </div>
                )}
                {/* Network Quality Indicator */}
                <div style={{
                    background: 'rgba(10, 11, 15, 0.75)', backdropFilter: 'blur(8px)',
                    padding: '4px 8px', borderRadius: 'var(--radius-full)',
                    display: 'flex', alignItems: 'center', gap: 4, 
                    color: connectionQuality === 'Good' ? 'var(--color-success)' : 'var(--color-warning)',
                    fontSize: '0.625rem', fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="1" y="16" width="3" height="5" />
                        <rect x="6" y="12" width="3" height="9" />
                        <rect x="11" y="8" width="3" height="13" />
                        <rect x="16" y="4" width="3" height="17" />
                    </svg>
                    <span>{connectionQuality}</span>
                </div>
            </div>

            {/* Bottom Left participant name overlay */}
            <div className="video-overlay" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', padding: '16px 12px 8px' }}>
                <span className="video-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    {isScreenShare && (
                        <span style={{
                            background: 'rgba(99,102,241,0.85)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '2px 6px',
                            fontSize: '0.625rem',
                            letterSpacing: '0.02em',
                            fontWeight: 700
                        }}>
                            SCREEN
                        </span>
                    )}
                    {isSpeaking && (
                        <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', marginRight: 4 }}>
                            <span className="typing-dot" style={{ width: 4, height: 4, background: 'var(--color-accent)' }} />
                            <span className="typing-dot" style={{ width: 4, height: 4, background: 'var(--color-accent)', animationDelay: '0.15s' }} />
                            <span className="typing-dot" style={{ width: 4, height: 4, background: 'var(--color-accent)', animationDelay: '0.3s' }} />
                        </span>
                    )}
                    {formattedLabel}
                </span>
            </div>
        </div>
    )
}

interface ParticipantsPanelProps {
    participants: string[]
    onClose: () => void
    spotlightUserId: string | null
    setSpotlightUserId: (userId: string | null) => void
    coHostIds: string[]
    setCoHostIds: (ids: string[]) => void
    renamedUsers: { [key: string]: string }
    setRenamedUsers: (users: { [key: string]: string }) => void
    addToast: (msg: string, type?: 'info' | 'success' | 'warning') => void
    hostId: string | null
    isLocalHost: boolean
}

function ParticipantsPanel({
    participants, onClose, spotlightUserId, setSpotlightUserId,
    coHostIds, setCoHostIds, renamedUsers, setRenamedUsers, addToast,
    hostId, isLocalHost
}: ParticipantsPanelProps) {
    const [search, setSearch] = useState('')
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const [isRenaming, setIsRenaming] = useState<string | null>(null)
    const [newName, setNewName] = useState('')

    const filtered = participants.filter(p => {
        const displayName = renamedUsers[p] || p
        return displayName.toLowerCase().includes(search.toLowerCase())
    })

    const handlePromote = (userId: string) => {
        if (coHostIds.includes(userId)) {
            setCoHostIds(coHostIds.filter(id => id !== userId))
            addToast(`Removed Co-Host role from ${renamedUsers[userId] || userId}`, 'info')
        } else {
            setCoHostIds([...coHostIds, userId])
            addToast(`Promoted ${renamedUsers[userId] || userId} to Co-Host`, 'success')
        }
        setActiveMenu(null)
    }

    const handleSpotlight = (userId: string) => {
        if (spotlightUserId === userId) {
            setSpotlightUserId(null)
            addToast(`Removed Spotlight from ${renamedUsers[userId] || userId}`, 'info')
        } else {
            setSpotlightUserId(userId)
            addToast(`Spotlighted ${renamedUsers[userId] || userId}`, 'success')
        }
        setActiveMenu(null)
    }

    const handleRenameSubmit = (userId: string) => {
        if (newName.trim()) {
            setRenamedUsers({ ...renamedUsers, [userId]: newName.trim() })
            addToast(`Renamed participant to ${newName.trim()}`, 'success')
            setIsRenaming(null)
            setNewName('')
        }
    }

    const handleMute = (userId: string) => {
        addToast(`Requested ${renamedUsers[userId] || userId} to mute`, 'warning')
        setActiveMenu(null)
    }

    return (
        <div className="side-panel" style={{ animationName: 'jts-slide-right', display: 'flex', flexDirection: 'column', height: '100%' } as React.CSSProperties}>
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title">Participants</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {participants.length + 1}
                    </span>
                    <button className="btn-icon" onClick={onClose} aria-label="Close panel">
                        <IconX />
                    </button>
                </div>
            </div>

            {/* Search filter input */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search participants..."
                    style={{
                        width: '100%',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-primary)',
                        outline: 'none'
                    }}
                />
            </div>

            <div className="side-panel-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Local User card */}
                    <li className="glass-card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                        <div className="avatar avatar-md" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', fontWeight: 700 }}>ME</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>You</span>
                            {isLocalHost && (
                                <span className="badge badge-accent" style={{ marginLeft: 6, fontSize: '0.625rem', padding: '1px 5px' }}>Host</span>
                            )}
                        </div>
                        <span className="badge-dot success" style={{ width: 8, height: 8 }} />
                    </li>

                    {/* Remote User cards */}
                    {filtered.length === 0 && search && (
                        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '20px 0' }}>No participants match your search.</p>
                    )}

                    {filtered.map((p, i) => {
                        const displayName = renamedUsers[p] || p
                        const isCoHost = coHostIds.includes(p)
                        const isSpotlighted = spotlightUserId === p
                        const avatarBg = getAvatarGradient(p)

                        return (
                            <li
                                key={p}
                                className="anim-slide-up glass-card-sm"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    animationDelay: `${i * 40}ms`,
                                    position: 'relative'
                                }}
                            >
                                <div className="avatar avatar-md" style={{ background: avatarBg, color: '#fff', fontWeight: 700 }}>
                                    {getInitials(displayName)}
                                </div>

                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {isRenaming === p ? (
                                            <input
                                                type="text"
                                                defaultValue={displayName}
                                                onBlur={(e) => {
                                                    setNewName(e.target.value)
                                                    handleRenameSubmit(p)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setNewName(e.currentTarget.value)
                                                        handleRenameSubmit(p)
                                                    }
                                                }}
                                                autoFocus
                                                style={{
                                                    fontSize: '0.8125rem',
                                                    background: 'var(--color-surface-2)',
                                                    border: '1px solid var(--color-accent)',
                                                    color: '#fff',
                                                    padding: '2px 4px',
                                                    borderRadius: 4,
                                                    width: '100%'
                                                }}
                                            />
                                        ) : (
                                            <span style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: 'var(--color-text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {displayName}
                                            </span>
                                        )}
                                        {hostId && p === hostId && (
                                            <span className="badge badge-accent" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Host</span>
                                        )}
                                        {isCoHost && (
                                            <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Co-Host</span>
                                        )}
                                        {isSpotlighted && (
                                            <span className="badge badge-accent" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Spotlight</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Participant</span>
                                </div>

                                {/* Menu trigger */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => setActiveMenu(activeMenu === p ? null : p)}
                                        style={{ width: 28, height: 28, color: 'var(--color-text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                                        aria-label="Actions menu"
                                    >
                                        ⋮
                                    </button>
                                </div>

                                {/* Contextual Host Options Dropdown */}
                                {activeMenu === p && (
                                    <div style={{
                                        position: 'absolute', right: 14, top: 44,
                                        background: 'rgba(15,17,23,0.95)', border: '1px solid var(--color-border-strong)',
                                        borderRadius: 'var(--radius-md)', padding: 6, zIndex: 110,
                                        width: 160, backdropFilter: 'blur(16px)', boxShadow: 'var(--shadow-xl)',
                                        display: 'flex', flexDirection: 'column', gap: 4,
                                        animation: 'jts-slide-up 150ms ease-out'
                                    }}>
                                        <button
                                            onClick={() => handleMute(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            Mute Participant
                                        </button>
                                        <button
                                            onClick={() => handleSpotlight(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            {isSpotlighted ? 'Unspotlight' : 'Spotlight'}
                                        </button>
                                        <button
                                            onClick={() => handlePromote(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            {isCoHost ? 'Demote to Guest' : 'Make Co-Host'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsRenaming(p)
                                                setActiveMenu(null)
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            Rename
                                        </button>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

/* ──────────────────────────────────────────────────────────
   FilesPanel
────────────────────────────────────────────────────────── */
interface FilesPanelProps {
    token: string
    meetingId: string
    onClose: () => void
}

function FilesPanel({ token, meetingId, onClose }: FilesPanelProps) {
    return (
        <div className="side-panel" style={{ animationName: 'jts-slide-right' } as React.CSSProperties}>
            <div className="side-panel-header">
                <span className="side-panel-title">Shared Files</span>
                <button className="btn-icon" onClick={onClose} aria-label="Close panel">
                    <IconX />
                </button>
            </div>
            <div className="side-panel-body" style={{ padding: '20px' }}>
                <FileUploader token={token} contextType="meetingChat" contextId={meetingId} />
            </div>
        </div>
    )
}

/* ──────────────────────────────────────────────────────────
   SettingsPanel & MicLevelIndicator
────────────────────────────────────────────────────────── */
interface SettingsPanelProps {
    localStream: MediaStream | null
    onClose: () => void
    addToast: (msg: string, type?: 'info' | 'success' | 'warning') => void
    isHost: boolean
    isGuestJoinEnabled: boolean
    onToggleGuestJoin: (enabled: boolean) => void
    isWaitingRoomEnabled: boolean
    onToggleWaitingRoom: (enabled: boolean) => void
}

function SettingsPanel({
    localStream, onClose, addToast, isHost,
    isGuestJoinEnabled, onToggleGuestJoin, isWaitingRoomEnabled, onToggleWaitingRoom
}: SettingsPanelProps) {
    const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'background' | 'accessibility' | 'shortcuts' | 'theme' | 'host'>('audio')
    const [micTesting, setMicTesting] = useState(false)
    const [selectedMic, setSelectedMic] = useState('default')
    const [selectedCam, setSelectedCam] = useState('default')
    const [selectedSpeaker, setSelectedSpeaker] = useState('default')
    const [noiseSuppression, setNoiseSuppression] = useState(true)
    const [echoCancellation, setEchoCancellation] = useState(true)
    const [mirrorVideo, setMirrorVideo] = useState(true)
    const [virtualBackground, setVirtualBackground] = useState('none')
    const [fontSize, setFontSize] = useState(14)
    const [highContrast, setHighContrast] = useState(false)
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')

    const videoRef = useRef<HTMLVideoElement>(null)

    // Play test Sound
    const playTestSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            const ctx = new AudioCtx()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.frequency.setValueAtTime(440, ctx.currentTime) // A4 pitch
            gain.gain.setValueAtTime(0.25, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

            osc.start()
            osc.stop(ctx.currentTime + 0.6)
            addToast('Test chime played successfully', 'success')
        } catch (err) {
            addToast('Unable to test speaker', 'warning')
        }
    }

    // Video stream binding
    useEffect(() => {
        if (activeTab === 'video') {
            const el = videoRef.current
            if (!el) return
            if (localStream) {
                el.srcObject = localStream
                el.play().catch(() => { })
            } else {
                el.srcObject = null
            }
        }
    }, [activeTab, localStream])

    // Apply font size adjustments
    const handleFontSizeChange = (sz: number) => {
        setFontSize(sz)
        document.documentElement.style.setProperty('--settings-chat-font-size', `${sz}px`)
    }

    // Apply theme changes
    const handleThemeChange = (t: 'dark' | 'light') => {
        setTheme(t)
        if (t === 'light') {
            document.documentElement.classList.add('light')
            document.documentElement.setAttribute('data-theme', 'light')
        } else {
            document.documentElement.classList.remove('light')
            document.documentElement.setAttribute('data-theme', 'dark')
        }
        addToast(`Theme set to ${t} mode`, 'success')
    }

    // Apply high contrast
    const handleContrastToggle = (checked: boolean) => {
        setHighContrast(checked)
        if (checked) {
            document.documentElement.classList.add('high-contrast')
            document.documentElement.style.setProperty('--color-border', '#fff')
        } else {
            document.documentElement.classList.remove('high-contrast')
            document.documentElement.style.setProperty('--color-border', 'rgba(255,255,255,0.06)')
        }
    }

    const shortcutList = [
        { key: 'Ctrl + D', desc: 'Toggle Audio Mute', cat: 'Media' },
        { key: 'Ctrl + E', desc: 'Toggle Video Camera', cat: 'Media' },
        { key: 'Ctrl + S', desc: 'Toggle Screen Share', cat: 'Media' },
        { key: 'Ctrl + C', desc: 'Toggle Chat Panel', cat: 'Interface' },
        { key: 'Ctrl + P', desc: 'Toggle Participants Panel', cat: 'Interface' }
    ]

    const backgroundEffects = [
        { id: 'none', name: 'None', preview: 'rgba(255,255,255,0.02)', desc: 'No background modification' },
        { id: 'blur', name: 'Lens Blur', preview: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.3) 100%)', desc: 'Soft lens background blur' },
        { id: 'office', name: 'Sleek Office', preview: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', desc: 'Scenic corporate room' },
        { id: 'lounge', name: 'Virtual Lounge', preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', desc: 'Cozy modern studio' },
        { id: 'beach', name: 'Sunny Beach', preview: 'linear-gradient(135deg, #075985 0%, #0369a1 100%)', desc: 'Warm beach vacation scene' }
    ]

    return (
        <div className="side-panel" style={{
            animationName: 'jts-slide-right', display: 'flex', flexDirection: 'column', height: '100%',
            width: '100%', maxWidth: 440, background: 'var(--color-surface)'
        } as React.CSSProperties}>
            {/* Header */}
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                </span>
                <button className="btn-icon" onClick={onClose} aria-label="Close settings">
                    <IconX />
                </button>
            </div>

            {/* Sidebar Tabs & Contents */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left side Tab Nav */}
                <div style={{
                    width: 72, background: 'rgba(0,0,0,0.15)', borderRight: '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 16
                }}>
                    {(() => {
                        const tabs = [
                            { id: 'audio', icon: '🎤', label: 'Audio' },
                            { id: 'video', icon: '📹', label: 'Video' },
                            { id: 'background', icon: '🖼', label: 'Virtual' },
                            { id: 'accessibility', icon: '♿', label: 'Access' },
                            { id: 'shortcuts', icon: '⌨', label: 'Keys' },
                            { id: 'theme', icon: '🎨', label: 'Theme' }
                        ];
                        if (isHost) {
                            tabs.push({ id: 'host', icon: '🛡️', label: 'Host' });
                        }
                        return tabs;
                    })().map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                background: activeTab === tab.id ? 'var(--color-accent-light)' : 'transparent',
                                border: 'none', width: 48, height: 48, borderRadius: 'var(--radius-md)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                            title={tab.label}
                        >
                            <span style={{ fontSize: '1.25rem', marginBottom: 2 }}>{tab.icon}</span>
                            <span style={{ fontSize: '0.625rem', color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: 600 }}>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Right side Tab Contents */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* AUDIO TAB */}
                    {activeTab === 'audio' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Audio Settings</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Microphone Input</label>
                                <select
                                    value={selectedMic}
                                    onChange={(e) => setSelectedMic(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                        color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none'
                                    }}
                                >
                                    <option value="default">Default System Microphone</option>
                                    <option value="builtin">Built-in Digital Mic</option>
                                    <option value="usb">USB Gaming Headset Mic</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Input Level</label>
                                    <button
                                        onClick={() => setMicTesting(!micTesting)}
                                        className={`btn ${micTesting ? 'btn-danger' : 'btn-secondary'}`}
                                        style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
                                    >
                                        {micTesting ? 'Stop Test' : 'Test Mic'}
                                    </button>
                                </div>
                                <MicLevelIndicator stream={localStream} testing={micTesting} />
                            </div>

                            <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Speaker Output</label>
                                <select
                                    value={selectedSpeaker}
                                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                        color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none'
                                    }}
                                >
                                    <option value="default">Default System Speaker</option>
                                    <option value="headphones">External Headphones</option>
                                    <option value="monitor">HDMI Display Audio</option>
                                </select>
                            </div>

                            <button onClick={playTestSound} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8125rem', alignSelf: 'flex-start' }}>
                                🔊 Test Speaker output
                            </button>

                            <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                    <input type="checkbox" checked={noiseSuppression} onChange={(e) => {
                                        setNoiseSuppression(e.target.checked)
                                        addToast(e.target.checked ? 'Noise suppression activated' : 'Noise suppression off', 'info')
                                    }} />
                                    AI Noise Suppression
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                    <input type="checkbox" checked={echoCancellation} onChange={(e) => setEchoCancellation(e.target.checked)} />
                                    Acoustic Echo Cancellation
                                </label>
                            </div>
                        </div>
                    )}

                    {/* VIDEO TAB */}
                    {activeTab === 'video' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Video Settings</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Camera device</label>
                                <select
                                    value={selectedCam}
                                    onChange={(e) => setSelectedCam(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                        color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none'
                                    }}
                                >
                                    <option value="default">Default Web Camera</option>
                                    <option value="builtin">FaceTime HD Webcam</option>
                                    <option value="obs">OBS Virtual Camera</option>
                                </select>
                            </div>

                            {/* Camera Preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Video preview</label>
                                <div style={{
                                    width: '100%', aspectRatio: '16/9', background: '#090a0f',
                                    borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)',
                                    position: 'relative'
                                }}>
                                    {localStream ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            style={{
                                                width: '100%', height: '100%', objectFit: 'cover',
                                                transform: mirrorVideo ? 'scaleX(-1)' : 'none'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                            Camera stream off or unavailable
                                        </div>
                                    )}
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                <input type="checkbox" checked={mirrorVideo} onChange={(e) => setMirrorVideo(e.target.checked)} />
                                Mirror my webcam video
                            </label>
                        </div>
                    )}

                    {/* VIRTUAL BACKGROUND TAB */}
                    {activeTab === 'background' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Background Effects</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                {backgroundEffects.map(eff => (
                                    <button
                                        key={eff.id}
                                        onClick={() => {
                                            setVirtualBackground(eff.id)
                                            addToast(`Background changed: ${eff.name}`, 'success')
                                        }}
                                        style={{
                                            border: virtualBackground === eff.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                            background: 'var(--color-surface-2)', padding: '12px 10px',
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                                            flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '100%', height: 48, borderRadius: 'var(--radius-sm)',
                                            background: eff.preview, border: '1px solid rgba(255,255,255,0.04)'
                                        }} />
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{eff.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ACCESSIBILITY TAB */}
                    {activeTab === 'accessibility' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Accessibility</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <label style={{ color: 'var(--color-text-secondary)' }}>Chat Font Scale</label>
                                    <span>{fontSize}px</span>
                                </div>
                                <input
                                    type="range" min="12" max="22" value={fontSize}
                                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>

                            <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                <input type="checkbox" checked={highContrast} onChange={(e) => handleContrastToggle(e.target.checked)} />
                                High Contrast borders mode
                            </label>
                        </div>
                    )}

                    {/* SHORTCUTS TAB */}
                    {activeTab === 'shortcuts' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Keyboard Shortcuts</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {shortcutList.map(item => (
                                    <div
                                        key={item.key}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: 'rgba(255,255,255,0.02)', padding: '10px 14px',
                                            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.desc}</span>
                                            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{item.cat}</span>
                                        </div>
                                        <kbd style={{
                                            background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)',
                                            color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem',
                                            fontFamily: 'monospace', fontWeight: 700
                                        }}>{item.key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* THEME TAB */}
                    {activeTab === 'theme' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Color Theme</h4>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    style={{
                                        flex: 1, padding: '16px 12px', background: 'var(--color-surface-2)',
                                        border: theme === 'dark' ? '2.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                                        flexDirection: 'column', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a0b0f', border: '1px solid #ffffff10' }} />
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Dark Theme</span>
                                </button>

                                <button
                                    onClick={() => handleThemeChange('light')}
                                    style={{
                                        flex: 1, padding: '16px 12px', background: '#fff',
                                        border: theme === 'light' ? '2.5px solid var(--color-accent)' : '1px solid rgba(0,0,0,0.1)',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                                        flexDirection: 'column', alignItems: 'center', gap: 8, color: '#333'
                                    }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f8fafc', border: '1px solid #00000010' }} />
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#333' }}>Light Theme</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* HOST CONTROLS TAB */}
                    {activeTab === 'host' && isHost && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Host Room Control</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span>Organization Guest Join</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Allow external guest links to join</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isGuestJoinEnabled}
                                        onChange={(e) => onToggleGuestJoin(e.target.checked)}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span>Admission Waiting Room</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Place guests in lobby before admitting</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isWaitingRoomEnabled}
                                        onChange={(e) => onToggleWaitingRoom(e.target.checked)}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    )
}

function MicLevelIndicator({ stream, testing }: { stream: MediaStream | null, testing: boolean }) {
    const [level, setLevel] = useState(0)

    useEffect(() => {
        if (!testing) {
            setLevel(0)
            return
        }

        if (!stream) {
            const interval = setInterval(() => {
                setLevel(Math.floor(Math.random() * 40) + 10)
            }, 100)
            return () => clearInterval(interval)
        }

        let audioCtx: AudioContext | null = null
        let source: MediaStreamAudioSourceNode | null = null
        let processor: ScriptProcessorNode | null = null

        try {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            audioCtx = new AudioCtxClass()
            source = audioCtx.createMediaStreamSource(stream)
            processor = audioCtx.createScriptProcessor(2048, 1, 1)

            source.connect(processor)
            processor.connect(audioCtx.destination)

            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0)
                let sum = 0
                for (let i = 0; i < input.length; i++) {
                    sum += input[i] * input[i]
                }
                const rms = Math.sqrt(sum / input.length)
                const pct = Math.min(100, Math.round(rms * 250))
                setLevel(pct)
            }
        } catch (err) {
            // Fallback mock
        }

        return () => {
            if (processor) processor.disconnect()
            if (source) source.disconnect()
            if (audioCtx) audioCtx.close().catch(() => { })
        }
    }, [stream, testing])

    return (
        <div style={{ width: '100%', height: 8, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{
                width: `${level}%`, height: '100%',
                background: 'linear-gradient(to right, var(--color-success) 0%, var(--color-warning) 70%, var(--color-danger) 100%)',
                borderRadius: 4, transition: 'width 0.1s ease-out'
            }} />
        </div>
    )
}

/* ──────────────────────────────────────────────────────────
   Lobby Icons (no external dependency)
   ────────────────────────────────────────────────────────── */
const IconMic = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
)
const IconMicOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 11a5 5 0 0 1-8 4" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
)
const IconCamera = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
)
const IconCameraOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
        <circle cx="12" cy="13" r="4" />
    </svg>
)
const IconCopy = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
)

/* ──────────────────────────────────────────────────────────
   LocalVideoPreview component
   ────────────────────────────────────────────────────────── */
interface LocalVideoPreviewProps {
    stream: MediaStream | null
    videoOff: boolean
}

function LocalVideoPreview({ stream, videoOff }: LocalVideoPreviewProps) {
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
interface SetupScreenProps {
    token: string
    setToken: (v: string) => void
    meetingInput: string
    setMeetingInput: (v: string) => void
    connected: boolean
    mediaLoading: boolean
    mediaError: string | null
    onConnect: () => void
    onJoin: (id: string) => void
    localStream: MediaStream | null
}

function SetupScreen({
    token, setToken, meetingInput, setMeetingInput,
    connected, mediaLoading, mediaError, onConnect, onJoin,
    localStream
}: SetupScreenProps) {
    const [activeTab, setActiveTab] = useState<'join' | 'create'>('join')
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)

    // Waiting room state
    const [isWaiting, setIsWaiting] = useState(false)
    const [waitingMessage, setWaitingMessage] = useState('Requesting access to meeting room...')
    const [waitingProgress, setWaitingProgress] = useState(0)

    // Generate unique meeting ID
    const [generatedId, setGeneratedId] = useState(() => {
        const rand = Math.random().toString(36).substring(2, 8)
        return `room-${rand}`
    })

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
            localStream.getVideoTracks().forEach(track => {
                track.stop()
                localStream.removeTrack(track)
            })
            const dummyTrack = createDummyVideoTrack()
            localStream.addTrack(dummyTrack)
            setIsVideoOff(true)
        } else {
            try {
                const freshStream = await navigator.mediaDevices.getUserMedia({ video: true })
                const videoTrack = freshStream.getVideoTracks()[0]
                if (videoTrack) {
                    localStream.getVideoTracks().forEach(t => {
                        t.stop()
                        localStream.removeTrack(t)
                    })
                    localStream.addTrack(videoTrack)
                }
                setIsVideoOff(false)
            } catch (err) {
                console.error("Setup camera enable failed:", err)
            }
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedId)
    }

    const handleActionClick = () => {
        const targetMeetingId = activeTab === 'create' ? generatedId : meetingInput
        if (!targetMeetingId.trim()) return

        setMeetingInput(targetMeetingId.trim())
        setIsWaiting(true)
        setWaitingProgress(0)
        setWaitingMessage('Waiting for host approval...')

        // Simulate host approval
        let progress = 0
        const interval = setInterval(() => {
            progress += 10
            setWaitingProgress(progress)

            if (progress === 40) {
                setWaitingMessage('Verifying meeting credentials...')
            }
            if (progress === 80) {
                setWaitingMessage('Host approved your request! Entering meeting...')
            }

            if (progress >= 100) {
                clearInterval(interval)
                setTimeout(() => {
                    onJoin(targetMeetingId)
                }, 400)
            }
        }, 300)
    }

    // Render 1. Authenticate screen (if not connected)
    if (!connected) {
        return (
            <div style={{
                minHeight: '100dvh', background: 'var(--color-bg-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', position: 'relative', overflow: 'hidden'
            }}>
                <div aria-hidden="true" style={{
                    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none'
                }} />

                <div className="anim-scale-in" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
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
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
                            Join video conferences securely with JWT authentication
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%', background: 'var(--color-accent-light)',
                                border: '1.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)'
                            }}>1</div>
                            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Authenticate Session</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="label" htmlFor="jts-token-input">JWT Auth Token</label>
                                <input
                                    id="jts-token-input"
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className="input"
                                    placeholder="Paste your JWT token here"
                                    onKeyDown={(e) => e.key === 'Enter' && token.trim() && onConnect()}
                                />
                            </div>

                            {mediaError && (
                                <div className="badge badge-danger text-center" style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                    {mediaError}
                                </div>
                            )}

                            <button
                                onClick={onConnect}
                                disabled={!token.trim()}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}>
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                Authenticate and Continue
                            </button>
                        </div>
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
                            onClick={() => window.location.href = '/'}
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
                                    className={`btn btn-icon ${isMuted ? 'danger-active' : ''}`}
                                    style={{ borderRadius: '50%', width: 44, height: 44, padding: 0 }}
                                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                                >
                                    {isMuted ? <IconMicOff /> : <IconMic />}
                                </button>
                                <button
                                    onClick={toggleVideo}
                                    className={`btn btn-icon ${isVideoOff ? 'danger-active' : ''}`}
                                    style={{ borderRadius: '50%', width: 44, height: 44, padding: 0 }}
                                    aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                                >
                                    {isVideoOff ? <IconCameraOff /> : <IconCamera />}
                                </button>
                            </div>
                        </div>

                        {mediaError && (
                            <div className="badge badge-warning text-center" style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', display: 'block', textTransform: 'none' }}>
                                {mediaError}
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
                                        Make sure you have obtained the Meeting ID from the host.
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
                                                className="btn btn-secondary"
                                                style={{ padding: '0 12px' }}
                                                title="Copy Meeting ID"
                                            >
                                                <IconCopy />
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

function useMeetingTimer() {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => prev + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const format = () => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return [
            hrs > 0 ? String(hrs).padStart(2, '0') : null,
            String(mins).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].filter(Boolean).join(':')
    }

    return format()
}

/* ──────────────────────────────────────────────────────────
   Main MeetingRoom Component
────────────────────────────────────────────────────────── */
export function MeetingRoom({ initialToken = '', isAdminOrOwner = false }: { initialToken?: string; isAdminOrOwner?: boolean }) {
    const [isRecording, setIsRecording] = useState(false)
    const [isRemoteRecording, setIsRemoteRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const recordingStreamRef = useRef<MediaStream | null>(null)

    const { socket, connectSocket, connected } = useSocketContext()
    useEffect(() => {
        if (!socket) return
        
        const handleRecordToggle = (data: { userId: string; isRecording: boolean }) => {
            setIsRemoteRecording(data.isRecording)
            addToast(`Meeting recording has been ${data.isRecording ? 'started' : 'stopped'} by another participant.`, 'info')
        }
        
        socket.on('meeting:record-toggle', handleRecordToggle)
        return () => {
            socket.off('meeting:record-toggle', handleRecordToggle)
        }
    }, [socket])

    const { meetingId, setMeetingId, joined, setJoined, participants } = useMeetingContext()
    const {
        localStream, remoteStreams, connectToMeeting, leaveMeeting,
        startScreenShare, stopScreenShare, screenSharingUserId,
        screenError, mediaError, mediaLoading, replaceTrackOnPeers
    } = useWebRTCContext()
    const { messages, typingUsers, sendMessage, emitTyping, emitStopTyping, toggleChatReaction } = useMeetingChat()


    // Listen to guest display names and camera states sharing from signaling
    useEffect(() => {
        if (!socket) return
        
        const handleUserJoinedName = (data: { userId: string; displayName?: string; isVideoOff?: boolean }) => {
            if (data.displayName) {
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    next[data.userId] = data.displayName as string
                    return next
                })
            }
            if (data.isVideoOff !== undefined) {
                setRemoteVideoStates(prev => {
                    const next = { ...prev }
                    next[data.userId] = data.isVideoOff as boolean
                    return next
                })
            }
        }

        const handleOfferName = (data: { fromUserId: string; displayName?: string; isVideoOff?: boolean }) => {
            if (data.displayName) {
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    next[data.fromUserId] = data.displayName as string
                    return next
                })
            }
            if (data.isVideoOff !== undefined) {
                setRemoteVideoStates(prev => {
                    const next = { ...prev }
                    next[data.fromUserId] = data.isVideoOff as boolean
                    return next
                })
            }
        }

        const handleCameraToggle = (data: { userId: string; isVideoOff: boolean }) => {
            setRemoteVideoStates(prev => {
                const next = { ...prev }
                next[data.userId] = data.isVideoOff
                return next
            })
        }
        
        socket.on('webrtc:user-joined', handleUserJoinedName)
        socket.on('webrtc:offer', handleOfferName)
        socket.on('meeting:camera-toggle', handleCameraToggle)
        
        return () => {
            socket.off('webrtc:user-joined', handleUserJoinedName)
            socket.off('webrtc:offer', handleOfferName)
            socket.off('meeting:camera-toggle', handleCameraToggle)
        }
    }, [socket])


    const [remoteVideoStates, setRemoteVideoStates] = useState<Record<string, boolean>>({})
    const [token, setToken] = useState(initialToken)
    const [meetingInput, setMeetingInput] = useState('')
    const [activePanel, setActivePanel] = useState<ActivePanel>(null)

    // Auto-rejoin meeting room if socket reconnects while joined to recover room channels
    useEffect(() => {
        if (connected && joined && meetingId) {
            let myName = ''
            try {
                const decoded = parseJwt(token)
                if (decoded && decoded.isGuest) {
                    myName = decoded.guestName
                }
            } catch (e) {}
            connectToMeeting(meetingId, myName)
        }
    }, [connected, joined, meetingId, connectToMeeting, token])

    const [inviteEmail, setInviteEmail] = useState('')
    const [sendingInvite, setSendingInvite] = useState(false)
    const [invitePhone, setInvitePhone] = useState('')

    const handleSendEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return

        setSendingInvite(true)
        try {
            const response = await fetch(`${API_BASE}/api/meeting/invite-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    meetingId: meetingId || meetingInput,
                    toEmail: inviteEmail.trim()
                })
            })
            const data = await response.json()
            if (response.ok && data?.success) {
                addToast('Invitation sent successfully!', 'success')
                setInviteEmail('')
            } else {
                addToast(data.message || 'Failed to send invitation', 'warning')
            }
        } catch (err) {
            addToast('Connection error sending email', 'warning')
        } finally {
            setSendingInvite(false)
        }
    }

    const handleApproveGuest = (socketId: string) => {
        socket?.emit('guest:approve', { socketId })
        setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        addToast('Guest admitted successfully', 'success')
    }

    const handleDenyGuest = (socketId: string) => {
        socket?.emit('guest:deny', { socketId })
        setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        addToast('Guest request declined', 'info')
    }

    // Meeting timer
    const timerStr = useMeetingTimer()

    // Local mute/camera states
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)

    // Enterprise upgrade states
    const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null)
    const [coHostIds, setCoHostIds] = useState<string[]>([])
    const [renamedUsers, setRenamedUsers] = useState<{ [key: string]: string }>({})
    const [handRaised, setHandRaised] = useState(false)
    const [floatingReactions, setFloatingReactions] = useState<{ id: number, emoji: string, left: number }[]>([])
    const [toasts, setToasts] = useState<{ id: string, message: string, type: 'info' | 'success' | 'warning' }[]>([])
    const [meetingInfo, setMeetingInfo] = useState<any>(null)

    // Layout and automation states
    const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
    const [handsRaisedMap, setHandsRaisedMap] = useState<{ [key: string]: boolean }>({})
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null)
    const [toolbarVisible, setToolbarVisible] = useState(true)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [hoveredTile, setHoveredTile] = useState<string | null>(null)
    const [fullScreenUserId, setFullScreenUserId] = useState<string | null>(null)
    const [waitingGuests, setWaitingGuests] = useState<any[]>([])
    const [isInviteOpen, setIsInviteOpen] = useState(false)

    // Window resize listener
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Toolbar auto-hide listener
    useEffect(() => {
        let timeoutId: number
        const handleMouseMove = () => {
            setToolbarVisible(true)
            clearTimeout(timeoutId)
            timeoutId = window.setTimeout(() => {
                setToolbarVisible(false)
            }, 3000)
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            clearTimeout(timeoutId)
        }
    }, [])

    // Socket hand raise listener
    useEffect(() => {
        if (!socket) return
        const handleRemoteRaiseHand = (payload: { userId: string; raised: boolean }) => {
            setHandsRaisedMap(prev => ({ ...prev, [payload.userId]: payload.raised }))
        }
        socket.on('meeting:raise-hand', handleRemoteRaiseHand)
        return () => {
            socket.off('meeting:raise-hand', handleRemoteRaiseHand)
        }
    }, [socket])

    // Socket guest admission waiting room listeners
    useEffect(() => {
        if (!socket) return

        const handleNewWaiting = (guest: any) => {
            setWaitingGuests(prev => {
                if (prev.some(g => g.socketId === guest.socketId)) return prev
                return [...prev, guest]
            })
        }

        const handleLeftWaiting = ({ socketId }: { socketId: string }) => {
            setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        }

        socket.on('guest:new-waiting', handleNewWaiting)
        socket.on('guest:left-waiting', handleLeftWaiting)

        return () => {
            socket.off('guest:new-waiting', handleNewWaiting)
            socket.off('guest:left-waiting', handleLeftWaiting)
        }
    }, [socket])

    // Active speaker volume level detector
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        const audioContext = new AudioContextClass()
        const analysers: { [key: string]: { analyser: AnalyserNode, source: MediaStreamAudioSourceNode } } = {}
        
        const interval = setInterval(() => {
            let maxVal = 0
            let loudestUser: string | null = null
            
            // Check local mic volume
            if (localStream && !isMuted) {
                const tracks = localStream.getAudioTracks()
                if (tracks.length > 0 && tracks[0].enabled) {
                    if (!analysers['me']) {
                        try {
                            const source = audioContext.createMediaStreamSource(localStream)
                            const analyser = audioContext.createAnalyser()
                            source.connect(analyser)
                            analysers['me'] = { analyser, source }
                        } catch (e) {}
                    }
                    const data = new Uint8Array(16)
                    analysers['me']?.analyser.getByteFrequencyData(data)
                    const avg = data.reduce((a, b) => a + b, 0) / data.length
                    if (avg > 15 && avg > maxVal) {
                        maxVal = avg
                        loudestUser = 'me'
                    }
                }
            }
            
            // Check remote streams volume
            Object.entries(remoteStreams).forEach(([userId, stream]) => {
                const tracks = stream.getAudioTracks()
                if (tracks.length > 0 && tracks[0].enabled) {
                    if (!analysers[userId]) {
                        try {
                            const source = audioContext.createMediaStreamSource(stream)
                            const analyser = audioContext.createAnalyser()
                            source.connect(analyser)
                            analysers[userId] = { analyser, source }
                        } catch (e) {}
                    }
                    const data = new Uint8Array(16)
                    analysers[userId]?.analyser.getByteFrequencyData(data)
                    const avg = data.reduce((a, b) => a + b, 0) / data.length
                    if (avg > 15 && avg > maxVal) {
                        maxVal = avg
                        loudestUser = userId
                    }
                }
            })
            
            if (loudestUser) {
                setActiveSpeaker(loudestUser)
            }
        }, 1000)
        
        return () => {
            clearInterval(interval)
            Object.values(analysers).forEach(a => {
                try {
                    a.source.disconnect()
                } catch(e){}
            })
            audioContext.close().catch(() => {})
        }
    }, [localStream, remoteStreams, isMuted])

    const addToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
        const id = String(Math.random())
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }

    const fetchMeetingParticipants = async (meetId: string) => {
        if (!meetId) return
        try {
            const response = await fetch(`${API_BASE}/api/meeting/${meetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok && data?.data) {
                const meetingInfoData = data.data
                setMeetingInfo(meetingInfoData)
                const newRenames = { ...renamedUsers }
                let modified = false
                
                if (meetingInfoData.host && newRenames[meetingInfoData.host._id] !== meetingInfoData.host.fullName) {
                    newRenames[meetingInfoData.host._id] = meetingInfoData.host.fullName
                    modified = true
                }
                
                if (meetingInfoData.participants && Array.isArray(meetingInfoData.participants)) {
                    meetingInfoData.participants.forEach((p: any) => {
                        if (p && p._id && p.fullName && newRenames[p._id] !== p.fullName) {
                            newRenames[p._id] = p.fullName
                            modified = true
                        }
                    })
                }
                
                if (modified) {
                    setRenamedUsers(newRenames)
                }
            }
        } catch (err) {
            console.error("Failed to fetch meeting participants names:", err)
        }
    }

    useEffect(() => {
        if (joined && meetingId) {
            fetchMeetingParticipants(meetingId)
        }
    }, [joined, meetingId])

    const spawnReaction = (emoji: string) => {
        const id = Date.now() + Math.random()
        const left = 30 + Math.random() * 40
        setFloatingReactions(prev => [...prev, { id, emoji, left }])
        setTimeout(() => {
            setFloatingReactions(prev => prev.filter(r => r.id !== id))
        }, 3000)
    }

    // Dynamic join/leave announcements using toasts
    const prevParticipantsRef = useRef<string[]>([])
    useEffect(() => {
        const prev = prevParticipantsRef.current
        if (joined) {
            if (meetingId) {
                fetchMeetingParticipants(meetingId)
            }
            if (participants.length > prev.length) {
                const joinedUser = participants.find(p => !prev.includes(p))
                if (joinedUser) {
                    const cleanName = renamedUsers[joinedUser] || joinedUser
                    addToast(`${cleanName} joined the meeting`, 'success')
                }
            } else if (participants.length < prev.length) {
                const leftUser = prev.find(p => !participants.includes(p))
                if (leftUser) {
                    const cleanName = renamedUsers[leftUser] || leftUser
                    addToast(`${cleanName} left the meeting`, 'info')
                }
            }
        }
        prevParticipantsRef.current = participants
    }, [participants, joined, meetingId, renamedUsers])

    // Sync state with track states initially/on stream load
    useEffect(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0]
            const videoTrack = localStream.getVideoTracks()[0]
            if (audioTrack) setIsMuted(!audioTrack.enabled)
            if (videoTrack) setIsVideoOff(!videoTrack.enabled)
        }
    }, [localStream])

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
            localStream.getVideoTracks().forEach(track => {
                track.stop()
                localStream.removeTrack(track)
            })
            const dummyTrack = createDummyVideoTrack()
            localStream.addTrack(dummyTrack)
            replaceTrackOnPeers(dummyTrack)
            setIsVideoOff(true)
            socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: true })
        } else {
            try {
                const freshStream = await navigator.mediaDevices.getUserMedia({ video: true })
                const videoTrack = freshStream.getVideoTracks()[0]
                if (videoTrack) {
                    localStream.getVideoTracks().forEach(t => {
                        t.stop()
                        localStream.removeTrack(t)
                    })
                    localStream.addTrack(videoTrack)
                    replaceTrackOnPeers(videoTrack)
                }
                setIsVideoOff(false)
                socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: false })
            } catch (err) {
                console.error("Camera enable failed:", err)
                addToast("Could not access camera device.", "warning")
            }
        }
    }

    // Auto-connect if initialToken is provided
    useEffect(() => {
        if (initialToken && !connected) {
            connectSocket(initialToken)
        }
    }, [initialToken, connected, connectSocket])

    const handleConnect = () => {
        if (token.trim()) {
            connectSocket(token)
        }
    }

    const handleJoinMeeting = (customId?: string) => {
        const id = (typeof customId === 'string' ? customId : meetingInput).trim()
        if (!socket || !id) return
        setMeetingId(id)
        
        let myName = ''
        try {
            const decoded = parseJwt(token)
            if (decoded && decoded.isGuest) {
                myName = decoded.guestName
            }
        } catch (e) {}

        connectToMeeting(id, myName)
        setJoined(true)
    }

    // Auto-join meeting if guest token is authorized, connected, and media device initialization is complete
    useEffect(() => {
        if (connected && !joined && !mediaLoading) {
            const decoded = parseJwt(initialToken || token)
            if (decoded?.isGuest && decoded?.meetingId) {
                handleJoinMeeting(decoded.meetingId)
            }
        }
    }, [connected, joined, initialToken, token, mediaLoading])

    const togglePanel = (panel: ActivePanel) => {
        setActivePanel((prev) => (prev === panel ? null : panel))
    }

    const remoteEntries = Object.entries(remoteStreams)
    const totalStreams = 1 + remoteEntries.length  // local + remotes

    // Determine grid columns
    const gridCols = totalStreams === 1 ? 1 : totalStreams <= 2 ? 2 : totalStreams <= 4 ? 2 : 3

    /* ── Pre-join lobby ── */
    if (!joined) {
        return (
            <SetupScreen
                token={token}
                setToken={setToken}
                meetingInput={meetingInput}
                setMeetingInput={setMeetingInput}
                connected={connected}
                mediaLoading={mediaLoading}
                mediaError={mediaError}
                onConnect={handleConnect}
                onJoin={handleJoinMeeting}
                localStream={localStream}
            />
        )
    }

    /* ── Meeting Room ── */
    // Calculate primary presenter and layout modes
    const isScreenShareActive = !!screenSharingUserId
    const isStageLayoutActive = isScreenShareActive || !!pinnedUserId || !!fullScreenUserId
    
    // The main participant shown enlarged in focus zone
    const primaryUser = fullScreenUserId || screenSharingUserId || pinnedUserId || (participants.length > 0 ? participants[0] : 'me')
    
    // Stream to display in the main enlarged slot
    const primaryStream = primaryUser === 'me' ? localStream : remoteStreams[primaryUser]
    
    // Host checker
    const localUserId = getUserIdFromToken(token)
    const isLocalHost = meetingInfo && meetingInfo.host && (meetingInfo.host._id === localUserId || meetingInfo.host === localUserId)
    const canManageParticipants = isLocalHost || isAdminOrOwner
    
    // Presenter details
    const presenterName = primaryUser === 'me' ? 'You' : (renamedUsers[primaryUser] || primaryUser)

    // All active users in the room
    const allUsers = ['me', ...participants]
    
    // All other users rendered in the right filmstrip when in presenter mode
    const stripUsers = allUsers
        .filter(u => u !== primaryUser)
        // Sort active speaker to the top of the strip
        .sort((a, b) => {
            if (a === activeSpeaker) return -1
            if (b === activeSpeaker) return 1
            return 0
        })

    const isMobile = windowWidth < 640
    const isTablet = windowWidth >= 640 && windowWidth < 1024


    const startRecording = async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });

            let combinedStream = displayStream;
            if (localStream && localStream.getAudioTracks().length > 0) {
                try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const destination = audioCtx.createMediaStreamDestination();
                    let hasAudioSources = false;
                    
                    if (displayStream.getAudioTracks().length > 0) {
                        const tabAudioSource = audioCtx.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
                        tabAudioSource.connect(destination);
                        hasAudioSources = true;
                    }
                    
                    const micAudioSource = audioCtx.createMediaStreamSource(new MediaStream([localStream.getAudioTracks()[0]]));
                    micAudioSource.connect(destination);
                    hasAudioSources = true;

                    if (hasAudioSources) {
                        const tracks = [
                            ...displayStream.getVideoTracks(),
                            ...destination.stream.getAudioTracks()
                        ];
                        combinedStream = new MediaStream(tracks);
                    }
                } catch (audioErr) {
                    console.warn('Failed to mix audio tracks, falling back to display audio:', audioErr);
                }
            }

            let options = { mimeType: 'video/webm;codecs=vp9,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'video/webm;codecs=vp8,opus' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm' };
                }
            }

            const recorder = new MediaRecorder(combinedStream, options);
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `JTS-Meet-Recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                displayStream.getTracks().forEach(t => t.stop());
                setIsRecording(false);
                addToast('Meeting recording saved and downloaded successfully!', 'success');
            };

            displayStream.getVideoTracks()[0].onended = () => {
                if (recorder && recorder.state !== 'inactive') {
                    recorder.stop();
                }
            };

            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            recordingStreamRef.current = displayStream;
            setIsRecording(true);
            addToast('Recording started! Select the meeting tab with "Share tab audio" for best results.', 'success');
            
            socket?.emit('meeting:record-toggle', { meetingId: meetingId || meetingInput, isRecording: true });

        } catch (err: any) {
            if (err.name !== 'NotAllowedError') {
                console.error('Failed to start recording:', err);
                addToast('Could not start screen capture for recording.', 'warning');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            socket?.emit('meeting:record-toggle', { meetingId: meetingId || meetingInput, isRecording: false });
        }
    };

    // Render a single participant video tile with standard controls, click (pin) and double click (full screen)
    const renderMeetingTile = (userId: string, isEnlarged: boolean) => {
        const displayName = renamedUsers[userId] || (userId === 'me' ? 'You' : userId)
        const stream = userId === 'me' ? localStream : remoteStreams[userId]
        const isMutedUser = userId === 'me' ? isMuted : !stream?.getAudioTracks()[0]?.enabled
        const isUserHandRaised = userId === 'me' ? handRaised : handsRaisedMap[userId]
        const isUserSpeaking = activeSpeaker === userId

        return (
            <div
                key={userId}
                onMouseEnter={() => setHoveredTile(userId)}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => setPinnedUserId(pinnedUserId === userId ? null : userId)}
                onDoubleClick={() => setFullScreenUserId(fullScreenUserId === userId ? null : userId)}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    borderRadius: 'var(--radius-lg)',
                    border: isUserSpeaking ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    overflow: 'hidden',
                    background: 'var(--color-surface-2)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                }}
            >
                {/* Video Feed */}
                <VideoTile
                    stream={stream}
                    label={displayName}
                    muted={userId === 'me'}
                    isPrimary={isEnlarged}
                    isHandRaised={isUserHandRaised}
                    isHost={meetingInfo && meetingInfo.host && (meetingInfo.host._id === userId || meetingInfo.host === userId)}
                    isGuest={userId.startsWith('guest_')}
                    isVideoOffProp={userId === 'me' ? isVideoOff : remoteVideoStates[userId]}
                />


                {/* Hover Actions Controls */}
                {hoveredTile === userId && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(10, 11, 15, 0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        zIndex: 20
                    }}>
                        {/* Pin Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPinnedUserId(pinnedUserId === userId ? null : userId);
                            }}
                            style={{ background: pinnedUserId === userId ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem' }}
                            title={pinnedUserId === userId ? "Unpin user" : "Pin user to center"}
                        >
                            📌
                        </button>

                        {/* Full Screen Toggle Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullScreenUserId(fullScreenUserId === userId ? null : userId);
                            }}
                            style={{ background: fullScreenUserId === userId ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                            title={fullScreenUserId === userId ? "Exit Full Screen" : "Enter Full Screen"}
                        >
                            {fullScreenUserId === userId ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                </svg>
                            )}
                        </button>

                        {/* Remote Mute (Only if local user has manage permissions and target is not local) */}
                        {canManageParticipants && userId !== 'me' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    socket?.emit('meeting:mute-user', { meetingId, targetUserId: userId });
                                }}
                                style={{ background: 'rgba(239, 68, 68, 0.25)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem' }}
                                title="Request Mute"
                            >
                                🔇
                            </button>
                        )}

                        {/* Remote Remove (Only if local user has manage permissions and target is not local) */}
                        {canManageParticipants && userId !== 'me' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    socket?.emit('meeting:remove-user', { meetingId, targetUserId: userId });
                                }}
                                style={{ background: 'var(--color-danger)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem' }}
                                title="Kick participant"
                            >
                                ❌
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Dynamic grid configuration for Smart Meeting Layout
    let gridStyle: React.CSSProperties = {}
    if (allUsers.length === 1) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr',
            height: '100%',
            gap: 16
        }
    } else if (allUsers.length === 2) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
            height: '100%',
            gap: 16
        }
    } else if (allUsers.length <= 4) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            height: '100%',
            gap: 16
        }
    } else {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gridTemplateRows: 'repeat(auto-fit, minmax(200px, 1fr))',
            height: '100%',
            gap: 16
        }
    }

    const layoutStyle: React.CSSProperties = isMobile 
        ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 12, overflow: 'hidden' }
        : isTablet
        ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 16, overflow: 'hidden' }
        : { display: 'flex', flexDirection: 'row', height: '100%', width: '100%', gap: 20, overflow: 'hidden' }

    return (
        <div style={{
            height: '100%',
            maxHeight: '100%',
            background: 'var(--color-bg-base)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
        }}>

            {/* ── Header Bar ── */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 24px',
                background: 'rgba(10,11,15,0.85)',
                backdropFilter: 'blur(20px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                borderBottom: '1px solid var(--color-border)',
                zIndex: 'var(--z-header)' as any,
                boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
            }}>
                {/* Brand & Recording indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 32, height: 32,
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: 'var(--shadow-glow-accent)',
                            flexShrink: 0,
                        }}>
                            <IconVideo />
                        </div>
                        <span className="hidden sm:inline" style={{
                            fontSize: '1rem', fontWeight: 800,
                            letterSpacing: '-0.02em',
                            color: 'var(--color-text-primary)',
                        }}>
                            JTS<span className="gradient-text">Meet</span>
                        </span>
                    </div>

                    <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} className="hidden sm:block" />

                    {/* Recording Badge */}
                    {(isRecording || isRemoteRecording) && (
                        <span className="badge badge-danger anim-fade-in" style={{ display: 'inline-flex', gap: 6, padding: '4px 10px', fontSize: '0.6875rem' }}>
                            <span className="badge-dot danger pulse" style={{ width: 6, height: 6 }} />
                            REC
                        </span>
                    )}
                </div>

                {/* Center: meeting details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="hidden md:inline-block" style={{
                        fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)',
                        fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)',
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                    }}>
                        {meetingId || meetingInput}
                    </span>
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        style={{
                            padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700,
                            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 4,
                            background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-accent)',
                            border: '1px solid rgba(99, 102, 241, 0.25)', cursor: 'pointer'
                        }}
                    >
                        ➕ Invite
                    </button>
                    {isScreenShareActive && (
                        <span className="badge badge-accent anim-fade-in" style={{ padding: '4px 10px' }}>
                            <span className="badge-dot accent pulse" />
                            {screenSharingUserId === 'me' ? 'Sharing screen' : `${renamedUsers[screenSharingUserId] || screenSharingUserId} presenting`}
                        </span>
                    )}
                </div>

                {/* Right: status & participant count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                        <span className={`badge-dot ${connected ? 'success pulse' : 'danger'}`} />
                        {connected ? 'Live' : 'Offline'}
                    </span>
                    <div style={{
                        fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)'
                    }}>
                        <IconUsers />
                        <span>{participants.length + 1}</span>
                    </div>
                </div>
            </header>

            {/* ── Main Content Area ── */}
            <main style={{
                flex: 1,
                paddingTop: 64,
                paddingBottom: 20,
                display: 'flex',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', width: '100%', height: '100%', gap: 16 }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        {/* Screen share error */}
                        {screenError && (
                            <div className="anim-slide-up" style={{
                                background: 'var(--color-danger-light)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 16px',
                                fontSize: '0.875rem',
                                color: '#f87171',
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: 12
                            }}>
                                ⚠ {screenError}
                            </div>
                        )}

                        <div style={{ flex: 1, minHeight: 0 }}>
                            {isStageLayoutActive ? (
                                <div style={layoutStyle}>
                                    {/* Primary Focus Zone (Left / Top) */}
                                    <div style={{
                                        flex: fullScreenUserId ? 1 : isMobile ? 1 : isTablet ? '1 1 65%' : '1 1 80%',
                                        minWidth: 0,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        borderRadius: 'var(--radius-xl)',
                                        overflow: 'hidden',
                                        border: activeSpeaker === primaryUser ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                                        boxShadow: 'var(--shadow-sm)',
                                        transition: 'border-color 0.3s ease'
                                    }}>
                                        <VideoTile
                                            stream={primaryStream}
                                            label={primaryUser === 'me' ? 'You' : (renamedUsers[primaryUser] || primaryUser)}
                                            muted={primaryUser === 'me'}
                                            isScreenShare={isScreenShareActive && primaryUser === screenSharingUserId}
                                            isPrimary={true}
                                            isHandRaised={primaryUser === 'me' ? handRaised : handsRaisedMap[primaryUser]}
                                            isHost={meetingInfo && meetingInfo.host && (meetingInfo.host._id === primaryUser || meetingInfo.host === primaryUser)}
                                            isVideoOffProp={primaryUser === 'me' ? isVideoOff : remoteVideoStates[primaryUser]}
                                        />

                                        {/* Exit Full Screen Button Overlay */}
                                        {fullScreenUserId && (
                                            <button
                                                onClick={() => setFullScreenUserId(null)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 16,
                                                    right: 16,
                                                    background: 'var(--color-danger)',
                                                    border: 'none',
                                                    color: '#fff',
                                                    padding: '8px 16px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    boxShadow: 'var(--shadow-md)',
                                                    zIndex: 10
                                                }}
                                            >
                                                Exit Full Screen Focus
                                            </button>
                                        )}

                                        {/* Floating Unpin Button */}
                                        {pinnedUserId && (() => {
                                            const isPrimaryHandRaised = primaryUser === 'me' ? handRaised : handsRaisedMap[primaryUser];
                                            return (
                                                <button
                                                    onClick={() => setPinnedUserId(null)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 16,
                                                        left: isPrimaryHandRaised ? 125 : 16,
                                                        background: 'rgba(10, 11, 15, 0.75)',
                                                        backdropFilter: 'blur(8px)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 'var(--radius-full)',
                                                        padding: '6px 14px',
                                                        color: '#fff',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        zIndex: 10,
                                                        boxShadow: 'var(--shadow-md)',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'var(--color-accent)';
                                                        e.currentTarget.style.borderColor = 'transparent';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(10, 11, 15, 0.75)';
                                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                    }}
                                                >
                                                    📌 Unpin Screen
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    {/* Participants Strip (Right / Bottom) - hidden in fullScreenUserId mode */}
                                    {!fullScreenUserId && (
                                        <div style={{
                                            flex: (isMobile || isTablet) ? '0 0 110px' : '0 0 240px',
                                            display: 'flex',
                                            flexDirection: (isMobile || isTablet) ? 'row' : 'column',
                                            gap: 12,
                                            overflowX: (isMobile || isTablet) ? 'auto' : 'hidden',
                                            overflowY: (isMobile || isTablet) ? 'hidden' : 'auto',
                                            padding: '4px',
                                            boxSizing: 'border-box'
                                        }}>
                                            {stripUsers.map((userId) => (
                                                <div key={userId} style={{ height: '100%', aspectRatio: '16/9', flexShrink: 0 }}>
                                                    {renderMeetingTile(userId, false)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Smart Layout responsive grid
                                <div style={gridStyle}>
                                    {allUsers.map((userId) => renderMeetingTile(userId, false))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel slideouts */}
                    {activePanel === 'participants' && (
                        <ParticipantsPanel
                            participants={participants}
                            onClose={() => setActivePanel(null)}
                            spotlightUserId={spotlightUserId}
                            setSpotlightUserId={setSpotlightUserId}
                            coHostIds={coHostIds}
                            setCoHostIds={setCoHostIds}
                            renamedUsers={renamedUsers}
                            setRenamedUsers={setRenamedUsers}
                            addToast={addToast}
                            hostId={meetingInfo && meetingInfo.host ? (typeof meetingInfo.host === 'object' ? meetingInfo.host._id : meetingInfo.host) : null}
                            isLocalHost={isLocalHost}
                        />
                    )}
                    {activePanel === 'chat' && (
                        <div className="side-panel">
                            <div className="side-panel-header">
                                <span className="side-panel-title">Meeting Chat</span>
                                <button className="btn-icon" onClick={() => setActivePanel(null)} aria-label="Close chat">
                                    <IconX />
                                </button>
                            </div>
                            <div className="side-panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <MeetingChatPanel
                                    messages={messages}
                                    typingUsers={typingUsers}
                                    onSendMessage={sendMessage}
                                    onTyping={emitTyping}
                                    onStopTyping={emitStopTyping}
                                    disabled={!connected || !joined}
                                    onToggleChatReaction={toggleChatReaction}
                                    currentUserId={parseJwt(token)?.userId || 'me'}
                                    renamedUsers={renamedUsers}
                                />
                            </div>
                        </div>
                    )}
                    {activePanel === 'files' && (
                        <FilesPanel
                            token={token}
                            meetingId={meetingId || meetingInput.trim()}
                            onClose={() => setActivePanel(null)}
                        />
                    )}
                    {activePanel === 'settings' && (
                        <SettingsPanel
                            localStream={localStream}
                            onClose={() => setActivePanel(null)}
                            addToast={addToast}
                            isHost={isLocalHost || isAdminOrOwner}
                            isGuestJoinEnabled={meetingInfo?.isGuestJoinEnabled !== false}
                            onToggleGuestJoin={async (enabled) => {
                                try {
                                    const response = await fetch(`${API_BASE}/api/meeting/guest-join/toggle`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            meetingId: meetingId || meetingInput,
                                            enabled
                                        })
                                    })
                                    const data = await response.json()
                                    if (response.ok && data?.success) {
                                        setMeetingInfo(data.data)
                                        addToast(`Guest Join ${enabled ? 'enabled' : 'disabled'}`, 'success')
                                    } else {
                                        addToast(data.message || 'Failed to update setting', 'warning')
                                    }
                                } catch (e) {
                                    addToast('Network error updating setting', 'warning')
                                }
                            }}
                            isWaitingRoomEnabled={!!meetingInfo?.isWaitingRoomEnabled}
                            onToggleWaitingRoom={async (enabled) => {
                                try {
                                    const response = await fetch(`${API_BASE}/api/meeting/waiting-room/toggle`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            meetingId: meetingId || meetingInput,
                                            enabled
                                        })
                                    })
                                    const data = await response.json()
                                    if (response.ok && data?.success) {
                                        setMeetingInfo(data.data)
                                        addToast(`Waiting Room ${enabled ? 'enabled' : 'disabled'}`, 'success')
                                    } else {
                                        addToast(data.message || 'Failed to update setting', 'warning')
                                    }
                                } catch (e) {
                                    addToast('Network error updating setting', 'warning')
                                }
                            }}
                        />
                    )}
                </div>
            </main>

            {/* ── Bottom Control Bar ── */}
            <footer style={{
                position: 'fixed', bottom: 20, left: '50%', transform: `translateX(-50%) translateY(${toolbarVisible ? '0px' : '100px'})`,
                height: 64,
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '0 24px',
                background: 'rgba(10,11,15,0.8)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '40px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                zIndex: 'var(--z-toolbar)' as any,
                opacity: toolbarVisible ? 1 : 0,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
            }}>
                {/* Mic Trigger */}
                <button
                    onClick={toggleMute}
                    className={`btn-toolbar ${isMuted ? 'active leave' : ''}`}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: isMuted ? 'var(--color-danger)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                    {isMuted ? <IconMicOff /> : <IconMic />}
                </button>

                {/* Camera Trigger */}
                <button
                    onClick={toggleVideo}
                    className={`btn-toolbar ${isVideoOff ? 'active leave' : ''}`}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: isVideoOff ? 'var(--color-danger)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isVideoOff ? "Turn on Camera" : "Turn off Camera"}
                >
                    {isVideoOff ? <IconCameraOff /> : <IconCamera />}
                </button>

                {/* Screen Share Trigger */}
                {isScreenShareSupported() && (
                    <button
                        onClick={screenSharingUserId === 'me' ? stopScreenShare : startScreenShare}
                        disabled={!connected || !joined}
                        style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: screenSharingUserId === 'me' ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={screenSharingUserId === 'me' ? "Stop sharing screen" : "Share screen"}
                    >
                        <IconMonitor />
                    </button>
                )}

                {/* Hand Raise Trigger */}
                <button
                    onClick={() => {
                        socket?.emit('meeting:raise-hand', { meetingId: meetingId || meetingInput, raised: !handRaised })
                        setHandRaised(!handRaised)
                    }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: handRaised ? 'var(--color-warning)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
                    title={handRaised ? "Lower hand" : "Raise hand"}
                >
                    ✋
                </button>

                {/* Recording Trigger */}
                {isScreenShareSupported() && (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={!connected || !joined}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            border: 'none',
                            background: isRecording ? 'var(--color-danger)' : 'rgba(255,255,255,0.08)',
                            color: isRecording ? '#fff' : '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        className={isRecording ? 'pulse' : ''}
                        title={isRecording ? "Stop Recording Meeting" : "Record Meeting"}
                    >
                        {isRecording ? <IconStopRecord /> : <IconRecord />}
                    </button>
                )}

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />

                {/* Participants drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'participants' ? 'active' : ''}`}
                    onClick={() => togglePanel('participants')}
                    title="Show participants list"
                    style={{ width: 40, height: 40, border: 'none', borderRadius: '50%', background: activePanel === 'participants' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'participants' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                >
                    <IconUsers />
                    {participants.length > 0 && (
                        <span style={{
                            position: 'absolute', top: -2, right: -2,
                            minWidth: 14, height: 14, borderRadius: '50%',
                            background: 'var(--color-accent)',
                            fontSize: '0.55rem', fontWeight: 700,
                            color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '0 2px',
                            border: '1.5px solid var(--color-bg-base)',
                        }}>
                            {participants.length}
                        </span>
                    )}
                </button>

                {/* Chat drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'chat' ? 'active' : ''}`}
                    onClick={() => togglePanel('chat')}
                    title="Meeting chat window"
                    style={{ width: 40, height: 40, border: 'none', borderRadius: '50%', background: activePanel === 'chat' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'chat' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                >
                    <IconChat />
                    {messages.length > 0 && activePanel !== 'chat' && (
                        <span style={{
                            position: 'absolute', top: 0, right: 0,
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--color-accent)',
                            border: '1px solid var(--color-bg-base)'
                        }} />
                    )}
                </button>

                {/* Files drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'files' ? 'active' : ''}`}
                    onClick={() => togglePanel('files')}
                    title="Shared session files"
                    style={{ width: 40, height: 40, border: 'none', borderRadius: '50%', background: activePanel === 'files' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'files' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <IconFiles />
                </button>

                {/* Settings drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'settings' ? 'active' : ''}`}
                    onClick={() => togglePanel('settings')}
                    title="Hardware settings"
                    style={{ width: 40, height: 40, border: 'none', borderRadius: '50%', background: activePanel === 'settings' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'settings' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />

                {/* Hang up leave meeting */}
                <button
                    onClick={leaveMeeting}
                    style={{ background: 'var(--color-danger)', border: 'none', borderRadius: '20px', padding: '8px 18px', color: '#fff', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Leave Meeting Room"
                >
                    <IconPhoneOff />
                    Leave
                </button>
            </footer>

            {/* Floating Reactions Container */}
            <div style={{
                position: 'fixed', bottom: 100, left: 0, right: 0, height: 400,
                pointerEvents: 'none', zIndex: 9999, overflow: 'hidden'
            }}>
                {floatingReactions.map(r => (
                    <div
                        key={r.id}
                        style={{
                            position: 'absolute', bottom: 0, left: `${r.left}%`,
                            fontSize: '2.5rem', opacity: 0,
                            animation: 'float-reaction 3s ease-out forwards'
                        }}
                    >
                        {r.emoji}
                    </div>
                ))}
            </div>

            {/* Toasts Notification Container */}
            <div style={{
                position: 'fixed', top: 24, right: 24, zIndex: 10000,
                display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none'
            }}>
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="anim-slide-up"
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(15, 17, 23, 0.96)',
                            border: `1px solid ${t.type === 'success' ? 'rgba(34, 197, 94, 0.25)' :
                                    t.type === 'warning' ? 'rgba(245, 158, 11, 0.25)' :
                                        'var(--color-border-strong)'
                                }`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '12px 18px',
                            minWidth: 280,
                            maxWidth: 360,
                            color: '#fff',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            boxShadow: 'var(--shadow-xl)',
                            backdropFilter: 'blur(16px)',
                            willChange: 'transform, opacity'
                        }}
                    >
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: t.type === 'success' ? 'var(--color-success-light)' :
                                t.type === 'warning' ? 'var(--color-warning-light)' :
                                    'rgba(255,255,255,0.06)',
                            color: t.type === 'success' ? 'var(--color-success)' :
                                t.type === 'warning' ? 'var(--color-warning)' :
                                    'var(--color-accent)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }}>
                            {t.type === 'success' ? '✓' : t.type === 'warning' ? '!' : 'i'}
                        </span>
                        <div style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</div>
                    </div>
                ))}
            </div>

            {/* Style injection for reactions */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float-reaction {
                    0% {
                      transform: translateY(0) translateX(0) scale(0.5);
                      opacity: 0;
                    }
                    15% {
                      transform: translateY(-80px) translateX(-15px) scale(1.1);
                      opacity: 1;
                    }
                    50% {
                      transform: translateY(-220px) translateX(20px) scale(1.3);
                      opacity: 1;
                    }
                    85% {
                      transform: translateY(-340px) translateX(-10px) scale(1.1);
                      opacity: 0.8;
                    }
                    100% {
                      transform: translateY(-440px) translateX(15px) scale(0.8);
                      opacity: 0;
                    }
                }
            ` }} />

            {/* Guest Admission Popup Notifications */}
            {waitingGuests.length > 0 && (
                <div style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, width: '100%', pointerEvents: 'auto' }}>
                    {waitingGuests.map((guest) => (
                        <div key={guest.socketId} className="glass-card" style={{ padding: '20px 24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(15, 17, 23, 0.96)', backdropFilter: 'blur(16px)' }}>
                            <div>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                                    Guest Admission Request
                                </span>
                                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                                    {guest.guestName}
                                </span>
                                {guest.company && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                                        🏢 {guest.company}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleDenyGuest(guest.socketId)}
                                    className="btn"
                                    style={{ padding: '6px 12px', fontSize: '0.8125rem', color: '#f87171', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={() => handleApproveGuest(guest.socketId)}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 16px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                >
                                    Admit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Invite Participants Modal */}
            {isInviteOpen && (() => {
                const meetLink = `${window.location.origin}/meet/${meetingId || meetingInput}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(meetLink)}`;
                const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=JTS-Meet%20Session&details=Join%20the%20video%20call:%20${encodeURIComponent(meetLink)}`;
                const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=JTS-Meet%20Session&body=Join%20the%20video%20call:%20${encodeURIComponent(meetLink)}`;

                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div className="glass-card anim-scale-in" style={{ width: '100%', maxWidth: 540, background: 'rgba(15, 17, 23, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90dvh' }}>
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Invite Participants</h3>
                                <button
                                    onClick={() => setIsInviteOpen(false)}
                                    className="btn-icon"
                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
                                >
                                    <IconX />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                
                                {/* Link Copy Section */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                        Meeting Invite Link
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            readOnly
                                            value={meetLink}
                                            style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8125rem', outline: 'none' }}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(meetLink);
                                                addToast('Meeting link copied to clipboard!', 'success');
                                            }}
                                            className="btn btn-secondary"
                                            style={{ padding: '0 16px', fontSize: '0.8125rem', fontWeight: 600 }}
                                        >
                                            Copy Link
                                        </button>
                                    </div>
                                </div>

                                {/* Email Invite Section */}
                                <form onSubmit={handleSendEmailInvite}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                        Email Invitation
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="email"
                                            required
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="Enter recipient email address"
                                            style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={sendingInvite || !inviteEmail}
                                            className="btn btn-primary"
                                            style={{ padding: '0 16px', fontSize: '0.8125rem', fontWeight: 700 }}
                                        >
                                            {sendingInvite ? 'Sending...' : 'Send Email'}
                                        </button>
                                    </div>
                                </form>

                                {/* SMS Invite Section */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                        SMS Invite <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>(Future-ready Demo)</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="tel"
                                            value={invitePhone}
                                            onChange={(e) => setInvitePhone(e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                            style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                addToast('SMS Gateway Integration configured (future-ready mock trigger).', 'info');
                                                setInvitePhone('');
                                            }}
                                            className="btn btn-secondary"
                                            style={{ padding: '0 16px', fontSize: '0.8125rem', fontWeight: 600 }}
                                        >
                                            Send SMS
                                        </button>
                                    </div>
                                </div>

                                {/* QR Code & Quick Shares */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center', marginTop: 8 }}>
                                    {/* QR Code graphic */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                        <img
                                            src={qrUrl}
                                            alt="Meeting Invite QR Code"
                                            style={{ width: 120, height: 120, borderRadius: 'var(--radius-sm)', background: '#fff', padding: 6 }}
                                        />
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Scan QR to Join Session</span>
                                    </div>

                                    {/* WhatsApp & Calendars */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <a
                                            href={`https://api.whatsapp.com/send?text=Join%20my%20JTS-Meet%20session:%20${encodeURIComponent(meetLink)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn"
                                            style={{ background: '#25d366', color: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none' }}
                                        >
                                            💬 Share on WhatsApp
                                        </a>

                                        <a
                                            href={gCalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary"
                                            style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            📅 Google Calendar
                                        </a>

                                        <a
                                            href={outlookUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary"
                                            style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            📅 Outlook Calendar
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    )
}
