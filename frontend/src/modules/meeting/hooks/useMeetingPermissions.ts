import { useMemo, useEffect } from 'react'

interface UseMeetingPermissionsProps {
    meetingId: string
    meetingInput: string
    meetingInfo: any
    localUserId: string
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
    whiteboardAllowedUserIds: string[]
    showWhiteboard: boolean
    backstageUserIds: string[]
    currentPlanTier: string
    canManageRef: React.MutableRefObject<boolean>
}

export const useMeetingPermissions = ({
    meetingId,
    meetingInput,
    meetingInfo,
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
    whiteboardAllowedUserIds,
    showWhiteboard,
    backstageUserIds,
    currentPlanTier,
    canManageRef
}: UseMeetingPermissionsProps) => {
    const activeRoomKey = meetingId || meetingInput.trim()

    const isRoomCreator = useMemo(() => {
        try {
            return sessionStorage.getItem(`jts_created_meeting_${activeRoomKey}`) === 'true'
        } catch {
            return false
        }
    }, [activeRoomKey])

    const isLocalHost = useMemo(() => {
        if (meetingInfo && meetingInfo.host) {
            return (meetingInfo.host._id === localUserId || meetingInfo.host === localUserId)
        }
        // Fallback for ad-hoc generated rooms (e.g. room-xxxx):
        // If room was created in this session, or if user is authenticated and not a guest
        if (isRoomCreator) return true
        if (!isGuest && !meetingInfo) return true
        return false
    }, [meetingInfo, localUserId, isRoomCreator, isGuest])

    const isCoHost = coHostIds.includes(localUserId)
    const canManageParticipants = isLocalHost || isCoHost || isAdminOrOwner
    canManageRef.current = canManageParticipants
    const isWebinarAttendee = Boolean(isWebinarMode && !canManageParticipants && !isLocalHost && !isPromotedToSpeaker)

    // Automatically force-mute microphone and camera for audience attendees when Webinar Stage Mode is active
    useEffect(() => {
        if (isWebinarAttendee) {
            if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                    track.enabled = false
                })
                localStream.getVideoTracks().forEach(track => {
                    track.enabled = false
                })
            }
            setIsMuted(true)
            setIsVideoOff(true)
            socket?.emit('meeting:mic-toggle', { meetingId: meetingId || meetingInput.trim(), isMuted: true })
            socket?.emit('meeting:video-toggle', { meetingId: meetingId || meetingInput.trim(), isVideoOff: true })
        }
    }, [isWebinarAttendee, localStream, socket, meetingId, meetingInput, setIsMuted, setIsVideoOff])

    const canRecord = canManageParticipants || recordingAllowedUserIds.includes(localUserId)
    const canUseWhiteboard = canManageParticipants || showWhiteboard || whiteboardAllowedUserIds.includes(localUserId)

    // Virtual Green Room derived state
    const isCurrentUserBackstage = backstageUserIds.includes(localUserId || '')
    const canUseBackstage = currentPlanTier === 'enterprise'

    return {
        activeRoomKey,
        isRoomCreator,
        isLocalHost,
        isCoHost,
        canManageParticipants,
        isWebinarAttendee,
        canRecord,
        canUseWhiteboard,
        isCurrentUserBackstage,
        canUseBackstage
    }
}
