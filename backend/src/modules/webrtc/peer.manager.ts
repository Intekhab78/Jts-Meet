export interface PeerSession {
    userId: string
    meetingId: string
    socketId: string
}

const peersByUserId = new Map<string, PeerSession>()
const peersBySocketId = new Map<string, PeerSession>()
const meetingPeers = new Map<string, Set<string>>()

export function addPeerSession(userId: string, meetingId: string, socketId: string) {
    const session: PeerSession = { userId, meetingId, socketId }
    peersByUserId.set(userId, session)
    peersBySocketId.set(socketId, session)

    const existing = meetingPeers.get(meetingId) || new Set<string>()
    existing.add(userId)
    meetingPeers.set(meetingId, existing)
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
