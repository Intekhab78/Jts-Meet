import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { useMeetingContext } from '../context/MeetingContext'
import { useWebRTCContext } from '../context/WebRTCContext'
import { useMeetingChat } from '../hooks/useMeetingChat'
import { virtualBackgroundService } from '../../../services/virtualBackground.service'
import { SetupScreen } from './SetupScreen'
import { MeetingHeader } from './MeetingHeader'
import { MeetingBottomControls } from './MeetingBottomControls'
import { MeetingModalsContainer } from './MeetingModalsContainer'
import { MeetingStageSection } from './MeetingStageSection'
import { PostMeetingCapsuleModal } from './PostMeetingCapsuleModal'
import { MeetingHostOverlays } from './MeetingHostOverlays'
import { FreeTierWarningPill } from './FreeTierWarningPill'
import { MeetingOverlayBanners } from './MeetingOverlayBanners'
import { WebinarAttendeeExperience } from './WebinarAttendeeExperience'
import { LateJoinerCatchUpSection } from './LateJoinerCatchUpSection'
import { useMeetingUserSession } from '../hooks/useMeetingUserSession'
import { useMeetingAudioVideoPipeline } from '../hooks/useMeetingAudioVideoPipeline'
import { useMeetingKeyboardShortcuts } from '../hooks/useMeetingKeyboardShortcuts'
import { useMeetingRecording } from '../hooks/useMeetingRecording'
import { useMeetingReactions } from '../hooks/useMeetingReactions'
import { useMeetingRemoteControl } from '../hooks/useMeetingRemoteControl'
import { useMeetingBreakoutRooms } from '../hooks/useMeetingBreakoutRooms'
import { useMeetingAttendance } from '../hooks/useMeetingAttendance'
import { useMeetingAIExtensions } from '../hooks/useMeetingAIExtensions'
import { useMeetingPstnAndWebinar } from '../hooks/useMeetingPstnAndWebinar'
import { useMeetingPlanEntitlements } from '../hooks/useMeetingPlanEntitlements'
import { useMeetingScreenShareControls } from '../hooks/useMeetingScreenShareControls'
import { useMeetingPeerStatus } from '../hooks/useMeetingPeerStatus'
import { useMeetingWaitingRoom } from '../hooks/useMeetingWaitingRoom'
import { useMeetingRoleAndPermissions } from '../hooks/useMeetingRoleAndPermissions'
import { useMeetingLifecycle } from '../hooks/useMeetingLifecycle'
import { useMeetingHostAndModeration } from '../hooks/useMeetingHostAndModeration'
import { useMeetingModalStates } from '../hooks/useMeetingModalStates'
import { useMeetingParticipantsMetadata } from '../hooks/useMeetingParticipantsMetadata'
import { useMeetingDeviceHotSwap } from '../hooks/useMeetingDeviceHotSwap'
import { useMeetingReconnection } from '../hooks/useMeetingReconnection'
import { useMeetingUiPopups } from '../hooks/useMeetingUiPopups'
import { useMeetingCloudRecordingStreamFeeder } from '../hooks/useMeetingCloudRecordingStreamFeeder'
import { useMeetingNetworkAndToolbar } from '../hooks/useMeetingNetworkAndToolbar'
import { useMeetingHands } from '../hooks/useMeetingHands'
import { useMeetingFreeTierTimer } from '../hooks/useMeetingFreeTierTimer'
import { calculateMeetingStageLayout } from '../utils/stageLayout'

type ActivePanel = 'participants' | 'chat' | 'files' | 'settings' | 'notes' | 'qa' | null

export function MeetingRoom({
    initialToken = '',
    isAdminOrOwner = false,
    initialMeetingId = '',
    autoJoin = false,
    planTier = 'free',
    onUpgradePlanRequest,
    onLeave
}: {
    initialToken?: string
    isAdminOrOwner?: boolean
    initialMeetingId?: string
    autoJoin?: boolean
    planTier?: string
    onUpgradePlanRequest?: () => void
    onLeave?: () => void
}) {

    const { socket, connectSocket, connected } = useSocketContext()
    const { meetingId, setMeetingId, joined, setJoined, participants: rawParticipants } = useMeetingContext()

    // User session, identity & participant list hook
    const {
        token,
        setToken,
        localUserId,
        isGuest,
        meetingInfo,
        setMeetingInfo,
        screenSharePolicy,
        setScreenSharePolicy,
        toasts,
        setToasts,
        addToast,
        meetingInput,
        setMeetingInput,
        myDisplayName,
        myUserId,
        participants,
        isRemoteRecording,
        setIsRemoteRecording,
        canManageRef
    } = useMeetingUserSession({
        initialToken,
        initialMeetingId,
        rawParticipants,
        socket
    })

// Workspace Plan Tier Entitlements Hook
    const {
        fetchedOrgPlanTier,
        currentPlanTier,
        canAccessRecording,
        canAccessCloudRecording,
        canAccessAI,
        canAccessRTMP,
        canAccessBreakout,
        canAccessDialIn,
        canAccessE2EE,
        canAccessWebinar,
        canAccessAttendance,
        upgradeModalFeature,
        setUpgradeModalFeature
    } = useMeetingPlanEntitlements({
        token,
        initialToken,
        isGuest,
        meetingInfo,
        planTier
    })
const {
        localStream, cameraStream, remoteStreams, connectToMeeting, leaveMeeting,
        startScreenShare, stopScreenShare, screenSharingUserId,
        screenSharingUserIds, switchActivePresenter,
        screenError, clearScreenError, mediaError, mediaLoading, replaceTrackOnPeers,
        requestMedia, stopMedia, replaceLocalStream, networkStatus, isReconnecting, retryConnection
    } = useWebRTCContext()
    const { messages, typingUsers, sendMessage, emitTyping, emitStopTyping, toggleChatReaction } = useMeetingChat()

    // Multi-Presenter Takeover & Screen Sharing Controls Hook
    const {
        showTakeoverModal,
        setShowTakeoverModal,
        takeoverPresenterId,
        setTakeoverPresenterId,
        showScreenPicker,
        setShowScreenPicker,
        handleScreenSourceSelected,
        handleScreenPickerClosed,
        handleToggleScreenShare
    } = useMeetingScreenShareControls({
        screenSharingUserId,
        screenSharingUserIds,
        startScreenShare,
        stopScreenShare,
        screenSharePolicy,
        canManageRef,
        addToast
    })
    // PSTN Audio Bridge & Webinar Mode Hook
    const {
        isWebinarMode,
        setIsWebinarMode,
        isPromotedToSpeaker,
        setIsPromotedToSpeaker
    } = useMeetingPstnAndWebinar({
        socket,
        localUserId,
        addToast
    })

    // Remote Desktop Control Engine Hook
    const {
        activeControllerId,
        setActiveControllerId,
        activeControllerName,
        setActiveControllerName,
        incomingControlRequest,
        isRequestingControl,
        handleRequestRemoteControl,
        handleAcceptControlRequest,
        handleDenyControlRequest,
        handleRevokeRemoteControl,
        handleReleaseRemoteControl
    } = useMeetingRemoteControl({
        socket,
        meetingId,
                meetingInfo,
        initialMeetingId,
        screenSharingUserId,
        token,
        myDisplayName,
        addToast
    })

    // Meeting Participants Names & Metadata Hook
    const {
        renamedUsers,
        setRenamedUsers,
        getUserDisplayName,
        fetchMeetingParticipants
    } = useMeetingParticipantsMetadata({
        token,
        initialToken,
        myDisplayName,
        setMeetingInfo
    })

    // Remote Peer Signaling Status Hook (Camera / Mic / Audio Mute States)
    const {
        remoteVideoStates,
        setRemoteVideoStates,
        remoteMuteStates,
        setRemoteMuteStates
    } = useMeetingPeerStatus({
        socket,
        setRenamedUsers
    })

    
const [activePanel, setActivePanel] = useState<ActivePanel>(null)
    // Meeting UI Popups, Unread Chat & Security Lock Hook
    const {
        showEndMeetingModal,
        setShowEndMeetingModal,
        isLocked,
        setIsLocked,
        showMoreMenu,
        setShowMoreMenu,
        unreadChatCount,
        setUnreadChatCount,
        showPushToTalkHud,
        setShowPushToTalkHud,
        moreMenuRef,
        moreBtnRef
    } = useMeetingUiPopups({
        messages,
        activePanel
    })

    const connectToMeetingRef = useRef(connectToMeeting)
    useEffect(() => {
        connectToMeetingRef.current = connectToMeeting
    }, [connectToMeeting])

    // Socket Disconnect & Auto-Reconnection Rejoiner Hook
    useMeetingReconnection({
        connected,
        joined,
        meetingId,
        token,
        initialToken,
        connectToMeetingRef
    })

    // Meeting timer & Free Tier Limit Hook
    const {
        timerStr,
        meetingSecondsElapsed,
        freeTimeRemaining,
        isMeetingPaid,
        isTimeLimitExpired,
        isLowTimeWarning,
        formatRemainingTime
    } = useMeetingFreeTierTimer({
        currentPlanTier,
        isGuest
    })

    // Audio/Video Hardware, Constraints, Hot-Swap, VAD & Active Speaker Pipeline Hook
    const {
        isMuted,
        setIsMuted,
        isVideoOff,
        setIsVideoOff,
        isBlurEnabled,
        setIsBlurEnabled,
        virtualBgPreset,
        setVirtualBgPreset,
        isApplyingVirtualBg,
        setIsApplyingVirtualBg,
        videoQuality,
        setVideoQuality,
        isNoiseSuppressionEnabled,
        setIsNoiseSuppressionEnabled,
        isPiPActive,
        setIsPiPActive,
        activeLocalStream,
        setActiveLocalStream,
        rawCameraTrackRef,
        activeVideoDeviceIdRef,
        toggleMute,
        toggleVideo,
        handleVideoSourceChange,
        handleQualityChange,
        handleAudioSourceChange,
        handleAudioOutputChange,
        handleSelectVirtualBackground,
        handleUploadCustomWallpaper,
        handleToggleBlur,
        handleToggleNoiseSuppression,
        handleTogglePiP,
        showTalkingWhileMuted,
        setShowTalkingWhileMuted,
        activeSpeaker,
        setActiveSpeaker
    } = useMeetingAudioVideoPipeline({
        localStream,
        cameraStream,
        remoteStreams,
        replaceLocalStream,
        replaceTrackOnPeers,
        requestMedia,
        stopMedia,
        socket,
        meetingId,
        meetingInput,
        setShowPushToTalkHud,
        addToast
    })

    // Real-Time Floating Emojis & Audio Soundboard Hook
    const {
        showReactionsPopover,
        setShowReactionsPopover,
        floatingReactions,
        setFloatingReactions,
        reactionBtnRef,
        reactionsPopoverRef,
        spawnReaction,
        sendReaction,
        handleTriggerSoundboard
    } = useMeetingReactions({
        socket,
        meetingId,
        meetingInput,
        myDisplayName,
        addToast
    })


    // Presenter Backstage / Virtual Green Room (Enterprise)
    const [backstageUserIds, setBackstageUserIds] = useState<string[]>([])

    // Layout and automation states
    // Meeting Hands & Hand Raise Socket Hook
    const {
        handRaised,
        setHandRaised,
        handsRaisedMap,
        setHandsRaisedMap,
        handleToggleHandRaise
    } = useMeetingHands({
        socket,
        meetingId,
        meetingInput
    })
    // Guest Admission & Waiting Room Hook
    const {
        waitingGuests,
        setWaitingGuests,
        isWaitingRoomActive,
        setIsWaitingRoomActive
    } = useMeetingWaitingRoom({
        socket,
        meetingId,
        meetingInput,
        meetingInfo,
        joined,
        addToast
    })




    // Meeting Modals, Security Toggles & Stage Layout Controls Hook
    const {
        showWhiteboard, setShowWhiteboard,
        showPolls, setShowPolls,
        showCaptions, setShowCaptions,
        showDeviceSettings, setShowDeviceSettings,
        showSummary, setShowSummary,
        showShortcuts, setShowShortcuts,
        isWarningDismissed, setIsWarningDismissed,
        showVirtualBgModal, setShowVirtualBgModal,
        showE2EEModal, setShowE2EEModal,
        isE2EEActive, setIsE2EEActive,
        showDialInModal, setShowDialInModal,
        showLiveStreamModal, setShowLiveStreamModal,
        isInviteOpen, setIsInviteOpen,
        showMoMModal, setShowMoMModal,
        layoutMode, setLayoutMode,
        isLayoutModalOpen, setIsLayoutModalOpen,
        maxGridTiles, setMaxGridTiles,
        isStudioLightingEnabled, setIsStudioLightingEnabled,
        isHdBoostEnabled, setIsHdBoostEnabled,
        pinnedUserId, setPinnedUserId,
        spotlightUserId, setSpotlightUserId,
        fullScreenUserId, setFullScreenUserId,
        hoveredTile, setHoveredTile,
        isAnnotationActive, setIsAnnotationActive,
        isAttendeeAnnotationActive, setIsAttendeeAnnotationActive,
        lowBandwidthMode, setLowBandwidthMode,
        isWatermarkEnabled, setIsWatermarkEnabled
    } = useMeetingModalStates()

    // AI Extensions & In-Meeting Analytics Hook (Catch Me Up, Action Items, Talk Time, Watermark, Voice Dubbing)
    const {
        showCatchUpPrompt,
        setShowCatchUpPrompt,
        showCatchUpModal,
        setShowCatchUpModal,
        joinedMinutesLate,
        transcripts,
        setTranscripts,
        detectedActionItem,
        setDetectedActionItem,
        meetingNotes,
        setMeetingNotes,
        handleAddDetectedActionItem,
        talkTimeMap,
        setTalkTimeMap,
        showAnalyticsModal,
        setShowAnalyticsModal,
        isConfidentialMode,
        setIsConfidentialMode,
        watermarkOffset,
        isVoiceDubbingEnabled,
        setIsVoiceDubbingEnabled,
        postMeetingCapsule,
        setPostMeetingCapsule
    } = useMeetingAIExtensions({
        joined,
        participants,
        messages,
        activeSpeaker,
        isMuted,
        myDisplayName
    })


    // Screen/Cloud Recording & RTMP Live Streaming Engine Hook
    const {
        isRecording,
        setIsRecording,
        isCloudRecording,
        setIsCloudRecording,
        toggleCloudRecording,
        startRecording,
        stopRecording,
        isLiveStreaming,
        setIsLiveStreaming,
        liveStreamConfig,
        setLiveStreamConfig,
        handleStartLiveStream,
        handleStopLiveStream
    } = useMeetingRecording({
        meetingId,
        meetingInput,
        token,
        initialToken,
        localStream,
        activeLocalStream,
        cameraStream,
        remoteStreams,
        screenSharingUserId,
        screenSharingUserIds,
        meetingInfo,
        socket,
        addToast
    })
    // Headless Cloud Recording Stream Feeder & Screen Share Policy Hook
    const {
        cloudRecordRecorderRef
    } = useMeetingCloudRecordingStreamFeeder({
        socket,
        meetingId,
        meetingInput,
        localStream,
        activeLocalStream,
        screenSharingUserId,
        screenSharingUserIds,
        stopScreenShare,
        canManageRef,
        setIsCloudRecording,
        setIsRemoteRecording,
        setScreenSharePolicy,
        addToast
    })

    // Co-Host Role & In-Meeting Permissions Hook
    const {
        coHostIds,
        setCoHostIds,
        recordingAllowedUserIds,
        setRecordingAllowedUserIds,
        whiteboardAllowedUserIds,
        setWhiteboardAllowedUserIds,
        remoteLiveStatus,
        setRemoteLiveStatus
    } = useMeetingRoleAndPermissions({
        socket,
        token,
        renamedUsers,
        setIsLiveStreaming,
        addToast
    })

    // Breakout Rooms Hook
    const {
        isBreakoutModalOpen,
        setIsBreakoutModalOpen,
        activeBreakoutSession,
        setActiveBreakoutSession,
        currentBreakoutSubRoomId,
        setCurrentBreakoutSubRoomId
    } = useMeetingBreakoutRooms({
        socket,
        token,
        meetingId,
        meetingInput,
        localUserId,
        myDisplayName,
        connectToMeeting,
        addToast
    })

    // Virtual background cleanup on unmount
    useEffect(() => {
        return () => {
            virtualBackgroundService.cleanup()
        }
    }, [])

    // Network Resilience & Toolbar Auto-hide Hook
    const {
        isNetworkOffline,
        setIsNetworkOffline,
        showRestoredNotice,
        toolbarVisible,
        setToolbarVisible,
        isToolbarHovered,
        setIsToolbarHovered,
        isToolbarHoveredRef,
        showMoreMenuRef,
        showReactionsPopoverRef,
        activePanelRef,
        windowWidth,
        footerToolbarRef,
        isToolbarActuallyVisible
    } = useMeetingNetworkAndToolbar({
        socket,
        meetingId,
        meetingInput,
        myDisplayName,
        connectToMeetingRef,
        lowBandwidthMode,
        remoteStreams,
        showMoreMenu,
        showReactionsPopover,
        activePanel,
        addToast
    })

    // Attendance Tracking & MoM/ICS Export Hook
    const {
        attendanceRecords,
        attendanceRecordsRef,
        joinTimeMapRef,
        showAttendanceModal,
        setShowAttendanceModal,
        exportAttendanceCSV,
        downloadICSFile,
        generateMoMContent
    } = useMeetingAttendance({
        joined,
        myDisplayName,
        meetingId,
        meetingInput,
        meetingInfo,
        participants,
        coHostIds,
        renamedUsers,
        getUserDisplayName,
        fetchMeetingParticipants,
        messages,
        timerStr,
        addToast
    })

    useEffect(() => {
        if (joined && meetingId) {
            fetchMeetingParticipants(meetingId)
        }
    }, [joined, meetingId])



    // Global keyboard shortcuts & Push-to-Talk listener hook
    useMeetingKeyboardShortcuts({
        joined,
        toggleMute,
        toggleVideo,
        handleTogglePiP,
        handleToggleScreenShare,
        setActivePanel,
        socket,
        meetingId,
        meetingInput,
        handRaised,
        setHandRaised,
        setShowWhiteboard,
        setShowCaptions,
        setShowPolls,
        setShowSummary,
        setShowShortcuts,
        setShowDeviceSettings,
        setShowEndMeetingModal
    })

        // Meeting Lifecycle & Auto-rejoin Hook
    const {
        handleJoinMeeting,
        handleExitMeeting,
        handleConnect
    } = useMeetingLifecycle({
        meetingInput,
        setMeetingInput,
        meetingId,
        setMeetingId,
        socket,
        token,
        initialToken,
        initialMeetingId,
        autoJoin,
        connected,
        joined,
        setJoined,
        isVideoOff,
        setIsVideoOff,
        mediaLoading,
        connectToMeeting,
        leaveMeeting,
        stopMedia,
        onLeave,
        isGuest,
        timerStr,
        talkTimeMap,
        meetingNotes,
        meetingInfo,
        setPostMeetingCapsule,
        startScreenShare,
        connectSocket
    })

    const togglePanel = (panel: ActivePanel) => {
        setActivePanel((prev) => (prev === panel ? null : panel))
        // Re-poll waiting guests whenever participants panel is opened so the host
        // always sees an up-to-date list even if they missed a 'guest:new-waiting' event.
        if (panel === 'participants' && socket) {
            const activeRoom = meetingId || meetingInput.trim()
            if (activeRoom) {
                socket.emit('guest:get-waiting', { meetingId: activeRoom })
            }
        }
    }

    
const activeRoomKey = meetingId || meetingInput.trim()

    // Meeting Host Permissions, Moderation & Global Socket Events Hook
    const {
        isRoomCreator,
        isLocalHost,
        isCoHost,
        canManageParticipants,
        isWebinarAttendee,
        canRecord,
        canUseWhiteboard,
        isCurrentUserBackstage,
        canUseBackstage,
        handlePromoteCoHost,
        handleTogglePermission,
        handleStageStatusChange,
        handleMuteAll,
        handleToggleLock,
        handleToggleWatermark,
        handleToggleScreenSharePolicy,
        handleApproveGuest,
        handleDenyGuest,
        handleApproveAllGuests,
        handleToggleWaitingRoom
    } = useMeetingHostAndModeration({
        meetingId,
        meetingInput,
        setMeetingInput,
        meetingInfo,
        setMeetingInfo,
        localUserId,
        isGuest,
        coHostIds,
        isAdminOrOwner,
        isWebinarMode,
        isPromotedToSpeaker,
        localStream,
        socket,
        setIsMuted,
        setIsVideoOff,
        recordingAllowedUserIds,
        setRecordingAllowedUserIds,
        whiteboardAllowedUserIds,
        setWhiteboardAllowedUserIds,
        showWhiteboard,
        backstageUserIds,
        setBackstageUserIds,
        currentPlanTier,
        canManageRef,
        token,
        isLocked,
        setIsLocked,
        isWatermarkEnabled,
        setIsWatermarkEnabled,
        setScreenSharePolicy,
        waitingGuests,
        setWaitingGuests,
        setIsWaitingRoomActive,
        handleExitMeeting,
        spawnReaction,
        addToast
    })

    /* ── If the user has left the meeting and there is a capsule, show it ── */
    if (postMeetingCapsule) {
        return (
            <PostMeetingCapsuleModal
                capsule={postMeetingCapsule}
                isOpen={true}
                onClose={() => {
                    setPostMeetingCapsule(null)
                    if (onLeave) onLeave()
                    else window.location.href = '/'
                }}
            />
        )
    }

    /* ── Pre-join lobby ── */
    if (!joined) {
        return (
            <SetupScreen
                token={token}
                setToken={setToken}
                meetingInput={meetingInput}
                setMeetingInput={setMeetingInput}
                connected={connected}
                mediaLoading={mediaLoading}
                mediaError={mediaError}
                onConnect={handleConnect}
                onJoin={handleJoinMeeting}
                localStream={localStream}
                replaceLocalStream={replaceLocalStream}
                initialVideoOff={isVideoOff}
                onToggleVideo={setIsVideoOff}
                onLeave={onLeave}
            />
        )
    }

    /* ── Meeting Room Layout Calculations ── */
    const {
        activePresenterId,
        isScreenShareActive,
        effectiveScreenSharer,
        effectiveScreenShareActive,
        allUsers,
        visibleUsers,
        isStageLayoutActive,
        primaryUser,
        primaryStream,
        presenterName,
        displayedUsers,
        stripUsers,
        isMobile,
        isTablet,
        gridStyle,
        layoutStyle
    } = calculateMeetingStageLayout({
        screenSharingUserId,
        screenSharingUserIds,
        localStream,
        activeLocalStream,
        remoteStreams,
        backstageUserIds,
        canManageParticipants,
        isLocalHost,
        localUserId,
        participants,
        layoutMode,
        fullScreenUserId,
        pinnedUserId,
        activeSpeaker,
        maxGridTiles,
        windowWidth,
        getUserDisplayName
    })


    return (
        <div style={{
            height: '100%',
            maxHeight: '100%',
            background: 'var(--color-bg-base)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
        }}>

            {/* ── Banners & Remote Audio Bridge ── */}
            <MeetingOverlayBanners
                showTalkingWhileMuted={showTalkingWhileMuted}
                isMuted={isMuted}
                showCaptions={showCaptions}
                toggleMute={toggleMute}
                isWebinarMode={isWebinarMode}
                isWebinarAttendee={isWebinarAttendee}
                participantsCount={participants.length}
                socket={socket}
                meetingId={meetingId}
                meetingInput={meetingInput}
                setIsWebinarMode={setIsWebinarMode}
                onOpenParticipants={() => setActivePanel('participants')}
                remoteStreams={remoteStreams}
                localUserId={localUserId || ''}
                backstageUserIds={backstageUserIds}
                remoteMuteStates={remoteMuteStates}
                canManageParticipants={canManageParticipants}
                isLocalHost={isLocalHost}
            />

            {/* ── Header Bar ── */}
            <MeetingHeader
                isWebinarAttendee={isWebinarAttendee}
                isRecording={isRecording}
                isRemoteRecording={isRemoteRecording}
                isCloudRecording={isCloudRecording}
                meetingDisplayId={meetingId || meetingInput}
                canAccessE2EE={canAccessE2EE}
                isE2EEActive={isE2EEActive}
                canAccessDialIn={canAccessDialIn}
                isGuest={isGuest}
                canManageParticipants={canManageParticipants}
                isWaitingRoomActive={isWaitingRoomActive}
                waitingGuestsCount={waitingGuests.length}
                isScreenShareActive={isScreenShareActive}
                activePresenterId={activePresenterId}
                screenSharingUserIds={screenSharingUserIds}
                primaryUser={primaryUser}
                screenSharingUserId={screenSharingUserId}
                pinnedUserId={pinnedUserId}
                currentPlanTier={currentPlanTier}
                freeTimeRemaining={freeTimeRemaining}
                timerStr={timerStr}
                connected={connected}
                isConfidentialMode={isConfidentialMode}
                participantsCount={participants.length + 1}
                getUserDisplayName={getUserDisplayName}
                switchActivePresenter={switchActivePresenter}
                setPinnedUserId={setPinnedUserId}
                addToast={addToast}
                formatRemainingTime={formatRemainingTime}
                onUpgradePlanRequest={onUpgradePlanRequest}
                onRequireUpgrade={(feature) => setUpgradeModalFeature(feature)}
                onOpenE2EE={() => setShowE2EEModal(true)}
                onOpenDialIn={() => setShowDialInModal(true)}
                onOpenInvite={() => setIsInviteOpen(true)}
                onToggleWaitingRoom={(active) => handleToggleWaitingRoom(active)}
                onOpenParticipantsPanel={() => setActivePanel('participants')}
                onOpenAnalytics={() => setShowAnalyticsModal(true)}
                onOpenCatchUp={() => setShowCatchUpModal(true)}
            />


            {/* Webinar Attendee Experience (View-only stage & chat/Q&A panel) */}
            <WebinarAttendeeExperience
                isWebinarAttendee={isWebinarAttendee}
                meetingId={meetingId}
                meetingInput={meetingInput}
                meetingInfo={meetingInfo}
                screenSharingUserId={screenSharingUserId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                activeSpeaker={activeSpeaker}
                getUserDisplayName={getUserDisplayName}
                myDisplayName={myDisplayName}
                socket={socket}
                localUserId={localUserId}
                isPromotedToSpeaker={isPromotedToSpeaker}
                leaveMeeting={leaveMeeting}
                activePanel={activePanel}
                setActivePanel={setActivePanel}
                setShowPolls={setShowPolls}
                unreadChatCount={unreadChatCount}
                setUnreadChatCount={setUnreadChatCount}
                participants={participants}
                messages={messages}
                typingUsers={typingUsers}
                sendMessage={sendMessage}
                emitTyping={emitTyping}
                emitStopTyping={emitStopTyping}
                connected={connected}
                joined={joined}
                toggleChatReaction={toggleChatReaction}
                token={token}
                renamedUsers={renamedUsers}
                canManageParticipants={canManageParticipants}
                isLocalHost={isLocalHost}
            />



            {/* Ambient Free Tier Warning Pill (Compact floating Zoom/Meet style) */}
            <FreeTierWarningPill
                isWebinarAttendee={isWebinarAttendee}
                isLowTimeWarning={isLowTimeWarning}
                isWarningDismissed={isWarningDismissed}
                isWebinarMode={isWebinarMode}
                isNetworkOffline={isNetworkOffline}
                networkStatus={networkStatus}
                isReconnecting={isReconnecting}
                showRestoredNotice={showRestoredNotice}
                freeTimeRemaining={freeTimeRemaining}
                formatRemainingTime={formatRemainingTime}
                onUpgradePlanRequest={onUpgradePlanRequest}
                onDismiss={() => setIsWarningDismissed(true)}
            />

            {/* ── Main Stage Area & Side Panels Section ── */}
            <MeetingStageSection
                isWebinarAttendee={isWebinarAttendee}
                isWebinarMode={isWebinarMode}
                isLowTimeWarning={isLowTimeWarning}
                screenError={screenError}
                clearScreenError={clearScreenError}
                isStageLayoutActive={isStageLayoutActive}
                layoutStyle={layoutStyle}
                gridStyle={gridStyle}
                fullScreenUserId={fullScreenUserId}
                setFullScreenUserId={setFullScreenUserId}
                layoutMode={layoutMode}
                isMobile={isMobile}
                isTablet={isTablet}
                activeSpeaker={activeSpeaker}
                primaryUser={primaryUser}
                primaryStream={primaryStream}
                isScreenShareActive={effectiveScreenShareActive}
                activePresenterId={effectiveScreenSharer}
                handRaised={handRaised}
                handsRaisedMap={handsRaisedMap}
                isLocalHost={isLocalHost}
                meetingInfo={meetingInfo}
                isGuest={isGuest}
                isVideoOff={isVideoOff}
                remoteVideoStates={remoteVideoStates}
                isBlurEnabled={isBlurEnabled}
                isStudioLightingEnabled={isStudioLightingEnabled}
                isHdBoostEnabled={isHdBoostEnabled}
                isWatermarkEnabled={isWatermarkEnabled}
                myDisplayName={myDisplayName}
                meetingId={meetingId || meetingInput}
                initialMeetingId={initialMeetingId}
                isMuted={isMuted}
                remoteMuteStates={remoteMuteStates}
                pinnedUserId={pinnedUserId}
                setPinnedUserId={setPinnedUserId}
                isAnnotationActive={isAnnotationActive}
                setIsAnnotationActive={setIsAnnotationActive}
                isAttendeeAnnotationActive={isAttendeeAnnotationActive}
                setIsAttendeeAnnotationActive={setIsAttendeeAnnotationActive}
                activeControllerId={activeControllerId}
                activeControllerName={activeControllerName}
                isRequestingControl={isRequestingControl}
                handleRequestRemoteControl={handleRequestRemoteControl}
                handleReleaseRemoteControl={handleReleaseRemoteControl}
                handleRevokeRemoteControl={handleRevokeRemoteControl}
                incomingControlRequest={incomingControlRequest}
                screenSharingUserId={screenSharingUserId}
                handleAcceptControlRequest={handleAcceptControlRequest}
                handleDenyControlRequest={handleDenyControlRequest}
                stripUsers={stripUsers}
                displayedUsers={displayedUsers}
                allUsersLength={allUsers.length}
                screenSharingUserIds={screenSharingUserIds}
                localStream={localStream}
                activeLocalStream={activeLocalStream}
                remoteStreams={remoteStreams}
                backstageUserIds={backstageUserIds}
                isCurrentUserBackstage={isCurrentUserBackstage}
                canManageParticipants={canManageParticipants}
                switchActivePresenter={switchActivePresenter}
                getUserDisplayName={getUserDisplayName}
                socket={socket}
                token={token}
                activePanel={activePanel}
                setActivePanel={setActivePanel}
                participants={participants}
                spotlightUserId={spotlightUserId}
                setSpotlightUserId={setSpotlightUserId}
                coHostIds={coHostIds}
                setCoHostIds={setCoHostIds}
                renamedUsers={renamedUsers}
                setRenamedUsers={setRenamedUsers}
                addToast={addToast}
                isLocked={isLocked}
                handleToggleLock={handleToggleLock}
                handleMuteAll={handleMuteAll}
                handleToggleWatermark={handleToggleWatermark}
                exportAttendanceCSV={exportAttendanceCSV}
                setShowAttendanceModal={setShowAttendanceModal}
                recordingAllowedUserIds={recordingAllowedUserIds}
                whiteboardAllowedUserIds={whiteboardAllowedUserIds}
                handleTogglePermission={handleTogglePermission}
                handlePromoteCoHost={handlePromoteCoHost}
                waitingGuests={waitingGuests}
                handleApproveGuest={handleApproveGuest}
                handleDenyGuest={handleDenyGuest}
                handleApproveAllGuests={handleApproveAllGuests}
                isWaitingRoomActive={isWaitingRoomActive}
                handleToggleWaitingRoom={handleToggleWaitingRoom}
                canUseBackstage={canUseBackstage}
                handleStageStatusChange={handleStageStatusChange}
                setUpgradeModalFeature={setUpgradeModalFeature}
                messages={messages}
                typingUsers={typingUsers}
                sendMessage={sendMessage}
                emitTyping={emitTyping}
                emitStopTyping={emitStopTyping}
                connected={connected}
                joined={joined}
                toggleChatReaction={toggleChatReaction}
                isAdminOrOwner={isAdminOrOwner}
                setMeetingInfo={setMeetingInfo}
                screenSharePolicy={screenSharePolicy}
                handleToggleScreenSharePolicy={handleToggleScreenSharePolicy}
                meetingInput={meetingInput}
            />

            {/* ── Bottom Control Bar & More Options Menu ── */}
            <MeetingBottomControls
                isWebinarAttendee={isWebinarAttendee}
                footerToolbarRef={footerToolbarRef}
                isToolbarActuallyVisible={isToolbarActuallyVisible}
                windowWidth={windowWidth}
                setIsToolbarHovered={setIsToolbarHovered}
                isToolbarHoveredRef={isToolbarHoveredRef}
                setToolbarVisible={setToolbarVisible}
                isMuted={isMuted}
                toggleMute={toggleMute}
                isVideoOff={isVideoOff}
                toggleVideo={toggleVideo}
                connected={connected}
                joined={joined}
                screenSharingUserId={screenSharingUserId}
                screenSharingUserIds={screenSharingUserIds}
                screenSharePolicy={screenSharePolicy}
                canManageParticipants={canManageParticipants}
                isLocalHost={isLocalHost}
                handleToggleScreenShare={handleToggleScreenShare}
                handRaised={handRaised}
                handleToggleHandRaise={handleToggleHandRaise}
                reactionBtnRef={reactionBtnRef}
                showReactionsPopover={showReactionsPopover}
                setShowReactionsPopover={setShowReactionsPopover}
                sendReaction={sendReaction}
                activePanel={activePanel}
                togglePanel={togglePanel}
                waitingGuestsCount={waitingGuests.length}
                participantsCount={participants.length}
                unreadChatCount={unreadChatCount}
                showCaptions={showCaptions}
                setShowCaptions={setShowCaptions}
                addToast={addToast}
                moreBtnRef={moreBtnRef}
                moreMenuRef={moreMenuRef}
                showMoreMenu={showMoreMenu}
                setShowMoreMenu={setShowMoreMenu}
                handleExitMeeting={handleExitMeeting}
                setShowEndMeetingModal={setShowEndMeetingModal}
                canRecord={canRecord}
                canAccessRecording={canAccessRecording}
                isRecording={isRecording}
                startRecording={startRecording}
                stopRecording={stopRecording}
                canAccessCloudRecording={canAccessCloudRecording}
                isCloudRecording={isCloudRecording}
                toggleCloudRecording={toggleCloudRecording}
                canUseWhiteboard={canUseWhiteboard}
                showWhiteboard={showWhiteboard}
                setShowWhiteboard={setShowWhiteboard}
                showPolls={showPolls}
                setShowPolls={setShowPolls}
                canAccessBreakout={canAccessBreakout}
                activeBreakoutSession={activeBreakoutSession}
                setIsBreakoutModalOpen={setIsBreakoutModalOpen}
                canAccessAI={canAccessAI}
                setShowMoMModal={setShowMoMModal}
                isGuest={isGuest}
                showSummary={showSummary}
                setShowSummary={setShowSummary}
                setShowCatchUpModal={setShowCatchUpModal}
                setShowAnalyticsModal={setShowAnalyticsModal}
                isConfidentialMode={isConfidentialMode}
                setIsConfidentialMode={setIsConfidentialMode}
                isVoiceDubbingEnabled={isVoiceDubbingEnabled}
                setIsVoiceDubbingEnabled={setIsVoiceDubbingEnabled}
                handleTogglePiP={handleTogglePiP}
                isPiPActive={isPiPActive}
                lowBandwidthMode={lowBandwidthMode}
                setLowBandwidthMode={setLowBandwidthMode}
                setIsLayoutModalOpen={setIsLayoutModalOpen}
                layoutMode={layoutMode}
                isStudioLightingEnabled={isStudioLightingEnabled}
                setIsStudioLightingEnabled={setIsStudioLightingEnabled}
                canAccessRTMP={canAccessRTMP}
                isLiveStreaming={isLiveStreaming}
                setShowLiveStreamModal={setShowLiveStreamModal}
                canAccessAttendance={canAccessAttendance}
                setShowAttendanceModal={setShowAttendanceModal}
                setShowVirtualBgModal={setShowVirtualBgModal}
                virtualBgPreset={virtualBgPreset}
                canAccessE2EE={canAccessE2EE}
                isE2EEActive={isE2EEActive}
                setShowE2EEModal={setShowE2EEModal}
                canAccessDialIn={canAccessDialIn}
                setShowDialInModal={setShowDialInModal}
                canAccessWebinar={canAccessWebinar}
                isWebinarMode={isWebinarMode}
                setIsWebinarMode={setIsWebinarMode}
                socket={socket}
                meetingId={meetingId}
                meetingInput={meetingInput}
                setShowDeviceSettings={setShowDeviceSettings}
                setShowShortcuts={setShowShortcuts}
                setUpgradeModalFeature={setUpgradeModalFeature}
                showPushToTalkHud={showPushToTalkHud}
            />

            {/* Host Overlays: End Meeting Modal & Virtual Green Room Controls */}
            <MeetingHostOverlays
                showEndMeetingModal={showEndMeetingModal}
                setShowEndMeetingModal={setShowEndMeetingModal}
                handleExitMeeting={handleExitMeeting}
                meetingId={meetingId}
                meetingInput={meetingInput}
                attendanceRecordsRef={attendanceRecordsRef}
                joinTimeMapRef={joinTimeMapRef}
                myDisplayName={myDisplayName}
                timerStr={timerStr}
                participants={participants}
                getUserDisplayName={getUserDisplayName}
                coHostIds={coHostIds}
                token={token}
                initialToken={initialToken}
                addToast={addToast}
                setMeetingInput={setMeetingInput}
                socket={socket}
                exportAttendanceCSV={exportAttendanceCSV}
                isCurrentUserBackstage={isCurrentUserBackstage}
                isWebinarMode={isWebinarMode}
                isLocalHost={isLocalHost}
                canUseBackstage={canUseBackstage}
                backstageUserIds={backstageUserIds}
                activePanel={activePanel}
                windowWidth={windowWidth}
                activeRoomKey={activeRoomKey}
            />

            {/* Late-Joiner AI "Catch Me Up" Floating Prompt & Modal */}
            <LateJoinerCatchUpSection
                showCatchUpPrompt={showCatchUpPrompt}
                setShowCatchUpPrompt={setShowCatchUpPrompt}
                showCatchUpModal={showCatchUpModal}
                setShowCatchUpModal={setShowCatchUpModal}
                joinedMinutesLate={joinedMinutesLate}
                meetingTitle={meetingInfo?.title}
                meetingId={meetingId}
                meetingInput={meetingInput}
                token={token}
                initialToken={initialToken}
                transcripts={transcripts}
                messages={messages}
            />



            {/* ── Meeting Modals, Overlays & Toasts Container ── */}
            <MeetingModalsContainer
                showWhiteboard={showWhiteboard}
                setShowWhiteboard={setShowWhiteboard}
                meetingId={meetingId || meetingInput}
                meetingInput={meetingInput}
                socket={socket}
                showPolls={showPolls}
                setShowPolls={setShowPolls}
                canManageParticipants={canManageParticipants}
                isLocalHost={isLocalHost}
                showDeviceSettings={showDeviceSettings}
                setShowDeviceSettings={setShowDeviceSettings}
                localStream={localStream}
                handleVideoSourceChange={handleVideoSourceChange}
                handleAudioSourceChange={handleAudioSourceChange}
                isBlurEnabled={isBlurEnabled}
                handleToggleBlur={handleToggleBlur}
                isNoiseSuppressionEnabled={isNoiseSuppressionEnabled}
                handleToggleNoiseSuppression={handleToggleNoiseSuppression}
                setShowVirtualBgModal={setShowVirtualBgModal}
                videoQuality={videoQuality}
                handleQualityChange={handleQualityChange}
                isHdBoostEnabled={isHdBoostEnabled}
                setIsHdBoostEnabled={setIsHdBoostEnabled}
                showSummary={showSummary}
                setShowSummary={setShowSummary}
                meetingInfo={meetingInfo}
                transcripts={transcripts}
                participants={participants}
                messages={messages}
                timerStr={timerStr}
                myDisplayName={myDisplayName}
                getUserDisplayName={getUserDisplayName}
                showShortcuts={showShortcuts}
                setShowShortcuts={setShowShortcuts}
                isConfidentialMode={isConfidentialMode}
                watermarkOffset={watermarkOffset}
                detectedActionItem={detectedActionItem}
                setDetectedActionItem={setDetectedActionItem}
                handleAddDetectedActionItem={handleAddDetectedActionItem}
                showAnalyticsModal={showAnalyticsModal}
                setShowAnalyticsModal={setShowAnalyticsModal}
                talkTimeMap={talkTimeMap}
                isLayoutModalOpen={isLayoutModalOpen}
                setIsLayoutModalOpen={setIsLayoutModalOpen}
                layoutMode={layoutMode}
                setLayoutMode={setLayoutMode}
                addToast={addToast}
                maxGridTiles={maxGridTiles}
                setMaxGridTiles={setMaxGridTiles}
                showVirtualBgModal={showVirtualBgModal}
                virtualBgPreset={virtualBgPreset}
                handleSelectVirtualBackground={handleSelectVirtualBackground}
                handleUploadCustomWallpaper={handleUploadCustomWallpaper}
                activeLocalStream={activeLocalStream}
                isApplyingVirtualBg={isApplyingVirtualBg}
                showE2EEModal={showE2EEModal}
                setShowE2EEModal={setShowE2EEModal}
                setIsE2EEActive={setIsE2EEActive}
                showDialInModal={showDialInModal}
                setShowDialInModal={setShowDialInModal}
                isBreakoutModalOpen={isBreakoutModalOpen}
                setIsBreakoutModalOpen={setIsBreakoutModalOpen}
                activeBreakoutSession={activeBreakoutSession}
                currentBreakoutSubRoomId={currentBreakoutSubRoomId}
                setCurrentBreakoutSubRoomId={setCurrentBreakoutSubRoomId}
                token={token}
                localUserId={localUserId}
                connectToMeeting={connectToMeeting}
                isNetworkOffline={isNetworkOffline}
                networkStatus={networkStatus}
                isReconnecting={isReconnecting}
                retryConnection={retryConnection}
                showRestoredNotice={showRestoredNotice}
                lowBandwidthMode={lowBandwidthMode}
                connectToMeetingRef={connectToMeetingRef}
                showReactionsPopover={showReactionsPopover}
                setShowReactionsPopover={setShowReactionsPopover}
                reactionBtnRef={reactionBtnRef}
                reactionsPopoverRef={reactionsPopoverRef}
                floatingReactions={floatingReactions}
                sendReaction={sendReaction}
                handleTriggerSoundboard={handleTriggerSoundboard}
                showMoMModal={showMoMModal}
                setShowMoMModal={setShowMoMModal}
                attendanceRecordsRef={attendanceRecordsRef}
                generateMoMContent={generateMoMContent}
                toasts={toasts}
                waitingGuests={waitingGuests}
                handleApproveAllGuests={handleApproveAllGuests}
                handleApproveGuest={handleApproveGuest}
                handleDenyGuest={handleDenyGuest}
                isInviteOpen={isInviteOpen}
                setIsInviteOpen={setIsInviteOpen}
                isGuest={isGuest}
                isLiveStreaming={isLiveStreaming}
                remoteLiveStatus={remoteLiveStatus}
                liveStreamConfig={liveStreamConfig}
                showLiveStreamModal={showLiveStreamModal}
                setShowLiveStreamModal={setShowLiveStreamModal}
                handleStartLiveStream={handleStartLiveStream}
                handleStopLiveStream={handleStopLiveStream}
                upgradeModalFeature={upgradeModalFeature}
                setUpgradeModalFeature={setUpgradeModalFeature}
                currentPlanTier={currentPlanTier}
                onUpgradePlanRequest={onUpgradePlanRequest}
                isTimeLimitExpired={isTimeLimitExpired}
                isMeetingPaid={isMeetingPaid}
                onLeave={onLeave}
                showAttendanceModal={showAttendanceModal}
                setShowAttendanceModal={setShowAttendanceModal}
                meetingSecondsElapsed={meetingSecondsElapsed}
                attendanceRecords={attendanceRecords}
                joinTimeMapRef={joinTimeMapRef}
                exportAttendanceCSV={exportAttendanceCSV}
                showTakeoverModal={showTakeoverModal}
                setShowTakeoverModal={setShowTakeoverModal}
                takeoverPresenterId={takeoverPresenterId}
                setTakeoverPresenterId={setTakeoverPresenterId}
                startScreenShare={startScreenShare}
                showScreenPicker={showScreenPicker}
                handleScreenPickerClosed={handleScreenPickerClosed}
                handleScreenSourceSelected={handleScreenSourceSelected}
            />
        </div>
    )
}
