import React, { useEffect, useState, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { API_BASE } from '../../../config'
import { IconInfo, IconMic, IconMicOff, IconGlobe } from '../../../components/common/Icons'

export interface CaptionLanguageOption {
    code: string
    label: string
    flag?: string
}

export interface CaptionLanguageGroup {
    group: string
    languages: CaptionLanguageOption[]
}

export const CAPTION_LANGUAGE_GROUPS: CaptionLanguageGroup[] = [
    {
        group: 'Standard',
        languages: [
            { code: 'original', label: 'Original Audio (Off)' },
            { code: 'en', label: 'English' },
        ]
    },
    {
        group: 'Indian Regional Languages',
        languages: [
            { code: 'hi', label: 'Hindi (हिंदी)' },
            { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
            { code: 'ur', label: 'Urdu (اردو)' },
            { code: 'bn', label: 'Bengali (বাংলা)' },
            { code: 'mr', label: 'Marathi (मराठी)' },
            { code: 'te', label: 'Telugu (తెలుగు)' },
            { code: 'ta', label: 'Tamil (தமிழ்)' },
            { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
            { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
            { code: 'ml', label: 'Malayalam (മലയാളം)' },
        ]
    },
    {
        group: 'Middle East & Africa',
        languages: [
            { code: 'ar', label: 'Arabic (العربية)' },
            { code: 'fa', label: 'Persian (فارسی)' },
            { code: 'tr', label: 'Turkish (Türkçe)' },
            { code: 'he', label: 'Hebrew (עברית)' },
            { code: 'sw', label: 'Swahili (Kiswahili)' },
        ]
    },
    {
        group: 'East & Southeast Asia',
        languages: [
            { code: 'zh', label: 'Chinese (中文)' },
            { code: 'ja', label: 'Japanese (日本語)' },
            { code: 'ko', label: 'Korean (한국어)' },
            { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
            { code: 'th', label: 'Thai (ไทย)' },
            { code: 'id', label: 'Indonesian (Bahasa)' },
            { code: 'ms', label: 'Malay (Bahasa Melayu)' },
            { code: 'tl', label: 'Filipino (Tagalog)' },
        ]
    },
    {
        group: 'Europe & Americas',
        languages: [
            { code: 'es', label: 'Spanish (Español)' },
            { code: 'fr', label: 'French (Français)' },
            { code: 'de', label: 'German (Deutsch)' },
            { code: 'it', label: 'Italian (Italiano)' },
            { code: 'pt', label: 'Portuguese (Português)' },
            { code: 'ru', label: 'Russian (Русский)' },
            { code: 'nl', label: 'Dutch (Nederlands)' },
            { code: 'pl', label: 'Polish (Polski)' },
            { code: 'sv', label: 'Swedish (Svenska)' },
            { code: 'uk', label: 'Ukrainian (Українська)' },
            { code: 'el', label: 'Greek (Ελληνικά)' },
            { code: 'cs', label: 'Czech (Čeština)' },
            { code: 'ro', label: 'Romanian (Română)' },
            { code: 'hu', label: 'Hungarian (Magyar)' },
        ]
    }
]

export const CAPTION_LANGUAGES = CAPTION_LANGUAGE_GROUPS.flatMap(g => g.languages)

const LANG_VOICE_MAP: Record<string, string> = {
    original: 'en-US',
    en: 'en-US',
    hi: 'hi-IN',
    es: 'es-ES',
    ar: 'ar-SA',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ru: 'ru-RU',
    pt: 'pt-BR',
    ur: 'ur-PK',
    bn: 'bn-IN',
    mr: 'mr-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    fa: 'fa-IR',
    tr: 'tr-TR',
    he: 'he-IL',
    sw: 'sw-KE',
    ko: 'ko-KR',
    vi: 'vi-VN',
    th: 'th-TH',
    id: 'id-ID',
    ms: 'ms-MY',
    tl: 'fil-PH',
    it: 'it-IT',
    nl: 'nl-NL',
    pl: 'pl-PL',
    sv: 'sv-SE',
    uk: 'uk-UA',
    el: 'el-GR',
    cs: 'cs-CZ',
    ro: 'ro-RO',
    hu: 'hu-HU'
}

const clientTranslationCache = new Map<string, string>()

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
    onClose?: () => void
}

export function MeetingCaptionsBanner({ 
    isEnabled, 
    speakerName, 
    meetingId,
    socket,
    isLocalMuted,
    onTranscriptUpdate,
    onClose
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
    const [voiceDubbingVolume] = useState<number>(() => {
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
    const translationAbortControllerRef = useRef<AbortController | null>(null)

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

    // Real-time Ultra-Fast Translation Pipeline
    useEffect(() => {
        const text = displayText.trim()
        if (!text || targetLanguage === 'original') {
            setTranslatedText('')
            setIsTranslating(false)
            return
        }

        const cacheKey = `${targetLanguage}:${text.toLowerCase()}`
        if (clientTranslationCache.has(cacheKey)) {
            setTranslatedText(clientTranslationCache.get(cacheKey)!)
            setIsTranslating(false)
            return
        }

        if (translationAbortControllerRef.current) {
            translationAbortControllerRef.current.abort()
        }
        const abortController = new AbortController()
        translationAbortControllerRef.current = abortController

        setIsTranslating(true)
        // 110ms debounce for near-instant responsive subtitles
        const timer = setTimeout(async () => {
            try {
                const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token')) : null
                const res = await fetch(`${API_BASE}/api/ai/translate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ text, targetLang: targetLanguage }),
                    signal: abortController.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.data?.translated) {
                        const translated = data.data.translated.trim()
                        clientTranslationCache.set(cacheKey, translated)
                        setTranslatedText(translated)
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn('[Captions Translation] Error:', err)
                }
            } finally {
                setIsTranslating(false)
            }
        }, 110)

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

        // Prevent echo if current speaker is local user
        const isSelf = currentSpeaker.toLowerCase() === 'you' || 
                       (speakerNameRef.current && currentSpeaker.toLowerCase() === speakerNameRef.current.toLowerCase())
        if (isSelf) return

        try {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(translatedText)
            utterance.lang = LANG_VOICE_MAP[targetLanguage] || 'en-US'
            utterance.volume = voiceDubbingVolume
            utterance.rate = 1.05
            window.speechSynthesis.speak(utterance)
        } catch (err) {
            console.warn('[AI Voice Dubbing] Error:', err)
        }
    }, [translatedText, isVoiceDubbingEnabled, voiceDubbingVolume, targetLanguage, currentSpeaker])

    // Cleanup speech synthesis
    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    // Local Speech Recognition lifecycle
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
            // Enterprise Cross-Browser Fallback for Safari/Firefox/iOS: Server-side AI transcription
            setIsUnsupportedBrowser(false)
            let fallbackRecorder: MediaRecorder | null = null
            let audioStream: MediaStream | null = null
            let isCancelled = false

            navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
                audioStream = stream
                if (isCancelled || !isEnabled || isLocalMuted) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }

                try {
                    let mimeType = 'audio/webm'
                    if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported('audio/webm')) {
                        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
                    }
                    fallbackRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
                } catch {
                    try {
                        fallbackRecorder = new MediaRecorder(stream)
                    } catch (_) {}
                }

                if (!fallbackRecorder) return

                fallbackRecorder.ondataavailable = async (e) => {
                    if (e.data && e.data.size > 2000 && !isLocalMuted) {
                        try {
                            const reader = new FileReader()
                            reader.onloadend = async () => {
                                const base64data = (reader.result as string)?.split(',')[1]
                                if (!base64data) return
                                const res = await fetch(`${API_BASE}/api/ai/transcribe`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ audio: base64data, mimeType: fallbackRecorder?.mimeType || 'audio/webm' })
                                })
                                const resData = await res.json()
                                if (resData?.success && resData?.data?.text) {
                                    const text = resData.data.text.trim()
                                    if (text) {
                                        setCurrentSpeaker(speakerNameRef.current || 'You')
                                        setDisplayText(text)
                                        if (socketRef.current && socketRef.current.connected) {
                                            socketRef.current.emit('meeting:caption', {
                                                meetingId: meetingIdRef.current,
                                                speakerName: speakerNameRef.current || 'You',
                                                text,
                                                isFinal: true
                                            })
                                        }
                                        const newEntry: CaptionEntry = {
                                            speaker: speakerNameRef.current || 'You',
                                            text,
                                            timestamp: new Date()
                                        }
                                        transcriptRef.current.push(newEntry)
                                        onTranscriptUpdateRef.current?.([...transcriptRef.current])
                                        if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                                        clearTimerRef.current = setTimeout(() => setDisplayText(''), 4000)
                                    }
                                }
                            }
                            reader.readAsDataURL(e.data)
                        } catch (recErr) {
                            console.warn('[AI Captions] Fallback error:', recErr)
                        }
                    }
                }

                fallbackRecorder.start(3500)
            }).catch(() => {
                setIsUnsupportedBrowser(true)
            })

            return () => {
                isCancelled = true
                if (fallbackRecorder && fallbackRecorder.state !== 'inactive') {
                    try { fallbackRecorder.stop() } catch (_) {}
                }
                if (audioStream) {
                    audioStream.getTracks().forEach(t => t.stop())
                }
            }
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

    const selectedLang = CAPTION_LANGUAGES.find(l => l.code === targetLanguage)
    const selectedLangLabel = targetLanguage === 'original' ? 'Original Audio' : (selectedLang?.label || targetLanguage.toUpperCase())

    // Idle Notice: Clean, compact pill when no speech is currently active
    if (!displayText) {

        if (isUnsupportedBrowser) {
            return (
                <div style={{
                    position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 80, padding: '6px 14px',
                    background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '9999px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    pointerEvents: 'none'
                }}>
                    <IconInfo size={13} color="#f59e0b" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fde68a' }}>
                        Live voice recognition requires Chrome or Edge.
                    </span>
                </div>
            )
        }

        return (
            <div style={{
                position: 'absolute',
                bottom: 84,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 80,
                padding: '4px 6px 4px 12px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                userSelect: 'none'
            }}>
                <style>{`
                    @keyframes liveListeningPulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
                        70% { transform: scale(1.05); box-shadow: 0 0 0 5px rgba(52, 211, 153, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
                    }
                    @keyframes eqWave1 { 0%, 100% { height: 4px; } 50% { height: 11px; } }
                    @keyframes eqWave2 { 0%, 100% { height: 10px; } 50% { height: 4px; } }
                    @keyframes eqWave3 { 0%, 100% { height: 5px; } 50% { height: 12px; } }
                `}</style>

                {/* Status Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    {isLocalMuted ? (
                        <>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'rgba(245, 158, 11, 0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <IconMicOff size={11} color="#f59e0b" />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1' }}>Mic Muted</span>
                        </>
                    ) : (
                        <>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#10b981',
                                animation: 'liveListeningPulse 2s infinite'
                            }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>Listening...</span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 12, marginLeft: 1 }}>
                                <span style={{ width: 2, background: '#10b981', borderRadius: 1, animation: 'eqWave1 1.2s ease-in-out infinite' }} />
                                <span style={{ width: 2, background: '#10b981', borderRadius: 1, animation: 'eqWave2 1s ease-in-out infinite' }} />
                                <span style={{ width: 2, background: '#10b981', borderRadius: 1, animation: 'eqWave3 1.4s ease-in-out infinite' }} />
                            </div>
                        </>
                    )}
                </div>

                <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

                {/* Professional Language Selector Pill */}
                <div
                    style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 9999,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                >
                    <IconGlobe size={12} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        maxWidth: 130,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {selectedLangLabel}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                    </svg>

                    {/* Seamless Native Dropdown */}
                    <select
                        value={targetLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none'
                        }}
                    >
                        {CAPTION_LANGUAGE_GROUPS.map(grp => (
                            <optgroup key={grp.group} label={grp.group} style={{ background: '#0f172a', color: '#94a3b8' }}>
                                {grp.languages.map(l => (
                                    <option key={l.code} value={l.code} style={{ background: '#0f172a', color: '#fff' }}>
                                        {l.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* AI Dubbing Toggle if not original */}
                {targetLanguage !== 'original' && (
                    <button
                        type="button"
                        onClick={handleToggleVoiceDubbing}
                        title={isVoiceDubbingEnabled ? "Disable AI Spoken Dubbing" : "Enable AI Spoken Dubbing"}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '3px 7px',
                            borderRadius: 9999,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: isVoiceDubbingEnabled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                            border: isVoiceDubbingEnabled ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: isVoiceDubbingEnabled ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span>🔊</span>
                        <span>{isVoiceDubbingEnabled ? 'Dub ON' : 'Dub'}</span>
                    </button>
                )}

                {/* Close Button */}
                <button
                    type="button"
                    onClick={() => {
                        if (onClose) {
                            onClose()
                        } else {
                            setShowIdleNotice(false)
                        }
                    }}
                    title="Hide Captions"
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.45)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff'
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'
                        e.currentTarget.style.background = 'transparent'
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        )
    }

    const isSelf = currentSpeaker.toLowerCase() === 'you' || 
                   (speakerNameRef.current && currentSpeaker.toLowerCase() === speakerNameRef.current.toLowerCase())

    // Active Captions: Sleek, compact, glassmorphic subtitle card
    return (
        <div style={{
            position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)',
            zIndex: 80,
            width: 'auto',
            maxWidth: 'min(92vw, 560px)',
            minWidth: 'min(92vw, 320px)',
            padding: '8px 14px',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'auto'
        }}>
            {/* Top row: Speaker Badge + Wave + Language Selector + Dubbing + Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                {/* Speaker & Audio Wave */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isSelf ? '#34d399' : '#818cf8',
                        background: isSelf ? 'rgba(52, 211, 153, 0.12)' : 'rgba(99, 102, 241, 0.14)',
                        border: isSelf ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 120
                    }}>
                        {currentSpeaker || 'Speaker'}
                    </span>

                    {/* Audio wave animation */}
                    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', height: 10 }}>
                        <span style={{ width: 2, height: 7, background: isSelf ? '#34d399' : '#818cf8', borderRadius: 1 }} />
                        <span style={{ width: 2, height: 11, background: isSelf ? '#34d399' : '#818cf8', borderRadius: 1 }} />
                        <span style={{ width: 2, height: 6, background: isSelf ? '#34d399' : '#818cf8', borderRadius: 1 }} />
                    </span>
                </div>

                {/* Right: Language Selector + Dubbing Toggle + Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {/* Modern Dropdown */}
                    <div
                        style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 7px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 9999,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <IconGlobe size={11} color="#38bdf8" style={{ flexShrink: 0 }} />
                        <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: '#f8fafc',
                            maxWidth: 110,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {selectedLangLabel}
                        </span>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <select
                            value={targetLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                appearance: 'none',
                                WebkitAppearance: 'none'
                            }}
                        >
                            {CAPTION_LANGUAGE_GROUPS.map(grp => (
                                <optgroup key={grp.group} label={grp.group} style={{ background: '#0f172a', color: '#94a3b8' }}>
                                    {grp.languages.map(l => (
                                        <option key={l.code} value={l.code} style={{ background: '#0f172a', color: '#fff' }}>
                                            {l.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* AI Dubbing Toggle */}
                    {targetLanguage !== 'original' && (
                        <button
                            type="button"
                            onClick={handleToggleVoiceDubbing}
                            title={isVoiceDubbingEnabled ? "Disable AI Spoken Dubbing" : "Enable AI Spoken Dubbing"}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '2px 6px',
                                borderRadius: 9999,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: isVoiceDubbingEnabled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                border: isVoiceDubbingEnabled ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: isVoiceDubbingEnabled ? '#38bdf8' : '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span>🔊</span>
                            <span>{isVoiceDubbingEnabled ? 'Dub ON' : 'Dub'}</span>
                        </button>
                    )}

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (onClose) {
                                onClose()
                            } else {
                                setDisplayText('')
                            }
                        }}
                        title="Close Captions"
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.45)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff'
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Subtitles text display */}
            <div style={{ marginTop: 1 }}>
                {targetLanguage === 'original' ? (
                    <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        lineHeight: 1.35,
                        wordBreak: 'break-word'
                    }}>
                        {displayText}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Real-time translated line */}
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: '#38bdf8',
                            lineHeight: 1.35,
                            wordBreak: 'break-word'
                        }}>
                            {translatedText || (isTranslating ? (
                                <span style={{ opacity: 0.65, fontStyle: 'italic', fontSize: '0.78rem' }}>Translating...</span>
                            ) : displayText)}
                        </div>
                        {/* Original line beneath */}
                        <div style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255, 255, 255, 0.42)',
                            lineHeight: 1.25,
                            wordBreak: 'break-word'
                        }}>
                            {displayText}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
