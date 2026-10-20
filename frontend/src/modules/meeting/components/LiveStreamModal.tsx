import React, { useState, useEffect } from 'react'
import {
    IconVideo,
    IconZap,
    IconX,
    IconLock,
    IconSquare,
    IconPlay,
    IconMonitor,
    IconShieldCheck,
    IconMic,
    IconCopy,
    IconCheck,
    IconExternalLink,
    IconGlobe
} from '../../../components/common/Icons'

export interface LiveStreamConfig {
    platform: 'youtube' | 'facebook' | 'twitch' | 'custom'
    serverUrl: string
    streamKey: string
    broadcastTitle: string
    resolution: '1080p' | '720p' | '480p'
    bitrate: number
}

interface LiveStreamModalProps {
    isOpen: boolean
    onClose: () => void
    isLive: boolean
    liveConfig: LiveStreamConfig | null
    onStartStream: (config: LiveStreamConfig) => void
    onStopStream: () => void
    meetingTitle?: string
    previewStream?: MediaStream | null
    isStandby?: boolean
    onToggleStandby?: () => void
    layoutMode?: 'auto' | 'spotlight' | 'grid' | 'pip'
    onChangeLayoutMode?: (mode: 'auto' | 'spotlight' | 'grid' | 'pip') => void
    tickerText?: string
    showTicker?: boolean
    onToggleTicker?: () => void
    onChangeTickerText?: (text: string) => void
    addToast?: (msg: string, type?: any) => void
}

// Official Platform Brand SVGs
const YouTubeBrandIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#FFFFFF" />
    </svg>
)

const FacebookBrandIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path d="M14.5 12.5H12.5V20H9.5V12.5H8V10H9.5V8.3C9.5 6.7 10.4 5.5 12.2 5.5C13 5.5 13.8 5.6 13.8 5.6V7.4H12.9C12 7.4 11.7 8 11.7 8.8V10H14.3L13.9 12.5H14.5Z" fill="#FFFFFF" />
    </svg>
)

const TwitchBrandIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#9146FF" />
        <path d="M6 5L5 8.5V18H8.5V20.5L11 18H13.5L18 13.5V5H6ZM16.5 12.5L14.5 14.5H12L10 16.5V14.5H7.5V6.5H16.5V12.5Z" fill="#FFFFFF" />
        <rect x="13" y="8.5" width="2" height="4" fill="#FFFFFF" />
        <rect x="9.5" y="8.5" width="2" height="4" fill="#FFFFFF" />
    </svg>
)

const CustomRtmpBrandIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#10B981" />
        <path d="M13 3L4 14H11L10 21L19 10H12L13 3Z" fill="#FFFFFF" />
    </svg>
)

const PLATFORMS = {
    youtube: {
        id: 'youtube' as const,
        name: 'YouTube',
        brandIcon: <YouTubeBrandIcon size={24} />,
        accentColor: '#FF0000',
        activeGlow: 'rgba(255, 0, 0, 0.35)',
        defaultUrl: 'rtmp://a.rtmp.youtube.com/live2',
        portalUrl: 'https://www.youtube.com/livestreaming'
    },
    facebook: {
        id: 'facebook' as const,
        name: 'Facebook',
        brandIcon: <FacebookBrandIcon size={24} />,
        accentColor: '#1877F2',
        activeGlow: 'rgba(24, 119, 242, 0.35)',
        defaultUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
        portalUrl: 'https://www.facebook.com/live/producer'
    },
    twitch: {
        id: 'twitch' as const,
        name: 'Twitch',
        brandIcon: <TwitchBrandIcon size={24} />,
        accentColor: '#9146FF',
        activeGlow: 'rgba(145, 70, 255, 0.35)',
        defaultUrl: 'rtmp://live.twitch.tv/app/',
        portalUrl: 'https://dashboard.twitch.tv/settings/stream'
    },
    custom: {
        id: 'custom' as const,
        name: 'Custom',
        brandIcon: <CustomRtmpBrandIcon size={24} />,
        accentColor: '#10B981',
        activeGlow: 'rgba(16, 185, 129, 0.35)',
        defaultUrl: 'rtmp://',
        portalUrl: ''
    }
}

// Dedicated Professional SVG Vector Icons for Live Broadcast Studio Console
const IconSparkleWand: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
)

const IconSoloUser: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 18c0-2.5 2.5-4 5-4s5 1.5 5 4" />
    </svg>
)

const IconGridTiles: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
)

const IconPipBox: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <rect x="12" y="11" width="7" height="7" rx="1.5" fill={color} fillOpacity="0.25" />
    </svg>
)

const IconMegaphone: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l15-7v16L3 13v-2z" />
        <path d="M11.6 16.8L14 21h3l-2.5-5" />
        <path d="M18 8a5 5 0 0 1 0 8" />
    </svg>
)

const IconBroadcastTower: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
        <path d="M7.76 7.76a6 6 0 0 1 8.48 0" />
        <circle cx="12" cy="12" r="2" fill={color} />
        <path d="M12 14v7" />
        <path d="M9 21h6" />
    </svg>
)

const IconPauseSlate: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="5" width="4" height="14" rx="1" fill={color} />
        <rect x="14" y="5" width="4" height="14" rx="1" fill={color} />
    </svg>
)

const IconPlaySlate: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="6 4 20 12 6 20 6 4" fill={color} />
    </svg>
)

const IconStopSquare: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="5" width="14" height="14" rx="2" fill={color} />
    </svg>
)

const IconInfoPill: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
)

const IconVolume2: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
)

const IconLiveChat: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <circle cx="9" cy="10" r="1" fill={color} />
        <circle cx="12" cy="10" r="1" fill={color} />
        <circle cx="15" cy="10" r="1" fill={color} />
    </svg>
)

// Universal robust copy function with fallback for non-secure HTTP contexts / local network IPs
const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false
    try {
        if (navigator?.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch (_) {}

    try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        return success
    } catch (_) {
        return false
    }
}

export function LiveStreamModal({
    isOpen,
    onClose,
    isLive,
    liveConfig,
    onStartStream,
    onStopStream,
    meetingTitle = 'Live Conference Stream',
    previewStream,
    isStandby = false,
    onToggleStandby,
    layoutMode = 'auto',
    onChangeLayoutMode,
    tickerText,
    showTicker = false,
    onToggleTicker,
    onChangeTickerText,
    addToast
}: LiveStreamModalProps) {
    const [platform, setPlatform] = useState<'youtube' | 'facebook' | 'twitch' | 'custom'>('youtube')
    const [serverUrl, setServerUrl] = useState(PLATFORMS.youtube.defaultUrl)
    const [streamKey, setStreamKey] = useState('')
    const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('720p')
    const [bitrate, setBitrate] = useState<number>(2500)
    const [showKey, setShowKey] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [copiedWatchUrl, setCopiedWatchUrl] = useState(false)
    const [liveTimerSeconds, setLiveTimerSeconds] = useState(0)
    const [confirmingStop, setConfirmingStop] = useState(false)
    const [localTickerInput, setLocalTickerInput] = useState(tickerText || '🔴 Live Conference Broadcast • Q&A Session Active')
    const videoPreviewRef = React.useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        if (tickerText) {
            setLocalTickerInput(tickerText)
        }
    }, [tickerText])

    useEffect(() => {
        if (videoPreviewRef.current && previewStream) {
            videoPreviewRef.current.srcObject = previewStream
            videoPreviewRef.current.play().catch(() => {})
        }
    }, [previewStream, isLive, isOpen])

    const getPlatformDashboardUrl = () => {
        const plat = liveConfig?.platform || platform
        if (plat === 'youtube') return 'https://www.youtube.com/livestreaming'
        if (plat === 'facebook') return 'https://www.facebook.com/live/producer'
        if (plat === 'twitch') return 'https://dashboard.twitch.tv/stream-manager'
        return liveConfig?.serverUrl || serverUrl || 'https://www.youtube.com/livestreaming'
    }

    const getPlatformWatchUrl = () => {
        const plat = liveConfig?.platform || platform
        if (plat === 'youtube') return 'https://www.youtube.com/live'
        if (plat === 'facebook') return 'https://www.facebook.com/watch/live/'
        if (plat === 'twitch') return 'https://www.twitch.tv/'
        return ''
    }

    const handleOpenStudio = (e?: React.MouseEvent) => {
        if (e) e.preventDefault()
        const url = getPlatformDashboardUrl()
        window.open(url, '_blank', 'noopener')
    }

    const handleOpenWatch = (e?: React.MouseEvent) => {
        if (e) e.preventDefault()
        const url = getPlatformWatchUrl()
        if (url) {
            window.open(url, '_blank', 'noopener')
        }
    }

    const handleCopyRtmpUrl = async () => {
        const base = (liveConfig?.serverUrl || serverUrl || '').trim()
        const key = (liveConfig?.streamKey || streamKey || '').trim()
        const fullUrl = key ? (base.endsWith('/') ? `${base}${key}` : `${base}/${key}`) : base
        const success = await copyTextToClipboard(fullUrl || base)
        if (success) {
            setCopiedUrl(true)
            addToast?.('RTMP URL copied! (Note: RTMP links play in VLC/OBS; use "Open Studio" to view in browser)', 'info')
            setTimeout(() => setCopiedUrl(false), 2500)
        } else {
            addToast?.('Failed to copy to clipboard', 'error')
        }
    }

    const handleCopyWatchUrl = async () => {
        const url = getPlatformWatchUrl()
        if (!url) return
        const success = await copyTextToClipboard(url)
        if (success) {
            setCopiedWatchUrl(true)
            addToast?.('Public Live Stream link copied to clipboard!', 'success')
            setTimeout(() => setCopiedWatchUrl(false), 2500)
        } else {
            addToast?.('Failed to copy to clipboard', 'error')
        }
    }

    const TICKER_PRESETS = [
        { label: 'Welcome ✨', text: 'Welcome to the Live Stream • Drop your comments below!' },
        { label: 'Live Q&A ❓', text: 'Live Q&A Session Active • Ask your questions in Chat' },
        { label: 'Announcement 📢', text: 'Important: Session recording & slides will be shared' }
    ]

    const handleApplyPreset = (text: string) => {
        setLocalTickerInput(text)
        onChangeTickerText?.(text)
        if (!showTicker) {
            onToggleTicker?.()
        }
        addToast?.('Live ticker preset applied & activated!', 'success')
    }

    const handleOpenLiveChat = () => {
        const plat = liveConfig?.platform || platform
        if (plat === 'youtube') {
            window.open('https://studio.youtube.com/channel/live/chat', '_blank', 'noopener,width=420,height=600')
        } else if (plat === 'twitch') {
            window.open('https://www.twitch.tv/popout/chat', '_blank', 'noopener,width=420,height=600')
        } else {
            handleOpenStudio()
        }
    }

    useEffect(() => {
        if (!isLive) {
            setServerUrl(PLATFORMS[platform].defaultUrl)
        }
    }, [platform, isLive])

    useEffect(() => {
        let interval: any
        if (isLive) {
            interval = setInterval(() => {
                setLiveTimerSeconds(prev => prev + 1)
            }, 1000)
        } else {
            setLiveTimerSeconds(0)
        }
        return () => clearInterval(interval)
    }, [isLive])

    if (!isOpen) return null

    const formatTimer = (totalSecs: number) => {
        const hrs = Math.floor(totalSecs / 3600)
        const mins = Math.floor((totalSecs % 3600) / 60)
        const secs = totalSecs % 60
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handlePasteKey = async () => {
        try {
            if (navigator?.clipboard?.readText) {
                const clipText = await navigator.clipboard.readText()
                if (clipText) {
                    setStreamKey(clipText.trim())
                    return
                }
            }
        } catch (_) {}
    }

    const handleCopyUrl = async () => {
        const success = await copyTextToClipboard(serverUrl)
        if (success) {
            setCopiedUrl(true)
            setTimeout(() => setCopiedUrl(false), 2000)
        }
    }

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault()
        if (!streamKey.trim() && platform !== 'custom') {
            alert('Please paste a stream key for ' + PLATFORMS[platform].name)
            return
        }
        onStartStream({
            platform,
            serverUrl: serverUrl.trim(),
            streamKey: streamKey.trim(),
            broadcastTitle: meetingTitle,
            resolution,
            bitrate
        })
    }

    const activePlatform = PLATFORMS[liveConfig?.platform || platform]

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(5, 8, 16, 0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <style>{`
                @keyframes pulseDot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.35; transform: scale(0.85); }
                }
                @keyframes waveBar1 { 0%, 100% { height: 6px; } 50% { height: 24px; } }
                @keyframes waveBar2 { 0%, 100% { height: 18px; } 50% { height: 8px; } }
                @keyframes waveBar3 { 0%, 100% { height: 10px; } 50% { height: 28px; } }
                @keyframes waveBar4 { 0%, 100% { height: 24px; } 50% { height: 12px; } }
                @keyframes vuPulse1 { 0%, 100% { opacity: 0.95; } 50% { opacity: 0.35; } }
                @keyframes vuPulse2 { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                @keyframes vuPulse3 { 0%, 100% { opacity: 0.85; } 50% { opacity: 0.25; } }
                @media (min-width: 720px) {
                    .broadcast-studio-horizontal-grid {
                        display: grid !important;
                        grid-template-columns: 1.08fr 0.92fr !important;
                        gap: 16px !important;
                        align-items: stretch !important;
                    }
                }
                @media (max-width: 719px) {
                    .broadcast-studio-horizontal-grid {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 14px !important;
                    }
                }
            `}</style>

            <div style={{
                background: 'linear-gradient(180deg, #0b1120 0%, #060913 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 24,
                width: '100%',
                maxWidth: isLive ? 840 : 480,
                maxHeight: '94vh',
                overflowY: 'auto',
                boxShadow: isLive 
                    ? '0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(239, 68, 68, 0.25)' 
                    : '0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 40px rgba(99, 102, 241, 0.18)',
                color: '#fff',
                animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header with Icon */}
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: isLive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            border: isLive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isLive ? '0 0 14px rgba(239, 68, 68, 0.35)' : 'none'
                        }}>
                            {isLive ? <IconVideo size={17} color="#ef4444" /> : <IconZap size={17} color="#818cf8" />}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                                    Broadcast Studio
                                </h3>
                                {isLive && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: 'rgba(239, 68, 68, 0.18)',
                                        border: '1px solid rgba(239, 68, 68, 0.5)',
                                        color: '#f87171',
                                        padding: '1px 7px',
                                        borderRadius: 20,
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.04em'
                                    }}>
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: '#ef4444',
                                            boxShadow: '0 0 8px #ef4444',
                                            animation: 'pulseDot 1.2s infinite'
                                        }} />
                                        <span>LIVE • {formatTimer(liveTimerSeconds)}</span>
                                    </div>
                                )}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                RTMP / RTMPS Live Output Engine
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                            e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                            e.currentTarget.style.color = '#94a3b8'
                        }}
                    >
                        <IconX size={15} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '14px 18px' }}>
                    {isLive ? (
                        /* Horizontal 2-Column Broadcast Studio (Fits without scrolling) */
                        <div className="broadcast-studio-horizontal-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: '1.08fr 0.92fr',
                            gap: 16,
                            alignItems: 'stretch'
                        }}>
                            {/* LEFT COLUMN: Program Monitor & Quick Studio Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {/* 1. Live Program Monitor */}
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '16 / 9',
                                    background: '#020617',
                                    borderRadius: 14,
                                    overflow: 'hidden',
                                    border: isStandby ? '1.5px solid rgba(245, 158, 11, 0.7)' : '1.5px solid rgba(239, 68, 68, 0.45)',
                                    boxShadow: isStandby ? '0 0 24px rgba(245, 158, 11, 0.2)' : '0 0 24px rgba(239, 68, 68, 0.22)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {isStandby ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 12, textAlign: 'center' }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#f59e0b',
                                                boxShadow: '0 0 14px rgba(245, 158, 11, 0.3)'
                                            }}>
                                                <IconPauseSlate size={16} color="#f59e0b" />
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.04em' }}>
                                                STANDBY MODE ACTIVE
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: 280 }}>
                                                Video & Mic paused on stream • Connected to {activePlatform.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            {previewStream && previewStream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled) ? (
                                                <video
                                                    ref={videoPreviewRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ transform: 'scale(1.1)' }}>{activePlatform.brandIcon}</div>
                                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 18 }}>
                                                        <span style={{ width: 3, background: '#ef4444', borderRadius: 2, animation: 'waveBar1 0.7s infinite ease-in-out' }} />
                                                        <span style={{ width: 3, background: '#f87171', borderRadius: 2, animation: 'waveBar2 0.85s infinite ease-in-out' }} />
                                                        <span style={{ width: 3, background: '#ef4444', borderRadius: 2, animation: 'waveBar3 0.65s infinite ease-in-out' }} />
                                                        <span style={{ width: 3, background: '#fca5a5', borderRadius: 2, animation: 'waveBar4 0.9s infinite ease-in-out' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Live Broadcast Feed Active</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Top Left Program On-Air Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 8,
                                        left: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: isStandby ? 'rgba(245, 158, 11, 0.92)' : 'rgba(220, 38, 38, 0.92)',
                                        padding: '2px 7px',
                                        borderRadius: 6,
                                        fontSize: '0.64rem',
                                        fontWeight: 800,
                                        color: '#fff',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                                    }}>
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulseDot 1.2s infinite' }} />
                                        <span>{isStandby ? 'STANDBY' : 'PROGRAM • ON-AIR'}</span>
                                    </div>

                                    {/* Top Right Platform & Res Tag */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        padding: '2px 7px',
                                        borderRadius: 6,
                                        fontSize: '0.64rem',
                                        fontWeight: 700,
                                        color: '#cbd5e1'
                                    }}>
                                        <span>{activePlatform.name.toUpperCase()}</span>
                                        <span>•</span>
                                        <span style={{ color: '#38bdf8' }}>{liveConfig?.resolution || resolution}</span>
                                    </div>

                                    {/* Bottom Overlay Ticker Bar */}
                                    {showTicker && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: 24,
                                            background: 'rgba(11, 15, 25, 0.94)',
                                            borderTop: '1px solid rgba(239, 68, 68, 0.6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 8px',
                                            gap: 6,
                                            fontSize: '0.65rem',
                                            color: '#f8fafc',
                                            overflow: 'hidden'
                                        }}>
                                            <span style={{ background: '#ef4444', color: '#fff', fontWeight: 800, padding: '1px 4px', borderRadius: 3, fontSize: '0.55rem' }}>
                                                TICKER
                                            </span>
                                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {tickerText || localTickerInput}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Quick Studio Actions (3+2 Deck with Clean SVG Icons) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {/* Top Row: Navigation & Viewer Interaction */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                        {/* Open Studio */}
                                        <button
                                            type="button"
                                            onClick={handleOpenStudio}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5,
                                                padding: '7px 8px',
                                                borderRadius: 8,
                                                background: 'rgba(56, 189, 248, 0.12)',
                                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                                color: '#38bdf8',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Open verified YouTube Live Control Room"
                                        >
                                            <IconExternalLink size={12} color="#38bdf8" />
                                            <span>Studio ↗</span>
                                        </button>

                                        {/* Live Chat Popout */}
                                        <button
                                            type="button"
                                            onClick={handleOpenLiveChat}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5,
                                                padding: '7px 8px',
                                                borderRadius: 8,
                                                background: 'rgba(168, 85, 247, 0.12)',
                                                border: '1px solid rgba(168, 85, 247, 0.35)',
                                                color: '#c084fc',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Open YouTube Live Chat popout window"
                                        >
                                            <IconLiveChat size={12} color="#c084fc" />
                                            <span>Live Chat 💬</span>
                                        </button>

                                        {/* Watch Live */}
                                        <button
                                            type="button"
                                            onClick={handleOpenWatch}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5,
                                                padding: '7px 8px',
                                                borderRadius: 8,
                                                background: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                color: '#f87171',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Open public YouTube stream viewing page"
                                        >
                                            <IconBroadcastTower size={12} color="#ef4444" />
                                            <span>Watch Live ↗</span>
                                        </button>
                                    </div>

                                    {/* Bottom Row: Feed Transmission Controls */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                                        {/* Copy RTMP */}
                                        <button
                                            type="button"
                                            onClick={handleCopyRtmpUrl}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5,
                                                padding: '7px 10px',
                                                borderRadius: 8,
                                                background: copiedUrl ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                                border: copiedUrl ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255, 255, 255, 0.09)',
                                                color: copiedUrl ? '#4ade80' : '#e2e8f0',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Copy RTMP server ingest URL to clipboard"
                                        >
                                            {copiedUrl ? <IconCheck size={12} color="#4ade80" /> : <IconCopy size={12} color="#94a3b8" />}
                                            <span>{copiedUrl ? 'Copied! ✅' : 'Copy RTMP URL'}</span>
                                        </button>

                                        {/* Standby / Resume */}
                                        <button
                                            type="button"
                                            onClick={onToggleStandby}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5,
                                                padding: '7px 10px',
                                                borderRadius: 8,
                                                background: isStandby ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                                                border: isStandby ? '1px solid rgba(245, 158, 11, 0.55)' : '1px solid rgba(255, 255, 255, 0.09)',
                                                color: isStandby ? '#fbbf24' : '#e2e8f0',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title={isStandby ? 'Resume live broadcast camera & mic' : 'Pause broadcast video and mic (show Standby card)'}
                                        >
                                            {isStandby ? <IconPlaySlate size={11} color="#fbbf24" /> : <IconPauseSlate size={11} color="#94a3b8" />}
                                            <span>{isStandby ? 'Resume Feed' : 'Standby Feed'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Compact Quick Tip Pill */}
                                <div style={{
                                    background: 'rgba(56, 189, 248, 0.04)',
                                    border: '1px solid rgba(56, 189, 248, 0.14)',
                                    borderRadius: 9,
                                    padding: '6px 10px',
                                    fontSize: '0.69rem',
                                    color: '#94a3b8',
                                    lineHeight: 1.35,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <IconInfoPill size={13} color="#38bdf8" />
                                    <span>
                                        <strong style={{ color: '#38bdf8' }}>Tip:</strong> Browser me stream dekhne ke liye <strong style={{ color: '#e2e8f0' }}>"Studio"</strong> ya <strong style={{ color: '#f87171' }}>"Watch Live"</strong> use karein.
                                    </span>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Studio Switcher Control Deck (Snug & Zero Dead Gaps) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {/* 1. Scene Layout Selector */}
                                <div style={{
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.015) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 11,
                                    padding: '8px 11px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <IconGridTiles size={12} color="#38bdf8" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                                            BROADCAST SCENE LAYOUT
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                                        {[
                                            { id: 'auto' as const, label: 'Auto', icon: (c: string) => <IconSparkleWand size={12} color={c} /> },
                                            { id: 'spotlight' as const, label: 'Solo', icon: (c: string) => <IconSoloUser size={12} color={c} /> },
                                            { id: 'grid' as const, label: 'Grid', icon: (c: string) => <IconGridTiles size={12} color={c} /> },
                                            { id: 'pip' as const, label: 'PiP', icon: (c: string) => <IconPipBox size={12} color={c} /> }
                                        ].map(opt => {
                                            const isSelected = (layoutMode || 'auto') === opt.id
                                            const iconColor = isSelected ? '#38bdf8' : '#94a3b8'
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => onChangeLayoutMode?.(opt.id)}
                                                    style={{
                                                        padding: '6px 4px',
                                                        borderRadius: 6,
                                                        background: isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                                                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.65)' : '1px solid rgba(255, 255, 255, 0.07)',
                                                        color: isSelected ? '#38bdf8' : '#94a3b8',
                                                        fontSize: '0.71rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 4,
                                                        transition: 'all 0.15s ease',
                                                        boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.2)' : 'none'
                                                    }}
                                                >
                                                    {opt.icon(iconColor)}
                                                    <span>{opt.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 2. Lower-Third Ticker Editor with One-Click Headline Presets */}
                                <div style={{
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.015) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 11,
                                    padding: '8px 11px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <IconMegaphone size={13} color="#f87171" />
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0' }}>
                                                Live Lower-Third Ticker
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onToggleTicker}
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: 14,
                                                background: showTicker ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
                                                border: showTicker ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                                                color: '#fff',
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {showTicker ? 'ACTIVE' : 'OFF'}
                                        </button>
                                    </div>

                                    {/* Ticker Input Row */}
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        <input
                                            type="text"
                                            value={localTickerInput}
                                            onChange={(e) => setLocalTickerInput(e.target.value)}
                                            placeholder="Enter broadcast ticker headline..."
                                            style={{
                                                flex: 1,
                                                background: 'rgba(15, 23, 42, 0.75)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: 6,
                                                padding: '5px 8px',
                                                color: '#fff',
                                                fontSize: '0.72rem',
                                                opacity: showTicker ? 1 : 0.65
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChangeTickerText?.(localTickerInput)
                                                addToast?.('Broadcast ticker updated!', 'success')
                                            }}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                background: 'rgba(59, 130, 246, 0.25)',
                                                border: '1px solid rgba(59, 130, 246, 0.5)',
                                                color: '#60a5fa',
                                                fontSize: '0.71rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </div>

                                    {/* One-Click Headline Presets */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>PRESETS:</span>
                                        {TICKER_PRESETS.map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleApplyPreset(p.text)}
                                                style={{
                                                    padding: '2px 7px',
                                                    borderRadius: 5,
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    color: '#cbd5e1',
                                                    fontSize: '0.64rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'
                                                    e.currentTarget.style.color = '#38bdf8'
                                                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                                                    e.currentTarget.style.color = '#cbd5e1'
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                                }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Stream Master Audio & Stereo LED VU Meter Deck */}
                                <div style={{
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.015) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 11,
                                    padding: '7px 11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <IconVolume2 size={13} color="#38bdf8" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                                            STREAM MASTER AUDIO
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                                            {['#22c55e', '#22c55e', '#22c55e', '#22c55e', '#22c55e', '#eab308', '#eab308', '#ef4444'].map((col, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        width: 3.5,
                                                        height: 11,
                                                        borderRadius: 1,
                                                        background: isStandby ? '#334155' : col,
                                                        opacity: isStandby ? 0.25 : (idx < 6 ? 1 : 0.35),
                                                        animation: isStandby ? 'none' : `vuPulse${(idx % 3) + 1} 0.${5 + (idx % 3) * 2}s infinite ease-in-out`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span style={{
                                            fontSize: '0.64rem',
                                            fontWeight: 800,
                                            color: isStandby ? '#94a3b8' : '#22c55e',
                                            letterSpacing: '0.02em',
                                            minWidth: 40,
                                            textAlign: 'right'
                                        }}>
                                            {isStandby ? 'MUTED' : '-6 dB'}
                                        </span>
                                    </div>
                                </div>

                                {/* 4. Telemetry Status Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.025)',
                                        border: '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: 9,
                                        padding: '6px 4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <IconZap size={12} color="#eab308" />
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                            {liveConfig?.bitrate || bitrate}k
                                        </span>
                                        <span style={{ fontSize: '0.56rem', color: '#64748b' }}>BITRATE</span>
                                    </div>

                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.025)',
                                        border: '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: 9,
                                        padding: '6px 4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <IconMonitor size={12} color="#38bdf8" />
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                            {liveConfig?.resolution || resolution}
                                        </span>
                                        <span style={{ fontSize: '0.56rem', color: '#64748b' }}>30 FPS</span>
                                    </div>

                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.025)',
                                        border: '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: 9,
                                        padding: '6px 4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <IconMic size={12} color="#c084fc" />
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>AAC</span>
                                        <span style={{ fontSize: '0.56rem', color: '#64748b' }}>44.1 kHz</span>
                                    </div>

                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.025)',
                                        border: '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: 9,
                                        padding: '6px 4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <IconShieldCheck size={12} color="#22c55e" />
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#22c55e' }}>100%</span>
                                        <span style={{ fontSize: '0.56rem', color: '#64748b' }}>HEALTH</span>
                                    </div>
                                </div>

                                {/* 5. End Stream Button */}
                                {confirmingStop ? (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        borderRadius: 10,
                                        padding: '8px 11px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <IconStopSquare size={12} color="#f87171" />
                                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fca5a5' }}>
                                                End live broadcast now?
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setConfirmingStop(false)
                                                    onStopStream()
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '7px',
                                                    borderRadius: 6,
                                                    background: '#ef4444',
                                                    border: 'none',
                                                    color: '#fff',
                                                    fontWeight: 800,
                                                    fontSize: '0.76rem',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                                                }}
                                            >
                                                Yes, End
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingStop(false)}
                                                style={{
                                                    flex: 1,
                                                    padding: '7px',
                                                    borderRadius: 6,
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                                    color: '#cbd5e1',
                                                    fontWeight: 700,
                                                    fontSize: '0.76rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingStop(true)}
                                        style={{
                                            width: '100%',
                                            padding: '9px',
                                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                            border: 'none',
                                            borderRadius: 9,
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.84rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <IconStopSquare size={13} color="#fff" />
                                        <span>End Broadcast</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Ultra-Clean Studio Setup Form (Minimal Text, Icon-Driven) */
                        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Destination Brand Selector with Real Icons */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                {(Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]).map(pKey => {
                                    const p = PLATFORMS[pKey]
                                    const isSelected = platform === pKey
                                    return (
                                        <button
                                            key={pKey}
                                            type="button"
                                            onClick={() => setPlatform(pKey)}
                                            style={{
                                                padding: '10px 6px',
                                                borderRadius: 14,
                                                border: isSelected ? `2px solid ${p.accentColor}` : '1px solid rgba(255, 255, 255, 0.07)',
                                                background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                                color: isSelected ? '#fff' : '#64748b',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 6,
                                                boxShadow: isSelected ? `0 0 16px ${p.activeGlow}` : 'none',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {p.brandIcon}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                                {p.name}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Stream Server Info / URL Pill (Clean & Non-Intrusive) */}
                            {platform !== 'custom' ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    fontSize: '0.75rem',
                                    color: '#64748b'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                                        <IconGlobe size={14} color="#64748b" />
                                        <span style={{ fontFamily: 'monospace', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {serverUrl}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyUrl}
                                        title="Copy RTMP URL"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: copiedUrl ? '#22c55e' : '#94a3b8',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: 2
                                        }}
                                    >
                                        {copiedUrl ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="text"
                                        value={serverUrl}
                                        onChange={(e) => setServerUrl(e.target.value)}
                                        placeholder="rtmp://custom.server.com/live"
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            background: 'rgba(0, 0, 0, 0.5)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#fff',
                                            fontSize: '0.82rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Stream Key Input (Obsidian Dark Glass with Icons) */}
                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: 12,
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    padding: '0 8px 0 12px',
                                    transition: 'border 0.15s ease'
                                }}>
                                    <IconLock size={15} color="#64748b" />
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={streamKey}
                                        onChange={(e) => setStreamKey(e.target.value)}
                                        placeholder="Paste Stream Key..."
                                        required
                                        style={{
                                            flex: 1,
                                            padding: '11px 10px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '0.85rem',
                                            outline: 'none',
                                            fontFamily: showKey ? 'inherit' : 'monospace'
                                        }}
                                    />
                                    {/* Paste Icon Button */}
                                    <button
                                        type="button"
                                        onClick={handlePasteKey}
                                        title="Paste from clipboard"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 6,
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            padding: '5px 8px',
                                            marginRight: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        <IconCopy size={13} />
                                        <span>Paste</span>
                                    </button>

                                    {/* Eye Mask Icon Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        title={showKey ? 'Hide key' : 'Show key'}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: showKey ? '#818cf8' : '#64748b',
                                            cursor: 'pointer',
                                            padding: 4,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <IconLock size={15} />
                                    </button>
                                </div>

                                {/* External Key Link */}
                                {activePlatform.portalUrl && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                                        <a
                                            href={activePlatform.portalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '0.72rem',
                                                color: activePlatform.accentColor,
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontWeight: 600
                                            }}
                                        >
                                            <span>Get {activePlatform.name} Key</span>
                                            <IconExternalLink size={11} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Resolution & Bitrate Segmented Controls (Icons & Pills) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {/* Resolution Pills */}
                                <div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => { setResolution('720p'); setBitrate(2500); }}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: 10,
                                                border: resolution === '720p' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                                background: resolution === '720p' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                                color: resolution === '720p' ? '#38bdf8' : '#94a3b8',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5
                                            }}
                                        >
                                            <IconMonitor size={14} />
                                            <span>720p HD</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setResolution('1080p'); setBitrate(4500); }}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: 10,
                                                border: resolution === '1080p' ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                                background: resolution === '1080p' ? 'rgba(129, 140, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                                color: resolution === '1080p' ? '#818cf8' : '#94a3b8',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5
                                            }}
                                        >
                                            <IconMonitor size={14} />
                                            <span>1080p</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Bitrate Indicator */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 12px',
                                    borderRadius: 10,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <IconZap size={15} color="#eab308" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#eab308' }}>
                                            {bitrate} kbps
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {[2500, 4500].map(b => (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => setBitrate(b)}
                                                style={{
                                                    padding: '3px 6px',
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    background: bitrate === b ? '#eab308' : 'rgba(255, 255, 255, 0.08)',
                                                    color: bitrate === b ? '#000' : '#94a3b8',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {b === 2500 ? '2.5M' : '4.5M'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        flex: 1,
                                        padding: '11px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: 12,
                                        color: '#94a3b8',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 2,
                                        padding: '11px',
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        border: 'none',
                                        borderRadius: 12,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.92rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.45)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <IconPlay size={16} color="#fff" />
                                    <span>Go Live</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
