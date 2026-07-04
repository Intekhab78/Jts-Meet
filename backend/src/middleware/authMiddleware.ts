import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { sendError } from '../utils/responseHelper'

export interface AuthRequest extends Request {
    userId?: string
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

    if (!token) {
        return sendError(res, 401, 'Unauthorized access')
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
        req.userId = payload.userId
        next()
    } catch (error) {
        return sendError(res, 401, 'Unauthorized access')
    }
}
