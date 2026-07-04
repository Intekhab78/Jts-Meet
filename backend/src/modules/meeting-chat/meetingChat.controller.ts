import { Request, Response } from 'express'
import { createMeetingChat, getMeetingChatHistory, softDeleteMeetingChat } from './meetingChat.service'
import { sendSuccess, sendError } from '../../utils/responseHelper'

interface AuthRequest extends Request {
    userId?: string
}

export const meetingChatController = {
    async getHistory(req: AuthRequest, res: Response) {
        const userId = req.userId
        const meetingId = req.query.meetingId as string
        const page = Number(req.query.page || '1')
        const limit = Number(req.query.limit || '50')

        if (!userId || !meetingId) {
            return sendError(res, 400, 'Invalid request')
        }

        const history = await getMeetingChatHistory(meetingId, page, limit)
        return sendSuccess(res, history)
    },

    async sendMessage(req: AuthRequest, res: Response) {
        const userId = req.userId
        const { meetingId, message } = req.body

        if (!userId || !meetingId || !message || typeof message !== 'string' || !message.trim()) {
            return sendError(res, 400, 'Invalid request')
        }

        try {
            const chat = await createMeetingChat(meetingId, userId, message)
            return sendSuccess(res, chat)
        } catch (error: any) {
            return sendError(res, 400, error.message || 'Unable to send message')
        }
    },

    async deleteMessage(req: AuthRequest, res: Response) {
        const userId = req.userId
        const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId

        if (!userId || !messageId) {
            return sendError(res, 400, 'Invalid request')
        }

        try {
            const deleted = await softDeleteMeetingChat(messageId, userId)
            if (!deleted) {
                return sendError(res, 404, 'Message not found')
            }
            return sendSuccess(res, deleted)
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Unable to delete message')
        }
    }
}
