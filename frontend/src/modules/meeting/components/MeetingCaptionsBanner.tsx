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
            { code: 'original', label: 'Original Audio (Off)', flag: '🎙️' },
            { code: 'en', label: 'English', flag: '🇬🇧' },
        ]
    },
    {
        group: 'Indian Regional Languages',
        languages: [
            { code: 'hi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
            { code: 'ur', label: 'Urdu (اردو)', flag: '🇮🇳' },
            { code: 'bn', label: 'Bengali (বাংলা)', flag: '🇮🇳' },
            { code: 'mr', label: 'Marathi (मराठी)', flag: '🇮🇳' },
            { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
            { code: 'ta', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
            { code: 'gu', label: 'Gujarati (ગુજરાતી)', flag: '🇮🇳' },
            { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
            { code: 'ml', label: 'Malayalam (മലയാളം)', flag: '🇮🇳' },
            { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🇮🇳' },
        ]
    },
    {
        group: 'Middle East & Africa',
        languages: [
            { code: 'ar', label: 'Arabic (العربية)', flag: '🇦🇪' },
            { code: 'fa', label: 'Persian (فارسی)', flag: '🇮🇷' },
            { code: 'tr', label: 'Turkish (Türkçe)', flag: '🇹🇷' },
            { code: 'he', label: 'Hebrew (עברית)', flag: '🇮🇱' },
            { code: 'sw', label: 'Swahili (Kiswahili)', flag: '🇰🇪' },
        ]
    },
    {
        group: 'East & Southeast Asia',
        languages: [
            { code: 'zh', label: 'Chinese (中文)', flag: '🇨🇳' },
            { code: 'ja', label: 'Japanese (日本語)', flag: '🇯🇵' },
            { code: 'ko', label: 'Korean (한국어)', flag: '🇰🇷' },
            { code: 'vi', label: 'Vietnamese (Tiếng Việt)', flag: '🇻🇳' },
            { code: 'th', label: 'Thai (ไทย)', flag: '🇹🇭' },
            { code: 'id', label: 'Indonesian (Bahasa)', flag: '🇮🇩' },
            { code: 'ms', label: 'Malay (Bahasa Melayu)', flag: '🇲🇾' },
            { code: 'tl', label: 'Filipino (Tagalog)', flag: '🇵🇭' },
        ]
    },
    {
        group: 'Europe & Americas',
        languages: [
            { code: 'es', label: 'Spanish (Español)', flag: '🇪🇸' },
            { code: 'fr', label: 'French (Français)', flag: '🇫🇷' },
            { code: 'de', label: 'German (Deutsch)', flag: '🇩🇪' },
            { code: 'it', label: 'Italian (Italiano)', flag: '🇮🇹' },
            { code: 'pt', label: 'Portuguese (Português)', flag: '🇧🇷' },
            { code: 'ru', label: 'Russian (Русский)', flag: '🇷🇺' },
            { code: 'nl', label: 'Dutch (Nederlands)', flag: '🇳🇱' },
            { code: 'pl', label: 'Polish (Polski)', flag: '🇵🇱' },
            { code: 'sv', label: 'Swedish (Svenska)', flag: '🇸🇪' },
            { code: 'uk', label: 'Ukrainian (Українська)', flag: '🇺🇦' },
            { code: 'el', label: 'Greek (Ελληνικά)', flag: '🇬🇷' },
            { code: 'cs', label: 'Czech (Čeština)', flag: '🇨🇿' },
            { code: 'ro', label: 'Romanian (Română)', flag: '🇷🇴' },
            { code: 'hu', label: 'Hungarian (Magyar)', flag: '🇭🇺' },
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
    const idleNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const translationAbortControllerRef = useRef<AbortController | null>(null)

    const speakerNameRef = useRef(speakerName)
    const meetingIdRef = useRef(meetingId)
    const socketRef = useRef(socket)
    const onTranscriptUpdateRef = useRef(onTranscriptUpdate)

    // Auto-hide idle notice after 3.5 seconds of silence
    useEffect(() => {
        if (isEnabled) {
            setShowIdleNotice(true)
            if (idleNoticeTimerRef.current) clearTimeout(idleNoticeTimerRef.current)
            idleNoticeTimerRef.current = setTimeout(() => {
                setShowIdleNotice(false)
            }, 3500)
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

    // Idle Notice: Clean, compact pill when no speech is currently active
    if (!displayText) {
        if (!showIdleNotice) return null

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
                position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)',
                zIndex: 80, padding: '5px 12px',
                background: 'rgba(10, 14, 23, 0.88)', backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'flex', alignItems: 'center', gap: 8,
                pointerEvents: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isLocalMuted ? (
                        <>
                            <IconMicOff size={12} color="#f59e0b" />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0' }}>Mic Muted</span>
                        </>
                    ) : (
                        <>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0' }}>Listening...</span>
                        </>
                    )}
                </div>

                <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.14)' }} />

                {/* Compact Language Selector */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    padding: '1px 5px'
                }}>
                    <IconGlobe size={11} color="#38bdf8" style={{ marginRight: 3, flexShrink: 0 }} />
                    <select
                        value={targetLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#e2e8f0',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                            maxWidth: 120
                        }}
                    >
                        {CAPTION_LANGUAGE_GROUPS.map(grp => (
                            <optgroup key={grp.group} label={grp.group} style={{ background: '#0f172a', color: '#94a3b8' }}>
                                {grp.languages.map(l => (
                                    <option key={l.code} value={l.code} style={{ background: '#0f172a', color: '#fff' }}>
                                        {l.flag ? `${l.flag} ` : ''}{l.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
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
            maxWidth: 'min(92vw, 540px)',
            minWidth: 'min(92vw, 320px)',
            padding: '7px 14px',
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '13px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            pointerEvents: 'auto'
        }}>
            {/* Top row: Speaker Badge + Wave + Language Selector + Dubbing */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                {/* Speaker & Audio Wave */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: isSelf ? '#34d399' : '#818cf8',
                        background: isSelf ? 'rgba(52, 211, 153, 0.12)' : 'rgba(99, 102, 241, 0.14)',
                        border: isSelf ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                        padding: '1.5px 7px',
                        borderRadius: 9999,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 120
                    }}>
                        {currentSpeaker || 'Speaker'}
                    </span>

                    {/* Audio wave animation */}
                    <span style={{ display: 'inline-flex', gap: 1.5, alignItems: 'center', height: 10 }}>
                        <span style={{ width: 2, height: 7, background: isSelf ? '#34d399' : '#818cf8', borderRadius: 1 }} />
                        <span style={{ width: 2, height: 11, background: isSelf ? '#34d399' : '#818cf8', borderRadius: 1 }} />
                        <span style={{ width: 2, height: 6, background: isSelf ? '#34d399' : '#818cf8', borderRadius: 1 }} />
                    </span>
                </div>

                {/* Right: Language Selector + Dubbing Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {/* Modern Dropdown */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 6,
                        padding: '1px 5px'
                    }}>
                        <IconGlobe size={11} color="#38bdf8" style={{ marginRight: 3, flexShrink: 0 }} />
                        <select
                            value={targetLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#e2e8f0',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                outline: 'none',
                                cursor: 'pointer',
                                maxWidth: 120
                            }}
                        >
                            {CAPTION_LANGUAGE_GROUPS.map(grp => (
                                <optgroup key={grp.group} label={grp.group} style={{ background: '#0f172a', color: '#94a3b8' }}>
                                    {grp.languages.map(l => (
                                        <option key={l.code} value={l.code} style={{ background: '#0f172a', color: '#fff' }}>
                                            {l.flag ? `${l.flag} ` : ''}{l.label}
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
                                borderRadius: 6,
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
