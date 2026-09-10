import React, { useEffect, useState, useRef } from 'react'
import type { Socket } from 'socket.io-client'

interface CaptionEntry {
    speaker: string
    text: string
    timestamp: Date
}

interface MeetingCaptionsBannerProps {
    isEnabled: boolean
    speakerName: string
    meetingId: string
    socket: Socket | null
    isLocalMuted?: boolean
    onTranscriptUpdate?: (transcript: CaptionEntry[]) => void
}

export function MeetingCaptionsBanner({ 
    isEnabled, 
    speakerName, 
    meetingId,
    socket,
    isLocalMuted,
    onTranscriptUpdate 
}: MeetingCaptionsBannerProps) {
    const [displayText, setDisplayText] = useState<string>('')
    const [currentSpeaker, setCurrentSpeaker] = useState<string>('')
    const transcriptRef = useRef<CaptionEntry[]>([])
    const recognitionRef = useRef<any>(null)
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const speakerNameRef = useRef(speakerName)
    const meetingIdRef = useRef(meetingId)
    const socketRef = useRef(socket)
    const onTranscriptUpdateRef = useRef(onTranscriptUpdate)

    useEffect(() => {
        speakerNameRef.current = speakerName
        meetingIdRef.current = meetingId
        socketRef.current = socket
        onTranscriptUpdateRef.current = onTranscriptUpdate
    }, [speakerName, meetingId, socket, onTranscriptUpdate])

    // Listen to remote captions from other participants
    useEffect(() => {
        if (!socket || !isEnabled) return

        const handleRemoteCaption = (data: { userId: string; speakerName: string; text: string; isFinal: boolean }) => {
            if (data.text) {
                setCurrentSpeaker(data.speakerName || 'Speaker')
                setDisplayText(data.text)

                if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                clearTimerRef.current = setTimeout(() => {
                    setDisplayText('')
                }, 4000)

                if (data.isFinal) {
                    const newEntry: CaptionEntry = {
                        speaker: data.speakerName || 'Speaker',
                        text: data.text,
                        timestamp: new Date()
                    }
                    transcriptRef.current.push(newEntry)
                    onTranscriptUpdateRef.current?.([...transcriptRef.current])
                }
            }
        }

        socket.on('meeting:caption', handleRemoteCaption)
        return () => {
            socket.off('meeting:caption', handleRemoteCaption)
        }
    }, [socket, isEnabled])

    // Local Speech Recognition (stable lifecycle)
    useEffect(() => {
        if (!isEnabled || isLocalMuted) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort()
                } catch (e) {}
                recognitionRef.current = null
            }
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            console.warn('SpeechRecognition API is not supported in this browser environment')
            return
        }

        let isStoppedManually = false
        let recognitionInstance: any = null

        try {
            recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = true
            recognitionInstance.interimResults = true
            recognitionInstance.maxAlternatives = 1
            recognitionInstance.lang = navigator.language || 'en-US'

            recognitionInstance.onresult = (event: any) => {
                let interim = ''
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptPiece = event.results[i][0].transcript
                    const isFinal = !!event.results[i].isFinal

                    if (isFinal) {
                        const finalChunk = transcriptPiece.trim()
                        if (finalChunk) {
                            const currentName = speakerNameRef.current || 'You'
                            setCurrentSpeaker(currentName)
                            setDisplayText(finalChunk)

                            const newEntry: CaptionEntry = {
                                speaker: currentName,
                                text: finalChunk,
                                timestamp: new Date()
                            }
                            transcriptRef.current.push(newEntry)
                            onTranscriptUpdateRef.current?.([...transcriptRef.current])

                            // Broadcast caption to entire meeting room
                            socketRef.current?.emit('meeting:caption', {
                                meetingId: meetingIdRef.current,
                                text: finalChunk,
                                isFinal: true,
                                speakerName: currentName
                            })

                            if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                            clearTimerRef.current = setTimeout(() => setDisplayText(''), 4500)
                        }
                    } else {
                        interim += transcriptPiece
                    }
                }

                if (interim.trim()) {
                    const currentName = speakerNameRef.current || 'You'
                    setCurrentSpeaker(currentName)
                    setDisplayText(interim)

                    // Broadcast interim caption
                    socketRef.current?.emit('meeting:caption', {
                        meetingId: meetingIdRef.current,
                        text: interim,
                        isFinal: false,
                        speakerName: currentName
                    })

                    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                    clearTimerRef.current = setTimeout(() => setDisplayText(''), 4000)
                }
            }

            recognitionInstance.onerror = (event: any) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.warn('Speech recognition status:', event.error)
                }
            }

            recognitionInstance.onend = () => {
                if (!isStoppedManually && isEnabled && !isLocalMuted) {
                    try {
                        recognitionInstance.start()
                    } catch (e) {}
                }
            }

            recognitionInstance.start()
            recognitionRef.current = recognitionInstance
        } catch (err) {
            console.warn('Failed to initialize speech recognition:', err)
        }

        return () => {
            isStoppedManually = true
            if (recognitionInstance) {
                try {
                    recognitionInstance.abort()
                } catch (e) {}
            }
            recognitionRef.current = null
        }
    }, [isEnabled, isLocalMuted])

    if (!isEnabled) return null

    if (!displayText) {
        return (
            <div style={{
                position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
                zIndex: 80, padding: '8px 20px',
                background: 'rgba(10, 11, 15, 0.92)', backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isLocalMuted ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(52, 211, 153, 0.4)',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                textAlign: 'center', pointerEvents: 'none',
                display: 'flex', alignItems: 'center', gap: 8
            }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLocalMuted ? '#f59e0b' : '#34d399', display: 'inline-block' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0' }}>
                    {isLocalMuted 
                        ? '🔇 Mic is Muted — Unmute mic to speak and see live subtitles' 
                        : '🎙️ Live Captions: Listening for speech... Speak into microphone'}
                </span>
            </div>
        )
    }

    return (
        <div style={{
            position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
            zIndex: 80, maxWidth: '85%', padding: '10px 22px',
            background: 'rgba(10, 11, 15, 0.94)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(52, 211, 153, 0.5)', borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            textAlign: 'center', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: 10
        }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>
                {currentSpeaker}:
            </span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                {displayText}
            </span>
        </div>
    )
}
