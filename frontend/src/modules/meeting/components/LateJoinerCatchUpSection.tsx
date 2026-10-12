import React from 'react'
import { LateJoinerCatchUpPrompt } from './LateJoinerCatchUpPrompt'
import { LateJoinerCatchUpModal } from './LateJoinerCatchUpModal'

export interface LateJoinerCatchUpSectionProps {
    showCatchUpPrompt: boolean
    setShowCatchUpPrompt: (show: boolean) => void
    showCatchUpModal: boolean
    setShowCatchUpModal: (show: boolean) => void
    joinedMinutesLate: number
    meetingTitle?: string
    meetingId: string
    meetingInput: string
    token?: string
    initialToken?: string
    transcripts: any[]
    messages: any[]
}

export const LateJoinerCatchUpSection: React.FC<LateJoinerCatchUpSectionProps> = ({
    showCatchUpPrompt,
    setShowCatchUpPrompt,
    showCatchUpModal,
    setShowCatchUpModal,
    joinedMinutesLate,
    meetingTitle,
    meetingId,
    meetingInput,
    token,
    initialToken,
    transcripts,
    messages
}) => {
    return (
        <>
            {/* Late-Joiner AI "Catch Me Up" Floating Prompt */}
            <LateJoinerCatchUpPrompt
                showCatchUpPrompt={showCatchUpPrompt}
                showCatchUpModal={showCatchUpModal}
                joinedMinutesLate={joinedMinutesLate}
                onOpenModal={() => {
                    setShowCatchUpModal(true)
                    setShowCatchUpPrompt(false)
                }}
                onDismiss={() => setShowCatchUpPrompt(false)}
            />

            {/* Late-Joiner AI "Catch Me Up" Modal */}
            {showCatchUpModal && (
                <LateJoinerCatchUpModal
                    meetingTitle={meetingTitle || `Session ${meetingId || meetingInput}`}
                    meetingId={meetingId || meetingInput}
                    token={token || initialToken}
                    joinedMinutesLate={joinedMinutesLate}
                    transcripts={transcripts}
                    chatMessages={messages.map(m => ({ sender: m.senderName || 'Participant', text: m.message }))}
                    onClose={() => setShowCatchUpModal(false)}
                />
            )}
        </>
    )
}
