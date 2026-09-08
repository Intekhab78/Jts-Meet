import React, { useEffect, useState, useRef } from 'react'

interface CaptionEntry {
    speaker: string
    text: string
    timestamp: Date
}

interface MeetingCaptionsBannerProps {
    isEnabled: boolean
    speakerName: string
    onTranscriptUpdate?: (transcript: CaptionEntry[]) => void
}

export function MeetingCaptionsBanner({ isEnabled, speakerName, onTranscriptUpdate }: MeetingCaptionsBannerProps) {
    const [currentText, setCurrentText] = useState<string>('')
    const [lastFinalText, setLastFinalText] = useState<string>('')
    const transcriptRef = useRef<CaptionEntry[]>([])
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (!isEnabled) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop()
                } catch (e) {}
                recognitionRef.current = null
            }
            setCurrentText('')
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            setCurrentText('Speech recognition not supported in this browser. Please use Chrome or Edge.')
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
                    if (event.results[i].isFinal) {
                        const finalChunk = transcriptPiece.trim()
                        if (finalChunk) {
                            const newEntry: CaptionEntry = {
                                speaker: speakerName || 'Speaker',
                                text: finalChunk,
                                timestamp: new Date()
                            }
                            transcriptRef.current.push(newEntry)
                            onTranscriptUpdate?.([...transcriptRef.current])
                            setLastFinalText(finalChunk)
                        }
                    } else {
                        interim += transcriptPiece
                    }
                }
                setCurrentText(interim)
            }

            recognition.onerror = (event: any) => {
                if (event.error !== 'no-speech') {
                    console.warn('Speech recognition warning:', event.error)
                }
            }

            recognition.onend = () => {
                // Auto restart if still enabled
                if (isEnabled && recognitionRef.current) {
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
    }, [isEnabled, speakerName, onTranscriptUpdate])

    if (!isEnabled) return null

    const displayText = currentText || lastFinalText

    if (!displayText) return null

    return (
        <div style={{
            position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
            zIndex: 80, maxWidth: '80%', padding: '10px 20px',
            background: 'rgba(10, 11, 15, 0.88)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            textAlign: 'center', pointerEvents: 'none'
        }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: 2 }}>
                {speakerName} (Live Caption)
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                {displayText}
            </div>
        </div>
    )
}
