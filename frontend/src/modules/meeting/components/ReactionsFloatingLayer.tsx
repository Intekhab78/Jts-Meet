import React from 'react'

export interface FloatingReaction {
    id: string | number
    emoji: string
    left: number
    delayMs?: number
    scale?: number
    swayType?: number
    isPrimary?: boolean
    senderName?: string
}

export interface ReactionsFloatingLayerProps {
    showPopover: boolean
    reactionBtnRef: React.RefObject<HTMLButtonElement | null>
    popoverRef: React.RefObject<HTMLDivElement | null>
    floatingReactions: FloatingReaction[]
    onSendReaction: (emoji: string) => void
    onTriggerSoundboard: (type: 'applause' | 'cheer' | 'drumroll' | 'bell') => void
    onClosePopover: () => void
}

export function ReactionsFloatingLayer({
    showPopover,
    reactionBtnRef,
    popoverRef,
    floatingReactions,
    onSendReaction,
    onTriggerSoundboard,
    onClosePopover
}: ReactionsFloatingLayerProps) {
    const renderPopover = () => {
        if (!showPopover) return null

        const rect = reactionBtnRef.current?.getBoundingClientRect()
        const bottom = rect ? window.innerHeight - rect.top + 12 : 96
        const left = rect ? rect.left + rect.width / 2 : window.innerWidth / 2

        return (
            <div
                ref={popoverRef}
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
                            onSendReaction(emoji)
                            onClosePopover()
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
                            onTriggerSoundboard('applause')
                            onClosePopover()
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
                            onTriggerSoundboard('cheer')
                            onClosePopover()
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
                            onTriggerSoundboard('drumroll')
                            onClosePopover()
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
                            onTriggerSoundboard('bell')
                            onClosePopover()
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
    }

    return (
        <>
            {renderPopover()}

            {/* Real-time Celebratory Floating Reactions Container (Teams / Zoom Physics Stream) */}
            <div style={{
                position: 'fixed', inset: 0,
                pointerEvents: 'none', zIndex: 99999, overflow: 'hidden'
            }}>
                {floatingReactions.map(r => (
                    <div
                        key={r.id}
                        className={`floating-reaction-item sway-${r.swayType || 1}`}
                        style={{
                            left: `${r.left}%`,
                            animationDelay: `${r.delayMs || 0}ms`,
                        }}
                    >
                        <span
                            className="floating-reaction-emoji"
                            style={{
                                fontSize: `${(r.scale || 1) * 2.2}rem`
                            }}
                        >
                            {r.emoji}
                        </span>
                        {r.isPrimary && r.senderName && (
                            <span className="floating-reaction-name">{r.senderName}</span>
                        )}
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
        </>
    )
}
