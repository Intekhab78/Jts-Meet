import React from 'react'

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
    if (!isWebinarMode || isWebinarAttendee) return null

    return (
        <div style={{
            position: 'absolute',
            top: 56,
            left: 0,
            right: 0,
            height: 38,
            background: 'linear-gradient(90deg, rgba(225, 29, 72, 0.95), rgba(190, 18, 60, 0.95))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            zIndex: 998,
            fontSize: '0.8125rem',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(225, 29, 72, 0.35)',
            gap: 12
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 0 8px #fff',
                    animation: 'pulse 1.5s infinite',
                    flexShrink: 0
                }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>WEBINAR STAGE MODE ACTIVE</strong> — You are live on the keynote stage. Attendees are in view-only broadcast mode.
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                    type="button"
                    onClick={onOpenParticipants}
                    style={{
                        padding: '3px 12px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    View Attendees ({participantsCount})
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsWebinarMode(false)
                        socket?.emit('webinar:toggle-mode', {
                            meetingId: meetingId || meetingInput.trim(),
                            enabled: false
                        })
                    }}
                    style={{
                        padding: '3px 12px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    Exit Webinar Mode
                </button>
            </div>
        </div>
    )
}
