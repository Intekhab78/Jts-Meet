import React from 'react'
import {
    IconCheck,
    IconMail,
    IconBuilding
} from '../../../components/common/Icons'
import { MeetingWhiteboard } from './MeetingWhiteboard'
import { MeetingPollsModal } from './MeetingPollsModal'
import { DeviceSettingsModal } from './DeviceSettingsModal'
import { MeetingSummaryModal } from './MeetingSummaryModal'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { TalkTimeAnalyticsModal } from './TalkTimeAnalyticsModal'
import { LayoutSwitcherModal } from './LayoutSwitcherModal'
import { VirtualBackgroundModal } from './VirtualBackgroundModal'
import { E2EESecurityModal } from './E2EESecurityModal'
import { e2eeService } from '../services/e2ee.service'
import { DialInModal } from './DialInModal'
import { BreakoutRoomsModal } from './BreakoutRoomsModal'
import { BreakoutActiveBanner } from './BreakoutActiveBanner'
import { NetworkStatusBanners } from './NetworkStatusBanners'
import { ReactionsFloatingLayer } from './ReactionsFloatingLayer'
import { MinutesOfMeetingModal } from './MinutesOfMeetingModal'
import { InviteParticipantsModal } from './InviteParticipantsModal'
import { LiveStreamModal } from './LiveStreamModal'
import { UpgradePlanModal } from './UpgradePlanModal'
import { FreePlanLimitModal } from './FreePlanLimitModal'
import { MeetingAttendanceModal } from './MeetingAttendanceModal'
import { TakeoverPresentationModal } from './TakeoverPresentationModal'
import { ScreenPickerModal } from './ScreenPickerModal'
import { parseJwt } from '../utils/meetingHelpers'

export interface MeetingModalsContainerProps {
    showWhiteboard: boolean
    setShowWhiteboard: (val: boolean) => void
    meetingId: string
    meetingInput: string
    socket: any
    showPolls: boolean
    setShowPolls: (val: boolean) => void
    canManageParticipants: boolean
    isLocalHost: boolean
    showDeviceSettings: boolean
    setShowDeviceSettings: (val: boolean) => void
    localStream: MediaStream | null
    handleVideoSourceChange: (deviceId: string) => Promise<void>
    handleAudioSourceChange: (deviceId: string) => Promise<void>
    isBlurEnabled: boolean
    handleToggleBlur: () => void
    isNoiseSuppressionEnabled: boolean
    handleToggleNoiseSuppression: () => void
    setShowVirtualBgModal: (val: boolean) => void
    videoQuality: any
    handleQualityChange: (quality: any) => void
    isHdBoostEnabled: boolean
    setIsHdBoostEnabled: (val: boolean) => void
    showSummary: boolean
    setShowSummary: (val: boolean) => void
    meetingInfo: any
    transcripts: any[]
    participants: string[]
    messages: any[]
    timerStr: string
    myDisplayName: string
    getUserDisplayName: (userId: string) => string
    showShortcuts: boolean
    setShowShortcuts: (val: boolean) => void
    isConfidentialMode: boolean
    watermarkOffset: { x: number; y: number }
    detectedActionItem: any
    setDetectedActionItem: (val: any) => void
    handleAddDetectedActionItem: () => void
    showAnalyticsModal: boolean
    setShowAnalyticsModal: (val: boolean) => void
    talkTimeMap: Record<string, number>
    isLayoutModalOpen: boolean
    setIsLayoutModalOpen: (val: boolean) => void
    layoutMode: any
    setLayoutMode: (mode: any) => void
    addToast: (msg: string, type?: any) => void
    maxGridTiles: number
    setMaxGridTiles: (val: number) => void
    showVirtualBgModal: boolean
    virtualBgPreset: string
    handleSelectVirtualBackground: (preset: string) => Promise<void>
    handleUploadCustomWallpaper: (file: File) => any
    activeLocalStream: MediaStream | null
    isApplyingVirtualBg: boolean
    showE2EEModal: boolean
    setShowE2EEModal: (val: boolean) => void
    setIsE2EEActive: (val: boolean) => void
    showDialInModal: boolean
    setShowDialInModal: (val: boolean) => void
    isBreakoutModalOpen: boolean
    setIsBreakoutModalOpen: (val: boolean) => void
    activeBreakoutSession: any
    currentBreakoutSubRoomId: string | null
    setCurrentBreakoutSubRoomId: (id: string | null) => void
    token: string | null
    localUserId: string | null
    connectToMeeting: (meetingId: string, displayName: string, isBreakout?: boolean) => void
    isNetworkOffline: boolean
    networkStatus: string
    isReconnecting: boolean
    showRestoredNotice: boolean
    lowBandwidthMode: boolean
    connectToMeetingRef: React.RefObject<any>
    showReactionsPopover: boolean
    setShowReactionsPopover: (val: boolean) => void
    reactionBtnRef: React.RefObject<any>
    reactionsPopoverRef: React.RefObject<any>
    floatingReactions: any[]
    sendReaction: (emoji: string) => void
    handleTriggerSoundboard: (soundId: any) => void
    showMoMModal: boolean
    setShowMoMModal: (val: boolean) => void
    attendanceRecordsRef: React.RefObject<any>
    generateMoMContent: () => string
    toasts: any[]
    waitingGuests: any[]
    handleApproveAllGuests: () => void
    handleApproveGuest: (socketId: string) => void
    handleDenyGuest: (socketId: string) => void
    isInviteOpen: boolean
    setIsInviteOpen: (val: boolean) => void
    isGuest: boolean
    isLiveStreaming: boolean
    remoteLiveStatus: any
    liveStreamConfig: any
    showLiveStreamModal: boolean
    setShowLiveStreamModal: (val: boolean) => void
    handleStartLiveStream: (cfg: any) => void
    handleStopLiveStream: () => void
    upgradeModalFeature: any
    setUpgradeModalFeature: (feat: any) => void
    currentPlanTier: string
    onUpgradePlanRequest?: () => void
    isTimeLimitExpired: boolean
    isMeetingPaid: boolean
    onLeave?: () => void
    showAttendanceModal: boolean
    setShowAttendanceModal: (val: boolean) => void
    meetingSecondsElapsed: number
    attendanceRecords: any
    joinTimeMapRef: React.RefObject<any>
    exportAttendanceCSV: () => void
    showTakeoverModal: boolean
    setShowTakeoverModal: (val: boolean) => void
    takeoverPresenterId: string | null
    setTakeoverPresenterId: (id: string | null) => void
    startScreenShare: () => void
    showScreenPicker: boolean
    handleScreenPickerClosed: () => void
    handleScreenSourceSelected: (source: any, includeAudio?: any) => void
}

export function MeetingModalsContainer({
    showWhiteboard,
    setShowWhiteboard,
    meetingId,
    meetingInput,
    socket,
    showPolls,
    setShowPolls,
    canManageParticipants,
    isLocalHost,
    showDeviceSettings,
    setShowDeviceSettings,
    localStream,
    handleVideoSourceChange,
    handleAudioSourceChange,
    isBlurEnabled,
    handleToggleBlur,
    isNoiseSuppressionEnabled,
    handleToggleNoiseSuppression,
    setShowVirtualBgModal,
    videoQuality,
    handleQualityChange,
    isHdBoostEnabled,
    setIsHdBoostEnabled,
    showSummary,
    setShowSummary,
    meetingInfo,
    transcripts,
    participants,
    messages,
    timerStr,
    myDisplayName,
    getUserDisplayName,
    showShortcuts,
    setShowShortcuts,
    isConfidentialMode,
    watermarkOffset,
    detectedActionItem,
    setDetectedActionItem,
    handleAddDetectedActionItem,
    showAnalyticsModal,
    setShowAnalyticsModal,
    talkTimeMap,
    isLayoutModalOpen,
    setIsLayoutModalOpen,
    layoutMode,
    setLayoutMode,
    addToast,
    maxGridTiles,
    setMaxGridTiles,
    showVirtualBgModal,
    virtualBgPreset,
    handleSelectVirtualBackground,
    handleUploadCustomWallpaper,
    activeLocalStream,
    isApplyingVirtualBg,
    showE2EEModal,
    setShowE2EEModal,
    setIsE2EEActive,
    showDialInModal,
    setShowDialInModal,
    isBreakoutModalOpen,
    setIsBreakoutModalOpen,
    activeBreakoutSession,
    currentBreakoutSubRoomId,
    setCurrentBreakoutSubRoomId,
    token,
    localUserId,
    connectToMeeting,
    isNetworkOffline,
    networkStatus,
    isReconnecting,
    showRestoredNotice,
    lowBandwidthMode,
    connectToMeetingRef,
    showReactionsPopover,
    setShowReactionsPopover,
    reactionBtnRef,
    reactionsPopoverRef,
    floatingReactions,
    sendReaction,
    handleTriggerSoundboard,
    showMoMModal,
    setShowMoMModal,
    attendanceRecordsRef,
    generateMoMContent,
    toasts,
    waitingGuests,
    handleApproveAllGuests,
    handleApproveGuest,
    handleDenyGuest,
    isInviteOpen,
    setIsInviteOpen,
    isGuest,
    isLiveStreaming,
    remoteLiveStatus,
    liveStreamConfig,
    showLiveStreamModal,
    setShowLiveStreamModal,
    handleStartLiveStream,
    handleStopLiveStream,
    upgradeModalFeature,
    setUpgradeModalFeature,
    currentPlanTier,
    onUpgradePlanRequest,
    isTimeLimitExpired,
    isMeetingPaid,
    onLeave,
    showAttendanceModal,
    setShowAttendanceModal,
    meetingSecondsElapsed,
    attendanceRecords,
    joinTimeMapRef,
    exportAttendanceCSV,
    showTakeoverModal,
    setShowTakeoverModal,
    takeoverPresenterId,
    setTakeoverPresenterId,
    startScreenShare,
    showScreenPicker,
    handleScreenPickerClosed,
    handleScreenSourceSelected
}: MeetingModalsContainerProps) {
    return (
        <>
            {/* Collaborative Whiteboard Canvas */}
            <MeetingWhiteboard
                isOpen={showWhiteboard}
                onClose={() => setShowWhiteboard(false)}
                meetingId={meetingId || meetingInput}
                socket={socket}
            />

            {/* In-Call Live Polls Modal */}
            <MeetingPollsModal
                isOpen={showPolls}
                onClose={() => setShowPolls(false)}
                meetingId={meetingId || meetingInput}
                currentUserId="me"
                isHostOrCoHost={canManageParticipants || isLocalHost}
                socket={socket}
            />

            {/* Device & Hardware Settings Modal */}
            <DeviceSettingsModal
                isOpen={showDeviceSettings}
                onClose={() => setShowDeviceSettings(false)}
                localStream={localStream}
                onDeviceChange={async (kind, deviceId) => {
                    if (kind === 'video') {
                        await handleVideoSourceChange(deviceId)
                    } else {
                        await handleAudioSourceChange(deviceId)
                    }
                }}
                isBlurEnabled={isBlurEnabled}
                onToggleBlur={handleToggleBlur}
                isNoiseSuppressionEnabled={isNoiseSuppressionEnabled}
                onToggleNoiseSuppression={handleToggleNoiseSuppression}
                onOpenVirtualBg={() => setShowVirtualBgModal(true)}
                videoQuality={videoQuality}
                onQualityChange={handleQualityChange}
                isHdBoostEnabled={isHdBoostEnabled}
                onToggleHdBoost={setIsHdBoostEnabled}
            />

            {/* AI Smart Summary Modal */}
            <MeetingSummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                meetingTitle={meetingInfo?.title || `Session ${meetingId || meetingInput}`}
                meetingId={meetingId || meetingInput}
                transcripts={transcripts}
                participantsCount={participants.length + 1}
                chatMessages={messages}
                duration={timerStr}
                participantsList={[
                    `${myDisplayName} (You)`,
                    ...participants.map(p => getUserDisplayName(p))
                ]}
            />

            {/* Keyboard Shortcuts Cheatsheet */}
            <KeyboardShortcutsModal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />

            {/* Next-Gen Feature 5: Dynamic Anti-Leak Floating Watermark (Confidential Mode) */}
            {isConfidentialMode && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9000,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    opacity: 0.18,
                    overflow: 'hidden',
                    userSelect: 'none'
                }}>
                    {[0, 1, 2, 3].map((row) => (
                        <div
                            key={row}
                            style={{
                                display: 'flex',
                                gap: 60,
                                whiteSpace: 'nowrap',
                                transform: `rotate(-15deg) translate(${watermarkOffset.x}px, ${watermarkOffset.y}px)`,
                                transition: 'transform 2s ease'
                            }}
                        >
                            {[0, 1, 2].map((col) => (
                                <span key={col} style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.08em' }}>
                                    🛡️ {myDisplayName || 'Attendee'} • CONFIDENTIAL • {meetingId || 'JTS-MEET'}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Next-Gen Feature 3: In-Meeting Live Action-Item Detector Toast */}
            {detectedActionItem && (
                <div style={{
                    position: 'fixed',
                    top: 70,
                    right: 24,
                    zIndex: 9999,
                    background: 'rgba(15, 17, 26, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(245, 158, 11, 0.25)',
                    borderRadius: 14,
                    padding: '10px 14px',
                    maxWidth: 380,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    animation: 'fadeInDown 0.25s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.9rem' }}>⚡</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Action Item Detected
                            </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            by {detectedActionItem.speaker}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 500, lineHeight: 1.4 }}>
                        "{detectedActionItem.text}"
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                        <button
                            onClick={() => setDetectedActionItem(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                padding: '3px 8px'
                            }}
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={handleAddDetectedActionItem}
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                border: 'none',
                                color: '#000',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                borderRadius: 6,
                                padding: '4px 12px',
                                cursor: 'pointer'
                            }}
                        >
                            + Add to Notes
                        </button>
                    </div>
                </div>
            )}

            {/* Next-Gen Feature 4: Meeting Talk-Time & Engagement Analytics Modal */}
            <TalkTimeAnalyticsModal
                isOpen={showAnalyticsModal}
                onClose={() => setShowAnalyticsModal(false)}
                talkTimeMap={talkTimeMap}
                myDisplayName={myDisplayName}
                getUserDisplayName={getUserDisplayName}
            />

            {/* Google Meet Layout Switcher Modal */}
            <LayoutSwitcherModal
                isOpen={isLayoutModalOpen}
                onClose={() => setIsLayoutModalOpen(false)}
                currentLayout={layoutMode}
                onSelectLayout={(mode) => {
                    setLayoutMode(mode)
                    addToast(`Layout switched to ${mode.toUpperCase()}`, 'info')
                }}
                maxTiles={maxGridTiles}
                onMaxTilesChange={(tiles) => setMaxGridTiles(tiles)}
            />

            {/* Visual Effects & Virtual Backgrounds Modal */}
            <VirtualBackgroundModal
                isOpen={showVirtualBgModal}
                onClose={() => setShowVirtualBgModal(false)}
                activePreset={virtualBgPreset}
                onSelectPreset={handleSelectVirtualBackground}
                onUploadCustom={handleUploadCustomWallpaper}
                localStream={activeLocalStream || localStream}
                isApplying={isApplyingVirtualBg}
            />

            {/* End-to-End Encryption Security Modal */}
            <E2EESecurityModal
                isOpen={showE2EEModal}
                onClose={() => {
                    setShowE2EEModal(false)
                    setIsE2EEActive(e2eeService.isEnabled())
                }}
                meetingId={meetingId || meetingInput.trim()}
            />

            {/* PSTN / Phone Dial-In Modal */}
            <DialInModal
                isOpen={showDialInModal}
                onClose={() => setShowDialInModal(false)}
                meetingId={meetingId || meetingInput.trim()}
                meetingTitle={meetingInfo?.title}
            />

            {/* Breakout Rooms Management Modal */}
            <BreakoutRoomsModal
                isOpen={isBreakoutModalOpen}
                onClose={() => setIsBreakoutModalOpen(false)}
                meetingId={meetingId || meetingInput.trim()}
                socket={socket}
                participants={[
                    { id: 'me', name: `${myDisplayName} (You)` },
                    ...participants.map(p => ({
                        id: p,
                        name: getUserDisplayName(p)
                    }))
                ]}
                isHost={canManageParticipants || isLocalHost}
                activeBreakoutSession={activeBreakoutSession}
            />

            {/* Active Breakout Session Floating Banner */}
            <BreakoutActiveBanner
                activeBreakoutSession={activeBreakoutSession}
                currentBreakoutSubRoomId={currentBreakoutSubRoomId}
                canManage={canManageParticipants || isLocalHost}
                myUserId={token ? (parseJwt(token)?.userId || 'me') : 'me'}
                socketId={socket?.id}
                localUserId={localUserId || undefined}
                onReturnToMain={() => {
                    const activeMain = meetingId || meetingInput.trim()
                    setCurrentBreakoutSubRoomId(null)
                    addToast('Returning to main room...', 'info')
                    connectToMeeting(activeMain, myDisplayName, false)
                }}
                onJoinAssignedRoom={(assignedRoom) => {
                    const activeMain = meetingId || meetingInput.trim()
                    setCurrentBreakoutSubRoomId(assignedRoom.id)
                    addToast(`Joining ${assignedRoom.name}...`, 'info')
                    const subRoomId = `${activeMain}__sub_${assignedRoom.id}`
                    connectToMeeting(subRoomId, myDisplayName, true)
                }}
                onManageBreakout={() => setIsBreakoutModalOpen(true)}
            />

            {/* Network Offline / Reconnection Banner & Data Saver HUD */}
            <NetworkStatusBanners
                isNetworkOffline={isNetworkOffline}
                networkStatus={networkStatus}
                isReconnecting={isReconnecting}
                showRestoredNotice={showRestoredNotice}
                lowBandwidthMode={lowBandwidthMode}
                onRetryConnection={() => {
                    if (socket) {
                        socket.connect()
                        const currentId = meetingId || meetingInput.trim()
                        if (currentId) {
                            connectToMeetingRef.current(currentId, myDisplayName)
                        }
                    }
                }}
            />

            {/* Real-time Emoji Reactions Popover & Physics Animation Stream */}
            <ReactionsFloatingLayer
                showPopover={showReactionsPopover}
                reactionBtnRef={reactionBtnRef}
                popoverRef={reactionsPopoverRef}
                floatingReactions={floatingReactions}
                onSendReaction={sendReaction}
                onTriggerSoundboard={handleTriggerSoundboard}
                onClosePopover={() => setShowReactionsPopover(false)}
            />

            {/* AI Action Items & Minutes of Meeting (MoM) Modal */}
            <MinutesOfMeetingModal
                isOpen={showMoMModal}
                onClose={() => setShowMoMModal(false)}
                timerStr={timerStr}
                attendeeCount={Object.keys(attendanceRecordsRef.current).length || participants.length + 1}
                messageCount={messages.length}
                actionItemCount={3}
                content={generateMoMContent()}
                meetingId={meetingInfo?.customId || meetingInfo?.id || meetingId || 'session'}
                addToast={addToast}
            />

            {/* Toasts Notification Container */}
            <div style={{
                position: 'fixed', top: 24, right: 24, zIndex: 12000,
                display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none'
            }}>
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="anim-slide-up"
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(15, 17, 23, 0.96)',
                            border: `1px solid ${t.type === 'success' ? 'rgba(34, 197, 94, 0.25)' :
                                t.type === 'warning' ? 'rgba(245, 158, 11, 0.25)' :
                                    'var(--color-border-strong)'
                                }`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '12px 18px',
                            minWidth: 280,
                            maxWidth: 360,
                            color: '#fff',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            boxShadow: 'var(--shadow-xl)',
                            backdropFilter: 'blur(16px)',
                            willChange: 'transform, opacity'
                        }}
                    >
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: t.type === 'success' ? 'var(--color-success-light)' :
                                t.type === 'warning' ? 'var(--color-warning-light)' :
                                    'rgba(255,255,255,0.06)',
                            color: t.type === 'success' ? 'var(--color-success)' :
                                t.type === 'warning' ? 'var(--color-warning)' :
                                    'var(--color-accent)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }}>
                            {t.type === 'success' ? <IconCheck size={12} strokeWidth={2.5} /> : t.type === 'warning' ? '!' : 'i'}
                        </span>
                        <div style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</div>
                    </div>
                ))}
            </div>

            {/* Guest Admission Popup Notifications */}
            {canManageParticipants && waitingGuests.length > 0 && (
                <div style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380, width: '100%', pointerEvents: 'auto' }}>
                    {waitingGuests.length > 1 && (
                        <div className="glass-card anim-slide-up" style={{ padding: '12px 18px', border: '1px solid rgba(99, 102, 241, 0.4)', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(20, 22, 34, 0.98)', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                    {waitingGuests.length} people waiting to join
                                </span>
                            </div>
                            <button
                                onClick={handleApproveAllGuests}
                                className="btn btn-primary"
                                style={{ padding: '6px 14px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Admit All
                            </button>
                        </div>
                    )}
                    {waitingGuests.map((guest) => (
                        <div key={guest.socketId} className="glass-card anim-slide-up" style={{ padding: '18px 22px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(15, 17, 23, 0.98)', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Waiting Room Request
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', display: 'block' }}>
                                    {guest.guestName}
                                </span>
                                {guest.email && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                        <IconMail size={12} color="var(--color-text-secondary)" /> {guest.email}
                                    </span>
                                )}
                                {guest.company && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                        <IconBuilding size={12} color="var(--color-text-muted)" /> {guest.company}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                    onClick={() => handleDenyGuest(guest.socketId)}
                                    className="btn"
                                    style={{ padding: '6px 14px', fontSize: '0.8125rem', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={() => handleApproveGuest(guest.socketId)}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 18px', fontSize: '0.8125rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                >
                                    Admit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Invite Participants Modal */}
            <InviteParticipantsModal
                isOpen={isInviteOpen && !isGuest}
                onClose={() => setIsInviteOpen(false)}
                meetingId={meetingId || meetingInput}
                token={token || ''}
                addToast={addToast}
            />

            {(isLiveStreaming || remoteLiveStatus?.isStreaming) && (
                <div 
                    onClick={() => setShowLiveStreamModal(true)}
                    title="Click to manage live stream"
                    style={{
                        position: 'fixed',
                        top: 68,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 999,
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#fff',
                        padding: '6px 18px',
                        borderRadius: 24,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        boxShadow: '0 4px 18px rgba(239, 68, 68, 0.45)',
                        animation: 'pulse 2s infinite',
                        userSelect: 'none',
                        transition: 'transform 0.2s ease'
                    }}
                >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                    <span>ON AIR: LIVE STREAMING ON {(liveStreamConfig?.platform || remoteLiveStatus?.platform || 'RTMP').toUpperCase()}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: 4 }}>• Manage ⚙️</span>
                </div>
            )}

            {/* RTMP Live Streaming Studio Modal */}
            <LiveStreamModal
                isOpen={showLiveStreamModal}
                onClose={() => setShowLiveStreamModal(false)}
                isLive={isLiveStreaming}
                liveConfig={liveStreamConfig}
                onStartStream={(cfg) => {
                    handleStartLiveStream(cfg)
                    setShowLiveStreamModal(false)
                }}
                onStopStream={() => {
                    handleStopLiveStream()
                    setShowLiveStreamModal(false)
                }}
                meetingTitle={meetingInfo?.title || meetingId || 'Enterprise Conference Session'}
            />

            {/* Feature Plan Upgrade Restriction Modal */}
            <UpgradePlanModal
                feature={upgradeModalFeature}
                currentPlanTier={currentPlanTier}
                onClose={() => setUpgradeModalFeature(null)}
                onUpgrade={() => {
                    setUpgradeModalFeature(null)
                    if (onUpgradePlanRequest) {
                        onUpgradePlanRequest()
                    } else {
                        window.location.hash = '#organization'
                    }
                }}
            />

            {/* Free Plan 45-Minute Time Limit Reached Modal - ONLY shown for Host on Free Plan */}
            <FreePlanLimitModal
                isOpen={Boolean(isTimeLimitExpired && !isMeetingPaid && !isGuest)}
                onUpgrade={() => {
                    if (onUpgradePlanRequest) {
                        onUpgradePlanRequest()
                    } else {
                        window.location.hash = '#organization'
                    }
                }}
                onExit={() => {
                    if (onLeave) onLeave()
                    else window.location.href = '/'
                }}
            />

            {/* Meeting Attendance & Participation Audit Modal */}
            <MeetingAttendanceModal
                isOpen={showAttendanceModal}
                onClose={() => setShowAttendanceModal(false)}
                meetingId={meetingId || meetingInput}
                meetingTitle={meetingInfo?.title || 'Meeting Session'}
                totalDurationSeconds={meetingSecondsElapsed}
                totalDurationFormatted={timerStr}
                attendanceRecords={attendanceRecords}
                joinTimeMap={joinTimeMapRef.current}
                onExportCSV={exportAttendanceCSV}
            />

            {/* Takeover Presentation Confirmation Dialog (Google Meet Style) */}
            <TakeoverPresentationModal
                isOpen={showTakeoverModal}
                presenterName={takeoverPresenterId ? getUserDisplayName(takeoverPresenterId) : 'Another participant'}
                onClose={() => {
                    setShowTakeoverModal(false)
                    setTakeoverPresenterId(null)
                }}
                onTakeover={() => {
                    setShowTakeoverModal(false)
                    setTakeoverPresenterId(null)
                    startScreenShare()
                }}
            />

            {/* Electron Screen & Application Window Source Picker Modal */}
            <ScreenPickerModal
                isOpen={showScreenPicker}
                onClose={handleScreenPickerClosed}
                onSelectSource={handleScreenSourceSelected}
            />
        </>
    )
}
