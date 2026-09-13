import { Request, Response, NextFunction } from 'express'

interface RateLimitRecord {
    count: number
    resetTime: number
}

// In-memory sliding window rate limiter store
const ipRequestStore = new Map<string, RateLimitRecord>()

// Periodically clean up expired entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of ipRequestStore.entries()) {
        if (now > record.resetTime) {
            ipRequestStore.delete(ip)
        }
    }
}, 5 * 60 * 1000).unref?.()

/**
 * Configurable rate limiter middleware
 * @param windowMs Time window in milliseconds (default: 1 minute)
 * @param maxRequests Maximum requests allowed per window (default: 120)
 */
export function rateLimiter(windowMs: number = 60 * 1000, maxRequests: number = 120) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                         req.socket.remoteAddress || 
                         'unknown_ip'
        
        const now = Date.now()
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
 * Allows 30 requests per minute per IP — highly generous for normal users, but blocks automated brute-force attacks.
 */
export const authRateLimiter = rateLimiter(60 * 1000, 30)

