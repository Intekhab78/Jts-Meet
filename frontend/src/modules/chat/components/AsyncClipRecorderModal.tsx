import React, { useState, useRef, useEffect } from 'react'

interface AsyncClipRecorderModalProps {
    isOpen: boolean
    onClose: () => void
    onClipUploaded?: (clip: { _id: string; title: string; videoUrl: string; duration: number }) => void
    token: string
    userPlan?: string // 'free' | 'pro' | 'enterprise'
    channelId?: string
    recipientId?: string
}

export const AsyncClipRecorderModal: React.FC<AsyncClipRecorderModalProps> = ({
    isOpen,
    onClose,
    onClipUploaded,
    token,
    userPlan = 'free',
    channelId,
    recipientId
}) => {
    const isFreePlan = userPlan.toLowerCase() === 'free'
    const maxDurationSec = isFreePlan ? 120 : 600 // 2 min for Free, 10 min for Pro/Enterprise

    const [recordMode, setRecordMode] = useState<'camera' | 'screen' | 'pip'>('camera')
    const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle')
    const [duration, setDuration] = useState(0)
    const [clipTitle, setClipTitle] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null)

    const videoPreviewRef = useRef<HTMLVideoElement>(null)
    const playbackReviewRef = useRef<HTMLVideoElement>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<any>(null)

    // Stop and cleanup active stream
    const cleanupStream = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop())
            mediaStreamRef.current = null
        }
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }

    // Start stream preview when modal opens or mode changes
    useEffect(() => {
        if (!isOpen) {
            cleanupStream()
            setRecordingState('idle')
            setDuration(0)
            setRecordedBlob(null)
            if (recordedUrl) URL.revokeObjectURL(recordedUrl)
            setRecordedUrl(null)
            return
        }

        let isMounted = true

        const initPreview = async () => {
            cleanupStream()
            try {
                let stream: MediaStream
                if (recordMode === 'camera') {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: true
                    })
                } else {
                    stream = await navigator.mediaDevices.getDisplayMedia({
                        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
                        audio: true
                    })
                }

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }

                mediaStreamRef.current = stream
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = stream
                    videoPreviewRef.current.muted = true
                    videoPreviewRef.current.play().catch(() => {})
                }
            } catch (err: any) {
                console.warn('Failed to access media device for clip recording:', err)
            }
        }

        if (recordingState === 'idle') {
            initPreview()
        }

        return () => {
            isMounted = false
            cleanupStream()
        }
    }, [isOpen, recordMode])

    // Timer handler
    useEffect(() => {
        if (recordingState === 'recording') {
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev + 1 >= maxDurationSec) {
                        stopRecording()
                        return maxDurationSec
                    }
                    return prev + 1
                })
            }, 1000)
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [recordingState, maxDurationSec])

    const startRecording = () => {
        if (!mediaStreamRef.current) return
        chunksRef.current = []
        try {
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                ? 'video/webm;codecs=vp9,opus'
                : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                ? 'video/webm;codecs=vp8,opus'
                : 'video/webm'

            const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType })
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType })
                setRecordedBlob(blob)
                const url = URL.createObjectURL(blob)
                setRecordedUrl(url)
                setRecordingState('review')
                cleanupStream()
            }

            recorder.start(1000)
            mediaRecorderRef.current = recorder
            setRecordingState('recording')
            setDuration(0)
            setUploadError(null)
        } catch (err: any) {
            setUploadError(err.message || 'Failed to start recording')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
    }

    const handleRetake = () => {
        if (recordedUrl) URL.revokeObjectURL(recordedUrl)
        setRecordedUrl(null)
        setRecordedBlob(null)
        setRecordingState('idle')
        setDuration(0)
    }

    const handleUpload = async () => {
        if (!recordedBlob) return
        setIsUploading(true)
        setUploadError(null)

        try {
            const formData = new FormData()
            formData.append('clip', recordedBlob, `clip-${Date.now()}.webm`)
            formData.append('title', clipTitle.trim() || `Video Clip (${new Date().toLocaleDateString()})`)
            formData.append('duration', String(duration))
            if (channelId) formData.append('channelId', channelId)
            if (recipientId) formData.append('recipientId', recipientId)

            const API_BASE = (import.meta.env.VITE_API_URL as string) || (window.location.hostname === 'localhost' ? 'http://localhost:4000' : '')
            const res = await fetch(`${API_BASE}/api/clips/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Upload failed')
            }

            if (onClipUploaded) {
                onClipUploaded(json.data)
            }
            onClose()
        } catch (err: any) {
            setUploadError(err.message || 'Failed to save clip')
        } finally {
            setIsUploading(false)
        }
    }

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
            <div style={{
                background: '#0e1017', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16, width: '100%', maxWidth: 720, overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                                Zoom Clips &bull; Async Video Recorder
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Record high-definition screen & camera video messages to share instantly
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Plan Tier Badge */}
                        <div style={{
                            padding: '3px 9px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700,
                            background: isFreePlan ? 'rgba(148, 163, 184, 0.15)' : 'rgba(168, 85, 247, 0.2)',
                            color: isFreePlan ? '#94a3b8' : '#c084fc',
                            border: `1px solid ${isFreePlan ? 'rgba(148, 163, 184, 0.25)' : 'rgba(168, 85, 247, 0.4)'}`
                        }}>
                            {isFreePlan ? 'Free Tier: Max 2 Mins' : 'Pro Tier: Up to 10 Mins HD'}
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent', border: 'none', color: '#94a3b8',
                                cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stage Area */}
                <div style={{ position: 'relative', background: '#000', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {recordingState === 'review' && recordedUrl ? (
                        <video
                            ref={playbackReviewRef}
                            src={recordedUrl}
                            controls
                            autoPlay
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <video
                            ref={videoPreviewRef}
                            playsInline
                            style={{
                                width: '100%', height: '100%',
                                objectFit: recordMode === 'camera' ? 'cover' : 'contain',
                                transform: recordMode === 'camera' ? 'scaleX(-1)' : 'none'
                            }}
                        />
                    )}

                    {/* Live Recording Pulsing Header */}
                    {recordingState === 'recording' && (
                        <div style={{
                            position: 'absolute', top: 16, left: 16,
                            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
                            padding: '6px 14px', borderRadius: 999,
                            display: 'flex', alignItems: 'center', gap: 10,
                            border: '1px solid rgba(239, 68, 68, 0.4)'
                        }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
                                animation: 'pulse 1.5s infinite'
                            }} />
                            <span style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                REC {formatTime(duration)} / {formatTime(maxDurationSec)}
                            </span>
                        </div>
                    )}

                    {/* Source Selector Bar (When Idle) */}
                    {recordingState === 'idle' && (
                        <div style={{
                            position: 'absolute', top: 16,
                            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
                            padding: '4px 6px', borderRadius: 10,
                            display: 'flex', gap: 4, border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <button
                                onClick={() => setRecordMode('camera')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', borderRadius: 7, border: 'none',
                                    background: recordMode === 'camera' ? '#6366f1' : 'transparent',
                                    color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M23 7l-7 5 7 5V7z" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                                Camera
                            </button>
                            <button
                                onClick={() => setRecordMode('screen')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', borderRadius: 7, border: 'none',
                                    background: recordMode === 'screen' ? '#6366f1' : 'transparent',
                                    color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                                Screen Share
                            </button>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {uploadError && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid #ef4444',
                        padding: '8px 16px', color: '#fca5a5', fontSize: '0.8125rem'
                    }}>
                        {uploadError}
                    </div>
                )}

                {/* Control Footer */}
                <div style={{
                    padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: '#0b0d13', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    {recordingState === 'review' ? (
                        <>
                            <div style={{ flex: 1, marginRight: 16 }}>
                                <input
                                    type="text"
                                    placeholder="Enter clip title (e.g. Sprint blocker walkthrough)..."
                                    value={clipTitle}
                                    onChange={e => setClipTitle(e.target.value)}
                                    style={{
                                        width: '100%', background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 8,
                                        padding: '8px 12px', color: '#fff', fontSize: '0.8125rem'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                    onClick={handleRetake}
                                    disabled={isUploading}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8,
                                        background: 'rgba(255, 255, 255, 0.08)', border: 'none',
                                        color: '#cbd5e1', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Retake Clip
                                </button>

                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    style={{
                                        padding: '8px 18px', borderRadius: 8,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        border: 'none', color: '#fff', fontSize: '0.8125rem', fontWeight: 700,
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, opacity: isUploading ? 0.7 : 1
                                    }}
                                >
                                    {isUploading ? (
                                        <>Uploading Clip...</>
                                    ) : (
                                        <>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            Save & Share Clip
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : recordingState === 'recording' ? (
                        <>
                            <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                Recording audio and video stream...
                            </div>
                            <button
                                onClick={stopRecording}
                                style={{
                                    padding: '10px 24px', borderRadius: 999,
                                    background: '#ef4444', border: 'none', color: '#fff',
                                    fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#fff' }} />
                                Stop Recording
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                Microphone and preview stream ready
                            </div>
                            <button
                                onClick={startRecording}
                                style={{
                                    padding: '10px 24px', borderRadius: 999,
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    border: 'none', color: '#fff',
                                    fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.35)'
                                }}
                            >
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff' }} />
                                Start Recording Clip
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
