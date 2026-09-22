import { e2eeService } from './e2ee.service'

export interface PeerHandlers {
    onTrack: (stream: MediaStream) => void
    onICECandidate: (candidate: RTCIceCandidateInit) => void
    onIceStateChange?: (state: RTCIceConnectionState) => void
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

export const peerRemoteStreams = new Map<string, MediaStream>()

export function optimizePeerConnectionForHd(pc: RTCPeerConnection, peerCount: number = 2) {
    try {
        const senders = pc.getSenders()
        const videoSender = senders.find(s => s.track && s.track.kind === 'video')
        if (videoSender) {
            const params = videoSender.getParameters()
            if (!params.encodings || params.encodings.length === 0) {
                params.encodings = [{}]
            }
            // Adaptive Mesh Bitrate scaling:
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
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ],
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
            handlers.onTrack(pStream!)
        }

        notify()

        event.track.onunmute = () => {
            console.log(`[WebRTC] track unmuted: kind=${event.track.kind} from user ${userId}`)
            notify()
        }
    }

    if (localStream) {
        localStream.getTracks().forEach((track) => {
            try {
                const sender = pc.addTrack(track, localStream)
                if (sender) {
                    e2eeService.setupSenderTransform(sender)
                }
            } catch (e) {
                console.warn('addTrack warning:', e)
            }
        })
        optimizePeerConnectionForHd(pc)
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
