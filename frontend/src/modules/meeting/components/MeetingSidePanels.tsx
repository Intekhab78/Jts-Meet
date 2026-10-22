import React from 'react'
import { ParticipantsPanel } from './ParticipantsPanel'
import { MeetingChatPanel } from './MeetingChatPanel'
import { FilesPanel } from './FilesPanel'
import { MeetingNotesPanel } from './MeetingNotesPanel'
import { MeetingQAPanel } from './MeetingQAPanel'
import { SettingsPanel } from './SettingsPanel'
import { IconX, IconRocket } from '../../../components/common/Icons'
import { parseJwt } from '../utils/meetingHelpers'
import { API_BASE } from '../../../config'

export type ActiveMeetingPanel = 'participants' | 'chat' | 'files' | 'settings' | 'notes' | 'qa' | null

export interface MeetingSidePanelsProps {
    activePanel: ActiveMeetingPanel
    setActivePanel: (panel: ActiveMeetingPanel) => void
    token: string
    meetingId: string
    meetingInput: string
    socket: any
    // Participants panel props
    participants: string[]
    spotlightUserId: string | null
    setSpotlightUserId: (id: string | null) => void
    coHostIds: string[]
    setCoHostIds: React.Dispatch<React.SetStateAction<string[]>>
    renamedUsers: Record<string, string>
    setRenamedUsers: React.Dispatch<React.SetStateAction<Record<string, string>>>
    addToast: (msg: string, type?: any) => void
    meetingInfo: any
    isLocalHost: boolean
    isLocked: boolean
    handleToggleLock: () => void
    handleMuteUser?: (userId: string) => void
    handleUnmuteUser?: (userId: string) => void
    handleMuteAll: () => void
    handleUnmuteAll?: () => void
    remoteMuteStates?: Record<string, boolean>
    isMuted?: boolean
    isWatermarkEnabled: boolean
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
    backstageUserIds: string[]
    canUseBackstage: boolean
    handleStageStatusChange: (userId: string, isBackstage: boolean) => void
    setUpgradeModalFeature: (feature: any) => void
    // Chat panel props
    messages: any[]
    typingUsers: string[]
    sendMessage: (text: string, fileData?: any) => void
    emitTyping: () => void
    emitStopTyping: () => void
    connected: boolean
    joined: boolean
    toggleChatReaction: (messageId: string, emoji: string, userId: string) => void
    myDisplayName: string
    // Settings panel props
    localStream: MediaStream | null
    isAdminOrOwner: boolean
    setMeetingInfo: (info: any) => void
    screenSharePolicy: any
    handleToggleScreenSharePolicy: (newPolicy?: any) => void
    canManageParticipants: boolean
}

export const MeetingSidePanels: React.FC<MeetingSidePanelsProps> = ({
    activePanel,
    setActivePanel,
    token,
    meetingId,
    meetingInput,
    socket,
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
    handleMuteUser,
    handleUnmuteUser,
    handleMuteAll,
    handleUnmuteAll,
    remoteMuteStates,
    isMuted,
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
    canManageParticipants
}) => {
    if (!activePanel) return null

    const effectiveMeetingId = meetingId || meetingInput.trim()
    const currentUserId = parseJwt(token)?.userId || 'me'

    return (
        <>
            {activePanel === 'participants' && (
                <ParticipantsPanel
                    participants={participants}
                    onClose={() => setActivePanel(null)}
                    spotlightUserId={spotlightUserId}
                    setSpotlightUserId={setSpotlightUserId}
                    coHostIds={coHostIds}
                    setCoHostIds={setCoHostIds}
                    renamedUsers={renamedUsers}
                    setRenamedUsers={setRenamedUsers}
                    addToast={addToast}
                    hostId={meetingInfo && meetingInfo.host ? (typeof meetingInfo.host === 'object' ? meetingInfo.host._id : meetingInfo.host) : null}
                    isLocalHost={isLocalHost}
                    isLocked={isLocked}
                    onToggleLock={handleToggleLock}
                    onMuteAll={handleMuteAll}
                    onUnmuteAll={handleUnmuteAll}
                    onMuteUser={handleMuteUser}
                    onUnmuteUser={handleUnmuteUser}
                    remoteMuteStates={remoteMuteStates}
                    isLocalMuted={isMuted}
                    canManageParticipants={canManageParticipants}
                    isWatermarkEnabled={isWatermarkEnabled}
                    onToggleWatermark={handleToggleWatermark}
                    onExportAttendance={exportAttendanceCSV}
                    onOpenAttendance={() => setShowAttendanceModal(true)}
                    recordingAllowedUserIds={recordingAllowedUserIds}
                    whiteboardAllowedUserIds={whiteboardAllowedUserIds}
                    onTogglePermission={handleTogglePermission}
                    onPromoteCoHost={handlePromoteCoHost}
                    waitingGuests={waitingGuests}
                    onApproveGuest={handleApproveGuest}
                    onDenyGuest={handleDenyGuest}
                    onApproveAllGuests={handleApproveAllGuests}
                    isWaitingRoomActive={isWaitingRoomActive}
                    onToggleWaitingRoom={handleToggleWaitingRoom}
                    backstageUserIds={backstageUserIds}
                    canUseBackstage={canUseBackstage}
                    onStageStatusChange={handleStageStatusChange}
                    onUpgradeRequired={(feature) => setUpgradeModalFeature({
                        title: feature,
                        requiredPlan: 'Enterprise Tier',
                        icon: <IconRocket size={20} color="#34d399" />,
                        description: 'Virtual Green Room (Backstage) allows hosts to prep speakers privately before bringing them live to the audience.'
                    })}
                />
            )}

            {activePanel === 'chat' && (
                <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0 }}>
                    <div className="side-panel-header" style={{ flexShrink: 0 }}>
                        <span className="side-panel-title">Meeting Chat</span>
                        <button className="btn-icon" onClick={() => setActivePanel(null)} aria-label="Close chat" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconX />
                        </button>
                    </div>
                    <div className="side-panel-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <MeetingChatPanel
                            messages={messages}
                            typingUsers={typingUsers}
                            onSendMessage={sendMessage}
                            onTyping={emitTyping}
                            onStopTyping={emitStopTyping}
                            disabled={!connected || !joined}
                            onToggleChatReaction={toggleChatReaction}
                            currentUserId={currentUserId}
                            renamedUsers={renamedUsers}
                            participants={participants}
                            meetingId={effectiveMeetingId}
                            token={token}
                        />
                    </div>
                </div>
            )}

            {activePanel === 'files' && (
                <FilesPanel
                    token={token}
                    meetingId={effectiveMeetingId}
                    socket={socket}
                    myDisplayName={renamedUsers['me'] || myDisplayName || (parseJwt(token)?.fullName || 'You')}
                    onClose={() => setActivePanel(null)}
                />
            )}

            {activePanel === 'notes' && (
                <MeetingNotesPanel
                    meetingId={effectiveMeetingId}
                    socket={socket}
                    onClose={() => setActivePanel(null)}
                    authorName={renamedUsers['me'] || myDisplayName || (parseJwt(token)?.fullName || 'You')}
                />
            )}

            {activePanel === 'qa' && (
                <div className="side-panel" style={{ width: 400, maxWidth: '100%', padding: 0, overflow: 'hidden', height: '100%' }}>
                    <MeetingQAPanel
                        meetingId={effectiveMeetingId}
                        socket={socket}
                        currentUserId={currentUserId}
                        currentUserName={myDisplayName}
                        isHost={canManageParticipants || isLocalHost}
                        onClose={() => setActivePanel(null)}
                    />
                </div>
            )}

            {activePanel === 'settings' && (
                <SettingsPanel
                    localStream={localStream}
                    onClose={() => setActivePanel(null)}
                    addToast={addToast}
                    isHost={isLocalHost || isAdminOrOwner}
                    isGuestJoinEnabled={meetingInfo?.isGuestJoinEnabled !== false}
                    onToggleGuestJoin={async (enabled) => {
                        try {
                            const response = await fetch(`${API_BASE}/api/meeting/guest-join/toggle`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    meetingId: effectiveMeetingId,
                                    enabled
                                })
                            })
                            const data = await response.json()
                            if (response.ok && data?.success) {
                                setMeetingInfo(data.data)
                                addToast(`Guest Join ${enabled ? 'enabled' : 'disabled'}`, 'success')
                            } else {
                                addToast(data.message || 'Failed to update setting', 'warning')
                            }
                        } catch (e) {
                            addToast('Network error updating setting', 'warning')
                        }
                    }}
                    isWaitingRoomEnabled={!!meetingInfo?.isWaitingRoomEnabled}
                    onToggleWaitingRoom={async (enabled) => {
                        try {
                            const response = await fetch(`${API_BASE}/api/meeting/waiting-room/toggle`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    meetingId: effectiveMeetingId,
                                    enabled
                                })
                            })
                            const data = await response.json()
                            if (response.ok && data?.success) {
                                setMeetingInfo(data.data)
                                addToast(`Waiting Room ${enabled ? 'enabled' : 'disabled'}`, 'success')
                            } else {
                                addToast(data.message || 'Failed to update setting', 'warning')
                            }
                        } catch (e) {
                            addToast('Network error updating setting', 'warning')
                        }
                    }}
                    screenSharePolicy={screenSharePolicy}
                    onToggleScreenSharePolicy={handleToggleScreenSharePolicy}
                />
            )}
        </>
    )
}
