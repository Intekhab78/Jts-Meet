import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
    IconMic,
    IconMicOff,
    IconVideo,
    IconVideoOff,
    IconHand,
    IconMessage,
    IconPhoneOff,
    IconCopy,
    IconCheck,
    IconSend
} from '../../../components/common/Icons'
import { PersistentAudioBridge } from './PersistentAudioBridge'
import { getAvatarGradient, getInitials } from '../utils/meetingHelpers'

/* ── Inline Mobile Icons ── */
const IconMoreVertical: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1.5" fill={color} />
        <circle cx="12" cy="5" r="1.5" fill={color} />
        <circle cx="12" cy="19" r="1.5" fill={color} />
    </svg>
)

const IconShare: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
)

const IconClose: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const IconVolume: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
)

const IconVolumeOff: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
)

const IconCameraSwitch: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.008.74 3.843 1.967 5.25L4 17h5v-5l-1.84 1.84C6.34 12.67 6 11.38 6 10c0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.38-.34 2.67-1.16 3.84L15 12v5h5l-1.967-1.75C19.26 13.843 20 12.008 20 10z" />
    </svg>
)

export interface MobileMeetingRoomProps {
    meetingId: string
    meetingInput: string
    myDisplayName: string
    localUserId: string
    isLocalHost: boolean
    isRoomCreator: boolean
    participants: any[]
    remoteStreams: Record<string, MediaStream | null>
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    isMuted: boolean
    isVideoOff: boolean
    toggleMute: () => void
    toggleVideo: () => void
    replaceLocalStream: (stream: MediaStream) => void
    replaceTrackOnPeers: (track: MediaStreamTrack | null, kind?: 'audio' | 'video') => void
    leaveMeeting: () => void
    onLeave?: () => void
    messages: any[]
    sendMessage: (content: string) => void
    activeSpeaker: string | null
    isHandRaised?: boolean
    toggleHandRaise?: () => void
    handsRaisedMap?: Record<string, boolean>
    remoteMuteStates: Record<string, boolean>
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    handleToggleNoiseSuppression?: () => void
    isNoiseSuppressionEnabled?: boolean
    addToast: (msg: string, type?: any) => void
    socket?: any
}

type ActiveSheet = 'none' | 'chat' | 'participants' | 'more'

export const MobileMeetingRoom: React.FC<MobileMeetingRoomProps> = ({
    meetingId,
    meetingInput,
    myDisplayName,
    localUserId,
    isLocalHost,
    participants,
    remoteStreams,
    localStream,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    replaceLocalStream,
    replaceTrackOnPeers,
    leaveMeeting,
    onLeave,
    messages,
    sendMessage,
    activeSpeaker,
    isHandRaised = false,
    toggleHandRaise,
    remoteMuteStates,
    screenSharingUserId,
    handleToggleNoiseSuppression,
    isNoiseSuppressionEnabled = true,
    addToast
}) => {
    const activeMeetingCode = (meetingId || meetingInput || '').trim()

    // Sheets & Modals state
    const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none')
    const [chatInput, setChatInput] = useState('')
    const [isCopied, setIsCopied] = useState(false)
    const [isAudioSpeakerOn, setIsAudioSpeakerOn] = useState(true)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
    const [isFlippingCamera, setIsFlippingCamera] = useState(false)
    const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null)
    const [unreadChatCount, setUnreadChatCount] = useState(0)

    const chatScrollRef = useRef<HTMLDivElement>(null)
    const prevMessagesLen = useRef(messages.length)

    // Track unread messages when chat drawer is closed
    useEffect(() => {
        if (messages.length > prevMessagesLen.current) {
            if (activeSheet !== 'chat') {
                setUnreadChatCount(prev => prev + (messages.length - prevMessagesLen.current))
            }
        }
        prevMessagesLen.current = messages.length
    }, [messages.length, activeSheet])

    useEffect(() => {
        if (activeSheet === 'chat') {
            setUnreadChatCount(0)
            setTimeout(() => {
                chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
            }, 100)
        }
    }, [activeSheet, messages.length])

    // List of active remote peer IDs
    const remotePeerIds = useMemo(() => {
        return Object.keys(remoteStreams).filter(id => id !== localUserId && remoteStreams[id] !== null)
    }, [remoteStreams, localUserId])

    const totalParticipantsCount = remotePeerIds.length + 1

    // Handlers
    const handleCopyCode = async () => {
        const fullUrl = window.location.href
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(fullUrl)
            } else {
                const el = document.createElement('textarea')
                el.value = fullUrl
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
            }
            setIsCopied(true)
            addToast('Meeting link copied to clipboard', 'success')
            setTimeout(() => setIsCopied(false), 2000)
        } catch {
            addToast('Could not copy link', 'warning')
        }
    }

    const handleShareMeeting = async () => {
        const fullUrl = window.location.href
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'JTS Meet',
                    text: `Join my JTS Meet: ${activeMeetingCode}\nLink: ${fullUrl}`,
                    url: fullUrl
                })
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    handleCopyCode()
                }
            }
        } else {
            handleCopyCode()
        }
    }

    const handleFlipCamera = async () => {
        if (isVideoOff || isFlippingCamera) return
        setIsFlippingCamera(true)
        const nextMode = facingMode === 'user' ? 'environment' : 'user'

        try {
            let freshStream: MediaStream | null = null
            try {
                freshStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { exact: nextMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                })
            } catch {
                freshStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: nextMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                })
            }

            if (freshStream) {
                const newTrack = freshStream.getVideoTracks()[0]
                if (newTrack && localStream) {
                    const oldTrack = localStream.getVideoTracks()[0]
                    if (oldTrack) {
                        oldTrack.stop()
                        localStream.removeTrack(oldTrack)
                    }
                    localStream.addTrack(newTrack)
                    replaceTrackOnPeers(newTrack, 'video')
                    replaceLocalStream(new MediaStream(localStream.getTracks()))
                    setFacingMode(nextMode)
                    addToast(`Switched to ${nextMode === 'user' ? 'Front' : 'Back'} Camera`, 'info')
                }
            }
        } catch {
            addToast('Cannot flip camera on this device', 'warning')
        } finally {
            setIsFlippingCamera(false)
        }
    }

    const handleToggleAudioRoute = () => {
        const next = !isAudioSpeakerOn
        setIsAudioSpeakerOn(next)
        document.querySelectorAll('audio').forEach((a: any) => {
            if (a.setSinkId) {
                a.setSinkId(next ? 'speaker' : 'earpiece').catch(() => {})
            }
        })
        addToast(next ? 'Audio routed to Speaker' : 'Audio routed to Earpiece', 'info')
    }

    const handleSendChatMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatInput.trim()) return
        sendMessage(chatInput.trim())
        setChatInput('')
    }

    const handleExitCall = () => {
        if (window.confirm('Leave this meeting?')) {
            leaveMeeting()
            if (onLeave) onLeave()
            else window.location.href = '/'
        }
    }

    // Determine Primary Feature Tile (Speaker / Screen Share / Pinned)
    const primaryPeerId = useMemo(() => {
        if (pinnedPeerId && remoteStreams[pinnedPeerId]) return pinnedPeerId
        if (screenSharingUserId && remoteStreams[screenSharingUserId]) return screenSharingUserId
        if (activeSpeaker && activeSpeaker !== 'me' && remoteStreams[activeSpeaker]) return activeSpeaker
        return remotePeerIds[0] || null
    }, [pinnedPeerId, screenSharingUserId, activeSpeaker, remoteStreams, remotePeerIds])

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            background: '#0F1012',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            userSelect: 'none'
        }}>
            {/* Global Persistent Audio Engine */}
            <PersistentAudioBridge
                remoteStreams={remoteStreams}
                localUserId={localUserId}
                backstageUserIds={[]}
                remoteMuteStates={remoteMuteStates}
                canManageParticipants={false}
                isLocalHost={isLocalHost}
            />

            {/* ── TOP BAR (Google Meet Mobile Header) ── */}
            <header style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 40,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                pointerEvents: 'auto'
            }}>
                {/* Meeting Code Badge */}
                <div
                    onClick={handleCopyCode}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(12px)',
                        padding: '6px 14px',
                        borderRadius: 9999,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        letterSpacing: '0.02em'
                    }}
                >
                    <span>{activeMeetingCode || 'JTS Meet'}</span>
                    {isCopied ? <IconCheck size={14} color="#34A853" /> : <IconCopy size={14} color="#CCCCCC" />}
                </div>

                {/* Top Action Buttons (Speaker, Flip Camera, Leave) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Audio Route Button */}
                    <button
                        onClick={handleToggleAudioRoute}
                        title="Toggle Audio Route"
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(12px)',
                            border: 'none',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        {isAudioSpeakerOn ? <IconVolume size={18} /> : <IconVolumeOff size={18} color="#FBBC04" />}
                    </button>

                    {/* Camera Flip Button */}
                    {!isVideoOff && (
                        <button
                            onClick={handleFlipCamera}
                            disabled={isFlippingCamera}
                            title="Flip Camera"
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.12)',
                                backdropFilter: 'blur(12px)',
                                border: 'none',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: isFlippingCamera ? 'rotate(180deg)' : 'none'
                            }}
                        >
                            <IconCameraSwitch size={18} />
                        </button>
                    )}

                    {/* End Call Button */}
                    <button
                        onClick={handleExitCall}
                        title="Leave Call"
                        style={{
                            padding: '6px 14px',
                            borderRadius: 9999,
                            background: '#EA4335',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(234, 67, 53, 0.4)'
                        }}
                    >
                        <IconPhoneOff size={14} />
                        <span>Leave</span>
                    </button>
                </div>
            </header>

            {/* ── MAIN STAGE AREA (Responsive Touch Video Grid) ── */}
            <main style={{
                flex: 1,
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: totalParticipantsCount > 2 ? '60px 8px 84px 8px' : '0'
            }}>
                {/* ── Case 1: 1 Person (Solo user) ── */}
                {totalParticipantsCount === 1 && (
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                        <MobileVideoPlayer
                            stream={localStream}
                            isMuted={true}
                            isVideoOff={isVideoOff}
                            name={myDisplayName + ' (You)'}
                            isMirror={facingMode === 'user'}
                            isSpeaking={false}
                        />
                        {/* Invite Toast Helper when waiting alone */}
                        <div style={{
                            position: 'absolute',
                            top: 80,
                            left: 16,
                            right: 16,
                            background: 'rgba(26, 28, 30, 0.88)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 16,
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>You're the only one here</div>
                                <div style={{ fontSize: '0.75rem', color: '#9AA0A6' }}>Share link to invite participants</div>
                            </div>
                            <button
                                onClick={handleShareMeeting}
                                style={{
                                    background: '#1A73E8',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: 9999,
                                    padding: '8px 14px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    cursor: 'pointer'
                                }}
                            >
                                <IconShare size={13} />
                                <span>Share</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Case 2: 2 People (1-on-1: Remote Fullscreen + Local Floating PiP) ── */}
                {totalParticipantsCount === 2 && primaryPeerId && (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        {/* Remote Person Fullscreen */}
                        <MobileVideoPlayer
                            stream={remoteStreams[primaryPeerId] || null}
                            isMuted={false}
                            isVideoOff={!remoteStreams[primaryPeerId]?.getVideoTracks()[0]?.enabled}
                            name={participants.find(p => p.userId === primaryPeerId)?.displayName || 'Participant'}
                            isMirror={false}
                            isSpeaking={activeSpeaker === primaryPeerId}
                        />

                        {/* Local PiP Card Floating in bottom-right */}
                        <div style={{
                            position: 'absolute',
                            bottom: 96,
                            right: 16,
                            width: 104,
                            height: 148,
                            borderRadius: 18,
                            overflow: 'hidden',
                            border: '2px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65)',
                            zIndex: 30,
                            background: '#181A20'
                        }}>
                            <MobileVideoPlayer
                                stream={localStream}
                                isMuted={true}
                                isVideoOff={isVideoOff}
                                name="You"
                                isMirror={facingMode === 'user'}
                                isSpeaking={false}
                                isCompactPiP={true}
                            />
                        </div>
                    </div>
                )}

                {/* ── Case 3: 3 or 4 People (Clean 2x2 Grid) ── */}
                {(totalParticipantsCount === 3 || totalParticipantsCount === 4) && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gridTemplateRows: 'repeat(2, 1fr)',
                        gap: 8,
                        width: '100%',
                        height: '100%'
                    }}>
                        {/* Local User Tile */}
                        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#1A1C20' }}>
                            <MobileVideoPlayer
                                stream={localStream}
                                isMuted={true}
                                isVideoOff={isVideoOff}
                                name={myDisplayName + ' (You)'}
                                isMirror={facingMode === 'user'}
                                isSpeaking={false}
                            />
                        </div>

                        {/* Remote Users Tiles */}
                        {remotePeerIds.slice(0, 3).map(peerId => {
                            const pName = participants.find(p => p.userId === peerId)?.displayName || 'Participant'
                            return (
                                <div key={peerId} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#1A1C20' }}>
                                    <MobileVideoPlayer
                                        stream={remoteStreams[peerId] || null}
                                        isMuted={false}
                                        isVideoOff={!remoteStreams[peerId]?.getVideoTracks()[0]?.enabled}
                                        name={pName}
                                        isMirror={false}
                                        isSpeaking={activeSpeaker === peerId}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* ── Case 4: 5+ People (Google Meet Stage + Filmstrip) ── */}
                {totalParticipantsCount >= 5 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        gap: 8
                    }}>
                        {/* Primary Stage (Active Speaker or Pinned) */}
                        <div style={{
                            flex: 1,
                            position: 'relative',
                            borderRadius: 18,
                            overflow: 'hidden',
                            background: '#1A1C20'
                        }}>
                            {primaryPeerId ? (
                                <MobileVideoPlayer
                                    stream={remoteStreams[primaryPeerId] || null}
                                    isMuted={false}
                                    isVideoOff={!remoteStreams[primaryPeerId]?.getVideoTracks()[0]?.enabled}
                                    name={participants.find(p => p.userId === primaryPeerId)?.displayName || 'Participant'}
                                    isMirror={false}
                                    isSpeaking={activeSpeaker === primaryPeerId}
                                />
                            ) : (
                                <MobileVideoPlayer
                                    stream={localStream}
                                    isMuted={true}
                                    isVideoOff={isVideoOff}
                                    name={myDisplayName + ' (You)'}
                                    isMirror={facingMode === 'user'}
                                    isSpeaking={false}
                                />
                            )}
                        </div>

                        {/* Bottom Horizontal Filmstrip Carousel */}
                        <div style={{
                            height: 110,
                            display: 'flex',
                            gap: 8,
                            overflowX: 'auto',
                            paddingBottom: 4,
                            WebkitOverflowScrolling: 'touch'
                        }}>
                            {/* Local Tile in strip if not in primary */}
                            {primaryPeerId && (
                                <div
                                    onClick={() => setPinnedPeerId(null)}
                                    style={{
                                        width: 86,
                                        height: '100%',
                                        flexShrink: 0,
                                        borderRadius: 14,
                                        overflow: 'hidden',
                                        background: '#181A20',
                                        border: '1.5px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <MobileVideoPlayer
                                        stream={localStream}
                                        isMuted={true}
                                        isVideoOff={isVideoOff}
                                        name="You"
                                        isMirror={facingMode === 'user'}
                                        isSpeaking={false}
                                        isCompactPiP={true}
                                    />
                                </div>
                            )}

                            {/* Other remote peers in strip */}
                            {remotePeerIds.map(peerId => {
                                if (peerId === primaryPeerId) return null
                                const pName = participants.find(p => p.userId === peerId)?.displayName || 'Participant'
                                return (
                                    <div
                                        key={peerId}
                                        onClick={() => setPinnedPeerId(peerId)}
                                        style={{
                                            width: 86,
                                            height: '100%',
                                            flexShrink: 0,
                                            borderRadius: 14,
                                            overflow: 'hidden',
                                            background: '#181A20',
                                            border: activeSpeaker === peerId ? '2px solid #34A853' : '1.5px solid rgba(255,255,255,0.1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <MobileVideoPlayer
                                            stream={remoteStreams[peerId] || null}
                                            isMuted={false}
                                            isVideoOff={!remoteStreams[peerId]?.getVideoTracks()[0]?.enabled}
                                            name={pName}
                                            isMirror={false}
                                            isSpeaking={activeSpeaker === peerId}
                                            isCompactPiP={true}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* ── FLOATING BOTTOM CONTROLS (Google Meet Mobile Pill) ── */}
            <footer style={{
                position: 'absolute',
                bottom: 20,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 40,
                pointerEvents: 'none'
            }}>
                <div style={{
                    background: 'rgba(32, 33, 36, 0.88)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 9999,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    pointerEvents: 'auto'
                }}>
                    {/* Mic Button */}
                    <button
                        onClick={toggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: isMuted ? '#EA4335' : 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
                    </button>

                    {/* Camera Button */}
                    <button
                        onClick={toggleVideo}
                        title={isVideoOff ? 'Turn on video' : 'Turn off video'}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: isVideoOff ? '#EA4335' : 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isVideoOff ? <IconVideoOff size={22} /> : <IconVideo size={22} />}
                    </button>

                    {/* Raise Hand Button */}
                    {toggleHandRaise && (
                        <button
                            onClick={toggleHandRaise}
                            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: isHandRaised ? '#FBBC04' : 'rgba(255, 255, 255, 0.14)',
                                border: 'none',
                                color: isHandRaised ? '#202124' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <IconHand size={22} />
                        </button>
                    )}

                    {/* Chat Drawer Trigger */}
                    <button
                        onClick={() => setActiveSheet(activeSheet === 'chat' ? 'none' : 'chat')}
                        title="Chat"
                        style={{
                            position: 'relative',
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: activeSheet === 'chat' ? '#1A73E8' : 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <IconMessage size={22} />
                        {unreadChatCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                background: '#EA4335',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                borderRadius: 9999,
                                width: 18,
                                height: 18,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {unreadChatCount}
                            </span>
                        )}
                    </button>

                    {/* More Options Drawer Trigger */}
                    <button
                        onClick={() => setActiveSheet(activeSheet === 'more' ? 'none' : 'more')}
                        title="More options"
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: activeSheet === 'more' ? '#1A73E8' : 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <IconMoreVertical size={22} />
                    </button>
                </div>
            </footer>

            {/* ── MOBILE SLIDE-UP BOTTOM SHEETS (DRAWERS) ── */}
            {activeSheet !== 'none' && (
                <div
                    onClick={() => setActiveSheet('none')}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'flex-end',
                        transition: 'opacity 0.25s ease'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxHeight: '80vh',
                            background: '#1E2024',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        {/* Drag Handle */}
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
                        </div>

                        {/* Sheet 1: IN-CALL CHAT */}
                        {activeSheet === 'chat' && (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 18px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>In-call messages</h3>
                                    <button
                                        onClick={() => setActiveSheet('none')}
                                        style={{ background: 'none', border: 'none', color: '#9AA0A6', cursor: 'pointer' }}
                                    >
                                        <IconClose size={20} />
                                    </button>
                                </div>

                                <div style={{
                                    padding: '8px 18px',
                                    background: 'rgba(26, 115, 232, 0.12)',
                                    color: '#8AB4F8',
                                    fontSize: '0.75rem',
                                    textAlign: 'center'
                                }}>
                                    Messages can only be seen by people in the call and are deleted when the call ends.
                                </div>

                                {/* Messages Scroll Area */}
                                <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {messages.length === 0 ? (
                                        <div style={{ margin: 'auto', textAlign: 'center', color: '#9AA0A6', fontSize: '0.85rem' }}>
                                            No messages yet. Send a message to participants.
                                        </div>
                                    ) : (
                                        messages.map((m, i) => {
                                            const isMe = m.senderId === localUserId || m.isMe
                                            return (
                                                <div key={i} style={{
                                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                    maxWidth: '82%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: isMe ? 'flex-end' : 'flex-start'
                                                }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#9AA0A6', marginBottom: 2 }}>
                                                        {isMe ? 'You' : (m.senderName || 'Participant')}
                                                    </span>
                                                    <div style={{
                                                        background: isMe ? '#1A73E8' : 'rgba(255, 255, 255, 0.1)',
                                                        color: '#FFFFFF',
                                                        padding: '10px 14px',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        fontSize: '0.88rem',
                                                        lineHeight: 1.4,
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {m.content}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Chat Input Field */}
                                <form onSubmit={handleSendChatMessage} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '12px 16px',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    background: '#181A1E'
                                }}>
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Send a message..."
                                        style={{
                                            flex: 1,
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: 9999,
                                            padding: '10px 16px',
                                            color: '#FFFFFF',
                                            fontSize: '0.88rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim()}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            background: chatInput.trim() ? '#1A73E8' : 'rgba(255, 255, 255, 0.1)',
                                            border: 'none',
                                            color: '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: chatInput.trim() ? 'pointer' : 'default'
                                        }}
                                    >
                                        <IconSend size={18} />
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Sheet 2: PARTICIPANTS */}
                        {activeSheet === 'participants' && (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '65vh' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 20px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>People ({totalParticipantsCount})</h3>
                                    <button
                                        onClick={() => setActiveSheet('none')}
                                        style={{ background: 'none', border: 'none', color: '#9AA0A6', cursor: 'pointer' }}
                                    >
                                        <IconClose size={20} />
                                    </button>
                                </div>

                                <div style={{ padding: '14px 20px' }}>
                                    <button
                                        onClick={handleShareMeeting}
                                        style={{
                                            width: '100%',
                                            background: '#1A73E8',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: 12,
                                            padding: '12px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <IconShare size={16} />
                                        <span>Share Invite Link</span>
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {/* Local User */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: '50%',
                                                background: getAvatarGradient(myDisplayName),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '0.85rem'
                                            }}>
                                                {getInitials(myDisplayName)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{myDisplayName} (You)</div>
                                                <div style={{ fontSize: '0.72rem', color: '#8AB4F8' }}>{isLocalHost ? 'Host' : 'Participant'}</div>
                                            </div>
                                        </div>
                                        <div>{isMuted ? <IconMicOff size={18} color="#EA4335" /> : <IconMic size={18} color="#34A853" />}</div>
                                    </div>

                                    {/* Remote Users */}
                                    {remotePeerIds.map(peerId => {
                                        const p = participants.find(part => part.userId === peerId)
                                        const name = p?.displayName || 'Participant'
                                        const peerMuted = remoteMuteStates[peerId] || false
                                        return (
                                            <div key={peerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: '50%',
                                                        background: getAvatarGradient(name),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {getInitials(name)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#9AA0A6' }}>In call</div>
                                                    </div>
                                                </div>
                                                <div>{peerMuted ? <IconMicOff size={18} color="#EA4335" /> : <IconMic size={18} color="#34A853" />}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Sheet 3: MORE OPTIONS */}
                        {activeSheet === 'more' && (
                            <div style={{ padding: '16px 20px 28px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Meeting Options</h3>
                                    <button
                                        onClick={() => setActiveSheet('none')}
                                        style={{ background: 'none', border: 'none', color: '#9AA0A6', cursor: 'pointer' }}
                                    >
                                        <IconClose size={20} />
                                    </button>
                                </div>

                                {/* Participants option */}
                                <div
                                    onClick={() => setActiveSheet('participants')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 16px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        borderRadius: 14,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>People in this meeting</span>
                                    <span style={{ color: '#8AB4F8', fontWeight: 700, fontSize: '0.9rem' }}>{totalParticipantsCount}</span>
                                </div>

                                {/* Flip Camera option */}
                                {!isVideoOff && (
                                    <div
                                        onClick={() => {
                                            handleFlipCamera()
                                            setActiveSheet('none')
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 14,
                                            padding: '14px 16px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            borderRadius: 14,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <IconCameraSwitch size={20} color="#8AB4F8" />
                                        <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera</span>
                                    </div>
                                )}

                                {/* Voice Isolation / Noise Cancellation Toggle */}
                                {handleToggleNoiseSuppression && (
                                    <div
                                        onClick={() => handleToggleNoiseSuppression()}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '14px 16px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            borderRadius: 14,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>AI Voice Isolation</div>
                                            <div style={{ fontSize: '0.75rem', color: '#9AA0A6' }}>Silences background fan and room noise</div>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 9999,
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            background: isNoiseSuppressionEnabled ? '#34A853' : 'rgba(255,255,255,0.1)',
                                            color: '#FFFFFF'
                                        }}>
                                            {isNoiseSuppressionEnabled ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                )}

                                {/* Share Meeting Link */}
                                <div
                                    onClick={handleShareMeeting}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '14px 16px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        borderRadius: 14,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <IconShare size={20} color="#8AB4F8" />
                                    <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>Share invite link</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─────────────────────────────────────────────────────────────
   MOBILE VIDEO PLAYER COMPONENT
   Clean edge-to-edge / card video player with fallback avatar
───────────────────────────────────────────────────────────── */
interface MobileVideoPlayerProps {
    stream: MediaStream | null
    isMuted: boolean
    isVideoOff: boolean
    name: string
    isMirror?: boolean
    isSpeaking?: boolean
    isCompactPiP?: boolean
}

const MobileVideoPlayer: React.FC<MobileVideoPlayerProps> = ({
    stream,
    isVideoOff,
    name,
    isMirror = false,
    isSpeaking = false,
    isCompactPiP = false
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream) return

        if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream
        }
        videoEl.play().catch(() => {})
    }, [stream])

    const hasLiveVideoTrack = Boolean(
        stream &&
        stream.getVideoTracks().length > 0 &&
        stream.getVideoTracks()[0].readyState === 'live' &&
        stream.getVideoTracks()[0].enabled &&
        !isVideoOff
    )

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: '#121316',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isSpeaking ? '2.5px solid #34A853' : 'none',
            borderRadius: isCompactPiP ? 16 : 'inherit',
            transition: 'border 0.2s ease'
        }}>
            {hasLiveVideoTrack ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={true} // Audio is played via PersistentAudioBridge to avoid echo
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: isMirror ? 'scaleX(-1)' : 'none'
                    }}
                />
            ) : (
                /* Fallback Initials Avatar */
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isCompactPiP ? 4 : 10
                }}>
                    <div style={{
                        width: isCompactPiP ? 42 : 88,
                        height: isCompactPiP ? 42 : 88,
                        borderRadius: '50%',
                        background: getAvatarGradient(name),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isCompactPiP ? '1.1rem' : '2.4rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        boxShadow: isSpeaking ? '0 0 0 6px rgba(52, 168, 83, 0.4)' : '0 8px 24px rgba(0,0,0,0.5)',
                        transition: 'box-shadow 0.2s ease'
                    }}>
                        {getInitials(name)}
                    </div>
                </div>
            )}

            {/* Name Badge */}
            <div style={{
                position: 'absolute',
                bottom: isCompactPiP ? 4 : 10,
                left: isCompactPiP ? 4 : 12,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                borderRadius: 9999,
                padding: isCompactPiP ? '2px 6px' : '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: isCompactPiP ? '0.65rem' : '0.78rem',
                fontWeight: 600,
                maxWidth: isCompactPiP ? 78 : 160,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                color: '#FFFFFF'
            }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            </div>

            {/* Speaking Aura Effect */}
            {isSpeaking && (
                <div style={{
                    position: 'absolute',
                    top: isCompactPiP ? 4 : 10,
                    right: isCompactPiP ? 4 : 12,
                    background: '#34A853',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #34A853'
                }} />
            )}
        </div>
    )
}
