import { useState, useEffect } from 'react'

interface UseMeetingPeerStatusProps {
    socket: any
    setRenamedUsers: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export const useMeetingPeerStatus = ({
    socket,
    setRenamedUsers
}: UseMeetingPeerStatusProps) => {
    const [remoteVideoStates, setRemoteVideoStates] = useState<Record<string, boolean>>({})
    const [remoteMuteStates, setRemoteMuteStates] = useState<Record<string, boolean>>({})

    // Listen to guest display names, camera states, and audio mute states sharing from signaling
    useEffect(() => {
        if (!socket) return

        const handleUserJoinedName = (data: { userId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
            if (data.displayName) {
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    next[data.userId] = data.displayName as string
                    return next
                })
            }
            if (data.isVideoOff !== undefined) {
                setRemoteVideoStates(prev => {
                    const next = { ...prev }
                    next[data.userId] = data.isVideoOff as boolean
                    return next
                })
            }
            if (data.isMuted !== undefined) {
                setRemoteMuteStates(prev => {
                    const next = { ...prev }
                    next[data.userId] = data.isMuted as boolean
                    return next
                })
            }
        }

        const handleOfferName = (data: { fromUserId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
            if (data.displayName) {
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    next[data.fromUserId] = data.displayName as string
                    return next
                })
            }
            if (data.isVideoOff !== undefined) {
                setRemoteVideoStates(prev => {
                    const next = { ...prev }
                    next[data.fromUserId] = data.isVideoOff as boolean
                    return next
                })
            }
            if (data.isMuted !== undefined) {
                setRemoteMuteStates(prev => {
                    const next = { ...prev }
                    next[data.fromUserId] = data.isMuted as boolean
                    return next
                })
            }
        }

        const handleCameraToggle = (data: { userId: string; isVideoOff: boolean }) => {
            setRemoteVideoStates(prev => {
                const next = { ...prev }
                next[data.userId] = data.isVideoOff
                return next
            })
        }

        const handleMicToggle = (data: { userId: string; isMuted: boolean }) => {
            setRemoteMuteStates(prev => {
                const next = { ...prev }
                next[data.userId] = data.isMuted
                return next
            })
        }

        const handleWebrtcJoinAck = (data: {
            meetingId: string
            participants: number
            peers?: Array<{ userId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }>
        }) => {
            if (data.peers && Array.isArray(data.peers)) {
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    data.peers!.forEach(p => {
                        if (p.displayName) {
                            next[p.userId] = p.displayName
                        }
                    })
                    return next
                })
                setRemoteVideoStates(prev => {
                    const next = { ...prev }
                    data.peers!.forEach(p => {
                        if (p.isVideoOff !== undefined) {
                            next[p.userId] = p.isVideoOff
                        }
                    })
                    return next
                })
                setRemoteMuteStates(prev => {
                    const next = { ...prev }
                    data.peers!.forEach(p => {
                        if (p.isMuted !== undefined) {
                            next[p.userId] = p.isMuted
                        }
                    })
                    return next
                })
            }
        }

        socket.on('webrtc:user-joined', handleUserJoinedName)
        socket.on('webrtc:offer', handleOfferName)
        socket.on('webrtc:answer', handleOfferName)
        socket.on('webrtc:join', handleWebrtcJoinAck)
        socket.on('meeting:camera-toggle', handleCameraToggle)
        socket.on('meeting:mic-toggle', handleMicToggle)
        socket.on('meeting:audio-toggle', handleMicToggle)

        return () => {
            socket.off('webrtc:user-joined', handleUserJoinedName)
            socket.off('webrtc:offer', handleOfferName)
            socket.off('webrtc:answer', handleOfferName)
            socket.off('webrtc:join', handleWebrtcJoinAck)
            socket.off('meeting:camera-toggle', handleCameraToggle)
            socket.off('meeting:mic-toggle', handleMicToggle)
            socket.off('meeting:audio-toggle', handleMicToggle)
        }
    }, [socket, setRenamedUsers])

    return {
        remoteVideoStates,
        setRemoteVideoStates,
        remoteMuteStates,
        setRemoteMuteStates
    }
}
