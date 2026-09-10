import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { AuthenticatedSocket } from './auth'
import {
    createMeeting,
    joinMeeting as joinMeetingService,
    leaveMeeting as leaveMeetingService,
    endMeeting as endMeetingService
} from '../modules/meeting/meeting.service'
import { Meeting } from '../modules/meeting/meeting.model'
import { SocketEvents } from './events'
import { adHocRoomSettings } from '../routes/guest.routes'

export function registerMeetingHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    socket.on(SocketEvents.MEETING_CREATE, async (payload: { title: string }) => {
        if (!userId || !payload?.title || typeof payload.title !== 'string') {
            socket.emit('error', { message: 'Invalid meeting creation payload' })
            return
        }

        const meeting = await createMeeting(userId, payload.title)
        socket.emit(SocketEvents.MEETING_CREATE, meeting)
        io.emit(SocketEvents.MEETING_CREATE, meeting)
    })

    socket.on(SocketEvents.MEETING_JOIN, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        try {
            const meeting = await joinMeetingService(payload.meetingId, userId)
            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            socket.join(`meeting:${payload.meetingId}`)
            authSocket.meetingId = payload.meetingId

            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_JOIN, { meetingId: payload.meetingId, participants: meeting.participants })
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Failed to join meeting' })
        }
    })

    socket.on(SocketEvents.MEETING_LEAVE, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) {
            return
        }

        try {
            const meeting = await leaveMeetingService(payload.meetingId, userId)
            socket.leave(`meeting:${payload.meetingId}`)

            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_LEAVE, { meetingId: payload.meetingId, participants: meeting.participants })
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Failed to leave meeting' })
        }
    })

    socket.on(SocketEvents.MEETING_END, async (payload: { meetingId: string }) => {
        if (!userId) {
            return
        }

        try {
            const meeting = await endMeetingService(payload.meetingId, userId)
            if (!meeting) {
                socket.emit('error', { message: 'Meeting not found' })
                return
            }

            io.emit(SocketEvents.MEETING_END, { meetingId: payload.meetingId, status: meeting.status, participants: meeting.participants })
        } catch (error: any) {
            socket.emit('error', { message: error.message || 'Forbidden' })
        }
    })

    socket.on(SocketEvents.MEETING_MUTE_USER, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_MUTE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on(SocketEvents.MEETING_REMOVE_USER, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_REMOVE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
        io.to(`user:${payload.targetUserId}`).emit(SocketEvents.MEETING_REMOVE_USER, { targetUserId: payload.targetUserId, meetingId: payload.meetingId, kicked: true })
    })

    socket.on(SocketEvents.MEETING_RAISE_HAND, (payload: { meetingId: string; raised: boolean }) => {
        if (!userId || !payload?.meetingId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_RAISE_HAND, { userId, meetingId: payload.meetingId, raised: payload.raised })
    })

    socket.on('meeting:record-toggle', (payload: { meetingId: string; isRecording: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:record-toggle', { userId, isRecording: payload.isRecording })
    })

    socket.on(SocketEvents.MEETING_REACTION, (payload: { meetingId: string; emoji: string; senderName?: string }) => {
        if (!userId || !payload?.meetingId || !payload?.emoji) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_REACTION, { 
            userId, 
            meetingId: payload.meetingId, 
            emoji: payload.emoji,
            senderName: payload.senderName || 'Participant'
        })
    })

    socket.on('meeting:toggle-watermark', (payload: { meetingId: string; enabled: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:toggle-watermark', { enabled: payload.enabled })
    })

    socket.on(SocketEvents.MEETING_COHOST_PROMOTE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_COHOST_PROMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on(SocketEvents.MEETING_COHOST_DEMOTE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_COHOST_DEMOTE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on('meeting:permission-update', (payload: { meetingId: string; targetUserId: string; permission: 'recording' | 'whiteboard' | 'screen-share'; enabled: boolean }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:permission-update', payload)
    })

    socket.on(SocketEvents.MEETING_WAITING_APPROVE, (payload: { meetingId: string; targetUserId: string }) => {
        if (!userId || !payload?.meetingId || !payload?.targetUserId) return

        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_WAITING_APPROVE, { targetUserId: payload.targetUserId, meetingId: payload.meetingId })
    })

    socket.on('guest:approve', (payload: { socketId?: string; guestSocketId?: string; meetingId?: string }) => {
        const targetSocketId = payload?.socketId || payload?.guestSocketId
        if (!userId || !targetSocketId) return
        
        // Handle locally first (supports single-node in-memory dev fallback)
        const guestSocket = io.sockets.sockets.get(targetSocketId) as AuthenticatedSocket
        if (guestSocket) {
            guestSocket.isPending = false
            guestSocket.leave(`lobby:${guestSocket.meetingId}`)
            
            // Generate updated token
            const token = jwt.sign(
                {
                    userId: guestSocket.userId,
                    isGuest: true,
                    guestName: guestSocket.guestName,
                    meetingId: guestSocket.meetingId,
                    isPending: false
                },
                JWT_SECRET,
                { expiresIn: '6h' }
            )
            guestSocket.emit('guest:approved', { token })
            io.to(`user:${guestSocket.userId}`).emit('guest:approved', { token })
            io.to(`meeting:${guestSocket.meetingId}`).emit('guest:status-changed', { socketId: targetSocketId, status: 'approved' })
        }

        // Also emit to cluster
        io.serverSideEmit("internal:guest:approve-cluster", targetSocketId)
    })

    socket.on('guest:deny', (payload: { socketId?: string; guestSocketId?: string; meetingId?: string }) => {
        const targetSocketId = payload?.socketId || payload?.guestSocketId
        if (!userId || !targetSocketId) return
        
        // Handle locally first
        const guestSocket = io.sockets.sockets.get(targetSocketId) as AuthenticatedSocket
        if (guestSocket) {
            guestSocket.emit('guest:denied')
            io.to(`user:${guestSocket.userId}`).emit('guest:denied')
            guestSocket.disconnect(true)
        }

        // Also emit to cluster
        io.serverSideEmit("internal:guest:deny-cluster", targetSocketId)
    })

    socket.on('guest:get-waiting', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${payload.meetingId}`)
        const waitingList: any[] = []
        if (lobbyRoom) {
            for (const sId of Array.from(lobbyRoom)) {
                const s = io.sockets.sockets.get(sId) as AuthenticatedSocket
                if (s && s.isPending) {
                    waitingList.push({
                        socketId: s.id,
                        userId: s.userId,
                        guestName: s.guestName || 'Guest',
                        email: s.email || '',
                        company: s.company || ''
                    })
                }
            }
        }
        socket.emit('guest:waiting-list', { waitingList })
    })

    socket.on('guest:approve-all', (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        
        const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${payload.meetingId}`)
        if (lobbyRoom) {
            for (const sId of Array.from(lobbyRoom)) {
                const guestSocket = io.sockets.sockets.get(sId) as AuthenticatedSocket
                if (guestSocket && guestSocket.isPending) {
                    guestSocket.isPending = false
                    guestSocket.leave(`lobby:${guestSocket.meetingId}`)
                    const token = jwt.sign(
                        {
                            userId: guestSocket.userId,
                            isGuest: true,
                            guestName: guestSocket.guestName,
                            email: guestSocket.email,
                            company: guestSocket.company,
                            meetingId: guestSocket.meetingId,
                            isPending: false
                        },
                        JWT_SECRET,
                        { expiresIn: '6h' }
                    )
                    guestSocket.emit('guest:approved', { token })
                }
            }
            io.to(`meeting:${payload.meetingId}`).emit('guest:status-changed', { status: 'all-approved' })
        }
    })

    socket.on('meeting:waiting-room-toggle', async (payload: { meetingId: string; enabled: boolean }) => {
        if (!payload?.meetingId) return
        const { meetingId, enabled } = payload

        try {
            await Meeting.findOneAndUpdate({ meetingId }, { isWaitingRoomEnabled: enabled })
        } catch (e) {}

        if (!adHocRoomSettings[meetingId]) adHocRoomSettings[meetingId] = {}
        adHocRoomSettings[meetingId].isWaitingRoomEnabled = enabled

        io.to(`meeting:${meetingId}`).emit('meeting:waiting-room-toggle', { meetingId, enabled })

        // If toggled OFF (Allow everyone without approval), auto-approve any guests currently waiting
        if (!enabled) {
            const lobbyRoom = io.sockets.adapter.rooms.get(`lobby:${meetingId}`)
            if (lobbyRoom) {
                for (const sId of Array.from(lobbyRoom)) {
                    const guestSocket = io.sockets.sockets.get(sId) as AuthenticatedSocket
                    if (guestSocket && guestSocket.isPending) {
                        guestSocket.isPending = false
                        guestSocket.leave(`lobby:${guestSocket.meetingId}`)
                        const token = jwt.sign(
                            {
                                userId: guestSocket.userId,
                                isGuest: true,
                                guestName: guestSocket.guestName,
                                email: guestSocket.email,
                                company: guestSocket.company,
                                meetingId: guestSocket.meetingId,
                                isPending: false
                            },
                            JWT_SECRET,
                            { expiresIn: '6h' }
                        )
                        guestSocket.emit('guest:approved', { token })
                    }
                }
                io.to(`meeting:${meetingId}`).emit('guest:status-changed', { status: 'all-approved' })
            }
        }
    })

    socket.on('meeting:camera-toggle', (payload: { meetingId: string; isVideoOff: boolean }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit('meeting:camera-toggle', {
            userId,
            isVideoOff: payload.isVideoOff
        })
    })

    socket.on(SocketEvents.MEETING_LOCK_TOGGLE, async (payload: { meetingId: string; isLocked: boolean }) => {
        if (!userId || !payload?.meetingId) return
        try {
            await Meeting.findOneAndUpdate({ meetingId: payload.meetingId }, { isLocked: payload.isLocked })
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_LOCK_TOGGLE, {
                meetingId: payload.meetingId,
                isLocked: payload.isLocked
            })
        } catch (err) {
            console.error('Failed to toggle meeting lock:', err)
        }
    })

    socket.on(SocketEvents.MEETING_MUTE_ALL, (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_MUTE_ALL, {
            meetingId: payload.meetingId
        })
    })

    socket.on(SocketEvents.MEETING_CAPTION, (payload: { meetingId: string; text: string; isFinal: boolean; speakerName?: string }) => {
        if (!userId || !payload?.meetingId || !payload?.text) return
        const speakerName = payload.speakerName || authSocket.guestName || 'Speaker'
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_CAPTION, {
            userId,
            speakerName,
            text: payload.text,
            isFinal: payload.isFinal,
            timestamp: new Date()
        })
    })

    socket.on(SocketEvents.MEETING_NOTES_UPDATE, (payload: { meetingId: string; content: string }) => {
        if (!userId || !payload?.meetingId) return
        socket.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_NOTES_UPDATE, {
            content: payload.content,
            updatedBy: authSocket.guestName || 'Participant',
            updatedAt: new Date()
        })
    })

    socket.on(SocketEvents.MEETING_END_ALL, async (payload: { meetingId: string }) => {
        if (!userId || !payload?.meetingId) return
        try {
            await Meeting.findOneAndUpdate({ meetingId: payload.meetingId }, { status: 'ended', endedAt: new Date() })
            io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.MEETING_END, {
                meetingId: payload.meetingId,
                endedByHost: true
            })
        } catch (err) {
            console.error('Failed to end meeting for all:', err)
        }
    })
}
