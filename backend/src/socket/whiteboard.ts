import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'
import { getEffectivePlanForOrg, getEffectivePlanForUser } from '../modules/plan/planEntitlements'
import { saveMeetingState, loadMeetingState, deleteMeetingState } from '../services/meetingStateStore'

// In-memory whiteboard pages buffer per meeting: meetingId -> array of page strokes (any[][])
const meetingWhiteboardPagesMap = new Map<string, any[][]>()

async function canUseMeetingWhiteboard(meetingId: string): Promise<boolean> {
    try {
        const meeting = await getMeetingByMeetingId(meetingId)
        if (!meeting) {
            const defaultPlan = await getEffectivePlanForOrg(null)
            return defaultPlan.features.whiteboard
        }
        const effectivePlan = meeting.organizationId
            ? await getEffectivePlanForOrg(String((meeting.organizationId as any)?._id || meeting.organizationId))
            : await getEffectivePlanForUser(String((meeting.host as any)?._id || meeting.host))
        return effectivePlan.features.whiteboard
    } catch (_) {
        return true
    }
}

export function registerWhiteboardHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    // Late-joiner initial state request
    socket.on('whiteboard:get_state', async (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        if (!(await canUseMeetingWhiteboard(payload.meetingId))) {
            socket.emit('error', { message: 'Whiteboard is not enabled on this meeting plan.' })
            return
        }
        let pages = meetingWhiteboardPagesMap.get(payload.meetingId)
        if (!pages) {
            const restored = await loadMeetingState<any[][]>('whiteboard', payload.meetingId)
            pages = restored || [[]]
            meetingWhiteboardPagesMap.set(payload.meetingId, pages)
        }
        socket.emit('whiteboard:init_state', {
            meetingId: payload.meetingId,
            pages,
            strokes: pages[0] || []
        })
    })

    socket.on(SocketEvents.WHITEBOARD_DRAW, async (payload: {
        meetingId: string
        stroke: any
        pageIndex?: number
    }) => {
        if (!userId || !payload?.meetingId || !payload?.stroke) return
        if (!(await canUseMeetingWhiteboard(payload.meetingId))) {
            socket.emit('error', { message: 'Whiteboard is not enabled on this meeting plan.' })
            return
        }

        const pageIndex = typeof payload.pageIndex === 'number' ? Math.max(0, payload.pageIndex) : 0

        if (!meetingWhiteboardPagesMap.has(payload.meetingId)) {
            meetingWhiteboardPagesMap.set(payload.meetingId, [[]])
        }
        const pages = meetingWhiteboardPagesMap.get(payload.meetingId)!
        while (pages.length <= pageIndex) {
            pages.push([])
        }

        const currentStrokes = pages[pageIndex]
        if (currentStrokes.length > 2000) {
            currentStrokes.shift()
        }
        currentStrokes.push(payload.stroke)
        void saveMeetingState('whiteboard', payload.meetingId, pages)

        // Broadcast to other participants in the meeting room
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WHITEBOARD_DRAW, {
            userId,
            stroke: payload.stroke,
            pageIndex
        })
    })

    socket.on(SocketEvents.WHITEBOARD_CLEAR, async (payload: {
        meetingId: string
        pageIndex?: number
    }) => {
        if (!userId || !payload?.meetingId) return
        if (!(await canUseMeetingWhiteboard(payload.meetingId))) {
            socket.emit('error', { message: 'Whiteboard is not enabled on this meeting plan.' })
            return
        }

        const pageIndex = typeof payload.pageIndex === 'number' ? payload.pageIndex : 0
        const pages = meetingWhiteboardPagesMap.get(payload.meetingId)
        if (pages && pages[pageIndex]) {
            pages[pageIndex] = []
            void saveMeetingState('whiteboard', payload.meetingId, pages)
        }

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.WHITEBOARD_CLEAR, {
            userId,
            pageIndex
        })
    })

    // Full page sync for moves, deletes, reorders
    socket.on('whiteboard:sync_page', async (payload: {
        meetingId: string
        pageIndex?: number
        strokes: any[]
    }) => {
        if (!userId || !payload?.meetingId || !Array.isArray(payload.strokes)) return
        if (!(await canUseMeetingWhiteboard(payload.meetingId))) {
            socket.emit('error', { message: 'Whiteboard is not enabled on this meeting plan.' })
            return
        }

        const pageIndex = typeof payload.pageIndex === 'number' ? Math.max(0, payload.pageIndex) : 0
        if (!meetingWhiteboardPagesMap.has(payload.meetingId)) {
            meetingWhiteboardPagesMap.set(payload.meetingId, [[]])
        }
        const pages = meetingWhiteboardPagesMap.get(payload.meetingId)!
        while (pages.length <= pageIndex) {
            pages.push([])
        }
        pages[pageIndex] = payload.strokes

        socket.to(`meeting:${payload.meetingId}`).emit('whiteboard:page_synced', {
            userId,
            pageIndex,
            strokes: payload.strokes
        })
    })

    // Multi-page sync: Add page
    socket.on('whiteboard:page_add', (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        if (!meetingWhiteboardPagesMap.has(payload.meetingId)) {
            meetingWhiteboardPagesMap.set(payload.meetingId, [[]])
        }
        const pages = meetingWhiteboardPagesMap.get(payload.meetingId)!
        pages.push([])

        socket.to(`meeting:${payload.meetingId}`).emit('whiteboard:page_added', {
            userId,
            totalPages: pages.length
        })
    })

    // Multi-page sync: Delete page
    socket.on('whiteboard:page_delete', (payload: { meetingId: string; pageIndex: number }) => {
        if (!userId || !payload?.meetingId) return
        const pages = meetingWhiteboardPagesMap.get(payload.meetingId)
        if (pages && pages.length > 1 && payload.pageIndex >= 0 && payload.pageIndex < pages.length) {
            pages.splice(payload.pageIndex, 1)
            socket.to(`meeting:${payload.meetingId}`).emit('whiteboard:page_deleted', {
                userId,
                pageIndex: payload.pageIndex,
                totalPages: pages.length
            })
        }
    })

    // Laser pointer broadcast
    socket.on('whiteboard:laser', (payload: { meetingId: string; x: number; y: number }) => {
        if (!userId || !payload?.meetingId || typeof payload.x !== 'number' || typeof payload.y !== 'number') return
        socket.to(`meeting:${payload.meetingId}`).emit('whiteboard:laser', {
            userId,
            x: payload.x,
            y: payload.y
        })
    })

    // Real-time collaborator cursor broadcast
    socket.on('whiteboard:cursor', (payload: { meetingId: string; x: number; y: number; name?: string; color?: string }) => {
        if (!userId || !payload?.meetingId || typeof payload.x !== 'number' || typeof payload.y !== 'number') return
        socket.to(`meeting:${payload.meetingId}`).emit('whiteboard:remote_cursor', {
            userId,
            name: payload.name || 'Participant',
            color: payload.color || '#6366f1',
            x: payload.x,
            y: payload.y
        })
    })
}

export function cleanupWhiteboard(meetingId: string) {
    meetingWhiteboardPagesMap.delete(meetingId)
    void deleteMeetingState('whiteboard', meetingId)
}
