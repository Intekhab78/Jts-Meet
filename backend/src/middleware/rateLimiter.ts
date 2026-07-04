import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/responseHelper'

const ipRequestMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
            return next()
        }

        const ip = req.ip || req.socket.remoteAddress || 'unknown'
        const now = Date.now()

        const record = ipRequestMap.get(ip)
        if (!record || record.resetTime < now) {
            ipRequestMap.set(ip, { count: 1, resetTime: now + windowMs })
            return next()
        }

        record.count++
        if (record.count > maxRequests) {
            sendError(res, 429, 'Too many requests, please try again later.')
            return
        }

        next()
    }
}
