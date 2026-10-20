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
        portalUrl: 'https://studio.youtube.com/channel/live'
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

export function LiveStreamModal({
    isOpen,
    onClose,
    isLive,
    liveConfig,
    onStartStream,
    onStopStream,
    meetingTitle = 'Live Conference Stream'
}: LiveStreamModalProps) {
    const [platform, setPlatform] = useState<'youtube' | 'facebook' | 'twitch' | 'custom'>('youtube')
    const [serverUrl, setServerUrl] = useState(PLATFORMS.youtube.defaultUrl)
    const [streamKey, setStreamKey] = useState('')
    const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('720p')
    const [bitrate, setBitrate] = useState<number>(2500)
    const [showKey, setShowKey] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [liveTimerSeconds, setLiveTimerSeconds] = useState(0)

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
            const clipText = await navigator.clipboard.readText()
            if (clipText) {
                setStreamKey(clipText.trim())
            }
        } catch (_) {}
    }

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(serverUrl)
            setCopiedUrl(true)
            setTimeout(() => setCopiedUrl(false), 2000)
        } catch (_) {}
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
            `}</style>

            <div style={{
                background: 'linear-gradient(180deg, #0b1120 0%, #060913 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 24,
                width: '100%',
                maxWidth: 480,
                boxShadow: isLive 
                    ? '0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(239, 68, 68, 0.25)' 
                    : '0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 40px rgba(99, 102, 241, 0.18)',
                color: '#fff',
                overflow: 'hidden',
                animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header with Icon */}
                <div style={{
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: isLive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            border: isLive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isLive ? '0 0 14px rgba(239, 68, 68, 0.35)' : 'none'
                        }}>
                            {isLive ? <IconVideo size={18} color="#ef4444" /> : <IconZap size={18} color="#818cf8" />}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
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
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                RTMP / RTMPS Live Output
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: 30,
                            height: 30,
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
                <div style={{ padding: 22 }}>
                    {isLive ? (
                        /* Sleek Studio On-Air View (Pure Icon-Driven Telemetry) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* Visual Monitor Frame */}
                            <div style={{
                                background: 'radial-gradient(ellipse at top, rgba(239, 68, 68, 0.14) 0%, rgba(11, 17, 32, 0.7) 70%)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 16,
                                padding: '22px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 14
                            }}>
                                {/* Platform Brand Pill */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    border: `1px solid ${activePlatform.accentColor}`,
                                    padding: '6px 14px',
                                    borderRadius: 30,
                                    boxShadow: `0 0 20px ${activePlatform.activeGlow}`
                                }}>
                                    {activePlatform.brandIcon}
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                                        {activePlatform.name} Live
                                    </span>
                                </div>

                                {/* Dynamic Audio Waves */}
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 28 }}>
                                    <span style={{ width: 4, background: '#ef4444', borderRadius: 2, animation: 'waveBar1 0.7s infinite ease-in-out' }} />
                                    <span style={{ width: 4, background: '#f87171', borderRadius: 2, animation: 'waveBar2 0.85s infinite ease-in-out' }} />
                                    <span style={{ width: 4, background: '#fca5a5', borderRadius: 2, animation: 'waveBar3 0.65s infinite ease-in-out' }} />
                                    <span style={{ width: 4, background: '#ef4444', borderRadius: 2, animation: 'waveBar4 0.9s infinite ease-in-out' }} />
                                    <span style={{ width: 4, background: '#f87171', borderRadius: 2, animation: 'waveBar2 0.75s infinite ease-in-out' }} />
                                    <span style={{ width: 4, background: '#fca5a5', borderRadius: 2, animation: 'waveBar1 0.8s infinite ease-in-out' }} />
                                </div>

                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                    Active Conference Broadcast Stream
                                </span>
                            </div>

                            {/* Icon-Driven Telemetry Pills */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)',
                                    borderRadius: 12,
                                    padding: '10px 6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <IconZap size={16} color="#eab308" />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                        {liveConfig?.bitrate || bitrate}k
                                    </span>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>BITRATE</span>
                                </div>

                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)',
                                    borderRadius: 12,
                                    padding: '10px 6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <IconMonitor size={16} color="#38bdf8" />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                        {liveConfig?.resolution || resolution}
                                    </span>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>30 FPS</span>
                                </div>

                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)',
                                    borderRadius: 12,
                                    padding: '10px 6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <IconMic size={16} color="#c084fc" />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>AAC</span>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>44.1 kHz</span>
                                </div>

                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)',
                                    borderRadius: 12,
                                    padding: '10px 6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <IconShieldCheck size={16} color="#22c55e" />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22c55e' }}>100%</span>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>HEALTH</span>
                                </div>
                            </div>

                            {/* Stop Live Stream Button */}
                            <button
                                onClick={onStopStream}
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                    border: 'none',
                                    borderRadius: 12,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.92rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <IconSquare size={15} color="#fff" />
                                <span>End Stream</span>
                            </button>
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
