import React, { createContext, useContext } from 'react'
import { useSocketContext } from './SocketContext'
import { useMeetingContext } from './MeetingContext'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useWebRTC } from '../hooks/useWebRTC'

interface WebRTCContextValue {
    localStream: MediaStream | null
    cameraStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    connectToMeeting: (meetingId: string, displayName?: string) => void
    leaveMeeting: () => void
    startScreenShare: () => Promise<void>
    stopScreenShare: () => void
    screenSharingUserId: string | null
    screenError: string | null
    clearScreenError: () => void
    mediaError: string | null
    mediaLoading: boolean
    replaceTrackOnPeers: (newTrack: MediaStreamTrack | null) => void
    requestMedia: () => Promise<void>
    stopMedia: () => void
}

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined)

export const WebRTCProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { socket } = useSocketContext()
    const { meetingId, setJoined, addParticipant, removeParticipant } = useMeetingContext()
    const { localStream, cameraStream, mediaError, mediaLoading, requestMedia, stopMedia, replaceLocalStream, restoreCameraStream } = useMediaDevices()
    const { remoteStreams, connectToMeeting, leaveMeeting, startScreenShare, stopScreenShare, screenSharingUserId, screenError, clearScreenError, replaceTrackOnPeers } = useWebRTC(
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
            screenError,
            clearScreenError,
            mediaError,
            mediaLoading,
            replaceTrackOnPeers,
            requestMedia,
            stopMedia
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
