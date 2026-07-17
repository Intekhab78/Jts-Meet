import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'
import { createPeerConnection } from '../services/webrtc.service'
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

    const cleanupPeer = useCallback((userId: string) => {
        const pc = peerConnectionsRef.current[userId]
        if (pc) {
            pc.close()
            delete peerConnectionsRef.current[userId]
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
            const isLocalVideoOff = !localStreamRef.current || 
                localStreamRef.current.getVideoTracks().length === 0 || 
                !!(localStreamRef.current.getVideoTracks()[0] as any).isDummy;

            console.log('useWebRTC connectToMeeting isLocalVideoOff check:', {
                localStreamExists: !!localStreamRef.current,
                tracksCount: localStreamRef.current ? localStreamRef.current.getVideoTracks().length : 0,
                isDummyTrack: localStreamRef.current && localStreamRef.current.getVideoTracks()[0] ? !!(localStreamRef.current.getVideoTracks()[0] as any).isDummy : false,
                isLocalVideoOff
            });
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
            Object.values(peerConnectionsRef.current).forEach((pc) => {
                const sender = pc.getSenders().find((s) => {
                    if (s.track) return s.track.kind === 'video'
                    const tc = pc.getTransceivers().find(t => t.sender === s)
                    return tc && tc.receiver.track && tc.receiver.track.kind === 'video'
                })
                if (sender) {
                    sender.replaceTrack(newTrack)
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
    }, [localStream])

    useEffect(() => {
        if (!socket) {
            return
        }

        const handleUserJoined = (payload: { userId: string; meetingId: string }) => {
            addParticipant(payload.userId)
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
                    let myName = '';
                    try {
                        const token = localStorage.getItem('jts_token') || '';
                        if (token) {
                            const parts = token.split('.');
                            if (parts.length === 3) {
                                const decoded = JSON.parse(atob(parts[1]));
                                if (decoded && decoded.isGuest) {
                                    myName = decoded.guestName;
                                }
                            }
                        }
                    } catch (e) {}

                    const isLocalVideoOff = !localStreamRef.current || 
                        localStreamRef.current.getVideoTracks().length === 0 || 
                        !!(localStreamRef.current.getVideoTracks()[0] as any).isDummy;

                    console.log('useWebRTC WEBRTC_OFFER isLocalVideoOff check:', {
                        targetUserId: payload.userId,
                        localStreamExists: !!localStreamRef.current,
                        tracksCount: localStreamRef.current ? localStreamRef.current.getVideoTracks().length : 0,
                        isDummyTrack: localStreamRef.current && localStreamRef.current.getVideoTracks()[0] ? !!(localStreamRef.current.getVideoTracks()[0] as any).isDummy : false,
                        isLocalVideoOff
                    });
                    socket.emit(SocketEvents.WEBRTC_OFFER, {
                        targetUserId: payload.userId,
                        meetingId: payload.meetingId,
                        offer,
                        displayName: myName,
                        isVideoOff: isLocalVideoOff
                    })
                })
            })
        }

        const handleOffer = async (payload: { fromUserId: string; meetingId: string; offer: RTCSessionDescriptionInit }) => {
            addParticipant(payload.fromUserId)
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

            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            socket.emit(SocketEvents.WEBRTC_ANSWER, {
                targetUserId: payload.fromUserId,
                meetingId: payload.meetingId,
                answer
            })
        }

        const handleAnswer = async (payload: { fromUserId: string; meetingId: string; answer: RTCSessionDescriptionInit }) => {
            const pc = peerConnectionsRef.current[payload.fromUserId]
            if (!pc) {
                console.warn('handleAnswer: PeerConnection not found for user', payload.fromUserId)
                return
            }
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
        }

        const handleIceCandidate = async (payload: { fromUserId: string; meetingId: string; candidate: RTCIceCandidateInit }) => {
            const pc = peerConnectionsRef.current[payload.fromUserId]
            if (!pc) {
                console.warn('handleIceCandidate: PeerConnection not found for user', payload.fromUserId)
                return
            }
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
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
