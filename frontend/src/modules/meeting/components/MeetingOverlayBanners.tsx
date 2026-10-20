import React from 'react'
import { TalkingWhileMutedAlert } from './TalkingWhileMutedAlert'
import { WebinarStageActiveBanner } from './WebinarStageActiveBanner'
import { PersistentAudioBridge } from './PersistentAudioBridge'
import { MeetingCaptionsBanner } from './MeetingCaptionsBanner'
import { ActivePollNotificationBanner } from './ActivePollNotificationBanner'
import type { Poll } from '../hooks/useMeetingPolls'

export interface MeetingOverlayBannersProps {
    showTalkingWhileMuted: boolean
    isMuted: boolean
    showCaptions: boolean
    setShowCaptions?: (enabled: boolean) => void
    displayName?: string
    toggleMute: () => void

    activeNotificationPoll?: Poll | null
    onVotePoll?: () => void
    onDismissPollNotification?: () => void

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
    isVoiceDubbingEnabled?: boolean
    onTranscriptUpdate?: (transcript: any[]) => void
}

export const MeetingOverlayBanners: React.FC<MeetingOverlayBannersProps> = ({
    showTalkingWhileMuted,
    isMuted,
    showCaptions,
    setShowCaptions,
    displayName,
    toggleMute,
    activeNotificationPoll,
    onVotePoll,
    onDismissPollNotification,
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
    isLocalHost,
    isVoiceDubbingEnabled,
    onTranscriptUpdate
}) => {
    return (
        <>
            {/* Interactive Floating Poll Notification Banner */}
            {activeNotificationPoll && (
                <ActivePollNotificationBanner
                    isOpen={!!activeNotificationPoll}
                    question={activeNotificationPoll.question}
                    optionsCount={activeNotificationPoll.options?.length || 0}
                    onVote={() => {
                        onVotePoll?.()
                    }}
                    onDismiss={() => {
                        onDismissPollNotification?.()
                    }}
                />
            )}

            {/* Google Meet Style "Talking While Muted" Floating Alert */}
            <TalkingWhileMutedAlert
                show={showTalkingWhileMuted}
                isMuted={isMuted}
                showCaptions={showCaptions}
                toggleMute={toggleMute}
            />

            {/* Google Meet Style Live Captions & Real-Time AI Subtitles */}
            <MeetingCaptionsBanner
                isEnabled={showCaptions}
                speakerName={displayName || 'You'}
                meetingId={meetingId || meetingInput || ''}
                socket={socket}
                isLocalMuted={isMuted}
                toggleMute={toggleMute}
                isVoiceDubbingEnabledProp={isVoiceDubbingEnabled}
                onTranscriptUpdate={onTranscriptUpdate}
                onClose={() => setShowCaptions && setShowCaptions(false)}
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

