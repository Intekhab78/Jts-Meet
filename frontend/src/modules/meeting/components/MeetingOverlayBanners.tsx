import React from 'react'
import { TalkingWhileMutedAlert } from './TalkingWhileMutedAlert'
import { WebinarStageActiveBanner } from './WebinarStageActiveBanner'
import { PersistentAudioBridge } from './PersistentAudioBridge'

export interface MeetingOverlayBannersProps {
    showTalkingWhileMuted: boolean
    isMuted: boolean
    showCaptions: boolean
    toggleMute: () => void

    isWebinarMode: boolean
    isWebinarAttendee: boolean
    participantsCount: number
    socket: any
    meetingId: string
    meetingInput: string
    setIsWebinarMode: (enabled: boolean) => void
    onOpenParticipants: () => void

    remoteStreams: { [id: string]: MediaStream }
    localUserId: string
    backstageUserIds: string[]
    remoteMuteStates: { [userId: string]: boolean }
    canManageParticipants: boolean
    isLocalHost: boolean
}

export const MeetingOverlayBanners: React.FC<MeetingOverlayBannersProps> = ({
    showTalkingWhileMuted,
    isMuted,
    showCaptions,
    toggleMute,
    isWebinarMode,
    isWebinarAttendee,
    participantsCount,
    socket,
    meetingId,
    meetingInput,
    setIsWebinarMode,
    onOpenParticipants,
    remoteStreams,
    localUserId,
    backstageUserIds,
    remoteMuteStates,
    canManageParticipants,
    isLocalHost
}) => {
    return (
        <>
            {/* Google Meet Style "Talking While Muted" Floating Alert */}
            <TalkingWhileMutedAlert
                show={showTalkingWhileMuted}
                isMuted={isMuted}
                showCaptions={showCaptions}
                toggleMute={toggleMute}
            />

            {/* Webinar Stage Active Banner for Host & Speakers */}
            <WebinarStageActiveBanner
                isWebinarMode={isWebinarMode}
                isWebinarAttendee={isWebinarAttendee}
                participantsCount={participantsCount}
                socket={socket}
                meetingId={meetingId}
                meetingInput={meetingInput}
                setIsWebinarMode={setIsWebinarMode}
                onOpenParticipants={onOpenParticipants}
            />

            {/* Global Persistent Remote Audio Bridge */}
            <PersistentAudioBridge
                remoteStreams={remoteStreams}
                localUserId={localUserId || ''}
                backstageUserIds={backstageUserIds}
                remoteMuteStates={remoteMuteStates}
                canManageParticipants={canManageParticipants}
                isLocalHost={isLocalHost}
            />
        </>
    )
}
