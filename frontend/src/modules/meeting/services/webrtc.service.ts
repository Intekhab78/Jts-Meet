export interface PeerHandlers {
    onTrack: (stream: MediaStream) => void
    onICECandidate: (candidate: RTCIceCandidateInit) => void
}

export const peerRemoteStreams = new Map<string, MediaStream>()

export function createPeerConnection(userId: string, localStream: MediaStream | null, handlers: PeerHandlers) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ],
        iceCandidatePoolSize: 10
    })

    // Debug logging for WebRTC connection states
    pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE connection state for user ${userId}:`, pc.iceConnectionState)
    }
    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state for user ${userId}:`, pc.connectionState)
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            handlers.onICECandidate(event.candidate.toJSON())
        }
    }

    pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack received: kind=${event.track.kind} id=${event.track.id} from user ${userId}`)
        
        let pStream = peerRemoteStreams.get(userId)
        if (!pStream) {
            pStream = new MediaStream()
            peerRemoteStreams.set(userId, pStream)
        }

        // Replace existing track of same kind so we don't accumulate duplicates
        const existing = pStream.getTracks().find(t => t.kind === event.track.kind)
        if (existing) {
            pStream.removeTrack(existing)
        }
        pStream.addTrack(event.track)

        // Always create a fresh MediaStream clone so React triggers useEffect and state updates
        handlers.onTrack(new MediaStream(pStream.getTracks()))
    }

    if (localStream) {
        localStream.getTracks().forEach((track) => {
            try {
                pc.addTrack(track, localStream)
            } catch (e) {
                console.warn('addTrack warning:', e)
            }
        })
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
