import { useEffect } from 'react'
import { useMeetingMediaControls } from './useMeetingMediaControls'
import { useMeetingDeviceHotSwap } from './useMeetingDeviceHotSwap'
import { useTalkingWhileMutedDetector } from './useTalkingWhileMutedDetector'
import { useMeetingActiveSpeaker } from './useMeetingActiveSpeaker'

export interface UseMeetingAudioVideoPipelineProps {
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    replaceLocalStream: (stream: MediaStream) => void
    replaceTrackOnPeers: any
    requestMedia: any
    stopMedia: () => void
    socket: any
    meetingId: string
    meetingInput: string
    setShowPushToTalkHud: (show: boolean) => void
    addToast: (msg: string, type?: any) => void
}

export function useMeetingAudioVideoPipeline({
    localStream,
    cameraStream,
    remoteStreams,
    replaceLocalStream,
    replaceTrackOnPeers,
    requestMedia,
    stopMedia,
    socket,
    meetingId,
    meetingInput,
    setShowPushToTalkHud,
    addToast
}: UseMeetingAudioVideoPipelineProps) {
    // Audio/Video Hardware, Constraints, Virtual Background & PiP Controls
    const {
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
    } = useMeetingMediaControls({
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
    })

    // Audio/Video Hardware Hot-Swap & Device Lifecycle
    useMeetingDeviceHotSwap({
        replaceTrackOnPeers,
        requestMedia,
        stopMedia,
        setIsVideoOff
    })

    // Talking While Muted Voice Activity Detector
    const {
        showTalkingWhileMuted,
        setShowTalkingWhileMuted
    } = useTalkingWhileMutedDetector({
        isMuted,
        localStream
    })

    // Active Speaker Volume Level Detector
    const {
        activeSpeaker,
        setActiveSpeaker
    } = useMeetingActiveSpeaker({
        localStream,
        remoteStreams,
        isMuted
    })

    // Sync state with track states initially/on stream load
    useEffect(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0]
            const videoTrack = localStream.getVideoTracks()[0]
            if (audioTrack) setIsMuted(!audioTrack.enabled)
            if (videoTrack) setIsVideoOff(!videoTrack.enabled)
        }
    }, [localStream, setIsMuted, setIsVideoOff])

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
        handleTogglePiP,
        showTalkingWhileMuted,
        setShowTalkingWhileMuted,
        activeSpeaker,
        setActiveSpeaker
    }
}
