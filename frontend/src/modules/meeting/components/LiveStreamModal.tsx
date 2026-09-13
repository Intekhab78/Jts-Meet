import React, { useState, useEffect } from 'react'

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

const PLATFORM_DEFAULTS = {
    youtube: {
        name: 'YouTube Live',
        icon: '▶️',
        color: '#ef4444',
        defaultUrl: 'rtmp://a.rtmp.youtube.com/live2',
        guide: 'Get your Stream Key from YouTube Studio > Go Live > Stream Key'
    },
    facebook: {
        name: 'Facebook Live',
        icon: '🌐',
        color: '#3b82f6',
        defaultUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
        guide: 'Get your Stream Key from Facebook Live Producer > Stream Setup'
    },
    twitch: {
        name: 'Twitch',
        icon: '👾',
        color: '#a855f7',
        defaultUrl: 'rtmp://live.twitch.tv/app/',
        guide: 'Get your Stream Key from Twitch Creator Dashboard > Settings > Stream'
    },
    custom: {
        name: 'Custom RTMP / CDN',
        icon: '📡',
        color: '#10b981',
        defaultUrl: 'rtmp://',
        guide: 'Enter any custom RTMP/RTMPS ingest endpoint from OBS, Restream, or your CDN'
    }
}

export function LiveStreamModal({
    isOpen,
    onClose,
    isLive,
    liveConfig,
    onStartStream,
    onStopStream,
    meetingTitle = 'Enterprise Conference Session'
}: LiveStreamModalProps) {
    const [platform, setPlatform] = useState<'youtube' | 'facebook' | 'twitch' | 'custom'>('youtube')
    const [serverUrl, setServerUrl] = useState(PLATFORM_DEFAULTS.youtube.defaultUrl)
    const [streamKey, setStreamKey] = useState('')
    const [broadcastTitle, setBroadcastTitle] = useState(meetingTitle)
    const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('1080p')
    const [bitrate, setBitrate] = useState<number>(4500)
    const [showKey, setShowKey] = useState(false)
    const [liveTimerSeconds, setLiveTimerSeconds] = useState(0)

    useEffect(() => {
        if (!isLive) {
            setServerUrl(PLATFORM_DEFAULTS[platform].defaultUrl)
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

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault()
        if (!streamKey.trim() && platform !== 'custom') {
            alert('Please provide a valid Stream Key for ' + PLATFORM_DEFAULTS[platform].name)
            return
        }
        onStartStream({
            platform,
            serverUrl: serverUrl.trim(),
            streamKey: streamKey.trim(),
            broadcastTitle: broadcastTitle.trim() || meetingTitle,
            resolution,
            bitrate
        })
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 20,
                width: '100%',
                maxWidth: 580,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2)',
                color: '#fff',
                overflow: 'hidden',
                animation: 'scaleUp 0.25s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: isLive 
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                                : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            boxShadow: isLive ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none'
                        }}>
                            {isLive ? '🔴' : '📡'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                                    RTMP Live Streaming Studio
                                </h3>
                                {isLive && (
                                    <span style={{
                                        background: '#ef4444',
                                        color: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.05em',
                                        animation: 'pulse 1.5s infinite'
                                    }}>
                                        ON AIR • {formatTimer(liveTimerSeconds)}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                                Broadcast live conference directly to YouTube, Facebook, or custom RTMP ingest
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            padding: 4
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: 24 }}>
                    {isLive ? (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 14,
                            padding: 20,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 14
                        }}>
                            <div style={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '2px solid #ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.8rem',
                                animation: 'pulse 2s infinite'
                            }}>
                                🔴
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#fca5a5' }}>
                                    Live Broadcast in Progress
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1' }}>
                                    Target: <strong>{PLATFORM_DEFAULTS[liveConfig?.platform || 'youtube'].name}</strong> ({liveConfig?.resolution} • {liveConfig?.bitrate} kbps)
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    Live Duration: <strong style={{ color: '#fff' }}>{formatTimer(liveTimerSeconds)}</strong>
                                </p>
                            </div>

                            <button
                                onClick={onStopStream}
                                style={{
                                    marginTop: 6,
                                    padding: '12px 28px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                    border: 'none',
                                    borderRadius: 10,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <span>⏹️</span>
                                <span>End Live Stream</span>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* Platform Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                                    Choose Streaming Destination:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {(['youtube', 'facebook', 'twitch', 'custom'] as const).map(p => {
                                        const isSelected = platform === p
                                        const info = PLATFORM_DEFAULTS[p]
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPlatform(p)}
                                                style={{
                                                    padding: '10px 6px',
                                                    borderRadius: 10,
                                                    border: isSelected ? `2px solid ${info.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                                                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                    color: isSelected ? '#fff' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem' }}>{info.icon}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{info.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Stream Server URL */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                    Stream RTMP Server URL:
                                </label>
                                <input
                                    type="text"
                                    value={serverUrl}
                                    onChange={(e) => setServerUrl(e.target.value)}
                                    placeholder="rtmp://a.rtmp.youtube.com/live2"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#fff',
                                        fontSize: '0.88rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Stream Key */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>
                                        Stream Key (Private):
                                    </label>
                                    <span style={{ fontSize: '0.72rem', color: '#6366f1', fontStyle: 'italic' }}>
                                        {PLATFORM_DEFAULTS[platform].guide}
                                    </span>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={streamKey}
                                        onChange={(e) => setStreamKey(e.target.value)}
                                        placeholder="xxxx-xxxx-xxxx-xxxx"
                                        required
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 42px 10px 14px',
                                            borderRadius: 10,
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: '#fff',
                                            fontSize: '0.88rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        style={{
                                            position: 'absolute',
                                            right: 10,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        {showKey ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            {/* Quality & Resolution Settings */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                        Broadcast Quality:
                                    </label>
                                    <select
                                        value={resolution}
                                        onChange={(e) => {
                                            const r = e.target.value as any
                                            setResolution(r)
                                            if (r === '1080p') setBitrate(4500)
                                            else if (r === '720p') setBitrate(2500)
                                            else setBitrate(1200)
                                        }}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            background: '#1e293b',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: '#fff',
                                            fontSize: '0.88rem',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="1080p">1080p Full HD (60 FPS)</option>
                                        <option value="720p">720p HD (30 FPS)</option>
                                        <option value="480p">480p SD (Low Bandwidth)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                        Bitrate ({bitrate} kbps):
                                    </label>
                                    <input
                                        type="range"
                                        min={800}
                                        max={8000}
                                        step={100}
                                        value={bitrate}
                                        onChange={(e) => setBitrate(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: '#6366f1', marginTop: 10 }}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 10,
                                        color: '#cbd5e1',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 2,
                                        padding: '12px',
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        border: 'none',
                                        borderRadius: 10,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8
                                    }}
                                >
                                    <span>🔴</span>
                                    <span>Go Live ({PLATFORM_DEFAULTS[platform].name})</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
