import { useCallback, useEffect, useRef, useState } from 'react'
import { noiseCancellationService } from '../services/noiseCancellation.service'

interface UseMediaDevicesResult {
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    mediaLoading: boolean
    mediaError: string | null
    requestMedia: () => Promise<void>
    stopMedia: () => void
    replaceLocalStream: (stream: MediaStream) => void
    restoreCameraStream: () => void
}

export function useMediaDevices(): UseMediaDevicesResult {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [mediaLoading, setMediaLoading] = useState(false)
    const [mediaError, setMediaError] = useState<string | null>(null)

    const localStreamRef = useRef<MediaStream | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)
    const isRequestActiveRef = useRef<boolean>(false)

    localStreamRef.current = localStream
    cameraStreamRef.current = cameraStream

    const stopMedia = useCallback(() => {
        isRequestActiveRef.current = false
        noiseCancellationService.cleanup()
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop()
                } catch { }
            })
        }
        if (cameraStreamRef.current && cameraStreamRef.current !== localStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop()
                } catch { }
            })
        }
        localStreamRef.current = null
        cameraStreamRef.current = null
        setLocalStream(null)
        setCameraStream(null)
        setMediaLoading(false)
    }, [])

    const requestMedia = useCallback(async () => {
        // If already streaming and has live tracks, do not re-request
        const currentTracks = localStreamRef.current?.getTracks() || []
        const hasLiveTracks = currentTracks.length > 0 && currentTracks.some((t) => t.readyState === 'live')
        if (hasLiveTracks && localStreamRef.current) {
            return
        }

        isRequestActiveRef.current = true
        setMediaLoading(true)
        setMediaError(null)

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // Chrome WebRTC native voice clarity flags
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true
                } as any,
                video: {
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    frameRate: { ideal: 30, max: 60 },
                    aspectRatio: { ideal: 1.7777777778 }
                }
            })
            if (!isRequestActiveRef.current) {
                // If stopMedia was called while awaiting getUserMedia, shut down tracks immediately
                stream.getTracks().forEach(track => {
                    try { track.stop() } catch {}
                })
                return
            }

            // Apply AI Voice Isolation DSP pipeline to raw microphone track
            const rawAudioTrack = stream.getAudioTracks()[0]
            if (rawAudioTrack) {
                const cleanAudioTrack = noiseCancellationService.processAudioTrack(rawAudioTrack, 'high')
                stream.removeTrack(rawAudioTrack)
                stream.addTrack(cleanAudioTrack)
            }

            localStreamRef.current = stream
            cameraStreamRef.current = stream
            setCameraStream(stream)
            setLocalStream(stream)
        } catch (error: any) {
            if (!isRequestActiveRef.current) return
            console.warn('Initial full media request failed, attempting audio fallback:', error)

            // If video failed but permissions weren't denied, try audio-only
            if (error?.name !== 'NotAllowedError' && error?.name !== 'PermissionDeniedError' && !error?.message?.toLowerCase().includes('permission denied')) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    if (!isRequestActiveRef.current) {
                        audioStream.getTracks().forEach(track => {
                            try { track.stop() } catch {}
                        })
                        return
                    }
                    localStreamRef.current = audioStream
                    cameraStreamRef.current = audioStream
                    setCameraStream(audioStream)
                    setLocalStream(audioStream)
                    setMediaError('Camera unavailable. Connected with microphone only.')
                    return
                } catch { }
            }

            if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' || error?.message?.toLowerCase().includes('permission denied')) {
                setMediaError('Camera & Mic permission denied. Please allow permissions in your browser address bar.')
            } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
                setMediaError('No camera or microphone device found on your device.')
            } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
                setMediaError('Camera/Microphone is being used by another app (Zoom, Teams, etc.).')
            } else {
                setMediaError(error?.message || 'Unable to access camera and microphone')
            }
        } finally {
            if (isRequestActiveRef.current) {
                setMediaLoading(false)
            }
        }
    }, [])

    const replaceLocalStream = useCallback((stream: MediaStream) => {
        localStreamRef.current = stream
        setLocalStream(new MediaStream(stream.getTracks()))
    }, [])

    const restoreCameraStream = useCallback(() => {
        if (cameraStreamRef.current) {
            const fresh = new MediaStream(cameraStreamRef.current.getTracks())
            localStreamRef.current = fresh
            setLocalStream(fresh)
        }
    }, [])

    // Audio/Video Device Hot-Swapping (Bluetooth & USB plug/unplug handling)
    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) {
            return
        }

        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const handleDeviceChange = async () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(async () => {
                const currentStream = localStreamRef.current
                if (!currentStream) return

                console.log('[MediaDevices] Device change detected. Checking track health...')
                const audioTracks = currentStream.getAudioTracks()
                const videoTracks = currentStream.getVideoTracks()

                const audioEnded = audioTracks.length > 0 && audioTracks.some(t => t.readyState === 'ended')
                const videoEnded = videoTracks.length > 0 && videoTracks.some(t => t.readyState === 'ended' && !(t as any).isDummy)

                if (audioEnded || videoEnded) {
                    console.log('[MediaDevices] Active track disconnected. Hot-swapping to available default devices...')
                    try {
                        const freshMedia = await navigator.mediaDevices.getUserMedia({
                            audio: audioTracks.length > 0 ? {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true
                            } : false,
                            video: (videoTracks.length > 0 && !videoEnded) ? {
                                width: { ideal: 1920, min: 1280 },
                                height: { ideal: 1080, min: 720 },
                                aspectRatio: 1.7777777778
                            } : false
                        })

                        const newTracks: MediaStreamTrack[] = []
                        if (freshMedia.getAudioTracks()[0]) {
                            const cleanAudio = noiseCancellationService.processAudioTrack(freshMedia.getAudioTracks()[0], 'high')
                            newTracks.push(cleanAudio)
                        } else if (audioTracks.find(t => t.readyState === 'live')) {
                            newTracks.push(audioTracks.find(t => t.readyState === 'live')!)
                        }

                        if (freshMedia.getVideoTracks()[0]) {
                            newTracks.push(freshMedia.getVideoTracks()[0])
                        } else if (videoTracks.find(t => t.readyState === 'live')) {
                            newTracks.push(videoTracks.find(t => t.readyState === 'live')!)
                        }

                        const replacement = new MediaStream(newTracks)
                        localStreamRef.current = replacement
                        setLocalStream(replacement)
                        window.dispatchEvent(new CustomEvent('jts:device-swapped', { detail: { stream: replacement } }))
                    } catch (err) {
                        console.warn('[MediaDevices] Automatic device hot-swap recovery failed:', err)
                    }
                }
            }, 600)
        }

        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
        }
    }, [])

    return {
        localStream,
        cameraStream,
        mediaLoading,
        mediaError,
        requestMedia,
        stopMedia,
        replaceLocalStream,
        restoreCameraStream
    }
}
