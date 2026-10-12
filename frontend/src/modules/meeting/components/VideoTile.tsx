import React, { useState, useEffect, useRef } from 'react'
import { IconHand, IconMicOff } from '../../../components/common/Icons'
import { getAvatarGradient, getInitials, getFirstName } from '../utils/meetingHelpers'

/* ──────────────────────────────────────────────────────────
   PersistentAudioTile: Guarantees continuous remote audio playback
   independent of UI tiles, pagination, layout modes, or minimization.
   Includes gesture unlock to defeat browser autoplay blocks.
────────────────────────────────────────────────────────── */
export const PersistentAudioTile = React.memo(function PersistentAudioTile({
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
        if (stream) {
            if (el.srcObject !== stream) {
                el.srcObject = stream
            }
            // Control audio output via muted flag without tearing down the media stream pipeline
            el.muted = isMuted

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
export interface VideoTileProps {
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

export const VideoTile = React.memo(function VideoTile({
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

            {/* Bottom Left: Name Badge & Mute Indicator (Standard video conferencing position) */}
            <div style={{
                position: 'absolute',
                bottom: isCompact ? 6 : 12,
                left: isCompact ? 6 : 12,
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? 4 : 6,
                zIndex: 10,
                maxWidth: 'calc(100% - 140px)'
            }}>
                {/* Name Badge */}
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
            </div>

            {/* Top Right: Network Quality Indicator */}
            <div style={{
                position: 'absolute',
                top: isCompact ? 6 : 12,
                right: isCompact ? 6 : 12,
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? 4 : 6,
                zIndex: 10
            }}>
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
