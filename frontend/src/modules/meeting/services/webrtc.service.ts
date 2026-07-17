export interface PeerHandlers {
    onTrack: (stream: MediaStream) => void
    onICECandidate: (candidate: RTCIceCandidateInit) => void
}

export function createPeerConnection(userId: string, localStream: MediaStream | null, handlers: PeerHandlers) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:openrelay.metered.ca:80' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
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
        if (event.streams && event.streams[0]) {
            handlers.onTrack(event.streams[0])
        }
    }

    if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
        
        // Ensure video sender/transceiver is present even if camera was off on join
        const hasVideo = localStream.getVideoTracks().length > 0
        if (!hasVideo) {
            try {
                pc.addTransceiver('video', { direction: 'sendrecv' })
            } catch (e) {
                console.warn('Failed to add video transceiver:', e)
            }
        }
    }

    return pc
}
