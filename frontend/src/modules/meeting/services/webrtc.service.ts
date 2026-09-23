import { e2eeService } from './e2ee.service'

export interface PeerHandlers {
    onTrack: (stream: MediaStream) => void
    onICECandidate: (candidate: RTCIceCandidateInit) => void
    onIceStateChange?: (state: RTCIceConnectionState) => void
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

export const peerRemoteStreams = new Map<string, MediaStream>()

/**
 * Returns production-grade ICE servers:
 * Includes Google/Cloudflare STUN + Open Relay Community TURN servers (UDP, TCP, and TLS)
 * Automatically works across Symmetric NATs, 4G/5G mobile carriers (Jio, Airtel, Vi, etc.), and corporate firewalls.
 */
export function getIceServers(): RTCIceServer[] {
    const customIceJson = (import.meta as any).env?.VITE_ICE_SERVERS_JSON
    if (customIceJson) {
        try {
            const parsed = JSON.parse(customIceJson)
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed
            }
        } catch (e) {
            console.warn('[WebRTC] Invalid VITE_ICE_SERVERS_JSON, falling back to default servers:', e)
        }
    }

    const customTurnUrl = (import.meta as any).env?.VITE_TURN_URL
    const customTurnUser = (import.meta as any).env?.VITE_TURN_USERNAME
    const customTurnPass = (import.meta as any).env?.VITE_TURN_CREDENTIAL

    const customTurnList: RTCIceServer[] = []
    if (customTurnUrl) {
        customTurnList.push({
            urls: customTurnUrl.split(',').map((u: string) => u.trim()),
            username: customTurnUser || undefined,
            credential: customTurnPass || undefined
        })
    }

    return [
        ...customTurnList,
        // High-Reliability Google Public STUN
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Cloudflare & Mozilla STUN
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
        // Reliable Free Community TURN Relays (Open Relay Project)
        // Traversal around Symmetric NAT, Mobile LTE/5G Hotspots, and Strict Firewalls
        {
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelay',
            credential: 'openrelay'
        },
        {
            urls: [
                'turns:openrelay.metered.ca:443?transport=tcp',
                'turns:openrelay.metered.ca:5349?transport=tcp'
            ],
            username: 'openrelay',
            credential: 'openrelay'
        }
    ]
}

export function optimizePeerConnectionForHd(pc: RTCPeerConnection, peerCount: number = 2, isScreenShare: boolean = false) {
    try {
        const senders = pc.getSenders()
        const videoSender = senders.find(s => s.track && s.track.kind === 'video')
        if (videoSender) {
            const params = videoSender.getParameters()
            if (!params.encodings || params.encodings.length === 0) {
                params.encodings = [{}]
            }

            if (isScreenShare) {
                // Screen Sharing: Prioritize high-resolution clarity (never downscale text/code)
                params.encodings[0].maxBitrate = 4_000_000
                params.encodings[0].maxFramerate = 30
                params.encodings[0].scaleResolutionDownBy = 1.0
            } else {
                // Adaptive Mesh Bitrate scaling for camera video:
                // 1-2 participants: 3.5 Mbps (Crisp 1080p60)
                // 3-4 participants: 1.0 Mbps (720p30)
                // 5-6 participants: 500 kbps (balanced CPU)
                // 7+ participants: 250 kbps (ultra-lightweight grid)
                let maxBitrate = 3_500_000
                let maxFramerate = 60
                let scaleDown = 1.0
                if (peerCount >= 7) {
                    maxBitrate = 250_000
                    maxFramerate = 20
                    scaleDown = 2.0
                } else if (peerCount >= 5) {
                    maxBitrate = 500_000
                    maxFramerate = 24
                    scaleDown = 1.5
                } else if (peerCount >= 3) {
                    maxBitrate = 1_000_000
                    maxFramerate = 30
                    scaleDown = 1.2
                }

                params.encodings[0].maxBitrate = maxBitrate
                params.encodings[0].maxFramerate = maxFramerate
                params.encodings[0].scaleResolutionDownBy = scaleDown
            }

            videoSender.setParameters(params).catch(e => {
                console.warn('[WebRTC HD Optimize] setParameters warning:', e)
            })
        }
    } catch (e) {
        // Fallback gracefully
    }
}

export function createPeerConnection(userId: string, localStream: MediaStream | null, handlers: PeerHandlers, peerCount: number = 2) {
    const pc = new RTCPeerConnection({
        iceServers: getIceServers(),
        iceCandidatePoolSize: 10
    })

    // Debug logging & handler hooks for WebRTC connection states
    pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE connection state for user ${userId}:`, pc.iceConnectionState)
        handlers.onIceStateChange?.(pc.iceConnectionState)
    }
    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state for user ${userId}:`, pc.connectionState)
        handlers.onConnectionStateChange?.(pc.connectionState)
        if (pc.connectionState === 'connected') {
            optimizePeerConnectionForHd(pc, peerCount)
        }
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            handlers.onICECandidate(event.candidate.toJSON())
        }
    }

    pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack received: kind=${event.track.kind} id=${event.track.id} from user ${userId}`)
        if (event.receiver) {
            e2eeService.setupReceiverTransform(event.receiver)
        }
        
        let pStream = (event.streams && event.streams[0]) ? event.streams[0] : peerRemoteStreams.get(userId)
        if (!pStream) {
            pStream = new MediaStream()
        }
        peerRemoteStreams.set(userId, pStream)

        if (!pStream.getTracks().some(t => t.id === event.track.id)) {
            pStream.addTrack(event.track)
        }

        const notify = () => {
            // Provide a fresh MediaStream instance with all tracks so React components re-render immediately
            handlers.onTrack(new MediaStream(pStream!.getTracks()))
        }

        notify()

        event.track.onunmute = () => {
            console.log(`[WebRTC] track unmuted: kind=${event.track.kind} from user ${userId}`)
            notify()
        }

        event.track.onended = () => {
            console.log(`[WebRTC] track ended: kind=${event.track.kind} from user ${userId}`)
            notify()
        }
    }

    if (localStream) {
        let hasAudio = false
        let hasVideo = false
        localStream.getTracks().forEach((track) => {
            try {
                if (track.kind === 'audio') hasAudio = true
                if (track.kind === 'video') hasVideo = true
                const sender = pc.addTrack(track, localStream)
                if (sender) {
                    e2eeService.setupSenderTransform(sender)
                }
            } catch (e) {
                console.warn('addTrack warning:', e)
            }
        })

        // CRITICAL FOR PRODUCTION SCREEN SHARING:
        // Even if the user joined with camera OFF or audio-only,
        // we MUST reserve a video transceiver with direction 'sendrecv'.
        // This ensures the SDP offer/answer includes the 'm=video' media section from the start!
        // When the user later clicks "Share Screen", sender.replaceTrack(screenTrack) works
        // seamlessly and instantly without SDP collisions or renegotiation failures!
        if (!hasVideo) {
            try {
                pc.addTransceiver('video', { direction: 'sendrecv' })
            } catch (e) {
                console.warn('Failed to pre-allocate video transceiver:', e)
            }
        }
        if (!hasAudio) {
            try {
                pc.addTransceiver('audio', { direction: 'sendrecv' })
            } catch (e) {
                console.warn('Failed to pre-allocate audio transceiver:', e)
            }
        }
        optimizePeerConnectionForHd(pc, peerCount)
    } else {
        try {
            pc.addTransceiver('audio', { direction: 'sendrecv' })
            pc.addTransceiver('video', { direction: 'sendrecv' })
        } catch (e) {
            console.warn('Failed to add transceivers:', e)
        }
    }

    return pc
}
