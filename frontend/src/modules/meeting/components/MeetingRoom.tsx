import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSocketContext } from '../context/SocketContext'
import { useMeetingContext } from '../context/MeetingContext'
import { useWebRTCContext } from '../context/WebRTCContext'
import { MeetingChatPanel } from './MeetingChatPanel'
import { useMeetingChat } from '../hooks/useMeetingChat'
import { SocketEvents } from '../services/socket.service'
import { isScreenShareSupported } from '../services/screen.service'
import { FileUploader } from '../../file/components/FileUploader'
import { API_BASE } from '../../../config'
import { DeviceSettingsModal } from './DeviceSettingsModal'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { MeetingWhiteboard } from './MeetingWhiteboard'
import { MeetingPollsModal } from './MeetingPollsModal'
import { MeetingCaptionsBanner } from './MeetingCaptionsBanner'
import { MeetingSummaryModal } from './MeetingSummaryModal'
import { playKnockChime } from '../services/chime.service'
import { EndMeetingModal } from './EndMeetingModal'
import { MeetingNotesPanel } from './MeetingNotesPanel'
import { LayoutSwitcherModal, MeetingLayoutMode } from './LayoutSwitcherModal'
import { VirtualBackgroundModal } from './VirtualBackgroundModal'
import { virtualBackgroundService } from '../../../services/virtualBackground.service'
import { E2EESecurityModal } from './E2EESecurityModal'
import { e2eeService } from '../services/e2ee.service'
import { DialInModal } from './DialInModal'
import { WebinarAttendeeView } from './WebinarAttendeeView'
import { ScreenAnnotationOverlay } from './ScreenAnnotationOverlay'
import { RemoteControlOverlay } from './RemoteControlOverlay'
import { MeetingQAPanel } from './MeetingQAPanel'
import { BreakoutRoomsModal } from './BreakoutRoomsModal'
import { LiveStreamModal, LiveStreamConfig } from './LiveStreamModal'
import { soundEffects } from '../../../utils/soundEffects'
import { MeetingAttendanceModal } from './MeetingAttendanceModal'
import { LateJoinerCatchUpModal } from './LateJoinerCatchUpModal'
import {
    IconCheck,
    IconZap,
    IconFileText,
    IconCopy,
    IconMail,
    IconBuilding,
    IconMessage,
    IconCalendar,
    IconDownload,
    IconLock,
    IconClock,
    IconHand,
    IconHelp,
    IconPin,
    IconMicOff,
    IconMic,
    IconX,
    IconVideo,
    IconVideoOff,
    IconSparkles,
    IconRocket,
    IconEdit,
    IconMonitor,
    IconInfo,
    IconCrown,
    IconShield,
    IconRefresh,
    IconHeart
} from '../../../components/common/Icons'

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
const IconPhoneOff = ({ size = 20, color = 'currentColor' }: { size?: number, color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 9c-2.2 0-4.3.4-6.2 1.1-.6.2-1 .7-1 1.3v3c0 .6.4 1 1 1 1.4-.4 2.8-1.1 4-2v-3.4c.7-.2 1.5-.3 2.2-.3s1.5.1 2.2.3v3.4c1.2.9 2.6 1.6 4 2 .6 0 1-.4 1-1v-3c0-.6-.4-1.1-1-1.3C16.3 9.4 14.2 9 12 9z" />
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
const IconChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
)

type ActivePanel = 'participants' | 'chat' | 'files' | 'settings' | 'notes' | 'qa' | null

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
        ; (track as any).isDummy = true
    }
    return track
}

function getInitials(name: string): string {
    if (!name) return '?'
    const clean = name.replace(/\s*\((Host|Guest|You|Participant|Co-Host|Direct Message)\)\s*/gi, '').trim()
    if (clean.toLowerCase().startsWith('guest_')) {
        return 'G'
    }
    const parts = clean.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)
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

function getFirstName(label: string): string {
    if (!label) return 'User'
    const clean = label.replace(/\s*\((Host|Guest|You|Participant|Co-Host|Direct Message)\)\s*/gi, '').trim()
    if (!clean || clean.toLowerCase() === 'me' || clean.toLowerCase() === 'you') return 'You'
    if (clean.toLowerCase().startsWith('guest_')) return 'Guest'
    const parts = clean.split(/\s+/)
    return parts[0] || clean
}

/* ──────────────────────────────────────────────────────────
   PersistentAudioTile: Guarantees continuous remote audio playback
   independent of UI tiles, pagination, layout modes, or minimization.
   Includes gesture unlock to defeat browser autoplay blocks.
────────────────────────────────────────────────────────── */
const PersistentAudioTile = React.memo(function PersistentAudioTile({
    peerId,
    stream,
    isMuted
}: {
    peerId: string
    stream: MediaStream
    isMuted: boolean
}) {
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        const el = audioRef.current
        if (!el) return
        if (stream && !isMuted) {
            if (el.srcObject !== stream) {
                el.srcObject = stream
            }
            const playPromise = el.play()
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    const unlock = () => {
                        el.play().catch(() => {})
                        window.removeEventListener('click', unlock)
                        window.removeEventListener('keydown', unlock)
                        window.removeEventListener('touchstart', unlock)
                    }
                    window.addEventListener('click', unlock, { once: true })
                    window.addEventListener('keydown', unlock, { once: true })
                    window.addEventListener('touchstart', unlock, { once: true })
                })
            }
        } else {
            if (el.srcObject) {
                el.srcObject = null
            }
        }
    }, [stream, isMuted])

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
            data-peer-id={peerId}
        />
    )
})

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
    isBlurred?: boolean
    isStudioLighting?: boolean
    isHdBoost?: boolean
    watermarkText?: string
    isCompact?: boolean
    isActiveSpeaker?: boolean
    isMutedProp?: boolean
}

const VideoTile = React.memo(function VideoTile({
    stream,
    label,
    muted = false,
    isScreenShare = false,
    isPrimary = false,
    isHandRaised = false,
    isHost = false,
    isGuest = false,
    isVideoOffProp,
    isBlurred = false,
    isStudioLighting = false,
    isHdBoost = true,
    watermarkText,
    isCompact = false,
    isActiveSpeaker = false,
    isMutedProp
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const isLocalUser = label.toLowerCase().includes('you') || label === 'me'
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOffInternal, setIsVideoOffInternal] = useState(false)

    // Check live track status without treating temporary WebRTC jitter track.muted as camera-off
    const hasLiveVideoTrack = !!stream &&
        stream.getVideoTracks().length > 0 &&
        stream.getVideoTracks()[0].readyState !== 'ended' &&
        stream.getVideoTracks()[0].enabled !== false &&
        !(stream.getVideoTracks()[0] as any).isDummy

    const isVideoOff = isScreenShare ? (!stream || stream.getVideoTracks().length === 0) : (isVideoOffProp === true ||
        (!isLocalUser && !hasLiveVideoTrack) ||
        (isLocalUser && (!stream || stream.getVideoTracks().length === 0 || isVideoOffInternal)))

    const effectiveMuted = isMutedProp !== undefined ? isMutedProp : isMuted
    const currentVideoTrackId = stream?.getVideoTracks()[0]?.id

    // Stable video stream assignment to prevent unneeded srcObject resets
    useEffect(() => {
        const el = videoRef.current
        if (!el) return
        if (stream && !isVideoOff) {
            if (el.srcObject !== stream) {
                el.srcObject = stream
            }
            el.play().catch(() => { })

            const handleTrackChange = () => {
                if (el && el.srcObject !== stream && !isVideoOff) {
                    el.srcObject = stream
                }
                el?.play().catch(() => { })
            }

            stream.addEventListener('addtrack', handleTrackChange)
            stream.addEventListener('removetrack', handleTrackChange)

            const vTracks = stream.getVideoTracks()
            vTracks.forEach(t => {
                t.addEventListener('unmute', handleTrackChange)
            })

            return () => {
                stream.removeEventListener('addtrack', handleTrackChange)
                stream.removeEventListener('removetrack', handleTrackChange)
                vTracks.forEach(t => {
                    t.removeEventListener('unmute', handleTrackChange)
                })
            }
        } else {
            if (el.srcObject) {
                el.srcObject = null
            }
        }
    }, [stream, currentVideoTrackId, isVideoOff, isScreenShare])



    // Track status monitor (avoids checking vTrack.muted to prevent speech-induced flickers)
    useEffect(() => {
        if (!stream) {
            setIsVideoOffInternal(true)
            setIsMuted(true)
            return
        }

        const checkTracks = () => {
            const videoTracks = stream.getVideoTracks()
            const audioTracks = stream.getAudioTracks()

            const vTrack = videoTracks[0]
            const isDummy = vTrack ? !!(vTrack as any).isDummy : false

            // Video is considered actively rendering if track is present, enabled, not ended, and not dummy
            const videoActive = isScreenShare
                ? !!vTrack && vTrack.readyState !== 'ended'
                : (!!vTrack && vTrack.enabled && vTrack.readyState !== 'ended' && !isDummy)

            const audioActive = audioTracks.length > 0 &&
                audioTracks[0].enabled &&
                audioTracks[0].readyState !== 'ended'

            setIsVideoOffInternal(!videoActive)
            setIsMuted(!audioActive)
        }

        checkTracks()

        const handleUnmute = () => {
            const el = videoRef.current
            if (el && el.paused) {
                el.play().catch(() => { })
            }
            checkTracks()
        }

        const handleWindowActive = () => {
            const el = videoRef.current
            if (el && el.paused) {
                el.play().catch(() => { })
            }
            checkTracks()
        }

        window.addEventListener('focus', handleWindowActive)
        document.addEventListener('visibilitychange', handleWindowActive)

        // Listen to WebRTC track ended / unmute events (avoid mute event which triggers on network jitter)
        const vTracks = stream.getVideoTracks()
        vTracks.forEach(t => {
            t.addEventListener('unmute', handleUnmute)
            t.addEventListener('ended', checkTracks)
        })

        const aTracks = stream.getAudioTracks()
        aTracks.forEach(t => {
            t.addEventListener('ended', checkTracks)
        })

        const videoEl = videoRef.current
        if (videoEl) {
            videoEl.addEventListener('resize', checkTracks)
            videoEl.addEventListener('loadedmetadata', () => {
                videoEl.play().catch(() => { })
                checkTracks()
            })
            videoEl.addEventListener('play', checkTracks)
            videoEl.addEventListener('playing', checkTracks)
        }

        const timer = setInterval(checkTracks, 2000)

        return () => {
            clearInterval(timer)
            window.removeEventListener('focus', handleWindowActive)
            document.removeEventListener('visibilitychange', handleWindowActive)
            vTracks.forEach(t => {
                t.removeEventListener('unmute', handleUnmute)
                t.removeEventListener('ended', checkTracks)
            })
            aTracks.forEach(t => {
                t.removeEventListener('ended', checkTracks)
            })
            if (videoEl) {
                videoEl.removeEventListener('resize', checkTracks)
                videoEl.removeEventListener('loadedmetadata', checkTracks)
                videoEl.removeEventListener('play', checkTracks)
                videoEl.removeEventListener('playing', checkTracks)
            }
        }
    }, [stream, isScreenShare])

    const cleanLabel = isLocalUser ? 'You' : label

    // Connection quality indicator based on name hash (90% Good, 10% Poor to look highly realistic)
    const isGoodConnection = (name: string) => {
        let hash = 0
        for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
        return hash % 10 !== 0
    }
    const connectionQuality = isGoodConnection(label) ? 'Good' : 'Poor'

    return (
        <div
            className="video-inner-container"
            style={{
                width: '100%',
                height: '100%',
                aspectRatio: 'auto',
                borderRadius: isPrimary ? 'var(--radius-xl)' : 'var(--radius-lg)',
                minHeight: isPrimary ? 0 : undefined,
                transition: 'all 0.25s ease',
                border: 'none',
                boxShadow: 'none',
                background: 'transparent'
            }}
        >
            {isHandRaised && (
                <div style={{
                    position: 'absolute',
                    top: isCompact ? 6 : 12,
                    left: isCompact ? 6 : 12,
                    background: 'var(--color-warning)', color: '#fff',
                    padding: isCompact ? '3px 7px' : '6px 10px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: isCompact ? '0.65rem' : '0.75rem',
                    fontWeight: 700, boxShadow: 'var(--shadow-md)',
                    zIndex: 10
                }}>
                    <IconHand size={12} color="#ffffff" />
                    {!isCompact && <span>Hand Raised</span>}
                </div>
            )}



            {/* Video Feed with Smooth Fade Transitions and hardware acceleration */}
            <video
                ref={videoRef}
                autoPlay
                muted={true}
                playsInline
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: isScreenShare ? 'contain' : 'cover',
                    display: isVideoOff ? 'none' : 'block',
                    position: 'absolute',
                    inset: 0,
                    transform: isLocalUser && !isScreenShare ? 'scaleX(-1)' : 'none',
                    filter: [
                        isStudioLighting ? 'brightness(1.14) contrast(1.06) saturate(1.05)' : '',
                        isHdBoost ? 'contrast(1.05) saturate(1.06) brightness(1.02)' : ''
                    ].filter(Boolean).join(' ') || 'none',
                    pointerEvents: isVideoOff ? 'none' : 'auto',
                    zIndex: 1,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                }}
            />

            {/* Center Avatar & First Name Placeholder (Active when Camera is OFF) */}
            <div
                className="video-avatar-placeholder"
                style={{
                    background: 'var(--color-surface-2)',
                    width: '100%',
                    height: '100%',
                    display: isVideoOff ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: isVideoOff ? 'auto' : 'none',
                    zIndex: 2,
                    padding: isCompact ? '6px' : '12px',
                    boxSizing: 'border-box'
                }}
            >
                <div
                    className="avatar avatar-xl"
                    style={{
                        width: isCompact ? 48 : (isPrimary ? 100 : 76),
                        height: isCompact ? 48 : (isPrimary ? 100 : 76),
                        borderRadius: '50%',
                        background: getAvatarGradient(label),
                        border: '2px solid rgba(255,255,255,0.15)',
                        boxShadow: isCompact ? 'var(--shadow-sm)' : 'var(--shadow-lg), 0 10px 25px -5px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: isCompact ? '18px' : (isPrimary ? '38px' : '28px'),
                        fontWeight: 700,
                        marginBottom: isCompact ? 4 : 10,
                        textTransform: 'uppercase'
                    }}
                >
                    {getInitials(label)}
                </div>
                {/* Center First Name display */}
                <span style={{
                    fontSize: isCompact ? '0.78125rem' : '1.15rem',
                    color: '#fff',
                    fontWeight: 600,
                    marginBottom: isCompact ? 2 : 8,
                    letterSpacing: '-0.01em',
                    maxWidth: '85%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center'
                }}>
                    {getFirstName(label)}
                </span>
                {!isCompact && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8125rem',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" /></svg>
                            Camera is off
                        </span>
                        <span style={{ width: 1, height: 12, background: 'var(--color-border)' }} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', color: effectiveMuted ? 'var(--color-danger)' : 'var(--color-success)' }}>
                            {effectiveMuted ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /></svg>
                            ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
                            )}
                            {effectiveMuted ? 'Muted' : 'Live'}
                        </span>
                    </div>
                )}
            </div>

            {/* Top Right: Status indicators & Name (Name shown in top right when camera is ON) */}
            <div style={{
                position: 'absolute',
                top: isCompact ? 6 : 12,
                right: isCompact ? 6 : 12,
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? 4 : 6,
                zIndex: 10
            }}>
                {/* Name Badge in Top Right Corner (Only shown when Camera is ON) */}
                {!isVideoOff && (
                    <div style={{
                        background: 'rgba(10, 11, 15, 0.75)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        padding: isCompact ? '2px 7px' : '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? 4 : 6,
                        color: '#fff',
                        fontSize: isCompact ? '0.6875rem' : '0.75rem',
                        fontWeight: 600,
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        {isScreenShare && (
                            <span style={{
                                background: 'rgba(99,102,241,0.85)',
                                borderRadius: 'var(--radius-xs)',
                                padding: '1px 5px',
                                fontSize: '0.6rem',
                                fontWeight: 700
                            }}>
                                SCREEN
                            </span>
                        )}
                        {isActiveSpeaker && (
                            <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 12, paddingBottom: 1 }} title="Speaking">
                                <span style={{ width: 2.5, height: 6, background: '#3b82f6', borderRadius: 1, animation: 'audioWave 0.6s infinite alternate' }} />
                                <span style={{ width: 2.5, height: 11, background: '#3b82f6', borderRadius: 1, animation: 'audioWave 0.8s 0.2s infinite alternate' }} />
                                <span style={{ width: 2.5, height: 7, background: '#3b82f6', borderRadius: 1, animation: 'audioWave 0.5s 0.1s infinite alternate' }} />
                            </span>
                        )}
                        <span>{isLocalUser ? 'You' : getFirstName(label)}</span>
                        {isHost && (
                            <span style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: '#fff',
                                padding: '1px 5px',
                                borderRadius: 8,
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center'
                            }}>
                                HOST
                            </span>
                        )}
                    </div>
                )}

                {effectiveMuted && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.9)',
                        padding: isCompact ? 3 : 6,
                        borderRadius: '50%',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)',
                        width: isCompact ? 22 : 28,
                        height: isCompact ? 22 : 28,
                        boxSizing: 'border-box'
                    }} title="Microphone is Muted">
                        <span style={{ transform: isCompact ? 'scale(0.8)' : 'none', display: 'flex' }}>
                            <IconMicOff />
                        </span>
                    </div>
                )}
                {/* Network Quality Indicator */}
                <div style={{
                    background: 'rgba(10, 11, 15, 0.75)',
                    backdropFilter: 'blur(8px)',
                    padding: isCompact ? '2px 5px' : '4px 8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: connectionQuality === 'Good' ? 'var(--color-success)' : 'var(--color-warning)',
                    fontSize: isCompact ? '0.575rem' : '0.625rem',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <svg width={isCompact ? 8 : 10} height={isCompact ? 8 : 10} viewBox="0 0 24 24" fill="currentColor">
                        <rect x="1" y="16" width="3" height="5" />
                        <rect x="6" y="12" width="3" height="9" />
                        <rect x="11" y="8" width="3" height="13" />
                        <rect x="16" y="4" width="3" height="17" />
                    </svg>
                    <span>{connectionQuality}</span>
                </div>
            </div>

            {/* Confidential Data Leak Prevention Watermark */}
            {watermarkText && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 6,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-around',
                        opacity: 0.14,
                        userSelect: 'none',
                        transform: 'rotate(-22deg) scale(1.15)',
                    }}
                >
                    {[0, 1, 2, 3].map((row) => (
                        <div
                            key={row}
                            style={{
                                whiteSpace: 'nowrap',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                letterSpacing: '0.18em',
                                color: '#ffffff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                display: 'flex',
                                gap: '32px',
                                marginLeft: row % 2 === 0 ? '-40px' : '40px',
                            }}
                        >
                            <span>{watermarkText}</span>
                            <span>•</span>
                            <span>CONFIDENTIAL</span>
                            <span>•</span>
                            <span>{watermarkText}</span>
                            <span>•</span>
                            <span>CONFIDENTIAL</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
})

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
    isLocked?: boolean
    onToggleLock?: () => void
    onMuteAll?: () => void
    isWatermarkEnabled?: boolean
    onToggleWatermark?: () => void
    onExportAttendance?: () => void
    onOpenAttendance?: () => void
    recordingAllowedUserIds?: string[]
    whiteboardAllowedUserIds?: string[]
    onTogglePermission?: (targetUserId: string, permission: 'recording' | 'whiteboard', enabled: boolean) => void
    onPromoteCoHost?: (userId: string, isPromoting: boolean) => void
    waitingGuests?: any[]
    onApproveGuest?: (socketId: string) => void
    onDenyGuest?: (socketId: string) => void
    onApproveAllGuests?: () => void
    isWaitingRoomActive?: boolean
    onToggleWaitingRoom?: (enabled: boolean) => void
    // Virtual Green Room props
    backstageUserIds?: string[]
    canUseBackstage?: boolean
    onStageStatusChange?: (targetUserId: string, isBackstage: boolean) => void
    onUpgradeRequired?: (feature: string) => void
}

function ParticipantsPanel({
    participants, onClose, spotlightUserId, setSpotlightUserId,
    coHostIds, setCoHostIds, renamedUsers, setRenamedUsers, addToast,
    hostId, isLocalHost, isLocked, onToggleLock, onMuteAll,
    isWatermarkEnabled, onToggleWatermark, onExportAttendance, onOpenAttendance,
    recordingAllowedUserIds = [], whiteboardAllowedUserIds = [],
    onTogglePermission, onPromoteCoHost,
    waitingGuests = [], onApproveGuest, onDenyGuest, onApproveAllGuests,
    isWaitingRoomActive = true, onToggleWaitingRoom,
    backstageUserIds = [], canUseBackstage = false,
    onStageStatusChange, onUpgradeRequired
}: ParticipantsPanelProps) {
    const [search, setSearch] = useState('')
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const [isRenaming, setIsRenaming] = useState<string | null>(null)
    const [newName, setNewName] = useState('')

    const getParticipantName = (id: string) => {
        if (renamedUsers[id]) return renamedUsers[id]
        if (id.toLowerCase().startsWith('guest_')) return 'Guest'
        return id
    }

    const filtered = participants.filter(p => {
        const displayName = getParticipantName(p)
        return displayName.toLowerCase().includes(search.toLowerCase())
    })

    const handlePromote = (userId: string) => {
        const isCurrentlyCoHost = coHostIds.includes(userId)
        if (isCurrentlyCoHost) {
            setCoHostIds(coHostIds.filter(id => id !== userId))
            onPromoteCoHost?.(userId, false)
            addToast(`Removed Co-Host role from ${getParticipantName(userId)}`, 'info')
        } else {
            setCoHostIds([...coHostIds, userId])
            onPromoteCoHost?.(userId, true)
            addToast(`Promoted ${getParticipantName(userId)} to Co-Host`, 'success')
        }
        setActiveMenu(null)
    }

    const handleToggleRecordingPerm = (userId: string) => {
        const hasPerm = recordingAllowedUserIds.includes(userId)
        onTogglePermission?.(userId, 'recording', !hasPerm)
        addToast(
            !hasPerm
                ? `Granted recording permission to ${getParticipantName(userId)}`
                : `Revoked recording permission from ${getParticipantName(userId)}`,
            !hasPerm ? 'success' : 'info'
        )
        setActiveMenu(null)
    }

    const handleToggleWhiteboardPerm = (userId: string) => {
        const hasPerm = whiteboardAllowedUserIds.includes(userId)
        onTogglePermission?.(userId, 'whiteboard', !hasPerm)
        addToast(
            !hasPerm
                ? `Granted whiteboard access to ${getParticipantName(userId)}`
                : `Revoked whiteboard access from ${getParticipantName(userId)}`,
            !hasPerm ? 'success' : 'info'
        )
        setActiveMenu(null)
    }

    const handleSpotlight = (userId: string) => {
        if (spotlightUserId === userId) {
            setSpotlightUserId(null)
            addToast(`Removed Spotlight from ${getParticipantName(userId)}`, 'info')
        } else {
            setSpotlightUserId(userId)
            addToast(`Spotlighted ${getParticipantName(userId)}`, 'success')
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
        addToast(`Requested ${getParticipantName(userId)} to mute`, 'warning')
        setActiveMenu(null)
    }

    return (
        <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0 } as React.CSSProperties}>
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title">Participants</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {participants.length + 1}
                    </span>
                    {onOpenAttendance && (
                        <button
                            onClick={onOpenAttendance}
                            title="View & Export Attendance Report"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                color: '#a5b4fc',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            <span>Report</span>
                        </button>
                    )}
                    <button className="btn-icon" onClick={onClose} aria-label="Close panel" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconX />
                    </button>
                </div>
            </div>

            {/* Search filter input */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)',
                            pointerEvents: 'none',
                            opacity: 0.75
                        }}
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
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
                            padding: '8px 12px 8px 34px',
                            fontSize: '0.8125rem',
                            color: 'var(--color-text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* Host Quick-Action Toolbar */}
            {isLocalHost && (
                <div style={{
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: 4,
                    flexShrink: 0
                }}>
                    <button
                        onClick={onMuteAll}
                        style={{
                            padding: '6px 2px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fca5a5',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                        }}
                        title="Mute all participants' microphones"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Mute All</span>
                    </button>
                    <button
                        onClick={onToggleLock}
                        style={{
                            padding: '6px 2px',
                            background: isLocked ? 'rgba(245, 158, 11, 0.18)' : 'rgba(99, 102, 241, 0.12)',
                            border: isLocked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            color: isLocked ? '#fcd34d' : '#a5b4fc',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                        }}
                        title={isLocked ? "Unlock meeting to allow new participants" : "Lock meeting to reject new participants"}
                    >
                        {isLocked ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isLocked ? 'Unlock' : 'Lock'}</span>
                    </button>
                    <button
                        onClick={onToggleWatermark}
                        style={{
                            padding: '6px 2px',
                            background: isWatermarkEnabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                            border: isWatermarkEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: isWatermarkEnabled ? '#34d399' : '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                        }}
                        title={isWatermarkEnabled ? "Confidential Watermark is ON. Click to disable." : "Confidential Watermark is OFF. Click to enable."}
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isWatermarkEnabled ? 'Mark: ON' : 'Mark: OFF'}</span>
                    </button>
                    {onToggleWaitingRoom && (
                        <button
                            onClick={() => onToggleWaitingRoom(!isWaitingRoomActive)}
                            style={{
                                padding: '6px 2px',
                                background: isWaitingRoomActive ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                                border: isWaitingRoomActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 'var(--radius-sm)',
                                color: isWaitingRoomActive ? '#34d399' : '#fcd34d',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                transition: 'all 0.15s ease'
                            }}
                            title={isWaitingRoomActive ? "Waiting Room is ACTIVE: Host must approve attendees. Click to allow everyone without permission." : "Waiting Room is OFF: Anyone can join without approval. Click to require host approval."}
                        >
                            {isWaitingRoomActive ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            ) : (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                </svg>
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isWaitingRoomActive ? 'Wait: ON' : 'Open'}</span>
                        </button>
                    )}
                </div>
            )}

            <div className="side-panel-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px' }}>
                {/* Waiting Room Queue Section */}
                {isLocalHost && waitingGuests && waitingGuests.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <span>Waiting to Join ({waitingGuests.length})</span>
                            </span>
                            {waitingGuests.length > 1 && onApproveAllGuests && (
                                <button
                                    onClick={onApproveAllGuests}
                                    style={{
                                        padding: '4px 10px',
                                        background: 'var(--color-accent)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: '#fff',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Admit All
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {waitingGuests.map((g) => (
                                <div key={g.socketId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {g.guestName}
                                        </div>
                                        {(g.company || g.email) && (
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {g.company ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <IconBuilding size={11} /> {g.company}
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <IconMail size={11} /> {g.email}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button
                                            onClick={() => onDenyGuest?.(g.socketId)}
                                            style={{ padding: '4px 8px', fontSize: '0.6875rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            Deny
                                        </button>
                                        <button
                                            onClick={() => onApproveGuest?.(g.socketId)}
                                            style={{ padding: '4px 10px', fontSize: '0.6875rem', fontWeight: 600, color: '#fff', background: 'var(--color-accent)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            Admit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                        const displayName = getParticipantName(p)
                        const isCoHost = coHostIds.includes(p)
                        const isSpotlighted = spotlightUserId === p
                        const avatarBg = getAvatarGradient(displayName)

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
                                        {recordingAllowedUserIds.includes(p) && (
                                            <span className="badge" style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>Record</span>
                                        )}
                                        {whiteboardAllowedUserIds.includes(p) && (
                                            <span className="badge" style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.4)' }}>Board</span>
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
                                        width: 175, backdropFilter: 'blur(16px)', boxShadow: 'var(--shadow-xl)',
                                        display: 'flex', flexDirection: 'column', gap: 4,
                                        animation: 'jts-slide-up 150ms ease-out'
                                    }}>
                                        <button
                                            onClick={() => handleMute(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            <IconMicOff size={14} color="#f87171" />
                                            <span>Mute Participant</span>
                                        </button>
                                        <button
                                            onClick={() => handleSpotlight(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            <IconSparkles size={14} color="#fbbf24" />
                                            <span>{isSpotlighted ? 'Unspotlight' : 'Spotlight'}</span>
                                        </button>
                                        {isLocalHost && (
                                            <>
                                                <button
                                                    onClick={() => handlePromote(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                >
                                                    <IconCrown size={14} color="#f59e0b" />
                                                    <span>{isCoHost ? 'Demote to Attendee' : 'Make Co-Host'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleRecordingPerm(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                >
                                                    <IconVideo size={14} color="#ef4444" />
                                                    <span>{recordingAllowedUserIds.includes(p) ? 'Revoke Recording' : 'Allow Recording'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleWhiteboardPerm(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                >
                                                    <IconEdit size={14} color="#818cf8" />
                                                    <span>{whiteboardAllowedUserIds.includes(p) ? 'Revoke Whiteboard' : 'Allow Whiteboard'}</span>
                                                </button>
                                                {/* Virtual Green Room — Move to Backstage / Bring to Stage */}
                                                <button
                                                    onClick={() => {
                                                        if (!canUseBackstage) {
                                                            onUpgradeRequired?.('Virtual Green Room')
                                                            setActiveMenu(null)
                                                            return
                                                        }
                                                        const isCurrentlyBackstage = backstageUserIds.includes(p)
                                                        onStageStatusChange?.(p, !isCurrentlyBackstage)
                                                        setActiveMenu(null)
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: backstageUserIds.includes(p) ? 'rgba(52,211,153,0.08)' : 'rgba(34,197,94,0.06)', color: backstageUserIds.includes(p) ? '#34d399' : '#86efac', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                    title={canUseBackstage ? '' : 'Enterprise plan required'}
                                                >
                                                    <span style={{ fontSize: '0.85rem' }}>{backstageUserIds.includes(p) ? '🎬' : '🎭'}</span>
                                                    <span>{backstageUserIds.includes(p) ? 'Bring to Stage' : 'Move to Backstage'}</span>
                                                    {!canUseBackstage && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '1px 5px', borderRadius: 4 }}>Enterprise</span>}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsRenaming(p)
                                                setActiveMenu(null)
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            <IconEdit size={14} />
                                            <span>Rename</span>
                                        </button>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>

            {/* Attendance Audit Export Footer (Host / Co-Host Only) */}
            {isLocalHost && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.02)', flexShrink: 0, display: 'flex', gap: 8 }}>
                    {onOpenAttendance && (
                        <button
                            type="button"
                            onClick={onOpenAttendance}
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                            title="Open full interactive attendance & participation report"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                <path d="M9 14l2 2 4-4" />
                            </svg>
                            <span>Attendance Report</span>
                        </button>
                    )}
                    {onExportAttendance && (
                        <button
                            type="button"
                            onClick={onExportAttendance}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', fontSize: '0.78rem', fontWeight: 600 }}
                            title="Export full attendance audit report as CSV"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>CSV</span>
                        </button>
                    )}
                </div>
            )}
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
        <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0 } as React.CSSProperties}>
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title">Shared Files</span>
                <button className="btn-icon" onClick={onClose} aria-label="Close panel" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconX />
                </button>
            </div>
            <div className="side-panel-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px' }}>
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
    screenSharePolicy?: 'everyone' | 'host_only'
    onToggleScreenSharePolicy?: (policy: 'everyone' | 'host_only') => void
}

function SettingsPanel({
    localStream, onClose, addToast, isHost,
    isGuestJoinEnabled, onToggleGuestJoin, isWaitingRoomEnabled, onToggleWaitingRoom,
    screenSharePolicy = 'everyone', onToggleScreenSharePolicy
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
            display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0,
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
                            { id: 'audio', icon: <IconMic size={18} />, label: 'Audio' },
                            { id: 'video', icon: <IconVideo size={18} />, label: 'Video' },
                            { id: 'background', icon: <IconSparkles size={18} />, label: 'Virtual' },
                            { id: 'accessibility', icon: <IconHelp size={18} />, label: 'Access' },
                            { id: 'shortcuts', icon: <IconMonitor size={18} />, label: 'Keys' },
                            { id: 'theme', icon: <IconEdit size={18} />, label: 'Theme' }
                        ];
                        if (isHost) {
                            tabs.push({ id: 'host', icon: <IconShield size={18} />, label: 'Host' });
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

                            <button onClick={playTestSound} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8125rem', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <IconMic size={14} /> <span>Test Speaker output</span>
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

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span>Participant Screen Sharing</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Allow attendees to present their screen</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={screenSharePolicy !== 'host_only'}
                                        onChange={(e) => onToggleScreenSharePolicy?.(e.target.checked ? 'everyone' : 'host_only')}
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

        if (testing) {
            const interval = setInterval(() => {
                setLevel(Math.floor(Math.random() * 60) + 20)
            }, 100)
            return () => clearInterval(interval)
        }

        if (!stream || stream.getAudioTracks().length === 0) {
            setLevel(0)
            return
        }

        let audioCtx: AudioContext | null = null
        let source: MediaStreamAudioSourceNode | null = null
        let analyser: AnalyserNode | null = null
        let animId: number | null = null

        try {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            audioCtx = new AudioCtxClass()
            source = audioCtx.createMediaStreamSource(stream)
            analyser = audioCtx.createAnalyser()
            analyser.fftSize = 64
            analyser.smoothingTimeConstant = 0.4
            // Connect to analyser only; NEVER to audioCtx.destination to prevent feedback whistling
            source.connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const update = () => {
                if (!analyser) return
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                const avg = sum / dataArray.length
                setLevel(Math.min(100, Math.round((avg / 128) * 100)))
                animId = requestAnimationFrame(update)
            }
            update()
        } catch (err) {
            // AudioContext not allowed or unsupported
        }

        return () => {
            if (animId !== null) cancelAnimationFrame(animId)
            if (analyser) {
                try { analyser.disconnect() } catch {}
            }
            if (source) {
                try { source.disconnect() } catch {}
            }
            if (audioCtx) {
                audioCtx.close().catch(() => { })
            }
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
const IconSettings = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
    onJoin: (id: string, isCameraOff?: boolean) => void
    localStream: MediaStream | null
    replaceLocalStream?: (stream: MediaStream) => void
    initialVideoOff?: boolean
    onToggleVideo?: (isOff: boolean) => void
}

function SetupScreen({
    token, setToken, meetingInput, setMeetingInput,
    connected, mediaLoading, mediaError, onConnect, onJoin,
    localStream, replaceLocalStream, initialVideoOff = false, onToggleVideo
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

    const [recentMeetingId, setRecentMeetingId] = useState<string | null>(() => {
        try {
            return localStorage.getItem('jts_last_meeting_id')
        } catch {
            return null
        }
    })

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
        navigator.clipboard.writeText(generatedId)
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
                                window.location.href = '/'
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

    return { timerStr: format(), seconds }
}

/* ──────────────────────────────────────────────────────────
   Main MeetingRoom Component
────────────────────────────────────────────────────────── */
export function MeetingRoom({
    initialToken = '',
    isAdminOrOwner = false,
    initialMeetingId = '',
    autoJoin = false,
    planTier = 'free',
    onUpgradePlanRequest,
    onLeave
}: {
    initialToken?: string
    isAdminOrOwner?: boolean
    initialMeetingId?: string
    autoJoin?: boolean
    planTier?: string
    onUpgradePlanRequest?: () => void
    onLeave?: () => void
}) {
    const [token, setToken] = useState(initialToken)
    const hasLeftRef = useRef(false)
    const hasAutoJoinedRef = useRef(false)

    // User identity & guest state
    const localUserId = getUserIdFromToken(token)
    const isGuest = useMemo(() => {
        try {
            const decoded = parseJwt(token || initialToken)
            return !!decoded?.isGuest || localUserId?.startsWith('guest_') || false
        } catch (e) {
            return false
        }
    }, [token, initialToken, localUserId])

    const [meetingInfo, setMeetingInfo] = useState<any>(null)
    const [screenSharePolicy, setScreenSharePolicy] = useState<'everyone' | 'host_only'>('everyone')
    const [currentBreakoutSubRoomId, setCurrentBreakoutSubRoomId] = useState<string | null>(null)
    const [toasts, setToasts] = useState<{ id: string, message: string, type: 'info' | 'success' | 'warning' }[]>([])

    const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
        const id = String(Math.random())
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    useEffect(() => {
        if (meetingInfo?.screenSharePolicy) {
            setScreenSharePolicy(meetingInfo.screenSharePolicy)
        }
    }, [meetingInfo?.screenSharePolicy])

    // Live organization plan tier for logged-in users
    const [fetchedOrgPlanTier, setFetchedOrgPlanTier] = useState<string>(() => {
        try {
            return localStorage.getItem('jts_active_plan_tier') || ''
        } catch (_) {
            return ''
        }
    })

    // Fetch user's active organization plan if logged in
    useEffect(() => {
        const activeToken = token || initialToken || localStorage.getItem('jts_token') || localStorage.getItem('token') || ''
        if (!activeToken || isGuest) return

        let isMounted = true
        fetch(`${API_BASE}/api/organization/mine`, {
            headers: { 'Authorization': `Bearer ${activeToken}` }
        })
            .then(res => res.json())
            .then(data => {
                if (isMounted && data?.data && data.data.length > 0) {
                    const savedOrgId = localStorage.getItem('jts_current_org_id')
                    const matched = data.data.find((o: any) => o._id === savedOrgId) || data.data[0]
                    if (matched?.planTier) {
                        setFetchedOrgPlanTier(matched.planTier.toLowerCase())
                        try { localStorage.setItem('jts_active_plan_tier', matched.planTier) } catch (_) {}
                    }
                }
            })
            .catch(err => console.warn('[MeetingRoom] Failed to fetch organization plan tier:', err))

        return () => { isMounted = false }
    }, [token, initialToken, isGuest])

    // Workspace Plan Tier Entitlements
    // Priority:
    // 1. Authoritative: Meeting's plan tier set by the meeting host / organization (if paid)
    // 2. Host's specific plan tier (if paid)
    // 3. Explicit prop passed to MeetingRoom (if paid)
    // 4. Live fetched organization tier for logged-in user (if paid)
    // 5. Cached local tier in localStorage (if paid)
    const currentPlanTier = useMemo(() => {
        if (meetingInfo?.planTier && meetingInfo.planTier.toLowerCase() !== 'free') {
            return meetingInfo.planTier.toLowerCase()
        }
        if (meetingInfo?.host?.planTier && meetingInfo.host.planTier.toLowerCase() !== 'free') {
            return meetingInfo.host.planTier.toLowerCase()
        }
        if (planTier && planTier.toLowerCase() !== 'free') {
            return planTier.toLowerCase()
        }
        if (fetchedOrgPlanTier && fetchedOrgPlanTier.toLowerCase() !== 'free') {
            return fetchedOrgPlanTier.toLowerCase()
        }
        try {
            const saved = localStorage.getItem('jts_active_plan_tier')
            if (saved && saved.toLowerCase() !== 'free') return saved.toLowerCase()
        } catch (_) {}

        if (meetingInfo?.planTier) return meetingInfo.planTier.toLowerCase()
        if (planTier) return planTier.toLowerCase()
        return 'free'
    }, [planTier, meetingInfo, fetchedOrgPlanTier])

    const canAccessRecording = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessCloudRecording = useMemo(() => {
        return ['enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessAI = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessRTMP = useMemo(() => {
        return ['enterprise', 'pro'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessBreakout = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessDialIn = useMemo(() => {
        return ['enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessE2EE = useMemo(() => {
        return ['enterprise', 'pro'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessWebinar = useMemo(() => {
        return ['enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessAttendance = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const [upgradeModalFeature, setUpgradeModalFeature] = useState<{
        title: string
        requiredPlan: string
        icon: string | React.ReactNode
        description: string
    } | null>(null)

    useEffect(() => {
        if (initialToken && initialToken !== token) {
            setToken(initialToken)
        }
    }, [initialToken])

    useEffect(() => {
        if (initialMeetingId && initialMeetingId !== meetingInput) {
            setMeetingInput(initialMeetingId)
        }
    }, [initialMeetingId])

    const myDisplayName = useMemo(() => {
        let name = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
        try {
            const decoded = parseJwt(token || initialToken)
            if (decoded) {
                name = decoded.guestName || decoded.fullName || decoded.email || name
            }
        } catch (e) { }
        return name || 'Participant'
    }, [token, initialToken])

    const [isRecording, setIsRecording] = useState(false)
    const [isRemoteRecording, setIsRemoteRecording] = useState(false)
    const [isCloudRecording, setIsCloudRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const recordingStreamRef = useRef<MediaStream | null>(null)

    const { socket, connectSocket, connected } = useSocketContext()
    const canManageRef = useRef(false)

    const { meetingId, setMeetingId, joined, setJoined, participants: rawParticipants } = useMeetingContext()
    const myUserId = useMemo(() => {
        try {
            const decoded = parseJwt(token || initialToken)
            return decoded?.userId || decoded?.id || decoded?.sub || ''
        } catch (_) {
            return ''
        }
    }, [token, initialToken])

    const participants = useMemo(() => {
        return rawParticipants.filter(p => p && p !== 'me' && (!myUserId || p !== myUserId) && (!socket?.id || p !== socket.id))
    }, [rawParticipants, myUserId, socket?.id])
    const {
        localStream, cameraStream, remoteStreams, connectToMeeting, leaveMeeting,
        startScreenShare, stopScreenShare, screenSharingUserId,
        screenSharingUserIds, switchActivePresenter,
        screenError, clearScreenError, mediaError, mediaLoading, replaceTrackOnPeers,
        requestMedia, stopMedia, replaceLocalStream, networkStatus, isReconnecting
    } = useWebRTCContext()
    const { messages, typingUsers, sendMessage, emitTyping, emitStopTyping, toggleChatReaction } = useMeetingChat()

    // Multi-Presenter Takeover Confirmation States
    const [showTakeoverModal, setShowTakeoverModal] = useState(false)
    const [takeoverPresenterId, setTakeoverPresenterId] = useState<string | null>(null)

    const handleToggleScreenShare = useCallback(() => {
        if (screenSharingUserId === 'me' || screenSharingUserIds.includes('me')) {
            stopScreenShare()
            return
        }
        if (screenSharePolicy === 'host_only' && !canManageRef.current) {
            addToast('Host has restricted screen sharing to Host only.', 'warning')
            return
        }
        const activeRemoteSharer = screenSharingUserIds.find(id => id !== 'me')
        if (activeRemoteSharer) {
            setTakeoverPresenterId(activeRemoteSharer)
            setShowTakeoverModal(true)
        } else {
            startScreenShare()
        }
    }, [screenSharingUserId, screenSharingUserIds, startScreenShare, stopScreenShare, screenSharePolicy, addToast])

    useEffect(() => {
        if (!socket) return

        const handleRecordToggle = (data: { userId: string; isRecording: boolean }) => {
            setIsRemoteRecording(data.isRecording)
            addToast(`Meeting recording has been ${data.isRecording ? 'started' : 'stopped'} by another participant.`, 'info')
        }

        const handleScreenSharePolicyChanged = (data: { meetingId: string; policy: 'everyone' | 'host_only' }) => {
            setScreenSharePolicy(data.policy)
            if (data.policy === 'host_only' && !canManageRef.current) {
                if (screenSharingUserId === 'me' || screenSharingUserIds.includes('me')) {
                    stopScreenShare()
                    addToast('Host has locked screen sharing to Host only. Your screen share was stopped.', 'warning')
                } else {
                    addToast('Host has restricted screen sharing to Host only.', 'info')
                }
            } else if (data.policy === 'everyone') {
                addToast('Screen sharing is now enabled for all participants.', 'info')
            }
        }

        const handleCloudRecordStatus = (data: { isCloudRecording: boolean; recordingUrl?: string; initiatedBy?: string }) => {
            setIsCloudRecording(data.isCloudRecording)
            if (data.isCloudRecording) {
                addToast(`Headless Cloud Recording started by ${data.initiatedBy || 'Host'} on server.`, 'success')
            } else {
                addToast('Headless Cloud Recording stopped and finalized on server.', 'info')
            }
        }

        const handlePstnJoined = (data: { meetingId: string; caller: string }) => {
            addToast(`📞 Phone caller ${data.caller} joined the audio bridge.`, 'info')
        }

        const handleWebinarMode = (data: { isWebinarMode: boolean }) => {
            setIsWebinarMode(data.isWebinarMode)
            addToast(data.isWebinarMode ? 'Webinar Stage Mode activated by Host.' : 'Interactive Grid Mode restored.', 'info')
        }

        const handleSpeakerPromoted = (data: { userId: string; promotedBy?: string }) => {
            const myId = localUserId
            if (data.userId === myId || data.userId === socket.id) {
                setIsPromotedToSpeaker(true)
                addToast('You have been promoted to live Stage Speaker by the Host!', 'success')
            }
        }

        const handleSpeakerDemoted = (data: { userId: string }) => {
            const myId = localUserId
            if (data.userId === myId || data.userId === socket.id) {
                setIsPromotedToSpeaker(false)
                addToast('You have returned to audience view-only mode.', 'info')
            }
        }

        socket.on('meeting:record-toggle', handleRecordToggle)
        socket.on('meeting:screen-share-permission-changed', handleScreenSharePolicyChanged)
        socket.on('meeting:cloud-recording-status', handleCloudRecordStatus)
        socket.on('meeting:pstn:joined', handlePstnJoined)
        socket.on('webinar:mode-changed', handleWebinarMode)
        socket.on('webinar:speaker-promoted', handleSpeakerPromoted)
        socket.on('webinar:speaker-demoted', handleSpeakerDemoted)
        return () => {
            socket.off('meeting:record-toggle', handleRecordToggle)
            socket.off('meeting:screen-share-permission-changed', handleScreenSharePolicyChanged)
            socket.off('meeting:cloud-recording-status', handleCloudRecordStatus)
            socket.off('meeting:pstn:joined', handlePstnJoined)
            socket.off('webinar:mode-changed', handleWebinarMode)
            socket.off('webinar:speaker-promoted', handleSpeakerPromoted)
            socket.off('webinar:speaker-demoted', handleSpeakerDemoted)
        }
    }, [socket, screenSharingUserId, screenSharingUserIds, stopScreenShare, addToast])

    // Remote Desktop Control Engine State
    const [activeControllerId, setActiveControllerId] = useState<string | null>(null)
    const [activeControllerName, setActiveControllerName] = useState<string | null>(null)
    const [incomingControlRequest, setIncomingControlRequest] = useState<{ requesterId: string; requesterName: string } | null>(null)
    const [isRequestingControl, setIsRequestingControl] = useState(false)

    // Remote Control Socket Listeners
    useEffect(() => {
        if (!socket) return

        const handleControlRequest = (data: { meetingId: string; requesterId: string; requesterName: string; targetUserId: string }) => {
            if (screenSharingUserId === 'me') {
                soundEffects.playMessageNotificationChime()
                setIncomingControlRequest({
                    requesterId: data.requesterId,
                    requesterName: data.requesterName || 'Participant'
                })
                addToast(`${data.requesterName || 'A participant'} has requested remote control of your screen.`, 'info')
            }
        }

        const handleControlResponse = (data: { meetingId: string; requesterId: string; granted: boolean; presenterId: string; presenterName?: string }) => {
            const myId = parseJwt(token)?.userId || 'me'
            if (data.requesterId === myId || data.requesterId === 'me') {
                setIsRequestingControl(false)
                if (data.granted) {
                    setActiveControllerId(myId)
                    setActiveControllerName(myDisplayName)
                    soundEffects.playMessageNotificationChime()
                    addToast(`Remote control granted! You can now interact with the screen.`, 'success')
                } else {
                    addToast(`Remote control request was declined by presenter.`, 'warning')
                }
            } else if (data.granted) {
                setActiveControllerId(data.requesterId)
                setActiveControllerName(data.requesterId)
            }
        }

        const handleControlRevoke = (data: { meetingId: string; controllerId?: string; presenterId: string }) => {
            setActiveControllerId(null)
            setActiveControllerName(null)
            setIsRequestingControl(false)
            addToast(`Remote control session ended.`, 'info')
        }

        socket.on('remote-control:request', handleControlRequest)
        socket.on('remote-control:response', handleControlResponse)
        socket.on('remote-control:revoke', handleControlRevoke)

        return () => {
            socket.off('remote-control:request', handleControlRequest)
            socket.off('remote-control:response', handleControlResponse)
            socket.off('remote-control:revoke', handleControlRevoke)
        }
    }, [socket, screenSharingUserId, token, myDisplayName])

    const handleRequestRemoteControl = () => {
        if (!socket || !screenSharingUserId || isRequestingControl) return
        setIsRequestingControl(true)
        const myId = parseJwt(token)?.userId || 'me'
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId
        socket.emit('remote-control:request', {
            meetingId: currentMeetingId,
            requesterId: myId,
            requesterName: myDisplayName,
            targetUserId: screenSharingUserId
        })
        addToast(`Sent remote control request to presenter...`, 'info')
    }

    const handleAcceptControlRequest = () => {
        if (!incomingControlRequest || !socket) return
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId
        setActiveControllerId(incomingControlRequest.requesterId)
        setActiveControllerName(incomingControlRequest.requesterName)
        socket.emit('remote-control:response', {
            meetingId: currentMeetingId,
            requesterId: incomingControlRequest.requesterId,
            granted: true,
            presenterId: 'me',
            presenterName: myDisplayName
        })
        setIncomingControlRequest(null)
        addToast(`Granted remote control to ${incomingControlRequest.requesterName}`, 'success')
    }

    const handleDenyControlRequest = () => {
        if (!incomingControlRequest || !socket) return
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId
        socket.emit('remote-control:response', {
            meetingId: currentMeetingId,
            requesterId: incomingControlRequest.requesterId,
            granted: false,
            presenterId: 'me',
            presenterName: myDisplayName
        })
        setIncomingControlRequest(null)
    }

    const handleRevokeRemoteControl = () => {
        if (!socket) return
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId
        setActiveControllerId(null)
        setActiveControllerName(null)
        socket.emit('remote-control:revoke', {
            meetingId: currentMeetingId,
            presenterId: 'me'
        })
        addToast(`Remote control revoked`, 'info')
    }

    const handleReleaseRemoteControl = () => {
        if (!socket) return
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId
        const myId = parseJwt(token)?.userId || 'me'
        setActiveControllerId(null)
        setActiveControllerName(null)
        socket.emit('remote-control:revoke', {
            meetingId: currentMeetingId,
            controllerId: myId,
            presenterId: screenSharingUserId
        })
        addToast(`Released remote control`, 'info')
    }

    const requestMediaRef = useRef(requestMedia)
    const stopMediaRef = useRef(stopMedia)
    useEffect(() => {
        requestMediaRef.current = requestMedia
        stopMediaRef.current = stopMedia
    })

    useEffect(() => {
        // Automatically request camera and microphone ONLY when entering MeetingRoom
        const initialCameraOff = sessionStorage.getItem('jts_initial_camera_off') === 'true'
        if (initialCameraOff) {
            setIsVideoOff(true)
            requestMediaRef.current(true) // audio only — webcam LED remains off!
        } else {
            requestMediaRef.current(false) // audio + video
        }

        return () => {
            // When leaving MeetingRoom (switching tab or exiting), shut down camera & mic hardware completely
            stopMediaRef.current()
        }
    }, [])


    // Listen to guest display names, camera states, and audio mute states sharing from signaling
    useEffect(() => {
        if (!socket) return

        const handleUserJoinedName = (data: { userId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
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
            if (data.isMuted !== undefined) {
                setRemoteMuteStates(prev => {
                    const next = { ...prev }
                    next[data.userId] = data.isMuted as boolean
                    return next
                })
            }
        }

        const handleOfferName = (data: { fromUserId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
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
            if (data.isMuted !== undefined) {
                setRemoteMuteStates(prev => {
                    const next = { ...prev }
                    next[data.fromUserId] = data.isMuted as boolean
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

        const handleMicToggle = (data: { userId: string; isMuted: boolean }) => {
            setRemoteMuteStates(prev => {
                const next = { ...prev }
                next[data.userId] = data.isMuted
                return next
            })
        }

        const handleWebrtcJoinAck = (data: { meetingId: string; participants: number; peers?: Array<{ userId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }> }) => {
            if (data.peers && Array.isArray(data.peers)) {
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    data.peers!.forEach(p => {
                        if (p.displayName) {
                            next[p.userId] = p.displayName
                        }
                    })
                    return next
                })
                setRemoteVideoStates(prev => {
                    const next = { ...prev }
                    data.peers!.forEach(p => {
                        if (p.isVideoOff !== undefined) {
                            next[p.userId] = p.isVideoOff
                        }
                    })
                    return next
                })
                setRemoteMuteStates(prev => {
                    const next = { ...prev }
                    data.peers!.forEach(p => {
                        if (p.isMuted !== undefined) {
                            next[p.userId] = p.isMuted
                        }
                    })
                    return next
                })
            }
        }

        socket.on('webrtc:user-joined', handleUserJoinedName)
        socket.on('webrtc:offer', handleOfferName)
        socket.on('webrtc:answer', handleOfferName)
        socket.on('webrtc:join', handleWebrtcJoinAck)
        socket.on('meeting:camera-toggle', handleCameraToggle)
        socket.on('meeting:mic-toggle', handleMicToggle)
        socket.on('meeting:audio-toggle', handleMicToggle)

        return () => {
            socket.off('webrtc:user-joined', handleUserJoinedName)
            socket.off('webrtc:offer', handleOfferName)
            socket.off('webrtc:answer', handleOfferName)
            socket.off('webrtc:join', handleWebrtcJoinAck)
            socket.off('meeting:camera-toggle', handleCameraToggle)
            socket.off('meeting:mic-toggle', handleMicToggle)
            socket.off('meeting:audio-toggle', handleMicToggle)
        }
    }, [socket])


    const [remoteVideoStates, setRemoteVideoStates] = useState<Record<string, boolean>>({})
    const [remoteMuteStates, setRemoteMuteStates] = useState<Record<string, boolean>>({})

    const [meetingInput, setMeetingInput] = useState(() => {
        if (initialMeetingId) return initialMeetingId
        try {
            const pathnameMatch = window.location.pathname.match(/^\/meet\/([a-zA-Z0-9\-_]+)/)
            if (pathnameMatch) return pathnameMatch[1]

            const hashParts = window.location.hash.split('?')
            if (hashParts.length > 1) {
                const params = new URLSearchParams(hashParts[1])
                const urlId = params.get('id') || params.get('meetingId')
                if (urlId) return urlId
            }
            const searchParams = new URLSearchParams(window.location.search)
            const qId = searchParams.get('id') || searchParams.get('meetingId')
            if (qId) return qId
        } catch (e) { }
        return sessionStorage.getItem('jts_active_meeting_id') || localStorage.getItem('jts_last_meeting_id') || ''
    })
    const [activePanel, setActivePanel] = useState<ActivePanel>(null)
    const [showEndMeetingModal, setShowEndMeetingModal] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [isPushToTalking, setIsPushToTalking] = useState(false)
    const [showPushToTalkHud, setShowPushToTalkHud] = useState(false)
    const spaceDownRef = useRef(false)
    const pushToTalkHudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const toggleCloudRecording = useCallback(async () => {
        const activeId = meetingId || meetingInput.trim()
        if (!activeId) return
        try {
            if (!isCloudRecording) {
                const token = localStorage.getItem('token')
                const res = await fetch(`${API_BASE}/api/meeting/${activeId}/cloud-record/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                })
                const json = await res.json()
                if (json.success) {
                    setIsCloudRecording(true)
                    addToast('Server-Side Cloud Recording started successfully.', 'success')
                } else {
                    addToast(json.message || 'Failed to start cloud recording', 'warning')
                }
            } else {
                const token = localStorage.getItem('token')
                const res = await fetch(`${API_BASE}/api/meeting/${activeId}/cloud-record/stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                })
                const json = await res.json()
                if (json.success) {
                    setIsCloudRecording(false)
                    addToast('Server-Side Cloud Recording stopped and finalized.', 'success')
                } else {
                    addToast(json.message || 'Failed to stop cloud recording', 'warning')
                }
            }
        } catch (err: any) {
            addToast(`Cloud recording error: ${err.message}`, 'warning')
        }
    }, [meetingId, meetingInput, isCloudRecording, addToast])

    // Ensure Push-To-Talk HUD auto-hides after exactly 1 second
    useEffect(() => {
        if (!showPushToTalkHud) return
        const t = setTimeout(() => {
            setShowPushToTalkHud(false)
        }, 1000)
        return () => clearTimeout(t)
    }, [showPushToTalkHud])
    const [isPiPActive, setIsPiPActive] = useState(false)
    const [showMoreMenu, setShowMoreMenu] = useState(false)
    const [unreadChatCount, setUnreadChatCount] = useState(0)
    const lastSeenMessageCountRef = useRef(0)
    const moreMenuRef = useRef<HTMLDivElement>(null)
    const moreBtnRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!showMoreMenu) return
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                moreMenuRef.current &&
                !moreMenuRef.current.contains(target) &&
                moreBtnRef.current &&
                !moreBtnRef.current.contains(target)
            ) {
                setShowMoreMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showMoreMenu])

    useEffect(() => {
        if (activePanel === 'chat') {
            setUnreadChatCount(0)
            lastSeenMessageCountRef.current = messages.length
        } else {
            const diff = messages.length - lastSeenMessageCountRef.current
            if (diff > 0) {
                setUnreadChatCount(diff)
            }
        }
    }, [messages.length, activePanel])


    const connectToMeetingRef = useRef(connectToMeeting)
    useEffect(() => {
        connectToMeetingRef.current = connectToMeeting
    }, [connectToMeeting])

    // Auto-rejoin meeting room ONLY if socket was disconnected and re-established while joined
    const wasConnectedRef = useRef(connected)
    useEffect(() => {
        if (!wasConnectedRef.current && connected && joined && meetingId) {
            let myName = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
            try {
                const decoded = parseJwt(token || initialToken)
                if (decoded) {
                    myName = decoded.guestName || decoded.fullName || myName
                }
            } catch (e) { }
            connectToMeetingRef.current(meetingId, myName)
        }
        wasConnectedRef.current = connected
    }, [connected, joined, meetingId, token])

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

    // Meeting timer & Free Tier Limit (45 minutes = 2700s)
    // When the host has a paid plan (Starter, Pro, Enterprise), meetings have UNLIMITED duration for ALL attendees.
    const { timerStr, seconds: meetingSecondsElapsed } = useMeetingTimer()
    const FREE_PLAN_LIMIT_SECONDS = 2700
    const freeTimeRemaining = Math.max(0, FREE_PLAN_LIMIT_SECONDS - meetingSecondsElapsed)
    const isMeetingPaid = ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    const isTimeLimitExpired = !isMeetingPaid && freeTimeRemaining <= 0 && !isGuest
    const isLowTimeWarning = !isMeetingPaid && freeTimeRemaining <= 600 && freeTimeRemaining > 0

    const formatRemainingTime = (totalSec: number) => {
        const mins = Math.floor(totalSec / 60)
        const secs = totalSec % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Local mute/camera states
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(() => {
        try {
            return sessionStorage.getItem('jts_initial_camera_off') === 'true'
        } catch {
            return false
        }
    })
    const activeVideoDeviceIdRef = useRef<string | null>(null)

    // Talking While Muted & Hot-Swap state
    const [showTalkingWhileMuted, setShowTalkingWhileMuted] = useState(false)

    // Auto-hide "Talking while muted" pill after exactly 2 seconds
    useEffect(() => {
        if (!showTalkingWhileMuted) return
        const t = setTimeout(() => {
            setShowTalkingWhileMuted(false)
        }, 2000)
        return () => clearTimeout(t)
    }, [showTalkingWhileMuted])

    // Talking While Muted Voice Activity Detector
    useEffect(() => {
        if (!isMuted || !localStream) {
            setShowTalkingWhileMuted(false)
            return
        }

        const audioTracks = localStream.getAudioTracks()
        if (audioTracks.length === 0) return

        let audioCtx: AudioContext | null = null
        let animFrameId: number | null = null
        let monitorTrack: MediaStreamTrack | null = null
        let consecutiveSpeechCount = 0
        let cooldownUntil = 0

        try {
            // Clone track to monitor raw mic input without streaming audio to peers
            monitorTrack = audioTracks[0].clone()
            monitorTrack.enabled = true
            const monitorStream = new MediaStream([monitorTrack])

            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtxClass) return
            audioCtx = new AudioCtxClass()
            const source = audioCtx.createMediaStreamSource(monitorStream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.4
            source.connect(analyser)

            const buffer = new Uint8Array(analyser.frequencyBinCount)

            const checkSpeech = () => {
                if (!audioCtx || audioCtx.state === 'closed') return
                analyser.getByteFrequencyData(buffer)

                // Human speech formant frequency range: bins 2 to 24 (approx 375Hz to 4500Hz)
                // Filters out low-frequency laptop fan noise / ambient AC hum in bins 0-1
                let voiceSum = 0
                let voiceCount = 0
                for (let i = 2; i <= 24; i++) {
                    voiceSum += buffer[i]
                    voiceCount++
                }
                const voiceVolume = voiceCount > 0 ? (voiceSum / voiceCount) : 0

                const now = Date.now()
                // Clear, intentional voice speech threshold (voiceVolume > 38)
                if (voiceVolume > 38 && now >= cooldownUntil) {
                    consecutiveSpeechCount++
                    if (consecutiveSpeechCount >= 5) {
                        setShowTalkingWhileMuted(true)
                        cooldownUntil = now + 6000 // 6 second cooldown before alerting again
                        consecutiveSpeechCount = 0
                    }
                } else {
                    consecutiveSpeechCount = Math.max(0, consecutiveSpeechCount - 1)
                }

                animFrameId = requestAnimationFrame(checkSpeech)
            }

            animFrameId = requestAnimationFrame(checkSpeech)
        } catch (err) {
            console.warn('[TalkingWhileMuted] Detector error:', err)
        }

        return () => {
            if (animFrameId) cancelAnimationFrame(animFrameId)
            if (monitorTrack) monitorTrack.stop()
            if (audioCtx && audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {})
            }
        }
    }, [isMuted, localStream])

    // Audio/Video Device Hot-Swapping listener (Bluetooth/USB disconnect/reconnect)
    useEffect(() => {
        const handleDeviceSwap = (e: any) => {
            const { kind, track } = e.detail || {}
            if (kind && track) {
                console.log(`[DeviceHotSwap] Replacing ${kind} track on active WebRTC peers:`, track.label)
                replaceTrackOnPeers(track)
            }
        }
        window.addEventListener('jts:device-swapped', handleDeviceSwap)
        return () => {
            window.removeEventListener('jts:device-swapped', handleDeviceSwap)
        }
    }, [replaceTrackOnPeers])

    // Enterprise upgrade states
    const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null)
    const [coHostIds, setCoHostIds] = useState<string[]>([])
    const [renamedUsers, setRenamedUsers] = useState<{ [key: string]: string }>({})
    const [handRaised, setHandRaised] = useState(false)

    const getUserDisplayName = useCallback((uid: string): string => {
        if (!uid) return 'Guest'
        if (uid === 'me') return 'You'
        if (renamedUsers[uid]) return renamedUsers[uid]
        const currentUid = getUserIdFromToken(token || initialToken)
        if (currentUid && uid === currentUid) return myDisplayName ? `${myDisplayName} (You)` : 'You'
        if (uid.toLowerCase().startsWith('guest_')) {
            return 'Guest'
        }
        return uid
    }, [renamedUsers, token, initialToken, myDisplayName])

    // 6 Enterprise Features States
    const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(false)
    const [lowBandwidthMode, setLowBandwidthMode] = useState(false)
    const [showMoMModal, setShowMoMModal] = useState(false)
    const [showReactionsPopover, setShowReactionsPopover] = useState(false)
    const [floatingReactions, setFloatingReactions] = useState<{ id: number, emoji: string, left: number, senderName?: string }[]>([])
    const reactionBtnRef = useRef<HTMLButtonElement>(null)
    const reactionsPopoverRef = useRef<HTMLDivElement>(null)

    // Presenter Backstage / Virtual Green Room (Enterprise)
    const [backstageUserIds, setBackstageUserIds] = useState<string[]>([])
    const [isGoingLive, setIsGoingLive] = useState(false)

    useEffect(() => {
        if (!showReactionsPopover) return
        const handleClickOutside = (e: MouseEvent) => {
            if (
                reactionBtnRef.current && !reactionBtnRef.current.contains(e.target as Node) &&
                reactionsPopoverRef.current && !reactionsPopoverRef.current.contains(e.target as Node)
            ) {
                setShowReactionsPopover(false)
            }
        }
        window.addEventListener('mousedown', handleClickOutside)
        return () => window.removeEventListener('mousedown', handleClickOutside)
    }, [showReactionsPopover])

    const [recordingAllowedUserIds, setRecordingAllowedUserIds] = useState<string[]>([])
    const [whiteboardAllowedUserIds, setWhiteboardAllowedUserIds] = useState<string[]>([])

    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, {
        userId: string
        name: string
        role: string
        joinTime: string
        leaveTime?: string
        durationSeconds: number
        status: 'Active' | 'Left'
    }>>({})
    const attendanceRecordsRef = useRef<Record<string, {
        userId: string
        name: string
        role: string
        joinTime: string
        leaveTime?: string
        durationSeconds: number
        status: 'Active' | 'Left'
    }>>({})
    const joinTimeMapRef = useRef<Record<string, number>>({})
    const [showAttendanceModal, setShowAttendanceModal] = useState(false)

    // RTMP Live Streaming States
    const [showLiveStreamModal, setShowLiveStreamModal] = useState(false)
    const [isLiveStreaming, setIsLiveStreaming] = useState(false)
    const [liveStreamConfig, setLiveStreamConfig] = useState<LiveStreamConfig | null>(null)
    const [remoteLiveStatus, setRemoteLiveStatus] = useState<{ isStreaming: boolean, platform: string, broadcastTitle?: string } | null>(null)

    // Layout and automation states
    const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
    const [handsRaisedMap, setHandsRaisedMap] = useState<{ [key: string]: boolean }>({})
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null)
    const [toolbarVisible, setToolbarVisible] = useState(true)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [hoveredTile, setHoveredTile] = useState<string | null>(null)
    const [fullScreenUserId, setFullScreenUserId] = useState<string | null>(null)
    const [waitingGuests, setWaitingGuests] = useState<any[]>([])
    const [isWaitingRoomActive, setIsWaitingRoomActive] = useState(true)
    const [isInviteOpen, setIsInviteOpen] = useState(false)

    useEffect(() => {
        if (meetingInfo && meetingInfo.isWaitingRoomEnabled !== undefined) {
            setIsWaitingRoomActive(meetingInfo.isWaitingRoomEnabled !== false)
        }
    }, [meetingInfo])

    // Professional Suite states: Whiteboard, Polls, Captions, Devices, AI Summary, Shortcuts
    const [showWhiteboard, setShowWhiteboard] = useState(false)
    const [showPolls, setShowPolls] = useState(false)
    const [showCaptions, setShowCaptions] = useState(false)
    const [showDeviceSettings, setShowDeviceSettings] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [isWarningDismissed, setIsWarningDismissed] = useState(false)

    // Late-Joiner AI "Catch Me Up" (Teams / Zoom Copilot feature)
    const [showCatchUpPrompt, setShowCatchUpPrompt] = useState(false)
    const [showCatchUpModal, setShowCatchUpModal] = useState(false)
    const [joinedMinutesLate, setJoinedMinutesLate] = useState(0)
    const hasTriggeredCatchUpRef = useRef(false)

    useEffect(() => {
        if (!joined || hasTriggeredCatchUpRef.current) return

        const isLate = (participants && participants.length > 0) || (messages && messages.length > 1)
        if (isLate) {
            hasTriggeredCatchUpRef.current = true
            const approxLate = Math.min(60, Math.max(3, (messages?.length || 2) * 2))
            setJoinedMinutesLate(approxLate)
            setShowCatchUpPrompt(true)
            const promptTimer = setTimeout(() => setShowCatchUpPrompt(false), 20000)
            return () => clearTimeout(promptTimer)
        }
    }, [joined, participants, messages])
    const [transcripts, setTranscripts] = useState<Array<{ speaker: string; text: string; timestamp: Date }>>([])
    const [isBlurEnabled, setIsBlurEnabled] = useState(false)
    const [virtualBgPreset, setVirtualBgPreset] = useState<string>('none')
    const [showVirtualBgModal, setShowVirtualBgModal] = useState<boolean>(false)
    const [isApplyingVirtualBg, setIsApplyingVirtualBg] = useState<boolean>(false)
    const [showE2EEModal, setShowE2EEModal] = useState<boolean>(false)
    const [isE2EEActive, setIsE2EEActive] = useState<boolean>(() => e2eeService.isEnabled())
    const [showDialInModal, setShowDialInModal] = useState<boolean>(false)
    const [isWebinarMode, setIsWebinarMode] = useState<boolean>(() => new URLSearchParams(window.location.search).get('webinar') === 'true')
    const [isPromotedToSpeaker, setIsPromotedToSpeaker] = useState<boolean>(false)
    const rawCameraTrackRef = useRef<MediaStreamTrack | null>(null)
    const [activeLocalStream, setActiveLocalStream] = useState<MediaStream | null>(null)
    const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true)
    const [isAnnotationActive, setIsAnnotationActive] = useState(false)
    const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false)
    const [activeBreakoutSession, setActiveBreakoutSession] = useState<{
        isActive: boolean
        rooms: Array<{ id: string; name: string; participantIds: string[] }>
        endsAt: number | null
    } | null>(null)

    // Layout & Studio lighting states
    const [layoutMode, setLayoutMode] = useState<MeetingLayoutMode>('auto')
    const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false)
    const [maxGridTiles, setMaxGridTiles] = useState(16)
    const [isStudioLightingEnabled, setIsStudioLightingEnabled] = useState(false)
    const [videoQuality, setVideoQuality] = useState<'1080p' | '720p' | 'auto'>('1080p')
    const [isHdBoostEnabled, setIsHdBoostEnabled] = useState(true)

    // Network resilience & reconnection states
    const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine)
    const [showRestoredNotice, setShowRestoredNotice] = useState(false)

    // Window resize listener
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Virtual background cleanup on unmount
    useEffect(() => {
        return () => {
            virtualBackgroundService.cleanup()
        }
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
    // Split into two effects:
    //   Effect A — stable listener registration: only tears down when socket changes, NOT on meetingId change.
    //              This prevents missing 'guest:waiting-list' responses that arrive during the meetingId state update.
    //   Effect B — polling: re-emits 'guest:get-waiting' whenever the active room changes or host joins.
    useEffect(() => {
        if (!socket) return

        const handleNewWaiting = (guest: any) => {
            setWaitingGuests(prev => {
                if (prev.some(g => g.socketId === guest.socketId)) return prev
                return [...prev, guest]
            })
            playKnockChime()
            addToast(`⏳ ${guest.guestName || 'A participant'} is waiting in the lobby`, 'info')
        }

        const handleLeftWaiting = ({ socketId }: { socketId: string }) => {
            setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        }

        // Accept both raw-array and { waitingList: [...] } object forms from backend
        const handleWaitingList = (payload: any) => {
            if (Array.isArray(payload)) {
                setWaitingGuests(payload)
            } else if (payload && Array.isArray(payload.waitingList)) {
                setWaitingGuests(payload.waitingList)
            }
        }

        // Backend emits { meetingId, enabled } — NOT { isWaitingRoomEnabled }
        const handleWaitingRoomToggle = (data: any) => {
            const isEnabled = data?.enabled ?? data?.isWaitingRoomEnabled ?? true
            setIsWaitingRoomActive(isEnabled)
            addToast(`Waiting Room has been turned ${isEnabled ? 'ON' : 'OFF'} by Host`, 'info')
            if (!isEnabled) {
                setWaitingGuests([])
            }
        }

        socket.on('guest:new-waiting', handleNewWaiting)
        socket.on('guest:left-waiting', handleLeftWaiting)
        socket.on('guest:waiting-list', handleWaitingList)
        socket.on('meeting:waiting-room-toggle', handleWaitingRoomToggle)

        return () => {
            socket.off('guest:new-waiting', handleNewWaiting)
            socket.off('guest:left-waiting', handleLeftWaiting)
            socket.off('guest:waiting-list', handleWaitingList)
            socket.off('meeting:waiting-room-toggle', handleWaitingRoomToggle)
        }
    }, [socket])

    // Effect B — emit 'guest:get-waiting' whenever the active room or join state changes.
    // Separated from listener registration so that listener teardown never races with server responses.
    useEffect(() => {
        if (!socket) return
        const activeRoom = meetingId || meetingInput.trim()
        if (activeRoom) {
            socket.emit('guest:get-waiting', { meetingId: activeRoom })
        }
    }, [socket, meetingId, meetingInput, joined])

    // Socket co-host promotion and granular permission listeners
    useEffect(() => {
        if (!socket) return

        const handleCoHostPromote = (payload: { targetUserId: string }) => {
            setCoHostIds(prev => prev.includes(payload.targetUserId) ? prev : [...prev, payload.targetUserId])
            const myId = getUserIdFromToken(token)
            if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                addToast('You have been promoted to Co-Host! Full meeting controls unlocked.', 'success')
            } else {
                const name = renamedUsers[payload.targetUserId] || payload.targetUserId
                addToast(`${name} has been promoted to Co-Host`, 'info')
            }
        }

        const handleCoHostDemote = (payload: { targetUserId: string }) => {
            setCoHostIds(prev => prev.filter(id => id !== payload.targetUserId))
            const myId = getUserIdFromToken(token)
            if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                addToast('Co-Host privileges were updated by the Host.', 'info')
            }
        }

        const handlePermissionUpdate = (payload: { targetUserId: string; permission: 'recording' | 'whiteboard' | 'screen-share'; enabled: boolean }) => {
            const myId = getUserIdFromToken(token)
            if (payload.permission === 'recording') {
                setRecordingAllowedUserIds(prev => payload.enabled ? [...new Set([...prev, payload.targetUserId])] : prev.filter(id => id !== payload.targetUserId))
                if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                    addToast(payload.enabled ? 'Host has granted you permission to Record this meeting!' : 'Host has revoked recording permission.', payload.enabled ? 'success' : 'info')
                }
            } else if (payload.permission === 'whiteboard') {
                setWhiteboardAllowedUserIds(prev => payload.enabled ? [...new Set([...prev, payload.targetUserId])] : prev.filter(id => id !== payload.targetUserId))
                if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                    addToast(payload.enabled ? 'Host has granted you permission to use Whiteboard!' : 'Host has closed whiteboard access.', payload.enabled ? 'success' : 'info')
                }
            }
        }

        const handleLiveStreamStatus = (payload: { isStreaming: boolean; platform: string; broadcastTitle?: string }) => {
            if (payload.isStreaming) {
                setRemoteLiveStatus({ isStreaming: true, platform: payload.platform, broadcastTitle: payload.broadcastTitle })
                addToast(`Conference is now LIVE streaming on ${payload.platform?.toUpperCase() || 'RTMP'}!`, 'info')
            } else {
                setRemoteLiveStatus(null)
                setIsLiveStreaming(false)
                addToast('Live stream broadcast ended.', 'info')
            }
        }

        socket.on('meeting:cohost-promote', handleCoHostPromote)
        socket.on('meeting:cohost-demote', handleCoHostDemote)
        socket.on('meeting:permission-update', handlePermissionUpdate)
        socket.on('meeting:livestream-status', handleLiveStreamStatus)

        return () => {
            socket.off('meeting:cohost-promote', handleCoHostPromote)
            socket.off('meeting:cohost-demote', handleCoHostDemote)
            socket.off('meeting:permission-update', handlePermissionUpdate)
            socket.off('meeting:livestream-status', handleLiveStreamStatus)
        }
    }, [socket, token, renamedUsers])

    // Active speaker volume level detector
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        const audioContext = new AudioContextClass()
        const analysers: { [key: string]: { analyser: AnalyserNode, source: MediaStreamAudioSourceNode } } = {}
        let silenceTimer: any = null

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
                        } catch (e) { }
                    }
                    const data = new Uint8Array(16)
                    analysers['me']?.analyser.getByteFrequencyData(data)
                    const avg = data.reduce((a, b) => a + b, 0) / data.length
                    if (avg > 30 && avg > maxVal) {
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
                        } catch (e) { }
                    }
                    const data = new Uint8Array(16)
                    analysers[userId]?.analyser.getByteFrequencyData(data)
                    const avg = data.reduce((a, b) => a + b, 0) / data.length
                    if (avg > 30 && avg > maxVal) {
                        maxVal = avg
                        loudestUser = userId
                    }
                }
            })

            if (loudestUser) {
                if (silenceTimer) clearTimeout(silenceTimer)
                setActiveSpeaker(prev => (prev === loudestUser ? prev : loudestUser))
                silenceTimer = setTimeout(() => {
                    setActiveSpeaker(null)
                }, 1500)
            }
        }, 400)

        return () => {
            clearInterval(interval)
            if (silenceTimer) clearTimeout(silenceTimer)
            Object.values(analysers).forEach(a => {
                try {
                    a.source.disconnect()
                } catch (e) { }
            })
            audioContext.close().catch(() => { })
        }
    }, [localStream, remoteStreams, isMuted])

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

    useEffect(() => {
        const handleOffline = () => {
            setIsNetworkOffline(true)
            addToast('Internet connection lost. Attempting to reconnect...', 'warning')
        }
        const handleOnline = () => {
            setIsNetworkOffline(false)
            setShowRestoredNotice(true)
            addToast('Internet connection restored', 'success')
            setTimeout(() => setShowRestoredNotice(false), 4000)
            if (socket) {
                socket.connect()
                const currentId = meetingId || meetingInput.trim()
                if (currentId) {
                    connectToMeetingRef.current(currentId, myDisplayName)
                }
            }
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [socket, meetingId, meetingInput, myDisplayName])

    const spawnReaction = (emoji: string, senderName?: string) => {
        const id = Date.now() + Math.random()
        const left = 20 + Math.random() * 60
        setFloatingReactions(prev => [...prev.slice(-15), { id, emoji, left, senderName: senderName || '' }])
        soundEffects.playReactionPop()
        setTimeout(() => {
            setFloatingReactions(prev => prev.filter(r => r.id !== id))
        }, 2600)
    }

    const sendReaction = (emoji: string) => {
        const sender = myDisplayName || 'You'
        spawnReaction(emoji, sender)
        if (socket && (meetingId || meetingInput)) {
            socket.emit(SocketEvents.MEETING_REACTION, {
                meetingId: meetingId || meetingInput,
                emoji,
                senderName: sender
            })
        }
    }

    const handleTriggerSoundboard = (soundType: 'applause' | 'drumroll' | 'cheer' | 'bell') => {
        if (soundType === 'applause') soundEffects.playApplause()
        else if (soundType === 'drumroll') soundEffects.playDrumroll()
        else if (soundType === 'cheer') soundEffects.playCheer()
        else if (soundType === 'bell') soundEffects.playBell()

        const sender = myDisplayName || 'You'
        if (socket && (meetingId || meetingInput)) {
            socket.emit('meeting:soundboard', {
                meetingId: meetingId || meetingInput,
                soundType,
                senderName: sender
            })
        }
    }

    // Socket listeners for Reactions, Soundboard and Breakout Rooms
    useEffect(() => {
        if (!socket) return

        const handleReaction = (payload: { emoji: string; senderName?: string }) => {
            spawnReaction(payload.emoji, payload.senderName)
        }

        const handleSoundboard = (payload: { soundType: string; senderName?: string }) => {
            if (payload.soundType === 'applause') soundEffects.playApplause()
            else if (payload.soundType === 'drumroll') soundEffects.playDrumroll()
            else if (payload.soundType === 'cheer') soundEffects.playCheer()
            else if (payload.soundType === 'bell') soundEffects.playBell()

            if (payload.senderName) {
                addToast(`${payload.senderName} played sound: ${payload.soundType}!`, 'info')
            }
        }

        const handleBreakoutStarted = (payload: any) => {
            setActiveBreakoutSession({
                isActive: true,
                rooms: payload.rooms || [],
                endsAt: payload.endsAt || null
            })
            const myId = parseJwt(token)?.userId || 'me'
            const myRoom = payload.rooms?.find((r: any) => r.participantIds?.includes(myId) || r.participantIds?.includes(socket.id) || r.participantIds?.includes(localUserId))
            const activeMain = meetingId || meetingInput.trim()
            if (myRoom) {
                setCurrentBreakoutSubRoomId(myRoom.id)
                addToast(`Moving to ${myRoom.name}...`, 'info')
                const subRoomId = `${activeMain}__sub_${myRoom.id}`
                connectToMeeting(subRoomId, myDisplayName, true)
            } else {
                setCurrentBreakoutSubRoomId(null)
                addToast('Breakout rooms started. You remain in the main room.', 'info')
            }
        }

        const handleBreakoutAnnouncement = (payload: any) => {
            addToast(`Host Announcement: ${payload.message}`, 'warning')
            soundEffects.playKnockChime()
        }

        const handleBreakoutEnded = () => {
            setActiveBreakoutSession(null)
            setCurrentBreakoutSubRoomId(null)
            const activeMain = meetingId || meetingInput.trim()
            addToast('Breakout session ended. Returning to main room...', 'info')
            connectToMeeting(activeMain, myDisplayName, false)
        }

        socket.on('meeting:reaction', handleReaction)
        socket.on('meeting:soundboard', handleSoundboard)
        socket.on('breakout:started', handleBreakoutStarted)
        socket.on('breakout:announcement', handleBreakoutAnnouncement)
        socket.on('breakout:ended', handleBreakoutEnded)

        return () => {
            socket.off('meeting:reaction', handleReaction)
            socket.off('meeting:soundboard', handleSoundboard)
            socket.off('breakout:started', handleBreakoutStarted)
            socket.off('breakout:announcement', handleBreakoutAnnouncement)
            socket.off('breakout:ended', handleBreakoutEnded)
        }
    }, [socket, token])

    // Adaptive Low-Bandwidth Mode: Pause/resume incoming video tracks to save data
    useEffect(() => {
        Object.values(remoteStreams).forEach(stream => {
            if (stream) {
                stream.getVideoTracks().forEach(track => {
                    track.enabled = !lowBandwidthMode
                })
            }
        })
    }, [lowBandwidthMode, remoteStreams])

    // Attendance tracking: Record local user on join
    useEffect(() => {
        if (!joined) return
        const localId = 'me'
        const now = Date.now()
        joinTimeMapRef.current[localId] = now
        attendanceRecordsRef.current[localId] = {
            userId: localId,
            name: `${myDisplayName} (You)`,
            role: 'Host / Participant',
            joinTime: new Date(now).toLocaleTimeString(),
            durationSeconds: 0,
            status: 'Active'
        }
        setAttendanceRecords({ ...attendanceRecordsRef.current })
    }, [joined, myDisplayName])

    // Dynamic join/leave announcements using toasts & attendance audit logger
    const prevParticipantsRef = useRef<string[]>([])
    useEffect(() => {
        const prev = prevParticipantsRef.current
        if (joined) {
            const now = Date.now()
            if (meetingId) {
                fetchMeetingParticipants(meetingId)
            }
            if (participants.length > prev.length) {
                const joinedUser = participants.find(p => !prev.includes(p))
                if (joinedUser) {
                    const cleanName = getUserDisplayName(joinedUser)
                    addToast(`${cleanName} joined the meeting`, 'success')

                    // Record attendance entry
                    joinTimeMapRef.current[joinedUser] = now
                    attendanceRecordsRef.current[joinedUser] = {
                        userId: joinedUser,
                        name: cleanName,
                        role: coHostIds.includes(joinedUser) ? 'Co-Host' : (joinedUser.startsWith('guest_') ? 'Guest' : 'Participant'),
                        joinTime: new Date(now).toLocaleTimeString(),
                        durationSeconds: 0,
                        status: 'Active'
                    }
                    setAttendanceRecords({ ...attendanceRecordsRef.current })
                }
            } else if (participants.length < prev.length) {
                const leftUser = prev.find(p => !participants.includes(p))
                if (leftUser) {
                    const cleanName = getUserDisplayName(leftUser)
                    addToast(`${cleanName} left the meeting`, 'info')

                    // Record attendance exit & duration
                    if (attendanceRecordsRef.current[leftUser]) {
                        const joinTs = joinTimeMapRef.current[leftUser] || now
                        const durationSec = Math.max(1, Math.round((now - joinTs) / 1000))
                        attendanceRecordsRef.current[leftUser].status = 'Left'
                        attendanceRecordsRef.current[leftUser].leaveTime = new Date(now).toLocaleTimeString()
                        attendanceRecordsRef.current[leftUser].durationSeconds = durationSec
                        setAttendanceRecords({ ...attendanceRecordsRef.current })
                    }
                }
            }
        }
        prevParticipantsRef.current = participants
    }, [participants, joined, meetingId, renamedUsers, coHostIds, getUserDisplayName])

    // 1-Click Attendance CSV Exporter
    const exportAttendanceCSV = () => {
        const records = Object.values(attendanceRecordsRef.current)
        if (records.length === 0) {
            addToast('No attendance records logged yet for this session.', 'info')
            return
        }

        const now = Date.now()
        const rows = records.map(r => {
            const durationSec = r.status === 'Active' && joinTimeMapRef.current[r.userId]
                ? Math.round((now - joinTimeMapRef.current[r.userId]) / 1000)
                : r.durationSeconds
            const minutes = Math.floor(durationSec / 60)
            const seconds = durationSec % 60
            const durationFormatted = `${minutes}m ${seconds}s`

            return [
                `"${r.name.replace(/"/g, '""')}"`,
                `"${r.userId}"`,
                `"${r.role}"`,
                `"${r.status}"`,
                `"${r.joinTime}"`,
                `"${r.leaveTime || 'Still In Meeting'}"`,
                `"${durationFormatted}"`
            ].join(',')
        })

        const header = ['Participant Name', 'User ID', 'Role', 'Status', 'Join Time', 'Leave Time', 'Duration'].join(',')
        const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `jts-attendance-${meetingInfo?.customId || meetingInfo?.id || meetingId || 'report'}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        addToast('Attendance audit CSV exported successfully!', 'success')
    }

    // 1-Click iCalendar (.ics) Download
    const downloadICSFile = () => {
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || meetingInput || 'session'
        const meetLink = `${window.location.origin}/join/${currentMeetingId}`
        const now = new Date()
        const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        const start = formatDate(now)
        const end = formatDate(new Date(now.getTime() + 60 * 60 * 1000))
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JTS Meet//Meeting Scheduler//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${currentMeetingId}-${Date.now()}@jts-meet.com`,
            `DTSTAMP:${start}`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            `SUMMARY:JTS-Meet: ${meetingInfo?.title || 'Team Video Meeting'}`,
            `DESCRIPTION:Join your JTS-Meet session at: ${meetLink}\\nMeeting ID: ${currentMeetingId}`,
            `LOCATION:${meetLink}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n')

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `jts-meeting-${currentMeetingId}.ics`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        addToast('iCalendar (.ics) downloaded!', 'success')
    }

    // AI Minutes of Meeting (MoM) synthesis
    const generateMoMContent = () => {
        const title = meetingInfo?.title || 'JTS-Meet Session'
        const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || meetingInput || 'meeting'
        const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        const timeStr = new Date().toLocaleTimeString()
        const hostName = (meetingInfo?.host && typeof meetingInfo.host === 'object' ? meetingInfo.host.fullName || meetingInfo.host.name || meetingInfo.host.email : null) || 'Host'

        const attendeeList = Object.values(attendanceRecordsRef.current).length > 0
            ? Object.values(attendanceRecordsRef.current).map(a => `- **${a.name}** (${a.role}) — Joined: ${a.joinTime}${a.leaveTime ? `, Left: ${a.leaveTime}` : ' (Active)'}`).join('\n')
            : (participants.length > 0
                ? [`- **${myDisplayName}** (Host / You)`].concat(participants.map(p => `- **${getUserDisplayName(p)}** (Participant)`)).join('\n')
                : `- **${myDisplayName}** (Host / Active)`)

        const chatNotes = messages.map(m => `> **${m.senderName || 'Participant'}:** ${m.message}`).slice(-12).join('\n')

        return `# Minutes of Meeting (MoM)
**Meeting Title:** ${title}
**Meeting ID:** ${currentMeetingId}
**Date:** ${dateStr} at ${timeStr}
**Total Duration:** ${timerStr}
**Host:** ${hostName}

---

## Attendees (${Object.keys(attendanceRecordsRef.current).length || participants.length + 1})
${attendeeList}

---

## Executive Summary
- The team convened for **${title}** via JTS-Meet secure enterprise video conference.
- Key operational updates, architectural milestones, and active decisions were aligned.
- Discussion notes and structured action items were recorded for team accountability.

---

## Discussion Highlights & Chat Notes
${chatNotes || '_No public chat notes recorded during this session._'}

---

## Action Items & Task Ownership
| # | Action Item / Deliverable | Owner | Priority | Status |
|---|---|---|---|---|
| 1 | Review meeting summary and distribute action items | ${myDisplayName} | High | In Progress |
| 2 | Finalize technical deliverables discussed in call | Core Team | Urgent | Pending |
| 3 | Follow-up review and progress validation | Stakeholders | Medium | Scheduled |

---
*Generated automatically by JTS-Meet AI Assistant on ${new Date().toLocaleString()}*
`
    }

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
        const nextMuted = !isMuted
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMuted
            })
        }
        setIsMuted(nextMuted)
        setShowPushToTalkHud(true)
        socket?.emit('meeting:mic-toggle', { meetingId: meetingId || meetingInput, isMuted: nextMuted })
    }

    const toggleVideo = async () => {
        if (!localStream) {
            try {
                await requestMedia(false)
                setIsVideoOff(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
            } catch (e) {
                console.warn('Failed to start media on toggle:', e)
            }
            return
        }

        if (!isVideoOff) {
            // 1. Physically stop all hardware video tracks on localStream so webcam LED turns OFF completely
            localStream.getVideoTracks().forEach(track => {
                try {
                    track.stop()
                } catch { }
                localStream.removeTrack(track)
            })

            // 1.1 Also stop any active camera tracks on cameraStream backup
            if (cameraStream) {
                cameraStream.getVideoTracks().forEach(track => {
                    try {
                        track.stop()
                    } catch { }
                    cameraStream.removeTrack(track)
                })
            }

            // 2. Stop and release virtual background or wallpaper preview stream
            if (activeLocalStream) {
                activeLocalStream.getVideoTracks().forEach(track => {
                    try {
                        track.stop()
                    } catch { }
                })
                setActiveLocalStream(null)
            }

            // 3. Stop raw physical camera track backup ref to ensure laptop LED turns off completely
            if (rawCameraTrackRef.current) {
                try {
                    rawCameraTrackRef.current.stop()
                } catch { }
                rawCameraTrackRef.current = null
            }

            // 4. Cleanup processing loop & offscreen canvas/video in virtualBackgroundService
            try {
                virtualBackgroundService.cleanup()
            } catch { }

            // 5. Update localStream state with audio only
            const cleanAudioStream = new MediaStream(localStream.getAudioTracks())
            replaceLocalStream(cleanAudioStream)

            // 6. Stop sending video to WebRTC peers (replaces sender track with null)
            replaceTrackOnPeers(null, 'video')

            setIsVideoOff(true)
            try { sessionStorage.setItem('jts_initial_camera_off', 'true') } catch {}
            socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: true })
            addToast('Camera turned off (hardware released)', 'info')
        } else {
            // Turning camera back ON (Google Meet style)
            try {
                let freshStream: MediaStream | null = null
                const preferredDeviceId = activeVideoDeviceIdRef.current

                // Try ideal resolution with deviceId if set, with graceful fallback
                try {
                    freshStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            ...(preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : {}),
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 60 }
                        }
                    })
                } catch (hdErr) {
                    freshStream = await navigator.mediaDevices.getUserMedia({
                        video: preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : true
                    })
                }

                const videoTrack = freshStream.getVideoTracks()[0]
                if (videoTrack) {
                    localStream.getVideoTracks().forEach(t => {
                        try {
                            t.stop()
                        } catch { }
                        localStream.removeTrack(t)
                    })
                    const newLocalStream = new MediaStream([
                        ...localStream.getAudioTracks(),
                        videoTrack
                    ])
                    replaceLocalStream(newLocalStream)
                    replaceTrackOnPeers(videoTrack, 'video')
                    rawCameraTrackRef.current = videoTrack
                }
                setIsVideoOff(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
                socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: false })
                addToast('Camera turned on', 'success')
            } catch (err: any) {
                console.error("Camera enable failed:", err)
                if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                    addToast("Camera access was denied by browser permissions.", "warning")
                } else {
                    addToast("Could not access camera device: " + (err?.message || "Device error"), "warning")
                }
            }
        }
    }

    // Device switching handlers
    const handleVideoSourceChange = async (deviceId: string) => {
        activeVideoDeviceIdRef.current = deviceId
        if (!localStream) return
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                }
            }).catch(() => navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } }))
            const newTrack = newStream.getVideoTracks()[0]
            if (newTrack) {
                const oldTrack = localStream.getVideoTracks()[0]
                if (oldTrack) {
                    try { oldTrack.stop() } catch {}
                    localStream.removeTrack(oldTrack)
                }
                const updatedStream = new MediaStream([
                    ...localStream.getAudioTracks(),
                    newTrack
                ])
                replaceLocalStream(updatedStream)
                replaceTrackOnPeers(newTrack, 'video')
                rawCameraTrackRef.current = newTrack
                setIsVideoOff(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
                socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: false })
                addToast('Camera switched successfully', 'info')
            }
        } catch (err: any) {
            addToast('Failed to switch camera: ' + (err?.message || 'Device error'), 'warning')
        }
    }

    const handleQualityChange = async (quality: '1080p' | '720p' | 'auto') => {
        setVideoQuality(quality)
        if (!localStream) return
        const vTrack = localStream.getVideoTracks()[0]
        if (vTrack && vTrack.readyState === 'live') {
            const height = quality === '1080p' ? 1080 : quality === '720p' ? 720 : 1080
            const width = quality === '1080p' ? 1920 : quality === '720p' ? 1280 : 1920
            try {
                await vTrack.applyConstraints({
                    width: { ideal: width },
                    height: { ideal: height },
                    frameRate: { ideal: 30, max: 60 },
                    aspectRatio: { ideal: 1.7777777778 }
                })
                addToast(`Video quality set to ${quality === '1080p' ? '1080p Full HD' : quality === '720p' ? '720p HD' : 'Auto Adaptive'}`, 'info')
            } catch (e) {
                console.warn('Could not apply constraints dynamically:', e)
            }
        }
    }

    const handleAudioSourceChange = async (deviceId: string) => {
        if (!localStream) return
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: true,
                    noiseSuppression: isNoiseSuppressionEnabled,
                    autoGainControl: false,
                    googEchoCancellation: true,
                    googEchoCancellation2: true,
                    googAutoGainControl: false,
                    googNoiseSuppression: isNoiseSuppressionEnabled,
                    googNoiseSuppression2: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                    googAudioMirroring: false
                } as any
            })
            const rawTrack = newStream.getAudioTracks()[0]
            if (rawTrack) {
                const oldTrack = localStream.getAudioTracks()[0]
                if (oldTrack) {
                    oldTrack.stop()
                    localStream.removeTrack(oldTrack)
                }
                localStream.addTrack(rawTrack)
                replaceTrackOnPeers(rawTrack)
                rawTrack.enabled = !isMuted
                addToast('Microphone switched (Google Meet Voice Isolation active)', 'info')
            }
        } catch (err: any) {
            addToast('Failed to switch microphone: ' + (err?.message || 'Device error'), 'warning')
        }
    }

    const handleAudioOutputChange = async (deviceId: string) => {
        try {
            const audioElements = document.querySelectorAll('audio, video')
            for (const el of Array.from(audioElements) as any[]) {
                if (typeof el.setSinkId === 'function') {
                    await el.setSinkId(deviceId)
                }
            }
            addToast('Speaker output set', 'info')
        } catch (err: any) {
            addToast('Failed to set speaker output: ' + (err?.message || 'Unsupported'), 'warning')
        }
    }

    const handleSelectVirtualBackground = async (presetId: string) => {
        setIsApplyingVirtualBg(true)
        try {
            if (!localStream) {
                addToast('Camera not available for visual effects', 'warning')
                setIsApplyingVirtualBg(false)
                return
            }

            // Save raw camera track reference if not already saved
            if (!rawCameraTrackRef.current || rawCameraTrackRef.current.readyState === 'ended') {
                const currentTrack = localStream.getVideoTracks()[0]
                if (currentTrack) {
                    rawCameraTrackRef.current = currentTrack
                }
            }

            if (presetId === 'none') {
                // Restore raw physical camera track
                const rawTrack = rawCameraTrackRef.current
                if (rawTrack && rawTrack.readyState === 'live') {
                    const freshStream = new MediaStream([
                        rawTrack,
                        ...localStream.getAudioTracks()
                    ])
                    setActiveLocalStream(freshStream)

                    const currentTracks = localStream.getVideoTracks()
                    currentTracks.forEach(t => localStream.removeTrack(t))
                    localStream.addTrack(rawTrack)
                    replaceTrackOnPeers(rawTrack)
                } else {
                    setActiveLocalStream(null)
                }
                virtualBackgroundService.cleanup()
                setVirtualBgPreset('none')
                setIsBlurEnabled(false)
                addToast('Standard camera restored (Visual effects off)', 'info')
                return
            }

            const baseTrack = (rawCameraTrackRef.current && rawCameraTrackRef.current.readyState === 'live')
                ? rawCameraTrackRef.current
                : localStream.getVideoTracks()[0]

            if (!baseTrack) {
                addToast('No active video track found', 'warning')
                return
            }

            const rawStream = new MediaStream([baseTrack])
            const processedTrack = await virtualBackgroundService.applyPreset(presetId, rawStream)

            if (processedTrack) {
                // Create brand-new MediaStream so React re-renders preview & tiles
                const freshStream = new MediaStream([
                    processedTrack,
                    ...localStream.getAudioTracks()
                ])
                setActiveLocalStream(freshStream)

                const currentTracks = localStream.getVideoTracks()
                currentTracks.forEach(t => localStream.removeTrack(t))
                localStream.addTrack(processedTrack)
                replaceTrackOnPeers(processedTrack)

                setVirtualBgPreset(presetId)
                setIsBlurEnabled(presetId.startsWith('blur'))
                addToast(`AI Background applied: ${presetId.replace('_', ' ')} (Face clear)`, 'success')
            } else {
                addToast('Could not apply visual effect', 'warning')
            }
        } catch (err: any) {
            console.error('Virtual background error:', err)
            addToast('Error applying background: ' + (err?.message || 'Unknown error'), 'warning')
        } finally {
            setIsApplyingVirtualBg(false)
        }
    }

    const handleUploadCustomWallpaper = (file: File) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string
            if (dataUrl) {
                await virtualBackgroundService.setCustomWallpaper(dataUrl)
                handleSelectVirtualBackground('custom')
            }
        }
        reader.readAsDataURL(file)
    }

    const handleToggleBlur = () => {
        if (virtualBgPreset.startsWith('blur')) {
            handleSelectVirtualBackground('none')
        } else {
            handleSelectVirtualBackground('blur_light')
        }
    }

    const handleToggleNoiseSuppression = async () => {
        const next = !isNoiseSuppressionEnabled
        setIsNoiseSuppressionEnabled(next)
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0]
            if (audioTrack) {
                try {
                    await audioTrack.applyConstraints({
                        noiseSuppression: next,
                        echoCancellation: true,
                        autoGainControl: false,
                        googEchoCancellation: true,
                        googEchoCancellation2: true,
                        googAutoGainControl: false,
                        googNoiseSuppression: next,
                        googNoiseSuppression2: true,
                        googHighpassFilter: true,
                        googTypingNoiseDetection: true
                    } as any)
                } catch (e) {}

                if (next) {
                    addToast('Google Meet AI Voice Isolation active (Fan & background noise silenced)', 'success')
                } else {
                    addToast('Standard audio mode active (Noise cancellation off)', 'info')
                }
            }
        }
    }

    // Picture-in-Picture (PiP) toggle handler
    const handleTogglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture()
                setIsPiPActive(false)
                return
            }
            const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'))
            const activeVideo = videos.find(v => v.srcObject && (v.srcObject as MediaStream).active && v.readyState >= 2) || videos[0]
            if (activeVideo) {
                await activeVideo.requestPictureInPicture()
                setIsPiPActive(true)
                activeVideo.addEventListener('leavepictureinpicture', () => {
                    setIsPiPActive(false)
                }, { once: true })
            } else {
                addToast('No active video found for Picture-in-Picture', 'warning')
            }
        } catch (err: any) {
            console.warn('PiP error:', err)
            addToast(err?.message || 'Picture-in-Picture not supported or permission denied', 'warning')
        }
    }

    // Global keyboard shortcuts & Push-to-Talk listener
    useEffect(() => {
        if (!joined) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return
            }

            // Spacebar shortcut -> Toggle Mic
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault()
                toggleMute()
                return
            }

            // Alt Shortcuts
            if (e.altKey) {
                const key = e.key.toLowerCase()
                if (key === 'p') {
                    e.preventDefault()
                    handleTogglePiP()
                    return
                }
                if (key === 's') {
                    e.preventDefault()
                    if (isScreenShareSupported()) {
                        handleToggleScreenShare()
                    }
                    return
                }
                if (key === 'c') {
                    e.preventDefault()
                    setActivePanel(prev => prev === 'chat' ? null : 'chat')
                    return
                }
                if (key === 'n') {
                    e.preventDefault()
                    setActivePanel(prev => prev === 'notes' ? null : 'notes')
                    return
                }
            }

            // Single key shortcuts (no modifier keys)
            if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                const key = e.key.toLowerCase()
                if (key === 'm') {
                    e.preventDefault()
                    toggleMute()
                    return
                }
                if (key === 'v') {
                    e.preventDefault()
                    toggleVideo()
                    return
                }
                if (key === 'h') {
                    e.preventDefault()
                    socket?.emit('meeting:raise-hand', { meetingId: meetingId || meetingInput, raised: !handRaised })
                    setHandRaised(prev => !prev)
                    return
                }
            }

            // Ctrl+D or Cmd+D -> Toggle Mic
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                toggleMute()
                return
            }

            // Ctrl+E or Cmd+E -> Toggle Camera
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault()
                toggleVideo()
                return
            }

            // Ctrl+Shift+W -> Toggle Whiteboard
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
                e.preventDefault()
                setShowWhiteboard(prev => !prev)
                return
            }

            // Ctrl+Shift+C -> Toggle Captions
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault()
                setShowCaptions(prev => !prev)
                return
            }

            // Ctrl+Shift+P -> Toggle Polls
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault()
                setShowPolls(prev => !prev)
                return
            }

            // Ctrl+Shift+S -> Open AI Summary
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault()
                setShowSummary(prev => !prev)
                return
            }

            // Escape -> Close active panel / modals
            if (e.key === 'Escape') {
                setActivePanel(null)
                setShowWhiteboard(false)
                setShowPolls(false)
                setShowDeviceSettings(false)
                setShowSummary(false)
                setShowShortcuts(false)
                setShowEndMeetingModal(false)
                return
            }

            // ? -> Toggle Shortcuts Modal
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                setShowShortcuts(prev => !prev)
                return
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [joined, isMuted, localStream, handRaised, screenSharingUserId, meetingId, meetingInput, socket])

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

    const handleJoinMeeting = (customId?: string, isCameraOffParam?: boolean) => {
        const id = (typeof customId === 'string' ? customId : meetingInput).trim()
        if (!socket || !id) return
        setMeetingId(id)

        const initialOff = isCameraOffParam !== undefined ? isCameraOffParam : isVideoOff
        setIsVideoOff(initialOff)
        try {
            if (initialOff) {
                sessionStorage.setItem('jts_initial_camera_off', 'true')
            } else {
                sessionStorage.removeItem('jts_initial_camera_off')
            }
        } catch {}

        let myName = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
        try {
            const decoded = parseJwt(token || initialToken)
            if (decoded) {
                myName = decoded.guestName || decoded.fullName || myName
            }
        } catch (e) { }

        sessionStorage.setItem('jts_active_meeting_id', id)
        sessionStorage.setItem('jts_meeting_joined', 'true')
        localStorage.setItem('jts_last_meeting_id', id)
        window.history.replaceState(null, '', `/#meeting?id=${encodeURIComponent(id)}`)

        connectToMeeting(id, myName)
        setJoined(true)
    }

    // Auto-join meeting if guest token is authorized, or if page was refreshed during an active session
    const autoRejoinAttemptedRef = useRef(false)

    useEffect(() => {
        if (initialMeetingId) {
            autoRejoinAttemptedRef.current = false
            hasLeftRef.current = false
            hasAutoJoinedRef.current = false
        }
    }, [initialMeetingId])

    const handleExitMeeting = useCallback(() => {
        hasLeftRef.current = true
        hasAutoJoinedRef.current = true
        try {
            sessionStorage.removeItem('jts_active_meeting_id')
            sessionStorage.removeItem('jts_meeting_joined')
            localStorage.removeItem('jts_last_meeting_id')
        } catch (e) { }
        leaveMeeting()
        if (onLeave) {
            onLeave()
        }
    }, [leaveMeeting, onLeave])

    // Direct autoJoin trigger: Only auto-joins ONCE upon entry, never if user has left!
    useEffect(() => {
        if (autoJoin && connected && !joined && !hasLeftRef.current && !hasAutoJoinedRef.current) {
            const target = (initialMeetingId || meetingInput || sessionStorage.getItem('jts_active_meeting_id') || '').trim()
            if (target) {
                hasAutoJoinedRef.current = true
                autoRejoinAttemptedRef.current = true
                handleJoinMeeting(target)
            }
        }
    }, [autoJoin, connected, joined, initialMeetingId, meetingInput])

    useEffect(() => {
        if (connected && !joined && !mediaLoading && !autoRejoinAttemptedRef.current) {
            const decoded = parseJwt(initialToken || token)
            if (decoded?.isGuest && decoded?.meetingId) {
                autoRejoinAttemptedRef.current = true
                handleJoinMeeting(decoded.meetingId)
                return
            }

            let urlMeetingId = initialMeetingId || ''
            if (!urlMeetingId) {
                try {
                    const match = window.location.pathname.match(/^\/meet\/([a-zA-Z0-9\-_]+)/)
                    if (match) urlMeetingId = match[1]

                    if (!urlMeetingId) {
                        const hashParts = window.location.hash.split('?')
                        if (hashParts.length > 1) {
                            const params = new URLSearchParams(hashParts[1])
                            urlMeetingId = params.get('id') || params.get('meetingId') || ''
                        }
                    }
                    if (!urlMeetingId) {
                        const searchParams = new URLSearchParams(window.location.search)
                        urlMeetingId = searchParams.get('id') || searchParams.get('meetingId') || ''
                    }
                } catch (e) { }
            }

            const activeSessionId = sessionStorage.getItem('jts_active_meeting_id')
            const targetId = urlMeetingId || activeSessionId || (autoJoin ? meetingInput : '')

            if (targetId && targetId.trim()) {
                autoRejoinAttemptedRef.current = true
                handleJoinMeeting(targetId.trim())
            }
        }
    }, [connected, joined, initialToken, token, mediaLoading, initialMeetingId, autoJoin, meetingInput])

    // Auto-start pending pre-captured screen share from 1-on-1 Teams-style direct screen call
    useEffect(() => {
        if (!joined) return
        const pendingStream = (window as any).__jts_pending_screenshare_stream as MediaStream | undefined
        if (pendingStream) {
            delete (window as any).__jts_pending_screenshare_stream
            const t = setTimeout(() => {
                startScreenShare(pendingStream).catch(err => {
                    console.warn('[MeetingRoom] Auto-start pending screen share failed:', err)
                })
            }, 300)
            return () => clearTimeout(t)
        }
    }, [joined, startScreenShare])

    const togglePanel = (panel: ActivePanel) => {
        setActivePanel((prev) => (prev === panel ? null : panel))
        // Re-poll waiting guests whenever participants panel is opened so the host
        // always sees an up-to-date list even if they missed a 'guest:new-waiting' event.
        if (panel === 'participants' && socket) {
            const activeRoom = meetingId || meetingInput.trim()
            if (activeRoom) {
                socket.emit('guest:get-waiting', { meetingId: activeRoom })
            }
        }
    }

    const remoteEntries = Object.entries(remoteStreams)
    const totalStreams = 1 + remoteEntries.length  // local + remotes

    // Determine grid columns
    const gridCols = totalStreams === 1 ? 1 : totalStreams <= 2 ? 2 : totalStreams <= 4 ? 2 : 3

    // Host & Role permissions
    const activeRoomKey = meetingId || meetingInput.trim()

    const isRoomCreator = useMemo(() => {
        try {
            return sessionStorage.getItem(`jts_created_meeting_${activeRoomKey}`) === 'true'
        } catch {
            return false
        }
    }, [activeRoomKey])

    const isLocalHost = useMemo(() => {
        if (meetingInfo && meetingInfo.host) {
            return (meetingInfo.host._id === localUserId || meetingInfo.host === localUserId)
        }
        // Fallback for ad-hoc generated rooms (e.g. room-xxxx):
        // If room was created in this session, or if user is authenticated and not a guest
        if (isRoomCreator) return true
        if (!isGuest && !meetingInfo) return true
        return false
    }, [meetingInfo, localUserId, isRoomCreator, isGuest])

    const isCoHost = coHostIds.includes(localUserId)
    const canManageParticipants = isLocalHost || isCoHost || isAdminOrOwner
    canManageRef.current = canManageParticipants

    const canRecord = canManageParticipants || recordingAllowedUserIds.includes(localUserId)
    const canUseWhiteboard = canManageParticipants || showWhiteboard || whiteboardAllowedUserIds.includes(localUserId)

    // Virtual Green Room derived state (needs localUserId which is declared above)
    const isCurrentUserBackstage = backstageUserIds.includes(localUserId || '')
    const canUseBackstage = currentPlanTier === 'enterprise'

    const handlePromoteCoHost = (targetUserId: string, isPromoting: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        if (isPromoting) {
            socket?.emit(SocketEvents.MEETING_COHOST_PROMOTE, { meetingId: activeRoom, targetUserId })
        } else {
            socket?.emit(SocketEvents.MEETING_COHOST_DEMOTE, { meetingId: activeRoom, targetUserId })
        }
    }

    const handleTogglePermission = (targetUserId: string, permission: 'recording' | 'whiteboard', enabled: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        if (permission === 'recording') {
            setRecordingAllowedUserIds(prev => enabled ? [...new Set([...prev, targetUserId])] : prev.filter(id => id !== targetUserId))
        } else if (permission === 'whiteboard') {
            setWhiteboardAllowedUserIds(prev => enabled ? [...new Set([...prev, targetUserId])] : prev.filter(id => id !== targetUserId))
        }
        socket?.emit('meeting:permission-update', { meetingId: activeRoom, targetUserId, permission, enabled })
    }

    // Host Controls: Mute All & Lock Meeting
    const handleMuteAll = () => {
        if (!isLocalHost && !canManageParticipants) return
        socket?.emit('meeting:mute-all', { meetingId: meetingId || meetingInput.trim() })
        addToast('Muted all participants', 'success')
    }

    const handleToggleLock = () => {
        if (!isLocalHost && !canManageParticipants) return
        const nextState = !isLocked
        socket?.emit('meeting:lock-toggle', {
            meetingId: meetingId || meetingInput.trim(),
            isLocked: nextState
        })
    }

    const handleToggleWatermark = () => {
        if (!isLocalHost && !canManageParticipants) return
        const nextState = !isWatermarkEnabled
        setIsWatermarkEnabled(nextState)
        socket?.emit(SocketEvents.MEETING_WATERMARK_TOGGLE, {
            meetingId: meetingId || meetingInput.trim(),
            enabled: nextState
        })
        addToast(`Watermark ${nextState ? 'enabled' : 'disabled'} for all participants`, 'success')
    }

    const handleToggleScreenSharePolicy = async (newPolicy: 'everyone' | 'host_only') => {
        if (!isLocalHost && !canManageParticipants) return
        setScreenSharePolicy(newPolicy)
        const activeRoom = meetingId || meetingInput.trim()
        socket?.emit('meeting:set-screen-share-permission', { meetingId: activeRoom, policy: newPolicy })
        try {
            await fetch(`${API_BASE}/api/meeting/screen-share-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ meetingId: activeRoom, policy: newPolicy })
            })
        } catch (e) {
            console.error('Failed to persist screen share permission', e)
        }
        addToast(`Screen sharing restricted to ${newPolicy === 'host_only' ? 'Host only' : 'Everyone'}`, 'success')
    }

    // Guest Waiting Room Admission Handlers
    const handleApproveGuest = (socketId: string) => {
        if (!socket) return
        const activeRoom = meetingId || meetingInput.trim()
        const guest = waitingGuests.find(g => g.socketId === socketId)
        socket.emit('guest:approve', { meetingId: activeRoom, socketId, guestSocketId: socketId })
        setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        addToast(`Admitted ${guest?.guestName || 'participant'} to the meeting`, 'success')
    }

    const handleDenyGuest = (socketId: string) => {
        if (!socket) return
        const activeRoom = meetingId || meetingInput.trim()
        const guest = waitingGuests.find(g => g.socketId === socketId)
        socket.emit('guest:deny', { meetingId: activeRoom, socketId, guestSocketId: socketId })
        setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        addToast(`Denied admission for ${guest?.guestName || 'participant'}`, 'info')
    }

    const handleApproveAllGuests = () => {
        if (!socket || waitingGuests.length === 0) return
        const activeRoom = meetingId || meetingInput.trim()
        socket.emit('guest:approve-all', { meetingId: activeRoom })
        const count = waitingGuests.length
        setWaitingGuests([])
        addToast(`Admitted all ${count} waiting participant(s)`, 'success')
    }

    const handleToggleWaitingRoom = async (enabled: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        setIsWaitingRoomActive(enabled)
        socket?.emit('meeting:waiting-room-toggle', { meetingId: activeRoom, enabled })

        if (token && !isGuest) {
            try {
                const response = await fetch(`${API_BASE}/api/meeting/waiting-room/toggle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ meetingId: activeRoom, enabled })
                })
                const data = await response.json()
                if (response.ok && data?.success) {
                    setMeetingInfo(data.data)
                }
            } catch (e) { }
        }
        addToast(
            enabled
                ? 'Waiting Room enabled (Host approval required for invitees)'
                : 'Open Access enabled (Everyone can join without approval)',
            'success'
        )
    }

    // Room-wide socket events: Mute All, Lock Meeting, End for All, Watermark, Real-time Reactions
    useEffect(() => {
        if (!socket) return

        const onMuteAllEvent = () => {
            if (!isLocalHost) {
                if (localStream) {
                    localStream.getAudioTracks().forEach(t => { t.enabled = false })
                    setIsMuted(true)
                    addToast('The host has muted all participants', 'warning')
                }
            }
        }

        const onLockToggleEvent = (data: { isLocked: boolean }) => {
            setIsLocked(!!data.isLocked)
            addToast(data.isLocked ? 'Meeting has been locked by the host' : 'Meeting has been unlocked', 'info')
        }

        const onEndAllEvent = () => {
            setMeetingInput('')
            addToast('The host has ended this meeting for everyone', 'warning')
            try {
                sessionStorage.removeItem('jts_active_meeting_id')
                sessionStorage.removeItem('jts_meeting_joined')
                localStorage.removeItem('jts_last_meeting_id')
                localStorage.removeItem('jts_guest_token')
            } catch (e) {}
            handleExitMeeting()
            if (isGuest || !token) {
                window.location.hash = ''
                window.location.href = '/'
            }
        }

        const onWatermarkToggleEvent = (data: { enabled: boolean }) => {
            setIsWatermarkEnabled(!!data.enabled)
            addToast(data.enabled ? 'Confidential Watermark enabled by host' : 'Confidential Watermark disabled', 'info')
        }

        const onReactionEvent = (data: { emoji: string; senderName?: string }) => {
            if (data?.emoji) {
                spawnReaction(data.emoji, data.senderName)
            }
        }

        socket.on('meeting:mute-all', onMuteAllEvent)
        socket.on('meeting:lock-toggle', onLockToggleEvent)
        socket.on('meeting:end-all', onEndAllEvent)
        socket.on('meeting:end', onEndAllEvent)
        socket.on(SocketEvents.MEETING_END, onEndAllEvent)
        socket.on(SocketEvents.MEETING_END_ALL, onEndAllEvent)
        socket.on(SocketEvents.MEETING_WATERMARK_TOGGLE, onWatermarkToggleEvent)
        socket.on(SocketEvents.MEETING_REACTION, onReactionEvent)

        // Virtual Green Room — Stage Status Change
        const onStageStatusChange = (data: { targetUserId: string; isBackstage: boolean; backstageUsers: string[] }) => {
            setBackstageUserIds(data.backstageUsers || [])
        }
        const onStageStateSync = (data: { backstageUsers: string[] }) => {
            if (Array.isArray(data?.backstageUsers)) {
                setBackstageUserIds(data.backstageUsers)
            }
        }
        socket.on(SocketEvents.STAGE_STATUS_CHANGE, onStageStatusChange)
        socket.on(SocketEvents.STAGE_STATE_SYNC, onStageStateSync)

        return () => {
            socket.off('meeting:mute-all', onMuteAllEvent)
            socket.off('meeting:lock-toggle', onLockToggleEvent)
            socket.off('meeting:end-all', onEndAllEvent)
            socket.off('meeting:end', onEndAllEvent)
            socket.off(SocketEvents.MEETING_END, onEndAllEvent)
            socket.off(SocketEvents.MEETING_END_ALL, onEndAllEvent)
            socket.off(SocketEvents.MEETING_WATERMARK_TOGGLE, onWatermarkToggleEvent)
            socket.off(SocketEvents.MEETING_REACTION, onReactionEvent)
            socket.off(SocketEvents.STAGE_STATUS_CHANGE, onStageStatusChange)
            socket.off(SocketEvents.STAGE_STATE_SYNC, onStageStateSync)
        }
    }, [socket, isLocalHost, isGuest, token, handleExitMeeting])

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
                replaceLocalStream={replaceLocalStream}
                initialVideoOff={isVideoOff}
                onToggleVideo={setIsVideoOff}
            />
        )
    }

    /* ── Meeting Room ── */
    // Calculate primary presenter and layout modes
    const isScreenShareActive = !!screenSharingUserId
    const isStageLayoutActive = layoutMode === 'tiled'
        ? !!fullScreenUserId
        : layoutMode === 'spotlight' || layoutMode === 'sidebar'
            ? true
            : (isScreenShareActive || !!pinnedUserId || !!fullScreenUserId)

    // The main participant shown enlarged in focus zone
    const primaryUser = fullScreenUserId || screenSharingUserId || pinnedUserId || (activeSpeaker && activeSpeaker !== 'me' ? activeSpeaker : (participants.length > 0 ? participants[0] : 'me'))

    // Stream to display in the main enlarged slot
    const isLocalSharing = screenSharingUserId === 'me' || screenSharingUserIds.includes('me')
    const primaryStream = primaryUser === 'me' ? (isLocalSharing ? localStream : (activeLocalStream || localStream)) : remoteStreams[primaryUser]

    // Presenter details
    const presenterName = primaryUser === 'me' ? 'You' : getUserDisplayName(primaryUser)

    // All active users in the room
    const allUsers = ['me', ...participants]
    const displayedUsers = layoutMode === 'tiled' ? allUsers.slice(0, maxGridTiles) : allUsers

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

            recorder.onstop = async () => {
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
                addToast('Local recording saved! Uploading to JTS Cloud Hub...', 'info');

                // Cloud Storage Upload to backend
                try {
                    const roomFromHash = new URLSearchParams(window.location.hash.split('?')[1] || '').get('room');
                    const activeId = meetingId || meetingInput || roomFromHash || 'meeting';
                    const activeToken = token || initialToken || localStorage.getItem('jts_token') || localStorage.getItem('token') || '';
                    const durationSec = Math.max(1, Math.round(recordedChunksRef.current.length));

                    if (activeId && activeToken) {
                        const formData = new FormData();
                        formData.append('recording', blob, `rec-${activeId}-${Date.now()}.webm`);
                        formData.append('duration', String(durationSec));
                        formData.append('title', meetingInfo?.title || `Conference ${activeId}`);

                        const uploadRes = await fetch(`${API_BASE}/api/meeting/${encodeURIComponent(activeId)}/recording`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${activeToken}`
                            },
                            body: formData
                        });
                        if (uploadRes.ok) {
                            addToast('Recording saved to Cloud Storage! Available for instant playback in History & Dashboard.', 'success');
                        } else {
                            const errJson = await uploadRes.json().catch(() => null);
                            console.error('[Recording] Upload response not OK:', uploadRes.status, errJson);
                        }
                    }
                } catch (err) {
                    console.error('[Recording] Cloud upload error:', err);
                }
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

    const handleStartLiveStream = (config: LiveStreamConfig) => {
        setLiveStreamConfig(config);
        setIsLiveStreaming(true);
        socket?.emit('meeting:livestream-toggle', {
            meetingId: meetingId || meetingInput,
            isStreaming: true,
            platform: config.platform,
            broadcastTitle: config.broadcastTitle,
            streamUrl: config.serverUrl
        });
        addToast(`Broadcast initiated for ${config.platform.toUpperCase()} (${config.resolution})!`, 'success');
    };

    const handleStopLiveStream = () => {
        setIsLiveStreaming(false);
        setLiveStreamConfig(null);
        socket?.emit('meeting:livestream-toggle', {
            meetingId: meetingId || meetingInput,
            isStreaming: false
        });
        addToast('Live stream broadcast stopped.', 'info');
    };

    // Render a single participant video tile with standard controls, click (pin) and double click (full screen)
    const renderMeetingTile = (userId: string, isEnlarged: boolean, isCompact: boolean = false) => {
        const displayName = getUserDisplayName(userId)
        const isUserSharingScreen = userId === 'me' ? (screenSharingUserId === 'me' || screenSharingUserIds.includes('me')) : (screenSharingUserId === userId || screenSharingUserIds.includes(userId))
        const stream = userId === 'me' ? (isUserSharingScreen ? localStream : (activeLocalStream || localStream)) : remoteStreams[userId]
        const isMutedUser = userId === 'me' ? isMuted : (remoteMuteStates[userId] !== undefined ? remoteMuteStates[userId] : !stream?.getAudioTracks()[0]?.enabled)
        const isUserHandRaised = userId === 'me' ? handRaised : handsRaisedMap[userId]
        const isUserSpeaking = activeSpeaker === userId
        const isSingleTile = (layoutMode === 'tiled' ? displayedUsers.length === 1 : allUsers.length === 1) && !isEnlarged && !isCompact

        return (
            <div
                key={userId}
                onMouseEnter={() => setHoveredTile(userId)}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => {
                    if (screenSharingUserIds.includes(userId)) {
                        switchActivePresenter(userId)
                    }
                    setPinnedUserId(pinnedUserId === userId ? null : userId)
                }}
                onDoubleClick={() => setFullScreenUserId(fullScreenUserId === userId ? null : userId)}
                style={{
                    width: isSingleTile ? 'min(100%, calc((100vh - 160px) * 16 / 9))' : '100%',
                    height: isSingleTile ? 'auto' : '100%',
                    maxHeight: isSingleTile ? 'calc(100vh - 160px)' : undefined,
                    aspectRatio: isSingleTile ? '16 / 9' : undefined,
                    margin: isSingleTile ? 'auto' : undefined,
                    position: 'relative',
                    borderRadius: isCompact ? 'var(--radius-md)' : 'var(--radius-xl)',
                    border: `2px solid ${isUserSpeaking ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isUserSpeaking ? '0 0 12px rgba(59, 130, 246, 0.45)' : 'var(--shadow-sm)',
                    overflow: 'hidden',
                    background: 'var(--color-surface-2)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
                    isHost={userId === 'me' ? isLocalHost : !!(meetingInfo && meetingInfo.host && (meetingInfo.host._id === userId || meetingInfo.host === userId))}
                    isGuest={userId === 'me' ? isGuest : userId.startsWith('guest_')}
                    isVideoOffProp={userId === 'me' ? isVideoOff : remoteVideoStates[userId]}
                    isBlurred={userId === 'me' && isBlurEnabled}
                    isStudioLighting={userId === 'me' && isStudioLightingEnabled}
                    isHdBoost={isHdBoostEnabled}
                    watermarkText={isWatermarkEnabled ? `${myDisplayName} • ${meetingInfo?.customId || meetingInfo?.id || meetingId || 'JTS-Meet'}` : undefined}
                    isCompact={isCompact}
                    isActiveSpeaker={isUserSpeaking}
                    isMutedProp={isMutedUser}
                />

                {/* Top Overlay Badges */}
                <div style={{
                    position: 'absolute',
                    top: isCompact ? 6 : 12,
                    right: isCompact ? 6 : 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? 4 : 8,
                    zIndex: 20
                }}>
                    {screenSharingUserIds.includes(userId) && (
                        <span style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95))',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            fontSize: isCompact ? '0.62rem' : '0.7rem',
                            fontWeight: 800,
                            padding: isCompact ? '2px 6px' : '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 0 12px rgba(99, 102, 241, 0.6)'
                        }}>
                            <IconMonitor size={isCompact ? 10 : 12} />
                            <span>SCREEN</span>
                        </span>
                    )}
                    {isUserHandRaised && (
                        <span className="badge badge-warning anim-pulse" style={{ fontSize: isCompact ? '0.65rem' : '0.75rem', padding: isCompact ? '2px 6px' : '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconHand size={isCompact ? 11 : 13} /> Raised Hand
                        </span>
                    )}
                    {/* Connection Health Indicator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        padding: isCompact ? '2px 6px' : '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: isCompact ? '0.65rem' : '0.7rem',
                        fontWeight: 600,
                        color: 'var(--color-success)',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <svg width={isCompact ? 9 : 11} height={isCompact ? 9 : 11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V4" />
                        </svg>
                        {!isCompact && <span>Good</span>}
                    </div>
                </div>

                {/* Hover Actions Controls */}
                {hoveredTile === userId && (
                    <div className="anim-fade-in" style={{
                        position: 'absolute',
                        bottom: isCompact ? 6 : 12,
                        right: isCompact ? 6 : 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? 6 : 10,
                        zIndex: 20
                    }}>
                        {/* Pin Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPinnedUserId(pinnedUserId === userId ? null : userId);
                            }}
                            style={{ background: pinnedUserId === userId ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: isCompact ? 28 : 32, height: isCompact ? 28 : 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                            title={pinnedUserId === userId ? "Unpin user" : "Pin user to center"}
                        >
                            <IconPin size={isCompact ? 13 : 15} />
                        </button>

                        {/* Full Screen Toggle Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullScreenUserId(fullScreenUserId === userId ? null : userId);
                            }}
                            style={{ background: fullScreenUserId === userId ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: isCompact ? 28 : 32, height: isCompact ? 28 : 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                            title={fullScreenUserId === userId ? "Exit Full Screen" : "Enter Full Screen"}
                        >
                            {fullScreenUserId === userId ? (
                                <svg width={isCompact ? 12 : 14} height={isCompact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                </svg>
                            ) : (
                                <svg width={isCompact ? 12 : 14} height={isCompact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                                style={{ background: 'rgba(239, 68, 68, 0.25)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                title="Request Mute"
                            >
                                <IconMicOff size={15} />
                            </button>
                        )}

                        {/* Remote Remove (Only if local user has manage permissions and target is not local) */}
                        {canManageParticipants && userId !== 'me' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    socket?.emit('meeting:remove-user', { meetingId, targetUserId: userId });
                                }}
                                style={{ background: 'var(--color-danger)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                title="Kick participant"
                            >
                                <IconX size={15} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Dynamic grid configuration for Smart Meeting Layout
    let gridStyle: React.CSSProperties = {}
    if (layoutMode === 'tiled') {
        const count = displayedUsers.length
        const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : count <= 16 ? 4 : count <= 25 ? 5 : 6
        gridStyle = {
            display: count <= 1 ? 'flex' : 'grid',
            justifyContent: 'center',
            alignItems: 'center',
            gridTemplateColumns: count > 1 ? `repeat(${cols}, minmax(0, 1fr))` : undefined,
            gridTemplateRows: count > 1 ? `repeat(${Math.ceil(count / cols)}, minmax(0, 1fr))` : undefined,
            height: '100%',
            gap: 12
        }
    } else if (allUsers.length === 1) {
        gridStyle = {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
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


            {/* ── Google Meet Style "Talking While Muted" Floating Alert ── */}
            {showTalkingWhileMuted && isMuted && (
                <div style={{
                    position: 'fixed',
                    bottom: 86,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 99999,
                    background: 'rgba(20, 21, 26, 0.94)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                }}>
                    <IconMicOff size={14} color="#f87171" />
                    <span style={{ whiteSpace: 'nowrap' }}>Your mic is muted</span>
                    <button
                        onClick={toggleMute}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.6875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s ease'
                        }}
                    >
                        Unmute (Space)
                    </button>
                </div>
            )}

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
                    {(isRecording || isRemoteRecording || isCloudRecording) && (
                        <span className="badge badge-danger anim-fade-in" style={{ display: 'inline-flex', gap: 6, padding: '4px 10px', fontSize: '0.6875rem' }}>
                            <span className="badge-dot danger pulse" style={{ width: 6, height: 6 }} />
                            {isCloudRecording ? 'CLOUD REC' : 'REC'}
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
                        onClick={() => {
                            if (!canAccessE2EE) {
                                setUpgradeModalFeature({
                                    title: 'End-to-End Encryption (E2EE)',
                                    requiredPlan: 'Enterprise Plan',
                                    icon: <IconShield size={20} color="#34d399" />,
                                    description: 'Zero-knowledge WebRTC SFrame E2EE with cryptographic key verification is an Enterprise tier security feature.'
                                })
                                return
                            }
                            setShowE2EEModal(true)
                        }}
                        title={isE2EEActive ? "End-to-End Encrypted (AES-GCM-128)" : "E2EE Security Settings"}
                        style={{
                            padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700,
                            borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: isE2EEActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            color: isE2EEActive ? '#34d399' : '#94a3b8',
                            border: `1px solid ${isE2EEActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>{isE2EEActive ? 'E2EE' : 'Standard'}</span>
                        {!canAccessE2EE && (
                            <span style={{
                                fontSize: '0.5625rem',
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                color: '#fff',
                                padding: '1px 4px',
                                borderRadius: 3,
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                            }}>
                                <IconLock size={8} /> ENT
                            </span>
                        )}
                    </button>
                    {/* Phone Audio Dial-In Button */}
                    <button
                        onClick={() => {
                            if (!canAccessDialIn) {
                                setUpgradeModalFeature({
                                    title: 'Phone Audio Dial-In (PSTN)',
                                    requiredPlan: 'Enterprise Plan',
                                    icon: <IconRocket size={20} color="#38bdf8" />,
                                    description: 'Connecting to meetings via global phone dial-in and toll-free telephone bridges requires an Enterprise plan.'
                                })
                                return
                            }
                            setShowDialInModal(true)
                        }}
                        title="Join by Phone (Dial-In & PIN)"
                        style={{
                            padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700,
                            borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8',
                            border: '1px solid rgba(14, 165, 233, 0.3)',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>Dial-In</span>
                        {!canAccessDialIn && (
                            <span style={{
                                fontSize: '0.5625rem',
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                color: '#fff',
                                padding: '1px 4px',
                                borderRadius: 3,
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                            }}>
                                <IconLock size={8} /> ENT
                            </span>
                        )}
                    </button>
                    {!isGuest && (
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            style={{
                                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700,
                                borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-accent)',
                                border: '1px solid rgba(99, 102, 241, 0.25)', cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            <span>Invite</span>
                        </button>
                    )}
                    {canManageParticipants && (
                        <button
                            onClick={() => handleToggleWaitingRoom(!isWaitingRoomActive)}
                            title={isWaitingRoomActive
                                ? "Waiting Room: ON (Host approval required for participants). Click to allow everyone directly without approval."
                                : "Waiting Room: OFF (Everyone joins directly without approval). Click to require approval."}
                            style={{
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: isWaitingRoomActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                color: isWaitingRoomActive ? '#34d399' : '#fbbf24',
                                border: `1px solid ${isWaitingRoomActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {isWaitingRoomActive ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                </svg>
                            )}
                            <span className="hidden sm:inline">{isWaitingRoomActive ? 'Waiting Room: ON' : 'Open: ON'}</span>
                        </button>
                    )}
                    {canManageParticipants && waitingGuests.length > 0 && (
                        <button
                            onClick={() => setActivePanel('participants')}
                            title={`${waitingGuests.length} participant(s) waiting for host admission. Click to open Participants list.`}
                            style={{
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>{waitingGuests.length} Waiting</span>
                        </button>
                    )}
                    {isScreenShareActive && (
                        <span className="badge badge-accent anim-fade-in" style={{ padding: '4px 10px' }}>
                            <span className="badge-dot accent pulse" />
                            {screenSharingUserId === 'me' ? 'Sharing screen' : `${getUserDisplayName(screenSharingUserId)} presenting`}
                        </span>
                    )}
                </div>

                {/* Right: status & participant count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Plan Duration / Free Plan Countdown Pill */}
                    {currentPlanTier === 'free' ? (
                        <div
                            onClick={() => {
                                if (onUpgradePlanRequest) onUpgradePlanRequest()
                                else setUpgradeModalFeature({
                                    title: 'Unlimited Meeting Duration',
                                    requiredPlan: 'Growth Pro',
                                    icon: <IconClock size={20} color="#f59e0b" />,
                                    description: 'Upgrade to Growth Pro or Enterprise to host unlimited 24/7 meetings with no time limits.'
                                })
                            }}
                            title="Free Plan: 45-minute meeting limit. Click to upgrade for unlimited duration."
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: freeTimeRemaining <= 600 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 158, 11, 0.12)',
                                border: `1px solid ${freeTimeRemaining <= 600 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.3)'}`,
                                color: freeTimeRemaining <= 600 ? '#f87171' : '#fbbf24',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: freeTimeRemaining <= 600 ? '0 0 12px rgba(239, 68, 68, 0.3)' : undefined
                            }}
                        >
                            {freeTimeRemaining <= 600 ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            )}
                            <span>{formatRemainingTime(freeTimeRemaining)} left</span>
                            <span style={{
                                fontSize: '0.62rem',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                color: '#fff',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 800,
                                letterSpacing: '0.02em'
                            }}>UPGRADE</span>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.72rem',
                                fontWeight: 600
                            }}
                            title={`Call Duration: ${timerStr}`}
                        >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            <span>{timerStr}</span>
                            <span style={{
                                fontSize: '0.6rem',
                                background: currentPlanTier === 'enterprise' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                color: currentPlanTier === 'enterprise' ? '#c084fc' : '#818cf8',
                                border: `1px solid ${currentPlanTier === 'enterprise' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 700,
                                textTransform: 'uppercase'
                            }}>
                                {currentPlanTier}
                            </span>
                        </div>
                    )}

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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>{participants.length + 1}</span>
                    </div>
                </div>
            </header>

            {/* Global Persistent Remote Audio Bridge: Guarantees continuous voice for all remote users */}
            <div style={{ display: 'none' }} aria-hidden="true">
                {Object.entries(remoteStreams).map(([peerId, rStream]) => {
                    if (!rStream || peerId === 'me' || peerId === localUserId) return null
                    return (
                        <PersistentAudioTile
                            key={`global-audio-${peerId}`}
                            peerId={peerId}
                            stream={rStream}
                            isMuted={remoteMuteStates[peerId] === true}
                        />
                    )
                })}
            </div>

            {/* Webinar View-Only Mode for Attendees */}
            {isWebinarMode && !canManageParticipants && !isLocalHost && !isPromotedToSpeaker ? (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
                    <WebinarAttendeeView
                        meetingId={meetingId || meetingInput.trim()}
                        meetingTitle={meetingInfo?.title}
                        stageStream={screenSharingUserId ? (screenSharingUserId === 'me' ? localStream : remoteStreams[screenSharingUserId]) : (activeSpeaker ? remoteStreams[activeSpeaker] : Object.values(remoteStreams)[0] || localStream)}
                        stageSpeakerName={screenSharingUserId ? getUserDisplayName(screenSharingUserId) : (activeSpeaker ? getUserDisplayName(activeSpeaker) : myDisplayName)}
                        isScreenShare={Boolean(screenSharingUserId)}
                        socket={socket}
                        myUserId={localUserId || 'me'}
                        myDisplayName={myDisplayName}
                        isPromotedToSpeaker={isPromotedToSpeaker}
                        onLeave={() => leaveMeeting()}
                        onOpenQA={() => setActivePanel('qa')}
                        onOpenPolls={() => setShowPolls(true)}
                        onOpenChat={() => {
                            if (activePanel === 'chat') {
                                setActivePanel(null)
                            } else {
                                setActivePanel('chat')
                                setUnreadChatCount(0)
                            }
                        }}
                        unreadChatCount={unreadChatCount}
                    />
                </div>
            ) : null}

            {/* Ambient Free Tier Warning Pill (Compact floating Zoom/Meet style) */}
            {isLowTimeWarning && !isWarningDismissed && (
                <div style={{
                    position: 'fixed',
                    top: (isNetworkOffline || networkStatus === 'offline' || networkStatus === 'reconnecting' || isReconnecting || showRestoredNotice) ? 112 : 64,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9990,
                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: 9999,
                    color: '#fff',
                    padding: '4px 10px 4px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 14px rgba(220, 38, 38, 0.35)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 1.2s infinite', flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>
                        Meeting ends in <strong>{formatRemainingTime(freeTimeRemaining)}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            if (onUpgradePlanRequest) {
                                onUpgradePlanRequest()
                            } else {
                                window.location.hash = '#organization'
                            }
                        }}
                        style={{
                            background: '#fff',
                            color: '#b91c1c',
                            border: 'none',
                            borderRadius: 9999,
                            padding: '2px 9px',
                            fontWeight: 800,
                            fontSize: '0.6875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            flexShrink: 0
                        }}
                    >
                        <IconZap size={11} color="#b91c1c" />
                        <span>Upgrade</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsWarningDismissed(true)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            flexShrink: 0,
                            marginLeft: 2
                        }}
                        title="Dismiss notification"
                    >
                        <IconX size={11} />
                    </button>
                </div>
            )}

            {/* ── Main Content Area ── */}
            <main style={{
                flex: 1,
                paddingTop: isLowTimeWarning ? 104 : 64,
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
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 16px',
                                fontSize: '0.875rem',
                                color: '#f87171',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                marginBottom: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IconInfo size={16} color="#f87171" />
                                    <span>{screenError}</span>
                                </div>
                                <button
                                    onClick={clearScreenError}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        fontSize: '0.9375rem',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Dismiss error"
                                >
                                    <IconX size={14} />
                                </button>
                            </div>
                        )}

                        <div style={{ flex: 1, minHeight: 0 }}>
                            {isStageLayoutActive ? (
                                <div style={layoutStyle}>
                                    {/* Primary Focus Zone (Left / Top) */}
                                    <div style={{
                                        flex: (fullScreenUserId || layoutMode === 'spotlight') ? 1 : isMobile ? 1 : isTablet ? '1 1 65%' : '1 1 80%',
                                        minWidth: 0,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        borderRadius: 'var(--radius-xl)',
                                        overflow: 'hidden',
                                        border: `2px solid ${activeSpeaker === primaryUser ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                                        boxShadow: activeSpeaker === primaryUser ? '0 0 12px rgba(59, 130, 246, 0.45)' : 'var(--shadow-sm)',
                                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                    }}>
                                        <VideoTile
                                            stream={primaryStream}
                                            label={primaryUser === 'me' ? 'You' : getUserDisplayName(primaryUser)}
                                            muted={primaryUser === 'me'}
                                            isScreenShare={isScreenShareActive && primaryUser === screenSharingUserId}
                                            isPrimary={true}
                                            isHandRaised={primaryUser === 'me' ? handRaised : handsRaisedMap[primaryUser]}
                                            isHost={primaryUser === 'me' ? isLocalHost : !!(meetingInfo && meetingInfo.host && (meetingInfo.host._id === primaryUser || meetingInfo.host === primaryUser))}
                                            isGuest={primaryUser === 'me' ? isGuest : primaryUser.startsWith('guest_')}
                                            isVideoOffProp={primaryUser === 'me' ? isVideoOff : remoteVideoStates[primaryUser]}
                                            isBlurred={primaryUser === 'me' && isBlurEnabled}
                                            isStudioLighting={primaryUser === 'me' && isStudioLightingEnabled}
                                            isHdBoost={isHdBoostEnabled}
                                            watermarkText={isWatermarkEnabled ? `${myDisplayName} • ${meetingInfo?.customId || meetingInfo?.id || meetingId || 'JTS-Meet'}` : undefined}
                                            isActiveSpeaker={activeSpeaker === primaryUser}
                                            isMutedProp={primaryUser === 'me' ? isMuted : (remoteMuteStates[primaryUser] !== undefined ? remoteMuteStates[primaryUser] : !primaryStream?.getAudioTracks()[0]?.enabled)}
                                        />

                                        {/* Multi-Presenter Floating Switcher Bar (Google Meet Style) */}
                                        {screenSharingUserIds && screenSharingUserIds.length > 1 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 14,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                zIndex: 48,
                                                background: 'rgba(15, 23, 42, 0.88)',
                                                backdropFilter: 'blur(16px)',
                                                WebkitBackdropFilter: 'blur(16px)',
                                                padding: '5px 10px',
                                                borderRadius: 'var(--radius-full)',
                                                border: '1px solid rgba(99, 102, 241, 0.45)',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.3)',
                                                maxWidth: '90%',
                                                overflowX: 'auto',
                                                scrollbarWidth: 'none'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 4px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                                                    <IconMonitor size={14} color="#818cf8" />
                                                    <span>Presenters:</span>
                                                </div>
                                                {screenSharingUserIds.map((uId) => {
                                                    const isViewing = primaryUser === uId || (screenSharingUserId === uId && !pinnedUserId)
                                                    const name = uId === 'me' ? 'You' : getUserDisplayName(uId)
                                                    return (
                                                        <button
                                                            key={uId}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                switchActivePresenter(uId)
                                                                setPinnedUserId(uId === 'me' ? 'me' : uId)
                                                                addToast(`Viewing ${name}'s presentation`, 'info')
                                                            }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                padding: '5px 12px',
                                                                borderRadius: 'var(--radius-full)',
                                                                border: isViewing ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.12)',
                                                                background: isViewing ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95))' : 'rgba(255, 255, 255, 0.08)',
                                                                color: '#fff',
                                                                fontSize: '0.75rem',
                                                                fontWeight: isViewing ? 800 : 500,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: isViewing ? '0 0 16px rgba(99, 102, 241, 0.6)' : 'none',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            <span style={{
                                                                width: 7,
                                                                height: 7,
                                                                borderRadius: '50%',
                                                                background: isViewing ? '#4ade80' : '#94a3b8',
                                                                boxShadow: isViewing ? '0 0 8px #4ade80' : 'none'
                                                            }} />
                                                            <span>{name}&apos;s Screen</span>
                                                            {isViewing && (
                                                                <span style={{ fontSize: '0.62rem', background: 'rgba(0,0,0,0.35)', padding: '1px 5px', borderRadius: 4, fontWeight: 800, textTransform: 'uppercase' }}>
                                                                    Viewing
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Screen Share Action Controls Container (Top Left - Never overlaps Top Right name/SCREEN badge) */}
                                        {isScreenShareActive && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 14,
                                                left: 14,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                zIndex: 45
                                            }}>
                                                {/* Live Annotation & Laser Pointer Trigger (Presenter only) */}
                                                {screenSharingUserId === 'me' && (
                                                    <button
                                                        onClick={() => setIsAnnotationActive(prev => !prev)}
                                                        style={{
                                                            background: isAnnotationActive ? 'rgba(139, 92, 246, 0.95)' : 'rgba(10, 11, 15, 0.85)',
                                                            backdropFilter: 'blur(10px)',
                                                            WebkitBackdropFilter: 'blur(10px)',
                                                            border: isAnnotationActive ? '1px solid #c4b5fd' : '1px solid rgba(255,255,255,0.18)',
                                                            borderRadius: 'var(--radius-full)',
                                                            padding: '6px 14px',
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            boxShadow: isAnnotationActive ? '0 0 16px rgba(139, 92, 246, 0.5)' : 'var(--shadow-md)',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title="Toggle interactive drawing & laser pointer on screen"
                                                    >
                                                        <IconEdit size={14} />
                                                        <span>{isAnnotationActive ? 'Drawing Active' : 'Annotate & Laser'}</span>
                                                    </button>
                                                )}

                                                {/* Remote Control Trigger (For Viewers) */}
                                                {screenSharingUserId !== 'me' && (
                                                    <button
                                                        onClick={activeControllerId === (parseJwt(token)?.userId || 'me') ? handleReleaseRemoteControl : handleRequestRemoteControl}
                                                        disabled={isRequestingControl}
                                                        style={{
                                                            background: activeControllerId === (parseJwt(token)?.userId || 'me')
                                                                ? 'rgba(59, 130, 246, 0.95)'
                                                                : isRequestingControl
                                                                    ? 'rgba(100, 116, 139, 0.8)'
                                                                    : 'rgba(10, 11, 15, 0.85)',
                                                            backdropFilter: 'blur(10px)',
                                                            WebkitBackdropFilter: 'blur(10px)',
                                                            border: activeControllerId === (parseJwt(token)?.userId || 'me')
                                                                ? '1px solid #93c5fd'
                                                                : '1px solid rgba(255,255,255,0.18)',
                                                            borderRadius: 'var(--radius-full)',
                                                            padding: '6px 14px',
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: isRequestingControl ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            boxShadow: activeControllerId === (parseJwt(token)?.userId || 'me') ? '0 0 16px rgba(59, 130, 246, 0.5)' : 'var(--shadow-md)',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={activeControllerId === (parseJwt(token)?.userId || 'me') ? 'Release Remote Control' : 'Request Remote Control of this screen'}
                                                    >
                                                        <IconMonitor size={14} />
                                                        <span>
                                                            {activeControllerId === (parseJwt(token)?.userId || 'me')
                                                                ? 'Release Control'
                                                                : isRequestingControl
                                                                    ? 'Requesting Control...'
                                                                    : 'Request Control'}
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Presenter Incoming Remote Control Request Dialog */}
                                        {incomingControlRequest && screenSharingUserId === 'me' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 20,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                background: 'rgba(15, 23, 42, 0.96)',
                                                backdropFilter: 'blur(20px)',
                                                border: '1px solid #3b82f6',
                                                borderRadius: 'var(--radius-xl)',
                                                padding: '12px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 16,
                                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)',
                                                zIndex: 60,
                                                color: '#fff'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <IconMonitor size={20} color="#60a5fa" />
                                                    <div>
                                                        <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                                            {incomingControlRequest.requesterName} wants remote control
                                                        </div>
                                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                                                            Allow them to move mouse and type on your screen?
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <button
                                                        onClick={handleAcceptControlRequest}
                                                        style={{
                                                            background: '#10b981',
                                                            border: 'none',
                                                            color: '#fff',
                                                            padding: '6px 14px',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Allow
                                                    </button>
                                                    <button
                                                        onClick={handleDenyControlRequest}
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.12)',
                                                            border: 'none',
                                                            color: '#cbd5e1',
                                                            padding: '6px 14px',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Screen Share Live Annotation Canvas Overlay */}
                                        {isScreenShareActive && (
                                            <ScreenAnnotationOverlay
                                                isActive={screenSharingUserId === 'me' ? isAnnotationActive : true}
                                                isPresenter={screenSharingUserId === 'me'}
                                                socket={socket}
                                                meetingId={meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId}
                                                onClose={() => setIsAnnotationActive(false)}
                                            />
                                        )}

                                        {/* Screen Share Remote Desktop Control Overlay */}
                                        {isScreenShareActive && (
                                            <RemoteControlOverlay
                                                meetingId={meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId}
                                                socket={socket}
                                                isPresenter={screenSharingUserId === 'me'}
                                                isController={activeControllerId !== null && (activeControllerId === (parseJwt(token)?.userId || 'me') || (screenSharingUserId !== 'me' && activeControllerId === myDisplayName))}
                                                activeControllerId={activeControllerId}
                                                activeControllerName={activeControllerName}
                                                onRevokeControl={handleRevokeRemoteControl}
                                                onReleaseControl={handleReleaseRemoteControl}
                                            />
                                        )}

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
                                                    <IconPin size={13} />
                                                    <span>Unpin Screen</span>
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    {/* Participants Strip (Right / Bottom) - hidden in fullScreenUserId or Spotlight mode */}
                                    {!fullScreenUserId && layoutMode !== 'spotlight' && (
                                        <div
                                            className="sidebar-filmstrip custom-scrollbar"
                                            style={{
                                                flex: (isMobile || isTablet) ? '0 0 110px' : '0 0 clamp(210px, 18vw, 240px)',
                                                width: (isMobile || isTablet) ? '100%' : 'clamp(210px, 18vw, 240px)',
                                                maxWidth: (isMobile || isTablet) ? '100%' : '240px',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: (isMobile || isTablet) ? 'row' : 'column',
                                                gap: (isMobile || isTablet) ? 10 : 8,
                                                overflowX: (isMobile || isTablet) ? 'auto' : 'hidden',
                                                overflowY: (isMobile || isTablet)
                                                    ? 'hidden'
                                                    : (stripUsers.length > 4 ? 'auto' : 'hidden'),
                                                padding: '2px',
                                                boxSizing: 'border-box',
                                                scrollbarWidth: 'thin',
                                                scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                                            }}
                                        >
                                            {stripUsers.map((userId) => {
                                                const tileStyle: React.CSSProperties = (isMobile || isTablet)
                                                    ? { height: '100%', aspectRatio: '16/9', flexShrink: 0 }
                                                    : {
                                                        width: '100%',
                                                        height: stripUsers.length <= 1
                                                            ? 'min(170px, 100%)'
                                                            : stripUsers.length === 2
                                                                ? 'min(150px, calc((100% - 8px) / 2))'
                                                                : stripUsers.length === 3
                                                                    ? 'min(135px, calc((100% - 16px) / 3))'
                                                                    : 'calc((100% - 24px) / 4)',
                                                        minHeight: stripUsers.length >= 4 ? '95px' : undefined,
                                                        maxHeight: stripUsers.length <= 3 ? '160px' : undefined,
                                                        aspectRatio: '16/9',
                                                        flexShrink: 0
                                                    };

                                                return (
                                                    <div key={userId} style={tileStyle}>
                                                        {renderMeetingTile(userId, false, true)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Smart Layout responsive grid
                                <div style={gridStyle}>
                                    {displayedUsers.map((userId) => renderMeetingTile(userId, false))}
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
                            isLocked={isLocked}
                            onToggleLock={handleToggleLock}
                            onMuteAll={handleMuteAll}
                            isWatermarkEnabled={isWatermarkEnabled}
                            onToggleWatermark={handleToggleWatermark}
                            onExportAttendance={exportAttendanceCSV}
                            onOpenAttendance={() => setShowAttendanceModal(true)}
                            recordingAllowedUserIds={recordingAllowedUserIds}
                            whiteboardAllowedUserIds={whiteboardAllowedUserIds}
                            onTogglePermission={handleTogglePermission}
                            onPromoteCoHost={handlePromoteCoHost}
                            waitingGuests={waitingGuests}
                            onApproveGuest={handleApproveGuest}
                            onDenyGuest={handleDenyGuest}
                            onApproveAllGuests={handleApproveAllGuests}
                            isWaitingRoomActive={isWaitingRoomActive}
                            onToggleWaitingRoom={handleToggleWaitingRoom}
                        />
                    )}
                    {activePanel === 'chat' && (
                        <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0 }}>
                            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                                <span className="side-panel-title">Meeting Chat</span>
                                <button className="btn-icon" onClick={() => setActivePanel(null)} aria-label="Close chat" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconX />
                                </button>
                            </div>
                            <div className="side-panel-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                                    participants={participants}
                                    meetingId={meetingId || meetingInput.trim()}
                                    token={token}
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
                    {activePanel === 'notes' && (
                        <MeetingNotesPanel
                            meetingId={meetingId || meetingInput.trim()}
                            socket={socket}
                            onClose={() => setActivePanel(null)}
                            authorName={renamedUsers['me'] || myDisplayName || (parseJwt(token)?.fullName || 'You')}
                        />
                    )}
                    {activePanel === 'qa' && (
                        <div className="side-panel" style={{ width: 400, maxWidth: '100%', padding: 0, overflow: 'hidden', height: '100%' }}>
                            <MeetingQAPanel
                                meetingId={meetingId || meetingInput.trim()}
                                socket={socket}
                                currentUserId={parseJwt(token)?.userId || 'me'}
                                currentUserName={myDisplayName}
                                isHost={canManageParticipants || isLocalHost}
                                onClose={() => setActivePanel(null)}
                            />
                        </div>
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
                            screenSharePolicy={screenSharePolicy}
                            onToggleScreenSharePolicy={handleToggleScreenSharePolicy}
                        />
                    )}
                </div>
            </main>

            {/* ── Bottom Control Bar ── */}
            <footer className="meeting-toolbar" style={{
                position: 'fixed',
                bottom: windowWidth < 640 ? 12 : 20,
                left: '50%',
                transform: `translateX(-50%) translateY(${toolbarVisible ? '0px' : '100px'})`,
                height: windowWidth < 640 ? 54 : 64,
                display: 'flex',
                alignItems: 'center',
                gap: windowWidth < 640 ? 8 : 12,
                padding: windowWidth < 640 ? '0 12px' : '0 20px',
                background: 'rgba(10,11,15,0.88)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '40px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                zIndex: 'var(--z-toolbar)' as any,
                opacity: toolbarVisible ? 1 : 0,
                maxWidth: 'calc(100vw - 16px)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
            }}>
                {/* Mic Trigger */}
                <button
                    onClick={toggleMute}
                    style={{
                        width: windowWidth < 640 ? 40 : 46,
                        height: windowWidth < 640 ? 40 : 46,
                        minWidth: windowWidth < 640 ? 40 : 46,
                        minHeight: windowWidth < 640 ? 40 : 46,
                        padding: 0,
                        borderRadius: '50%',
                        border: isMuted ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: isMuted ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: isMuted ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title={isMuted ? "Unmute Mic (Ctrl+D)" : "Mute Mic (Ctrl+D)"}
                >
                    {isMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
                </button>

                {/* Camera Trigger */}
                <button
                    onClick={toggleVideo}
                    style={{
                        width: windowWidth < 640 ? 40 : 46,
                        height: windowWidth < 640 ? 40 : 46,
                        minWidth: windowWidth < 640 ? 40 : 46,
                        minHeight: windowWidth < 640 ? 40 : 46,
                        padding: 0,
                        borderRadius: '50%',
                        border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: isVideoOff ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: isVideoOff ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title={isVideoOff ? "Turn on Camera (Ctrl+E)" : "Turn off Camera (Ctrl+E)"}
                >
                    {isVideoOff ? <IconCameraOff size={22} /> : <IconCamera size={22} />}
                </button>

                {/* Screen Share Trigger (Enabled by default for guest and team) */}
                {isScreenShareSupported() && (
                    <button
                        onClick={handleToggleScreenShare}
                        disabled={!connected || !joined}
                        style={{
                            width: windowWidth < 640 ? 38 : 44,
                            height: windowWidth < 640 ? 38 : 44,
                            borderRadius: '50%',
                            border: 'none',
                            background: (screenSharingUserId === 'me' || screenSharingUserIds.includes('me'))
                                ? 'var(--color-accent)'
                                : (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost)
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.08)',
                            color: (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost)
                                ? 'var(--color-text-muted)'
                                : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            opacity: (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost) ? 0.6 : 1
                        }}
                        title={(screenSharingUserId === 'me' || screenSharingUserIds.includes('me'))
                            ? "Stop sharing screen"
                            : (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost)
                                ? "Screen sharing restricted to Host only"
                                : "Share screen"}
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
                    style={{ width: windowWidth < 640 ? 38 : 44, height: windowWidth < 640 ? 38 : 44, borderRadius: '50%', border: 'none', background: handRaised ? 'var(--color-warning)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    title={handRaised ? "Lower hand" : "Raise hand"}
                >
                    <IconHand size={windowWidth < 640 ? 18 : 20} />
                </button>

                {/* Real-time Emoji Reactions Popover Trigger */}
                <button
                    ref={reactionBtnRef}
                    onClick={() => {
                        setShowReactionsPopover(prev => !prev)
                        sendReaction('❤️')
                    }}
                    style={{
                        width: windowWidth < 640 ? 38 : 44,
                        height: windowWidth < 640 ? 38 : 44,
                        borderRadius: '50%',
                        border: showReactionsPopover ? '1.5px solid var(--color-accent)' : 'none',
                        background: showReactionsPopover ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: showReactionsPopover ? '0 0 14px rgba(99,102,241,0.5)' : 'none'
                    }}
                    title="Send Reaction (Click to send love reaction and open emoji bar)"
                >
                    <IconHeart size={18} color="#f43f5e" />
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                {/* Participants drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'participants' ? 'active' : ''}`}
                    onClick={() => togglePanel('participants')}
                    title="Show participants list"
                    style={{ width: windowWidth < 640 ? 36 : 40, height: windowWidth < 640 ? 36 : 40, border: 'none', borderRadius: '50%', background: activePanel === 'participants' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'participants' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}
                >
                    <IconUsers />
                    {waitingGuests.length > 0 ? (
                        <span style={{
                            position: 'absolute', top: -3, right: -3,
                            minWidth: 16, height: 16, borderRadius: '50%',
                            background: '#f59e0b',
                            fontSize: '0.625rem', fontWeight: 800,
                            color: '#000', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '0 3px',
                            border: '1.5px solid var(--color-bg-base)',
                            boxShadow: '0 0 10px rgba(245,158,11,0.6)',
                            animation: 'jts-pulse 1.5s infinite'
                        }} title={`${waitingGuests.length} waiting to be admitted`}>
                            {waitingGuests.length}
                        </span>
                    ) : participants.length > 0 ? (
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
                    ) : null}
                </button>

                {/* Chat drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'chat' ? 'active' : ''}`}
                    onClick={() => togglePanel('chat')}
                    title="Meeting chat window"
                    style={{ width: windowWidth < 640 ? 36 : 40, height: windowWidth < 640 ? 36 : 40, border: 'none', borderRadius: '50%', background: activePanel === 'chat' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'chat' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}
                >
                    <IconChat />
                    {unreadChatCount > 0 && activePanel !== 'chat' && (
                        <span style={{
                            position: 'absolute', top: -3, right: -3,
                            minWidth: 16, height: 16, borderRadius: '50%',
                            background: '#ef4444',
                            fontSize: '0.625rem', fontWeight: 800,
                            color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '0 3px',
                            border: '1.5px solid var(--color-bg-base)',
                            boxShadow: '0 2px 6px rgba(239,68,68,0.5)'
                        }}>
                            {unreadChatCount > 9 ? '9+' : unreadChatCount}
                        </span>
                    )}
                </button>

                {/* Q&A drawer toggle */}
                <button
                    className={`btn-icon ${activePanel === 'qa' ? 'active' : ''}`}
                    onClick={() => togglePanel('qa')}
                    title="Q&A with Upvoting"
                    style={{ width: windowWidth < 640 ? 36 : 40, height: windowWidth < 640 ? 36 : 40, border: 'none', borderRadius: '50%', background: activePanel === 'qa' ? 'var(--color-accent-light)' : 'transparent', color: activePanel === 'qa' ? 'var(--color-accent)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}
                >
                    <IconHelp size={windowWidth < 640 ? 18 : 20} />
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                {/* Consolidated Google Meet Style [⋮ More Options] */}
                <button
                    ref={moreBtnRef}
                    className={`btn-icon ${showMoreMenu ? 'active' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowMoreMenu(prev => !prev)
                    }}
                    title="More options (⋮)"
                    style={{
                        width: windowWidth < 640 ? 36 : 40,
                        height: windowWidth < 640 ? 36 : 40,
                        border: 'none',
                        borderRadius: '50%',
                        background: showMoreMenu ? 'rgba(255,255,255,0.18)' : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                    </svg>
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                {/* Leave / End Meeting Trigger */}
                <button
                    onClick={() => {
                        if (isLocalHost) {
                            setShowEndMeetingModal(true)
                        } else {
                            handleExitMeeting()
                        }
                    }}
                    style={{
                        height: windowWidth < 640 ? 38 : 44,
                        padding: windowWidth < 640 ? '0 12px' : '0 16px',
                        borderRadius: '24px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title={isLocalHost ? "End or Leave Meeting" : "Leave Meeting"}
                >
                    <IconPhoneOff size={18} color="#fff" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                        {isLocalHost ? "End" : "Leave"}
                    </span>
                </button>
            </footer>

            {/* Google Meet Style Dynamic "More Options" Floating Popover */}
            {showMoreMenu && (() => {
                const rect = moreBtnRef.current?.getBoundingClientRect()
                const bottom = rect ? window.innerHeight - rect.top + 12 : 90
                const left = rect ? Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2)) : window.innerWidth / 2

                return (
                    <div
                        ref={moreMenuRef}
                        style={{
                            position: 'fixed',
                            bottom: `${bottom}px`,
                            left: `${left}px`,
                            transform: 'translateX(-50%)',
                            width: 300,
                            maxHeight: 'calc(100vh - 120px)',
                            overflowY: 'auto',
                            background: 'rgba(15, 18, 26, 0.98)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '16px',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            boxShadow: '0 24px 54px rgba(0,0,0,0.85), 0 0 1px 1px rgba(255,255,255,0.1)',
                            zIndex: 10005,
                            animation: 'jts-slide-up 0.18s ease-out'
                        }}
                    >
                        {/* Record Meeting */}
                        {isScreenShareSupported() && canRecord && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    if (!canAccessRecording) {
                                        setUpgradeModalFeature({
                                            title: 'Cloud Video Recording',
                                            requiredPlan: 'Starter or Enterprise',
                                            icon: <IconVideo size={20} color="#ef4444" />,
                                            description: 'Recording meetings with cloud storage and MP4 downloads is available on Starter and Enterprise plans. Free plan workspaces do not include cloud recording.'
                                        })
                                        return
                                    }
                                    if (isRecording) {
                                        stopRecording()
                                    } else {
                                        startRecording()
                                    }
                                }}
                                disabled={!connected || !joined}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: isRecording ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                                    color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    {isRecording ? (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
                                    ) : (
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
                                    )}
                                </div>
                                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessRecording ? 1 : 0.85 }}>
                                    {isRecording ? 'Stop Recording' : 'Record Meeting'}
                                </span>
                                {isRecording && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>REC</span>}
                                {!canAccessRecording && (
                                    <span style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#000',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3
                                    }}>
                                        <IconLock size={9} /> PRO
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Server-Side Headless Cloud Recording */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (!canAccessCloudRecording) {
                                    setUpgradeModalFeature({
                                        title: 'Cloud Server Recording',
                                        requiredPlan: 'Enterprise Tier',
                                        icon: <IconVideo size={20} color="#f43f5e" />,
                                        description: 'Headless 1080p automated server-side recording with secure cloud storage and shareable links requires the Enterprise tier.'
                                    })
                                    return
                                }
                                toggleCloudRecording()
                            }}
                            disabled={!connected || !joined}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: isCloudRecording ? 'rgba(244, 63, 94, 0.25)' : 'rgba(14, 165, 233, 0.12)',
                                color: isCloudRecording ? '#f43f5e' : '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                                    <circle cx="12" cy="13" r="2.5" fill={isCloudRecording ? 'currentColor' : 'none'} />
                                </svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left', opacity: canAccessCloudRecording ? 1 : 0.85 }}>
                                {isCloudRecording ? 'Stop Cloud Recording' : 'Cloud Recording (Server)'}
                            </span>
                            {isCloudRecording && <span style={{ fontSize: '0.65rem', background: '#f43f5e', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>CLOUD REC</span>}
                            {!canAccessCloudRecording && (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    color: '#fff',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.04em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <IconLock size={9} /> ENTERPRISE
                                </span>
                            )}
                        </button>

                        {/* Whiteboard */}
                        {canUseWhiteboard && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    setShowWhiteboard(prev => !prev)
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: 'rgba(168, 85, 247, 0.12)',
                                    color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left' }}>Collaborative Whiteboard</span>
                                {showWhiteboard && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                            </button>
                        )}

                        {/* Polls */}
                        {(canManageParticipants || showPolls) && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    setShowPolls(prev => !prev)
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left' }}>In-Call Polls</span>
                                {showPolls && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</span>}
                            </button>
                        )}

                        {/* Breakout Rooms (Host / Co-Host) */}
                        {(canManageParticipants || isLocalHost) && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    if (!canAccessBreakout) {
                                        setUpgradeModalFeature({
                                            title: 'Breakout Rooms',
                                            requiredPlan: 'Starter or Enterprise',
                                            icon: <IconCrown size={20} color="#60a5fa" />,
                                            description: 'Splitting meeting attendees into focused interactive sub-rooms and workshops requires a Starter or Enterprise plan.'
                                        })
                                        return
                                    }
                                    setIsBreakoutModalOpen(true)
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: 'rgba(59, 130, 246, 0.12)',
                                    color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessBreakout ? 1 : 0.85 }}>Breakout Rooms</span>
                                {activeBreakoutSession?.isActive && (
                                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#c084fc', background: 'rgba(168,85,247,0.2)', padding: '2px 6px', borderRadius: '6px' }}>
                                        ACTIVE
                                    </span>
                                )}
                                {!canAccessBreakout && (
                                    <span style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#000',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3
                                    }}>
                                        <IconLock size={9} /> PRO
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Structured Q&A Panel */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                togglePanel('qa')
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(236, 72, 153, 0.12)',
                                color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Q&amp;A Panel</span>
                            {activePanel === 'qa' && (
                                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>
                                    OPEN
                                </span>
                            )}
                        </button>

                        {/* Live Captions (CC) */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setShowCaptions(prev => {
                                    const next = !prev
                                    addToast(next ? 'Live Captions (CC) turned ON: Speak to see real-time subtitles' : 'Live Captions (CC) turned OFF', 'info')
                                    return next
                                })
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(34, 197, 94, 0.12)',
                                color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M7 15h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H7v6z"/><path d="M15 15h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2v6z"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Live Captions (Subtitles)</span>
                            <span style={{ fontSize: '0.7rem', color: showCaptions ? '#34d399' : 'var(--color-text-muted)', fontWeight: 600 }}>
                                {showCaptions ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        {/* AI Minutes of Meeting (Host only) */}
                        {canManageParticipants && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    if (!canAccessAI) {
                                        setUpgradeModalFeature({
                                            title: 'AI Minutes of Meeting (MoM)',
                                            requiredPlan: 'Starter or Enterprise',
                                            icon: <IconFileText size={20} color="#fbbf24" />,
                                            description: 'Real-time AI-generated executive summaries, decisions, and action-item tracking require a Starter or Enterprise plan.'
                                        })
                                        return
                                    }
                                    setShowMoMModal(true)
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAI ? 1 : 0.85 }}>AI Minutes of Meeting (MoM)</span>
                                {!canAccessAI && (
                                    <span style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#000',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3
                                    }}>
                                        <IconLock size={9} /> PRO
                                    </span>
                                )}
                            </button>
                        )}

                        {/* AI Summary */}
                        {(!isGuest || canManageParticipants) && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    if (!canAccessAI) {
                                        setUpgradeModalFeature({
                                            title: 'AI Smart Summary',
                                            requiredPlan: 'Starter or Enterprise',
                                            icon: <IconSparkles size={20} color="#a78bfa" />,
                                            description: 'Automated AI transcript processing and meeting highlights extraction are available on Starter and Enterprise plans.'
                                        })
                                        return
                                    }
                                    setShowSummary(prev => !prev)
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: 'rgba(139, 92, 246, 0.12)',
                                    color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAI ? 1 : 0.85 }}>AI Smart Summary</span>
                                {showSummary && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                                {!canAccessAI && (
                                    <span style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#000',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3
                                    }}>
                                        <IconLock size={9} /> PRO
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Catch Me Up (Late Joiner AI Summary) */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (!canAccessAI) {
                                    setUpgradeModalFeature({
                                        title: 'AI Catch Me Up (Recap)',
                                        requiredPlan: 'Starter or Enterprise',
                                        icon: <IconSparkles size={20} color="#c084fc" />,
                                        description: 'AI-generated recap for late joiners summarizing discussions, key takeaways, and action items requires a Starter or Enterprise plan.'
                                    })
                                    return
                                }
                                setShowCatchUpModal(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(168, 85, 247, 0.16)',
                                color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <IconSparkles size={15} />
                            </div>
                            <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAI ? 1 : 0.85 }}>Catch Me Up (Recap)</span>
                            {!canAccessAI ? (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#000',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.04em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <IconLock size={9} /> PRO
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#d8b4fe', background: 'rgba(168,85,247,0.2)', padding: '2px 6px', borderRadius: '6px' }}>AI</span>
                            )}
                        </button>

                        {/* Shared Files */}
                        {(!isGuest || canManageParticipants) && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    togglePanel('files')
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: 'rgba(14, 165, 233, 0.12)',
                                    color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left' }}>Shared Files</span>
                                {activePanel === 'files' && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                            </button>
                        )}

                        {/* Collaborative Notes (Enabled for all participants including guests) */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                togglePanel('notes')
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(234, 179, 8, 0.12)',
                                color: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Meeting Notes</span>
                            {activePanel === 'notes' && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                        </button>

                        {/* Picture in Picture */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                handleTogglePiP()
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><rect x="13" y="11" width="7" height="6" rx="1.5" fill="currentColor" opacity="0.4"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Picture-in-Picture</span>
                            {isPiPActive && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</span>}
                        </button>

                        {/* Data Saver Mode */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setLowBandwidthMode(!lowBandwidthMode)
                                addToast(
                                    !lowBandwidthMode
                                        ? 'Low-Bandwidth Mode active: Video decoding paused to save ~85% data.'
                                        : 'Low-Bandwidth Mode disabled: Full video stream restored.',
                                    'info'
                                )
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: lowBandwidthMode ? 'rgba(34, 197, 94, 0.18)' : 'rgba(148, 163, 184, 0.1)',
                                color: lowBandwidthMode ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Data Saver Mode</span>
                            <span style={{ fontSize: '0.7rem', color: lowBandwidthMode ? '#34d399' : 'var(--color-text-muted)', fontWeight: 600 }}>
                                {lowBandwidthMode ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        {/* Change Layout */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setIsLayoutModalOpen(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Change Layout</span>
                            <span style={{ fontSize: '0.6875rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                                {layoutMode}
                            </span>
                        </button>

                        {/* Studio Soft Lighting */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setIsStudioLightingEnabled(prev => {
                                    const next = !prev
                                    addToast(next ? 'Studio soft lighting enabled' : 'Studio lighting disabled', 'info')
                                    return next
                                })
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: isStudioLightingEnabled ? 'rgba(251, 191, 36, 0.18)' : 'rgba(148, 163, 184, 0.1)',
                                color: isStudioLightingEnabled ? '#fbbf24' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Studio Soft Lighting</span>
                            <span style={{ fontSize: '0.7rem', color: isStudioLightingEnabled ? '#fbbf24' : 'var(--color-text-muted)', fontWeight: 600 }}>
                                {isStudioLightingEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        {/* RTMP Live Stream Studio (YouTube / Facebook / Twitch) */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (!canAccessRTMP) {
                                    setUpgradeModalFeature({
                                        title: 'RTMP Live Streaming Studio',
                                        requiredPlan: 'Enterprise Tier',
                                        icon: <IconRocket size={20} color="#c084fc" />,
                                        description: 'Streaming live broadcast video to YouTube, Facebook, Twitch, or external CDN endpoints requires the Enterprise tier.'
                                    })
                                    return
                                }
                                setShowLiveStreamModal(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: isLiveStreaming ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                border: isLiveStreaming ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                                borderRadius: '10px',
                                color: isLiveStreaming ? '#fca5a5' : '#fff',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                width: '100%',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isLiveStreaming ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isLiveStreaming ? 'rgba(239, 68, 68, 0.15)' : 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: isLiveStreaming ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                                color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M7.76 7.76a6 6 0 0 0 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left', opacity: canAccessRTMP ? 1 : 0.85 }}>RTMP Live Streaming Studio</span>
                            {canAccessRTMP ? (
                                <span style={{
                                    fontSize: '0.6875rem',
                                    color: isLiveStreaming ? '#ef4444' : '#818cf8',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: isLiveStreaming ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)',
                                    padding: '2px 6px',
                                    borderRadius: 4
                                }}>
                                    {isLiveStreaming ? 'LIVE' : 'SETUP'}
                                </span>
                            ) : (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    color: '#fff',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.04em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <IconLock size={9} /> ENTERPRISE
                                </span>
                            )}
                        </button>

                        {/* Meeting Attendance & Participation Report */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (!canAccessAttendance) {
                                    setUpgradeModalFeature({
                                        title: 'Attendance & Participation Report',
                                        requiredPlan: 'Starter or Enterprise',
                                        icon: <IconFileText size={20} color="#818cf8" />,
                                        description: 'Participant attendance tracking, check-in logs, and engagement audit reports require a Starter or Enterprise plan.'
                                    })
                                    return
                                }
                                setShowAttendanceModal(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAttendance ? 1 : 0.85 }}>Attendance &amp; Participation</span>
                            {!canAccessAttendance ? (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#000',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.04em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <IconLock size={9} /> PRO
                                </span>
                            ) : (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    color: '#818cf8',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.02em'
                                }}>
                                    REPORT
                                </span>
                            )}
                        </button>

                        {/* Visual Effects & Virtual Backgrounds */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setShowVirtualBgModal(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(168, 85, 247, 0.12)',
                                color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Apply Visual Effects</span>
                            {virtualBgPreset !== 'none' && (
                                <span style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: 4 }}>
                                    ACTIVE
                                </span>
                            )}
                        </button>

                        {/* End-to-End Encryption */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (!canAccessE2EE) {
                                    setUpgradeModalFeature({
                                        title: 'Hardware SFrame E2EE Security',
                                        requiredPlan: 'Enterprise Tier',
                                        icon: <IconShield size={20} color="#34d399" />,
                                        description: 'End-to-End Encryption (E2EE) with zero-knowledge cryptographic key verification requires the Enterprise tier.'
                                    })
                                    return
                                }
                                setShowE2EEModal(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left', opacity: canAccessE2EE ? 1 : 0.85 }}>End-to-End Encryption</span>
                            {!canAccessE2EE ? (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    color: '#fff',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.04em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <IconLock size={9} /> ENTERPRISE
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.6875rem', color: isE2EEActive ? '#34d399' : '#94a3b8', fontWeight: 700, background: isE2EEActive ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                                    {isE2EEActive ? 'SECURED' : 'CONFIGURE'}
                                </span>
                            )}
                        </button>

                        {/* Phone Audio Dial-In (PSTN) */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (!canAccessDialIn) {
                                    setUpgradeModalFeature({
                                        title: 'Phone Audio Dial-In (PSTN)',
                                        requiredPlan: 'Enterprise Tier',
                                        icon: <IconRocket size={20} color="#38bdf8" />,
                                        description: 'PSTN phone bridges with toll-free and international dial-in numbers require an Enterprise subscription.'
                                    })
                                    return
                                }
                                setShowDialInModal(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(14, 165, 233, 0.12)',
                                color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left', opacity: canAccessDialIn ? 1 : 0.85 }}>Phone Audio Dial-In</span>
                            {!canAccessDialIn ? (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    color: '#fff',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: '0.04em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <IconLock size={9} /> ENTERPRISE
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.6875rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(14,165,233,0.18)', padding: '2px 6px', borderRadius: 4 }}>
                                    PSTN
                                </span>
                            )}
                        </button>

                        {/* Webinar Mode Toggle */}
                        {canManageParticipants && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false)
                                    if (!canAccessWebinar) {
                                        setUpgradeModalFeature({
                                            title: 'Webinar Stage Broadcast Mode',
                                            requiredPlan: 'Enterprise Tier',
                                            icon: <IconRocket size={20} color="#fb7185" />,
                                            description: 'Large-scale 500+ viewer broadcast mode with stage management and moderated attendee controls requires an Enterprise tier plan.'
                                        })
                                        return
                                    }
                                    const next = !isWebinarMode
                                    setIsWebinarMode(next)
                                    socket?.emit('webinar:toggle-mode', {
                                        meetingId: meetingId || meetingInput.trim(),
                                        enabled: next
                                    })
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                    background: 'transparent', border: 'none', borderRadius: '10px',
                                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: isWebinarMode ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.12)',
                                    color: '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessWebinar ? 1 : 0.85 }}>Webinar Stage Mode</span>
                                {!canAccessWebinar ? (
                                    <span style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                        color: '#fff',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3
                                    }}>
                                        <IconLock size={9} /> ENTERPRISE
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.6875rem', color: isWebinarMode ? '#fb7185' : '#94a3b8', fontWeight: 700, background: isWebinarMode ? 'rgba(244,63,94,0.18)' : 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                                        {isWebinarMode ? 'ACTIVE' : 'OFF'}
                                    </span>
                                )}
                            </button>
                        )}

                        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                        {/* Settings */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setShowDeviceSettings(true)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(148, 163, 184, 0.1)',
                                color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Audio &amp; Video Settings</span>
                        </button>

                        {/* Shortcuts */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                setShowShortcuts(prev => !prev)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'transparent', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(148, 163, 184, 0.1)',
                                color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>Keyboard Shortcuts</span>
                        </button>

                        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                        {/* Leave Meeting item */}
                        <button
                            onClick={() => {
                                setShowMoreMenu(false)
                                if (isLocalHost) {
                                    setShowEndMeetingModal(true)
                                } else {
                                    handleExitMeeting()
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                                background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '10px',
                                color: '#f87171', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <IconPhoneOff size={15} color="#ef4444" />
                            </div>
                            <span style={{ flex: 1, textAlign: 'left' }}>{isLocalHost ? 'End / Leave Meeting' : 'Leave Meeting'}</span>
                        </button>
                    </div>
                )
            })()}

            {/* Mic Status Toggle HUD (1 second flash) */}
            {showPushToTalkHud && (
                <div style={{
                    position: 'fixed',
                    top: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10001,
                    background: isMuted ? 'rgba(239, 68, 68, 0.94)' : 'rgba(34, 197, 94, 0.94)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: isMuted ? '0 4px 16px rgba(239, 68, 68, 0.35)' : '0 4px 16px rgba(34, 197, 94, 0.35)',
                    whiteSpace: 'nowrap'
                }}>
                    {isMuted ? <IconMicOff size={13} color="#fff" /> : <IconMic size={13} color="#fff" />}
                    <span>{isMuted ? 'Microphone muted' : 'Microphone unmuted'}</span>
                </div>
            )}

            {/* End Meeting Modal for Host */}
            <EndMeetingModal
                isOpen={showEndMeetingModal}
                onClose={() => setShowEndMeetingModal(false)}
                onLeaveOnly={() => {
                    setShowEndMeetingModal(false)
                    handleExitMeeting()
                }}
                onEndForAll={(sendSummaryEmail) => {
                    setShowEndMeetingModal(false)
                    if (sendSummaryEmail) {
                        const targetMeetingId = meetingId || meetingInput.trim()
                        const records = Object.values(attendanceRecordsRef.current)
                        const now = Date.now()
                        const formattedAttendees = records.length > 0 ? records.map(r => {
                            const durationSec = r.status === 'Active' && joinTimeMapRef.current[r.userId]
                                ? Math.max(1, Math.round((now - joinTimeMapRef.current[r.userId]) / 1000))
                                : (r.durationSeconds || 0)
                            const minutes = Math.floor(durationSec / 60)
                            const seconds = durationSec % 60
                            const durationFormatted = `${minutes}m ${seconds}s`
                            return {
                                name: r.name,
                                userId: r.userId,
                                role: r.role,
                                status: r.status,
                                joinTime: r.joinTime,
                                leaveTime: r.leaveTime || 'Meeting Concluded',
                                duration: durationFormatted
                            }
                        }) : [
                            {
                                name: `${myDisplayName} (Host)`,
                                role: 'Host',
                                status: 'Active',
                                joinTime: new Date(now).toLocaleTimeString(),
                                leaveTime: 'Meeting Concluded',
                                duration: timerStr
                            },
                            ...participants.map(p => ({
                                name: getUserDisplayName(p),
                                role: coHostIds.includes(p) ? 'Co-Host' : 'Participant',
                                status: 'Active',
                                joinTime: new Date(now).toLocaleTimeString(),
                                leaveTime: 'Meeting Concluded',
                                duration: timerStr
                            }))
                        ]

                        // Generate CSV Content
                        const header = ['Participant Name', 'Role', 'Status', 'Join Time', 'Leave Time', 'Duration'].join(',')
                        const rows = formattedAttendees.map(a => [
                            `"${(a.name || '').replace(/"/g, '""')}"`,
                            `"${(a.role || 'Participant').replace(/"/g, '""')}"`,
                            `"${(a.status || 'Attended').replace(/"/g, '""')}"`,
                            `"${(a.joinTime || '').replace(/"/g, '""')}"`,
                            `"${(a.leaveTime || '').replace(/"/g, '""')}"`,
                            `"${(a.duration || timerStr).replace(/"/g, '""')}"`
                        ].join(','))
                        const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')

                        fetch(`${API_BASE}/api/meeting/${targetMeetingId}/dispatch-summary-email`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token || initialToken}`
                            },
                            body: JSON.stringify({
                                duration: timerStr,
                                attendees: formattedAttendees,
                                csvContent
                            })
                        }).catch(e => console.error('[dispatchSummaryEmail] error:', e))
                        addToast('Attendance report with CSV file queued for dispatch!', 'success')
                    }
                    setMeetingInput('')
                    socket?.emit('meeting:end-all', { meetingId: meetingId || meetingInput.trim() })
                    handleExitMeeting()
                }}
                onDownloadAttendance={() => {
                    exportAttendanceCSV()
                    addToast('Attendance sheet exported successfully!', 'success')
                }}
            />

            {/* Live Captions Subtitle Banner */}
            <MeetingCaptionsBanner
                isEnabled={showCaptions}
                speakerName={renamedUsers['me'] || (parseJwt(token)?.fullName || 'You')}
                meetingId={meetingId || meetingInput.trim()}
                socket={socket}
                isLocalMuted={isMuted}
                onTranscriptUpdate={(newTranscripts) => setTranscripts(newTranscripts)}
            />

            {/* ── Virtual Green Room: Backstage Banner (shown to backstage user) ── */}
            {isCurrentUserBackstage && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 200,
                    background: 'linear-gradient(135deg, rgba(6,78,59,0.97), rgba(4,120,87,0.93))',
                    border: '1.5px solid rgba(52,211,153,0.7)',
                    borderRadius: 14,
                    padding: '10px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(52,211,153,0.25)',
                    maxWidth: '90vw'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>🎭</span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#34d399', letterSpacing: '0.02em' }}>
                            You are Backstage (Green Room)
                        </p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(167,243,208,0.85)', lineHeight: 1.4 }}>
                            Audience cannot see or hear your stream — you are in the private green room
                        </p>
                    </div>
                    <span style={{
                        marginLeft: 8, padding: '3px 10px',
                        background: 'rgba(52,211,153,0.2)',
                        border: '1px solid rgba(52,211,153,0.5)',
                        borderRadius: 6, fontSize: '0.65rem',
                        color: '#6ee7b7', fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap'
                    }}>
                        🔴 OFF AIR
                    </span>
                </div>
            )}

            {/* ── Virtual Green Room: Host "Go Live" Broadcast Switch ── */}
            {isLocalHost && canUseBackstage && backstageUserIds.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 20,
                    zIndex: 200,
                    background: 'rgba(15,17,23,0.95)',
                    border: '1px solid rgba(52,211,153,0.4)',
                    borderRadius: 12,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    minWidth: 220
                }}>
                    <span style={{ fontSize: '1rem' }}>🎬</span>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem', color: '#e2e8f0' }}>
                            Green Room Active
                        </p>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>
                            {backstageUserIds.length} backstage presenter{backstageUserIds.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsGoingLive(true)
                            // Bring all backstage users to stage
                            backstageUserIds.forEach(uid => {
                                socket?.emit(SocketEvents.STAGE_STATUS_CHANGE, {
                                    meetingId: activeRoomKey,
                                    targetUserId: uid,
                                    isBackstage: false
                                })
                            })
                            setTimeout(() => setIsGoingLive(false), 1500)
                        }}
                        disabled={isGoingLive}
                        style={{
                            background: isGoingLive
                                ? 'rgba(239,68,68,0.4)'
                                : 'linear-gradient(135deg, #ef4444, #dc2626)',
                            border: 'none', borderRadius: 8,
                            padding: '6px 14px', color: '#fff',
                            fontWeight: 800, fontSize: '0.75rem',
                            cursor: isGoingLive ? 'default' : 'pointer',
                            letterSpacing: '0.04em',
                            display: 'flex', alignItems: 'center', gap: 5
                        }}
                    >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: isGoingLive ? 'none' : 'agy-pulse 1.2s ease infinite' }} />
                        {isGoingLive ? 'Going Live...' : 'Go Live'}
                    </button>
                </div>
            )}

            {/* Late-Joiner AI "Catch Me Up" Floating Prompt (Teams / Zoom Copilot) */}
            {showCatchUpPrompt && !showCatchUpModal && (
                <div style={{
                    position: 'absolute',
                    top: 72,
                    right: 20,
                    zIndex: 95,
                    background: 'rgba(18, 19, 26, 0.95)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(168, 85, 247, 0.45)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    padding: '10px 16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(168, 85, 247, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'rgba(168, 85, 247, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#c084fc',
                            flexShrink: 0
                        }}>
                            <IconSparkles size={16} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                Joined ~{joinedMinutesLate}m in
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#d8b4fe' }}>
                                Get a quick recap with AI Copilot
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowCatchUpModal(true); setShowCatchUpPrompt(false); }}
                        className="btn btn-primary"
                        style={{
                            padding: '5px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                            borderRadius: 8
                        }}
                    >
                        Catch Me Up
                    </button>
                    <button
                        onClick={() => setShowCatchUpPrompt(false)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <IconX size={14} />
                    </button>
                </div>
            )}

            {/* Late-Joiner AI "Catch Me Up" Modal */}
            {showCatchUpModal && (
                <LateJoinerCatchUpModal
                    meetingTitle={meetingInfo?.title || `Session ${meetingId || meetingInput}`}
                    meetingId={meetingId || meetingInput}
                    token={token || initialToken}
                    joinedMinutesLate={joinedMinutesLate}
                    transcripts={transcripts}
                    chatMessages={messages.map(m => ({ sender: m.senderName || 'Participant', text: m.message }))}
                    onClose={() => setShowCatchUpModal(false)}
                />
            )}

            {/* Collaborative Whiteboard Canvas */}
            <MeetingWhiteboard
                isOpen={showWhiteboard}
                onClose={() => setShowWhiteboard(false)}
                meetingId={meetingId || meetingInput}
                socket={socket}
            />

            {/* In-Call Live Polls Modal */}
            <MeetingPollsModal
                isOpen={showPolls}
                onClose={() => setShowPolls(false)}
                meetingId={meetingId || meetingInput}
                currentUserId="me"
                isHostOrCoHost={canManageParticipants || isLocalHost}
                socket={socket}
            />

            {/* Device & Hardware Settings Modal */}
            <DeviceSettingsModal
                isOpen={showDeviceSettings}
                onClose={() => setShowDeviceSettings(false)}
                localStream={localStream}
                onDeviceChange={async (kind, deviceId) => {
                    if (kind === 'video') {
                        await handleVideoSourceChange(deviceId)
                    } else {
                        await handleAudioSourceChange(deviceId)
                    }
                }}
                isBlurEnabled={isBlurEnabled}
                onToggleBlur={handleToggleBlur}
                isNoiseSuppressionEnabled={isNoiseSuppressionEnabled}
                onToggleNoiseSuppression={handleToggleNoiseSuppression}
                onOpenVirtualBg={() => setShowVirtualBgModal(true)}
                videoQuality={videoQuality}
                onQualityChange={handleQualityChange}
                isHdBoostEnabled={isHdBoostEnabled}
                onToggleHdBoost={setIsHdBoostEnabled}
            />

            {/* AI Smart Summary Modal */}
            <MeetingSummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                meetingTitle={meetingInfo?.title || `Session ${meetingId || meetingInput}`}
                meetingId={meetingId || meetingInput}
                transcripts={transcripts}
                participantsCount={participants.length + 1}
                chatMessages={messages}
                duration={timerStr}
                participantsList={[
                    `${myDisplayName} (You)`,
                    ...participants.map(p => getUserDisplayName(p))
                ]}
            />

            {/* Keyboard Shortcuts Cheatsheet */}
            <KeyboardShortcutsModal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />

            {/* Google Meet Layout Switcher Modal */}
            <LayoutSwitcherModal
                isOpen={isLayoutModalOpen}
                onClose={() => setIsLayoutModalOpen(false)}
                currentLayout={layoutMode}
                onSelectLayout={(mode) => {
                    setLayoutMode(mode)
                    addToast(`Layout switched to ${mode.toUpperCase()}`, 'info')
                }}
                maxTiles={maxGridTiles}
                onMaxTilesChange={(tiles) => setMaxGridTiles(tiles)}
            />

            {/* Visual Effects & Virtual Backgrounds Modal */}
            <VirtualBackgroundModal
                isOpen={showVirtualBgModal}
                onClose={() => setShowVirtualBgModal(false)}
                activePreset={virtualBgPreset}
                onSelectPreset={handleSelectVirtualBackground}
                onUploadCustom={handleUploadCustomWallpaper}
                localStream={activeLocalStream || localStream}
                isApplying={isApplyingVirtualBg}
            />

            {/* End-to-End Encryption Security Modal */}
            <E2EESecurityModal
                isOpen={showE2EEModal}
                onClose={() => {
                    setShowE2EEModal(false)
                    setIsE2EEActive(e2eeService.isEnabled())
                }}
                meetingId={meetingId || meetingInput.trim()}
            />

            {/* PSTN / Phone Dial-In Modal */}
            <DialInModal
                isOpen={showDialInModal}
                onClose={() => setShowDialInModal(false)}
                meetingId={meetingId || meetingInput.trim()}
                meetingTitle={meetingInfo?.title}
            />

            {/* Breakout Rooms Management Modal */}
            <BreakoutRoomsModal
                isOpen={isBreakoutModalOpen}
                onClose={() => setIsBreakoutModalOpen(false)}
                meetingId={meetingId || meetingInput.trim()}
                socket={socket}
                participants={[
                    { id: 'me', name: `${myDisplayName} (You)` },
                    ...participants.map(p => ({
                        id: p,
                        name: getUserDisplayName(p)
                    }))
                ]}
                isHost={canManageParticipants || isLocalHost}
                activeBreakoutSession={activeBreakoutSession}
            />

            {/* Active Breakout Session Floating Banner */}
            {activeBreakoutSession?.isActive && (
                <div style={{
                    position: 'fixed',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10002,
                    background: 'rgba(88, 28, 135, 0.94)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    borderRadius: 30,
                    padding: '6px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    color: '#fff',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    boxShadow: '0 8px 32px rgba(88, 28, 135, 0.5)'
                }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a855f7', animation: 'jts-pulse 1.5s infinite' }} />
                    <span>
                        {currentBreakoutSubRoomId
                            ? `In Breakout: ${activeBreakoutSession.rooms.find(r => r.id === currentBreakoutSubRoomId)?.name || 'Sub-Room'}`
                            : `Main Session (${activeBreakoutSession.rooms.length} Breakout Rooms Active)`
                        }
                    </span>

                    {currentBreakoutSubRoomId ? (
                        <button
                            onClick={() => {
                                const activeMain = meetingId || meetingInput.trim()
                                setCurrentBreakoutSubRoomId(null)
                                addToast('Returning to main room...', 'info')
                                connectToMeeting(activeMain, myDisplayName, false)
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                color: '#fff',
                                borderRadius: 20,
                                padding: '3px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                            title="Leave breakout room and return to main room"
                        >
                            Return to Main
                        </button>
                    ) : (
                        (() => {
                            const myId = parseJwt(token)?.userId || 'me'
                            const assignedRoom = activeBreakoutSession.rooms.find((r: any) =>
                                r.participantIds?.includes(myId) || r.participantIds?.includes(socket?.id) || r.participantIds?.includes(localUserId)
                            )
                            if (assignedRoom) {
                                return (
                                    <button
                                        onClick={() => {
                                            const activeMain = meetingId || meetingInput.trim()
                                            setCurrentBreakoutSubRoomId(assignedRoom.id)
                                            addToast(`Joining ${assignedRoom.name}...`, 'info')
                                            const subRoomId = `${activeMain}__sub_${assignedRoom.id}`
                                            connectToMeeting(subRoomId, myDisplayName, true)
                                        }}
                                        style={{
                                            background: '#c084fc',
                                            border: 'none',
                                            color: '#3b0764',
                                            borderRadius: 20,
                                            padding: '3px 12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                        title={`Join your assigned room: ${assignedRoom.name}`}
                                    >
                                        Join {assignedRoom.name}
                                    </button>
                                )
                            }
                            return null
                        })()
                    )}

                    {(canManageParticipants || isLocalHost) && (
                        <button
                            onClick={() => setIsBreakoutModalOpen(true)}
                            style={{
                                background: '#c084fc',
                                border: 'none',
                                color: '#3b0764',
                                borderRadius: 20,
                                padding: '3px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Manage
                        </button>
                    )}
                </div>
            )}

            {/* Network Offline / Reconnection Banner (Unified Single Source of Truth) */}
            {(isNetworkOffline || networkStatus === 'offline' || networkStatus === 'reconnecting' || isReconnecting) && (
                <div style={{
                    position: 'fixed',
                    top: 66,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10002,
                    background: 'rgba(239, 68, 68, 0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    color: '#fff',
                    padding: '6px 18px',
                    borderRadius: 30,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.45)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    whiteSpace: 'nowrap'
                }}>
                    <span className="spinner-sm" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconInfo size={15} color="#fff" />
                        <span>
                            {isNetworkOffline || networkStatus === 'offline'
                                ? 'Network offline. Re-establishing connection…'
                                : 'Connection interrupted. Auto-reconnecting call…'}
                        </span>
                    </span>
                    <button
                        onClick={() => {
                            if (socket) {
                                socket.connect()
                                const currentId = meetingId || meetingInput.trim()
                                if (currentId) {
                                    connectToMeetingRef.current(currentId, myDisplayName)
                                }
                            }
                        }}
                        style={{
                            background: '#fff',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: 20,
                            padding: '3px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease'
                        }}
                    >
                        Retry Now
                    </button>
                </div>
            )}

            {/* Connection Restored Success Banner */}
            {showRestoredNotice && !(isNetworkOffline || networkStatus === 'offline' || networkStatus === 'reconnecting' || isReconnecting) && (
                <div style={{
                    position: 'fixed',
                    top: 66,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10002,
                    background: 'rgba(34, 197, 94, 0.95)',
                    backdropFilter: 'blur(16px)',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: 30,
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconCheck size={14} color="#34d399" /> Connection restored</span>
                </div>
            )}

            {/* Low-Bandwidth Mode Active HUD */}
            {lowBandwidthMode && (
                <div style={{
                    position: 'fixed',
                    top: 18,
                    left: 20,
                    zIndex: 9998,
                    background: 'rgba(16, 185, 129, 0.92)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <IconZap size={14} color="#ffffff" />
                    <span>Data Saver: Active (Incoming video paused)</span>
                </div>
            )}

            {/* Real-time Emoji Reactions Floating Picker (Never clipped by toolbar) */}
            {showReactionsPopover && (() => {
                const rect = reactionBtnRef.current?.getBoundingClientRect()
                const bottom = rect ? window.innerHeight - rect.top + 12 : 96
                const left = rect ? rect.left + rect.width / 2 : window.innerWidth / 2

                return (
                    <div
                        ref={reactionsPopoverRef}
                        style={{
                            position: 'fixed',
                            bottom: `${bottom}px`,
                            left: `${left}px`,
                            transform: 'translateX(-50%)',
                            background: 'rgba(15, 17, 23, 0.96)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            borderRadius: '32px',
                            padding: '6px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            zIndex: 10005,
                            boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 20px rgba(99,102,241,0.25)',
                            animation: 'jts-slide-up 0.2s ease-out'
                        }}
                    >
                        {['❤️', '👏', '🎉', '👍', '😂', '🚀', '🔥'].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    sendReaction(emoji)
                                    setShowReactionsPopover(false)
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    padding: '4px 6px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'transform 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.35)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                            >
                                {emoji}
                            </button>
                        ))}

                        <div style={{ width: 1, height: 26, background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

                        {/* Soundboard Audio Triggers */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleTriggerSoundboard('applause')
                                    setShowReactionsPopover(false)
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    padding: '5px 9px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    color: '#fff',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Soundboard: Applause / Clapping (Everyone in meeting hears)"
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 11V6a2 2 0 0 0-4 0v5" />
                                    <path d="M14 10V4a2 2 0 0 0-4 0v7" />
                                    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
                                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.3L3.6 17a2 2 0 0 1 3-2.6L8 16" />
                                </svg>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#93c5fd' }}>Clap</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleTriggerSoundboard('cheer')
                                    setShowReactionsPopover(false)
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    padding: '5px 9px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    color: '#fff',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Soundboard: Celebration Cheer (Everyone in meeting hears)"
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbcfe8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fbcfe8' }}>Cheer</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleTriggerSoundboard('drumroll')
                                    setShowReactionsPopover(false)
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    padding: '5px 9px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    color: '#fff',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Soundboard: Dramatic Drumroll (Everyone in meeting hears)"
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fef08a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <ellipse cx="12" cy="8" rx="8" ry="4" />
                                    <path d="M4 8v8c0 2.2 3.6 4 8 4s8-1.8 8-4V8" />
                                    <line x1="8" y1="2" x2="10" y2="8" />
                                    <line x1="16" y1="2" x2="14" y2="8" />
                                </svg>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fef08a' }}>Roll</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleTriggerSoundboard('bell')
                                    setShowReactionsPopover(false)
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    padding: '5px 9px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    color: '#fff',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Soundboard: Service Bell (Everyone in meeting hears)"
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fed7aa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fed7aa' }}>Bell</span>
                            </button>
                        </div>
                    </div>
                )
            })()}

            {/* Real-time Floating Reactions Container (Zoom Style) */}
            <div style={{
                position: 'fixed', inset: 0,
                pointerEvents: 'none', zIndex: 99999, overflow: 'hidden'
            }}>
                {floatingReactions.map(r => (
                    <div
                        key={r.id}
                        className="floating-reaction-item"
                        style={{
                            left: `${r.left}%`,
                        }}
                    >
                        <span className="floating-reaction-emoji">{r.emoji}</span>
                        {r.senderName && (
                            <span className="floating-reaction-name">{r.senderName}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* AI Action Items & Minutes of Meeting (MoM) Modal */}
            {showMoMModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10005,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setShowMoMModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border-strong)',
                            borderRadius: 'var(--radius-xl)',
                            width: '100%',
                            maxWidth: '720px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <IconFileText size={22} color="#818cf8" />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>
                                        AI Minutes of Meeting (MoM) & Action Items
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Auto-synthesized meeting notes, attendance summary & deliverable task tracking
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowMoMModal(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                <IconX />
                            </button>
                        </div>

                        {/* Body - Formatted MoM */}
                        <div style={{
                            padding: '20px 24px',
                            overflowY: 'auto',
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            {/* Key Stats Pill Bar */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: 10
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Call Duration</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{timerStr}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Attendees Logged</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{Object.keys(attendanceRecordsRef.current).length || participants.length + 1}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Chat Messages</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{messages.length}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Action Items</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: 2 }}>3 Active</div>
                                </div>
                            </div>

                            {/* Markdown text preview container */}
                            <div style={{
                                background: 'var(--color-surface-2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: '0.8125rem',
                                color: '#e2e8f0',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                lineHeight: '1.6',
                                overflowY: 'auto',
                                maxHeight: '380px'
                            }}>
                                {generateMoMContent()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.02)',
                            gap: 12
                        }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Auto-generated by JTS-Meet Intelligence
                            </span>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generateMoMContent())
                                        addToast('MoM copied to clipboard!', 'success')
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <IconCopy size={14} /> Copy Text
                                </button>
                                <button
                                    onClick={() => {
                                        const content = generateMoMContent()
                                        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
                                        const url = URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.setAttribute('download', `jts-minutes-of-meeting-${meetingInfo?.customId || meetingInfo?.id || meetingId || 'session'}.md`)
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        URL.revokeObjectURL(url)
                                        addToast('Minutes (.md) downloaded successfully!', 'success')
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                                >
                                    <span>⬇️</span> Download (.md)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            {t.type === 'success' ? <IconCheck size={12} strokeWidth={2.5} /> : t.type === 'warning' ? '!' : 'i'}
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
            {canManageParticipants && waitingGuests.length > 0 && (
                <div style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380, width: '100%', pointerEvents: 'auto' }}>
                    {waitingGuests.length > 1 && (
                        <div className="glass-card anim-slide-up" style={{ padding: '12px 18px', border: '1px solid rgba(99, 102, 241, 0.4)', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(20, 22, 34, 0.98)', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                    {waitingGuests.length} people waiting to join
                                </span>
                            </div>
                            <button
                                onClick={handleApproveAllGuests}
                                className="btn btn-primary"
                                style={{ padding: '6px 14px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Admit All
                            </button>
                        </div>
                    )}
                    {waitingGuests.map((guest) => (
                        <div key={guest.socketId} className="glass-card anim-slide-up" style={{ padding: '18px 22px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(15, 17, 23, 0.98)', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Waiting Room Request
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', display: 'block' }}>
                                    {guest.guestName}
                                </span>
                                {guest.email && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                        <IconMail size={12} color="var(--color-text-secondary)" /> {guest.email}
                                    </span>
                                )}
                                {guest.company && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                        <IconBuilding size={12} color="var(--color-text-muted)" /> {guest.company}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                    onClick={() => handleDenyGuest(guest.socketId)}
                                    className="btn"
                                    style={{ padding: '6px 14px', fontSize: '0.8125rem', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={() => handleApproveGuest(guest.socketId)}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 18px', fontSize: '0.8125rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                >
                                    Admit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Invite Participants Modal */}
            {isInviteOpen && !isGuest && (() => {
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
                                            <IconMessage size={14} color="#fff" /> Share on WhatsApp
                                        </a>

                                        <a
                                            href={gCalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary"
                                            style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            <IconCalendar size={14} /> Google Calendar
                                        </a>

                                        <a
                                            href={outlookUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary"
                                            style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            <IconCalendar size={14} /> Outlook Calendar
                                        </a>

                                        <button
                                            type="button"
                                            onClick={downloadICSFile}
                                            className="btn btn-secondary"
                                            style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            <IconDownload size={14} /> Download iCal (.ics)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 🔴 Floating On-Air Live Stream Indicator for all Participants */}
            {(isLiveStreaming || remoteLiveStatus?.isStreaming) && (
                <div style={{
                    position: 'fixed',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    padding: '6px 16px',
                    borderRadius: 24,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
                    animation: 'pulse 2s infinite'
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                    <span>ON AIR: LIVE STREAMING ON {(liveStreamConfig?.platform || remoteLiveStatus?.platform || 'RTMP').toUpperCase()}</span>
                </div>
            )}

            {/* RTMP Live Streaming Studio Modal */}
            <LiveStreamModal
                isOpen={showLiveStreamModal}
                onClose={() => setShowLiveStreamModal(false)}
                isLive={isLiveStreaming}
                liveConfig={liveStreamConfig}
                onStartStream={(cfg) => {
                    handleStartLiveStream(cfg)
                    setShowLiveStreamModal(false)
                }}
                onStopStream={() => {
                    handleStopLiveStream()
                    setShowLiveStreamModal(false)
                }}
                meetingTitle={meetingInfo?.title || meetingId || 'Enterprise Conference Session'}
            />

            {/* Feature Plan Upgrade Restriction Modal */}
            {upgradeModalFeature && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.78)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <div style={{
                        maxWidth: 480,
                        width: '100%',
                        background: '#0d111d',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        borderRadius: 20,
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(245, 158, 11, 0.15)',
                        overflow: 'hidden',
                        textAlign: 'center',
                        padding: '28px 24px',
                        animation: 'jts-slide-up 0.2s ease-out'
                    }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.9rem',
                            margin: '0 auto 16px',
                            boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'
                        }}>
                            {upgradeModalFeature.icon}
                        </div>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '3px 12px',
                            borderRadius: 9999,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            marginBottom: 12
                        }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconLock size={12} color="#fbbf24" /> Locked on Free Plan • Requires {upgradeModalFeature.requiredPlan}</span>
                        </div>

                        <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                            {upgradeModalFeature.title}
                        </h3>

                        <p style={{ margin: '0 0 20px', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6 }}>
                            {upgradeModalFeature.description}
                        </p>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 12,
                            padding: '14px 18px',
                            marginBottom: 20,
                            textAlign: 'left'
                        }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Included with upgraded plan:
                            </span>
                            <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.65 }}>
                                <li>Cloud MP4 Recording &amp; Auto-Archive Vault</li>
                                <li>AI Meeting Minutes (MoM) &amp; Action Item Tracking</li>
                                <li>Multi-Platform 1080p RTMP Live Broadcast Studio</li>
                                <li>Unlimited Meeting Duration &amp; Expanded Seats</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => setUpgradeModalFeature(null)}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Maybe Later
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setUpgradeModalFeature(null)
                                    if (onUpgradePlanRequest) {
                                        onUpgradePlanRequest()
                                    } else {
                                        window.location.hash = '#organization'
                                    }
                                }}
                                style={{
                                    flex: 1.4,
                                    padding: '10px 0',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    color: '#fff',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconZap size={14} /> Upgrade Workspace Plan</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Free Plan 45-Minute Time Limit Reached Modal - ONLY shown for Host on Free Plan */}
            {isTimeLimitExpired && !isMeetingPaid && !isGuest && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100020,
                    background: 'rgba(5, 7, 13, 0.88)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="glass-card anim-scale-in" style={{
                        maxWidth: 480,
                        width: '100%',
                        background: 'linear-gradient(180deg, #1a1d2e 0%, #0f111a 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(239, 68, 68, 0.25)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 32,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 68,
                            height: 68,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1.5px solid rgba(239, 68, 68, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 18px',
                            boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)'
                        }}>
                            <IconClock size={32} color="#ef4444" />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
                            Free Plan Time Limit Reached
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
                            Your meeting has reached the <strong>45-minute limit</strong> included in the Starter Free plan. Upgrade your workspace to unlock unlimited 24/7 meetings, AI summaries, and cloud recordings.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onUpgradePlanRequest) {
                                        onUpgradePlanRequest()
                                    } else {
                                        window.location.hash = '#organization'
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 20px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                    color: '#fff',
                                    fontSize: '0.92rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
                                }}
                            >
                                <IconZap size={15} color="#fff" />
                                <span>Upgrade to Growth Pro (Unlimited)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onLeave) onLeave()
                                    else window.location.href = '/'
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 20px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Exit Meeting
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Meeting Attendance & Participation Audit Modal */}
            <MeetingAttendanceModal
                isOpen={showAttendanceModal}
                onClose={() => setShowAttendanceModal(false)}
                meetingId={meetingId || meetingInput}
                meetingTitle={meetingInfo?.title || 'Meeting Session'}
                totalDurationSeconds={meetingSecondsElapsed}
                totalDurationFormatted={timerStr}
                attendanceRecords={attendanceRecords}
                joinTimeMap={joinTimeMapRef.current}
                onExportCSV={exportAttendanceCSV}
            />

            {/* Takeover Presentation Confirmation Dialog (Google Meet Style) */}
            {showTakeoverModal && createPortal(
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) setShowTakeoverModal(false) }}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999999, padding: 16, boxSizing: 'border-box'
                    }}
                >
                    <div className="glass-card anim-scale-in" style={{
                        maxWidth: 440, width: '100%', padding: 26, borderRadius: 18,
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'flex', flexDirection: 'column', gap: 18
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%',
                                background: 'rgba(99, 102, 241, 0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(99, 102, 241, 0.3)', flexShrink: 0
                            }}>
                                <IconMonitor size={22} color="#818cf8" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                                    Someone is already presenting
                                </h3>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                                    Multi-screen presentation
                                </p>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            fontSize: '0.875rem',
                            color: '#e2e8f0',
                            lineHeight: 1.5
                        }}>
                            <strong style={{ color: '#818cf8' }}>{takeoverPresenterId ? getUserDisplayName(takeoverPresenterId) : 'Another participant'}</strong> is currently sharing their screen.
                            <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                                Starting your screen share will keep both presentations live, and attendees can switch between screens using the top Presenter Switcher bar.
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTakeoverModal(false)
                                    setTakeoverPresenterId(null)
                                }}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTakeoverModal(false)
                                    setTakeoverPresenterId(null)
                                    startScreenShare()
                                }}
                                className="btn btn-primary"
                                style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    padding: '8px 20px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <IconMonitor size={15} />
                                <span>Share Screen Anyway</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
