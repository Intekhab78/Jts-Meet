import { useState, useRef, useEffect } from 'react'
import { virtualBackgroundService } from '../../../services/virtualBackground.service'

export interface UseMeetingMediaControlsProps {
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    replaceLocalStream: (stream: MediaStream) => void
    replaceTrackOnPeers: (track: MediaStreamTrack | null, kind?: 'audio' | 'video') => void
    requestMedia: (isCameraOff?: boolean) => Promise<any>
    socket: any
    meetingId: string
    meetingInput: string
    setShowPushToTalkHud: (v: boolean) => void
    addToast: (msg: string, type?: any) => void
}

export function useMeetingMediaControls({
    localStream,
    cameraStream,
    replaceLocalStream,
    replaceTrackOnPeers,
    requestMedia,
    socket,
    meetingId,
    meetingInput,
    setShowPushToTalkHud,
    addToast
}: UseMeetingMediaControlsProps) {
    const [isMuted, setIsMuted] = useState(() => {
        try {
            return sessionStorage.getItem('jts_initial_mic_muted') === 'true'
        } catch {
            return false
        }
    })
    const [isVideoOff, setIsVideoOff] = useState(() => {
        try {
            return sessionStorage.getItem('jts_initial_camera_off') === 'true'
        } catch {
            return false
        }
    })
    const [isBlurEnabled, setIsBlurEnabled] = useState(false)
    const [virtualBgPreset, setVirtualBgPreset] = useState<string>('none')
    const [isApplyingVirtualBg, setIsApplyingVirtualBg] = useState<boolean>(false)
    const [videoQuality, setVideoQuality] = useState<'1080p' | '720p' | 'auto'>('auto')
    const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true)
    const [isPiPActive, setIsPiPActive] = useState(false)
    const [activeLocalStream, setActiveLocalStream] = useState<MediaStream | null>(null)

    const rawCameraTrackRef = useRef<MediaStreamTrack | null>(null)
    const activeVideoDeviceIdRef = useRef<string | null>(null)

    // Synchronize physical hardware audio tracks whenever localStream or isMuted changes (ensures muted state on refresh)
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted
            })
        }
    }, [localStream, isMuted])

    const toggleMute = () => {
        const nextMuted = !isMuted
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !nextMuted
            })
        }
        setIsMuted(nextMuted)
        try {
            if (nextMuted) {
                sessionStorage.setItem('jts_initial_mic_muted', 'true')
            } else {
                sessionStorage.removeItem('jts_initial_mic_muted')
            }
        } catch {}
        setShowPushToTalkHud(true)
        socket?.emit('meeting:mic-toggle', { meetingId: meetingId || meetingInput, isMuted: nextMuted })
    }

    const toggleVideo = async () => {
        if (!localStream) {
            try {
                await requestMedia(false)
                setIsVideoOff(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
            } catch (e) {
                console.warn('Failed to start media on toggle:', e)
            }
            return
        }

        if (!isVideoOff) {
            // 1. Physically stop all hardware video tracks on localStream so webcam LED turns OFF completely
            localStream.getVideoTracks().forEach(track => {
                try {
                    track.stop()
                } catch { }
                localStream.removeTrack(track)
            })

            // 1.1 Also stop any active camera tracks on cameraStream backup
            if (cameraStream) {
                cameraStream.getVideoTracks().forEach(track => {
                    try {
                        track.stop()
                    } catch { }
                    cameraStream.removeTrack(track)
                })
            }

            // 2. Stop and release virtual background or wallpaper preview stream
            if (activeLocalStream) {
                activeLocalStream.getVideoTracks().forEach(track => {
                    try {
                        track.stop()
                    } catch { }
                })
                setActiveLocalStream(null)
            }

            // 3. Stop raw physical camera track backup ref to ensure laptop LED turns off completely
            if (rawCameraTrackRef.current) {
                try {
                    rawCameraTrackRef.current.stop()
                } catch { }
                rawCameraTrackRef.current = null
            }

            // 4. Cleanup processing loop & offscreen canvas/video in virtualBackgroundService
            try {
                virtualBackgroundService.cleanup()
            } catch { }

            // 5. Update localStream state with audio only
            const cleanAudioStream = new MediaStream(localStream.getAudioTracks())
            replaceLocalStream(cleanAudioStream)

            // 6. Stop sending video to WebRTC peers (replaces sender track with null)
            replaceTrackOnPeers(null, 'video')

            setIsVideoOff(true)
            try { sessionStorage.setItem('jts_initial_camera_off', 'true') } catch {}
            socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: true })
            addToast('Camera turned off (hardware released)', 'info')
        } else {
            // Turning camera back ON (Google Meet style)
            try {
                let freshStream: MediaStream | null = null
                const preferredDeviceId = activeVideoDeviceIdRef.current

                // Try ideal resolution with deviceId if set, with graceful fallback
                try {
                    freshStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            ...(preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : {}),
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 60 }
                        }
                    })
                } catch (hdErr) {
                    freshStream = await navigator.mediaDevices.getUserMedia({
                        video: preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : true
                    })
                }

                const videoTrack = freshStream.getVideoTracks()[0]
                if (videoTrack) {
                    localStream.getVideoTracks().forEach(t => {
                        try {
                            t.stop()
                        } catch { }
                        localStream.removeTrack(t)
                    })
                    const newLocalStream = new MediaStream([
                        ...localStream.getAudioTracks(),
                        videoTrack
                    ])
                    replaceLocalStream(newLocalStream)
                    replaceTrackOnPeers(videoTrack, 'video')
                    rawCameraTrackRef.current = videoTrack
                }
                setIsVideoOff(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
                socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: false })
                addToast('Camera turned on', 'success')
            } catch (err: any) {
                console.error("Camera enable failed:", err)
                if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                    addToast("Camera access was denied by browser permissions.", "warning")
                } else {
                    addToast("Could not access camera device: " + (err?.message || "Device error"), "warning")
                }
            }
        }
    }

    // Device switching handlers
    const handleVideoSourceChange = async (deviceId: string) => {
        activeVideoDeviceIdRef.current = deviceId
        if (!localStream) return
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                }
            }).catch(() => navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } }))
            const newTrack = newStream.getVideoTracks()[0]
            if (newTrack) {
                const oldTrack = localStream.getVideoTracks()[0]
                if (oldTrack) {
                    try { oldTrack.stop() } catch {}
                    localStream.removeTrack(oldTrack)
                }
                const updatedStream = new MediaStream([
                    ...localStream.getAudioTracks(),
                    newTrack
                ])
                replaceLocalStream(updatedStream)
                replaceTrackOnPeers(newTrack, 'video')
                rawCameraTrackRef.current = newTrack
                setIsVideoOff(false)
                try { sessionStorage.removeItem('jts_initial_camera_off') } catch {}
                socket?.emit('meeting:camera-toggle', { meetingId: meetingId || meetingInput, isVideoOff: false })
                addToast('Camera switched successfully', 'info')
            }
        } catch (err: any) {
            addToast('Failed to switch camera: ' + (err?.message || 'Device error'), 'warning')
        }
    }

    const handleQualityChange = async (quality: '1080p' | '720p' | 'auto') => {
        setVideoQuality(quality)
        if (!localStream) return
        const vTrack = localStream.getVideoTracks()[0]
        if (vTrack && vTrack.readyState === 'live') {
            const height = quality === '1080p' ? 1080 : quality === '720p' ? 720 : 1080
            const width = quality === '1080p' ? 1920 : quality === '720p' ? 1280 : 1920
            try {
                await vTrack.applyConstraints({
                    width: { ideal: width },
                    height: { ideal: height },
                    frameRate: { ideal: 30, max: 60 },
                    aspectRatio: { ideal: 1.7777777778 }
                })
                addToast(`Video quality set to ${quality === '1080p' ? '1080p Full HD' : quality === '720p' ? '720p HD' : 'Auto Adaptive'}`, 'info')
            } catch (e) {
                console.warn('Could not apply constraints dynamically:', e)
            }
        }
    }

    const handleAudioSourceChange = async (deviceId: string) => {
        if (!localStream) return
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: true,
                    noiseSuppression: isNoiseSuppressionEnabled,
                    autoGainControl: false,
                    googEchoCancellation: true,
                    googEchoCancellation2: true,
                    googAutoGainControl: false,
                    googNoiseSuppression: isNoiseSuppressionEnabled,
                    googNoiseSuppression2: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                    googAudioMirroring: false
                } as any
            })
            const rawTrack = newStream.getAudioTracks()[0]
            if (rawTrack) {
                const oldTrack = localStream.getAudioTracks()[0]
                if (oldTrack) {
                    oldTrack.stop()
                    localStream.removeTrack(oldTrack)
                }
                localStream.addTrack(rawTrack)
                replaceTrackOnPeers(rawTrack)
                rawTrack.enabled = !isMuted
                addToast('Microphone switched (Google Meet Voice Isolation active)', 'info')
            }
        } catch (err: any) {
            addToast('Failed to switch microphone: ' + (err?.message || 'Device error'), 'warning')
        }
    }

    const handleAudioOutputChange = async (deviceId: string) => {
        try {
            const audioElements = document.querySelectorAll('audio, video')
            for (const el of Array.from(audioElements) as any[]) {
                if (typeof el.setSinkId === 'function') {
                    await el.setSinkId(deviceId)
                }
            }
            addToast('Speaker output set', 'info')
        } catch (err: any) {
            addToast('Failed to set speaker output: ' + (err?.message || 'Unsupported'), 'warning')
        }
    }

    const handleSelectVirtualBackground = async (presetId: string) => {
        setIsApplyingVirtualBg(true)
        try {
            if (!localStream) {
                addToast('Camera not available for visual effects', 'warning')
                setIsApplyingVirtualBg(false)
                return
            }

            // Save raw camera track reference if not already saved
            if (!rawCameraTrackRef.current || rawCameraTrackRef.current.readyState === 'ended') {
                const currentTrack = localStream.getVideoTracks()[0]
                if (currentTrack) {
                    rawCameraTrackRef.current = currentTrack
                }
            }

            if (presetId === 'none') {
                // Restore raw physical camera track
                const rawTrack = rawCameraTrackRef.current
                if (rawTrack && rawTrack.readyState === 'live') {
                    const freshStream = new MediaStream([
                        rawTrack,
                        ...localStream.getAudioTracks()
                    ])
                    setActiveLocalStream(freshStream)

                    const currentTracks = localStream.getVideoTracks()
                    currentTracks.forEach(t => localStream.removeTrack(t))
                    localStream.addTrack(rawTrack)
                    replaceTrackOnPeers(rawTrack)
                } else {
                    setActiveLocalStream(null)
                }
                virtualBackgroundService.cleanup()
                setVirtualBgPreset('none')
                setIsBlurEnabled(false)
                addToast('Standard camera restored (Visual effects off)', 'info')
                return
            }

            const baseTrack = (rawCameraTrackRef.current && rawCameraTrackRef.current.readyState === 'live')
                ? rawCameraTrackRef.current
                : localStream.getVideoTracks()[0]

            if (!baseTrack) {
                addToast('No active video track found', 'warning')
                return
            }

            const rawStream = new MediaStream([baseTrack])
            const processedTrack = await virtualBackgroundService.applyPreset(presetId, rawStream)

            if (processedTrack) {
                // Create brand-new MediaStream so React re-renders preview & tiles
                const freshStream = new MediaStream([
                    processedTrack,
                    ...localStream.getAudioTracks()
                ])
                setActiveLocalStream(freshStream)

                const currentTracks = localStream.getVideoTracks()
                currentTracks.forEach(t => localStream.removeTrack(t))
                localStream.addTrack(processedTrack)
                replaceTrackOnPeers(processedTrack)

                setVirtualBgPreset(presetId)
                setIsBlurEnabled(presetId.startsWith('blur'))
                addToast(`AI Background applied: ${presetId.replace('_', ' ')} (Face clear)`, 'success')
            } else {
                addToast('Could not apply visual effect', 'warning')
            }
        } catch (err: any) {
            console.error('Virtual background error:', err)
            addToast('Error applying background: ' + (err?.message || 'Unknown error'), 'warning')
        } finally {
            setIsApplyingVirtualBg(false)
        }
    }

    const handleUploadCustomWallpaper = (file: File) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string
            if (dataUrl) {
                await virtualBackgroundService.setCustomWallpaper(dataUrl)
                handleSelectVirtualBackground('custom')
            }
        }
        reader.readAsDataURL(file)
    }

    const handleToggleBlur = () => {
        if (virtualBgPreset.startsWith('blur')) {
            handleSelectVirtualBackground('none')
        } else {
            handleSelectVirtualBackground('blur_light')
        }
    }

    const handleToggleNoiseSuppression = async () => {
        const next = !isNoiseSuppressionEnabled
        setIsNoiseSuppressionEnabled(next)
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0]
            if (audioTrack) {
                try {
                    await audioTrack.applyConstraints({
                        noiseSuppression: next,
                        echoCancellation: true,
                        autoGainControl: false,
                        googEchoCancellation: true,
                        googEchoCancellation2: true,
                        googAutoGainControl: false,
                        googNoiseSuppression: next,
                        googNoiseSuppression2: true,
                        googHighpassFilter: true,
                        googTypingNoiseDetection: true
                    } as any)
                } catch (e) {}

                if (next) {
                    addToast('Google Meet AI Voice Isolation active (Fan & background noise silenced)', 'success')
                } else {
                    addToast('Standard audio mode active (Noise cancellation off)', 'info')
                }
            }
        }
    }

    // Picture-in-Picture (PiP) toggle handler
    const handleTogglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture()
                setIsPiPActive(false)
                return
            }
            const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'))
            const activeVideo = videos.find(v => v.srcObject && (v.srcObject as MediaStream).active && v.readyState >= 2) || videos[0]
            if (activeVideo) {
                await activeVideo.requestPictureInPicture()
                setIsPiPActive(true)
                activeVideo.addEventListener('leavepictureinpicture', () => {
                    setIsPiPActive(false)
                }, { once: true })
            } else {
                addToast('No active video found for Picture-in-Picture', 'warning')
            }
        } catch (err: any) {
            console.warn('PiP error:', err)
            addToast(err?.message || 'Picture-in-Picture not supported or permission denied', 'warning')
        }
    }

    return {
        isMuted,
        setIsMuted,
        isVideoOff,
        setIsVideoOff,
        isBlurEnabled,
        setIsBlurEnabled,
        virtualBgPreset,
        setVirtualBgPreset,
        isApplyingVirtualBg,
        setIsApplyingVirtualBg,
        videoQuality,
        setVideoQuality,
        isNoiseSuppressionEnabled,
        setIsNoiseSuppressionEnabled,
        isPiPActive,
        setIsPiPActive,
        activeLocalStream,
        setActiveLocalStream,
        rawCameraTrackRef,
        activeVideoDeviceIdRef,
        toggleMute,
        toggleVideo,
        handleVideoSourceChange,
        handleQualityChange,
        handleAudioSourceChange,
        handleAudioOutputChange,
        handleSelectVirtualBackground,
        handleUploadCustomWallpaper,
        handleToggleBlur,
        handleToggleNoiseSuppression,
        handleTogglePiP
    }
}
