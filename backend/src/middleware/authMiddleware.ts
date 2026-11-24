import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { sendError } from '../utils/responseHelper'

import { User } from '../models/user.model'

export interface AuthRequest extends Request {
    userId?: string
    isGuest?: boolean
    isPending?: boolean
    meetingId?: string
    isSuperAdmin?: boolean
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
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: string
            tokenVersion?: number
            isGuest?: boolean
            isPending?: boolean
            meetingId?: string
        }

        if (payload.isGuest) {
            if (payload.isPending) {
                return sendError(res, 403, 'Waiting for host approval')
            }
            const allowedGuestBase = ['/api/meeting', '/api/meeting/chat', '/api/webrtc', '/api/file']
            if (!allowedGuestBase.includes(req.baseUrl)) {
                return sendError(res, 403, 'Guest token cannot access this resource')
            }
        }

        req.userId = payload.userId
        req.isGuest = Boolean(payload.isGuest)
        req.isPending = Boolean(payload.isPending)
        req.meetingId = payload.meetingId

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
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: string
            isGuest?: boolean
            isPending?: boolean
            meetingId?: string
        }
        req.userId = payload.userId
        req.isGuest = Boolean(payload.isGuest)
        req.isPending = Boolean(payload.isPending)
        req.meetingId = payload.meetingId
    } catch (_) {
        // Continue unauthenticated
    }
    next()
}

