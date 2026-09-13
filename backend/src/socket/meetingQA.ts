import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from './auth'

export interface QAQuestion {
    id: string
    meetingId: string
    questionText: string
    authorId: string
    authorName: string
    isAnonymous?: boolean
    upvotes: string[] // user IDs who upvoted
    isAnswered: boolean
    isPinned?: boolean
    isLiveAnswering?: boolean
    answerText?: string
    answeredBy?: string
    answeredAt?: number
    createdAt: number
}

const meetingQuestionsMap: Map<string, QAQuestion[]> = new Map()

export function registerMeetingQAHandlers(io: Server, socket: Socket) {
    const authSocket = socket as AuthenticatedSocket
    const effectiveUserId = authSocket.userId || authSocket.guestName || socket.id

    // Fetch all current questions for a meeting
    socket.on('qa:get_all', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        const questions = meetingQuestionsMap.get(payload.meetingId) || []
        socket.emit('qa:list', questions)
    })

    // Participant asks a question
    socket.on('qa:ask', (payload: { meetingId: string; questionText: string; authorName?: string; isAnonymous?: boolean }) => {
        if (!payload?.meetingId || !payload?.questionText?.trim()) return

        const displayName = payload.isAnonymous 
            ? 'Anonymous' 
            : (payload.authorName || authSocket.guestName || 'Participant')

        const question: QAQuestion = {
            id: 'qa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            meetingId: payload.meetingId,
            questionText: payload.questionText.trim(),
            authorId: effectiveUserId,
            authorName: displayName,
            isAnonymous: !!payload.isAnonymous,
            upvotes: [effectiveUserId], // Author automatically upvotes their own question
            isAnswered: false,
            isPinned: false,
            isLiveAnswering: false,
            createdAt: Date.now()
        }

        const existing = meetingQuestionsMap.get(payload.meetingId) || []
        existing.unshift(question)
        meetingQuestionsMap.set(payload.meetingId, existing)

        io.to(`meeting:${payload.meetingId}`).emit('qa:new_question', question)
    })

    // Participant upvotes/un-upvotes a question
    socket.on('qa:upvote', (payload: { meetingId: string; questionId: string }) => {
        if (!payload?.meetingId || !payload?.questionId) return

        const list = meetingQuestionsMap.get(payload.meetingId) || []
        const q = list.find(item => item.id === payload.questionId)
        if (!q) return

        const upvoteIdx = q.upvotes.indexOf(effectiveUserId)
        if (upvoteIdx > -1) {
            q.upvotes.splice(upvoteIdx, 1)
        } else {
            q.upvotes.push(effectiveUserId)
        }

        io.to(`meeting:${payload.meetingId}`).emit('qa:question_updated', q)
    })

    // Host marks a question as answered / unanswered
    socket.on('qa:mark_answered', (payload: { meetingId: string; questionId: string; isAnswered: boolean }) => {
        if (!payload?.meetingId || !payload?.questionId) return

        const list = meetingQuestionsMap.get(payload.meetingId) || []
        const q = list.find(item => item.id === payload.questionId)
        if (!q) return

        q.isAnswered = payload.isAnswered
        if (q.isAnswered) {
            q.isLiveAnswering = false
        }
        io.to(`meeting:${payload.meetingId}`).emit('qa:question_updated', q)
    })

    // Host toggles pinning a question to top
    socket.on('qa:pin', (payload: { meetingId: string; questionId: string; isPinned: boolean }) => {
        if (!payload?.meetingId || !payload?.questionId) return

        const list = meetingQuestionsMap.get(payload.meetingId) || []
        const q = list.find(item => item.id === payload.questionId)
        if (!q) return

        q.isPinned = payload.isPinned
        io.to(`meeting:${payload.meetingId}`).emit('qa:question_updated', q)
    })

    // Host indicates currently answering live on stage
    socket.on('qa:live_answer', (payload: { meetingId: string; questionId: string; isLiveAnswering: boolean }) => {
        if (!payload?.meetingId || !payload?.questionId) return

        const list = meetingQuestionsMap.get(payload.meetingId) || []
        list.forEach(item => {
            if (item.id === payload.questionId) {
                item.isLiveAnswering = payload.isLiveAnswering
            } else if (payload.isLiveAnswering) {
                item.isLiveAnswering = false
            }
        })

        const updated = list.find(item => item.id === payload.questionId)
        if (updated) {
            io.to(`meeting:${payload.meetingId}`).emit('qa:list', list)
        }
    })

    // Host or Presenter posts a written answer to a question
    socket.on('qa:answer', (payload: { meetingId: string; questionId: string; answerText: string; answeredBy?: string }) => {
        if (!payload?.meetingId || !payload?.questionId || !payload?.answerText?.trim()) return

        const list = meetingQuestionsMap.get(payload.meetingId) || []
        const q = list.find(item => item.id === payload.questionId)
        if (!q) return

        q.answerText = payload.answerText.trim()
        q.answeredBy = payload.answeredBy || authSocket.guestName || 'Presenter'
        q.answeredAt = Date.now()
        q.isAnswered = true
        q.isLiveAnswering = false

        io.to(`meeting:${payload.meetingId}`).emit('qa:question_updated', q)
    })

    // Delete a single question
    socket.on('qa:delete', (payload: { meetingId: string; questionId: string }) => {
        if (!payload?.meetingId || !payload?.questionId) return

        let list = meetingQuestionsMap.get(payload.meetingId) || []
        list = list.filter(item => item.id !== payload.questionId)
        meetingQuestionsMap.set(payload.meetingId, list)

        io.to(`meeting:${payload.meetingId}`).emit('qa:question_deleted', { questionId: payload.questionId })
    })

    // Host clears all questions
    socket.on('qa:clear_all', (payload: { meetingId: string }) => {
        if (!payload?.meetingId) return
        meetingQuestionsMap.set(payload.meetingId, [])
        io.to(`meeting:${payload.meetingId}`).emit('qa:list', [])
    })
}
