import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'

export function registerWhiteboardHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.WHITEBOARD_DRAW, (payload: {
        meetingId: string
        stroke: any
    }) => {
        if (!userId || !payload?.meetingId || !payload?.stroke) return

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

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WHITEBOARD_CLEAR, {
            userId
        })
    })
}
