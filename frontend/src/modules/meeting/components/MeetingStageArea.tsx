import React, { useState, useEffect } from 'react'
import { VideoTile } from './VideoTile'
import { ScreenAnnotationOverlay } from './ScreenAnnotationOverlay'
import { RemoteControlOverlay } from './RemoteControlOverlay'
import { MeetingSidePanels, type ActiveMeetingPanel, type MeetingSidePanelsProps } from './MeetingSidePanels'
import type { MeetingLayoutMode } from './LayoutSwitcherModal'
import {
    IconInfo,
    IconX,
    IconPin,
    IconEdit,
    IconMonitor,
    IconMicOff
} from '../../../components/common/Icons'
import { parseJwt } from '../utils/meetingHelpers'

export interface MeetingStageAreaProps {
    isWebinarAttendee: boolean
    isWebinarMode: boolean
    isLowTimeWarning: boolean
    screenError: string | null
    clearScreenError: () => void
    // Layout and Stage
    isStageLayoutActive: boolean
    layoutStyle: React.CSSProperties
    gridStyle: React.CSSProperties
    fullScreenUserId: string | null
    setFullScreenUserId: (id: string | null) => void
    layoutMode: MeetingLayoutMode
    isMobile: boolean
    isTablet: boolean
    activeSpeaker: string | null
    primaryUser: string
    primaryStream: MediaStream | null
    isScreenShareActive: boolean
    activePresenterId: string | null
    handRaised: boolean
    handsRaisedMap: Record<string, boolean>
    isLocalHost: boolean
    meetingInfo: any
    isGuest: boolean
    isVideoOff: boolean
    remoteVideoStates: Record<string, boolean>
    isBlurEnabled: boolean
    isStudioLightingEnabled: boolean
    isHdBoostEnabled: boolean
    isWatermarkEnabled: boolean
    myDisplayName: string
    meetingId: string
    initialMeetingId?: string
    isMuted: boolean
    remoteMuteStates: Record<string, boolean>
    pinnedUserId: string | null
    setPinnedUserId: (id: string | null) => void
    // Annotation & Remote Control
    isAnnotationActive: boolean
    setIsAnnotationActive: (v: boolean) => void
    isAttendeeAnnotationActive: boolean
    setIsAttendeeAnnotationActive: (v: boolean) => void
    activeControllerId: string | null
    activeControllerName: string | null
    isRequestingControl: boolean
    handleRequestRemoteControl: () => void
    handleReleaseRemoteControl: () => void
    handleRevokeRemoteControl: () => void
    incomingControlRequest: any
    screenSharingUserId: string | null
    handleAcceptControlRequest: () => void
    handleDenyControlRequest: () => void
    // Users & Streams
    stripUsers: string[]
    displayedUsers: string[]
    allUsersLength: number
    screenSharingUserIds: string[]
    localStream: MediaStream | null
    activeLocalStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    backstageUserIds: string[]
    isCurrentUserBackstage: boolean
    canManageParticipants: boolean
    switchActivePresenter: (userId: string) => void
    getUserDisplayName: (userId: string) => string
    socket: any
    token: string
    // Side panels
    activePanel: ActiveMeetingPanel
    setActivePanel: (panel: ActiveMeetingPanel) => void
    sidePanelsProps: Omit<MeetingSidePanelsProps, 'activePanel' | 'setActivePanel' | 'token' | 'meetingId' | 'socket'>
    addToast?: (msg: string, type?: any) => void
}

export const MeetingStageArea: React.FC<MeetingStageAreaProps> = ({
    isWebinarAttendee,
    isWebinarMode,
    isLowTimeWarning,
    screenError,
    clearScreenError,
    isStageLayoutActive,
    layoutStyle,
    gridStyle,
    fullScreenUserId,
    setFullScreenUserId,
    layoutMode,
    isMobile,
    isTablet,
    activeSpeaker,
    primaryUser,
    primaryStream,
    isScreenShareActive,
    activePresenterId,
    handRaised,
    handsRaisedMap,
    isLocalHost,
    meetingInfo,
    isGuest,
    isVideoOff,
    remoteVideoStates,
    isBlurEnabled,
    isStudioLightingEnabled,
    isHdBoostEnabled,
    isWatermarkEnabled,
    myDisplayName,
    meetingId,
    initialMeetingId,
    isMuted,
    remoteMuteStates,
    pinnedUserId,
    setPinnedUserId,
    isAnnotationActive,
    setIsAnnotationActive,
    isAttendeeAnnotationActive,
    setIsAttendeeAnnotationActive,
    activeControllerId,
    activeControllerName,
    isRequestingControl,
    handleRequestRemoteControl,
    handleReleaseRemoteControl,
    handleRevokeRemoteControl,
    incomingControlRequest,
    screenSharingUserId,
    handleAcceptControlRequest,
    handleDenyControlRequest,
    stripUsers,
    displayedUsers,
    allUsersLength,
    screenSharingUserIds,
    localStream,
    activeLocalStream,
    remoteStreams,
    backstageUserIds,
    isCurrentUserBackstage,
    canManageParticipants,
    switchActivePresenter,
    getUserDisplayName,
    socket,
    token,
    addToast,
    activePanel,
    setActivePanel,
    sidePanelsProps
}) => {
    const [hoveredTile, setHoveredTile] = useState<string | null>(null)

    // Synchronize browser native fullscreen exit (e.g. user pressed Escape) with fullScreenUserId state
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && fullScreenUserId) {
                setFullScreenUserId(null)
            }
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [fullScreenUserId, setFullScreenUserId])

    if (isWebinarAttendee) return null

    // Render a single participant video tile with standard controls, click (pin) and double click (full screen)
    const renderMeetingTile = (userId: string, isEnlarged: boolean, isCompact: boolean = false) => {
        const displayName = getUserDisplayName(userId)
        const isUserSharingScreen = userId === 'me'
            ? (screenSharingUserId === 'me' || screenSharingUserIds.includes('me'))
            : (screenSharingUserId === userId || screenSharingUserIds.includes(userId))
        const stream = userId === 'me'
            ? (isUserSharingScreen ? localStream : (activeLocalStream || localStream))
            : remoteStreams[userId]
        const isMutedUser = userId === 'me'
            ? isMuted
            : (remoteMuteStates[userId] !== undefined ? remoteMuteStates[userId] : !stream?.getAudioTracks()[0]?.enabled)
        const isUserHandRaised = userId === 'me' ? handRaised : handsRaisedMap[userId]
        const isUserSpeaking = activeSpeaker === userId
        const isSingleTile = (layoutMode === 'tiled' ? displayedUsers.length === 1 : allUsersLength === 1) && !isEnlarged && !isCompact

        return (
            <div
                key={userId}
                id={`meeting-tile-${userId}`}
                data-tile-container="true"
                onMouseEnter={() => setHoveredTile(userId)}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => {
                    if (screenSharingUserIds.includes(userId)) {
                        switchActivePresenter(userId)
                    }
                    const newPin = pinnedUserId === userId ? null : userId
                    setPinnedUserId(newPin)
                    if (addToast) addToast(newPin ? `Pinned ${displayName} to stage` : `Unpinned ${displayName}`, 'info')
                }}
                onDoubleClick={() => {
                    const newFs = fullScreenUserId === userId ? null : userId
                    setFullScreenUserId(newFs)
                    const tileElem = document.getElementById(`meeting-tile-${userId}`)
                    if (newFs) {
                        if (tileElem && tileElem.requestFullscreen && !document.fullscreenElement) {
                            tileElem.requestFullscreen().catch(() => {})
                        }
                        if (addToast) addToast(`Entered full screen for ${displayName}`, 'info')
                    } else {
                        if (document.fullscreenElement) {
                            document.exitFullscreen().catch(() => {})
                        }
                        if (addToast) addToast('Exited full screen', 'info')
                    }
                }}
                style={{
                    width: isSingleTile ? 'min(100%, calc((100vh - 160px) * 16 / 9))' : '100%',
                    height: isSingleTile ? 'auto' : '100%',
                    maxHeight: isSingleTile ? 'calc(100vh - 160px)' : undefined,
                    aspectRatio: isSingleTile ? '16 / 9' : undefined,
                    margin: isSingleTile ? 'auto' : undefined,
                    position: 'relative',
                    borderRadius: isCompact ? 'var(--radius-md)' : 'var(--radius-xl)',
                    border: `2px solid ${isUserSpeaking ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isUserSpeaking ? '0 0 12px rgba(59, 130, 246, 0.45)' : 'var(--shadow-sm)',
                    overflow: 'hidden',
                    background: 'var(--color-surface-2)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer'
                }}
            >
                {/* Video Feed */}
                <VideoTile
                    stream={stream}
                    label={displayName}
                    muted={userId === 'me'}
                    isScreenShare={isUserSharingScreen}
                    isPrimary={isEnlarged}
                    isHandRaised={isUserHandRaised}
                    isHost={userId === 'me' ? isLocalHost : !!(meetingInfo && meetingInfo.host && (meetingInfo.host._id === userId || meetingInfo.host === userId))}
                    isGuest={userId === 'me' ? isGuest : userId.startsWith('guest_')}
                    isVideoOffProp={userId === 'me' ? isVideoOff : remoteVideoStates[userId]}
                    isBlurred={userId === 'me' && isBlurEnabled}
                    isStudioLighting={userId === 'me' && isStudioLightingEnabled}
                    isHdBoost={isHdBoostEnabled}
                    watermarkText={isWatermarkEnabled ? `${myDisplayName} • ${meetingInfo?.customId || meetingInfo?.id || meetingId || 'JTS-Meet'}` : undefined}
                    isCompact={isCompact}
                    isActiveSpeaker={isUserSpeaking}
                    isMutedProp={isMutedUser}
                />

                {/* Backstage Indicator Badge on Video Tile */}
                {(backstageUserIds.includes(userId) || (userId === 'me' && isCurrentUserBackstage)) && (
                    <div style={{
                        position: 'absolute',
                        top: isCompact ? 6 : 10,
                        left: isCompact ? 6 : 10,
                        zIndex: 10,
                        background: 'rgba(6, 78, 59, 0.92)',
                        border: '1px solid rgba(52, 211, 153, 0.6)',
                        borderRadius: 6,
                        padding: '2px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#6ee7b7'
                    }}>
                        <span>🎭</span>
                        <span>Backstage (Green Room)</span>
                    </div>
                )}

                {/* Hover Actions Controls */}
                {hoveredTile === userId && (
                    <div className="anim-fade-in" style={{
                        position: 'absolute',
                        bottom: isCompact ? 6 : 12,
                        right: isCompact ? 6 : 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? 6 : 10,
                        zIndex: 20
                    }}>
                        {/* Pin Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newPin = pinnedUserId === userId ? null : userId;
                                setPinnedUserId(newPin);
                                if (addToast) addToast(newPin ? `Pinned ${displayName} to stage` : `Unpinned ${displayName}`, 'info');
                            }}
                            style={{ background: pinnedUserId === userId ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: isCompact ? 28 : 32, height: isCompact ? 28 : 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                            title={pinnedUserId === userId ? "Unpin user" : "Pin user to center"}
                        >
                            <IconPin size={isCompact ? 13 : 15} />
                        </button>

                        {/* Full Screen Toggle Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newFs = fullScreenUserId === userId ? null : userId;
                                setFullScreenUserId(newFs);
                                const tileElem = document.getElementById(`meeting-tile-${userId}`);
                                if (newFs) {
                                    if (tileElem && tileElem.requestFullscreen && !document.fullscreenElement) {
                                        tileElem.requestFullscreen().catch(() => {});
                                    }
                                    if (addToast) addToast(`Entered full screen for ${displayName}`, 'info');
                                } else {
                                    if (document.fullscreenElement) {
                                        document.exitFullscreen().catch(() => {});
                                    }
                                    if (addToast) addToast('Exited full screen', 'info');
                                }
                            }}
                            style={{ background: fullScreenUserId === userId ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: isCompact ? 28 : 32, height: isCompact ? 28 : 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                            title={fullScreenUserId === userId ? "Exit Full Screen" : "Enter Full Screen"}
                        >
                            {fullScreenUserId === userId ? (
                                <svg width={isCompact ? 12 : 14} height={isCompact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                </svg>
                            ) : (
                                <svg width={isCompact ? 12 : 14} height={isCompact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                </svg>
                            )}
                        </button>

                        {/* Remote Mute (Only if local user has manage permissions and target is not local) */}
                        {canManageParticipants && userId !== 'me' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    socket?.emit('meeting:mute-user', { meetingId, targetUserId: userId });
                                    if (addToast) addToast(`Mute request sent for ${displayName}`, 'info');
                                }}
                                style={{ background: 'rgba(239, 68, 68, 0.25)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                title="Request Mute"
                            >
                                <IconMicOff size={15} />
                            </button>
                        )}

                        {/* Remote Kick (Only if local user has manage permissions and target is not local) */}
                        {canManageParticipants && userId !== 'me' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to remove ${displayName} from the meeting?`)) {
                                        socket?.emit('meeting:remove-user', { meetingId, targetUserId: userId });
                                        if (addToast) addToast(`Removed ${displayName} from the meeting`, 'warning');
                                    }
                                }}
                                style={{ background: 'var(--color-danger)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                title="Kick participant"
                            >
                                <IconX size={15} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <main style={{
            flex: 1,
            paddingTop: isWebinarMode ? (isLowTimeWarning ? 142 : 102) : (isLowTimeWarning ? 104 : 64),
            paddingBottom: 20,
            display: 'flex',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', width: '100%', height: '100%', gap: 16 }}>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {/* Screen share error */}
                    {screenError && (
                        <div className="anim-slide-up" style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px 16px',
                            fontSize: '0.875rem',
                            color: '#f87171',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            marginBottom: 12
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconInfo size={16} color="#f87171" />
                                <span>{screenError}</span>
                            </div>
                            <button
                                onClick={clearScreenError}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '0.9375rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="Dismiss error"
                            >
                                <IconX size={14} />
                            </button>
                        </div>
                    )}

                    <div style={{ flex: 1, minHeight: 0 }}>
                        {isStageLayoutActive ? (
                            <div style={layoutStyle}>
                                {/* Primary Focus Zone (Left / Top) */}
                                <div style={{
                                    flex: (fullScreenUserId || layoutMode === 'spotlight' || stripUsers.length === 0) ? 1 : isMobile ? 1 : isTablet ? '1 1 65%' : '1 1 80%',
                                    minWidth: 0,
                                    minHeight: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    borderRadius: 'var(--radius-xl)',
                                    overflow: 'hidden',
                                    border: `2px solid ${activeSpeaker === primaryUser ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                                    boxShadow: activeSpeaker === primaryUser ? '0 0 12px rgba(59, 130, 246, 0.45)' : 'var(--shadow-sm)',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                }}>
                                    <VideoTile
                                        stream={primaryStream}
                                        label={primaryUser === 'me' ? 'You' : getUserDisplayName(primaryUser)}
                                        muted={primaryUser === 'me'}
                                        isScreenShare={isScreenShareActive && primaryUser === activePresenterId}
                                        isPrimary={true}
                                        isHandRaised={primaryUser === 'me' ? handRaised : handsRaisedMap[primaryUser]}
                                        isHost={primaryUser === 'me' ? isLocalHost : !!(meetingInfo && meetingInfo.host && (meetingInfo.host._id === primaryUser || meetingInfo.host === primaryUser))}
                                        isGuest={primaryUser === 'me' ? isGuest : primaryUser.startsWith('guest_')}
                                        isVideoOffProp={primaryUser === 'me' ? isVideoOff : remoteVideoStates[primaryUser]}
                                        isBlurred={primaryUser === 'me' && isBlurEnabled}
                                        isStudioLighting={primaryUser === 'me' && isStudioLightingEnabled}
                                        isHdBoost={isHdBoostEnabled}
                                        watermarkText={isWatermarkEnabled ? `${myDisplayName} • ${meetingInfo?.customId || meetingInfo?.id || meetingId || 'JTS-Meet'}` : undefined}
                                        isActiveSpeaker={activeSpeaker === primaryUser}
                                        isMutedProp={primaryUser === 'me' ? isMuted : (remoteMuteStates[primaryUser] !== undefined ? remoteMuteStates[primaryUser] : !primaryStream?.getAudioTracks()[0]?.enabled)}
                                    />

                                    {/* Top-Left Action Toolbar (Unpin Screen & Screen Share Controls in one clean row) */}
                                    {(pinnedUserId || isScreenShareActive) && (() => {
                                        const isPrimaryHandRaised = primaryUser === 'me' ? handRaised : handsRaisedMap[primaryUser];
                                        return (
                                            <div style={{
                                                position: 'absolute',
                                                top: 14,
                                                left: isPrimaryHandRaised ? 125 : 14,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                zIndex: 45,
                                                maxWidth: 'calc(100% - 180px)',
                                                flexWrap: 'wrap'
                                            }}>
                                                {/* Floating Unpin Button */}
                                                {pinnedUserId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPinnedUserId(null);
                                                            if (addToast) addToast('Unpinned user', 'info');
                                                        }}
                                                        style={{
                                                            background: 'rgba(10, 11, 15, 0.85)',
                                                            backdropFilter: 'blur(10px)',
                                                            WebkitBackdropFilter: 'blur(10px)',
                                                            border: '1px solid rgba(255, 255, 255, 0.18)',
                                                            borderRadius: 'var(--radius-full)',
                                                            padding: '6px 14px',
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            boxShadow: 'var(--shadow-md)',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'var(--color-accent)';
                                                            e.currentTarget.style.borderColor = 'transparent';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(10, 11, 15, 0.85)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                                                        }}
                                                        title="Unpin from main stage"
                                                    >
                                                        <IconPin size={13} />
                                                        <span>{isScreenShareActive ? 'Unpin Screen' : 'Unpin'}</span>
                                                    </button>
                                                )}

                                                {/* Live Annotation & Laser Pointer Trigger (Presenter only) */}
                                                {isScreenShareActive && activePresenterId === 'me' && !isAnnotationActive && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAnnotationActive(true)}
                                                        style={{
                                                            background: 'rgba(10, 11, 15, 0.85)',
                                                            backdropFilter: 'blur(10px)',
                                                            WebkitBackdropFilter: 'blur(10px)',
                                                            border: '1px solid rgba(255,255,255,0.18)',
                                                            borderRadius: 'var(--radius-full)',
                                                            padding: '5px 11px',
                                                            color: '#fff',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            boxShadow: 'var(--shadow-md)',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.9)'; e.currentTarget.style.borderColor = 'transparent' }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 11, 15, 0.85)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                                                        title="Toggle interactive drawing & laser pointer on screen"
                                                    >
                                                        <IconEdit size={13} />
                                                        <span>Annotate & Laser</span>
                                                    </button>
                                                )}

                                                {/* Remote Control Trigger (For Viewers) */}
                                                {isScreenShareActive && activePresenterId !== 'me' && (
                                                    <button
                                                        type="button"
                                                        onClick={activeControllerId === (parseJwt(token)?.userId || 'me') ? handleReleaseRemoteControl : handleRequestRemoteControl}
                                                        disabled={isRequestingControl}
                                                        style={{
                                                            background: activeControllerId === (parseJwt(token)?.userId || 'me')
                                                                ? 'rgba(59, 130, 246, 0.95)'
                                                                : isRequestingControl
                                                                    ? 'rgba(100, 116, 139, 0.8)'
                                                                    : 'rgba(10, 11, 15, 0.85)',
                                                            backdropFilter: 'blur(10px)',
                                                            WebkitBackdropFilter: 'blur(10px)',
                                                            border: activeControllerId === (parseJwt(token)?.userId || 'me')
                                                                ? '1px solid #93c5fd'
                                                                : '1px solid rgba(255,255,255,0.18)',
                                                            borderRadius: 'var(--radius-full)',
                                                            padding: '5px 11px',
                                                            color: '#fff',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            cursor: isRequestingControl ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            boxShadow: activeControllerId === (parseJwt(token)?.userId || 'me') ? '0 0 16px rgba(59, 130, 246, 0.5)' : 'var(--shadow-md)',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={activeControllerId === (parseJwt(token)?.userId || 'me') ? 'Release Remote Control' : 'Request Remote Control of this screen'}
                                                    >
                                                        <IconMonitor size={13} />
                                                        <span>
                                                            {activeControllerId === (parseJwt(token)?.userId || 'me')
                                                                ? 'Release Control'
                                                                : isRequestingControl
                                                                    ? 'Requesting Control...'
                                                                    : 'Request Control'}
                                                        </span>
                                                    </button>
                                                )}

                                                {/* Viewer Annotation Trigger (Attendee drawing on screen) */}
                                                {isScreenShareActive && activePresenterId !== 'me' && !isAttendeeAnnotationActive && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAttendeeAnnotationActive(true)}
                                                        style={{
                                                            background: 'rgba(10, 11, 15, 0.85)',
                                                            backdropFilter: 'blur(10px)',
                                                            WebkitBackdropFilter: 'blur(10px)',
                                                            border: '1px solid rgba(255, 255, 255, 0.18)',
                                                            borderRadius: 'var(--radius-full)',
                                                            padding: '5px 11px',
                                                            color: '#fff',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            boxShadow: 'var(--shadow-md)',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)'; e.currentTarget.style.borderColor = 'transparent' }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 11, 15, 0.85)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                                                        title="Toggle drawing and annotations on screen"
                                                    >
                                                        <IconEdit size={13} />
                                                        <span>Annotate</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Presenter Incoming Remote Control Request Dialog */}
                                    {incomingControlRequest && screenSharingUserId === 'me' && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 20,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'rgba(15, 23, 42, 0.96)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid #3b82f6',
                                            borderRadius: 'var(--radius-xl)',
                                            padding: '12px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 16,
                                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)',
                                            zIndex: 60,
                                            color: '#fff'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <IconMonitor size={20} color="#60a5fa" />
                                                <div>
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                                        {incomingControlRequest.requesterName} wants remote control
                                                    </div>
                                                    <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                                                        Allow them to move mouse and type on your screen?
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button
                                                    onClick={handleAcceptControlRequest}
                                                    style={{
                                                        background: '#10b981',
                                                        border: 'none',
                                                        color: '#fff',
                                                        padding: '6px 14px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Allow
                                                </button>
                                                <button
                                                    onClick={handleDenyControlRequest}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.12)',
                                                        border: 'none',
                                                        color: '#cbd5e1',
                                                        padding: '6px 14px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Screen Share Live Annotation Canvas Overlay */}
                                    {isScreenShareActive && (
                                        <ScreenAnnotationOverlay
                                            isActive={activePresenterId === 'me' ? isAnnotationActive : true}
                                            isPresenter={activePresenterId === 'me'}
                                            socket={socket}
                                            meetingId={meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId}
                                            onClose={() => {
                                                setIsAnnotationActive(false)
                                                setIsAttendeeAnnotationActive(false)
                                            }}
                                            isAttendeeDrawingActive={isAttendeeAnnotationActive}
                                            onToggleAttendeeDrawing={setIsAttendeeAnnotationActive}
                                        />
                                    )}

                                    {/* Screen Share Remote Desktop Control Overlay */}
                                    {isScreenShareActive && (
                                        <RemoteControlOverlay
                                            meetingId={meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId}
                                            socket={socket}
                                            isPresenter={screenSharingUserId === 'me'}
                                            isController={activeControllerId !== null && (activeControllerId === (parseJwt(token)?.userId || 'me') || (screenSharingUserId !== 'me' && activeControllerId === myDisplayName))}
                                            activeControllerId={activeControllerId}
                                            activeControllerName={activeControllerName}
                                            onRevokeControl={handleRevokeRemoteControl}
                                            onReleaseControl={handleReleaseRemoteControl}
                                        />
                                    )}

                                    {/* Exit Full Screen Button Overlay - Positioned top-right (completely clear of all badges) */}
                                    {fullScreenUserId && (
                                        <button
                                            onClick={() => {
                                                setFullScreenUserId(null);
                                                if (document.fullscreenElement) {
                                                    document.exitFullscreen().catch(() => {});
                                                }
                                                if (addToast) addToast('Exited full screen', 'info');
                                            }}
                                            className="anim-fade-in"
                                            style={{
                                                position: 'absolute',
                                                top: 16,
                                                right: 16,
                                                background: 'rgba(239, 68, 68, 0.95)',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '7px 16px',
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: '0.8125rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
                                                zIndex: 45,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                transition: 'all 0.2s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.04)';
                                                e.currentTarget.style.background = '#dc2626';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.95)';
                                            }}
                                            title="Exit Full Screen Focus (Esc)"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                            </svg>
                                            <span>Exit Full Screen</span>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                fontWeight: 800,
                                                background: 'rgba(255, 255, 255, 0.25)',
                                                padding: '1px 5px',
                                                borderRadius: '4px',
                                                letterSpacing: '0.04em'
                                            }}>
                                                ESC
                                            </span>
                                        </button>
                                    )}

                                </div>

                                {/* Participants Strip (Right / Bottom) - hidden in fullScreenUserId or Spotlight mode or if no strip users */}
                                {!fullScreenUserId && layoutMode !== 'spotlight' && stripUsers.length > 0 && (
                                    <div
                                        className="sidebar-filmstrip custom-scrollbar"
                                        style={{
                                            flex: (isMobile || isTablet) ? '0 0 110px' : '0 0 clamp(210px, 18vw, 240px)',
                                            width: (isMobile || isTablet) ? '100%' : 'clamp(210px, 18vw, 240px)',
                                            maxWidth: (isMobile || isTablet) ? '100%' : '240px',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: (isMobile || isTablet) ? 'row' : 'column',
                                            gap: (isMobile || isTablet) ? 10 : 8,
                                            overflowX: (isMobile || isTablet) ? 'auto' : 'hidden',
                                            overflowY: (isMobile || isTablet)
                                                ? 'hidden'
                                                : (stripUsers.length > 4 ? 'auto' : 'hidden'),
                                            padding: '2px',
                                            boxSizing: 'border-box',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                                        }}
                                    >
                                        {stripUsers.map((userId) => {
                                            const tileStyle: React.CSSProperties = (isMobile || isTablet)
                                                ? { height: '100%', aspectRatio: '16/9', flexShrink: 0 }
                                                : {
                                                    width: '100%',
                                                    height: stripUsers.length <= 1
                                                        ? 'min(170px, 100%)'
                                                        : stripUsers.length === 2
                                                            ? 'min(150px, calc((100% - 8px) / 2))'
                                                            : stripUsers.length === 3
                                                                ? 'min(135px, calc((100% - 16px) / 3))'
                                                                : 'calc((100% - 24px) / 4)',
                                                    minHeight: stripUsers.length >= 4 ? '95px' : undefined,
                                                    maxHeight: stripUsers.length <= 3 ? '160px' : undefined,
                                                    aspectRatio: '16/9',
                                                    flexShrink: 0
                                                };

                                            return (
                                                <div key={userId} style={tileStyle}>
                                                    {renderMeetingTile(userId, false, true)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Smart Layout responsive grid
                            <div style={gridStyle}>
                                {displayedUsers.map((userId) => renderMeetingTile(userId, false))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panel slideouts */}
                <MeetingSidePanels
                    activePanel={activePanel}
                    setActivePanel={setActivePanel}
                    token={token}
                    meetingId={meetingId}
                    socket={socket}
                    {...sidePanelsProps}
                />
            </div>
        </main>
    )
}
