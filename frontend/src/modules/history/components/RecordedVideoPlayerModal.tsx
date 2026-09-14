import React, { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../../../config'
import {
    IconPlay,
    IconPause,
    IconX,
    IconCopy,
    IconCheck,
    IconDownload,
    IconCalendar,
    IconClock
} from '../../../components/common/Icons'

export interface RecordedVideoPlayerModalProps {
    meetingTitle: string
    meetingId: string
    recordingUrl: string
    recordingDate?: string
    recordingDuration?: number
    recordingSize?: number
    onClose: () => void
}

export function RecordedVideoPlayerModal({
    meetingTitle,
    meetingId,
    recordingUrl,
    recordingDate,
    recordingDuration = 0,
    recordingSize = 0,
    onClose
}: RecordedVideoPlayerModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(recordingDuration || 0)
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolume] = useState(1)
    const [copiedLink, setCopiedLink] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const playerContainerRef = useRef<HTMLDivElement>(null)

    // Build absolute URL if needed
    const resolvedVideoUrl = recordingUrl.startsWith('http') || recordingUrl.startsWith('blob:')
        ? recordingUrl
        : `${API_BASE}${recordingUrl.startsWith('/') ? '' : '/'}${recordingUrl}`

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isFullscreen && document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {})
                } else {
                    onClose()
                }
            } else if (e.key === ' ') {
                e.preventDefault()
                togglePlay()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFullscreen, onClose])

    const togglePlay = () => {
        if (!videoRef.current) return
        if (videoRef.current.paused) {
            videoRef.current.play()
            setIsPlaying(true)
        } else {
            videoRef.current.pause()
            setIsPlaying(false)
        }
    }

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (videoRef.current && videoRef.current.duration) {
            setDuration(videoRef.current.duration)
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value)
        setCurrentTime(newTime)
        if (videoRef.current) {
            videoRef.current.currentTime = newTime
        }
    }

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed)
        if (videoRef.current) {
            videoRef.current.playbackRate = speed
        }
    }

    const toggleMute = () => {
        if (!videoRef.current) return
        const nextMuted = !isMuted
        setIsMuted(nextMuted)
        videoRef.current.muted = nextMuted
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVol = parseFloat(e.target.value)
        setVolume(newVol)
        setIsMuted(newVol === 0)
        if (videoRef.current) {
            videoRef.current.volume = newVol
            videoRef.current.muted = newVol === 0
        }
    }

    const toggleFullscreen = () => {
        if (!playerContainerRef.current) return
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true)
            }).catch(() => {})
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false)
            }).catch(() => {})
        }
    }

    const handleCopyShareLink = () => {
        const shareUrl = `${window.location.origin}/#history?recording=${encodeURIComponent(meetingId)}`
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2500)
        }).catch(() => {})
    }

    const formatSeconds = (sec: number) => {
        if (isNaN(sec) || sec < 0) return '00:00'
        const m = Math.floor(sec / 60)
        const s = Math.floor(sec % 60)
        const mm = m < 10 ? `0${m}` : `${m}`
        const ss = s < 10 ? `0${s}` : `${s}`
        return `${mm}:${ss}`
    }

    const formatFileSize = (bytes: number) => {
        if (!bytes) return ''
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div
            className="modal-overlay anim-fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(5, 7, 12, 0.88)',
                backdropFilter: 'blur(16px)',
                zIndex: 9999999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '24px 16px',
                overflowY: 'auto',
                boxSizing: 'border-box'
            }}
            onClick={onClose}
        >
            <div
                ref={playerContainerRef}
                className="anim-scale-in"
                style={{
                    width: '100%',
                    maxWidth: 1040,
                    background: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border-bright, rgba(255,255,255,0.12))',
                    borderRadius: 'var(--radius-xl, 16px)',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100vh - 48px)',
                    marginBottom: 24
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Bar */}
                <div style={{
                    padding: '16px 22px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.4) 100%)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f87171',
                            flexShrink: 0
                        }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>REC</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {meetingTitle || 'Recorded Conference Session'}
                                </h3>
                                <span style={{
                                    fontSize: '0.6875rem',
                                    padding: '2px 8px',
                                    borderRadius: 9999,
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    color: '#818cf8',
                                    fontWeight: 700,
                                    border: '1px solid rgba(99, 102, 241, 0.35)'
                                }}>
                                    Cloud Stored
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 3, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {recordingDate && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <IconCalendar size={12} /> {new Date(recordingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                )}
                                {duration > 0 && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <IconClock size={12} /> {formatSeconds(duration)}
                                    </span>
                                )}
                                {recordingSize > 0 && (
                                    <span>{formatFileSize(recordingSize)}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={handleCopyShareLink}
                            className="btn btn-secondary"
                            style={{
                                height: 34,
                                padding: '0 12px',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: copiedLink ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                                borderColor: copiedLink ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                color: copiedLink ? '#4ade80' : '#fff'
                            }}
                        >
                            {copiedLink ? <IconCheck size={14} color="#4ade80" /> : <IconCopy size={14} />}
                            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                        </button>

                        <a
                            href={resolvedVideoUrl}
                            download={`JTS-Meet-Recording-${meetingId}.webm`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{
                                height: 34,
                                padding: '0 12px',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <IconDownload size={14} />
                            <span>Download</span>
                        </a>

                        <button
                            onClick={onClose}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                            title="Close Player (Esc)"
                        >
                            <IconX size={16} />
                        </button>
                    </div>
                </div>

                {/* Video Playback Stage */}
                <div style={{ position: 'relative', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380, maxHeight: '68vh' }}>
                    <video
                        ref={videoRef}
                        src={resolvedVideoUrl}
                        style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }}
                        onClick={togglePlay}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                    />

                    {/* Central Play/Pause indicator on video overlay click */}
                    {!isPlaying && (
                        <div
                            onClick={togglePlay}
                            style={{
                                position: 'absolute',
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                background: 'rgba(99, 102, 241, 0.85)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.5)',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <IconPlay size={32} color="#ffffff" style={{ marginLeft: 4 }} />
                        </div>
                    )}
                </div>

                {/* Bottom Custom Zoom/Teams Controls */}
                <div style={{
                    padding: '12px 20px',
                    background: 'rgba(10, 11, 15, 0.95)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                }}>
                    {/* Progress timeline scrubber */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', minWidth: 44 }}>
                            {formatSeconds(currentTime)}
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            style={{
                                flex: 1,
                                height: 5,
                                accentColor: '#6366f1',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', minWidth: 44 }}>
                            {formatSeconds(duration)}
                        </span>
                    </div>

                    {/* Control Buttons & Playback Speed Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        {/* Play/Pause & Volume */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={togglePlay}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                {isPlaying ? <IconPause size={16} /> : <IconPlay size={16} />}
                            </button>

                            {/* Volume */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                    onClick={toggleMute}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: isMuted ? '#f87171' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: 700
                                    }}
                                >
                                    {isMuted ? 'Muted' : 'Vol'}
                                </button>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    style={{ width: 70, height: 4, accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                            </div>
                        </div>

                        {/* Speed toggles (Zoom Style: 0.75x, 1x, 1.25x, 1.5x, 2x) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', padding: '3px 6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 700, paddingRight: 4 }}>
                                SPEED:
                            </span>
                            {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                                <button
                                    key={spd}
                                    onClick={() => handleSpeedChange(spd)}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        borderRadius: 6,
                                        border: 'none',
                                        background: playbackSpeed === spd ? 'var(--color-primary, #6366f1)' : 'transparent',
                                        color: playbackSpeed === spd ? '#fff' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
