import React from 'react'
import { IconMic, IconMicOff } from '../../../components/common/Icons'

interface PushToTalkMicHudProps {
    show: boolean
    isMuted: boolean
}

export const PushToTalkMicHud: React.FC<PushToTalkMicHudProps> = ({ show, isMuted }) => {
    if (!show) return null

    return (
        <div style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            background: isMuted ? 'rgba(239, 68, 68, 0.94)' : 'rgba(34, 197, 94, 0.94)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 20,
            fontWeight: 600,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: isMuted ? '0 4px 16px rgba(239, 68, 68, 0.35)' : '0 4px 16px rgba(34, 197, 94, 0.35)',
            whiteSpace: 'nowrap'
        }}>
            {isMuted ? <IconMicOff size={13} color="#fff" /> : <IconMic size={13} color="#fff" />}
            <span>{isMuted ? 'Microphone muted' : 'Microphone unmuted'}</span>
        </div>
    )
}
