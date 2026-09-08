import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'
import { createPeerConnection, peerRemoteStreams } from '../services/webrtc.service'
import { getScreenShareStream, stopScreenShareStream } from '../services/screen.service'

interface UseWebRTCResult {
    remoteStreams: Record<string, MediaStream>
    connectToMeeting: (meetingId: string, displayName?: string) => void
    leaveMeeting: () => void
    startScreenShare: () => Promise<void>
    stopScreenShare: () => void
    screenSharingUserId: string | null
    screenError: string | null
    replaceTrackOnPeers: (newTrack: MediaStreamTrack | null) => void
}

interface InternalPeerConnections {
    [userId: string]: RTCPeerConnection
}

export function useWebRTC(
    socket: Socket | null,
    localStream: MediaStream | null,
    cameraStream: MediaStream | null,
    replaceLocalStream: (stream: MediaStream) => void,
    restoreCameraStream: () => void,
    setJoined: (value: boolean) => void,
    addParticipant: (userId: string) => void,
    removeParticipant: (userId: string) => void
): UseWebRTCResult {
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
    const [meetingId, setMeetingId] = useState<string>('')
    const [screenSharingUserId, setScreenSharingUserId] = useState<string | null>(null)
    const [screenError, setScreenError] = useState<string | null>(null)
    const peerConnectionsRef = useRef<InternalPeerConnections>({})
    const localStreamRef = useRef<MediaStream | null>(null)
    const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({})

    const cleanupPeer = useCallback((userId: string) => {
        const pc = peerConnectionsRef.current[userId]
        if (pc) {
            pc.close()
            delete peerConnectionsRef.current[userId]
            delete pendingCandidatesRef.current[userId]
            peerRemoteStreams.delete(userId)
            setRemoteStreams((prev) => {
                const nextStreams = { ...prev }
                delete nextStreams[userId]
                return nextStreams
            })
        }
    }, [])

    const leaveMeeting = useCallback(() => {
        setMeetingId('')
        setJoined(false)
        Object.keys(peerConnectionsRef.current).forEach((userId) => cleanupPeer(userId))
        socket?.emit(SocketEvents.MEETING_LEAVE, { meetingId })
    }, [cleanupPeer, meetingId, setJoined, socket])

    const connectToMeeting = useCallback(
        (targetMeetingId: string, displayName?: string) => {
            if (!socket) {
                return
            }

            setMeetingId(targetMeetingId)
            const vTrack = localStreamRef.current?.getVideoTracks()[0]
            const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled) : false

            socket.emit(SocketEvents.WEBRTC_JOIN, { 
                meetingId: targetMeetingId,
                displayName,
                isVideoOff: isLocalVideoOff
            })
        },
        [socket]
    )

    const replaceTrackOnPeers = useCallback(
        (newTrack: MediaStreamTrack | null) => {
            if (!newTrack) return
            const kind = newTrack.kind
            Object.values(peerConnectionsRef.current).forEach((pc) => {
                const sender = pc.getSenders().find((s) => {
                    if (s.track) return s.track.kind === kind
                    const tc = pc.getTransceivers().find(t => t.sender === s)
                    return tc && tc.receiver.track && tc.receiver.track.kind === kind
                })
                if (sender) {
                    sender.replaceTrack(newTrack).catch(err => {
                        console.warn('Failed to replace track on peer:', err)
                    })
                } else if (localStreamRef.current) {
                    try {
                        pc.addTrack(newTrack, localStreamRef.current)
                    } catch (err) {
                        console.warn('Failed to add track to peer:', err)
                    }
                }
            })
        },
        []
    )

    const stopScreenShare = useCallback(() => {
        const currentStream = localStreamRef.current
        if (currentStream && currentStream !== cameraStream) {
            currentStream.getTracks().forEach((track) => track.stop())
        }

        restoreCameraStream()
        const cameraTrack = cameraStream?.getVideoTracks()[0] || null
        replaceTrackOnPeers(cameraTrack)
        socket?.emit(SocketEvents.SCREEN_STOP, { meetingId })
        setScreenSharingUserId(null)
    }, [cameraStream, restoreCameraStream, replaceTrackOnPeers, socket, meetingId])

    const startScreenShare = useCallback(async () => {
        if (!socket || !cameraStream) {
            return
        }

        setScreenError(null)
        try {
            const screenStream = await getScreenShareStream()
            const screenTrack = screenStream.getVideoTracks()[0]
            if (!screenTrack) {
                throw new Error('No screen track available')
            }

            replaceLocalStream(screenStream)
            replaceTrackOnPeers(screenTrack)
            setScreenSharingUserId('me')
            socket.emit(SocketEvents.SCREEN_START, { meetingId })

            screenTrack.onended = () => {
                stopScreenShare()
            }
        } catch (error: any) {
            setScreenError(error?.message || 'Screen sharing failed or permission denied')
        }
    }, [cameraStream, meetingId, replaceLocalStream, replaceTrackOnPeers, socket, stopScreenShare])

    useEffect(() => {
        localStreamRef.current = localStream
        if (localStream) {
            const vTrack = localStream.getVideoTracks()[0]
            const aTrack = localStream.getAudioTracks()[0]
            if (vTrack) replaceTrackOnPeers(vTrack)
            if (aTrack) replaceTrackOnPeers(aTrack)

            if (socket && meetingId && vTrack) {
                const isDummy = !!(vTrack as any).isDummy
                const isOff = isDummy || !vTrack.enabled
                socket.emit('meeting:camera-toggle', {
                    meetingId,
                    isVideoOff: isOff
                })
            }
        }
    }, [localStream, replaceTrackOnPeers, socket, meetingId])

    useEffect(() => {
        if (!socket) {
            return
        }

        const handleUserJoined = (payload: { userId: string; meetingId: string }) => {
            addParticipant(payload.userId)

            const existingPc = peerConnectionsRef.current[payload.userId]
            if (existingPc && (existingPc.connectionState === 'connected' || existingPc.iceConnectionState === 'connected')) {
                console.log(`[WebRTC] Peer connection already active for user ${payload.userId}, skipping redundant offer`)
                return
            }

            if (existingPc) {
                try { existingPc.close() } catch (e) {}
            }

            const pc = createPeerConnection(
                payload.userId,
                localStreamRef.current,
                {
                    onTrack: (stream) => {
                        setRemoteStreams((prev) => ({ ...prev, [payload.userId]: stream }))
                    },
                    onICECandidate: (candidate) => {
                        socket.emit(SocketEvents.WEBRTC_ICE_CANDIDATE, {
                            targetUserId: payload.userId,
                            meetingId: payload.meetingId,
                            candidate
                        })
                    }
                }
            )

            peerConnectionsRef.current[payload.userId] = pc

            pc.createOffer().then((offer) => {
                return pc.setLocalDescription(offer).then(() => {
                    let myName = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
                    try {
                        const token = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
                        if (token) {
                            const parts = token.split('.')
                            if (parts.length === 3) {
                                const decoded = JSON.parse(atob(parts[1]))
                                if (decoded) {
                                    myName = decoded.guestName || decoded.fullName || myName
                                }
                            }
                        }
                    } catch (e) {}

                    const vTrack = localStreamRef.current?.getVideoTracks()[0]
                    const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled) : false

                    socket.emit(SocketEvents.WEBRTC_OFFER, {
                        targetUserId: payload.userId,
                        meetingId: payload.meetingId,
                        offer,
                        displayName: myName,
                        isVideoOff: isLocalVideoOff
                    })
                })
            }).catch(err => {
                console.warn('Error creating WebRTC offer:', err)
            })
        }

        const handleOffer = async (payload: { fromUserId: string; meetingId: string; offer: RTCSessionDescriptionInit }) => {
            addParticipant(payload.fromUserId)

            const existingPc = peerConnectionsRef.current[payload.fromUserId]
            if (existingPc) {
                try { existingPc.close() } catch (e) {}
            }

            const pc = createPeerConnection(
                payload.fromUserId,
                localStreamRef.current,
                {
                    onTrack: (stream) => {
                        setRemoteStreams((prev) => ({ ...prev, [payload.fromUserId]: stream }))
                    },
                    onICECandidate: (candidate) => {
                        socket.emit(SocketEvents.WEBRTC_ICE_CANDIDATE, {
                            targetUserId: payload.fromUserId,
                            meetingId: payload.meetingId,
                            candidate
                        })
                    }
                }
            )

            peerConnectionsRef.current[payload.fromUserId] = pc

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                await processPendingCandidates(payload.fromUserId, pc)

                let myName = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
                try {
                    const token = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
                    if (token) {
                        const parts = token.split('.')
                        if (parts.length === 3) {
                            const decoded = JSON.parse(atob(parts[1]))
                            if (decoded) {
                                myName = decoded.guestName || decoded.fullName || myName
                            }
                        }
                    }
                } catch (e) {}

                const vTrack = localStreamRef.current?.getVideoTracks()[0]
                const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled) : false

                socket.emit(SocketEvents.WEBRTC_ANSWER, {
                    targetUserId: payload.fromUserId,
                    meetingId: payload.meetingId,
                    answer,
                    displayName: myName,
                    isVideoOff: isLocalVideoOff
                })
            } catch (err) {
                console.warn('Error handling WebRTC offer:', err)
            }
        }

        const processPendingCandidates = async (userId: string, pc: RTCPeerConnection) => {
            const candidates = pendingCandidatesRef.current[userId] || []
            pendingCandidatesRef.current[userId] = []
            for (const cand of candidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand))
                } catch (err) {
                    console.warn('Error applying buffered ICE candidate for user', userId, err)
                }
            }
        }

        const handleAnswer = async (payload: { fromUserId: string; meetingId: string; answer: RTCSessionDescriptionInit }) => {
            const pc = peerConnectionsRef.current[payload.fromUserId]
            if (!pc) {
                console.warn('handleAnswer: PeerConnection not found for user', payload.fromUserId)
                return
            }
            try {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
                    await processPendingCandidates(payload.fromUserId, pc)
                }
            } catch (err) {
                console.warn('Error handling WebRTC answer:', err)
            }
        }

        const handleIceCandidate = async (payload: { fromUserId: string; meetingId: string; candidate: RTCIceCandidateInit }) => {
            const pc = peerConnectionsRef.current[payload.fromUserId]
            if (!pc || !pc.remoteDescription) {
                if (!pendingCandidatesRef.current[payload.fromUserId]) {
                    pendingCandidatesRef.current[payload.fromUserId] = []
                }
                pendingCandidatesRef.current[payload.fromUserId].push(payload.candidate)
                return
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch (err) {
                console.warn('Error adding ICE candidate:', err)
            }
        }

        const handleUserLeft = (payload: { userId: string; meetingId: string }) => {
            removeParticipant(payload.userId)
            cleanupPeer(payload.userId)
        }

        const handleScreenStart = (payload: { userId: string; meetingId: string; }) => {
            setScreenSharingUserId(payload.userId)
        }

        const handleScreenStop = (payload: { userId: string; meetingId: string; }) => {
            setScreenSharingUserId((prev) => (prev === payload.userId ? null : prev))
        }

        const handleScreenChanged = (payload: { userId: string; meetingId: string; active: boolean }) => {
            setScreenSharingUserId(payload.active ? payload.userId : null)
        }

        socket.on(SocketEvents.WEBRTC_USER_JOINED, handleUserJoined)
        socket.on(SocketEvents.WEBRTC_OFFER, handleOffer)
        socket.on(SocketEvents.WEBRTC_ANSWER, handleAnswer)
        socket.on(SocketEvents.WEBRTC_ICE_CANDIDATE, handleIceCandidate)
        socket.on(SocketEvents.WEBRTC_USER_LEFT, handleUserLeft)
        socket.on(SocketEvents.SCREEN_START, handleScreenStart)
        socket.on(SocketEvents.SCREEN_STOP, handleScreenStop)
        socket.on(SocketEvents.SCREEN_CHANGED, handleScreenChanged)

        return () => {
            socket.off(SocketEvents.WEBRTC_USER_JOINED, handleUserJoined)
            socket.off(SocketEvents.WEBRTC_OFFER, handleOffer)
            socket.off(SocketEvents.WEBRTC_ANSWER, handleAnswer)
            socket.off(SocketEvents.WEBRTC_ICE_CANDIDATE, handleIceCandidate)
            socket.off(SocketEvents.WEBRTC_USER_LEFT, handleUserLeft)
            socket.off(SocketEvents.SCREEN_START, handleScreenStart)
            socket.off(SocketEvents.SCREEN_STOP, handleScreenStop)
            socket.off(SocketEvents.SCREEN_CHANGED, handleScreenChanged)
        }
    }, [socket, addParticipant, removeParticipant, cleanupPeer])

    return useMemo(
        () => ({ remoteStreams, connectToMeeting, leaveMeeting, startScreenShare, stopScreenShare, screenSharingUserId, screenError, replaceTrackOnPeers }),
        [remoteStreams, connectToMeeting, leaveMeeting, startScreenShare, stopScreenShare, screenSharingUserId, screenError, replaceTrackOnPeers]
    )
}
