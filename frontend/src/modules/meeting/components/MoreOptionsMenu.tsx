import React from 'react'
import {
    IconVideo,
    IconLock,
    IconSparkles,
    IconShield,
    IconCrown,
    IconFileText,
    IconHelp,
    IconRocket,
    IconPhoneOff
} from '../../../components/common/Icons'
import { isScreenShareSupported } from '../services/screen.service'

export interface MoreOptionsMenuProps {
    isOpen: boolean
    onClose: () => void
    moreBtnRef: React.RefObject<any>
    moreMenuRef: React.RefObject<any>
    windowWidth: number
    canRecord: boolean
    canAccessRecording: boolean
    isRecording: boolean
    connected: boolean
    joined: boolean
    startRecording: () => void
    stopRecording: () => void
    canAccessCloudRecording: boolean
    isCloudRecording: boolean
    toggleCloudRecording: () => void
    canUseWhiteboard: boolean
    showWhiteboard: boolean
    onToggleWhiteboard: () => void
    canManageParticipants: boolean
    showPolls: boolean
    onTogglePolls: () => void
    isLocalHost: boolean
    canAccessBreakout: boolean
    activeBreakoutSession?: any
    onOpenBreakout: () => void
    onTogglePanel: (panel: any) => void
    activePanel: string | null
    canAccessAI: boolean
    onOpenMoM: () => void
    isGuest: boolean
    showSummary: boolean
    onToggleSummary: () => void
    onOpenCatchUp: () => void
    onOpenAnalytics: () => void
    isConfidentialMode: boolean
    onToggleConfidentialMode: () => void
    isVoiceDubbingEnabled: boolean
    onToggleVoiceDubbing: () => void
    handleTogglePiP: () => void
    isPiPActive: boolean
    lowBandwidthMode: boolean
    onToggleLowBandwidthMode: () => void
    onOpenLayoutModal: () => void
    layoutMode: string
    isStudioLightingEnabled: boolean
    onToggleStudioLighting: () => void
    canAccessRTMP: boolean
    isLiveStreaming: boolean
    onOpenLiveStreamModal: () => void
    canAccessAttendance: boolean
    onOpenAttendanceModal: () => void
    onOpenVirtualBgModal: () => void
    virtualBgPreset: string
    canAccessE2EE: boolean
    isE2EEActive: boolean
    onOpenE2EEModal: () => void
    canAccessDialIn: boolean
    onOpenDialInModal: () => void
    canAccessWebinar: boolean
    isWebinarMode: boolean
    onToggleWebinarMode: () => void
    onOpenDeviceSettings: () => void
    onOpenShortcuts: () => void
    onLeaveOrEndMeeting: () => void
    onRequireUpgrade: (feature: { title: string; requiredPlan: string; icon: React.ReactNode; description: string }) => void
}

export function MoreOptionsMenu({
    isOpen,
    onClose,
    moreBtnRef,
    moreMenuRef,
    windowWidth,
    canRecord,
    canAccessRecording,
    isRecording,
    connected,
    joined,
    startRecording,
    stopRecording,
    canAccessCloudRecording,
    isCloudRecording,
    toggleCloudRecording,
    canUseWhiteboard,
    showWhiteboard,
    onToggleWhiteboard,
    canManageParticipants,
    showPolls,
    onTogglePolls,
    isLocalHost,
    canAccessBreakout,
    activeBreakoutSession,
    onOpenBreakout,
    onTogglePanel,
    activePanel,
    canAccessAI,
    onOpenMoM,
    isGuest,
    showSummary,
    onToggleSummary,
    onOpenCatchUp,
    onOpenAnalytics,
    isConfidentialMode,
    onToggleConfidentialMode,
    isVoiceDubbingEnabled,
    onToggleVoiceDubbing,
    handleTogglePiP,
    isPiPActive,
    lowBandwidthMode,
    onToggleLowBandwidthMode,
    onOpenLayoutModal,
    layoutMode,
    isStudioLightingEnabled,
    onToggleStudioLighting,
    canAccessRTMP,
    isLiveStreaming,
    onOpenLiveStreamModal,
    canAccessAttendance,
    onOpenAttendanceModal,
    onOpenVirtualBgModal,
    virtualBgPreset,
    canAccessE2EE,
    isE2EEActive,
    onOpenE2EEModal,
    canAccessDialIn,
    onOpenDialInModal,
    canAccessWebinar,
    isWebinarMode,
    onToggleWebinarMode,
    onOpenDeviceSettings,
    onOpenShortcuts,
    onLeaveOrEndMeeting,
    onRequireUpgrade
}: MoreOptionsMenuProps) {
    if (!isOpen) return null

    const rect = moreBtnRef.current?.getBoundingClientRect()
    const bottom = rect ? Math.max(76, window.innerHeight - rect.top + 14) : 90
    const left = rect ? Math.max(165, Math.min(window.innerWidth - 165, rect.left + rect.width / 2)) : window.innerWidth / 2
    const availableHeight = Math.max(260, window.innerHeight - bottom - 20)
    const maxHeight = Math.min(availableHeight, 520)

    return (
        <div
            ref={moreMenuRef}
            className="jts-more-menu-scroll"
            style={{
                position: 'fixed',
                bottom: `${bottom}px`,
                left: `${left}px`,
                transform: 'translateX(-50%)',
                width: windowWidth < 400 ? 'calc(100vw - 24px)' : 315,
                maxHeight: `${maxHeight}px`,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.28) rgba(255, 255, 255, 0.04)',
                background: 'rgba(14, 18, 27, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '16px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxShadow: '0 24px 54px rgba(0,0,0,0.88), 0 0 1px 1px rgba(255,255,255,0.12)',
                zIndex: 10005,
                animation: 'jts-slide-up 0.18s ease-out'
            }}
        >
            {/* Record Meeting */}
            {isScreenShareSupported() && canRecord && (
                <button
                    onClick={() => {
                        onClose()
                        if (!canAccessRecording) {
                            onRequireUpgrade({
                                title: 'Cloud Video Recording',
                                requiredPlan: 'Starter or Enterprise',
                                icon: <IconVideo size={20} color="#ef4444" />,
                                description: 'Recording meetings with cloud storage and MP4 downloads is available on Starter and Enterprise plans. Free plan workspaces do not include cloud recording.'
                            })
                            return
                        }
                        if (isRecording) {
                            stopRecording()
                        } else {
                            startRecording()
                        }
                    }}
                    disabled={!connected || !joined}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: isRecording ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        {isRecording ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
                        )}
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', opacity: canAccessRecording ? 1 : 0.85 }}>
                        {isRecording ? 'Stop Recording' : 'Record Meeting'}
                    </span>
                    {isRecording && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>REC</span>}
                    {!canAccessRecording && (
                        <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                        }}>
                            <IconLock size={9} /> PRO
                        </span>
                    )}
                </button>
            )}

            {/* Server-Side Headless Cloud Recording */}
            <button
                onClick={() => {
                    onClose()
                    if (!canAccessCloudRecording) {
                        onRequireUpgrade({
                            title: 'Cloud Server Recording',
                            requiredPlan: 'Enterprise Tier',
                            icon: <IconVideo size={20} color="#f43f5e" />,
                            description: 'Headless 1080p automated server-side recording with secure cloud storage and shareable links requires the Enterprise tier.'
                        })
                        return
                    }
                    toggleCloudRecording()
                }}
                disabled={!connected || !joined}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isCloudRecording ? 'rgba(244, 63, 94, 0.25)' : 'rgba(14, 165, 233, 0.12)',
                    color: isCloudRecording ? '#f43f5e' : '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        <circle cx="12" cy="13" r="2.5" fill={isCloudRecording ? 'currentColor' : 'none'} />
                    </svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessCloudRecording ? 1 : 0.85 }}>
                    {isCloudRecording ? 'Stop Cloud Recording' : 'Cloud Recording (Server)'}
                </span>
                {isCloudRecording && <span style={{ fontSize: '0.65rem', background: '#f43f5e', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>CLOUD REC</span>}
                {!canAccessCloudRecording && (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                    }}>
                        <IconLock size={9} /> ENTERPRISE
                    </span>
                )}
            </button>

            {/* Whiteboard */}
            {canUseWhiteboard && (
                <button
                    onClick={() => {
                        onClose()
                        onToggleWhiteboard()
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(168, 85, 247, 0.12)',
                        color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left' }}>Collaborative Whiteboard</span>
                    {showWhiteboard && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                </button>
            )}

            {/* Polls */}
            {(canManageParticipants || showPolls) && (
                <button
                    onClick={() => {
                        onClose()
                        onTogglePolls()
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left' }}>In-Call Polls</span>
                    {showPolls && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</span>}
                </button>
            )}

            {/* Breakout Rooms (Host / Co-Host) */}
            {(canManageParticipants || isLocalHost) && (
                <button
                    onClick={() => {
                        onClose()
                        if (!canAccessBreakout) {
                            onRequireUpgrade({
                                title: 'Breakout Rooms',
                                requiredPlan: 'Starter or Enterprise',
                                icon: <IconCrown size={20} color="#60a5fa" />,
                                description: 'Splitting meeting attendees into focused interactive sub-rooms and workshops requires a Starter or Enterprise plan.'
                            })
                            return
                        }
                        onOpenBreakout()
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', opacity: canAccessBreakout ? 1 : 0.85 }}>Breakout Rooms</span>
                    {activeBreakoutSession?.isActive && (
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#c084fc', background: 'rgba(168,85,247,0.2)', padding: '2px 6px', borderRadius: '6px' }}>
                            ACTIVE
                        </span>
                    )}
                    {!canAccessBreakout && (
                        <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                        }}>
                            <IconLock size={9} /> PRO
                        </span>
                    )}
                </button>
            )}

            {/* Structured Q&A Panel */}
            <button
                onClick={() => {
                    onClose()
                    onTogglePanel('qa')
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(236, 72, 153, 0.12)',
                    color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Q&amp;A Panel</span>
                {activePanel === 'qa' && (
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>
                        OPEN
                    </span>
                )}
            </button>

            {/* Q&A with Upvoting */}
            <button
                onClick={() => {
                    onClose()
                    onTogglePanel('qa')
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: activePanel === 'qa' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: 'none', borderRadius: '10px',
                    color: activePanel === 'qa' ? 'var(--color-accent)' : '#fff',
                    fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = activePanel === 'qa' ? 'rgba(99, 102, 241, 0.15)' : 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <IconHelp size={16} />
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Q&A with Upvoting</span>
                {activePanel === 'qa' && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                        OPEN
                    </span>
                )}
            </button>

            {/* AI Minutes of Meeting (Host only) */}
            {canManageParticipants && (
                <button
                    onClick={() => {
                        onClose()
                        if (!canAccessAI) {
                            onRequireUpgrade({
                                title: 'AI Minutes of Meeting (MoM)',
                                requiredPlan: 'Starter or Enterprise',
                                icon: <IconFileText size={20} color="#fbbf24" />,
                                description: 'Real-time AI-generated executive summaries, decisions, and action-item tracking require a Starter or Enterprise plan.'
                            })
                            return
                        }
                        onOpenMoM()
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAI ? 1 : 0.85 }}>AI Minutes of Meeting (MoM)</span>
                    {!canAccessAI && (
                        <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                        }}>
                            <IconLock size={9} /> PRO
                        </span>
                    )}
                </button>
            )}

            {/* AI Summary */}
            {(!isGuest || canManageParticipants) && (
                <button
                    onClick={() => {
                        onClose()
                        if (!canAccessAI) {
                            onRequireUpgrade({
                                title: 'AI Smart Summary',
                                requiredPlan: 'Starter or Enterprise',
                                icon: <IconSparkles size={20} color="#a78bfa" />,
                                description: 'Automated AI transcript processing and meeting highlights extraction are available on Starter and Enterprise plans.'
                            })
                            return
                        }
                        onToggleSummary()
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAI ? 1 : 0.85 }}>AI Smart Summary</span>
                    {showSummary && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                    {!canAccessAI && (
                        <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                        }}>
                            <IconLock size={9} /> PRO
                        </span>
                    )}
                </button>
            )}

            {/* Catch Me Up (Late Joiner AI Summary) */}
            <button
                onClick={() => {
                    onClose()
                    if (!canAccessAI) {
                        onRequireUpgrade({
                            title: 'AI Catch Me Up (Recap)',
                            requiredPlan: 'Starter or Enterprise',
                            icon: <IconSparkles size={20} color="#c084fc" />,
                            description: 'AI-generated recap for late joiners summarizing discussions, key takeaways, and action items requires a Starter or Enterprise plan.'
                        })
                        return
                    }
                    onOpenCatchUp()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(168, 85, 247, 0.16)',
                    color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <IconSparkles size={15} />
                </div>
                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAI ? 1 : 0.85 }}>Catch Me Up (Recap)</span>
                {!canAccessAI ? (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#000',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                    }}>
                        <IconLock size={9} /> PRO
                    </span>
                ) : (
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#d8b4fe', background: 'rgba(168,85,247,0.2)', padding: '2px 6px', borderRadius: '6px' }}>AI</span>
                )}
            </button>

            {/* Next-Gen: Meeting Talk-Time & Analytics */}
            <button
                onClick={() => {
                    onClose()
                    onOpenAnalytics()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(99, 102, 241, 0.16)',
                    color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Talk-Time & Analytics</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.2)', padding: '2px 6px', borderRadius: '6px' }}>NEW</span>
            </button>

            {/* Next-Gen: Confidential Anti-Leak Mode */}
            <button
                onClick={() => {
                    onClose()
                    onToggleConfidentialMode()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isConfidentialMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isConfidentialMode ? '#f87171' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <IconShield size={15} />
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Confidential Anti-Leak Watermark</span>
                <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    color: isConfidentialMode ? '#f87171' : '#94a3b8',
                    background: isConfidentialMode ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: '6px'
                }}>
                    {isConfidentialMode ? 'ACTIVE' : 'OFF'}
                </span>
            </button>

            {/* Next-Gen: AI Real-Time Voice Dubbing */}
            <button
                onClick={() => {
                    onClose()
                    onToggleVoiceDubbing()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isVoiceDubbingEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isVoiceDubbingEnabled ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>AI Live Voice Dubbing</span>
                <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    color: isVoiceDubbingEnabled ? '#34d399' : '#94a3b8',
                    background: isVoiceDubbingEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: '6px'
                }}>
                    {isVoiceDubbingEnabled ? 'ACTIVE' : 'OFF'}
                </span>
            </button>

            {/* Shared Files */}
            {(!isGuest || canManageParticipants) && (
                <button
                    onClick={() => {
                        onClose()
                        onTogglePanel('files')
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(14, 165, 233, 0.12)',
                        color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left' }}>Shared Files</span>
                    {activePanel === 'files' && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
                </button>
            )}

            {/* Collaborative Notes */}
            <button
                onClick={() => {
                    onClose()
                    onTogglePanel('notes')
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(234, 179, 8, 0.12)',
                    color: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Meeting Notes</span>
                {activePanel === 'notes' && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>OPEN</span>}
            </button>

            {/* Picture in Picture */}
            <button
                onClick={() => {
                    onClose()
                    handleTogglePiP()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><rect x="13" y="11" width="7" height="6" rx="1.5" fill="currentColor" opacity="0.4"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Picture-in-Picture</span>
                {isPiPActive && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</span>}
            </button>

            {/* Data Saver Mode */}
            <button
                onClick={() => {
                    onClose()
                    onToggleLowBandwidthMode()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: lowBandwidthMode ? 'rgba(34, 197, 94, 0.18)' : 'rgba(148, 163, 184, 0.1)',
                    color: lowBandwidthMode ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Data Saver Mode</span>
                <span style={{ fontSize: '0.7rem', color: lowBandwidthMode ? '#34d399' : 'var(--color-text-muted)', fontWeight: 600 }}>
                    {lowBandwidthMode ? 'ON' : 'OFF'}
                </span>
            </button>

            {/* Change Layout */}
            <button
                onClick={() => {
                    onClose()
                    onOpenLayoutModal()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Change Layout</span>
                <span style={{ fontSize: '0.6875rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                    {layoutMode}
                </span>
            </button>

            {/* Studio Soft Lighting */}
            <button
                onClick={() => {
                    onClose()
                    onToggleStudioLighting()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isStudioLightingEnabled ? 'rgba(251, 191, 36, 0.18)' : 'rgba(148, 163, 184, 0.1)',
                    color: isStudioLightingEnabled ? '#fbbf24' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Studio Soft Lighting</span>
                <span style={{ fontSize: '0.7rem', color: isStudioLightingEnabled ? '#fbbf24' : 'var(--color-text-muted)', fontWeight: 600 }}>
                    {isStudioLightingEnabled ? 'ON' : 'OFF'}
                </span>
            </button>

            {/* RTMP Live Stream Studio */}
            <button
                onClick={() => {
                    onClose()
                    if (!canAccessRTMP) {
                        onRequireUpgrade({
                            title: 'RTMP Live Streaming Studio',
                            requiredPlan: 'Enterprise Tier',
                            icon: <IconRocket size={20} color="#c084fc" />,
                            description: 'Streaming live broadcast video to YouTube, Facebook, Twitch, or external CDN endpoints requires the Enterprise tier.'
                        })
                        return
                    }
                    onOpenLiveStreamModal()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: isLiveStreaming ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    border: isLiveStreaming ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                    borderRadius: '10px',
                    color: isLiveStreaming ? '#fca5a5' : '#fff',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = isLiveStreaming ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isLiveStreaming ? 'rgba(239, 68, 68, 0.15)' : 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isLiveStreaming ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M7.76 7.76a6 6 0 0 0 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessRTMP ? 1 : 0.85 }}>RTMP Live Streaming Studio</span>
                {canAccessRTMP ? (
                    <span style={{
                        fontSize: '0.6875rem',
                        color: isLiveStreaming ? '#ef4444' : '#818cf8',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isLiveStreaming ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)',
                        padding: '2px 6px',
                        borderRadius: 4
                    }}>
                        {isLiveStreaming ? 'LIVE' : 'SETUP'}
                    </span>
                ) : (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                    }}>
                        <IconLock size={9} /> ENTERPRISE
                    </span>
                )}
            </button>

            {/* Meeting Attendance & Participation Report */}
            <button
                onClick={() => {
                    onClose()
                    if (!canAccessAttendance) {
                        onRequireUpgrade({
                            title: 'Attendance & Participation Report',
                            requiredPlan: 'Starter or Enterprise',
                            icon: <IconFileText size={20} color="#818cf8" />,
                            description: 'Participant attendance tracking, check-in logs, and engagement audit reports require a Starter or Enterprise plan.'
                        })
                        return
                    }
                    onOpenAttendanceModal()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessAttendance ? 1 : 0.85 }}>Attendance &amp; Participation</span>
                {!canAccessAttendance ? (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#000',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                    }}>
                        <IconLock size={9} /> PRO
                    </span>
                ) : (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#818cf8',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.02em'
                    }}>
                        REPORT
                    </span>
                )}
            </button>

            {/* Visual Effects & Virtual Backgrounds */}
            <button
                onClick={() => {
                    onClose()
                    onOpenVirtualBgModal()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(168, 85, 247, 0.12)',
                    color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Apply Visual Effects</span>
                {virtualBgPreset !== 'none' && (
                    <span style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.18)', padding: '2px 6px', borderRadius: 4 }}>
                        ACTIVE
                    </span>
                )}
            </button>

            {/* End-to-End Encryption */}
            <button
                onClick={() => {
                    onClose()
                    if (!canAccessE2EE) {
                        onRequireUpgrade({
                            title: 'Hardware SFrame E2EE Security',
                            requiredPlan: 'Enterprise Tier',
                            icon: <IconShield size={20} color="#34d399" />,
                            description: 'End-to-End Encryption (E2EE) with zero-knowledge cryptographic key verification requires the Enterprise tier.'
                        })
                        return
                    }
                    onOpenE2EEModal()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessE2EE ? 1 : 0.85 }}>End-to-End Encryption</span>
                {!canAccessE2EE ? (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                    }}>
                        <IconLock size={9} /> ENTERPRISE
                    </span>
                ) : (
                    <span style={{ fontSize: '0.6875rem', color: isE2EEActive ? '#34d399' : '#94a3b8', fontWeight: 700, background: isE2EEActive ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                        {isE2EEActive ? 'SECURED' : 'CONFIGURE'}
                    </span>
                )}
            </button>

            {/* Phone Audio Dial-In (PSTN) */}
            <button
                onClick={() => {
                    onClose()
                    if (!canAccessDialIn) {
                        onRequireUpgrade({
                            title: 'Phone Audio Dial-In (PSTN)',
                            requiredPlan: 'Enterprise Tier',
                            icon: <IconRocket size={20} color="#38bdf8" />,
                            description: 'PSTN phone bridges with toll-free and international dial-in numbers require an Enterprise subscription.'
                        })
                        return
                    }
                    onOpenDialInModal()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left', opacity: canAccessDialIn ? 1 : 0.85 }}>Phone Audio Dial-In</span>
                {!canAccessDialIn ? (
                    <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                    }}>
                        <IconLock size={9} /> ENTERPRISE
                    </span>
                ) : (
                    <span style={{ fontSize: '0.6875rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(14,165,233,0.18)', padding: '2px 6px', borderRadius: 4 }}>
                        PSTN
                    </span>
                )}
            </button>

            {/* Webinar Mode Toggle */}
            {canManageParticipants && (
                <button
                    onClick={() => {
                        onClose()
                        if (!canAccessWebinar) {
                            onRequireUpgrade({
                                title: 'Webinar Stage Broadcast Mode',
                                requiredPlan: 'Enterprise Tier',
                                icon: <IconRocket size={20} color="#fb7185" />,
                                description: 'Large-scale 500+ viewer broadcast mode with stage management and moderated attendee controls requires an Enterprise tier plan.'
                            })
                            return
                        }
                        onToggleWebinarMode()
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: isWebinarMode ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.12)',
                        color: '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', opacity: canAccessWebinar ? 1 : 0.85 }}>Webinar Stage Mode</span>
                    {!canAccessWebinar ? (
                        <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                        }}>
                            <IconLock size={9} /> ENTERPRISE
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.6875rem', color: isWebinarMode ? '#fb7185' : '#94a3b8', fontWeight: 700, background: isWebinarMode ? 'rgba(244,63,94,0.18)' : 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                            {isWebinarMode ? 'ACTIVE' : 'OFF'}
                        </span>
                    )}
                </button>
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Settings */}
            <button
                onClick={() => {
                    onClose()
                    onOpenDeviceSettings()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(148, 163, 184, 0.1)',
                    color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Audio &amp; Video Settings</span>
            </button>

            {/* Shortcuts */}
            <button
                onClick={() => {
                    onClose()
                    onOpenShortcuts()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(148, 163, 184, 0.1)',
                    color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>Keyboard Shortcuts</span>
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Leave Meeting item */}
            <button
                onClick={() => {
                    onClose()
                    onLeaveOrEndMeeting()
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                    background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '10px',
                    color: '#f87171', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <IconPhoneOff size={15} color="#ef4444" />
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>{isLocalHost ? 'End / Leave Meeting' : 'Leave Meeting'}</span>
            </button>
        </div>
    )
}
