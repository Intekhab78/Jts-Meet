import React from 'react'
import {
    IconVideo,
    IconLock,
    IconRocket,
    IconClock,
    IconMonitor,
    IconShield
} from '../../../components/common/Icons'

export interface MeetingHeaderProps {
    isWebinarAttendee: boolean
    isRecording: boolean
    isRemoteRecording: boolean
    isCloudRecording: boolean
    meetingDisplayId: string
    canAccessE2EE: boolean
    isE2EEActive: boolean
    canAccessDialIn: boolean
    isGuest: boolean
    canManageParticipants: boolean
    isWaitingRoomActive: boolean
    waitingGuestsCount: number
    isScreenShareActive: boolean
    activePresenterId: string | null
    screenSharingUserIds?: string[]
    primaryUser: string | null
    screenSharingUserId: string | null
    pinnedUserId: string | null
    currentPlanTier: string
    freeTimeRemaining: number
    timerStr: string
    connected: boolean
    isConfidentialMode: boolean
    participantsCount: number
    getUserDisplayName: (id: string) => string
    switchActivePresenter: (id: string) => void
    setPinnedUserId: (id: string | null) => void
    addToast: (msg: string, type?: any) => void
    formatRemainingTime: (sec: number) => string
    onUpgradePlanRequest?: () => void
    onRequireUpgrade: (feature: { title: string; requiredPlan: string; icon: React.ReactNode; description: string }) => void
    onOpenE2EE: () => void
    onOpenDialIn: () => void
    onOpenInvite: () => void
    onToggleWaitingRoom: (active: boolean) => void
    onOpenParticipantsPanel: () => void
    onOpenAnalytics: () => void
    onOpenCatchUp: () => void
}

export function MeetingHeader({
    isWebinarAttendee,
    isRecording,
    isRemoteRecording,
    isCloudRecording,
    meetingDisplayId,
    canAccessE2EE,
    isE2EEActive,
    canAccessDialIn,
    isGuest,
    canManageParticipants,
    isWaitingRoomActive,
    waitingGuestsCount,
    isScreenShareActive,
    activePresenterId,
    screenSharingUserIds,
    primaryUser,
    screenSharingUserId,
    pinnedUserId,
    currentPlanTier,
    freeTimeRemaining,
    timerStr,
    connected,
    isConfidentialMode,
    participantsCount,
    getUserDisplayName,
    switchActivePresenter,
    setPinnedUserId,
    addToast,
    formatRemainingTime,
    onUpgradePlanRequest,
    onRequireUpgrade,
    onOpenE2EE,
    onOpenDialIn,
    onOpenInvite,
    onToggleWaitingRoom,
    onOpenParticipantsPanel,
    onOpenAnalytics,
    onOpenCatchUp
}: MeetingHeaderProps) {
    if (isWebinarAttendee) return null

    return (
        <header style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 18px',
            background: 'rgba(10, 11, 15, 0.88)',
            backdropFilter: 'blur(24px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}>
            {/* Brand & Recording indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 32, height: 32,
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                        flexShrink: 0,
                    }}>
                        <IconVideo size={16} />
                    </div>
                    <span className="hidden sm:inline" style={{
                        fontSize: '0.95rem', fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: '#ffffff',
                    }}>
                        JTS<span className="gradient-text">Meet</span>
                    </span>
                </div>

                <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.1)' }} className="hidden sm:block" />

                {/* Recording Badge */}
                {(isRecording || isRemoteRecording || isCloudRecording) && (
                    <span style={{
                        height: 30,
                        borderRadius: '9999px',
                        padding: '0 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        fontSize: '0.6875rem',
                        fontWeight: 700
                    }} className="anim-fade-in">
                        <span className="badge-dot danger pulse" style={{ width: 6, height: 6 }} />
                        {isCloudRecording ? 'CLOUD REC' : 'REC'}
                    </span>
                )}
            </div>

            {/* Center: meeting details & actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="hidden md:inline-flex" style={{
                    height: 30,
                    alignItems: 'center',
                    fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8',
                    fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.04)',
                    padding: '0 10px', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    {meetingDisplayId}
                </span>
                <button
                    type="button"
                    onClick={() => {
                        if (!canAccessE2EE) {
                            onRequireUpgrade({
                                title: 'End-to-End Encryption (E2EE)',
                                requiredPlan: 'Enterprise Plan',
                                icon: <IconShield size={20} color="#34d399" />,
                                description: 'Zero-knowledge WebRTC SFrame E2EE with cryptographic key verification is an Enterprise tier security feature.'
                            })
                            return
                        }
                        onOpenE2EE()
                    }}
                    title={isE2EEActive ? "End-to-End Encrypted (AES-GCM-128)" : "E2EE Security Settings"}
                    style={{
                        height: 30,
                        padding: '0 10px',
                        fontSize: '0.72rem', fontWeight: 700,
                        borderRadius: '9999px',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: isE2EEActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        color: isE2EEActive ? '#34d399' : '#94a3b8',
                        border: `1px solid ${isE2EEActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                        cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>{isE2EEActive ? 'E2EE' : 'Standard'}</span>
                    {!canAccessE2EE && (
                        <span style={{
                            fontSize: '0.5625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            color: '#fff',
                            padding: '1px 4px',
                            borderRadius: 3,
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <IconLock size={8} /> ENT
                        </span>
                    )}
                </button>

                {/* Phone Audio Dial-In Button */}
                <button
                    type="button"
                    onClick={() => {
                        if (!canAccessDialIn) {
                            onRequireUpgrade({
                                title: 'Phone Audio Dial-In (PSTN)',
                                requiredPlan: 'Enterprise Plan',
                                icon: <IconRocket size={20} color="#38bdf8" />,
                                description: 'Connecting to meetings via global phone dial-in and toll-free telephone bridges requires an Enterprise plan.'
                            })
                            return
                        }
                        onOpenDialIn()
                    }}
                    title="Join by Phone (Dial-In & PIN)"
                    style={{
                        height: 30,
                        padding: '0 10px', fontSize: '0.72rem', fontWeight: 700,
                        borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Dial-In</span>
                    {!canAccessDialIn && (
                        <span style={{
                            fontSize: '0.5625rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            color: '#fff',
                            padding: '1px 4px',
                            borderRadius: 3,
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <IconLock size={8} /> ENT
                        </span>
                    )}
                </button>

                {!isGuest && (
                    <button
                        type="button"
                        onClick={onOpenInvite}
                        style={{
                            height: 30,
                            padding: '0 12px', fontSize: '0.72rem', fontWeight: 700,
                            borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: 5,
                            background: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe',
                            border: '1px solid rgba(99, 102, 241, 0.35)', cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)' }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        <span>Invite</span>
                    </button>
                )}

                {canManageParticipants && (
                    <button
                        type="button"
                        onClick={() => onToggleWaitingRoom(!isWaitingRoomActive)}
                        title={isWaitingRoomActive
                            ? "Waiting Room: ON (Host approval required for participants). Click to allow everyone directly without approval."
                            : "Waiting Room: OFF (Everyone joins directly without approval). Click to require approval."}
                        style={{
                            height: 30,
                            padding: '0 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: isWaitingRoomActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: isWaitingRoomActive ? '#34d399' : '#fbbf24',
                            border: `1px solid ${isWaitingRoomActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {isWaitingRoomActive ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                        )}
                        <span>{isWaitingRoomActive ? 'Waiting Room' : 'Open Room'}</span>
                    </button>
                )}

                {canManageParticipants && waitingGuestsCount > 0 && (
                    <button
                        type="button"
                        onClick={onOpenParticipantsPanel}
                        title={`${waitingGuestsCount} participant(s) waiting for host admission. Click to open Participants list.`}
                        style={{
                            height: 30,
                            padding: '0 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{waitingGuestsCount} Waiting</span>
                    </button>
                )}

                {/* Multi-Presenter or Single Presenter Badge in Header */}
                {isScreenShareActive && activePresenterId && (
                    screenSharingUserIds && screenSharingUserIds.length > 1 ? (
                        <div style={{
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(15, 23, 42, 0.85)',
                            backdropFilter: 'blur(10px)',
                            padding: '0 6px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            fontSize: '0.72rem'
                        }}>
                            <span style={{ color: '#818cf8', fontWeight: 700, padding: '0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <IconMonitor size={12} />
                                <span>Screens:</span>
                            </span>
                            {screenSharingUserIds.map((uId) => {
                                const isViewing = primaryUser === uId || (screenSharingUserId === uId && !pinnedUserId)
                                const name = uId === 'me' ? 'You' : getUserDisplayName(uId).split(' ')[0]
                                return (
                                    <button
                                        key={uId}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            switchActivePresenter(uId)
                                            setPinnedUserId(uId === 'me' ? 'me' : uId)
                                            addToast(`Viewing ${uId === 'me' ? 'Your' : name}'s screen`, 'info')
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 8px',
                                            borderRadius: '9999px',
                                            border: isViewing ? '1px solid #818cf8' : '1px solid transparent',
                                            background: isViewing ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))' : 'rgba(255, 255, 255, 0.08)',
                                            color: '#fff',
                                            fontSize: '0.7rem',
                                            fontWeight: isViewing ? 700 : 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            whiteSpace: 'nowrap'
                                        }}
                                        title={`Switch to ${uId === 'me' ? 'your' : name}'s screen`}
                                    >
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: isViewing ? '#4ade80' : '#94a3b8'
                                        }} />
                                        <span>{name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <span style={{
                            height: 30,
                            padding: '0 10px',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#c7d2fe',
                            fontSize: '0.72rem',
                            fontWeight: 700
                        }} className="anim-fade-in">
                            <span className="badge-dot accent pulse" />
                            <span>{activePresenterId === 'me' ? 'Sharing screen' : `${getUserDisplayName(activePresenterId)} presenting`}</span>
                        </span>
                    )
                )}
            </div>

            {/* Right: status & participant count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Plan Duration / Free Plan Countdown Pill */}
                {currentPlanTier === 'free' ? (
                    <div
                        onClick={() => {
                            if (onUpgradePlanRequest) onUpgradePlanRequest()
                            else onRequireUpgrade({
                                title: 'Unlimited Meeting Duration',
                                requiredPlan: 'Growth Pro',
                                icon: <IconClock size={20} color="#f59e0b" />,
                                description: 'Upgrade to Growth Pro or Enterprise to host unlimited 24/7 meetings with no time limits.'
                            })
                        }}
                        title="Free Plan: 45-minute meeting limit. Click to upgrade for unlimited duration."
                        style={{
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0 10px',
                            borderRadius: '9999px',
                            background: freeTimeRemaining <= 600 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                            border: `1px solid ${freeTimeRemaining <= 600 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.25)'}`,
                            color: freeTimeRemaining <= 600 ? '#f87171' : '#fbbf24',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: freeTimeRemaining <= 600 ? '0 0 12px rgba(239, 68, 68, 0.3)' : undefined
                        }}
                    >
                        {freeTimeRemaining <= 600 ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        )}
                        <span>{formatRemainingTime(freeTimeRemaining)} left</span>
                        <span style={{
                            fontSize: '0.6rem',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: '#fff',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontWeight: 800,
                            letterSpacing: '0.02em'
                        }}>UPGRADE</span>
                    </div>
                ) : (
                    <div
                        style={{
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0 10px',
                            borderRadius: '9999px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: 600
                        }}
                        title={`Call Duration: ${timerStr}`}
                    >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        <span>{timerStr}</span>
                        <span style={{
                            fontSize: '0.58rem',
                            background: currentPlanTier === 'enterprise' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(99, 102, 241, 0.18)',
                            color: currentPlanTier === 'enterprise' ? '#c084fc' : '#818cf8',
                            border: `1px solid ${currentPlanTier === 'enterprise' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {currentPlanTier}
                        </span>
                    </div>
                )}

                <span style={{
                    height: 30,
                    padding: '0 10px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: connected ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                    color: connected ? '#4ade80' : '#f87171',
                    fontSize: '0.7rem',
                    fontWeight: 700
                }}>
                    <span className={`badge-dot ${connected ? 'success pulse' : 'danger'}`} />
                    <span>{connected ? 'Live' : 'Offline'}</span>
                </span>

                {/* CONFIDENTIAL ANTI-LEAK BADGE */}
                {isConfidentialMode && (
                    <div
                        style={{
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '0 10px',
                            borderRadius: '9999px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em'
                        }}
                        title="Confidential Anti-Leak Watermark Active"
                    >
                        <span>🛡️ CONFIDENTIAL</span>
                    </div>
                )}

                {/* TALK-TIME & ENGAGEMENT ANALYTICS BUTTON */}
                <button
                    type="button"
                    onClick={onOpenAnalytics}
                    style={{
                        height: 30,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '0 10px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
                    title="View Talk-Time Distribution and Meeting Analytics"
                >
                    <span>📊 Analytics</span>
                </button>

                {/* CATCH ME UP BUTTON */}
                <button
                    type="button"
                    onClick={onOpenCatchUp}
                    style={{
                        height: 30,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '0 11px',
                        borderRadius: '9999px',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.18) 100%)',
                        border: '1px solid rgba(168, 85, 247, 0.35)',
                        color: '#e9d5ff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.32) 0%, rgba(99, 102, 241, 0.28) 100%)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.18) 100%)' }}
                    title="Instant AI Recap of ongoing meeting discussions"
                >
                    <span>⚡ Catch Me Up</span>
                </button>
                <div style={{
                    height: 30,
                    fontSize: '0.75rem', color: '#cbd5e1',
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '0 10px', borderRadius: '9999px',
                    fontWeight: 600
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{participantsCount}</span>
                </div>
            </div>
        </header>
    )
}
