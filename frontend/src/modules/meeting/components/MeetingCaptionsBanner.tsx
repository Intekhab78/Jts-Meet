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
                    onTranscriptUpdate?.([...transcriptRef.current])
                }
            }
        }

        socket.on('meeting:caption', handleRemoteCaption)
        return () => {
            socket.off('meeting:caption', handleRemoteCaption)
        }
    }, [socket, isEnabled, onTranscriptUpdate])

    // Local Speech Recognition
    useEffect(() => {
        if (!isEnabled || isLocalMuted) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop()
                } catch (e) {}
                recognitionRef.current = null
            }
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            return
        }

        try {
            const recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onresult = (event: any) => {
                let interim = ''
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptPiece = event.results[i][0].transcript
                    const isFinal = !!event.results[i].isFinal

                    if (isFinal) {
                        const finalChunk = transcriptPiece.trim()
                        if (finalChunk) {
                            setCurrentSpeaker(speakerName || 'You')
                            setDisplayText(finalChunk)
                            
                            const newEntry: CaptionEntry = {
                                speaker: speakerName || 'You',
                                text: finalChunk,
                                timestamp: new Date()
                            }
                            transcriptRef.current.push(newEntry)
                            onTranscriptUpdate?.([...transcriptRef.current])

                            // Broadcast caption to entire meeting room
                            socket?.emit('meeting:caption', {
                                meetingId,
                                text: finalChunk,
                                isFinal: true,
                                speakerName: speakerName || 'You'
                            })

                            if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                            clearTimerRef.current = setTimeout(() => setDisplayText(''), 4500)
                        }
                    } else {
                        interim += transcriptPiece
                    }
                }

                if (interim.trim()) {
                    setCurrentSpeaker(speakerName || 'You')
                    setDisplayText(interim)
                    
                    // Broadcast interim caption
                    socket?.emit('meeting:caption', {
                        meetingId,
                        text: interim,
                        isFinal: false,
                        speakerName: speakerName || 'You'
                    })

                    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                    clearTimerRef.current = setTimeout(() => setDisplayText(''), 4000)
                }
            }

            recognition.onerror = (event: any) => {
                if (event.error !== 'no-speech') {
                    console.warn('Speech recognition status:', event.error)
                }
            }

            recognition.onend = () => {
                if (isEnabled && !isLocalMuted && recognitionRef.current) {
                    try {
                        recognition.start()
                    } catch (e) {}
                }
            }

            recognition.start()
            recognitionRef.current = recognition
        } catch (err) {
            console.warn('Failed to start speech recognition:', err)
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop()
                } catch (e) {}
                recognitionRef.current = null
            }
        }
    }, [isEnabled, isLocalMuted, speakerName, meetingId, socket, onTranscriptUpdate])

    if (!isEnabled || !displayText) return null

    return (
        <div style={{
            position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
            zIndex: 80, maxWidth: '85%', padding: '10px 22px',
            background: 'rgba(10, 11, 15, 0.9)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            textAlign: 'center', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: 10
        }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
                {currentSpeaker}:
            </span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                {displayText}
            </span>
        </div>
    )
}
