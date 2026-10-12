import { useState, useEffect, useRef } from 'react'

export interface TranscriptItem {
    speaker: string
    text: string
    timestamp: Date
}

export interface PostMeetingCapsuleData {
    duration: string
    talkTime: Record<string, number>
    notes: string
    title: string
}

export interface DetectedActionItem {
    id: string
    text: string
    speaker: string
}

interface UseMeetingAIExtensionsProps {
    joined: boolean
    participants: string[]
    messages: any[]
    activeSpeaker: string | null
    isMuted: boolean
    myDisplayName: string
}

export const useMeetingAIExtensions = ({
    joined,
    participants,
    messages,
    activeSpeaker,
    isMuted,
    myDisplayName
}: UseMeetingAIExtensionsProps) => {
    // Late-Joiner AI "Catch Me Up" (Teams / Zoom Copilot feature)
    const [showCatchUpPrompt, setShowCatchUpPrompt] = useState(false)
    const [showCatchUpModal, setShowCatchUpModal] = useState(false)
    const [joinedMinutesLate, setJoinedMinutesLate] = useState(0)
    const hasTriggeredCatchUpRef = useRef(false)

    // Captions / Dubbing Transcripts
    const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])

    // In-Meeting Live Action-Item Detector
    const [detectedActionItem, setDetectedActionItem] = useState<DetectedActionItem | null>(null)
    const [meetingNotes, setMeetingNotes] = useState<string>('')

    // Talk-Time Analytics & Leaderboard
    const [talkTimeMap, setTalkTimeMap] = useState<Record<string, number>>({})
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)

    // Dynamic Anti-Leak Floating Watermark (Confidential Mode)
    const [isConfidentialMode, setIsConfidentialMode] = useState(false)
    const [watermarkOffset, setWatermarkOffset] = useState({ x: 10, y: 15 })

    // AI Real-Time Voice Dubbing / Live Speech Interpreter
    const [isVoiceDubbingEnabled, setIsVoiceDubbingEnabled] = useState(false)

    // Post-Meeting Interactive Capsule Hub
    const [postMeetingCapsule, setPostMeetingCapsule] = useState<PostMeetingCapsuleData | null>(null)

    // Late-joiner Catch Up check
    useEffect(() => {
        if (!joined || hasTriggeredCatchUpRef.current) return

        const isLate = (participants && participants.length > 0) || (messages && messages.length > 1)
        if (isLate) {
            hasTriggeredCatchUpRef.current = true
            const approxLate = Math.min(60, Math.max(3, (messages?.length || 2) * 2))
            setJoinedMinutesLate(approxLate)
            setShowCatchUpPrompt(true)
            const promptTimer = setTimeout(() => setShowCatchUpPrompt(false), 20000)
            return () => clearTimeout(promptTimer)
        }
    }, [joined, participants, messages])

    // Accumulate speaking time per attendee
    useEffect(() => {
        if (!joined) return
        const timer = setInterval(() => {
            const speakerKey = activeSpeaker || (isMuted ? null : 'me')
            if (speakerKey) {
                setTalkTimeMap(prev => ({
                    ...prev,
                    [speakerKey]: (prev[speakerKey] || 0) + 1
                }))
            }
        }, 1000)
        return () => clearInterval(timer)
    }, [joined, activeSpeaker, isMuted])

    // Anti-leak watermark drift timer
    useEffect(() => {
        if (!isConfidentialMode) return
        const drift = setInterval(() => {
            setWatermarkOffset({
                x: Math.floor(Math.random() * 40) + 5,
                y: Math.floor(Math.random() * 40) + 5
            })
        }, 12000)
        return () => clearInterval(drift)
    }, [isConfidentialMode])

    // Live Action Item Intent Detector
    useEffect(() => {
        const lastMsg = messages[messages.length - 1]
        const lastText = lastMsg?.message || transcripts[transcripts.length - 1]?.text || ''
        const speaker = lastMsg?.senderName || transcripts[transcripts.length - 1]?.speaker || 'Participant'

        if (lastText && lastText.length > 10) {
            const match = lastText.match(/(?:will|should|need to|please|action|todo|follow up|assign|prepare|schedule)\s+([^.!?\n]+)/i)
            if (match && match[0] && match[0].trim().length > 6) {
                setDetectedActionItem({
                    id: String(Date.now()),
                    text: match[0].trim(),
                    speaker
                })
            }
        }
    }, [messages, transcripts])

    // Real-Time Voice Dubbing Interpreter via SpeechSynthesis
    useEffect(() => {
        if (!isVoiceDubbingEnabled || typeof window === 'undefined' || !window.speechSynthesis) return
        const lastTranscript = transcripts[transcripts.length - 1]
        if (lastTranscript && lastTranscript.speaker !== myDisplayName && lastTranscript.speaker !== 'me') {
            try {
                window.speechSynthesis.cancel()
                const utter = new SpeechSynthesisUtterance(lastTranscript.text)
                utter.rate = 1.05
                window.speechSynthesis.speak(utter)
            } catch (_) {}
        }
    }, [transcripts, isVoiceDubbingEnabled, myDisplayName])

    const handleAddDetectedActionItem = () => {
        if (!detectedActionItem) return
        const line = `• [ACTION] ${detectedActionItem.text} (from ${detectedActionItem.speaker})`
        setMeetingNotes(prev => prev ? `${prev}\n${line}` : line)
        setDetectedActionItem(null)
    }

    return {
        showCatchUpPrompt,
        setShowCatchUpPrompt,
        showCatchUpModal,
        setShowCatchUpModal,
        joinedMinutesLate,
        transcripts,
        setTranscripts,
        detectedActionItem,
        setDetectedActionItem,
        meetingNotes,
        setMeetingNotes,
        handleAddDetectedActionItem,
        talkTimeMap,
        setTalkTimeMap,
        showAnalyticsModal,
        setShowAnalyticsModal,
        isConfidentialMode,
        setIsConfidentialMode,
        watermarkOffset,
        isVoiceDubbingEnabled,
        setIsVoiceDubbingEnabled,
        postMeetingCapsule,
        setPostMeetingCapsule
    }
}
