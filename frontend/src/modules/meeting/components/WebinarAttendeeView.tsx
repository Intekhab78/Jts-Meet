import React, { useState, useEffect, useRef } from 'react'
import { soundEffects } from '../../../utils/soundEffects'

interface FloatingReaction {
    id: string
    emoji: string
    left: number
}

interface WebinarAttendeeViewProps {
    meetingId: string
    meetingTitle?: string
    stageStream?: MediaStream | null
    stageSpeakerName?: string
    isScreenShare?: boolean
    socket: any
    myUserId: string
    myDisplayName: string
    isPromotedToSpeaker: boolean
    onLeave: () => void
    onOpenQA: () => void
    onOpenPolls: () => void
    onOpenChat: () => void
    unreadChatCount?: number
}

export const WebinarAttendeeView: React.FC<WebinarAttendeeViewProps> = ({
    meetingId,
    meetingTitle,
    stageStream,
    stageSpeakerName,
    isScreenShare = false,
    socket,
    myUserId,
    myDisplayName,
    isPromotedToSpeaker,
    onLeave,
    onOpenQA,
    onOpenPolls,
    onOpenChat,
    unreadChatCount = 0
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [handRaised, setHandRaised] = useState<boolean>(false)
    const [viewerCount, setViewerCount] = useState<number>(1240 + Math.floor(Math.random() * 50))
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])

    // Attach media stream to stage video element
    useEffect(() => {
        if (videoRef.current && stageStream) {
            videoRef.current.srcObject = stageStream
            videoRef.current.play().catch(e => console.warn('[Webinar View] Auto-play warning:', e))
        }
    }, [stageStream])

    // Listen to incoming live reactions
    useEffect(() => {
        if (!socket) return

        const handleReaction = (data: { reaction: string; userName?: string; id: string }) => {
            const newReaction: FloatingReaction = {
                id: data.id || String(Math.random()),
                emoji: data.reaction,
                left: 15 + Math.random() * 70 // randomized horizontal position percentage
            }
            setFloatingReactions(prev => [...prev.slice(-20), newReaction])

            setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id))
            }, 3000)
        }

        socket.on('webinar:reaction', handleReaction)
        return () => {
            socket.off('webinar:reaction', handleReaction)
        }
    }, [socket])

    const handleSendReaction = (emoji: string) => {
        if (!socket) return
        socket.emit('webinar:reaction', {
            meetingId,
            reaction: emoji,
            userName: myDisplayName
        })
    }

    const handleToggleHandRaise = () => {
        if (!socket) return
        const next = !handRaised
        setHandRaised(next)
        if (next) {
            soundEffects.playJoinChime()
            socket.emit('webinar:request-to-speak', {
                meetingId,
                displayName: myDisplayName
            })
        }
    }

    return (
        <div className="relative w-full h-full bg-neutral-950 flex flex-col select-none overflow-hidden font-sans text-neutral-100">
            {/* Top Stage Navigation Bar */}
            <div className="h-14 px-5 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800/80 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        LIVE WEBINAR
                    </div>
                    <div className="text-sm font-semibold text-neutral-200 truncate max-w-md">
                        {meetingTitle || `Webinar Broadcast (${meetingId})`}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Viewers counter */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/60 px-3 py-1.5 rounded-lg border border-neutral-700/50 font-medium">
                        <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>{viewerCount.toLocaleString()} Attendees</span>
                    </div>

                    {/* Leave Webinar */}
                    <button
                        onClick={onLeave}
                        className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-rose-400 hover:text-rose-300 text-xs font-bold rounded-lg transition-colors border border-neutral-700/60"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Stage Presentation Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                {stageStream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-neutral-500">
                        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                            <svg className="w-12 h-12 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </div>
                        <div className="text-sm font-medium text-neutral-400">
                            Stage Keynote Presenter is preparing the broadcast...
                        </div>
                        <div className="text-xs text-neutral-500">
                            Sit back and enjoy the live high-definition webinar stream.
                        </div>
                    </div>
                )}

                {/* Stage Speaker Badge Overlay */}
                {stageSpeakerName && (
                    <div className="absolute bottom-5 left-5 px-3.5 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-xs font-medium text-white flex items-center gap-2 z-10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{isScreenShare ? 'Screen Share' : 'Keynote Presenter'}: <strong className="font-semibold">{stageSpeakerName}</strong></span>
                    </div>
                )}

                {/* Floating Reactions Layer */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                    {floatingReactions.map(item => (
                        <div
                            key={item.id}
                            className="absolute bottom-6 text-3xl animate-float-up"
                            style={{ left: `${item.left}%` }}
                        >
                            {item.emoji}
                        </div>
                    ))}
                </div>

                {/* Speaker Promotion Notification Alert */}
                {isPromotedToSpeaker && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-5 py-3 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl shadow-2xl text-emerald-200 text-xs flex items-center gap-3 backdrop-blur-md animate-bounce">
                        <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <div>
                            <strong>You're now on Stage!</strong> The Host has promoted you to live speaker. Your microphone and camera can now be enabled.
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Audience Interaction Bar */}
            <div className="h-16 px-6 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800/80 flex items-center justify-between z-20">
                {/* Left: Quick Reactions Bar */}
                <div className="flex items-center gap-1.5">
                    {['👏', '❤️', '🚀', '🎉', '💡'].map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => handleSendReaction(emoji)}
                            className="p-2 hover:scale-125 transition-transform text-lg bg-neutral-800/60 hover:bg-neutral-800 rounded-xl border border-neutral-700/50"
                            title={`Send ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {/* Center: Request to Speak (Hand Raise) */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToggleHandRaise}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                            handRaised
                                ? 'bg-amber-500 text-black shadow-amber-500/30 animate-pulse'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                        }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                        </svg>
                        <span>{handRaised ? 'Hand Raised (Waiting for Host)' : 'Request to Speak'}</span>
                    </button>
                </div>

                {/* Right: Interactive Panels (Q&A, Polls, Chat) */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenQA}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Q&A</span>
                    </button>

                    <button
                        onClick={onOpenPolls}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 20V10" />
                            <path d="M12 20V4" />
                            <path d="M6 20v-6" />
                        </svg>
                        <span>Polls</span>
                    </button>

                    <button
                        onClick={onOpenChat}
                        className="relative px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>Chat</span>
                        {unreadChatCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* Keyframe style for floating reaction animations */}
            <style>{`
                @keyframes floatUp {
                    0% {
                        opacity: 1;
                        transform: translateY(0) scale(0.8);
                    }
                    50% {
                        transform: translateY(-120px) scale(1.3);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-240px) scale(1);
                    }
                }
                .animate-float-up {
                    animation: floatUp 2.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
            `}</style>
        </div>
    )
}
