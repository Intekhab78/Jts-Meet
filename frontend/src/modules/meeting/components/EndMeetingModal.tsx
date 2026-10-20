import React, { useState } from 'react'
import { IconPhoneOff, IconLogOut, IconDownload, IconMail, IconX } from '../../../components/common/Icons'

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
    const [dispatchEmail, setDispatchEmail] = useState(true)
    const [hoveredAction, setHoveredAction] = useState<'end' | 'leave' | 'cancel' | null>(null)
    const [isHoverCsv, setIsHoverCsv] = useState(false)

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.78)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px 16px',
            overflowY: 'auto',
            boxSizing: 'border-box'
        }}>
            <div
                className="anim-scale-in"
                style={{
                    position: 'relative',
                    background: 'linear-gradient(145deg, rgba(20, 24, 38, 0.98) 0%, rgba(13, 16, 26, 0.98) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 24,
                    padding: '28px 24px 22px',
                    maxWidth: 420,
                    width: '100%',
                    boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                }}
            >
                {/* Top Right Close (X) Button */}
                <button
                    type="button"
                    onClick={onClose}
                    title="Close"
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                        e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'
                    }}
                >
                    <IconX size={15} />
                </button>

                {/* Glowing Icon Emblem */}
                <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0.04) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16
                }}>
                    <IconPhoneOff size={26} color="#f87171" strokeWidth={2.2} />
                </div>

                {/* Title & Host Privilege Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#F8FAFC',
                        margin: 0,
                        letterSpacing: '-0.02em'
                    }}>
                        End or Leave Meeting?
                    </h3>
                </div>

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(99, 102, 241, 0.14)',
                    border: '1px solid rgba(129, 140, 248, 0.35)',
                    color: '#C7D2FE',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: 12
                }}>
                    <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#818CF8',
                        boxShadow: '0 0 8px #818CF8'
                    }} />
                    <span>Host Controls</span>
                </div>

                <p style={{
                    fontSize: '0.8125rem',
                    color: '#94A3B8',
                    lineHeight: 1.45,
                    margin: '0 0 20px',
                    maxWidth: 340
                }}>
                    Choose whether to end this meeting for everyone or leave and let the session continue.
                </p>

                {/* Post-Meeting Attendance & Email Options (Clean Compact Card) */}
                <div style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: '10px 14px',
                    marginBottom: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    textAlign: 'left',
                    boxSizing: 'border-box'
                }}>
                    {/* Email Summary Toggle */}
                    <div
                        onClick={() => setDispatchEmail(!dispatchEmail)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: dispatchEmail ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: dispatchEmail ? '#818CF8' : '#64748B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.18s ease'
                            }}>
                                <IconMail size={16} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: dispatchEmail ? '#F1F5F9' : '#94A3B8',
                                    lineHeight: 1.2
                                }}>
                                    Email Minutes & Attendance
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: '#64748B', lineHeight: 1.3 }}>
                                    Send full attendee log & audit CSV to all
                                </span>
                            </div>
                        </div>

                        {/* Custom Modern Switch */}
                        <div style={{
                            width: 36,
                            height: 20,
                            borderRadius: 20,
                            background: dispatchEmail ? '#6366F1' : 'rgba(255, 255, 255, 0.15)',
                            padding: 2,
                            boxSizing: 'border-box',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: dispatchEmail ? 'flex-end' : 'flex-start',
                            transition: 'background 0.2s ease',
                            flexShrink: 0
                        }}>
                            <div style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        </div>
                    </div>

                    {/* Instant Attendance CSV Export (if available) */}
                    {onDownloadAttendance && (
                        <div style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingTop: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
                                Offline Audit Log
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDownloadAttendance()
                                }}
                                onMouseEnter={() => setIsHoverCsv(true)}
                                onMouseLeave={() => setIsHoverCsv(false)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    background: isHoverCsv
                                        ? 'rgba(99, 102, 241, 0.25)'
                                        : 'rgba(99, 102, 241, 0.14)',
                                    border: '1px solid rgba(129, 140, 248, 0.35)',
                                    color: '#C7D2FE',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                <IconDownload size={13} color="#A5B4FC" />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    {/* End Meeting for All Button */}
                    <button
                        type="button"
                        onClick={() => onEndForAll(dispatchEmail)}
                        onMouseEnter={() => setHoveredAction('end')}
                        onMouseLeave={() => setHoveredAction(null)}
                        style={{
                            width: '100%',
                            padding: '12px 18px',
                            background: hoveredAction === 'end'
                                ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 9,
                            boxShadow: hoveredAction === 'end'
                                ? '0 6px 20px rgba(239, 68, 68, 0.45)'
                                : '0 4px 14px rgba(239, 68, 68, 0.3)',
                            transform: hoveredAction === 'end' ? 'translateY(-1px)' : 'none',
                            transition: 'all 0.18s ease'
                        }}
                    >
                        <IconPhoneOff size={17} color="#FFFFFF" strokeWidth={2.4} />
                        <span>End Meeting for All</span>
                    </button>

                    {/* Just Leave Meeting Button */}
                    <button
                        type="button"
                        onClick={onLeaveOnly}
                        onMouseEnter={() => setHoveredAction('leave')}
                        onMouseLeave={() => setHoveredAction(null)}
                        style={{
                            width: '100%',
                            padding: '12px 18px',
                            background: hoveredAction === 'leave'
                                ? 'rgba(255, 255, 255, 0.12)'
                                : 'rgba(255, 255, 255, 0.07)',
                            color: '#F1F5F9',
                            border: hoveredAction === 'leave'
                                ? '1px solid rgba(255, 255, 255, 0.22)'
                                : '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 12,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transform: hoveredAction === 'leave' ? 'translateY(-1px)' : 'none',
                            transition: 'all 0.18s ease'
                        }}
                    >
                        <IconLogOut size={16} color="#CBD5E1" strokeWidth={2.2} />
                        <span>Just Leave Meeting</span>
                    </button>

                    {/* Cancel Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        onMouseEnter={() => setHoveredAction('cancel')}
                        onMouseLeave={() => setHoveredAction(null)}
                        style={{
                            width: '100%',
                            padding: '9px 16px',
                            background: hoveredAction === 'cancel'
                                ? 'rgba(255, 255, 255, 0.06)'
                                : 'transparent',
                            color: hoveredAction === 'cancel' ? '#F8FAFC' : '#94A3B8',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            marginTop: 2,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
