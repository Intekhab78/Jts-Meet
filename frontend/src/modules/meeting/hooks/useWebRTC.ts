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
                    paramsMap['usedtx'] = '1'
                    paramsMap['dtx'] = '1'
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
                    updatedLines.splice(insertIndex + 1, 0, `a=fmtp:${opusPt} minptime=10;ptime=20;maxplaybackrate=48000;sprop-maxcapturerate=48000;useinbandfec=1;stereo=0;sprop-stereo=0;usedtx=1;dtx=1;cbr=0;maxaveragebitrate=32000`)
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
    removeParticipant: (userId: string) => void,
    clearParticipants?: () => void,
    setParticipantsList?: (userIds: string[]) => void
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
    const screenAudioMixerRef = useRef<{
        audioCtx: AudioContext
        mixedTrack: MediaStreamTrack
        originalMicTrack: MediaStreamTrack | null
    } | null>(null)

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
        if (!userId) return
        const targetId = userId.trim().toLowerCase()
        const matchedPeerIds = Object.keys(peerConnectionsRef.current).filter(id => id.trim().toLowerCase() === targetId)
        if (matchedPeerIds.length === 0) {
            matchedPeerIds.push(userId)
        }

        matchedPeerIds.forEach((pId) => {
            if (iceRestartTimersRef.current[pId]) {
                clearTimeout(iceRestartTimersRef.current[pId])
                delete iceRestartTimersRef.current[pId]
            }
            const pc = peerConnectionsRef.current[pId]
            if (pc) {
                try { pc.close() } catch (e) {}
                delete peerConnectionsRef.current[pId]
            }
            delete pendingCandidatesRef.current[pId]
            delete makingOfferRef.current[pId]
            delete ignoreOfferRef.current[pId]
            peerRemoteStreams.delete(pId)
        })

        setRemoteStreams((prev) => {
            const nextStreams = { ...prev }
            let changed = false
            Object.keys(nextStreams).forEach(k => {
                if (k.trim().toLowerCase() === targetId) {
                    delete nextStreams[k]
                    changed = true
                }
            })
            return changed ? nextStreams : prev
        })
        rebalanceMeshBitrate()
        evaluateMeshHealth()
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
        clearParticipants?.()
        sessionStorage.removeItem('jts_active_meeting_id')
        if (screenAudioMixerRef.current) {
            try {
                screenAudioMixerRef.current.mixedTrack.stop()
                screenAudioMixerRef.current.audioCtx.close().catch(() => {})
            } catch {}
            screenAudioMixerRef.current = null
        }
        if (window.location.hash.startsWith('#meeting')) {
            window.history.replaceState(null, '', '/#meeting')
        }
        Object.keys(peerConnectionsRef.current).forEach((userId) => cleanupPeer(userId))
        setRemoteStreams({})
        peerRemoteStreams.clear()
        if (socket && activeMeetingId) {
            socket.emit(SocketEvents.MEETING_LEAVE, { meetingId: activeMeetingId })
            socket.emit('meeting:leave', { meetingId: activeMeetingId })
        }
    }, [cleanupPeer, clearReconnectFailsafe, meetingId, setJoined, socket, clearParticipants])

    const connectToMeeting = useCallback(
        (targetMeetingId: string, displayName?: string, isDirectCall?: boolean) => {
            if (!socket) {
                return
            }

            // Fresh meeting join: cleanly tear down any previous peer connections, ghost streams, and UI roster
            clearParticipants?.()
            Object.keys(peerConnectionsRef.current).forEach((uId) => cleanupPeer(uId))
            setRemoteStreams({})
            peerRemoteStreams.clear()
            setScreenSharingUserId(null)
            setScreenSharingUserIds([])

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
            const isInitialMicMuted = (() => {
                try {
                    return sessionStorage.getItem('jts_initial_mic_muted') === 'true'
                } catch {
                    return false
                }
            })()
            if (aTrack && isInitialMicMuted) {
                aTrack.enabled = false
            }
            const isLocalVideoOff = vTrack ? (!!(vTrack as any).isDummy || !vTrack.enabled || vTrack.readyState === 'ended') : true
            // Only intentional user mute (!aTrack.enabled), ended track, or preserved session mute should be marked as muted.
            const isLocalAudioMuted = aTrack
                ? (!aTrack.enabled || aTrack.readyState === 'ended' || isInitialMicMuted)
                : isInitialMicMuted

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

    // Non-destructive SDP renegotiation that preserves established ICE bindings
    const triggerRenegotiation = useCallback(async (targetUserId: string) => {
        const actualPeerId = Object.keys(peerConnectionsRef.current).find(id => id.toLowerCase() === targetUserId.toLowerCase()) || targetUserId
        const pc = peerConnectionsRef.current[actualPeerId]
        const activeMeetingId = meetingId || sessionStorage.getItem('jts_active_meeting_id') || ''
        if (!pc || !socket || !activeMeetingId) return
        if (pc.signalingState !== 'stable' || makingOfferRef.current[actualPeerId]) {
            console.log(`[WebRTC] Peer ${actualPeerId} in state ${pc.signalingState}, deferring renegotiation offer`)
            return
        }
        try {
            console.log(`[WebRTC] Initiating renegotiation for user ${actualPeerId}`)
            makingOfferRef.current[actualPeerId] = true
            const offer = await pc.createOffer({ voiceActivityDetection: true } as any)
            const activePeers = Object.keys(peerConnectionsRef.current).length + 1
            const hdSdp = enhanceSdpForHdVideo(offer.sdp, activePeers)
            const hdOffer = { type: offer.type, sdp: hdSdp }
            await pc.setLocalDescription(hdOffer)
            const isSharing = !!screenTrackRef.current
            optimizePeerConnectionForHd(pc, activePeers, isSharing)
            socket.emit(SocketEvents.WEBRTC_OFFER, {
                targetUserId: actualPeerId,
                meetingId: activeMeetingId,
                offer: hdOffer,
                displayName: localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || undefined
            })
        } catch (err) {
            console.warn('[WebRTC] Renegotiation offer failed for user', actualPeerId, err)
        } finally {
            makingOfferRef.current[actualPeerId] = false
        }
    }, [meetingId, socket])

    const handlePeerIceStateChange = useCallback((userId: string, state: RTCIceConnectionState) => {
        if (state === 'disconnected') {
            if (!iceRestartTimersRef.current[userId]) {
                iceRestartTimersRef.current[userId] = setTimeout(() => {
                    triggerIceRestart(userId)
                }, 2500)
            }
            evaluateMeshHealth()
        } else if (state === 'failed') {
            if (!iceRestartTimersRef.current[userId]) {
                iceRestartTimersRef.current[userId] = setTimeout(() => {
                    const actualPeerId = Object.keys(peerConnectionsRef.current).find(id => id.toLowerCase() === userId.toLowerCase()) || userId
                    const pc = peerConnectionsRef.current[actualPeerId]
                    if (pc && (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')) {
                        console.log(`[WebRTC] Peer ${userId} connection permanently terminated. Cleaning up ghost peer...`)
                        cleanupPeer(userId)
                        removeParticipant(userId)
                    }
                }, 6000)
            }
            evaluateMeshHealth()
        } else if (state === 'connected' || state === 'completed') {
            if (iceRestartTimersRef.current[userId]) {
                clearTimeout(iceRestartTimersRef.current[userId])
                delete iceRestartTimersRef.current[userId]
            }
            evaluateMeshHealth()
        }
    }, [triggerIceRestart, evaluateMeshHealth, cleanupPeer, removeParticipant])

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
                // Find matching transceiver strictly for this kind (audio or video)
                const tc = pc.getTransceivers().find(t => 
                    (t.receiver?.track && t.receiver.track.kind === kind) ||
                    (t.sender?.track && t.sender.track.kind === kind)
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
                            // In WebRTC, replaceTrack swaps the RTP source in-place without renegotiation or ICE tear down.
                            // Only trigger renegotiation if transceiver direction flipped from recvonly/inactive!
                            if (directionChanged) {
                                triggerRenegotiation(targetUserId)
                            }
                        }).catch(err => {
                            console.warn('Failed to replace track on transceiver:', err)
                        })
                        return
                    }
                }

                const sender = pc.getSenders().find((s) => (s.track && s.track.kind === kind) || (!s.track && kind === 'video') || (!s.track && kind === 'audio'))
                if (sender) {
                    sender.replaceTrack(newTrack).then(() => {
                        if (kind === 'video') {
                            optimizePeerConnectionForHd(pc, peerCount, isScreen)
                        }
                    }).catch(err => {
                        console.warn('Failed to replace track on peer:', err)
                    })
                } else if (newTrack && localStreamRef.current) {
                    try {
                        pc.addTrack(newTrack, localStreamRef.current)
                        triggerRenegotiation(targetUserId)
                    } catch (err) {
                        console.warn('Failed to add track to peer:', err)
                    }
                }
            })
        },
        [triggerRenegotiation]
    )

    const stopScreenShare = useCallback(async () => {
        if (screenTrackRef.current) {
            try {
                screenTrackRef.current.stop()
            } catch {}
            screenTrackRef.current = null
        }

        // Clean up screen audio mixer and restore original microphone track to peers
        if (screenAudioMixerRef.current) {
            const { audioCtx, mixedTrack, originalMicTrack } = screenAudioMixerRef.current
            screenAudioMixerRef.current = null
            try {
                mixedTrack.stop()
                audioCtx.close().catch(() => {})
            } catch {}
            if (originalMicTrack && originalMicTrack.readyState === 'live') {
                replaceTrackOnPeers(originalMicTrack, 'audio')
            }
        }

        try {
            // Find active live camera track from cameraStream or localStream
            let cameraTrack = cameraStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy) || null

            const audioTracks = (localStreamRef.current || cameraStream)?.getAudioTracks().filter(t => t.readyState === 'live') || []
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
            const micAudioTracks = (cameraStream || localStreamRef.current)?.getAudioTracks().filter(t => t.readyState === 'live') || []
            const screenAudioTracks = screenStream.getAudioTracks().filter(t => t.readyState === 'live') || []

            let activeAudioTrack: MediaStreamTrack | null = micAudioTracks[0] || null

            // If the user checked "Share tab/system audio", mix microphone audio and screen audio together
            if (screenAudioTracks.length > 0) {
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
                    if (AudioContextClass) {
                        const audioCtx = new AudioContextClass()
                        if (audioCtx.state === 'suspended') {
                            await audioCtx.resume().catch(() => {})
                        }
                        const destination = audioCtx.createMediaStreamDestination()

                        // Connect screen tab/system audio
                        const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]))
                        screenSource.connect(destination)

                        // Connect microphone audio if active
                        if (micAudioTracks[0]) {
                            const micSource = audioCtx.createMediaStreamSource(new MediaStream([micAudioTracks[0]]))
                            micSource.connect(destination)
                        }

                        const mixedTrack = destination.stream.getAudioTracks()[0]
                        if (mixedTrack) {
                            screenAudioMixerRef.current = {
                                audioCtx,
                                mixedTrack,
                                originalMicTrack: micAudioTracks[0] || null
                            }
                            activeAudioTrack = mixedTrack
                            replaceTrackOnPeers(mixedTrack, 'audio')
                        }
                    }
                } catch (mixErr) {
                    console.warn('[ScreenShare] Tab audio mixing setup error, fallback to mic audio:', mixErr)
                }
            }

            const audioTracks = activeAudioTrack ? [activeAudioTrack] : []
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
        }
    }, [localStream, replaceTrackOnPeers, socket, meetingId])


    // Window online/offline automatic resilience handlers
    useEffect(() => {
        const handleOnline = () => {
            console.log('[WebRTC] Browser reported ONLINE (Network switch/hotspot). Restoring peer mesh connections...')
            retryConnection()
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
    }, [retryConnection])

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
                while (!localStreamRef.current && attempts < 15) {
                    await new Promise(r => setTimeout(r, 100))
                    attempts++
                }
            }

            addParticipant(payload.userId)

            // When a peer joins or re-joins (e.g. after page refresh), clean up any stale peer connection
            // regardless of whether iceConnectionState has timed out yet.
            const existingPc = peerConnectionsRef.current[payload.userId]
            if (existingPc) {
                try { existingPc.close() } catch (e) {}
                delete peerConnectionsRef.current[payload.userId]
            }

            const currentPeerCount = Object.keys(peerConnectionsRef.current).length + 2
            const pc = createPeerConnection(
                payload.userId,
                localStreamRef.current,
                {
                    onTrack: (stream) => {
                        setRemoteStreams((prev) => ({
                            ...prev,
                            [payload.userId]: stream,
                            [payload.userId.toLowerCase()]: stream
                        }))
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
                while (!localStreamRef.current && attempts < 15) {
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
                            setRemoteStreams((prev) => ({
                                ...prev,
                                [payload.fromUserId]: stream,
                                [payload.fromUserId.toLowerCase()]: stream
                            }))
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

        const handleUserLeft = (payload: { userId: string; meetingId?: string }) => {
            if (!payload?.userId) return
            const targetId = String(payload.userId).trim()
            removeParticipant(targetId)
            cleanupPeer(targetId)
            setScreenSharingUserIds(prev => {
                const remaining = prev.filter(id => id.trim().toLowerCase() !== targetId.toLowerCase())
                setScreenSharingUserId(curr => (curr && curr.trim().toLowerCase() === targetId.toLowerCase() ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : curr))
                return remaining
            })
        }

        const handleScreenStart = (payload: { userId: string; meetingId: string; }) => {
            const localId = getLocalUserId()
            if (!payload?.userId || payload.userId === socket.id || (localId && payload.userId === localId) || payload.userId === 'me') {
                return
            }
            const targetId = payload.userId
            const matchPeerId = Object.keys(peerConnectionsRef.current).find(id => id.toLowerCase() === targetId.toLowerCase()) || targetId

            setScreenSharingUserIds(prev => prev.some(id => id.toLowerCase() === targetId.toLowerCase()) ? prev : [...prev, targetId])
            setScreenSharingUserId(targetId)

            // Trigger fresh MediaStream reference so React components re-mount/play the screen video
            setRemoteStreams(prev => {
                const existing = prev[targetId] || prev[matchPeerId] || peerRemoteStreams.get(targetId) || peerRemoteStreams.get(matchPeerId)
                if (existing) {
                    const freshStream = new MediaStream(existing.getTracks())
                    return { ...prev, [targetId]: freshStream, [matchPeerId]: freshStream }
                }
                return prev
            })

            // In-band track replacement (Google Meet architecture):
            // RTCRtpSender.replaceTrack already replaces the track seamlessly on the existing video transceiver.
            // Request an IDR keyframe from the remote presenter so hardware decoders decode screen resolution instantly without SDP renegotiation glare.
            const pc = peerConnectionsRef.current[matchPeerId]
            if (pc) {
                pc.getReceivers().forEach(receiver => {
                    if (receiver.track && receiver.track.kind === 'video' && typeof (receiver as any).requestKeyFrame === 'function') {
                        try {
                            (receiver as any).requestKeyFrame().catch(() => {})
                        } catch (_) {}
                    }
                })
            }

            setTimeout(() => {
                document.querySelectorAll('video, audio').forEach((el: any) => {
                    if (el && typeof el.play === 'function' && el.paused && !el.muted) {
                        el.play().catch(() => {})
                    }
                })
            }, 100)
        }

        const handleScreenStop = (payload: { userId: string; meetingId: string; }) => {
            const localId = getLocalUserId()
            const targetId = String(payload?.userId || '')
            if (!targetId || targetId === socket.id || (localId && targetId === localId) || targetId === 'me') {
                return
            }
            const matchPeerId = Object.keys(peerConnectionsRef.current).find(id => id.toLowerCase() === targetId.toLowerCase()) || targetId

            setScreenSharingUserIds(prev => {
                const remaining = prev.filter(id => String(id).toLowerCase() !== targetId.toLowerCase())
                setScreenSharingUserId(curr => (curr && String(curr).toLowerCase() === targetId.toLowerCase() ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : curr))
                return remaining
            })
            setRemoteStreams(prev => {
                const existing = prev[targetId] || prev[matchPeerId] || peerRemoteStreams.get(targetId) || peerRemoteStreams.get(matchPeerId)
                if (existing) {
                    const freshStream = new MediaStream(existing.getTracks())
                    return { ...prev, [targetId]: freshStream, [matchPeerId]: freshStream }
                }
                return prev
            })

            // Request keyframe so remote camera decode resumes immediately without renegotiation glare
            const pc = peerConnectionsRef.current[matchPeerId]
            if (pc) {
                pc.getReceivers().forEach(receiver => {
                    if (receiver.track && receiver.track.kind === 'video' && typeof (receiver as any).requestKeyFrame === 'function') {
                        try {
                            (receiver as any).requestKeyFrame().catch(() => {})
                        } catch (_) {}
                    }
                })
            }

            setTimeout(() => {
                document.querySelectorAll('video, audio').forEach((el: any) => {
                    if (el && typeof el.play === 'function' && el.paused && !el.muted) {
                        el.play().catch(() => {})
                    }
                })
            }, 100)
        }

        const handleScreenChanged = (payload: { userId: string; meetingId: string; active: boolean }) => {
            const localId = getLocalUserId()
            const targetId = String(payload?.userId || '')
            if (!targetId || targetId === socket.id || (localId && targetId === localId) || targetId === 'me') {
                return
            }
            const matchPeerId = Object.keys(peerConnectionsRef.current).find(id => id.toLowerCase() === targetId.toLowerCase()) || targetId
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
                const existing = prev[targetId] || prev[matchPeerId] || peerRemoteStreams.get(targetId) || peerRemoteStreams.get(matchPeerId)
                if (existing) {
                    const freshStream = new MediaStream(existing.getTracks())
                    return { ...prev, [targetId]: freshStream, [matchPeerId]: freshStream }
                }
                return prev
            })

            const pc = peerConnectionsRef.current[matchPeerId]
            if (pc) {
                pc.getReceivers().forEach(receiver => {
                    if (receiver.track && receiver.track.kind === 'video' && typeof (receiver as any).requestKeyFrame === 'function') {
                        try {
                            (receiver as any).requestKeyFrame().catch(() => {})
                        } catch (_) {}
                    }
                })
            }
        }

        const handleRosterSync = (payload: { meetingId: string; participants: number; peers?: Array<{ userId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean; isScreenSharing?: boolean }> }) => {
            if (Array.isArray(payload?.peers)) {
                const localId = getLocalUserId()
                const currentPeerSet = new Set(payload.peers.map(p => p.userId.trim().toLowerCase()))
                const validPeerIds: string[] = []

                payload.peers.forEach((peer) => {
                    if (peer.userId && peer.userId !== socket.id && (!localId || peer.userId.trim().toLowerCase() !== localId.trim().toLowerCase()) && peer.userId !== 'me') {
                        validPeerIds.push(peer.userId)
                        addParticipant(peer.userId)
                        if (peer.isScreenSharing) {
                            setScreenSharingUserIds(prev => prev.some(id => id.trim().toLowerCase() === peer.userId.trim().toLowerCase()) ? prev : [...prev, peer.userId])
                            setScreenSharingUserId(peer.userId)
                        }

                        // Reconnect / refresh failsafe: If remote peer has not connected with us within 1800ms,
                        // initiate an offer from this side to guarantee connection
                        setTimeout(() => {
                            const hasConnection = Object.keys(peerConnectionsRef.current).some(id => id.trim().toLowerCase() === peer.userId.trim().toLowerCase())
                            if (!hasConnection && socket.connected) {
                                console.log(`[WebRTC] Initiating offer for existing roster peer ${peer.userId}...`)
                                handleUserJoined({ userId: peer.userId, meetingId: payload.meetingId })
                            }
                        }, 1800)
                    }
                })

                // Strictly sync UI roster to valid peers verified by the server
                if (setParticipantsList) {
                    setParticipantsList(validPeerIds)
                }

                // Active Roster Reconciliation: Purge any zombie peer connections that the server no longer lists
                Object.keys(peerConnectionsRef.current).forEach((pId) => {
                    if (!currentPeerSet.has(pId.trim().toLowerCase()) && (!localId || pId.trim().toLowerCase() !== localId.trim().toLowerCase())) {
                        console.log(`[WebRTC] Purging ghost participant ${pId} not present in active roster sync`)
                        cleanupPeer(pId)
                        removeParticipant(pId)
                    }
                })
            }
        }

        const handleUserReconnecting = (payload: { userId: string; meetingId: string }) => {
            console.log(`[WebRTC] Remote peer ${payload.userId} has a connection blip. Holding peer pipeline...`)
        }

        const handleUserReconnected = (payload: { userId: string; meetingId: string }) => {
            console.log(`[WebRTC] Remote peer ${payload.userId} reconnected! Re-establishing fresh peer connection...`)
            handleUserJoined({ userId: payload.userId, meetingId: payload.meetingId })
        }

        socket.on(SocketEvents.WEBRTC_JOIN, handleRosterSync)
        socket.on(SocketEvents.WEBRTC_USER_JOINED, handleUserJoined)
        socket.on(SocketEvents.WEBRTC_OFFER, handleOffer)
        socket.on(SocketEvents.WEBRTC_ANSWER, handleAnswer)
        socket.on(SocketEvents.WEBRTC_ICE_CANDIDATE, handleIceCandidate)
        socket.on(SocketEvents.WEBRTC_USER_LEFT, handleUserLeft)
        socket.on(SocketEvents.MEETING_LEAVE, handleUserLeft)
        socket.on('meeting:leave', handleUserLeft)
        socket.on('meeting:user-left', handleUserLeft)
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
            socket.off(SocketEvents.MEETING_LEAVE, handleUserLeft)
            socket.off('meeting:leave', handleUserLeft)
            socket.off('meeting:user-left', handleUserLeft)
            socket.off('webrtc:user-reconnecting', handleUserReconnecting)
            socket.off('webrtc:user-reconnected', handleUserReconnected)
            socket.off(SocketEvents.SCREEN_START, handleScreenStart)
            socket.off(SocketEvents.SCREEN_STOP, handleScreenStop)
            socket.off(SocketEvents.SCREEN_CHANGED, handleScreenChanged)
        }
    }, [socket, addParticipant, removeParticipant, cleanupPeer, triggerIceRestart, triggerRenegotiation, rebalanceMeshBitrate, handlePeerIceStateChange])

    // Periodic WebRTC Transport & Stream Health Watchdog:
    // Only intervenes if ICE transport has actually failed or dropped without recovery.
    // NEVER restarts ICE on silent/muted audio or normal speech pauses.
    useEffect(() => {
        const lastRenegotiationAttempt: Record<string, number> = {}

        const interval = setInterval(async () => {
            if (!socket || !socket.connected) return

            const pcs = Object.entries(peerConnectionsRef.current)
            if (pcs.length === 0) return

            for (const [peerId, pc] of pcs) {
                if (!pc || pc.signalingState === 'closed') continue

                // 1. Only restart ICE if the connection state has officially failed
                if (pc.iceConnectionState === 'failed' && pc.signalingState === 'stable' && !makingOfferRef.current[peerId]) {
                    console.log(`[WebRTC Watchdog] Peer ${peerId} in failed ICE state, attempting auto-recovery ICE restart...`)
                    triggerIceRestart(peerId)
                    continue
                }

                // 2. If ICE is connected but remote stream is missing all tracks after 15+ seconds,
                // gently request a renegotiation (SDP sync) instead of tearing down the network socket with ICE restart!
                if ((pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') && pc.signalingState === 'stable' && !makingOfferRef.current[peerId]) {
                    const remoteStream = peerRemoteStreams.get(peerId)
                    const hasTracks = remoteStream && remoteStream.getTracks().length > 0
                    const now = Date.now()
                    const lastAttempt = lastRenegotiationAttempt[peerId] || 0

                    if (!hasTracks && (now - lastAttempt > 20000)) {
                        console.log(`[WebRTC Watchdog] Connected peer ${peerId} has no media tracks yet. Syncing SDP via gentle renegotiation...`)
                        lastRenegotiationAttempt[peerId] = now
                        triggerRenegotiation(peerId)
                    }
                }
            }
        }, 10000)

        return () => {
            clearInterval(interval)
        }
    }, [socket, triggerIceRestart, triggerRenegotiation])

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
