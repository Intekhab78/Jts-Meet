import React, { createContext, useContext } from 'react'
import { useSocketContext } from './SocketContext'
import { useMeetingContext } from './MeetingContext'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useWebRTC } from '../hooks/useWebRTC'

interface WebRTCContextValue {
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    connectToMeeting: (meetingId: string, displayName?: string, isDirectCall?: boolean) => void
    leaveMeeting: () => void
    startScreenShare: (existingStream?: MediaStream) => Promise<void>
    stopScreenShare: () => void
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    switchActivePresenter: (targetUserId: string) => void
    screenError: string | null
    clearScreenError: () => void
    mediaError: string | null
    mediaLoading: boolean
    replaceTrackOnPeers: (newTrack: MediaStreamTrack | null) => void
    requestMedia: (audioOnly?: boolean) => Promise<void>
    stopMedia: () => void
    networkStatus: 'online' | 'offline' | 'reconnecting'
    isReconnecting: boolean
    switchAudioDevice: (deviceId: string, onTrackSwapped?: (track: MediaStreamTrack) => void) => Promise<void>
    switchVideoDevice: (deviceId: string, onTrackSwapped?: (track: MediaStreamTrack) => void) => Promise<void>
}

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined)

export const WebRTCProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { socket } = useSocketContext()
    const { meetingId, setJoined, addParticipant, removeParticipant } = useMeetingContext()
    const { localStream, cameraStream, mediaError, mediaLoading, requestMedia, stopMedia, replaceLocalStream, restoreCameraStream, switchAudioDevice, switchVideoDevice } = useMediaDevices()
    const { remoteStreams, connectToMeeting, leaveMeeting, startScreenShare, stopScreenShare, screenSharingUserId, screenSharingUserIds, switchActivePresenter, screenError, clearScreenError, replaceTrackOnPeers, networkStatus, isReconnecting } = useWebRTC(
        socket,
        localStream,
        cameraStream,
        replaceLocalStream,
        restoreCameraStream,
        setJoined,
        addParticipant,
        removeParticipant
    )

    const leaveRef = React.useRef(leaveMeeting)
    const stopRef = React.useRef(stopMedia)

    React.useEffect(() => {
        leaveRef.current = leaveMeeting
        stopRef.current = stopMedia
    })

    React.useEffect(() => {
        return () => {
            leaveRef.current()
            stopRef.current()
        }
    }, [])

    return (
        <WebRTCContext.Provider value={{
            localStream,
            cameraStream,
            remoteStreams,
            connectToMeeting,
            leaveMeeting,
            startScreenShare,
            stopScreenShare,
            screenSharingUserId,
            screenSharingUserIds,
            switchActivePresenter,
            screenError,
            clearScreenError,
            mediaError,
            mediaLoading,
            replaceTrackOnPeers,
            requestMedia,
            stopMedia,
            networkStatus,
            isReconnecting,
            switchAudioDevice,
            switchVideoDevice
        }}>
            {children}
        </WebRTCContext.Provider>
    )
}

export function useWebRTCContext() {
    const context = useContext(WebRTCContext)
    if (!context) {
        throw new Error('useWebRTCContext must be used within WebRTCProvider')
    }
    return context
}
