import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'
import { createPeerConnection, peerRemoteStreams, optimizePeerConnectionForHd } from '../services/webrtc.service'
import { getScreenShareStream, stopScreenShareStream } from '../services/screen.service'

function getTargetBitrateForPeers(peerCount: number): { as: number; tias: number } {
    if (peerCount <= 2) return { as: 2500, tias: 2500000 }
    if (peerCount <= 4) return { as: 1200, tias: 1200000 }
    if (peerCount <= 8) return { as: 600, tias: 600000 }
    return { as: 350, tias: 350000 }
}

function enhanceSdpForHdVideo(sdp?: string, _peerCount: number = 1): string {
    if (!sdp) return ''
    let enhanced = sdp

    // Google Meet Audio Architecture:
    // 1. usedtx=1: Discontinuous Transmission (completely silences audio when not speaking — kills fan, wind, room noise)
    // 2. stereo=0, sprop-stereo=0: Forces clean mono speech (eliminates stereo laptop microphone fan whistle and phase cancellation)
    // 3. useinbandfec=1: In-band forward error correction for glitch-free voice
    // 4. cbr=0: Variable speech bit allocation
    // 5. maxaveragebitrate=32000: Google Meet voice optimization standard
    try {
        const lines = enhanced.split('\r\n')
        let opusPt: string | null = null

        for (const line of lines) {
            if (line.startsWith('a=rtpmap:') && line.toLowerCase().includes('opus/48000')) {
                const match = line.match(/^a=rtpmap:(\d+)\s+opus\/48000/i)
                if (match) {
                    opusPt = match[1]
                    break
                }
            }
        }

        if (opusPt) {
            let fmtpFound = false
            const updatedLines = lines.map(line => {
                if (line.startsWith(`a=fmtp:${opusPt}`)) {
                    fmtpFound = true
                    const baseParams = line.replace(`a=fmtp:${opusPt} `, '')
                    const paramsMap: Record<string, string> = {}
                    baseParams.split(';').forEach(kv => {
                        const [k, v] = kv.split('=')
                        if (k) paramsMap[k.trim()] = v !== undefined ? v.trim() : ''
                    })
                    paramsMap['minptime'] = '10'
                    paramsMap['ptime'] = '20'
                    paramsMap['maxplaybackrate'] = '48000'
                    paramsMap['sprop-maxcapturerate'] = '48000'
                    paramsMap['useinbandfec'] = '1'
                    paramsMap['stereo'] = '0'
                    paramsMap['sprop-stereo'] = '0'
                    paramsMap['usedtx'] = '0'
                    paramsMap['dtx'] = '0'
                    paramsMap['cbr'] = '0'
                    paramsMap['maxaveragebitrate'] = '32000'

                    const newParams = Object.entries(paramsMap).map(([k, v]) => `${k}=${v}`).join(';')
                    return `a=fmtp:${opusPt} ${newParams}`
                }
                return line
            })

            if (!fmtpFound) {
                const insertIndex = updatedLines.findIndex(l => l.startsWith(`a=rtpmap:${opusPt}`))
                if (insertIndex !== -1) {
                    updatedLines.splice(insertIndex + 1, 0, `a=fmtp:${opusPt} minptime=10;ptime=20;maxplaybackrate=48000;sprop-maxcapturerate=48000;useinbandfec=1;stereo=0;sprop-stereo=0;usedtx=0;dtx=0;cbr=0;maxaveragebitrate=32000`)
                }
            }
            enhanced = updatedLines.join('\r\n')
        }
    } catch (e) {
        console.warn('Error enhancing SDP for audio:', e)
    }

    return enhanced
}

interface UseWebRTCResult {
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
    replaceTrackOnPeers: (newTrack: MediaStreamTrack | null) => void
    networkStatus: 'online' | 'offline' | 'reconnecting'
    isReconnecting: boolean
    retryConnection: () => Promise<void>
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
    const [screenSharingUserIds, setScreenSharingUserIds] = useState<string[]>([])
    const [screenError, setScreenError] = useState<string | null>(null)
    const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnecting'>(navigator.onLine ? 'online' : 'offline')
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false)
    const peerConnectionsRef = useRef<InternalPeerConnections>({})
    const localStreamRef = useRef<MediaStream | null>(null)
    const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({})
    const iceRestartTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const reconnectFailsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const makingOfferRef = useRef<Record<string, boolean>>({})
    const ignoreOfferRef = useRef<Record<string, boolean>>({})

    const clearReconnectFailsafe = useCallback(() => {
        if (reconnectFailsafeTimerRef.current) {
            clearTimeout(reconnectFailsafeTimerRef.current)
            reconnectFailsafeTimerRef.current = null
        }
    }, [])

    const startReconnectFailsafe = useCallback(() => {
        clearReconnectFailsafe()
        reconnectFailsafeTimerRef.current = setTimeout(() => {
            if (navigator.onLine) {
                console.log('[WebRTC] Reconnect failsafe auto-cleared: maintaining active call state')
                setIsReconnecting(false)
                setNetworkStatus('online')
            }
        }, 6000)
    }, [clearReconnectFailsafe])

    const evaluateMeshHealth = useCallback(() => {
        if (!navigator.onLine) {
            setNetworkStatus('offline')
            setIsReconnecting(true)
            return
        }

        const pcs = Object.values(peerConnectionsRef.current)
        if (pcs.length === 0) {
            if (socket && !socket.connected) {
                setNetworkStatus('reconnecting')
                setIsReconnecting(true)
                startReconnectFailsafe()
            } else {
                setNetworkStatus('online')
                setIsReconnecting(false)
                clearReconnectFailsafe()
            }
            return
        }

        const connectedPeers = pcs.filter(
            (pc) => pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed'
        )
        const failedPeers = pcs.filter(
            (pc) => pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed'
        )

        // In P2P mesh: If AT LEAST ONE remote peer is connected, the room call is healthy and active.
        // A single remote peer's network blip must NOT show a global red banner to everyone else.
        if (connectedPeers.length > 0) {
            setIsReconnecting(false)
            setNetworkStatus('online')
            clearReconnectFailsafe()
            return
        }

        // Only if ALL active peers have dropped simultaneously do we declare call reconnection
        if (failedPeers.length === pcs.length) {
            setIsReconnecting(true)
            setNetworkStatus('reconnecting')
            startReconnectFailsafe()
        }
    }, [socket, startReconnectFailsafe, clearReconnectFailsafe])

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
            delete makingOfferRef.current[userId]
            delete ignoreOfferRef.current[userId]
            peerRemoteStreams.delete(userId)
            setRemoteStreams((prev) => {
                const nextStreams = { ...prev }
                delete nextStreams[userId]
                return nextStreams
            })
            rebalanceMeshBitrate()
            evaluateMeshHealth()
        }
    }, [rebalanceMeshBitrate, evaluateMeshHealth])

    const leaveMeeting = useCallback(() => {
        clearReconnectFailsafe()
        setIsReconnecting(false)
        setNetworkStatus('online')
        const activeMeetingId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
        setMeetingId('')
        setJoined(false)
        setScreenSharingUserId(null)
        setScreenSharingUserIds([])
        sessionStorage.removeItem('jts_active_meeting_id')
        if (window.location.hash.startsWith('#meeting')) {
            window.history.replaceState(null, '', '/#meeting')
        }
        Object.keys(peerConnectionsRef.current).forEach((userId) => cleanupPeer(userId))
        if (socket && activeMeetingId) {
            socket.emit(SocketEvents.MEETING_LEAVE, { meetingId: activeMeetingId })
            socket.emit('meeting:leave', { meetingId: activeMeetingId })
        }
    }, [cleanupPeer, clearReconnectFailsafe, meetingId, setJoined, socket])

    const connectToMeeting = useCallback(
        (targetMeetingId: string, displayName?: string, isDirectCall?: boolean) => {
            if (!socket) {
                return
            }

            // If switching to a different meeting room (e.g., entering or leaving a breakout room),
            // cleanly tear down all previous peer connections and ghost streams
            const currentActiveId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
            if (currentActiveId && currentActiveId !== targetMeetingId) {
                Object.keys(peerConnectionsRef.current).forEach((uId) => cleanupPeer(uId))
                setRemoteStreams({})
                peerRemoteStreams.clear()
                setScreenSharingUserId(null)
                setScreenSharingUserIds([])
            }

            setMeetingId(targetMeetingId)
            if (!isDirectCall) {
                sessionStorage.setItem('jts_active_meeting_id', targetMeetingId)
                localStorage.setItem('jts_last_meeting_id', targetMeetingId)
                window.history.replaceState(null, '', `/#meeting?id=${encodeURIComponent(targetMeetingId)}`)
            }

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
            const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled || vTrack.readyState === 'ended') : true
            // Only intentional user mute (!aTrack.enabled) or ended track should be marked as muted.
            // Never treat temporary WebRTC buffer/audio device jitter (aTrack.muted) as user mute!
            const isLocalAudioMuted = aTrack ? (!aTrack.enabled || aTrack.readyState === 'ended') : false

            socket.emit(SocketEvents.WEBRTC_JOIN, { 
                meetingId: targetMeetingId,
                displayName: effectiveName || undefined,
                isVideoOff: isLocalVideoOff,
                isMuted: isLocalAudioMuted
            })
        },
        [socket]
    )

    const triggerIceRestart = useCallback(async (targetUserId: string) => {
        const pc = peerConnectionsRef.current[targetUserId]
        const activeMeetingId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
        if (!pc || !socket || !activeMeetingId) return
        try {
            console.log(`[WebRTC] Initiating ICE restart for user ${targetUserId}`)
            // Evaluate overall mesh health rather than unconditionally showing red banner
            evaluateMeshHealth()
            makingOfferRef.current[targetUserId] = true
            const offer = await pc.createOffer({ iceRestart: true, voiceActivityDetection: true } as any)
            const activePeers = Object.keys(peerConnectionsRef.current).length + 1
            const hdSdp = enhanceSdpForHdVideo(offer.sdp, activePeers)
            const hdOffer = { type: offer.type, sdp: hdSdp }
            await pc.setLocalDescription(hdOffer)
            const isSharing = !!screenTrackRef.current
            optimizePeerConnectionForHd(pc, activePeers, isSharing)
            socket.emit(SocketEvents.WEBRTC_OFFER, {
                targetUserId,
                meetingId: activeMeetingId,
                offer: hdOffer,
                displayName: localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || undefined
            })
        } catch (err) {
            console.warn('[WebRTC] ICE restart failed for user', targetUserId, err)
        } finally {
            makingOfferRef.current[targetUserId] = false
        }
    }, [meetingId, socket, evaluateMeshHealth])

    const handlePeerIceStateChange = useCallback((userId: string, state: RTCIceConnectionState) => {
        if (state === 'disconnected' || state === 'failed') {
            if (!iceRestartTimersRef.current[userId]) {
                iceRestartTimersRef.current[userId] = setTimeout(() => {
                    triggerIceRestart(userId)
                }, 2500)
            }
            evaluateMeshHealth()
        } else if (state === 'connected' || state === 'completed') {
            if (iceRestartTimersRef.current[userId]) {
                clearTimeout(iceRestartTimersRef.current[userId])
                delete iceRestartTimersRef.current[userId]
            }
            evaluateMeshHealth()
        }
    }, [triggerIceRestart, evaluateMeshHealth])

    const retryConnection = useCallback(async () => {
        console.log('[WebRTC] User manually requested connection retry')
        setIsReconnecting(true)
        setNetworkStatus('reconnecting')

        if (socket && !socket.connected) {
            try {
                socket.connect()
            } catch (e) {}
        }

        const peerIds = Object.keys(peerConnectionsRef.current)
        if (peerIds.length > 0) {
            peerIds.forEach((pId) => {
                triggerIceRestart(pId)
            })
        }

        const activeMeetingId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
        if (activeMeetingId) {
            connectToMeeting(activeMeetingId)
        }

        setTimeout(() => {
            evaluateMeshHealth()
            if (navigator.onLine) {
                setIsReconnecting(false)
                setNetworkStatus('online')
            }
        }, 1200)
    }, [socket, meetingId, connectToMeeting, triggerIceRestart, evaluateMeshHealth])

    const screenTrackRef = useRef<MediaStreamTrack | null>(null)

    const replaceTrackOnPeers = useCallback(
        (newTrack: MediaStreamTrack | null, kindOverride?: 'video' | 'audio') => {
            const kind = newTrack ? newTrack.kind : (kindOverride || 'video')
            const isScreen = !!screenTrackRef.current && newTrack === screenTrackRef.current
            const peerCount = Object.keys(peerConnectionsRef.current).length + 1

            Object.entries(peerConnectionsRef.current).forEach(([targetUserId, pc]) => {
                // Find matching transceiver for this kind (audio or video)
                const tc = pc.getTransceivers().find(t => 
                    (t.receiver?.track?.kind === kind) ||
                    (t.sender?.track && t.sender.track.kind === kind) ||
                    (!t.sender?.track && kind === 'video')
                )

                if (tc) {
                    const directionChanged = tc.direction !== 'sendrecv' && tc.direction !== 'sendonly'
                    if (directionChanged) {
                        tc.direction = 'sendrecv'
                    }
                    if (tc.sender) {
                        tc.sender.replaceTrack(newTrack).then(() => {
                            if (kind === 'video') {
                                optimizePeerConnectionForHd(pc, peerCount, isScreen)
                            }
                            // Restart ICE and renegotiate if transceiver direction flipped, screen sharing started, or video track was restored
                            if (directionChanged || isScreen || (kind === 'video' && newTrack !== null)) {
                                triggerIceRestart(targetUserId)
                            }
                        }).catch(err => {
                            console.warn('Failed to replace track on transceiver:', err)
                        })
                        return
                    }
                }

                const sender = pc.getSenders().find((s) => (s.track && s.track.kind === kind) || (!s.track && kind === 'video'))
                if (sender) {
                    sender.replaceTrack(newTrack).then(() => {
                        if (kind === 'video') {
                            optimizePeerConnectionForHd(pc, peerCount, isScreen)
                        }
                        if (isScreen || (kind === 'video' && newTrack !== null)) {
                            triggerIceRestart(targetUserId)
                        }
                    }).catch(err => {
                        console.warn('Failed to replace track on peer:', err)
                    })
                } else if (newTrack && localStreamRef.current) {
                    try {
                        pc.addTrack(newTrack, localStreamRef.current)
                        // Trigger renegotiation so the remote peer receives the newly added track
                        triggerIceRestart(targetUserId)
                    } catch (err) {
                        console.warn('Failed to add track to peer:', err)
                    }
                }
            })
        },
        [triggerIceRestart]
    )

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

            const audioTracks = (cameraStream || localStreamRef.current)?.getAudioTracks().filter(t => t.readyState === 'live') || []
            const tracks: MediaStreamTrack[] = []
            if (cameraTrack && cameraTrack.readyState === 'live') {
                tracks.push(cameraTrack)
            }
            tracks.push(...audioTracks)

            const restoredStream = new MediaStream(tracks)
            replaceLocalStream(restoredStream)

            replaceTrackOnPeers(cameraTrack, 'video')

            const activeMeetingId = meetingId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.split('?')[1]).get('id') : '') || sessionStorage.getItem('jts_active_meeting_id') || localStorage.getItem('jts_last_meeting_id') || ''
            if (socket && activeMeetingId) {
                socket.emit(SocketEvents.SCREEN_STOP, { meetingId: activeMeetingId })
                const isCamOff = !cameraTrack || (cameraTrack as any).isDummy || !cameraTrack.enabled
                socket.emit('meeting:camera-toggle', {
                    meetingId: activeMeetingId,
                    isVideoOff: isCamOff
                })
            }
        } catch (err) {
            console.warn('[ScreenShare] Error during screen cleanup:', err)
        } finally {
            setScreenSharingUserIds(prev => {
                const remaining = prev.filter(id => id !== 'me')
                setScreenSharingUserId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
                return remaining
            })
        }
    }, [cameraStream, replaceLocalStream, replaceTrackOnPeers, socket, meetingId])

    const startScreenShare = useCallback(async (existingStream?: MediaStream) => {
        if (!socket) {
            return
        }

        setScreenError(null)
        try {
            const screenStream = existingStream || await getScreenShareStream()
            const screenTrack = screenStream.getVideoTracks()[0]
            if (!screenTrack) {
                throw new Error('No screen track captured')
            }
            if ('contentHint' in screenTrack) {
                screenTrack.contentHint = 'detail'
            }
            screenTrackRef.current = screenTrack

            // Preserve active microphone audio tracks so the user is never muted or disconnected
            const micAudioTracks = (cameraStream || localStreamRef.current)?.getAudioTracks() || []
            const screenAudioTracks = screenStream.getAudioTracks() || []
            const audioTracks = [...micAudioTracks, ...screenAudioTracks]
            const combinedStream = new MediaStream([screenTrack, ...audioTracks])

            replaceLocalStream(combinedStream)
            replaceTrackOnPeers(screenTrack, 'video')
            setScreenSharingUserId('me')
            setScreenSharingUserIds(prev => prev.includes('me') ? prev : [...prev, 'me'])
            const activeMeetingId = meetingId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.split('?')[1]).get('id') : '') || sessionStorage.getItem('jts_active_meeting_id') || localStorage.getItem('jts_last_meeting_id') || ''
            if (activeMeetingId) {
                socket.emit(SocketEvents.SCREEN_START, { meetingId: activeMeetingId })
                socket.emit('meeting:camera-toggle', {
                    meetingId: activeMeetingId,
                    isVideoOff: false
                })
            }

            // Trigger ICE restart with each peer so their WebRTC media engines immediately pick up the screen track!
            Object.keys(peerConnectionsRef.current).forEach((targetUserId) => {
                triggerIceRestart(targetUserId)
            })

            screenTrack.onended = () => {
                stopScreenShare()
            }
        } catch (error: any) {
            // Check if user dismissed or cancelled the screen-share prompt
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
    }, [cameraStream, meetingId, replaceLocalStream, replaceTrackOnPeers, socket, stopScreenShare, triggerIceRestart])

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
        }
    }, [localStream, replaceTrackOnPeers, socket, meetingId])


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

        const getLocalUserId = () => {
            try {
                const token = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
                if (token) {
                    const parts = token.split('.')
                    if (parts.length === 3) {
                        const decoded = JSON.parse(atob(parts[1]))
                        return decoded.userId || decoded.id || decoded.sub || ''
                    }
                }
            } catch (_) {}
            return ''
        }

        const handleUserJoined = async (payload: { userId: string; meetingId: string }) => {
            const localId = getLocalUserId()
            if (!payload.userId || payload.userId === socket.id || (localId && payload.userId === localId) || payload.userId === 'me') {
                return
            }

            // Wait briefly if localStream is still initializing
            if (!localStreamRef.current) {
                let attempts = 0
                while (!localStreamRef.current && attempts < 12) {
                    await new Promise(r => setTimeout(r, 100))
                    attempts++
                }
            }

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
                        handlePeerIceStateChange(payload.userId, state)
                    }
                },
                currentPeerCount
            )

            peerConnectionsRef.current[payload.userId] = pc
            rebalanceMeshBitrate()

            makingOfferRef.current[payload.userId] = true
            pc.createOffer({ voiceActivityDetection: true } as any).then((offer) => {
                const hdSdp = enhanceSdpForHdVideo(offer.sdp, currentPeerCount)
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
                    const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled || vTrack.readyState === 'ended') : true
                    // Only intentional user mute (!aTrack.enabled) or ended track should be marked as muted.
                    // Never treat temporary WebRTC buffer/audio device jitter (aTrack.muted) as user mute!
                    const isLocalAudioMuted = aTrack ? (!aTrack.enabled || aTrack.readyState === 'ended') : false

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
            }).finally(() => {
                makingOfferRef.current[payload.userId] = false
            })
        }

        const handleOffer = async (payload: { fromUserId: string; meetingId: string; offer: RTCSessionDescriptionInit }) => {
            const localId = getLocalUserId()
            if (!payload.fromUserId || payload.fromUserId === socket.id || (localId && payload.fromUserId === localId) || payload.fromUserId === 'me') {
                return
            }

            // Wait briefly if localStream is still initializing so the answer includes live video and audio
            if (!localStreamRef.current) {
                let attempts = 0
                while (!localStreamRef.current && attempts < 12) {
                    await new Promise(r => setTimeout(r, 100))
                    attempts++
                }
            }

            addParticipant(payload.fromUserId)

            const currentPeerCount = Object.keys(peerConnectionsRef.current).length + 2
            let pc = peerConnectionsRef.current[payload.fromUserId]
            const isExistingActive = pc && pc.signalingState !== 'closed'

            if (!isExistingActive) {
                if (pc) {
                    try { pc.close() } catch (e) {}
                }

                pc = createPeerConnection(
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
                            handlePeerIceStateChange(payload.fromUserId, state)
                        }
                    },
                    currentPeerCount
                )

                peerConnectionsRef.current[payload.fromUserId] = pc
                rebalanceMeshBitrate()
            }

            // WEBRTC PERFECT NEGOTIATION / GLARE AVOIDANCE:
            // Deterministic polite peer resolution prevents offer collisions during renegotiation or network recovery
            const isPolite = String(localId || socket.id) < String(payload.fromUserId)
            const offerCollision = (pc.signalingState !== 'stable') || !!makingOfferRef.current[payload.fromUserId]

            ignoreOfferRef.current[payload.fromUserId] = !isPolite && offerCollision
            if (ignoreOfferRef.current[payload.fromUserId]) {
                console.log(`[WebRTC Perfect Negotiation] Glare collision detected with ${payload.fromUserId}: impolite peer ignoring offer to let local offer succeed`)
                return
            }

            if (offerCollision && isPolite) {
                console.log(`[WebRTC Perfect Negotiation] Glare collision detected with ${payload.fromUserId}: polite peer rolling back local offer`)
                try {
                    await pc.setLocalDescription({ type: 'rollback' })
                } catch (rollbackErr) {
                    console.warn(`[WebRTC] Rollback error for user ${payload.fromUserId}:`, rollbackErr)
                }
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
                const answer = await pc.createAnswer({ voiceActivityDetection: true } as any)
                const hdSdp = enhanceSdpForHdVideo(answer.sdp, currentPeerCount)
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
                const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled || vTrack.readyState === 'ended') : true
                const isLocalAudioMuted = aTrack ? (!aTrack.enabled || aTrack.readyState === 'ended') : false

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
            if (ignoreOfferRef.current[payload.fromUserId]) {
                console.log(`[WebRTC] Ignoring colliding answer from ${payload.fromUserId}`)
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
            if (!payload?.candidate || !payload.candidate.candidate) return
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
                if (!ignoreOfferRef.current[payload.fromUserId]) {
                    console.warn('Error adding ICE candidate:', err)
                }
            }
        }

        const handleUserLeft = (payload: { userId: string; meetingId: string }) => {
            removeParticipant(payload.userId)
            cleanupPeer(payload.userId)
            setScreenSharingUserIds(prev => {
                const remaining = prev.filter(id => id !== payload.userId)
                setScreenSharingUserId(curr => (curr === payload.userId ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : curr))
                return remaining
            })
        }

        const handleScreenStart = (payload: { userId: string; meetingId: string; }) => {
            setScreenSharingUserIds(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId])
            setScreenSharingUserId(payload.userId)
            // Trigger fresh MediaStream reference so React components re-mount/play the screen video
            setRemoteStreams(prev => {
                const existing = prev[payload.userId] || peerRemoteStreams.get(payload.userId)
                if (existing) {
                    return { ...prev, [payload.userId]: new MediaStream(existing.getTracks()) }
                }
                return prev
            })

            // If we don't have a video track for this user yet, request ICE restart to renegotiate the video track!
            const currentStream = peerRemoteStreams.get(payload.userId)
            if (!currentStream || currentStream.getVideoTracks().length === 0) {
                console.log(`[WebRTC] Remote user ${payload.userId} started screen share, ensuring ICE restart synchronization...`)
                triggerIceRestart(payload.userId)
            }
        }

        const handleScreenStop = (payload: { userId: string; meetingId: string; }) => {
            const targetId = String(payload?.userId || '')
            setScreenSharingUserIds(prev => {
                const remaining = prev.filter(id => String(id).toLowerCase() !== targetId.toLowerCase())
                setScreenSharingUserId(curr => (curr && String(curr).toLowerCase() === targetId.toLowerCase() ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : curr))
                return remaining
            })
            setRemoteStreams(prev => {
                if (prev[targetId]) {
                    return { ...prev, [targetId]: new MediaStream(prev[targetId].getTracks()) }
                }
                return prev
            })
        }

        const handleScreenChanged = (payload: { userId: string; meetingId: string; active: boolean }) => {
            const targetId = String(payload?.userId || '')
            if (!targetId) return
            if (payload.active) {
                setScreenSharingUserIds(prev => prev.some(id => String(id).toLowerCase() === targetId.toLowerCase()) ? prev : [...prev, targetId])
                setScreenSharingUserId(targetId)
            } else {
                setScreenSharingUserIds(prev => {
                    const remaining = prev.filter(id => String(id).toLowerCase() !== targetId.toLowerCase())
                    setScreenSharingUserId(curr => (curr && String(curr).toLowerCase() === targetId.toLowerCase() ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : curr))
                    return remaining
                })
            }
            setRemoteStreams(prev => {
                if (prev[targetId]) {
                    return { ...prev, [targetId]: new MediaStream(prev[targetId].getTracks()) }
                }
                return prev
            })
        }

        const handleRosterSync = (payload: { meetingId: string; participants: number; peers?: Array<{ userId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean; isScreenSharing?: boolean }> }) => {
            if (Array.isArray(payload?.peers)) {
                const localId = getLocalUserId()
                payload.peers.forEach((peer) => {
                    if (peer.userId && peer.userId !== socket.id && (!localId || peer.userId !== localId) && peer.userId !== 'me') {
                        addParticipant(peer.userId)
                        if (peer.isScreenSharing) {
                            setScreenSharingUserIds(prev => prev.includes(peer.userId) ? prev : [...prev, peer.userId])
                            setScreenSharingUserId(peer.userId)
                        }
                    }
                })
            }
        }

        const handleUserReconnecting = (payload: { userId: string; meetingId: string }) => {
            console.log(`[WebRTC] Remote peer ${payload.userId} has a connection blip. Holding peer pipeline...`)
        }

        const handleUserReconnected = (payload: { userId: string; meetingId: string }) => {
            console.log(`[WebRTC] Remote peer ${payload.userId} reconnected! Triggering fast ICE restart to sync media...`)
            triggerIceRestart(payload.userId)
        }

        socket.on(SocketEvents.WEBRTC_JOIN, handleRosterSync)
        socket.on(SocketEvents.WEBRTC_USER_JOINED, handleUserJoined)
        socket.on(SocketEvents.WEBRTC_OFFER, handleOffer)
        socket.on(SocketEvents.WEBRTC_ANSWER, handleAnswer)
        socket.on(SocketEvents.WEBRTC_ICE_CANDIDATE, handleIceCandidate)
        socket.on(SocketEvents.WEBRTC_USER_LEFT, handleUserLeft)
        socket.on('webrtc:user-reconnecting', handleUserReconnecting)
        socket.on('webrtc:user-reconnected', handleUserReconnected)
        socket.on(SocketEvents.SCREEN_START, handleScreenStart)
        socket.on(SocketEvents.SCREEN_STOP, handleScreenStop)
        socket.on(SocketEvents.SCREEN_CHANGED, handleScreenChanged)

        return () => {
            socket.off(SocketEvents.WEBRTC_JOIN, handleRosterSync)
            socket.off(SocketEvents.WEBRTC_USER_JOINED, handleUserJoined)
            socket.off(SocketEvents.WEBRTC_OFFER, handleOffer)
            socket.off(SocketEvents.WEBRTC_ANSWER, handleAnswer)
            socket.off(SocketEvents.WEBRTC_ICE_CANDIDATE, handleIceCandidate)
            socket.off(SocketEvents.WEBRTC_USER_LEFT, handleUserLeft)
            socket.off('webrtc:user-reconnecting', handleUserReconnecting)
            socket.off('webrtc:user-reconnected', handleUserReconnected)
            socket.off(SocketEvents.SCREEN_START, handleScreenStart)
            socket.off(SocketEvents.SCREEN_STOP, handleScreenStop)
            socket.off(SocketEvents.SCREEN_CHANGED, handleScreenChanged)
        }
    }, [socket, addParticipant, removeParticipant, cleanupPeer, triggerIceRestart, rebalanceMeshBitrate, handlePeerIceStateChange])

    // 20-Minute Audio & WebRTC Mesh Health Watchdog:
    // Periodically checks inbound audio RTP flow and connection state across all connected peers.
    // If a peer's inbound audio packets stall or connection drops silently, initiates auto-recovery.
    useEffect(() => {
        const lastInboundAudioBytes: Record<string, number> = {}
        const frozenAudioCycles: Record<string, number> = {}

        const interval = setInterval(async () => {
            if (!socket || !socket.connected) return

            const pcs = Object.entries(peerConnectionsRef.current)
            if (pcs.length === 0) return

            for (const [peerId, pc] of pcs) {
                if (!pc || pc.signalingState === 'closed') continue

                // 1. If ICE connection state dropped, restart ICE
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    console.log(`[WebRTC Watchdog] Peer ${peerId} in ${pc.iceConnectionState} state, restarting ICE...`)
                    triggerIceRestart(peerId)
                    continue
                }

                // 2. Inspect WebRTC stats for inbound audio RTP flow
                try {
                    const stats = await pc.getStats()
                    let foundInboundAudio = false
                    stats.forEach((report) => {
                        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                            foundInboundAudio = true
                            const currentBytes = report.bytesReceived || 0
                            const prevBytes = lastInboundAudioBytes[peerId] || 0
                            lastInboundAudioBytes[peerId] = currentBytes

                            // If bytes have not increased over consecutive intervals (audio stream frozen)
                            if (currentBytes > 0 && currentBytes === prevBytes) {
                                frozenAudioCycles[peerId] = (frozenAudioCycles[peerId] || 0) + 1
                                if (frozenAudioCycles[peerId] >= 3) { // ~18s of frozen audio
                                    console.warn(`[WebRTC Watchdog] Inbound audio frozen for peer ${peerId}. Triggering auto-recovery ICE restart...`)
                                    frozenAudioCycles[peerId] = 0
                                    triggerIceRestart(peerId)
                                }
                            } else {
                                frozenAudioCycles[peerId] = 0
                            }
                        }
                    })

                    // If connected but audio track is missing from the stream
                    if (!foundInboundAudio && pc.iceConnectionState === 'connected') {
                        const remoteStream = peerRemoteStreams.get(peerId)
                        if (!remoteStream || remoteStream.getAudioTracks().length === 0) {
                            frozenAudioCycles[peerId] = (frozenAudioCycles[peerId] || 0) + 1
                            if (frozenAudioCycles[peerId] >= 3) {
                                console.warn(`[WebRTC Watchdog] Missing audio track for connected peer ${peerId}. Resyncing offer...`)
                                frozenAudioCycles[peerId] = 0
                                triggerIceRestart(peerId)
                            }
                        }
                    }
                } catch (statsErr) {
                    // Ignore stats error
                }
            }
        }, 6000)

        return () => {
            clearInterval(interval)
        }
    }, [socket, triggerIceRestart])

    const switchActivePresenter = useCallback((targetUserId: string) => {
        setScreenSharingUserId(targetUserId)
    }, [])

    return useMemo(
        () => ({
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
            replaceTrackOnPeers,
            networkStatus,
            isReconnecting,
            retryConnection
        }),
        [
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
            replaceTrackOnPeers,
            networkStatus,
            isReconnecting,
            retryConnection
        ]
    )
}
