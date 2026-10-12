import React from 'react'
import { IconSparkles, IconX } from '../../../components/common/Icons'

interface LateJoinerCatchUpPromptProps {
    showCatchUpPrompt: boolean
    showCatchUpModal: boolean
    joinedMinutesLate: number
    onOpenModal: () => void
    onDismiss: () => void
}

export const LateJoinerCatchUpPrompt: React.FC<LateJoinerCatchUpPromptProps> = ({
    showCatchUpPrompt,
    showCatchUpModal,
    joinedMinutesLate,
    onOpenModal,
    onDismiss
}) => {
    if (!showCatchUpPrompt || showCatchUpModal) return null

    return (
        <div style={{
            position: 'absolute',
            top: 72,
            right: 20,
            zIndex: 95,
            background: 'rgba(18, 19, 26, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(168, 85, 247, 0.45)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '10px 16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(168, 85, 247, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c084fc',
                    flexShrink: 0
                }}>
                    <IconSparkles size={16} />
                </div>
                <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                        Joined ~{joinedMinutesLate}m in
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#d8b4fe' }}>
                        Get a quick recap with AI Copilot
                    </div>
                </div>
            </div>
            <button
                onClick={onOpenModal}
                className="btn btn-primary"
                style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    borderRadius: 8
                }}
            >
                Catch Me Up
            </button>
            <button
                onClick={onDismiss}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
                <IconX size={14} />
            </button>
        </div>
    )
}
