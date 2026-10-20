import React, { useState } from 'react'

interface WebinarStageActiveBannerProps {
    isWebinarMode: boolean
    isWebinarAttendee: boolean
    participantsCount: number
    socket: any
    meetingId: string
    meetingInput?: string
    setIsWebinarMode: (mode: boolean) => void
    onOpenParticipants: () => void
}

export const WebinarStageActiveBanner: React.FC<WebinarStageActiveBannerProps> = ({
    isWebinarMode,
    isWebinarAttendee,
    participantsCount,
    socket,
    meetingId,
    meetingInput = '',
    setIsWebinarMode,
    onOpenParticipants
}) => {
    const [isHoverAttendees, setIsHoverAttendees] = useState(false)
    const [isHoverExit, setIsHoverExit] = useState(false)

    if (!isWebinarMode || isWebinarAttendee) return null

    return (
        <div style={{
            position: 'absolute',
            top: 56,
            left: 0,
            right: 0,
            height: 42,
            background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.92) 50%, rgba(15, 23, 42, 0.95) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            zIndex: 998,
            fontSize: '0.8125rem',
            borderBottom: '1px solid rgba(99, 102, 241, 0.32)',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            gap: 12,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Left side: Stage Status Badge & Description */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflow: 'hidden' }}>
                {/* Modern Glowing Stage Pill */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(99, 102, 241, 0.18)',
                    border: '1px solid rgba(129, 140, 248, 0.45)',
                    color: '#C7D2FE',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    flexShrink: 0
                }}>
                    {/* Live Pulse Indicator */}
                    <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#10B981',
                        boxShadow: '0 0 10px #10B981, 0 0 4px #10B981',
                        animation: 'webinarPulse 1.8s ease-in-out infinite'
                    }} />
                    {/* Broadcast Tower Icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                        <circle cx="12" cy="12" r="2" />
                        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                        <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
                    </svg>
                    <span>Keynote Stage</span>
                </div>

                {/* Subtitle / Broadcast info */}
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.8125rem',
                    color: '#E2E8F0'
                }}>
                    <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>Broadcasting Live</strong>
                    <span style={{ color: 'rgba(255, 255, 255, 0.28)', margin: '0 8px' }}>•</span>
                    <span style={{ color: '#94A3B8' }}>Attendees are in view-only keynote mode</span>
                </span>
            </div>

            {/* Right side: Action Buttons with Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {/* View Attendees Button */}
                <button
                    type="button"
                    onClick={onOpenParticipants}
                    onMouseEnter={() => setIsHoverAttendees(true)}
                    onMouseLeave={() => setIsHoverAttendees(false)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '5px 12px',
                        borderRadius: 8,
                        background: isHoverAttendees
                            ? 'rgba(99, 102, 241, 0.28)'
                            : 'rgba(99, 102, 241, 0.16)',
                        border: isHoverAttendees
                            ? '1px solid rgba(165, 180, 252, 0.6)'
                            : '1px solid rgba(129, 140, 248, 0.35)',
                        color: isHoverAttendees ? '#FFFFFF' : '#E0E7FF',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isHoverAttendees ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                >
                    {/* Users Icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Attendees</span>
                    <span style={{
                        padding: '1px 7px',
                        borderRadius: 10,
                        background: 'rgba(99, 102, 241, 0.45)',
                        color: '#FFFFFF',
                        fontSize: '0.6875rem',
                        fontWeight: 700
                    }}>
                        {participantsCount}
                    </span>
                </button>

                {/* Exit Webinar Mode Button */}
                <button
                    type="button"
                    onClick={() => {
                        setIsWebinarMode(false)
                        socket?.emit('webinar:toggle-mode', {
                            meetingId: meetingId || meetingInput.trim(),
                            enabled: false
                        })
                    }}
                    onMouseEnter={() => setIsHoverExit(true)}
                    onMouseLeave={() => setIsHoverExit(false)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 8,
                        background: isHoverExit
                            ? 'rgba(239, 68, 68, 0.22)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: isHoverExit
                            ? '1px solid rgba(239, 68, 68, 0.45)'
                            : '1px solid rgba(255, 255, 255, 0.16)',
                        color: isHoverExit ? '#FCA5A5' : '#E2E8F0',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isHoverExit ? '0 0 12px rgba(239, 68, 68, 0.25)' : 'none'
                    }}
                >
                    {/* LogOut / Exit Icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    <span>Exit Stage</span>
                </button>
            </div>

            {/* Micro Keyframes for Pulse Animation */}
            <style>{`
                @keyframes webinarPulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.25);
                        opacity: 0.7;
                    }
                }
            `}</style>
        </div>
    )
}
