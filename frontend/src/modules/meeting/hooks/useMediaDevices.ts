import { useCallback, useRef, useState } from 'react'

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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            if (!isRequestActiveRef.current) {
                // If stopMedia was called while awaiting getUserMedia, shut down tracks immediately
                stream.getTracks().forEach(track => {
                    try { track.stop() } catch {}
                })
                return
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
        setLocalStream(stream)
    }, [])

    const restoreCameraStream = useCallback(() => {
        if (cameraStreamRef.current) {
            localStreamRef.current = cameraStreamRef.current
            setLocalStream(cameraStreamRef.current)
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
