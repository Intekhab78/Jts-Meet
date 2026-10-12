import React from 'react'
import { MeetingStageArea } from './MeetingStageArea'
import { MeetingLayoutMode } from './LayoutSwitcherModal'

export interface MeetingStageSectionProps {
    isWebinarAttendee: boolean
    isWebinarMode: boolean
    isLowTimeWarning: boolean
    screenError: string | null
    clearScreenError: () => void
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
    token?: string
    activePanel: any
    setActivePanel: React.Dispatch<React.SetStateAction<any>>

    // Side panels specific props
    participants: string[]
    spotlightUserId: string | null
    setSpotlightUserId: (id: string | null) => void
    coHostIds: string[]
    setCoHostIds: React.Dispatch<React.SetStateAction<string[]>>
    renamedUsers: Record<string, string>
    setRenamedUsers: React.Dispatch<React.SetStateAction<Record<string, string>>>
    addToast: (msg: string, type?: any) => void
    isLocked: boolean
    handleToggleLock: () => void
    handleMuteAll: () => void
    handleToggleWatermark: () => void
    exportAttendanceCSV: () => void
    setShowAttendanceModal: (v: boolean) => void
    recordingAllowedUserIds: string[]
    whiteboardAllowedUserIds: string[]
    handleTogglePermission: (userId: string, permission: 'recording' | 'whiteboard', enabled: boolean) => void
    handlePromoteCoHost: (userId: string, isPromoting: boolean) => void
    waitingGuests: any[]
    handleApproveGuest: (guestId: string) => void
    handleDenyGuest: (guestId: string) => void
    handleApproveAllGuests: () => void
    isWaitingRoomActive: boolean
    handleToggleWaitingRoom: (enabled: boolean) => void
    canUseBackstage: boolean
    handleStageStatusChange: (userId: string, isBackstage: boolean) => void
    setUpgradeModalFeature: (feature: any) => void
    messages: any[]
    typingUsers: string[]
    sendMessage: any
    emitTyping: () => void
    emitStopTyping: () => void
    connected: boolean
    joined: boolean
    toggleChatReaction: any
    isAdminOrOwner: boolean
    setMeetingInfo: (info: any) => void
    screenSharePolicy: 'everyone' | 'host_only'
    handleToggleScreenSharePolicy: (newPolicy: 'everyone' | 'host_only') => Promise<void>
    meetingInput: string
}

export const MeetingStageSection: React.FC<MeetingStageSectionProps> = (props) => {
    const {
        participants,
        spotlightUserId,
        setSpotlightUserId,
        coHostIds,
        setCoHostIds,
        renamedUsers,
        setRenamedUsers,
        addToast,
        meetingInfo,
        isLocalHost,
        isLocked,
        handleToggleLock,
        handleMuteAll,
        isWatermarkEnabled,
        handleToggleWatermark,
        exportAttendanceCSV,
        setShowAttendanceModal,
        recordingAllowedUserIds,
        whiteboardAllowedUserIds,
        handleTogglePermission,
        handlePromoteCoHost,
        waitingGuests,
        handleApproveGuest,
        handleDenyGuest,
        handleApproveAllGuests,
        isWaitingRoomActive,
        handleToggleWaitingRoom,
        backstageUserIds,
        canUseBackstage,
        handleStageStatusChange,
        setUpgradeModalFeature,
        messages,
        typingUsers,
        sendMessage,
        emitTyping,
        emitStopTyping,
        connected,
        joined,
        toggleChatReaction,
        myDisplayName,
        localStream,
        isAdminOrOwner,
        setMeetingInfo,
        screenSharePolicy,
        handleToggleScreenSharePolicy,
        canManageParticipants,
        meetingInput,
        ...stageProps
    } = props

    return (
        <MeetingStageArea
            {...stageProps}
            token={stageProps.token || ''}
            meetingInfo={meetingInfo}
            isLocalHost={isLocalHost}
            isWatermarkEnabled={isWatermarkEnabled}
            backstageUserIds={backstageUserIds}
            myDisplayName={myDisplayName}
            localStream={localStream}
            canManageParticipants={canManageParticipants}
            sidePanelsProps={{
                participants,
                spotlightUserId,
                setSpotlightUserId,
                coHostIds,
                setCoHostIds,
                renamedUsers,
                setRenamedUsers,
                addToast,
                meetingInfo,
                isLocalHost,
                isLocked,
                handleToggleLock,
                handleMuteAll,
                isWatermarkEnabled,
                handleToggleWatermark,
                exportAttendanceCSV,
                setShowAttendanceModal,
                recordingAllowedUserIds,
                whiteboardAllowedUserIds,
                handleTogglePermission,
                handlePromoteCoHost,
                waitingGuests,
                handleApproveGuest,
                handleDenyGuest,
                handleApproveAllGuests,
                isWaitingRoomActive,
                handleToggleWaitingRoom,
                backstageUserIds,
                canUseBackstage,
                handleStageStatusChange,
                setUpgradeModalFeature,
                messages,
                typingUsers,
                sendMessage,
                emitTyping,
                emitStopTyping,
                connected,
                joined,
                toggleChatReaction,
                myDisplayName,
                localStream,
                isAdminOrOwner,
                setMeetingInfo,
                screenSharePolicy,
                handleToggleScreenSharePolicy,
                canManageParticipants,
                meetingInput
            }}
        />
    )
}
