import React, { useState, useRef } from 'react'
import { normalizeMediaUrl } from '../../../config'

interface VoiceMessageCardProps {
    url: string
    duration?: number
    name?: string
}

function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
}

/**
 * VoiceMessageCard
 * Rich interactive audio waveform player for channel voice notes.
 */
export function VoiceMessageCard({ url, duration, name }: VoiceMessageCardProps) {
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [audioDuration, setAudioDuration] = useState(duration || 0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (playing) {
            audio.pause()
        } else {
            audio.play().catch(() => { })
        }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            maxWidth: 320,
            marginTop: 4,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
        }}>
            <audio
                ref={audioRef}
                src={normalizeMediaUrl(url)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setCurrentTime(0); }}
                onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                        setAudioDuration(audioRef.current.duration)
                    }
                }}
            />
            <button
                type="button"
                onClick={togglePlay}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: playing ? '#818cf8' : '#6366f1',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.45)',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                }}
                title={playing ? 'Pause' : 'Play voice message'}
            >
                {playing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                )}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 18 }}>
                    {[35, 70, 50, 90, 65, 85, 45, 95, 60, 80, 50, 75, 40, 65].map((h, i) => {
                        const progress = audioDuration > 0 ? currentTime / audioDuration : 0
                        const barProgress = i / 14
                        const isActive = barProgress <= progress
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 3,
                                    height: `${h}%`,
                                    borderRadius: 2,
                                    background: isActive ? '#818cf8' : 'rgba(255, 255, 255, 0.25)',
                                    transition: 'all 0.1s ease'
                                }}
                            />
                        )
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: playing ? '#818cf8' : '#94a3b8', fontWeight: 600 }}>
                        {formatDuration(Math.floor(currentTime))}
                    </span>
                    <span>
                        {audioDuration > 0 ? formatDuration(Math.floor(audioDuration)) : name || 'Voice Note'}
                    </span>
                </div>
            </div>
        </div>
    )
}
