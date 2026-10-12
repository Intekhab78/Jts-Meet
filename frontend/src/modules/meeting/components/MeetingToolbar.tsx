import React from 'react'
import {
    IconMic,
    IconMicOff,
    IconVideo,
    IconVideoOff,
    IconMonitor,
    IconHand,
    IconHeart,
    IconUsers,
    IconMessage,
    IconCaptions,
    IconPhoneOff
} from '../../../components/common/Icons'
import { isScreenShareSupported } from '../services/screen.service'

export interface MeetingToolbarProps {
    isWebinarAttendee: boolean
    footerToolbarRef: React.RefObject<any>
    isToolbarActuallyVisible: boolean
    windowWidth: number
    onToolbarMouseEnter: () => void
    onToolbarMouseLeave: () => void
    isMuted: boolean
    toggleMute: () => void
    isVideoOff: boolean
    toggleVideo: () => void
    connected: boolean
    joined: boolean
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    screenSharePolicy: string
    canManageParticipants: boolean
    isLocalHost: boolean
    onToggleScreenShare: () => void
    handRaised: boolean
    onToggleHandRaise: () => void
    reactionBtnRef: React.RefObject<any>
    showReactionsPopover: boolean
    onToggleReactionsPopover: () => void
    activePanel: string | null
    onTogglePanel: (panel: any) => void
    waitingGuestsCount: number
    participantsCount: number
    unreadChatCount: number
    showCaptions: boolean
    onToggleCaptions: () => void
    moreBtnRef: React.RefObject<any>
    showMoreMenu: boolean
    onToggleMoreMenu: (e: React.MouseEvent) => void
    onLeaveOrEndMeeting: () => void
}

export function MeetingToolbar({
    isWebinarAttendee,
    footerToolbarRef,
    isToolbarActuallyVisible,
    windowWidth,
    onToolbarMouseEnter,
    onToolbarMouseLeave,
    isMuted,
    toggleMute,
    isVideoOff,
    toggleVideo,
    connected,
    joined,
    screenSharingUserId,
    screenSharingUserIds,
    screenSharePolicy,
    canManageParticipants,
    isLocalHost,
    onToggleScreenShare,
    handRaised,
    onToggleHandRaise,
    reactionBtnRef,
    showReactionsPopover,
    onToggleReactionsPopover,
    activePanel,
    onTogglePanel,
    waitingGuestsCount,
    participantsCount,
    unreadChatCount,
    showCaptions,
    onToggleCaptions,
    moreBtnRef,
    showMoreMenu,
    onToggleMoreMenu,
    onLeaveOrEndMeeting
}: MeetingToolbarProps) {
    if (isWebinarAttendee) return null

    return (
        <footer
            ref={footerToolbarRef}
            className="meeting-toolbar"
            onMouseEnter={onToolbarMouseEnter}
            onMouseLeave={onToolbarMouseLeave}
            style={{
                position: 'absolute',
                bottom: windowWidth < 640 ? 12 : 20,
                left: '50%',
                transform: `translateX(-50%) translateY(${isToolbarActuallyVisible ? '0px' : '100px'})`,
                height: windowWidth < 640 ? 54 : 64,
                display: 'flex',
                alignItems: 'center',
                gap: windowWidth < 640 ? 8 : 12,
                padding: windowWidth < 640 ? '0 12px' : '0 20px',
                background: 'rgba(10,11,15,0.92)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '40px',
                boxShadow: '0 12px 42px rgba(0,0,0,0.65)',
                zIndex: 10000,
                opacity: isToolbarActuallyVisible ? 1 : 0,
                pointerEvents: isToolbarActuallyVisible ? 'auto' : 'none',
                maxWidth: 'calc(100vw - 16px)',
                overflowX: windowWidth < 640 ? 'auto' : 'visible',
                scrollbarWidth: 'none',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
            }}
        >
            {/* Mic Trigger */}
            <button
                onClick={toggleMute}
                style={{
                    width: windowWidth < 640 ? 40 : 46,
                    height: windowWidth < 640 ? 40 : 46,
                    minWidth: windowWidth < 640 ? 40 : 46,
                    minHeight: windowWidth < 640 ? 40 : 46,
                    padding: 0,
                    borderRadius: '50%',
                    border: isMuted ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isMuted ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isMuted ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                title={isMuted ? "Unmute Mic (Ctrl+D)" : "Mute Mic (Ctrl+D)"}
            >
                {isMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
            </button>

            {/* Camera Trigger */}
            <button
                onClick={toggleVideo}
                style={{
                    width: windowWidth < 640 ? 40 : 46,
                    height: windowWidth < 640 ? 40 : 46,
                    minWidth: windowWidth < 640 ? 40 : 46,
                    minHeight: windowWidth < 640 ? 40 : 46,
                    padding: 0,
                    borderRadius: '50%',
                    border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isVideoOff ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isVideoOff ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                title={isVideoOff ? "Turn on Camera (Ctrl+E)" : "Turn off Camera (Ctrl+E)"}
            >
                {isVideoOff ? <IconVideoOff size={22} /> : <IconVideo size={22} />}
            </button>

            {/* Screen Share Trigger */}
            {isScreenShareSupported() && (
                <button
                    onClick={onToggleScreenShare}
                    disabled={!connected || !joined}
                    style={{
                        width: windowWidth < 640 ? 38 : 44,
                        height: windowWidth < 640 ? 38 : 44,
                        borderRadius: '50%',
                        border: 'none',
                        background: (screenSharingUserId === 'me' || screenSharingUserIds.includes('me'))
                            ? 'var(--color-accent)'
                            : (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost)
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(255,255,255,0.08)',
                        color: (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost)
                            ? 'var(--color-text-muted)'
                            : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        opacity: (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost) ? 0.6 : 1
                    }}
                    title={(screenSharingUserId === 'me' || screenSharingUserIds.includes('me'))
                        ? "Stop sharing screen"
                        : (screenSharePolicy === 'host_only' && !canManageParticipants && !isLocalHost)
                            ? "Screen sharing restricted to Host only"
                            : "Share screen"}
                >
                    <IconMonitor />
                </button>
            )}

            {/* Hand Raise Trigger */}
            <button
                onClick={onToggleHandRaise}
                style={{
                    width: windowWidth < 640 ? 38 : 44,
                    height: windowWidth < 640 ? 38 : 44,
                    borderRadius: '50%',
                    border: 'none',
                    background: handRaised ? 'var(--color-warning)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}
                title={handRaised ? "Lower hand" : "Raise hand"}
            >
                <IconHand size={windowWidth < 640 ? 18 : 20} />
            </button>

            {/* Real-time Emoji Reactions Popover Trigger */}
            <button
                ref={reactionBtnRef}
                onClick={onToggleReactionsPopover}
                style={{
                    width: windowWidth < 640 ? 38 : 44,
                    height: windowWidth < 640 ? 38 : 44,
                    borderRadius: '50%',
                    border: showReactionsPopover ? '1.5px solid var(--color-accent)' : 'none',
                    background: showReactionsPopover ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    boxShadow: showReactionsPopover ? '0 0 14px rgba(99,102,241,0.5)' : 'none'
                }}
                title="Send Reaction (Click to send love reaction and open emoji bar)"
            >
                <IconHeart size={18} color="#f43f5e" />
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* Participants drawer toggle */}
            <button
                className={`btn-icon ${activePanel === 'participants' ? 'active' : ''}`}
                onClick={() => onTogglePanel('participants')}
                title="Show participants list"
                style={{
                    width: windowWidth < 640 ? 36 : 40,
                    height: windowWidth < 640 ? 36 : 40,
                    border: 'none',
                    borderRadius: '50%',
                    background: activePanel === 'participants' ? 'var(--color-accent-light)' : 'transparent',
                    color: activePanel === 'participants' ? 'var(--color-accent)' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0
                }}
            >
                <IconUsers />
                {waitingGuestsCount > 0 ? (
                    <span style={{
                        position: 'absolute', top: -3, right: -3,
                        minWidth: 16, height: 16, borderRadius: '50%',
                        background: '#f59e0b',
                        fontSize: '0.625rem', fontWeight: 800,
                        color: '#000', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                        border: '1.5px solid var(--color-bg-base)',
                        boxShadow: '0 0 10px rgba(245,158,11,0.6)',
                        animation: 'jts-pulse 1.5s infinite'
                    }} title={`${waitingGuestsCount} waiting to be admitted`}>
                        {waitingGuestsCount}
                    </span>
                ) : participantsCount > 0 ? (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        minWidth: 14, height: 14, borderRadius: '50%',
                        background: 'var(--color-accent)',
                        fontSize: '0.55rem', fontWeight: 700,
                        color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 2px',
                        border: '1.5px solid var(--color-bg-base)',
                    }}>
                        {participantsCount}
                    </span>
                ) : null}
            </button>

            {/* Chat drawer toggle */}
            <button
                className={`btn-icon ${activePanel === 'chat' ? 'active' : ''}`}
                onClick={() => onTogglePanel('chat')}
                title="Meeting chat window"
                style={{
                    width: windowWidth < 640 ? 36 : 40,
                    height: windowWidth < 640 ? 36 : 40,
                    border: 'none',
                    borderRadius: '50%',
                    background: activePanel === 'chat' ? 'var(--color-accent-light)' : 'transparent',
                    color: activePanel === 'chat' ? 'var(--color-accent)' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0
                }}
            >
                <IconMessage />
                {unreadChatCount > 0 && activePanel !== 'chat' && (
                    <span style={{
                        position: 'absolute', top: -3, right: -3,
                        minWidth: 16, height: 16, borderRadius: '50%',
                        background: '#ef4444',
                        fontSize: '0.625rem', fontWeight: 800,
                        color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                        border: '1.5px solid var(--color-bg-base)',
                        boxShadow: '0 2px 6px rgba(239,68,68,0.5)'
                    }}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                )}
            </button>

            {/* Live Captions (CC) toggle */}
            <button
                className={`btn-icon ${showCaptions ? 'active' : ''}`}
                onClick={onToggleCaptions}
                title={showCaptions ? "Turn off captions (CC)" : "Turn on captions (CC)"}
                style={{
                    width: windowWidth < 640 ? 36 : 40,
                    height: windowWidth < 640 ? 36 : 40,
                    border: 'none',
                    borderRadius: '50%',
                    background: showCaptions ? 'var(--color-accent-light)' : 'transparent',
                    color: showCaptions ? 'var(--color-accent)' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0
                }}
            >
                <IconCaptions size={windowWidth < 640 ? 18 : 20} strokeWidth={2} />
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* Consolidated Google Meet Style [⋮ More Options] */}
            <button
                ref={moreBtnRef}
                className={`btn-icon ${showMoreMenu ? 'active' : ''}`}
                onClick={onToggleMoreMenu}
                title="More options (⋮)"
                style={{
                    width: windowWidth < 640 ? 36 : 40,
                    height: windowWidth < 640 ? 36 : 40,
                    border: 'none',
                    borderRadius: '50%',
                    background: showMoreMenu ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* Leave / End Meeting Trigger */}
            <button
                onClick={onLeaveOrEndMeeting}
                style={{
                    height: windowWidth < 640 ? 38 : 44,
                    padding: windowWidth < 640 ? '0 12px' : '0 16px',
                    borderRadius: '24px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                title={isLocalHost ? "End or Leave Meeting" : "Leave Meeting"}
            >
                <IconPhoneOff size={18} color="#fff" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                    {isLocalHost ? "End" : "Leave"}
                </span>
            </button>
        </footer>
    )
}
