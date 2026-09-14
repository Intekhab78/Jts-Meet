import React from 'react'
import { IconPhoneOff, IconLogOut, IconDownload, IconMail } from '../../../components/common/Icons'

interface EndMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onLeaveOnly: () => void
    onEndForAll: (sendSummaryEmail?: boolean) => void
    onDownloadAttendance?: () => void
}

export const EndMeetingModal: React.FC<EndMeetingModalProps> = ({
    isOpen,
    onClose,
    onLeaveOnly,
    onEndForAll,
    onDownloadAttendance
}) => {
    const [dispatchEmail, setDispatchEmail] = React.useState(true)

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 10, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px 16px',
            overflowY: 'auto',
            boxSizing: 'border-box'
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
                    textAlign: 'center',
                    marginBottom: 24
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
                    <IconPhoneOff size={28} color="#ef4444" />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                    End or Leave Meeting?
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
                    You are the host of this meeting. You can end the meeting for all participants, or leave and let the meeting continue.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    {onDownloadAttendance && (
                        <button
                            type="button"
                            onClick={onDownloadAttendance}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                marginBottom: 2,
                                transition: 'background 0.2s'
                            }}
                        >
                            <IconDownload size={15} color="#a5b4fc" />
                            <span>Download Attendance (CSV) Before Exiting</span>
                        </button>
                    )}

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        marginBottom: 2
                    }}>
                        <input
                            type="checkbox"
                            checked={dispatchEmail}
                            onChange={(e) => setDispatchEmail(e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                        />
                        <IconMail size={14} color="#a5b4fc" />
                        <span>Send executive summary email to attendees</span>
                    </label>

                    <button
                        onClick={() => onEndForAll(dispatchEmail)}
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
                        <IconPhoneOff size={16} color="#fff" />
                        <span>End Meeting for All</span>
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
                        <IconLogOut size={16} color="currentColor" />
                        <span>Just Leave Meeting</span>
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
