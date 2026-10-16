import React, { useState, useEffect } from 'react'
import { PersistentAudioTile } from './VideoTile'

interface PersistentAudioBridgeProps {
    remoteStreams: Record<string, MediaStream | null>
    localUserId: string
    backstageUserIds: string[]
    remoteMuteStates: Record<string, boolean>
    canManageParticipants: boolean
    isLocalHost: boolean
}

export const PersistentAudioBridge: React.FC<PersistentAudioBridgeProps> = ({
    remoteStreams,
    localUserId,
    backstageUserIds,
    remoteMuteStates,
    canManageParticipants,
    isLocalHost
}) => {
    const [isBlocked, setIsBlocked] = useState(false)

    useEffect(() => {
        const handleBlocked = () => setIsBlocked(true)
        const handleAllowed = () => setIsBlocked(false)
        const handleUnlock = () => {
            setIsBlocked(false)
            document.querySelectorAll('audio[data-peer-id]').forEach((el) => {
                const a = el as HTMLAudioElement
                if (a.paused && !a.muted) {
                    a.play().catch(() => {})
                }
            })
        }

        window.addEventListener('jts:audio-autoplay-blocked', handleBlocked)
        window.addEventListener('jts:audio-autoplay-allowed', handleAllowed)
        window.addEventListener('pointerdown', handleUnlock, { capture: true })
        window.addEventListener('keydown', handleUnlock, { capture: true })

        return () => {
            window.removeEventListener('jts:audio-autoplay-blocked', handleBlocked)
            window.removeEventListener('jts:audio-autoplay-allowed', handleAllowed)
            window.removeEventListener('pointerdown', handleUnlock, { capture: true } as any)
            window.removeEventListener('keydown', handleUnlock, { capture: true } as any)
        }
    }, [])

    return (
        <>
            {isBlocked && (
                <div
                    onClick={() => {
                        setIsBlocked(false)
                        document.querySelectorAll('audio[data-peer-id]').forEach((el) => {
                            (el as HTMLAudioElement).play().catch(() => {})
                        })
                    }}
                    style={{
                        position: 'fixed',
                        top: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 99999,
                        background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                        color: '#fff',
                        padding: '10px 22px',
                        borderRadius: 30,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(37,99,235,0.7)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        border: '1px solid rgba(255,255,255,0.25)',
                        backdropFilter: 'blur(10px)',
                        userSelect: 'none'
                    }}
                >
                    <span style={{ fontSize: '1.15rem' }}>🔊</span>
                    <span>Click anywhere to enable meeting audio</span>
                </div>
            )}

            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    right: 0,
                    width: 2,
                    height: 2,
                    opacity: 0.01,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1
                }}
            >
                {Object.entries(remoteStreams).map(([peerId, rStream]) => {
                    if (!rStream || peerId === 'me' || peerId === localUserId) return null
                    const isPeerBackstage = backstageUserIds.includes(peerId)
                    const shouldMuteAudio = remoteMuteStates[peerId] === true || (isPeerBackstage && !canManageParticipants && !isLocalHost)
                    return (
                        <PersistentAudioTile
                            key={`global-audio-${peerId}`}
                            peerId={peerId}
                            stream={rStream}
                            isMuted={shouldMuteAudio}
                        />
                    )
                })}
            </div>
        </>
    )
}
