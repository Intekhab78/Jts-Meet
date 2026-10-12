import React from 'react'
import { WebinarAttendeeView } from './WebinarAttendeeView'
import { WebinarAttendeeSidePanel } from './WebinarAttendeeSidePanel'

export interface WebinarAttendeeExperienceProps {
    isWebinarAttendee: boolean
    meetingId: string
    meetingInput: string
    meetingInfo: any
    screenSharingUserId: string | null
    localStream: MediaStream | null
    remoteStreams: { [userId: string]: MediaStream }
    activeSpeaker: string | null
    getUserDisplayName: (userId: string) => string
    myDisplayName: string
    socket: any
    localUserId: string | null
    isPromotedToSpeaker: boolean
    leaveMeeting: () => void
    activePanel: string | null
    setActivePanel: React.Dispatch<React.SetStateAction<any>>
    setShowPolls: (show: boolean) => void
    unreadChatCount: number
    setUnreadChatCount: (count: number) => void
    participants: string[]
    messages: any[]
    typingUsers: any[]
    sendMessage: any
    emitTyping: () => void
    emitStopTyping: () => void
    connected: boolean
    joined: boolean
    toggleChatReaction: any
    token?: string | null
    renamedUsers: { [id: string]: string }
    canManageParticipants: boolean
    isLocalHost: boolean
}

export const WebinarAttendeeExperience: React.FC<WebinarAttendeeExperienceProps> = ({
    isWebinarAttendee,
    meetingId,
    meetingInput,
    meetingInfo,
    screenSharingUserId,
    localStream,
    remoteStreams,
    activeSpeaker,
    getUserDisplayName,
    myDisplayName,
    socket,
    localUserId,
    isPromotedToSpeaker,
    leaveMeeting,
    activePanel,
    setActivePanel,
    setShowPolls,
    unreadChatCount,
    setUnreadChatCount,
    participants,
    messages,
    typingUsers,
    sendMessage,
    emitTyping,
    emitStopTyping,
    connected,
    joined,
    toggleChatReaction,
    token,
    renamedUsers,
    canManageParticipants,
    isLocalHost
}) => {
    if (!isWebinarAttendee) return null

    const stageStream = screenSharingUserId
        ? (screenSharingUserId === 'me' ? localStream : remoteStreams[screenSharingUserId])
        : (activeSpeaker ? remoteStreams[activeSpeaker] : Object.values(remoteStreams)[0] || localStream)

    const stageSpeakerName = screenSharingUserId
        ? getUserDisplayName(screenSharingUserId)
        : (activeSpeaker ? getUserDisplayName(activeSpeaker) : myDisplayName)

    return (
        <>
            {/* Webinar View-Only Mode for Attendees */}
            <WebinarAttendeeView
                meetingId={meetingId || meetingInput.trim()}
                meetingTitle={meetingInfo?.title}
                stageStream={stageStream}
                stageSpeakerName={stageSpeakerName}
                isScreenShare={Boolean(screenSharingUserId)}
                socket={socket}
                myUserId={localUserId || 'me'}
                myDisplayName={myDisplayName}
                isPromotedToSpeaker={isPromotedToSpeaker}
                onLeave={() => leaveMeeting()}
                onOpenQA={() => setActivePanel((prev: any) => (prev === 'qa' ? null : 'qa'))}
                onOpenPolls={() => setShowPolls(true)}
                onOpenChat={() => {
                    if (activePanel === 'chat') {
                        setActivePanel(null)
                    } else {
                        setActivePanel('chat')
                        setUnreadChatCount(0)
                    }
                }}
                unreadChatCount={unreadChatCount}
                attendeeCount={participants.length + 1}
            />

            {/* Slide-over panel for Webinar Attendee (Chat & Q&A) */}
            <WebinarAttendeeSidePanel
                isWebinarAttendee={isWebinarAttendee}
                activePanel={activePanel}
                onClose={() => setActivePanel(null)}
                messages={messages}
                typingUsers={typingUsers}
                sendMessage={sendMessage}
                emitTyping={emitTyping}
                emitStopTyping={emitStopTyping}
                connected={connected}
                joined={joined}
                toggleChatReaction={toggleChatReaction}
                token={token || null}
                renamedUsers={renamedUsers}
                participants={participants}
                meetingId={meetingId}
                meetingInput={meetingInput}
                socket={socket}
                canManageParticipants={canManageParticipants}
                isLocalHost={isLocalHost}
                localUserId={localUserId || ''}
                myDisplayName={myDisplayName}
            />
        </>
    )
}
