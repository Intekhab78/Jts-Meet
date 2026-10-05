import React, { useState, useEffect, useRef } from 'react'
import { soundEffects } from '../../../utils/soundEffects'

interface FloatingReaction {
    id: string
    emoji: string
    left: number
}

interface WebinarAttendeeViewProps {
    meetingId: string
    meetingTitle?: string
    stageStream?: MediaStream | null
    stageSpeakerName?: string
    isScreenShare?: boolean
    socket: any
    myUserId: string
    myDisplayName: string
    isPromotedToSpeaker: boolean
    onLeave: () => void
    onOpenQA: () => void
    onOpenPolls: () => void
    onOpenChat: () => void
    unreadChatCount?: number
    attendeeCount?: number
}

export const WebinarAttendeeView: React.FC<WebinarAttendeeViewProps> = ({
    meetingId,
    meetingTitle,
    stageStream,
    stageSpeakerName,
    isScreenShare = false,
    socket,
    myUserId,
    myDisplayName,
    isPromotedToSpeaker,
    onLeave,
    onOpenQA,
    onOpenPolls,
    onOpenChat,
    unreadChatCount = 0,
    attendeeCount = 1
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [handRaised, setHandRaised] = useState<boolean>(false)
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
    const [copiedRoom, setCopiedRoom] = useState(false)

    // Attach media stream to stage video element
    useEffect(() => {
        if (videoRef.current && stageStream) {
            videoRef.current.srcObject = stageStream
            videoRef.current.play().catch(e => console.warn('[Webinar View] Auto-play warning:', e))
        }
    }, [stageStream])

    // Listen to incoming live reactions
    useEffect(() => {
        if (!socket) return

        const handleReaction = (data: { reaction: string; userName?: string; id?: string }) => {
            const newReaction: FloatingReaction = {
                id: data.id || String(Math.random()),
                emoji: data.reaction,
                left: 10 + Math.random() * 80
            }
            setFloatingReactions(prev => [...prev.slice(-25), newReaction])

            setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id))
            }, 3000)
        }

        socket.on('webinar:reaction', handleReaction)
        return () => {
            socket.off('webinar:reaction', handleReaction)
        }
    }, [socket])

    const handleSendReaction = (emoji: string) => {
        if (!socket) return
        socket.emit('webinar:reaction', {
            meetingId,
            reaction: emoji,
            userName: myDisplayName
        })
    }

    const handleToggleHandRaise = () => {
        if (!socket) return
        const next = !handRaised
        setHandRaised(next)
        if (next) {
            soundEffects.playJoinChime()
            socket.emit('webinar:request-to-speak', {
                meetingId,
                displayName: myDisplayName
            })
        }
    }

    const handleCopyId = () => {
        navigator.clipboard.writeText(meetingId)
        setCopiedRoom(true)
        setTimeout(() => setCopiedRoom(false), 2000)
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'radial-gradient(ellipse at 50% 20%, #0d1224 0%, #06080e 75%, #030407 100%)',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10000,
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            userSelect: 'none'
        }}>
            {/* Top Stage Header */}
            <header style={{
                height: 60,
                padding: '0 24px',
                background: 'rgba(10, 14, 26, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                zIndex: 20
            }}>
                {/* Left: Live Indicator & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em'
                    }}>
                        <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 8px #ef4444',
                            animation: 'pulse 1.8s infinite'
                        }} />
                        LIVE WEBINAR
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h1 style={{
                            margin: 0,
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: '#fff',
                            letterSpacing: '-0.01em',
                            maxWidth: 380,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {meetingTitle || 'Webinar Stage Broadcast'}
                        </h1>

                        <button
                            onClick={handleCopyId}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 6,
                                color: '#94a3b8',
                                fontSize: '0.6875rem',
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            title="Click to copy Room ID"
                        >
                            <span>{meetingId}</span>
                            <span style={{ color: copiedRoom ? '#34d399' : '#64748b' }}>
                                {copiedRoom ? '✓' : '📋'}
                            </span>
                        </button>
                    </div>

                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 6,
                        color: '#a5b4fc',
                        fontSize: '0.6875rem',
                        fontWeight: 600
                    }}>
                        <span>🎙️ HD Studio Audio</span>
                    </div>
                </div>

                {/* Right: Viewers Count & Leave */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '0.75rem',
                        color: '#cbd5e1',
                        fontWeight: 600
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>{attendeeCount.toLocaleString()} {attendeeCount === 1 ? 'Attendee' : 'Attendees'}</span>
                    </div>

                    <button
                        onClick={onLeave}
                        style={{
                            padding: '6px 16px',
                            borderRadius: 8,
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#fca5a5',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444'
                            e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                            e.currentTarget.style.color = '#fca5a5'
                        }}
                    >
                        <span>Leave</span>
                    </button>
                </div>
            </header>

            {/* Main Stage Viewport (Cinema Theater) */}
            <main style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 24px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: 1360,
                    maxHeight: 'calc(100vh - 160px)',
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#020306',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {stageStream ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                background: '#020306'
                            }}
                        />
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 16,
                            textAlign: 'center',
                            padding: 32
                        }}>
                            <div style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 70%)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#a5b4fc',
                                boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)'
                            }}>
                                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 7l-7 5 7 5V7z" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', fontWeight: 700, color: '#f1f5f9' }}>
                                    Keynote Stage is Live
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', maxWidth: 420, lineHeight: 1.5 }}>
                                    The stage speaker is setting up presentation audio & video. Sit back and enjoy the broadcast.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Presenter Lower-Third Badge */}
                    {stageSpeakerName && (
                        <div style={{
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            padding: '8px 14px',
                            background: 'rgba(10, 15, 28, 0.82)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderRadius: 12,
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#fff',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                            zIndex: 15
                        }}>
                            <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#34d399',
                                boxShadow: '0 0 8px #34d399'
                            }} />
                            <span style={{ color: '#cbd5e1' }}>
                                {isScreenShare ? '🖥️ Presenting Screen' : '🎙️ Stage Keynote'}:
                            </span>
                            <strong style={{ color: '#fff', fontWeight: 700 }}>{stageSpeakerName}</strong>
                        </div>
                    )}

                    {/* Promoted Alert Banner (If Host promoted this attendee to speak) */}
                    {isPromotedToSpeaker && (
                        <div style={{
                            position: 'absolute',
                            top: 24,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
                            borderRadius: 16,
                            color: '#fff',
                            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            zIndex: 30,
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                        }}>
                            <span style={{ fontSize: '1.25rem' }}>🎉</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>You've been promoted to Stage Speaker!</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Your microphone and camera are now unlocked by the Host.</div>
                            </div>
                        </div>
                    )}

                    {/* Floating Reactions Layer */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        zIndex: 20
                    }}>
                        {floatingReactions.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    position: 'absolute',
                                    bottom: 30,
                                    left: `${item.left}%`,
                                    fontSize: '2.25rem',
                                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                                    animation: 'floatUp 2.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                                }}
                            >
                                {item.emoji}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Bottom Dock (Attendee Control Bar) */}
            <footer style={{
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 24px',
                flexShrink: 0,
                zIndex: 20
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '8px 20px',
                    borderRadius: 24,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Reactions Quick Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {['👏', '❤️', '🔥', '🎉', '🚀', '💡'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleSendReaction(emoji)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#fff',
                                    fontSize: '1.125rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.2)'
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                }}
                                title={`Send ${emoji} to Stage`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.12)' }} />

                    {/* Center: Request to Speak (Raise Hand) */}
                    <button
                        onClick={handleToggleHandRaise}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 18px',
                            borderRadius: 14,
                            background: handRaised
                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                : 'rgba(255, 255, 255, 0.07)',
                            border: handRaised
                                ? '1px solid #fbbf24'
                                : '1px solid rgba(255, 255, 255, 0.12)',
                            color: handRaised ? '#000' : '#fff',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: handRaised ? '0 0 20px rgba(245, 158, 11, 0.4)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>✋</span>
                        <span>{handRaised ? 'Hand Raised (Host Notified)' : 'Request to Speak'}</span>
                    </button>

                    <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.12)' }} />

                    {/* Right: Interactive Panels (Chat, Q&A, Polls) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={onOpenChat}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 12,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#e2e8f0',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            <span>💬</span>
                            <span>Chat</span>
                            {unreadChatCount > 0 && (
                                <span style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#38bdf8',
                                    boxShadow: '0 0 6px #38bdf8'
                                }} />
                            )}
                        </button>

                        <button
                            onClick={onOpenQA}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 12,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#e2e8f0',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            <span>❓</span>
                            <span>Q&A</span>
                        </button>

                        <button
                            onClick={onOpenPolls}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 12,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#e2e8f0',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            <span>📊</span>
                            <span>Polls</span>
                        </button>
                    </div>
                </div>
            </footer>

            {/* Animation Keyframes */}
            <style>{`
                @keyframes floatUp {
                    0% {
                        opacity: 0;
                        transform: translateY(10px) scale(0.6);
                    }
                    15% {
                        opacity: 1;
                        transform: translateY(-40px) scale(1.15);
                    }
                    80% {
                        opacity: 0.9;
                        transform: translateY(-280px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-380px) scale(0.9);
                    }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
            `}</style>
        </div>
    )
}
