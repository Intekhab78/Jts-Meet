import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'

// In-memory whiteboard stroke buffer per meeting
const meetingWhiteboardStrokesMap = new Map<string, any[]>()

export function registerWhiteboardHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    // Late-joiner initial state request
    socket.on('whiteboard:get_state', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        const strokes = meetingWhiteboardStrokesMap.get(payload.meetingId) || []
        socket.emit('whiteboard:init_state', {
            meetingId: payload.meetingId,
            strokes
        })
    })

    socket.on(SocketEvents.WHITEBOARD_DRAW, (payload: {
        meetingId: string
        stroke: any
    }) => {
        if (!userId || !payload?.meetingId || !payload?.stroke) return

        // Cache stroke for late joiners (cap at 2000 strokes)
        if (!meetingWhiteboardStrokesMap.has(payload.meetingId)) {
            meetingWhiteboardStrokesMap.set(payload.meetingId, [])
        }
        const strokes = meetingWhiteboardStrokesMap.get(payload.meetingId)!
        if (strokes.length > 2000) {
            strokes.shift()
        }
        strokes.push(payload.stroke)

        // Broadcast to other participants in the meeting room
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WHITEBOARD_DRAW, {
            userId,
            stroke: payload.stroke
        })
    })

    socket.on(SocketEvents.WHITEBOARD_CLEAR, (payload: {
        meetingId: string
    }) => {
        if (!userId || !payload?.meetingId) return

        meetingWhiteboardStrokesMap.set(payload.meetingId, [])

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WHITEBOARD_CLEAR, {
            userId
        })
    })
}
