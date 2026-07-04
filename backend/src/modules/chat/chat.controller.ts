import { Response } from 'express'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import {
    createMessage,
    getConversationBetweenUsers,
    getRecentChats,
    markConversationSeen
} from './chat.service'
import { validateSendMessage, validateConversationQuery, validateRecentChatsQuery } from './chat.validator'
import { AuthRequest } from '../../middleware/authMiddleware'

export const chatController = {
    sendMessage: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateSendMessage(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const message = await createMessage(userId, {
            receiverId: req.body.receiverId,
            message: req.body.message
        })

        return sendSuccess(res, message, 'Message sent')
    },

    getConversation: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateConversationQuery(req.query)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const page = Number(req.query.page || 1)
        const limit = Number(req.query.limit || 20)
        const otherUserId = typeof req.query.userId === 'string' ? req.query.userId : ''
        const messages = await getConversationBetweenUsers(userId, otherUserId, page, limit)

        return sendSuccess(res, { messages, page, limit }, 'Conversation retrieved')
    },

    getRecentChats: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateRecentChatsQuery(req.query)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const page = Number(req.query.page || 1)
        const limit = Number(req.query.limit || 20)
        const chats = await getRecentChats(userId, page, limit)

        return sendSuccess(res, { chats, page, limit }, 'Recent chats retrieved')
    },

    markSeen: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        const senderId = req.body.senderId

        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        if (typeof senderId !== 'string' || senderId.trim().length === 0) {
            return sendError(res, 400, 'senderId is required')
        }

        await markConversationSeen(userId, senderId)
        return sendSuccess(res, null, 'Messages marked as seen')
    }
}
