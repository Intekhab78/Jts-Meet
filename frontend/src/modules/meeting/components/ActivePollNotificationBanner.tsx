import React, { useEffect, useState } from 'react'
import { IconTarget, IconX } from '../../../components/common/Icons'

export interface ActivePollNotificationBannerProps {
    isOpen: boolean
    question: string
    optionsCount: number
    onVote: () => void
    onDismiss: () => void
}

export const ActivePollNotificationBanner: React.FC<ActivePollNotificationBannerProps> = ({
    isOpen,
    question,
    optionsCount,
    onVote,
    onDismiss
}) => {
    const [progress, setProgress] = useState(100)

    useEffect(() => {
        if (!isOpen) {
            setProgress(100)
            return
        }

        const duration = 14000 // 14 seconds auto-dismiss
        const interval = 100
        const decrement = (interval / duration) * 100

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev <= decrement) {
                    clearInterval(timer)
                    onDismiss()
                    return 0
                }
                return prev - decrement
            })
        }, interval)

        return () => clearInterval(timer)
    }, [isOpen, onDismiss])

    if (!isOpen) return null

    return (
        <div
            style={{
                position: 'fixed',
                top: 72,
                right: 20,
                zIndex: 99998,
                maxWidth: 380,
                width: 'calc(100vw - 40px)',
                background: 'rgba(15, 23, 42, 0.94)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '16px',
                padding: '14px 16px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(168, 85, 247, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                color: '#fff',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden'
            }}
        >
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(110%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pollPulseDot {
                    0% { transform: scale(0.9); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 10px #c084fc; }
                    100% { transform: scale(0.9); opacity: 0.8; }
                }
            `}</style>

            {/* Top row: Badge + Title + Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 22, height: 22, borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <IconTarget size={13} color="#c084fc" />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', color: '#c084fc', textTransform: 'uppercase' }}>
                        New Poll Launched
                    </span>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#a855f7',
                        animation: 'pollPulseDot 1.5s infinite'
                    }} />
                </div>

                <button
                    onClick={onDismiss}
                    title="Dismiss"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)' }}
                >
                    <IconX size={14} />
                </button>
            </div>

            {/* Question Text */}
            <div style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#f8fafc',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
            }}>
                {question}
            </div>

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                    {optionsCount} options available
                </span>

                <button
                    onClick={onVote}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(147, 51, 234, 0.6)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(147, 51, 234, 0.4)'
                    }}
                >
                    <span>Vote Now</span>
                    <span style={{ fontSize: '0.9rem' }}>→</span>
                </button>
            </div>

            {/* Subtle Countdown Progress Bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 2,
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                transition: 'width 0.1s linear'
            }} />
        </div>
    )
}
