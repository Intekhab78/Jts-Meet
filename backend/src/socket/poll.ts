import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'
import { SocketEvents } from './events'

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

    socket.on(SocketEvents.POLL_CREATE, (payload: {
        meetingId: string
        question: string
        options: string[]
    }) => {
        if (!userId || !payload?.meetingId || !payload?.question || !Array.isArray(payload?.options)) return

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
            meetingPollsMap.set(payload.meetingId, [])
        }
        meetingPollsMap.get(payload.meetingId)!.push(newPoll)

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls: meetingPollsMap.get(payload.meetingId)
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

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls
        })
    })

    socket.on(SocketEvents.POLL_CLOSE, (payload: {
        meetingId: string
        pollId: string
    }) => {
        if (!userId || !payload?.meetingId || !payload?.pollId) return

        const polls = meetingPollsMap.get(payload.meetingId)
        if (!polls) return

        const poll = polls.find(p => p.id === payload.pollId)
        if (poll) {
            poll.active = false
        }

        io.to(`meeting:${payload.meetingId}`).emit(SocketEvents.POLL_UPDATE, {
            meetingId: payload.meetingId,
            polls
        })
    })
}
