import React from 'react'

interface EndMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onLeaveOnly: () => void
    onEndForAll: () => void
}

export const EndMeetingModal: React.FC<EndMeetingModalProps> = ({
    isOpen,
    onClose,
    onLeaveOnly,
    onEndForAll
}) => {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 10, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16
        }}>
            <div 
                className="anim-scale-in"
                style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '28px 24px',
                    maxWidth: 420,
                    width: '100%',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                }}
            >
                {/* Warning / Door Icon */}
                <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: 16
                }}>
                    🚪
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                    End or Leave Meeting?
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
                    You are the host of this meeting. You can end the meeting for all participants, or leave and let the meeting continue.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    <button
                        onClick={onEndForAll}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'var(--color-danger)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: 'var(--shadow-md)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        <span>🛑</span> End Meeting for All
                    </button>

                    <button
                        onClick={onLeaveOnly}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'background 0.2s'
                        }}
                    >
                        <span>🏃</span> Just Leave Meeting
                    </button>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'transparent',
                            color: 'var(--color-text-muted)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 500,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            marginTop: 4
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
