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
    isLiveStreaming?: boolean
    remoteLiveStatus?: { isStreaming: boolean; platform?: string } | null
    liveStreamConfig?: { platform?: string } | null
    onOpenLiveStream?: () => void
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
    isLiveStreaming,
    remoteLiveStatus,
    liveStreamConfig,
    onOpenLiveStream,
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
            {/* Left: Brand & Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
                        fontSize: '0.92rem', fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: '#ffffff',
                        whiteSpace: 'nowrap'
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
                        padding: '0 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }} className="anim-fade-in" title={isCloudRecording ? 'Cloud Recording Active' : 'Local Recording Active'}>
                        <span className="badge-dot danger pulse" style={{ width: 6, height: 6 }} />
                        <span>{isCloudRecording ? 'CLOUD' : 'REC'}</span>
                    </span>
                )}

                {/* Live Streaming Badge (Clean single-line pill) */}
                {(isLiveStreaming || remoteLiveStatus?.isStreaming) && (
                    <button
                        type="button"
                        onClick={onOpenLiveStream}
                        title={`Live Broadcast Active: ${(liveStreamConfig?.platform || remoteLiveStatus?.platform || 'RTMP').toUpperCase()} • Click to manage`}
                        style={{
                            height: 30,
                            borderRadius: '9999px',
                            padding: '0 9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#fff',
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.45)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                        }}
                        className="anim-fade-in"
                    >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                        <span>LIVE</span>
                        <span style={{ opacity: 0.85, fontSize: '0.65rem' }}>⚙️</span>
                    </button>
                )}
            </div>

            {/* Center: Meeting Controls & Presenter Badge (Clean Icon-Based & No-Wrap) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {/* Meeting ID (truncated with tooltip) */}
                <span 
                    className="hidden lg:inline-flex" 
                    title={`Meeting ID: ${meetingDisplayId}`}
                    style={{
                        height: 30,
                        alignItems: 'center',
                        fontSize: '0.74rem', fontWeight: 600, color: '#94a3b8',
                        fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.04)',
                        padding: '0 9px', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.08)',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}
                >
                    {meetingDisplayId}
                </span>

                {/* E2EE Security Icon Button */}
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
                    title={isE2EEActive ? "End-to-End Encrypted (AES-GCM-128) • Secured" : "E2EE Security Settings"}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isE2EEActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: isE2EEActive ? '#34d399' : '#94a3b8',
                        border: `1px solid ${isE2EEActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = isE2EEActive ? '#34d399' : 'rgba(255,255,255,0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = isE2EEActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </button>

                {/* Phone Audio Dial-In Icon Button */}
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
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(14, 165, 233, 0.12)',
                        color: '#38bdf8',
                        border: '1px solid rgba(14, 165, 233, 0.28)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'rgba(14, 165, 233, 0.22)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(14, 165, 233, 0.12)' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                </button>

                {/* Invite Icon Button */}
                {!isGuest && (
                    <button
                        type="button"
                        onClick={onOpenInvite}
                        title="Invite Participants (Copy link & code)"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#c7d2fe',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                    </button>
                )}

                {/* Waiting Room / Room Lock Icon Button */}
                {canManageParticipants && (
                    <button
                        type="button"
                        onClick={() => onToggleWaitingRoom(!isWaitingRoomActive)}
                        title={isWaitingRoomActive
                            ? "Waiting Room is ON (Host approval required for participants). Click to open room."
                            : "Waiting Room is OFF (Open Room - Anyone can join directly). Click to require approval."}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isWaitingRoomActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isWaitingRoomActive ? '#34d399' : '#fbbf24',
                            border: `1px solid ${isWaitingRoomActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
                    >
                        {isWaitingRoomActive ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Waiting Guests Alert Badge (if guests waiting) */}
                {canManageParticipants && waitingGuestsCount > 0 && (
                    <button
                        type="button"
                        onClick={onOpenParticipantsPanel}
                        title={`${waitingGuestsCount} guest(s) waiting for admission. Click to review.`}
                        style={{
                            height: 30,
                            padding: '0 8px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.45)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                        <span>{waitingGuestsCount} Waiting</span>
                    </button>
                )}

                {/* Multi-Presenter or Single Presenter Badge (Clean single-line with ellipsis) */}
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
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                        }}>
                            <span style={{ color: '#818cf8', fontWeight: 700, padding: '0 3px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <IconMonitor size={12} />
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
                                            padding: '2px 7px',
                                            borderRadius: '9999px',
                                            border: isViewing ? '1px solid #818cf8' : '1px solid transparent',
                                            background: isViewing ? 'rgba(99, 102, 241, 0.85)' : 'rgba(255, 255, 255, 0.08)',
                                            color: '#fff',
                                            fontSize: '0.68rem',
                                            fontWeight: isViewing ? 700 : 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            whiteSpace: 'nowrap'
                                        }}
                                        title={`Switch to ${uId === 'me' ? 'your' : name}'s screen`}
                                    >
                                        <span style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: '50%',
                                            background: isViewing ? '#4ade80' : '#94a3b8'
                                        }} />
                                        <span>{name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <span 
                            title={activePresenterId === 'me' ? 'You are sharing your screen' : `${getUserDisplayName(activePresenterId)} is presenting`}
                            style={{
                                height: 30,
                                padding: '0 10px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                color: '#c7d2fe',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }} 
                            className="anim-fade-in"
                        >
                            <IconMonitor size={13} color="#818cf8" />
                            <span style={{
                                maxWidth: 110,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                            }}>
                                {activePresenterId === 'me' ? 'Your Screen' : `${getUserDisplayName(activePresenterId).split(' ')[0]}'s Screen`}
                            </span>
                        </span>
                    )
                )}
            </div>

            {/* Right: Timer, AI/Analytics Icons, & Participants (Clean & Non-Overlapping) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {/* Plan Duration / Free Countdown or Timer Pill */}
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
                        title="Free Plan: 45-minute limit. Click to upgrade."
                        style={{
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '0 9px',
                            borderRadius: '9999px',
                            background: freeTimeRemaining <= 600 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                            border: `1px solid ${freeTimeRemaining <= 600 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.25)'}`,
                            color: freeTimeRemaining <= 600 ? '#f87171' : '#fbbf24',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: freeTimeRemaining <= 600 ? '#ef4444' : '#f59e0b', display: 'inline-block' }} />
                        <span>{formatRemainingTime(freeTimeRemaining)}</span>
                        <span style={{
                            fontSize: '0.58rem',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: '#fff',
                            padding: '1px 4px',
                            borderRadius: 3,
                            fontWeight: 800
                        }}>UP</span>
                    </div>
                ) : (
                    <div
                        style={{
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0 9px',
                            borderRadius: '9999px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#e2e8f0',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                        title={`Call Duration: ${timerStr} • Connected • Plan: ${currentPlanTier.toUpperCase()}`}
                    >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                        <span style={{ fontFamily: 'monospace' }}>{timerStr}</span>
                        {currentPlanTier && (
                            <span style={{
                                fontSize: '0.58rem',
                                background: currentPlanTier === 'enterprise' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                color: currentPlanTier === 'enterprise' ? '#c084fc' : '#818cf8',
                                border: `1px solid ${currentPlanTier === 'enterprise' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 800,
                                textTransform: 'uppercase'
                            }}>
                                {currentPlanTier === 'enterprise' ? 'ENT' : currentPlanTier === 'growth_pro' ? 'PRO' : currentPlanTier}
                            </span>
                        )}
                    </div>
                )}

                {/* Offline Warning Badge (Only shown if disconnected) */}
                {!connected && (
                    <span style={{
                        height: 30,
                        padding: '0 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        <span className="badge-dot danger pulse" style={{ width: 5, height: 5 }} />
                        <span>Offline</span>
                    </span>
                )}

                {/* Confidential Mode Icon Badge */}
                {isConfidentialMode && (
                    <div
                        style={{
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '0 8px',
                            borderRadius: '9999px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                        title="Confidential Anti-Leak Watermark Active"
                    >
                        <span>🛡️</span>
                    </div>
                )}

                {/* Meeting Analytics Icon Button */}
                <button
                    type="button"
                    onClick={onOpenAnalytics}
                    title="Meeting Analytics & Talk-Time Distribution"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                </button>

                {/* Catch Me Up AI Icon Button */}
                <button
                    type="button"
                    onClick={onOpenCatchUp}
                    title="Catch Me Up: Instant AI Meeting Recap"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.18) 100%)',
                        border: '1px solid rgba(168, 85, 247, 0.35)',
                        color: '#e9d5ff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(168, 85, 247, 0.4)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                </button>

                {/* Participants Pill Button */}
                <button
                    type="button"
                    onClick={onOpenParticipantsPanel}
                    title="View Participants"
                    style={{
                        height: 30,
                        fontSize: '0.72rem',
                        color: '#cbd5e1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0 9px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{participantsCount}</span>
                </button>
            </div>
        </header>
    )
}
