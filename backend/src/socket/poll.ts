import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'
import { verifyIsHostOrCoHost } from './meeting'
import { saveMeetingState, loadMeetingState, deleteMeetingState } from '../services/meetingStateStore'

interface PollOption {
    id: string
    text: string
    votes: string[] // userIds who voted
}

interface MeetingPoll {
    id: string
    meetingId: string
    creatorId: string
    question: string
    options: PollOption[]
    active: boolean
    createdAt: Date
}

// In-memory poll store per meeting (transient per session)
const meetingPollsMap = new Map<string, MeetingPoll[]>()

export function registerPollHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const userId = authSocket.userId

    // Late-joiner / modal open initial poll retrieval
    socket.on('poll:get_all', async (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        let polls = meetingPollsMap.get(payload.meetingId)
        if (!polls) {
            const restored = await loadMeetingState<MeetingPoll[]>('polls', payload.meetingId)
            if (restored) {
                polls = restored
                meetingPollsMap.set(payload.meetingId, polls)
            }
        }
        socket.emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls: polls || []
        })
    })

    socket.on(SocketEvents.POLL_CREATE, async (payload: {
        meetingId: string
        question: string
        options: string[]
    }) => {
        if (!userId || !payload?.meetingId || !payload?.question || !Array.isArray(payload?.options)) return
        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        if (!(await verifyIsHostOrCoHost(baseMeetId, userId))) {
            socket.emit('error', { message: 'Forbidden: Only host or co-host can create polls' })
            return
        }

        const pollId = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const newPoll: MeetingPoll = {
            id: pollId,
            meetingId: payload.meetingId,
            creatorId: userId,
            question: payload.question.trim(),
            options: payload.options.map((opt, idx) => ({
                id: `opt_${idx}`,
                text: String(opt).trim(),
                votes: []
            })),
            active: true,
            createdAt: new Date()
        }

        if (!meetingPollsMap.has(payload.meetingId)) {
            const restored = await loadMeetingState<MeetingPoll[]>('polls', payload.meetingId)
            meetingPollsMap.set(payload.meetingId, restored || [])
        }
        const polls = meetingPollsMap.get(payload.meetingId)!
        polls.push(newPoll)
        void saveMeetingState('polls', payload.meetingId, polls)

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls
        })
    })

    socket.on(SocketEvents.POLL_VOTE, (payload: {
        meetingId: string
        pollId: string
        optionId: string
    }) => {
        if (!userId || !payload?.meetingId || !payload?.pollId || !payload?.optionId) return

        const polls = meetingPollsMap.get(payload.meetingId)
        if (!polls) return

        const poll = polls.find(p => p.id === payload.pollId)
        if (!poll || !poll.active) return

        // Toggle or single-vote: remove existing votes by this user in this poll
        poll.options.forEach(opt => {
            opt.votes = opt.votes.filter(id => id !== userId)
        })

        const selectedOption = poll.options.find(opt => opt.id === payload.optionId)
        if (selectedOption) {
            selectedOption.votes.push(userId)
        }
        void saveMeetingState('polls', payload.meetingId, polls)

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls
        })
    })

    socket.on(SocketEvents.POLL_CLOSE, async (payload: {
        meetingId: string
        pollId: string
    }) => {
        if (!userId || !payload?.meetingId || !payload?.pollId) return

        const polls = meetingPollsMap.get(payload.meetingId)
        if (!polls) return

        const poll = polls.find(p => p.id === payload.pollId)
        if (!poll) return

        const baseMeetId = payload.meetingId.includes('__sub_') ? payload.meetingId.split('__sub_')[0] : payload.meetingId
        const isHost = await verifyIsHostOrCoHost(baseMeetId, userId)
        if (poll.creatorId !== userId && !isHost) {
            socket.emit('error', { message: 'Forbidden: Only the poll creator or meeting host can close this poll' })
            return
        }

        poll.active = false
        void saveMeetingState('polls', payload.meetingId, polls)

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls
        })
    })
}

export function cleanupPolls(meetingId: string) {
    meetingPollsMap.delete(meetingId)
    void deleteMeetingState('polls', meetingId)
}
