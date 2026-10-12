import React from 'react'
import { EndMeetingHostModal } from './EndMeetingHostModal'
import { VirtualGreenRoomBanners } from './VirtualGreenRoomBanners'

export interface MeetingHostOverlaysProps {
    showEndMeetingModal: boolean
    setShowEndMeetingModal: (show: boolean) => void
    handleExitMeeting: () => void
    meetingId: string
    meetingInput: string
    attendanceRecordsRef: React.RefObject<any> | React.MutableRefObject<any>
    joinTimeMapRef: React.RefObject<any> | React.MutableRefObject<any>
    myDisplayName: string
    timerStr: string
    participants: string[]
    getUserDisplayName: (userId: string) => string
    coHostIds: string[]
    token?: string | null
    initialToken?: string
    addToast: (msg: string, type?: any) => void
    setMeetingInput: (id: string) => void
    socket: any
    exportAttendanceCSV: () => void

    isCurrentUserBackstage: boolean
    isWebinarMode: boolean
    isLocalHost: boolean
    canUseBackstage: boolean
    backstageUserIds: string[]
    activePanel: string | null
    windowWidth: number
    activeRoomKey: string
}

export const MeetingHostOverlays: React.FC<MeetingHostOverlaysProps> = ({
    showEndMeetingModal,
    setShowEndMeetingModal,
    handleExitMeeting,
    meetingId,
    meetingInput,
    attendanceRecordsRef,
    joinTimeMapRef,
    myDisplayName,
    timerStr,
    participants,
    getUserDisplayName,
    coHostIds,
    token,
    initialToken,
    addToast,
    setMeetingInput,
    socket,
    exportAttendanceCSV,
    isCurrentUserBackstage,
    isWebinarMode,
    isLocalHost,
    canUseBackstage,
    backstageUserIds,
    activePanel,
    windowWidth,
    activeRoomKey
}) => {
    return (
        <>
            {/* End Meeting Modal for Host */}
            <EndMeetingHostModal
                isOpen={showEndMeetingModal}
                onClose={() => setShowEndMeetingModal(false)}
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
                token={token ?? null}
                initialToken={initialToken}
                addToast={addToast}
                setMeetingInput={setMeetingInput}
                socket={socket}
                exportAttendanceCSV={exportAttendanceCSV}
            />

            {/* Virtual Green Room: Backstage Banner & Host Controls */}
            <VirtualGreenRoomBanners
                isCurrentUserBackstage={isCurrentUserBackstage}
                isWebinarMode={isWebinarMode}
                isLocalHost={isLocalHost}
                canUseBackstage={canUseBackstage}
                backstageUserIds={backstageUserIds}
                activePanel={activePanel}
                windowWidth={windowWidth}
                socket={socket}
                activeRoomKey={activeRoomKey}
            />
        </>
    )
}
