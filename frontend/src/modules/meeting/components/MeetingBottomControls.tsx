import React from 'react'
import { MeetingToolbar } from './MeetingToolbar'
import { MoreOptionsMenu } from './MoreOptionsMenu'
import { PushToTalkMicHud } from './PushToTalkMicHud'
import { MeetingLayoutMode } from './LayoutSwitcherModal'

export interface MeetingBottomControlsProps {
    isWebinarAttendee: boolean
    footerToolbarRef: React.RefObject<any>
    isToolbarActuallyVisible: boolean
    windowWidth: number
    setIsToolbarHovered: (hovered: boolean) => void
    isToolbarHoveredRef: React.MutableRefObject<boolean>
    setToolbarVisible: (visible: boolean) => void
    isMuted: boolean
    toggleMute: () => void
    isVideoOff: boolean
    toggleVideo: () => void
    connected: boolean
    joined: boolean
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    screenSharePolicy: 'everyone' | 'host_only'
    canManageParticipants: boolean
    isLocalHost: boolean
    handleToggleScreenShare: () => void
    handRaised: boolean
    handleToggleHandRaise: () => void
    reactionBtnRef: React.RefObject<HTMLButtonElement | null>
    showReactionsPopover: boolean
    setShowReactionsPopover: React.Dispatch<React.SetStateAction<boolean>>
    sendReaction: (emoji: string) => void
    activePanel: string | null
    togglePanel: (panel: any) => void
    waitingGuestsCount: number
    participantsCount: number
    unreadChatCount: number
    showCaptions: boolean
    setShowCaptions: React.Dispatch<React.SetStateAction<boolean>>
    addToast: (msg: string, type?: any) => void
    moreBtnRef: React.RefObject<HTMLButtonElement | null>
    moreMenuRef: React.RefObject<HTMLDivElement | null>
    showMoreMenu: boolean
    setShowMoreMenu: React.Dispatch<React.SetStateAction<boolean>>
    handleExitMeeting: () => void
    setShowEndMeetingModal: (show: boolean) => void
    canRecord: boolean
    canAccessRecording: boolean
    isRecording: boolean
    startRecording: () => void
    stopRecording: () => void
    canAccessCloudRecording: boolean
    isCloudRecording: boolean
    toggleCloudRecording: () => void
    canUseWhiteboard: boolean
    showWhiteboard: boolean
    setShowWhiteboard: React.Dispatch<React.SetStateAction<boolean>>
    showPolls: boolean
    setShowPolls: React.Dispatch<React.SetStateAction<boolean>>
    canAccessBreakout: boolean
    activeBreakoutSession: any
    setIsBreakoutModalOpen: (open: boolean) => void
    canAccessAI: boolean
    setShowMoMModal: (show: boolean) => void
    isGuest: boolean
    showSummary: boolean
    setShowSummary: React.Dispatch<React.SetStateAction<boolean>>
    setShowCatchUpModal: (show: boolean) => void
    setShowAnalyticsModal: (show: boolean) => void
    isConfidentialMode: boolean
    setIsConfidentialMode: React.Dispatch<React.SetStateAction<boolean>>
    isVoiceDubbingEnabled: boolean
    setIsVoiceDubbingEnabled: React.Dispatch<React.SetStateAction<boolean>>
    handleTogglePiP: () => void
    isPiPActive: boolean
    lowBandwidthMode: boolean
    setLowBandwidthMode: (mode: boolean) => void
    setIsLayoutModalOpen: (open: boolean) => void
    layoutMode: MeetingLayoutMode
    isStudioLightingEnabled: boolean
    setIsStudioLightingEnabled: (enabled: boolean) => void
    canAccessRTMP: boolean
    isLiveStreaming: boolean
    setShowLiveStreamModal: (show: boolean) => void
    canAccessAttendance: boolean
    setShowAttendanceModal: (show: boolean) => void
    setShowVirtualBgModal: (show: boolean) => void
    virtualBgPreset: any
    canAccessE2EE: boolean
    isE2EEActive: boolean
    setShowE2EEModal: (show: boolean) => void
    canAccessDialIn: boolean
    setShowDialInModal: (show: boolean) => void
    canAccessWebinar: boolean
    isWebinarMode: boolean
    setIsWebinarMode: (mode: boolean) => void
    socket: any
    meetingId: string
    meetingInput: string
    setShowDeviceSettings: (show: boolean) => void
    setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>
    setUpgradeModalFeature: (feature: any) => void
    showPushToTalkHud: boolean
}

export const MeetingBottomControls: React.FC<MeetingBottomControlsProps> = ({
    isWebinarAttendee,
    footerToolbarRef,
    isToolbarActuallyVisible,
    windowWidth,
    setIsToolbarHovered,
    isToolbarHoveredRef,
    setToolbarVisible,
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
    handleToggleScreenShare,
    handRaised,
    handleToggleHandRaise,
    reactionBtnRef,
    showReactionsPopover,
    setShowReactionsPopover,
    sendReaction,
    activePanel,
    togglePanel,
    waitingGuestsCount,
    participantsCount,
    unreadChatCount,
    showCaptions,
    setShowCaptions,
    addToast,
    moreBtnRef,
    moreMenuRef,
    showMoreMenu,
    setShowMoreMenu,
    handleExitMeeting,
    setShowEndMeetingModal,
    canRecord,
    canAccessRecording,
    isRecording,
    startRecording,
    stopRecording,
    canAccessCloudRecording,
    isCloudRecording,
    toggleCloudRecording,
    canUseWhiteboard,
    showWhiteboard,
    setShowWhiteboard,
    showPolls,
    setShowPolls,
    canAccessBreakout,
    activeBreakoutSession,
    setIsBreakoutModalOpen,
    canAccessAI,
    setShowMoMModal,
    isGuest,
    showSummary,
    setShowSummary,
    setShowCatchUpModal,
    setShowAnalyticsModal,
    isConfidentialMode,
    setIsConfidentialMode,
    isVoiceDubbingEnabled,
    setIsVoiceDubbingEnabled,
    handleTogglePiP,
    isPiPActive,
    lowBandwidthMode,
    setLowBandwidthMode,
    setIsLayoutModalOpen,
    layoutMode,
    isStudioLightingEnabled,
    setIsStudioLightingEnabled,
    canAccessRTMP,
    isLiveStreaming,
    setShowLiveStreamModal,
    canAccessAttendance,
    setShowAttendanceModal,
    setShowVirtualBgModal,
    virtualBgPreset,
    canAccessE2EE,
    isE2EEActive,
    setShowE2EEModal,
    canAccessDialIn,
    setShowDialInModal,
    canAccessWebinar,
    isWebinarMode,
    setIsWebinarMode,
    socket,
    meetingId,
    meetingInput,
    setShowDeviceSettings,
    setShowShortcuts,
    setUpgradeModalFeature,
    showPushToTalkHud
}) => {
    return (
        <>
            {/* Bottom Control Bar */}
            <MeetingToolbar
                isWebinarAttendee={isWebinarAttendee}
                footerToolbarRef={footerToolbarRef}
                isToolbarActuallyVisible={isToolbarActuallyVisible}
                windowWidth={windowWidth}
                onToolbarMouseEnter={() => {
                    setIsToolbarHovered(true)
                    isToolbarHoveredRef.current = true
                    setToolbarVisible(true)
                }}
                onToolbarMouseLeave={() => {
                    setIsToolbarHovered(false)
                    isToolbarHoveredRef.current = false
                }}
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
                onToggleScreenShare={handleToggleScreenShare}
                handRaised={handRaised}
                onToggleHandRaise={handleToggleHandRaise}
                reactionBtnRef={reactionBtnRef}
                showReactionsPopover={showReactionsPopover}
                onToggleReactionsPopover={() => {
                    setShowReactionsPopover(prev => !prev)
                    sendReaction('❤️')
                }}
                activePanel={activePanel}
                onTogglePanel={(panel) => togglePanel(panel)}
                waitingGuestsCount={waitingGuestsCount}
                participantsCount={participantsCount}
                unreadChatCount={unreadChatCount}
                showCaptions={showCaptions}
                onToggleCaptions={() => {
                    const next = !showCaptions
                    setShowCaptions(next)
                    addToast(next ? 'Live Captions (CC) turned ON: Speak to see real-time subtitles' : 'Live Captions (CC) turned OFF', 'info')
                }}
                moreBtnRef={moreBtnRef}
                showMoreMenu={showMoreMenu}
                onToggleMoreMenu={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setShowMoreMenu(prev => !prev)
                }}
                onLeaveOrEndMeeting={() => {
                    if (isLocalHost) {
                        setShowEndMeetingModal(true)
                    } else {
                        handleExitMeeting()
                    }
                }}
            />

            {/* Google Meet Style Dynamic "More Options" Floating Popover */}
            <MoreOptionsMenu
                isOpen={showMoreMenu}
                onClose={() => setShowMoreMenu(false)}
                moreBtnRef={moreBtnRef}
                moreMenuRef={moreMenuRef}
                windowWidth={windowWidth}
                canRecord={canRecord}
                canAccessRecording={canAccessRecording}
                isRecording={isRecording}
                connected={connected}
                joined={joined}
                startRecording={startRecording}
                stopRecording={stopRecording}
                canAccessCloudRecording={canAccessCloudRecording}
                isCloudRecording={isCloudRecording}
                toggleCloudRecording={toggleCloudRecording}
                canUseWhiteboard={canUseWhiteboard}
                showWhiteboard={showWhiteboard}
                onToggleWhiteboard={() => setShowWhiteboard(prev => !prev)}
                canManageParticipants={canManageParticipants}
                showPolls={showPolls}
                onTogglePolls={() => setShowPolls(prev => !prev)}
                isLocalHost={isLocalHost}
                canAccessBreakout={canAccessBreakout}
                activeBreakoutSession={activeBreakoutSession}
                onOpenBreakout={() => setIsBreakoutModalOpen(true)}
                onTogglePanel={(panel) => togglePanel(panel)}
                activePanel={activePanel}
                canAccessAI={canAccessAI}
                onOpenMoM={() => setShowMoMModal(true)}
                isGuest={isGuest}
                showSummary={showSummary}
                onToggleSummary={() => setShowSummary(prev => !prev)}
                onOpenCatchUp={() => setShowCatchUpModal(true)}
                onOpenAnalytics={() => setShowAnalyticsModal(true)}
                isConfidentialMode={isConfidentialMode}
                onToggleConfidentialMode={() => setIsConfidentialMode(prev => !prev)}
                isVoiceDubbingEnabled={isVoiceDubbingEnabled}
                onToggleVoiceDubbing={() => setIsVoiceDubbingEnabled(prev => !prev)}
                handleTogglePiP={handleTogglePiP}
                isPiPActive={isPiPActive}
                lowBandwidthMode={lowBandwidthMode}
                onToggleLowBandwidthMode={() => {
                    setLowBandwidthMode(!lowBandwidthMode)
                    addToast(
                        !lowBandwidthMode
                            ? 'Low-Bandwidth Mode active: Video decoding paused to save ~85% data.'
                            : 'Low-Bandwidth Mode disabled: Full video stream restored.',
                        'info'
                    )
                }}
                onOpenLayoutModal={() => setIsLayoutModalOpen(true)}
                layoutMode={layoutMode}
                isStudioLightingEnabled={isStudioLightingEnabled}
                onToggleStudioLighting={() => {
                    const next = !isStudioLightingEnabled
                    setIsStudioLightingEnabled(next)
                    addToast(next ? 'Studio soft lighting enabled' : 'Studio lighting disabled', 'info')
                }}
                canAccessRTMP={canAccessRTMP}
                isLiveStreaming={isLiveStreaming}
                onOpenLiveStreamModal={() => setShowLiveStreamModal(true)}
                canAccessAttendance={canAccessAttendance}
                onOpenAttendanceModal={() => setShowAttendanceModal(true)}
                onOpenVirtualBgModal={() => setShowVirtualBgModal(true)}
                virtualBgPreset={virtualBgPreset}
                canAccessE2EE={canAccessE2EE}
                isE2EEActive={isE2EEActive}
                onOpenE2EEModal={() => setShowE2EEModal(true)}
                canAccessDialIn={canAccessDialIn}
                onOpenDialInModal={() => setShowDialInModal(true)}
                canAccessWebinar={canAccessWebinar}
                isWebinarMode={isWebinarMode}
                onToggleWebinarMode={() => {
                    const next = !isWebinarMode
                    setIsWebinarMode(next)
                    socket?.emit('webinar:toggle-mode', {
                        meetingId: meetingId || meetingInput.trim(),
                        enabled: next
                    })
                }}
                onOpenDeviceSettings={() => setShowDeviceSettings(true)}
                onOpenShortcuts={() => setShowShortcuts(prev => !prev)}
                onLeaveOrEndMeeting={() => {
                    if (isLocalHost) {
                        setShowEndMeetingModal(true)
                    } else {
                        handleExitMeeting()
                    }
                }}
                onRequireUpgrade={(feature) => setUpgradeModalFeature(feature)}
            />

            {/* Mic Status Toggle HUD (1 second flash) */}
            <PushToTalkMicHud
                show={showPushToTalkHud}
                isMuted={isMuted}
            />
        </>
    )
}
