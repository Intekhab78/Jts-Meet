import { useCallback, useState } from 'react'

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
    const [mediaLoading, setMediaLoading] = useState(true)
    const [mediaError, setMediaError] = useState<string | null>(null)

    const requestMedia = useCallback(async () => {
        setMediaLoading(true)
        setMediaError(null)

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            setCameraStream(stream)
            setLocalStream(stream)
        } catch (error: any) {
            setMediaError(error?.message || 'Unable to access camera and microphone')
        } finally {
            setMediaLoading(false)
        }
    }, [])

    const replaceLocalStream = useCallback((stream: MediaStream) => {
        setLocalStream(stream)
    }, [])

    const restoreCameraStream = useCallback(() => {
        if (cameraStream) {
            setLocalStream(cameraStream)
        }
    }, [cameraStream])

    const stopMedia = useCallback(() => {
        localStream?.getTracks().forEach((track) => track.stop())
        cameraStream?.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
        setCameraStream(null)
    }, [localStream, cameraStream])

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
