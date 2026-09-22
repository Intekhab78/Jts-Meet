import React, { useEffect, useState, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { API_BASE } from '../../../config'
import { IconInfo, IconMic, IconMicOff, IconGlobe } from '../../../components/common/Icons'

export const CAPTION_LANGUAGES = [
    { code: 'original', label: 'Original Audio' },
    { code: 'hi', label: 'Hindi (हिंदी)' },
    { code: 'es', label: 'Spanish (Español)' },
    { code: 'fr', label: 'French (Français)' },
    { code: 'de', label: 'German (Deutsch)' },
    { code: 'ja', label: 'Japanese (日本語)' },
    { code: 'ar', label: 'Arabic (العربية)' }
]

const LANG_VOICE_MAP: Record<string, string> = {
    hi: 'hi-IN',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    ar: 'ar-SA',
    en: 'en-US'
}

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
    const [isUnsupportedBrowser, setIsUnsupportedBrowser] = useState<boolean>(false)
    const [showIdleNotice, setShowIdleNotice] = useState<boolean>(true)
    const [targetLanguage, setTargetLanguage] = useState<string>(() => {
        try {
            return localStorage.getItem('jts_caption_lang') || 'original'
        } catch {
            return 'original'
        }
    })
    const [translatedText, setTranslatedText] = useState<string>('')
    const [isTranslating, setIsTranslating] = useState<boolean>(false)
    const [isVoiceDubbingEnabled, setIsVoiceDubbingEnabled] = useState<boolean>(() => {
        try {
            return localStorage.getItem('jts_voice_dubbing') === 'true'
        } catch {
            return false
        }
    })
    const [voiceDubbingVolume, setVoiceDubbingVolume] = useState<number>(() => {
        try {
            const val = localStorage.getItem('jts_voice_dubbing_vol')
            return val ? parseFloat(val) : 0.9
        } catch {
            return 0.9
        }
    })

    const transcriptRef = useRef<CaptionEntry[]>([])
    const recognitionRef = useRef<any>(null)
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const idleNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const translationAbortControllerRef = useRef<AbortController | null>(null)

    const speakerNameRef = useRef(speakerName)
    const meetingIdRef = useRef(meetingId)
    const socketRef = useRef(socket)
    const onTranscriptUpdateRef = useRef(onTranscriptUpdate)

    // Auto-hide idle notice (including "Mic is Muted") after 3 seconds
    useEffect(() => {
        if (isEnabled) {
            setShowIdleNotice(true)
            if (idleNoticeTimerRef.current) clearTimeout(idleNoticeTimerRef.current)
            idleNoticeTimerRef.current = setTimeout(() => {
                setShowIdleNotice(false)
            }, 3000)
        } else {
            setShowIdleNotice(false)
            if (idleNoticeTimerRef.current) clearTimeout(idleNoticeTimerRef.current)
        }

        return () => {
            if (idleNoticeTimerRef.current) clearTimeout(idleNoticeTimerRef.current)
        }
    }, [isEnabled, isLocalMuted])

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

    // Real-time Translation Pipeline (Zoom / Teams Subtitle Translation)
    useEffect(() => {
        if (!displayText.trim() || targetLanguage === 'original') {
            setTranslatedText('')
            setIsTranslating(false)
            return
        }

        if (translationAbortControllerRef.current) {
            translationAbortControllerRef.current.abort()
        }
        const abortController = new AbortController()
        translationAbortControllerRef.current = abortController

        setIsTranslating(true)
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/ai/translate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: displayText, targetLang: targetLanguage }),
                    signal: abortController.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.data?.translated) {
                        setTranslatedText(data.data.translated)
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('[Captions Translation] Error:', err)
                }
            } finally {
                setIsTranslating(false)
            }
        }, 220)

        return () => {
            clearTimeout(timer)
            abortController.abort()
        }
    }, [displayText, targetLanguage])

    const handleLanguageChange = (lang: string) => {
        setTargetLanguage(lang)
        try {
            localStorage.setItem('jts_caption_lang', lang)
        } catch (_) {}
    }

    const handleToggleVoiceDubbing = () => {
        const next = !isVoiceDubbingEnabled
        setIsVoiceDubbingEnabled(next)
        try {
            localStorage.setItem('jts_voice_dubbing', String(next))
        } catch (_) {}
        if (!next && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel()
        }
    }

    // Real-time AI Voice Dubbing (TTS Spoken Audio for translated captions)
    useEffect(() => {
        if (!isVoiceDubbingEnabled || !translatedText.trim() || targetLanguage === 'original') return
        if (!('speechSynthesis' in window)) return

        // Prevent echo if the current speaker is local user
        const isSelf = currentSpeaker.toLowerCase() === 'you' || 
                       (speakerNameRef.current && currentSpeaker.toLowerCase() === speakerNameRef.current.toLowerCase())
        if (isSelf) return

        try {
            window.speechSynthesis.cancel() // cancel earlier speech to prevent lag
            const utterance = new SpeechSynthesisUtterance(translatedText)
            utterance.lang = LANG_VOICE_MAP[targetLanguage] || 'en-US'
            utterance.volume = voiceDubbingVolume
            utterance.rate = 1.05 // natural conversational pace
            window.speechSynthesis.speak(utterance)
        } catch (err) {
            console.warn('[AI Voice Dubbing] Error:', err)
        }
    }, [translatedText, isVoiceDubbingEnabled, voiceDubbingVolume, targetLanguage, currentSpeaker])

    // Cleanup speech synthesis on unmount or disabling captions
    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

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
            setIsUnsupportedBrowser(true)
            console.warn('SpeechRecognition API is not supported in this browser environment')
            return
        }
        setIsUnsupportedBrowser(false)

        let recognitionInstance: any = null
        let isStoppedManually = false

        try {
            recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = true
            recognitionInstance.interimResults = true
            recognitionInstance.lang = 'en-US'

            recognitionInstance.onresult = (event: any) => {
                let interim = ''
                let final = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        final += transcriptPiece
                    } else {
                        interim += transcriptPiece
                    }
                }

                const currentText = (final || interim).trim()
                if (!currentText) return

                setCurrentSpeaker(speakerNameRef.current || 'You')
                setDisplayText(currentText)

                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('meeting:caption', {
                        meetingId: meetingIdRef.current,
                        speakerName: speakerNameRef.current || 'You',
                        text: currentText,
                        isFinal: Boolean(final)
                    })
                }

                if (final) {
                    const newEntry: CaptionEntry = {
                        speaker: speakerNameRef.current || 'You',
                        text: final.trim(),
                        timestamp: new Date()
                    }
                    transcriptRef.current.push(newEntry)
                    onTranscriptUpdateRef.current?.([...transcriptRef.current])

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
        if (!showIdleNotice) return null

        if (isUnsupportedBrowser) {
            return (
                <div style={{
                    position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 80, padding: '8px 20px',
                    background: 'rgba(10, 11, 15, 0.94)', backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                    textAlign: 'center', pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <IconInfo size={15} color="#f59e0b" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fde68a' }}>
                        Live speech recognition requires Chrome or Edge. Remote captions from other users will still appear.
                    </span>
                </div>
            )
        }

        return (
            <div style={{
                position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
                zIndex: 80, padding: '8px 18px',
                background: 'rgba(10, 11, 15, 0.94)', backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isLocalMuted ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(52, 211, 153, 0.4)',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                textAlign: 'center',
                display: 'flex', alignItems: 'center', gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isLocalMuted ? (
                        <>
                            <IconMicOff size={14} color="#f59e0b" />
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0' }}>
                                Mic Muted
                            </span>
                        </>
                    ) : (
                        <>
                            <IconMic size={14} color="#34d399" />
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0' }}>
                                Captions Active — Listening...
                            </span>
                        </>
                    )}
                </div>

                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />

                {/* Subtitle Translation Language Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 700 }}>
                        SUBTITLES:
                    </span>
                    <select
                        value={targetLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {CAPTION_LANGUAGES.map(l => (
                            <option key={l.code} value={l.code} style={{ background: '#18181b', color: '#fff' }}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* AI Voice Dubbing Toggle Button */}
                {targetLanguage !== 'original' && (
                    <>
                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
                        <button
                            type="button"
                            onClick={handleToggleVoiceDubbing}
                            title={isVoiceDubbingEnabled ? "Disable AI Voice Dubbing" : "Enable AI Voice Dubbing (Spoken TTS Audio)"}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isVoiceDubbingEnabled ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                                border: isVoiceDubbingEnabled ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.18)',
                                color: isVoiceDubbingEnabled ? '#38bdf8' : '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            <span>🔊</span>
                            <span>{isVoiceDubbingEnabled ? 'Voice Dub ON' : 'Voice Dub OFF'}</span>
                        </button>
                    </>
                )}
            </div>
        )
    }

    return (
        <div style={{
            position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
            zIndex: 80, maxWidth: '88%', minWidth: 'min(90vw, 440px)', padding: '10px 20px',
            background: 'rgba(10, 11, 15, 0.95)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(52, 211, 153, 0.45)', borderRadius: 'var(--radius-lg, 14px)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
            display: 'flex', flexDirection: 'column', gap: 6,
            pointerEvents: 'auto'
        }}>
            {/* Top row: Speaker & Language selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#34d399',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        padding: '1px 8px',
                        borderRadius: 9999,
                        whiteSpace: 'nowrap'
                    }}>
                        {currentSpeaker || 'Speaker'}
                    </span>
                    {targetLanguage !== 'original' && (
                        <span style={{ fontSize: '0.7rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            • Subtitles Translated ({CAPTION_LANGUAGES.find(l => l.code === targetLanguage)?.label.split(' ')[0]})
                        </span>
                    )}
                </div>

                {/* Translation & Dubbing Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconGlobe size={13} color="#38bdf8" />
                            <span>TRANSLATE:</span>
                        </span>
                        <select
                            value={targetLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                borderRadius: 6,
                                color: '#fff',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '1px 6px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {CAPTION_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code} style={{ background: '#18181b', color: '#fff' }}>
                                    {l.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {targetLanguage !== 'original' && (
                        <button
                            type="button"
                            onClick={handleToggleVoiceDubbing}
                            title={isVoiceDubbingEnabled ? "Disable AI Voice Dubbing" : "Enable AI Voice Dubbing (Spoken TTS Audio)"}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: isVoiceDubbingEnabled ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                                border: isVoiceDubbingEnabled ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.18)',
                                color: isVoiceDubbingEnabled ? '#38bdf8' : '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            <span>🔊</span>
                            <span>{isVoiceDubbingEnabled ? 'Dubbing ON' : 'Dubbing OFF'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Original Spoken Text */}
            <div style={{
                fontSize: targetLanguage !== 'original' ? '0.8125rem' : '0.9375rem',
                color: targetLanguage !== 'original' ? 'var(--color-text-muted)' : '#fff',
                fontWeight: 500,
                lineHeight: 1.4
            }}>
                {displayText}
            </div>

            {/* Real-time Translated Subtitles Line */}
            {targetLanguage !== 'original' && (
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#38bdf8',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                }}>
                    <span>{translatedText || (isTranslating ? 'Translating...' : displayText)}</span>
                    {isVoiceDubbingEnabled && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.625rem',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 800,
                            flexShrink: 0
                        }}>
                            AI Voice Dub
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
