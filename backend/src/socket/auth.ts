import { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

export interface AuthenticatedSocket extends Socket {
    userId?: string
    isGuest?: boolean
    guestName?: string
    email?: string
    company?: string
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
            id?: string;
            _id?: string;
            isGuest?: boolean; 
            guestName?: string; 
            fullName?: string;
            name?: string;
            email?: string;
            company?: string;
            meetingId?: string; 
            isPending?: boolean; 
        }
        socket.userId = payload.userId || payload.id || payload._id
        if (payload.isGuest) {
            socket.isGuest = true
            socket.guestName = payload.guestName || payload.fullName || payload.name || 'Guest'
            socket.email = payload.email || ''
            socket.company = payload.company || ''
            socket.meetingId = payload.meetingId
            socket.isPending = payload.isPending
        } else {
            socket.guestName = payload.fullName || payload.name || payload.guestName || ''
            socket.email = payload.email || ''
        }
        return true
    } catch {
        return false
    }
}
