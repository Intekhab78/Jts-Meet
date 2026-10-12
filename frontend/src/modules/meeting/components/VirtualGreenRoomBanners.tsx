import React, { useState } from 'react'
import { SocketEvents } from '../services/socket.service'

interface VirtualGreenRoomBannersProps {
    isCurrentUserBackstage: boolean
    isWebinarMode: boolean
    isLocalHost: boolean
    canUseBackstage: boolean
    backstageUserIds: string[]
    activePanel: string | null
    windowWidth: number
    socket: any
    activeRoomKey: string
}

export const VirtualGreenRoomBanners: React.FC<VirtualGreenRoomBannersProps> = ({
    isCurrentUserBackstage,
    isWebinarMode,
    isLocalHost,
    canUseBackstage,
    backstageUserIds,
    activePanel,
    windowWidth,
    socket,
    activeRoomKey
}) => {
    const [isGoingLive, setIsGoingLive] = useState(false)

    return (
        <>
            {/* ── Virtual Green Room: Backstage Banner (shown to backstage user) ── */}
            {isCurrentUserBackstage && (
                <div style={{
                    position: 'absolute',
                    top: isWebinarMode ? 104 : 68,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 250,
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
                    top: isWebinarMode ? 104 : 68,
                    right: activePanel ? (windowWidth < 768 ? 16 : 380) : 20,
                    zIndex: 250,
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
        </>
    )
}
