export interface PeerSession {
    userId: string
    meetingId: string
    socketId: string
    displayName?: string
    isVideoOff?: boolean
    isMuted?: boolean
}

const peersByUserId = new Map<string, PeerSession>()
const peersBySocketId = new Map<string, PeerSession>()
const meetingPeers = new Map<string, Set<string>>()

export function addPeerSession(userId: string, meetingId: string, socketId: string, displayName?: string, isVideoOff?: boolean, isMuted?: boolean) {
    const existing = peersByUserId.get(userId)
    const session: PeerSession = { 
        userId, 
        meetingId, 
        socketId,
        displayName: displayName || existing?.displayName,
        isVideoOff: isVideoOff !== undefined ? isVideoOff : existing?.isVideoOff,
        isMuted: isMuted !== undefined ? isMuted : existing?.isMuted
    }
    peersByUserId.set(userId, session)
    peersBySocketId.set(socketId, session)

    const existingSet = meetingPeers.get(meetingId) || new Set<string>()
    existingSet.add(userId)
    meetingPeers.set(meetingId, existingSet)
}

export function updatePeerSession(userId: string, updates: Partial<PeerSession>) {
    const session = peersByUserId.get(userId)
    if (session) {
        Object.assign(session, updates)
    }
}

export function getMeetingPeersInfo(meetingId: string) {
    const userIds = getMeetingPeerUserIds(meetingId)
    return userIds.map((uId) => {
        const s = peersByUserId.get(uId)
        return {
            userId: uId,
            displayName: s?.displayName || '',
            isVideoOff: s?.isVideoOff,
            isMuted: s?.isMuted
        }
    })
}

export function removePeerSessionBySocket(socketId: string): PeerSession | null {
    const session = peersBySocketId.get(socketId)
    if (!session) {
        return null
    }

    peersBySocketId.delete(socketId)
    peersByUserId.delete(session.userId)

    const meetingSet = meetingPeers.get(session.meetingId)
    if (meetingSet) {
        meetingSet.delete(session.userId)
        if (meetingSet.size === 0) {
            meetingPeers.delete(session.meetingId)
        }
    }

    return session
}

export function getPeerSessionByUserId(userId: string): PeerSession | null {
    return peersByUserId.get(userId) || null
}

export function getPeerSessionBySocketId(socketId: string): PeerSession | null {
    return peersBySocketId.get(socketId) || null
}

export function getMeetingPeerUserIds(meetingId: string): string[] {
    return Array.from(meetingPeers.get(meetingId) || [])
}

export function getMeetingPeerSessions(meetingId: string) {
    const userIds = getMeetingPeerUserIds(meetingId)
    return userIds.map((userId) => peersByUserId.get(userId)).filter(Boolean) as PeerSession[]
}

export function getMeetingSocketId(userId: string, meetingId: string): string | null {
    const session = peersByUserId.get(userId)
    if (session && session.meetingId === meetingId) {
        return session.socketId
    }
    return null
}

export function getMeetingParticipantSocketIds(meetingId: string, excludeUserId?: string) {
    return getMeetingPeerSessions(meetingId)
        .filter((session) => session.userId !== excludeUserId)
        .map((session) => session.socketId)
}
