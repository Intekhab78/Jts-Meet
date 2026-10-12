import { useEffect, useRef } from 'react'

interface UseMeetingDeviceHotSwapProps {
    replaceTrackOnPeers: (track: MediaStreamTrack) => void
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

    // Audio/Video Device Hot-Swapping listener (Bluetooth/USB disconnect/reconnect)
    useEffect(() => {
        const handleDeviceSwap = (e: any) => {
            const { kind, track } = e.detail || {}
            if (kind && track) {
                console.log(`[DeviceHotSwap] Replacing ${kind} track on active WebRTC peers:`, track.label)
                replaceTrackOnPeers(track)
            }
        }
        window.addEventListener('jts:device-swapped', handleDeviceSwap)
        return () => {
            window.removeEventListener('jts:device-swapped', handleDeviceSwap)
        }
    }, [replaceTrackOnPeers])
}
