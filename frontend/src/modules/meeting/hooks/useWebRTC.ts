import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'
import { createPeerConnection, peerRemoteStreams, optimizePeerConnectionForHd } from '../services/webrtc.service'
import { getScreenShareStream, stopScreenShareStream } from '../services/screen.service'

function enhanceSdpForHdVideo(sdp?: string): string {
    if (!sdp) return ''
    let modified = sdp
    if (modified.includes('m=video')) {
        // Boost video bandwidth allocation to 4000 kbps (4 Mbps)
        modified = modified.replace(/(m=video [^\r\n]+[\r\n]+)/g, `$1b=AS:4000\r\nb=TIAS:4000000\r\n`)
    }
    return modified
}

interface UseWebRTCResult {
    remoteStreams: Record<string, MediaStream>
    connectToMeeting: (meetingId: string, displayName?: string) => void
    leaveMeeting: () => void
    startScreenShare: () => Promise<void>
    stopScreenShare: () => void
    screenSharingUserId: string | null
    screenError: string | null
    clearScreenError: () => void
    replaceTrackOnPeers: (newTrack: MediaStreamTrack | null) => void
    networkStatus: 'online' | 'offline' | 'reconnecting'
    isReconnecting: boolean
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
    const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnecting'>(navigator.onLine ? 'online' : 'offline')
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false)
    const peerConnectionsRef = useRef<InternalPeerConnections>({})
    const localStreamRef = useRef<MediaStream | null>(null)
    const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({})
    const iceRestartTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    // Dynamically scale mesh video bitrates across all active peer senders
    const rebalanceMeshBitrate = useCallback(() => {
        const activeCount = Object.keys(peerConnectionsRef.current).length + 1
        Object.values(peerConnectionsRef.current).forEach((pc) => {
            optimizePeerConnectionForHd(pc, activeCount)
        })
    }, [])

    const cleanupPeer = useCallback((userId: string) => {
        if (iceRestartTimersRef.current[userId]) {
            clearTimeout(iceRestartTimersRef.current[userId])
            delete iceRestartTimersRef.current[userId]
        }
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
            rebalanceMeshBitrate()
        }
    }, [rebalanceMeshBitrate])

    const leaveMeeting = useCallback(() => {
        const activeMeetingId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
        setMeetingId('')
        setJoined(false)
        sessionStorage.removeItem('jts_active_meeting_id')
        if (window.location.hash.startsWith('#meeting')) {
            window.history.replaceState(null, '', '/#meeting')
        }
        Object.keys(peerConnectionsRef.current).forEach((userId) => cleanupPeer(userId))
        if (socket && activeMeetingId) {
            socket.emit(SocketEvents.MEETING_LEAVE, { meetingId: activeMeetingId })
            socket.emit('meeting:leave', { meetingId: activeMeetingId })
        }
    }, [cleanupPeer, meetingId, setJoined, socket])

    const connectToMeeting = useCallback(
        (targetMeetingId: string, displayName?: string) => {
            if (!socket) {
                return
            }

            setMeetingId(targetMeetingId)
            sessionStorage.setItem('jts_active_meeting_id', targetMeetingId)
            localStorage.setItem('jts_last_meeting_id', targetMeetingId)
            window.history.replaceState(null, '', `/#meeting?id=${encodeURIComponent(targetMeetingId)}`)

            let effectiveName = displayName || localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
            try {
                const token = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
                if (token) {
                    const parts = token.split('.')
                    if (parts.length === 3) {
                        const decoded = JSON.parse(atob(parts[1]))
                        if (decoded) {
                            effectiveName = decoded.guestName || decoded.fullName || decoded.name || effectiveName
                        }
                    }
                }
            } catch (e) {}

            const vTrack = localStreamRef.current?.getVideoTracks()[0]
            const aTrack = localStreamRef.current?.getAudioTracks()[0]
            const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled) : false
            const isLocalAudioMuted = aTrack ? (!aTrack.enabled || aTrack.muted) : false

            socket.emit(SocketEvents.WEBRTC_JOIN, { 
                meetingId: targetMeetingId,
                displayName: effectiveName || undefined,
                isVideoOff: isLocalVideoOff,
                isMuted: isLocalAudioMuted
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

    const screenTrackRef = useRef<MediaStreamTrack | null>(null)

    const stopScreenShare = useCallback(async () => {
        if (screenTrackRef.current) {
            try {
                screenTrackRef.current.stop()
            } catch {}
            screenTrackRef.current = null
        }

        try {
            // Find active live camera track from cameraStream or localStream
            let cameraTrack = cameraStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy) || null

            // If camera track was not live, re-acquire fresh camera video track seamlessly
            if (!cameraTrack) {
                try {
                    const freshCam = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1920, min: 1280 },
                            height: { ideal: 1080, min: 720 },
                            frameRate: { ideal: 30, max: 60 },
                            aspectRatio: { ideal: 1.7777777778 }
                        }
                    })
                    cameraTrack = freshCam.getVideoTracks()[0] || null
                } catch (e) {
                    console.warn('[ScreenShare] Could not re-acquire camera stream on screen stop:', e)
                }
            }

            const audioTracks = (cameraStream || localStreamRef.current)?.getAudioTracks().filter(t => t.readyState === 'live') || []
            const tracks: MediaStreamTrack[] = []
            if (cameraTrack) tracks.push(cameraTrack)
            tracks.push(...audioTracks)

            const restoredStream = new MediaStream(tracks)
            replaceLocalStream(restoredStream)

            if (cameraTrack) {
                replaceTrackOnPeers(cameraTrack)
            }

            if (socket && meetingId) {
                socket.emit(SocketEvents.SCREEN_STOP, { meetingId })
            }
        } catch (err) {
            console.warn('[ScreenShare] Error during screen cleanup:', err)
        } finally {
            setScreenSharingUserId(null)
        }
    }, [cameraStream, replaceLocalStream, replaceTrackOnPeers, socket, meetingId])

    const startScreenShare = useCallback(async () => {
        if (!socket) {
            return
        }

        setScreenError(null)
        try {
            const screenStream = await getScreenShareStream()
            const screenTrack = screenStream.getVideoTracks()[0]
            if (!screenTrack) {
                throw new Error('No screen track captured')
            }
            screenTrackRef.current = screenTrack

            // Preserve active microphone audio tracks so the user is never muted or disconnected
            const audioTracks = (cameraStream || localStreamRef.current)?.getAudioTracks() || []
            const combinedStream = new MediaStream([screenTrack, ...audioTracks])

            replaceLocalStream(combinedStream)
            replaceTrackOnPeers(screenTrack)
            setScreenSharingUserId('me')
            socket.emit(SocketEvents.SCREEN_START, { meetingId })

            screenTrack.onended = () => {
                stopScreenShare()
            }
        } catch (error: any) {
            // Check if user dismissed or cancelled the browser's screen-share prompt
            const msg = (error?.message || '').toLowerCase()
            const name = error?.name || ''
            if (
                name === 'NotAllowedError' ||
                name === 'AbortError' ||
                msg.includes('permission denied') ||
                msg.includes('cancel') ||
                msg.includes('dismissed') ||
                msg.includes('aborted')
            ) {
                // Normal user cancellation - do not treat as error
                return
            }
            setScreenError(error?.message || 'Screen sharing cancelled')
            setTimeout(() => {
                setScreenError(null)
            }, 4000)
        }
    }, [cameraStream, meetingId, replaceLocalStream, replaceTrackOnPeers, socket, stopScreenShare])

    const clearScreenError = useCallback(() => {
        setScreenError(null)
    }, [])

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

            if (socket && meetingId && aTrack) {
                const isMutedNow = !aTrack.enabled || aTrack.muted
                socket.emit('meeting:mic-toggle', {
                    meetingId,
                    isMuted: isMutedNow
                })
            }
        }
    }, [localStream, replaceTrackOnPeers, socket, meetingId])

    const triggerIceRestart = useCallback(async (targetUserId: string) => {
        const pc = peerConnectionsRef.current[targetUserId]
        const activeMeetingId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
        if (!pc || !socket || !activeMeetingId) return
        try {
            console.log(`[WebRTC] Initiating ICE restart for user ${targetUserId}`)
            setIsReconnecting(true)
            setNetworkStatus('reconnecting')
            const offer = await pc.createOffer({ iceRestart: true })
            const hdSdp = enhanceSdpForHdVideo(offer.sdp)
            const hdOffer = { type: offer.type, sdp: hdSdp }
            await pc.setLocalDescription(hdOffer)
            optimizePeerConnectionForHd(pc, Object.keys(peerConnectionsRef.current).length + 1)
            socket.emit(SocketEvents.WEBRTC_OFFER, {
                targetUserId,
                meetingId: activeMeetingId,
                offer: hdOffer,
                displayName: localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || undefined
            })
        } catch (err) {
            console.warn('[WebRTC] ICE restart failed for user', targetUserId, err)
        }
    }, [meetingId, socket])

    // Window online/offline automatic resilience handlers
    useEffect(() => {
        const handleOnline = () => {
            console.log('[WebRTC] Browser reported ONLINE. Restoring peer mesh connections...')
            setNetworkStatus('reconnecting')
            setIsReconnecting(true)
            // Trigger ICE restart on all existing peers
            Object.keys(peerConnectionsRef.current).forEach((uId) => {
                triggerIceRestart(uId)
            })
            setTimeout(() => {
                setNetworkStatus('online')
                setIsReconnecting(false)
            }, 3000)
        }

        const handleOffline = () => {
            console.warn('[WebRTC] Browser reported OFFLINE.')
            setNetworkStatus('offline')
            setIsReconnecting(true)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [triggerIceRestart])

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

            const currentPeerCount = Object.keys(peerConnectionsRef.current).length + 2
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
                    },
                    onIceStateChange: (state) => {
                        if (state === 'disconnected' || state === 'failed') {
                            setIsReconnecting(true)
                            setNetworkStatus('reconnecting')
                            if (!iceRestartTimersRef.current[payload.userId]) {
                                iceRestartTimersRef.current[payload.userId] = setTimeout(() => {
                                    triggerIceRestart(payload.userId)
                                }, 2500)
                            }
                        } else if (state === 'connected' || state === 'completed') {
                            if (iceRestartTimersRef.current[payload.userId]) {
                                clearTimeout(iceRestartTimersRef.current[payload.userId])
                                delete iceRestartTimersRef.current[payload.userId]
                            }
                            setIsReconnecting(false)
                            setNetworkStatus('online')
                        }
                    }
                },
                currentPeerCount
            )

            peerConnectionsRef.current[payload.userId] = pc
            rebalanceMeshBitrate()

            pc.createOffer().then((offer) => {
                const hdSdp = enhanceSdpForHdVideo(offer.sdp)
                const hdOffer = { type: offer.type, sdp: hdSdp }
                return pc.setLocalDescription(hdOffer).then(() => {
                    optimizePeerConnectionForHd(pc, currentPeerCount)
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
                    const aTrack = localStreamRef.current?.getAudioTracks()[0]
                    const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled) : false
                    const isLocalAudioMuted = aTrack ? (!aTrack.enabled || aTrack.muted) : false

                    socket.emit(SocketEvents.WEBRTC_OFFER, {
                        targetUserId: payload.userId,
                        meetingId: payload.meetingId,
                        offer: hdOffer,
                        displayName: myName,
                        isVideoOff: isLocalVideoOff,
                        isMuted: isLocalAudioMuted
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

            const currentPeerCount = Object.keys(peerConnectionsRef.current).length + 2
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
                    },
                    onIceStateChange: (state) => {
                        if (state === 'disconnected' || state === 'failed') {
                            setIsReconnecting(true)
                            setNetworkStatus('reconnecting')
                            if (!iceRestartTimersRef.current[payload.fromUserId]) {
                                iceRestartTimersRef.current[payload.fromUserId] = setTimeout(() => {
                                    triggerIceRestart(payload.fromUserId)
                                }, 2500)
                            }
                        } else if (state === 'connected' || state === 'completed') {
                            if (iceRestartTimersRef.current[payload.fromUserId]) {
                                clearTimeout(iceRestartTimersRef.current[payload.fromUserId])
                                delete iceRestartTimersRef.current[payload.fromUserId]
                            }
                            setIsReconnecting(false)
                            setNetworkStatus('online')
                        }
                    }
                },
                currentPeerCount
            )

            peerConnectionsRef.current[payload.fromUserId] = pc
            rebalanceMeshBitrate()

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
                const answer = await pc.createAnswer()
                const hdSdp = enhanceSdpForHdVideo(answer.sdp)
                const hdAnswer = { type: answer.type, sdp: hdSdp }
                await pc.setLocalDescription(hdAnswer)
                optimizePeerConnectionForHd(pc, currentPeerCount)
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
                const aTrack = localStreamRef.current?.getAudioTracks()[0]
                const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled) : false
                const isLocalAudioMuted = aTrack ? (!aTrack.enabled || aTrack.muted) : false

                socket.emit(SocketEvents.WEBRTC_ANSWER, {
                    targetUserId: payload.fromUserId,
                    meetingId: payload.meetingId,
                    answer: hdAnswer,
                    displayName: myName,
                    isVideoOff: isLocalVideoOff,
                    isMuted: isLocalAudioMuted
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
    }, [socket, addParticipant, removeParticipant, cleanupPeer, triggerIceRestart, rebalanceMeshBitrate])

    return useMemo(
        () => ({ remoteStreams, connectToMeeting, leaveMeeting, startScreenShare, stopScreenShare, screenSharingUserId, screenError, clearScreenError, replaceTrackOnPeers, networkStatus, isReconnecting }),
        [remoteStreams, connectToMeeting, leaveMeeting, startScreenShare, stopScreenShare, screenSharingUserId, screenError, clearScreenError, replaceTrackOnPeers, networkStatus, isReconnecting]
    )
}
