import { useCallback, useEffect, useRef, useState } from 'react'
import { noiseCancellationService } from '../services/noiseCancellation.service'

interface UseMediaDevicesResult {
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    mediaLoading: boolean
    mediaError: string | null
    requestMedia: (audioOnly?: boolean) => Promise<void>
    stopMedia: () => void
    replaceLocalStream: (stream: MediaStream) => void
    restoreCameraStream: () => void
    switchAudioDevice: (deviceId: string, onTrackSwapped?: (track: MediaStreamTrack) => void) => Promise<void>
    switchVideoDevice: (deviceId: string, onTrackSwapped?: (track: MediaStreamTrack) => void) => Promise<void>
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

    const requestMedia = useCallback(async (audioOnly: boolean = false) => {
        // If already streaming and has live tracks, check if we need video but only have audio
        const currentTracks = localStreamRef.current?.getTracks() || []
        const hasLiveAudio = currentTracks.some((t) => t.kind === 'audio' && t.readyState === 'live')
        const hasLiveVideo = currentTracks.some((t) => t.kind === 'video' && t.readyState === 'live')
        if (audioOnly && hasLiveAudio) {
            if (hasLiveVideo && localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach(t => {
                    try { t.stop() } catch {}
                    localStreamRef.current?.removeTrack(t)
                })
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
            }
            return
        }
        if (!audioOnly && hasLiveAudio && hasLiveVideo) {
            return
        }

        isRequestActiveRef.current = true
        setMediaLoading(true)
        setMediaError(null)

        // ── Stage 1: Try HD camera (1920x1080 ideal) ─────────────────────────────
        // OverconstrainedError fix: Remove 'min' constraints — 'ideal' is enough.
        // 'min' was causing OverconstrainedError even when camera was ON but < 1280px.
        const audioConstraints: any = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: 48000,
            googEchoCancellation: true,
            googEchoCancellation2: true,
            googDAEchoCancellation: true,
            googAutoGainControl: false,
            googNoiseSuppression: true,
            googNoiseSuppression2: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false
        }

        let stream: MediaStream | null = null

        if (!audioOnly) {
            // Stage 1 — HD: ideal 1920x1080 (no min, so any camera can succeed)
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30, max: 60 }
                    }
                })
            } catch (hdErr: any) {
                console.warn('[Media] HD camera request failed, trying SD fallback:', hdErr?.name, hdErr?.message)

                // Stage 2 — SD: any resolution, just true (browser picks best available)
                if (hdErr?.name !== 'NotAllowedError' && hdErr?.name !== 'PermissionDeniedError' && !hdErr?.message?.toLowerCase().includes('permission denied')) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            audio: audioConstraints,
                            video: true
                        })
                    } catch (sdErr: any) {
                        console.warn('[Media] SD camera request failed, trying audio-only fallback:', sdErr?.name, sdErr?.message)
                        // Stage 3 — audio only (camera error, not permission error)
                        if (sdErr?.name !== 'NotAllowedError' && sdErr?.name !== 'PermissionDeniedError' && !sdErr?.message?.toLowerCase().includes('permission denied')) {
                            try {
                                const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
                                if (!isRequestActiveRef.current) {
                                    audioOnlyStream.getTracks().forEach(t => { try { t.stop() } catch {} })
                                    return
                                }
                                const rawAudio = audioOnlyStream.getAudioTracks()[0]
                                const cleanAudio = rawAudio ? noiseCancellationService.processAudioTrack(rawAudio, 'high') : rawAudio
                                const cleanOnlyStream = new MediaStream([cleanAudio])
                                localStreamRef.current = cleanOnlyStream
                                cameraStreamRef.current = audioOnlyStream
                                setCameraStream(audioOnlyStream)
                                setLocalStream(cleanOnlyStream)
                                setMediaError('Camera unavailable. Connected with microphone only.')
                                setMediaLoading(false)
                                return
                            } catch { }
                        }
                        // Propagate sd error to outer catch for proper error message
                        throw sdErr
                    }
                } else {
                    // Propagate hd permission error to outer catch
                    throw hdErr
                }
            }
        } else {
            // Audio-only requested explicitly
            stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
        }

        try {
            if (!isRequestActiveRef.current) {
                stream?.getTracks().forEach(track => { try { track.stop() } catch {} })
                return
            }

            if (!stream) throw new Error('No stream obtained')

            const rawAudioTrack = stream.getAudioTracks()[0]
            if (rawAudioTrack) {
                const cleanAudioTrack = noiseCancellationService.processAudioTrack(rawAudioTrack, 'high')
                const videoTracks = stream.getVideoTracks()
                const cleanStream = new MediaStream([cleanAudioTrack, ...videoTracks])
                localStreamRef.current = cleanStream
                cameraStreamRef.current = stream
                setCameraStream(stream)
                setLocalStream(cleanStream)
            } else {
                localStreamRef.current = stream
                cameraStreamRef.current = stream
                setCameraStream(stream)
                setLocalStream(stream)
            }
        } catch (error: any) {
            if (!isRequestActiveRef.current) return
            console.warn('Media stream setup error:', error)

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

    const switchAudioDevice = useCallback(async (deviceId: string, onTrackSwapped?: (track: MediaStreamTrack) => void) => {
        if (!deviceId) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                    googEchoCancellation: true,
                    googEchoCancellation2: true,
                    googDAEchoCancellation: true,
                    googAutoGainControl: false,
                    googNoiseSuppression: true,
                    googNoiseSuppression2: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                    googAudioMirroring: false
                } as any,
                video: false
            })
            const rawTrack = stream.getAudioTracks()[0]
            if (rawTrack && localStreamRef.current) {
                const cleanTrack = noiseCancellationService.processAudioTrack(rawTrack, 'high')
                const oldTrack = localStreamRef.current.getAudioTracks()[0]
                if (oldTrack) {
                    localStreamRef.current.removeTrack(oldTrack)
                    try { oldTrack.stop() } catch {}
                }
                localStreamRef.current.addTrack(cleanTrack)
                const newStream = new MediaStream(localStreamRef.current.getTracks())
                setLocalStream(newStream)
                if (onTrackSwapped) onTrackSwapped(cleanTrack)
                window.dispatchEvent(new CustomEvent('jts:device-swapped', { detail: { stream: newStream } }))
            }
        } catch (err) {
            console.error('[MediaDevices] Failed to switch audio device:', err)
        }
    }, [])

    const switchVideoDevice = useCallback(async (deviceId: string, onTrackSwapped?: (track: MediaStreamTrack) => void) => {
        if (!deviceId) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } },
                audio: false
            })
            const newTrack = stream.getVideoTracks()[0]
            if (newTrack && localStreamRef.current) {
                const oldTrack = localStreamRef.current.getVideoTracks()[0]
                if (oldTrack) {
                    localStreamRef.current.removeTrack(oldTrack)
                    try { oldTrack.stop() } catch {}
                }
                localStreamRef.current.addTrack(newTrack)
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
                setCameraStream(new MediaStream(localStreamRef.current.getTracks()))
                if (onTrackSwapped) onTrackSwapped(newTrack)
                window.dispatchEvent(new CustomEvent('jts:device-swapped', { detail: { stream: localStreamRef.current } }))
            }
        } catch (err) {
            console.error('[MediaDevices] Failed to switch video device:', err)
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
                            audio: audioTracks.length > 0 ? ({
                                channelCount: 1,
                                sampleRate: 48000,
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: false,
                                googEchoCancellation: true,
                                googEchoCancellation2: true,
                                googDAEchoCancellation: true,
                                googAutoGainControl: false,
                                googNoiseSuppression: true,
                                googNoiseSuppression2: true,
                                googHighpassFilter: true,
                                googTypingNoiseDetection: true,
                                googAudioMirroring: false
                            } as any) : false,
                            video: (videoTracks.length > 0 && !videoEnded) ? {
                                width: { ideal: 1920, min: 1280 },
                                height: { ideal: 1080, min: 720 },
                                aspectRatio: 1.7777777778
                            } : false
                        })

                        const newTracks: MediaStreamTrack[] = []
                        if (freshMedia.getAudioTracks()[0]) {
                            const clean = noiseCancellationService.processAudioTrack(freshMedia.getAudioTracks()[0], 'high')
                            newTracks.push(clean)
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
        restoreCameraStream,
        switchAudioDevice,
        switchVideoDevice
    }
}
