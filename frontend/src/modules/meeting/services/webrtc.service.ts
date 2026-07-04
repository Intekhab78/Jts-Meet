export interface PeerHandlers {
    onTrack: (stream: MediaStream) => void
    onICECandidate: (candidate: RTCIceCandidateInit) => void
}

export function createPeerConnection(userId: string, localStream: MediaStream | null, handlers: PeerHandlers) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

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
    }

    return pc
}
