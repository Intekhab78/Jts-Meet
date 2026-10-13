import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { sendError } from '../utils/responseHelper'

import { User } from '../models/user.model'

export interface AuthRequest extends Request {
    userId?: string
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

    // Optional httpOnly cookie token
    if (!token && (req as any).cookies?.accessToken) {
        token = (req as any).cookies.accessToken
    }

    // Query token allowed ONLY on read-only GET requests (e.g. invoice downloads, media exports)
    if (!token && req.method === 'GET' && req.query?.token && typeof req.query.token === 'string') {
        token = req.query.token
    }

    if (!token) {
        return sendError(res, 401, 'Unauthorized access')
    }

    try {
        let payload: { userId: string; tokenVersion?: number }
        try {
            payload = jwt.verify(token, JWT_SECRET) as { userId: string; tokenVersion?: number }
        } catch (err: any) {
            const isMeetingOrAiPath = req.baseUrl?.includes('/meeting') || req.path?.includes('/meeting') || req.originalUrl?.includes('/meeting') || req.originalUrl?.includes('/ai')
            if (err?.name === 'TokenExpiredError' && isMeetingOrAiPath) {
                payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as { userId: string; tokenVersion?: number }
            } else {
                throw err
            }
        }
        req.userId = payload.userId

        // Fast token revocation check: if tokenVersion is present, ensure it hasn't been bumped/revoked
        if (typeof payload.tokenVersion === 'number') {
            const user = await User.findById(payload.userId).select('tokenVersion').lean()
            if (!user || (user.tokenVersion !== undefined && payload.tokenVersion < user.tokenVersion)) {
                return sendError(res, 401, 'Token revoked, please log in again')
            }
        }

        next()
    } catch (error) {
        return sendError(res, 401, 'Unauthorized access')
    }
}

export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

    if (!token && (req as any).cookies?.accessToken) {
        token = (req as any).cookies.accessToken
    }

    if (!token && req.method === 'GET' && req.query?.token && typeof req.query.token === 'string') {
        token = req.query.token
    }

    if (!token) {
        return next()
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
        req.userId = payload.userId
    } catch (_) {
        // Continue unauthenticated
    }
    next()
}

