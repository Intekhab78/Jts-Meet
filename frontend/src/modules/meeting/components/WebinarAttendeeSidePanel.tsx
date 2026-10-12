import React from 'react'
import { IconX } from '../../../components/common/Icons'
import { MeetingChatPanel } from './MeetingChatPanel'
import { MeetingQAPanel } from './MeetingQAPanel'
import { parseJwt } from '../utils/meetingHelpers'

interface WebinarAttendeeSidePanelProps {
    isWebinarAttendee: boolean
    activePanel: string | null
    onClose: () => void
    messages: any[]
    typingUsers: string[]
    sendMessage: any
    emitTyping: any
    emitStopTyping: any
    connected: boolean
    joined: boolean
    toggleChatReaction: any
    token: string | null
    renamedUsers: Record<string, string>
    participants: string[]
    meetingId: string
    meetingInput: string
    socket: any
    canManageParticipants: boolean
    isLocalHost: boolean
    localUserId: string
    myDisplayName: string
}

export const WebinarAttendeeSidePanel: React.FC<WebinarAttendeeSidePanelProps> = ({
    isWebinarAttendee,
    activePanel,
    onClose,
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
    participants,
    meetingId,
    meetingInput,
    socket,
    canManageParticipants,
    isLocalHost,
    localUserId,
    myDisplayName
}) => {
    if (!isWebinarAttendee || !activePanel) return null

    return (
        <div style={{
            position: 'fixed',
            top: 60,
            right: 0,
            bottom: 72,
            width: 380,
            maxWidth: '92vw',
            background: 'rgba(10, 14, 26, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '-10px 0 35px rgba(0,0,0,0.6)',
            zIndex: 10002,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.03)'
            }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>
                    {activePanel === 'chat' ? '💬 Webinar Chat' : activePanel === 'qa' ? '❓ Live Q&A' : activePanel}
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <IconX size={14} />
                </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activePanel === 'chat' && (
                    <MeetingChatPanel
                        messages={messages}
                        typingUsers={typingUsers}
                        onSendMessage={sendMessage}
                        onTyping={emitTyping}
                        onStopTyping={emitStopTyping}
                        disabled={!connected || !joined}
                        onToggleChatReaction={toggleChatReaction}
                        currentUserId={parseJwt(token || '')?.userId || 'me'}
                        renamedUsers={renamedUsers}
                        participants={participants}
                        meetingId={meetingId || meetingInput.trim()}
                        token={token || ''}
                    />
                )}
                {activePanel === 'qa' && (
                    <MeetingQAPanel
                        meetingId={meetingId || meetingInput.trim()}
                        socket={socket}
                        isHost={canManageParticipants || isLocalHost}
                        currentUserId={localUserId || 'me'}
                        currentUserName={myDisplayName}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    )
}
