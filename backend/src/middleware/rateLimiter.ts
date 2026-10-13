import { Request, Response, NextFunction } from 'express'
import { RedisService } from '../services/redis.service'

interface RateLimitRecord {
    count: number
    resetTime: number
}

// In-memory sliding window rate limiter fallback store
const ipRequestStore = new Map<string, RateLimitRecord>()

// Periodically clean up expired entries every 5 minutes to prevent memory leaks in fallback
setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of ipRequestStore.entries()) {
        if (now > record.resetTime) {
            ipRequestStore.delete(ip)
        }
    }
}, 5 * 60 * 1000).unref?.()

/**
 * Distributed rate limiter middleware (backed by Redis with seamless in-memory fallback)
 * @param windowMs Time window in milliseconds (default: 1 minute)
 * @param maxRequests Maximum requests allowed per window (default: 120)
 * @param keyPrefix Redis key prefix (default: 'rl')
 */
export function rateLimiter(windowMs: number = 60 * 1000, maxRequests: number = 120, keyPrefix: string = 'rl') {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const rawIp = req.ip || req.socket.remoteAddress || 'unknown_ip'
        const clientIp = rawIp.replace(/[^a-zA-Z0-9:._-]/g, '')
        const now = Date.now()

        // 1. Attempt distributed rate limiting via Redis
        try {
            const redis = RedisService.getInstance()
            const client = redis.getClient()
            if (client && client.isOpen) {
                const windowBucket = Math.floor(now / windowMs)
                const redisKey = `${keyPrefix}:${clientIp}:${windowBucket}`

                const current = await client.incr(redisKey)
                if (current === 1) {
                    await client.pExpire(redisKey, windowMs)
                }

                if (current > maxRequests) {
                    const ttlMs = await client.pTTL(redisKey)
                    const retryAfterSec = Math.max(1, Math.ceil(ttlMs > 0 ? ttlMs / 1000 : windowMs / 1000))
                    res.setHeader('Retry-After', retryAfterSec)
                    res.status(429).json({
                        success: false,
                        message: `Too many requests from this IP. Please wait ${retryAfterSec} seconds before trying again.`,
                        retryAfter: retryAfterSec
                    })
                    return
                }

                return next()
            }
        } catch (_) {
            // Redis error or offline: fallback to local in-memory store
        }

        // 2. In-Memory fallback store
        const record = ipRequestStore.get(clientIp)

        if (!record || now > record.resetTime) {
            ipRequestStore.set(clientIp, {
                count: 1,
                resetTime: now + windowMs
            })
            return next()
        }

        if (record.count >= maxRequests) {
            const retryAfterSec = Math.ceil((record.resetTime - now) / 1000)
            res.setHeader('Retry-After', retryAfterSec)
            res.status(429).json({
                success: false,
                message: `Too many requests from this IP. Please wait ${retryAfterSec} seconds before trying again.`,
                retryAfter: retryAfterSec
            })
            return
        }

        record.count += 1
        return next()
    }
}

/**
 * Dedicated rate limiter for sensitive authentication endpoints (e.g. login, register, OTP)
 * Allows 30 requests per minute per IP — generous for legitimate users, blocks automated brute-force attacks.
 */
export const authRateLimiter = rateLimiter(60 * 1000, 30, 'rl:auth')


