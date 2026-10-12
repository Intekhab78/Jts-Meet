import React from 'react'
import { useMeetingPermissions } from './useMeetingPermissions'
import { useMeetingModeration } from './useMeetingModeration'
import { useMeetingGlobalSocketEvents } from './useMeetingGlobalSocketEvents'

export interface UseMeetingHostAndModerationProps {
    meetingId: string
    meetingInput: string
    setMeetingInput: (id: string) => void
    meetingInfo: any
    setMeetingInfo: (info: any) => void
    localUserId: string | null
    isGuest: boolean
    coHostIds: string[]
    isAdminOrOwner: boolean
    isWebinarMode: boolean
    isPromotedToSpeaker: boolean
    localStream: MediaStream | null
    socket: any
    setIsMuted: (muted: boolean) => void
    setIsVideoOff: (videoOff: boolean) => void
    recordingAllowedUserIds: string[]
    setRecordingAllowedUserIds: React.Dispatch<React.SetStateAction<string[]>>
    whiteboardAllowedUserIds: string[]
    setWhiteboardAllowedUserIds: React.Dispatch<React.SetStateAction<string[]>>
    showWhiteboard: boolean
    backstageUserIds: string[]
    setBackstageUserIds: React.Dispatch<React.SetStateAction<string[]>>
    currentPlanTier: string
    canManageRef: React.MutableRefObject<boolean>
    token?: string
    isLocked: boolean
    setIsLocked: React.Dispatch<React.SetStateAction<boolean>>
    isWatermarkEnabled: boolean
    setIsWatermarkEnabled: React.Dispatch<React.SetStateAction<boolean>>
    setScreenSharePolicy: React.Dispatch<React.SetStateAction<'everyone' | 'host_only'>>
    waitingGuests: any[]
    setWaitingGuests: React.Dispatch<React.SetStateAction<any[]>>
    setIsWaitingRoomActive: React.Dispatch<React.SetStateAction<boolean>>
    handleExitMeeting: () => void
    spawnReaction: (emoji: string, senderName?: string) => void
    addToast: (msg: string, type?: any) => void
}

export function useMeetingHostAndModeration({
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
}: UseMeetingHostAndModerationProps) {
    // Permissions & Role Capabilities
    const {
        isRoomCreator,
        isLocalHost,
        isCoHost,
        canManageParticipants,
        isWebinarAttendee,
        canRecord,
        canUseWhiteboard,
        isCurrentUserBackstage,
        canUseBackstage
    } = useMeetingPermissions({
        meetingId,
        meetingInput,
        meetingInfo,
        localUserId: localUserId || '',
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
        whiteboardAllowedUserIds,
        showWhiteboard,
        backstageUserIds,
        currentPlanTier,
        canManageRef
    })

    // Host Moderation & Guest Waiting Room Controls
    const {
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
    } = useMeetingModeration({
        socket,
        meetingId,
        meetingInput,
        token: token || '',
        isGuest,
        isLocalHost,
        canManageParticipants,
        isLocked,
        setIsLocked,
        isWatermarkEnabled,
        setIsWatermarkEnabled,
        setScreenSharePolicy,
        waitingGuests,
        setWaitingGuests,
        setIsWaitingRoomActive,
        setMeetingInfo,
        setRecordingAllowedUserIds,
        setWhiteboardAllowedUserIds,
        setBackstageUserIds,
        addToast
    })

    // Room-wide socket events
    useMeetingGlobalSocketEvents({
        socket,
        isLocalHost,
        localUserId,
        meetingId,
        localStream,
        setIsMuted,
        setIsLocked,
        setMeetingInput,
        handleExitMeeting,
        isGuest,
        token: token ?? null,
        setIsWatermarkEnabled,
        spawnReaction,
        setBackstageUserIds,
        addToast
    })

    return {
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
    }
}
