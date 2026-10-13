import { RedisService } from '../../services/redis.service'

export interface PeerSession {
    userId: string
    meetingId: string
    socketId: string
    displayName?: string
    isVideoOff?: boolean
    isMuted?: boolean
    isScreenSharing?: boolean
}

const SESSION_TTL_SECONDS = 6 * 60 * 60 // 6 hours

// In-memory fast cache
const peersByUserId = new Map<string, PeerSession>()
const peersBySocketId = new Map<string, PeerSession>()
const meetingPeers = new Map<string, Set<string>>()

function getRedisClient() {
    try {
        const redis = RedisService.getInstance()
        const client = redis.getClient()
        return client && client.isOpen ? client : null
    } catch {
        return null
    }
}

export function addPeerSession(userId: string, meetingId: string, socketId: string, displayName?: string, isVideoOff?: boolean, isMuted?: boolean) {
    const existing = peersByUserId.get(userId)
    const session: PeerSession = { 
        userId, 
        meetingId, 
        socketId,
        displayName: displayName || existing?.displayName,
        isVideoOff: isVideoOff !== undefined ? isVideoOff : existing?.isVideoOff,
        isMuted: isMuted !== undefined ? isMuted : existing?.isMuted,
        isScreenSharing: existing?.isScreenSharing || false
    }
    peersByUserId.set(userId, session)
    peersBySocketId.set(socketId, session)

    const existingSet = meetingPeers.get(meetingId) || new Set<string>()
    existingSet.add(userId)
    meetingPeers.set(meetingId, existingSet)

    // Sync to Redis for multi-instance cluster
    const redis = getRedisClient()
    if (redis) {
        redis.set(`webrtc:session:${userId}`, JSON.stringify(session), { EX: SESSION_TTL_SECONDS }).catch(() => {})
        redis.set(`webrtc:socket:${socketId}`, userId, { EX: SESSION_TTL_SECONDS }).catch(() => {})
        redis.sAdd(`webrtc:meeting:${meetingId}`, userId).catch(() => {})
        redis.expire(`webrtc:meeting:${meetingId}`, SESSION_TTL_SECONDS).catch(() => {})
    }
}

export function updatePeerSession(userId: string, updates: Partial<PeerSession>) {
    const session = peersByUserId.get(userId)
    if (session) {
        Object.assign(session, updates)
        const redis = getRedisClient()
        if (redis) {
            redis.set(`webrtc:session:${userId}`, JSON.stringify(session), { EX: SESSION_TTL_SECONDS }).catch(() => {})
        }
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
            isMuted: s?.isMuted,
            isScreenSharing: s?.isScreenSharing || false
        }
    })
}

/**
 * Cluster-wide peer session lookup querying Redis with in-memory fallback
 */
export async function getMeetingPeersInfoCluster(meetingId: string): Promise<Array<{
    userId: string
    displayName: string
    isVideoOff?: boolean
    isMuted?: boolean
    isScreenSharing?: boolean
}>> {
    const redis = getRedisClient()
    if (redis) {
        try {
            const memberIds = await redis.sMembers(`webrtc:meeting:${meetingId}`)
            if (memberIds && memberIds.length > 0) {
                const sessionPromises = memberIds.map(async (uId) => {
                    const raw = await redis.get(`webrtc:session:${uId}`)
                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw) as PeerSession
                            return {
                                userId: uId,
                                displayName: parsed.displayName || '',
                                isVideoOff: parsed.isVideoOff,
                                isMuted: parsed.isMuted,
                                isScreenSharing: parsed.isScreenSharing || false
                            }
                        } catch {
                            return null
                        }
                    }
                    const local = peersByUserId.get(uId)
                    return {
                        userId: uId,
                        displayName: local?.displayName || '',
                        isVideoOff: local?.isVideoOff,
                        isMuted: local?.isMuted,
                        isScreenSharing: local?.isScreenSharing || false
                    }
                })

                const clusterPeers = (await Promise.all(sessionPromises)).filter(Boolean) as Array<{
                    userId: string
                    displayName: string
                    isVideoOff?: boolean
                    isMuted?: boolean
                    isScreenSharing?: boolean
                }>

                if (clusterPeers.length > 0) {
                    return clusterPeers
                }
            }
        } catch (_) {
            // Fallback to in-memory on error
        }
    }

    return getMeetingPeersInfo(meetingId)
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

    const redis = getRedisClient()
    if (redis) {
        redis.del(`webrtc:session:${session.userId}`).catch(() => {})
        redis.del(`webrtc:socket:${socketId}`).catch(() => {})
        redis.sRem(`webrtc:meeting:${session.meetingId}`, session.userId).catch(() => {})
    }

    return session
}

export function removePeerSessionByUserId(userId: string): PeerSession | null {
    const session = peersByUserId.get(userId)
    if (!session) {
        return null
    }

    peersByUserId.delete(userId)
    peersBySocketId.delete(session.socketId)

    const meetingSet = meetingPeers.get(session.meetingId)
    if (meetingSet) {
        meetingSet.delete(session.userId)
        if (meetingSet.size === 0) {
            meetingPeers.delete(session.meetingId)
        }
    }

    const redis = getRedisClient()
    if (redis) {
        redis.del(`webrtc:session:${userId}`).catch(() => {})
        redis.del(`webrtc:socket:${session.socketId}`).catch(() => {})
        redis.sRem(`webrtc:meeting:${session.meetingId}`, userId).catch(() => {})
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

