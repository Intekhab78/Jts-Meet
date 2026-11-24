import { RedisService } from './redis.service'

const STATE_TTL_SECONDS = 12 * 60 * 60 // 12 hours

function getReadyRedisClient() {
    try {
        const client = RedisService.getInstance().getClient()
        if (client && (client as any).isReady) {
            return client
        }
    } catch {
        // Redis not initialized or offline — fall back cleanly to local memory
    }
    return null
}

/**
 * Persist transient meeting room state (polls, Q&A, whiteboard, co-hosts, raised hands, watermark, backstage)
 * into Redis for multi-instance Socket.IO cluster sync and PM2 crash/restart resilience.
 */
export async function saveMeetingState<T>(namespace: string, meetingId: string, value: T): Promise<void> {
    if (!namespace || !meetingId) return
    const redis = getReadyRedisClient()
    if (!redis) return
    try {
        await redis.set(`meeting:state:${namespace}:${meetingId}`, JSON.stringify(value), { EX: STATE_TTL_SECONDS })
    } catch {
        // Ignore transient Redis write errors; local Map remains authoritative on this node
    }
}

export async function loadMeetingState<T>(namespace: string, meetingId: string): Promise<T | null> {
    if (!namespace || !meetingId) return null
    const redis = getReadyRedisClient()
    if (!redis) return null
    try {
        const raw = await redis.get(`meeting:state:${namespace}:${meetingId}`)
        if (!raw) return null
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

export async function deleteMeetingState(namespace: string, meetingId: string): Promise<void> {
    if (!namespace || !meetingId) return
    const redis = getReadyRedisClient()
    if (!redis) return
    try {
        await redis.del(`meeting:state:${namespace}:${meetingId}`)
    } catch {
        // Ignore
    }
}
