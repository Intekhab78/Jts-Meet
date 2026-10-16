import { useEffect, useRef } from 'react'

interface UseMeetingDeviceHotSwapProps {
    replaceTrackOnPeers: (track: MediaStreamTrack, kindOverride?: 'audio' | 'video') => void
    requestMedia: (audioOnly?: boolean) => Promise<any>
    stopMedia: () => void
    setIsVideoOff: (videoOff: boolean) => void
}

export const useMeetingDeviceHotSwap = ({
    replaceTrackOnPeers,
    requestMedia,
    stopMedia,
    setIsVideoOff
}: UseMeetingDeviceHotSwapProps) => {
    const requestMediaRef = useRef(requestMedia)
    const stopMediaRef = useRef(stopMedia)

    useEffect(() => {
        requestMediaRef.current = requestMedia
        stopMediaRef.current = stopMedia
    })

    // Automatically request camera and microphone ONLY when entering MeetingRoom
    useEffect(() => {
        const initialCameraOff = sessionStorage.getItem('jts_initial_camera_off') === 'true'
        if (initialCameraOff) {
            setIsVideoOff(true)
            requestMediaRef.current(true) // audio only — webcam LED remains off!
        } else {
            requestMediaRef.current(false) // audio + video
        }

        return () => {
            // When leaving MeetingRoom, shut down camera & mic hardware completely
            stopMediaRef.current()
        }
    }, [setIsVideoOff])

    // Audio/Video Device Hot-Swapping listener (Bluetooth/USB disconnect/reconnect or settings change)
    useEffect(() => {
        const handleDeviceSwap = (e: any) => {
            const { kind, track, stream } = e.detail || {}
            if (kind && track) {
                console.log(`[DeviceHotSwap] Replacing ${kind} track on active WebRTC peers:`, track.label)
                replaceTrackOnPeers(track, kind)
            } else if (stream instanceof MediaStream) {
                console.log('[DeviceHotSwap] Replacing all live tracks from stream on active WebRTC peers')
                const audio = stream.getAudioTracks().find((t: MediaStreamTrack) => t.readyState === 'live')
                const video = stream.getVideoTracks().find((t: MediaStreamTrack) => t.readyState === 'live' && !(t as any).isDummy)
                if (audio) replaceTrackOnPeers(audio, 'audio')
                if (video) replaceTrackOnPeers(video, 'video')
            }
        }
        window.addEventListener('jts:device-swapped', handleDeviceSwap)
        return () => {
            window.removeEventListener('jts:device-swapped', handleDeviceSwap)
        }
    }, [replaceTrackOnPeers])
}
