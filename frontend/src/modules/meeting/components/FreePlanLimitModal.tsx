import React from 'react'
import { IconClock, IconZap } from '../../../components/common/Icons'

export interface FreePlanLimitModalProps {
    isOpen: boolean
    onUpgrade: () => void
    onExit: () => void
}

export function FreePlanLimitModal({
    isOpen,
    onUpgrade,
    onExit
}: FreePlanLimitModalProps) {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100020,
            background: 'rgba(5, 7, 13, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
        }}>
            <div className="glass-card anim-scale-in" style={{
                maxWidth: 480,
                width: '100%',
                background: 'linear-gradient(180deg, #1a1d2e 0%, #0f111a 100%)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                textAlign: 'center'
            }}>
                <div style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1.5px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)'
                }}>
                    <IconClock size={32} color="#ef4444" />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
                    Free Plan Time Limit Reached
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
                    Your meeting has reached the <strong>45-minute limit</strong> included in the Starter Free plan. Upgrade your workspace to unlock unlimited 24/7 meetings, AI summaries, and cloud recordings.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                        type="button"
                        onClick={onUpgrade}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            color: '#fff',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        <IconZap size={15} color="#fff" />
                        <span>Upgrade to Growth Pro (Unlimited)</span>
                    </button>
                    <button
                        type="button"
                        onClick={onExit}
                        style={{
                            width: '100%',
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Exit Meeting
                    </button>
                </div>
            </div>
        </div>
    )
}
