import { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

export interface AuthenticatedSocket extends Socket {
    userId?: string
}

export function authenticateSocket(socket: AuthenticatedSocket): boolean {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.toString().replace(/^Bearer\s+/i, '')
    if (!token) {
        return false
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
        socket.userId = payload.userId
        return true
    } catch {
        return false
    }
}
