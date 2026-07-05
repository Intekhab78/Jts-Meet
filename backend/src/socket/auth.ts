import { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

export interface AuthenticatedSocket extends Socket {
    userId?: string
    isGuest?: boolean
    guestName?: string
    meetingId?: string
    isPending?: boolean
}

export function authenticateSocket(socket: AuthenticatedSocket): boolean {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.toString().replace(/^Bearer\s+/i, '')
    if (!token) {
        return false
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { 
            userId: string; 
            isGuest?: boolean; 
            guestName?: string; 
            meetingId?: string; 
            isPending?: boolean; 
        }
        socket.userId = payload.userId
        if (payload.isGuest) {
            socket.isGuest = true
            socket.guestName = payload.guestName
            socket.meetingId = payload.meetingId
            socket.isPending = payload.isPending
        }
        return true
    } catch {
        return false
    }
}
