import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'

export interface BreakoutRoom {
    id: string
    name: string
    participantIds: string[]
}

export interface BreakoutSession {
    meetingId: string
    isActive: boolean
    rooms: BreakoutRoom[]
    endsAt: number | null
}

const activeBreakoutSessions: Map<string, BreakoutSession> = new Map()

export function registerBreakoutHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket

    // Host starts breakout rooms
    socket.on('breakout:create', (payload: {
        meetingId: string
        rooms: Array<{ name: string; participantIds: string[] }>
        timerMinutes?: number
    }) => {
        if (!payload?.meetingId || !Array.isArray(payload.rooms)) return

        const rooms: BreakoutRoom[] = payload.rooms.map((r, index) => ({
            id: `breakout_${index + 1}_${Math.random().toString(36).substring(2, 6)}`,
            name: r.name || `Room ${index + 1}`,
            participantIds: r.participantIds || []
        }))

        const endsAt = payload.timerMinutes ? Date.now() + payload.timerMinutes * 60 * 1000 : null

        const session: BreakoutSession = {
            meetingId: payload.meetingId,
            isActive: true,
            rooms,
            endsAt
        }

        activeBreakoutSessions.set(payload.meetingId, session)

        // Broadcast to all participants in meeting
        io.to(`meeting:${payload.meetingId}`).emit('breakout:started', {
            meetingId: payload.meetingId,
            rooms,
            endsAt
        })
    })

    // Host broadcasts an announcement message to all breakout rooms
    socket.on('breakout:broadcast', (payload: { meetingId: string; message: string }) => {
        if (!payload?.meetingId || !payload?.message) return
        io.to(`meeting:${payload.meetingId}`).emit('breakout:announcement', {
            message: payload.message,
            senderName: authSocket.guestName || 'Host',
            timestamp: Date.now()
        })
    })

    // Host closes breakout rooms (all participants return to main room)
    socket.on('breakout:close', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        activeBreakoutSessions.delete(payload.meetingId)
        io.to(`meeting:${payload.meetingId}`).emit('breakout:ended', {
            meetingId: payload.meetingId
        })
    })
}
