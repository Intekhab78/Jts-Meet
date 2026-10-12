import React from 'react'
import { IconMicOff } from '../../../components/common/Icons'

interface TalkingWhileMutedAlertProps {
    show: boolean
    isMuted: boolean
    showCaptions: boolean
    toggleMute: () => void
}

export const TalkingWhileMutedAlert: React.FC<TalkingWhileMutedAlertProps> = ({
    show,
    isMuted,
    showCaptions,
    toggleMute
}) => {
    if (!show || !isMuted) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: showCaptions ? 134 : 86,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(20, 21, 26, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '20px',
            padding: '4px 12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 500,
        }}>
            <IconMicOff size={14} color="#f87171" />
            <span style={{ whiteSpace: 'nowrap' }}>Your mic is muted</span>
            <button
                onClick={toggleMute}
                style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.6875rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s ease'
                }}
            >
                Unmute (Space)
            </button>
        </div>
    )
}
