import { Response } from 'express'
import { Types } from 'mongoose'
import { Message, IMessage } from './chat.model'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { SocketEvents } from '../../socket/events'
import {
    createMessage,
    getConversationBetweenUsers,
    getRecentChats,
    markConversationSeen,
    RecentChatItem,
    addReactionToMessage,
    removeReactionFromMessage
} from './chat.service'
import { validateSendMessage, validateConversationQuery, validateRecentChatsQuery } from './chat.validator'
import { AuthRequest } from '../../middleware/authMiddleware'
import { parseCursorQuery, executeCursorQuery } from '../../utils/paginationHelper'

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
            message: req.body.message,
            parentMessageId: req.body.parentMessageId
        })

        return sendSuccess(res, message, 'Message sent')
    },

    getConversation: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const otherUserId = typeof req.query.userId === 'string' ? req.query.userId : ''

        if (req.query.cursor !== undefined || req.query.pageSize !== undefined || req.query.search !== undefined) {
            const params = parseCursorQuery(req.query)
            const userObjectId = new Types.ObjectId(userId)
            const otherObjectId = new Types.ObjectId(otherUserId)

            const result = await executeCursorQuery(
                Message,
                {
                    $or: [
                        { sender: userObjectId, receiver: otherObjectId },
                        { sender: otherObjectId, receiver: userObjectId }
                    ],
                    parentMessageId: null
                },
                params,
                ['message']
            )
            return res.status(200).json({
                success: true,
                data: result.data,
                nextCursor: result.nextCursor,
                hasMore: result.hasMore
            })
        }

        const { valid, errors } = validateConversationQuery(req.query)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const page = Number(req.query.page || 1)
        const limit = Number(req.query.limit || 20)
        const messages = await getConversationBetweenUsers(userId, otherUserId, page, limit)

        return sendSuccess(res, { messages, page, limit }, 'Conversation retrieved')
    },

    getRecentChats: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        if (req.query.cursor !== undefined || req.query.pageSize !== undefined) {
            const pageSize = Math.min(100, Number(req.query.pageSize || req.query.limit) || 20)
            const cursor = req.query.cursor ? String(req.query.cursor) : undefined
            const userObjectId = new Types.ObjectId(userId)

            const pipeline: any[] = [
                {
                    $match: {
                        $or: [{ sender: userObjectId }, { receiver: userObjectId }]
                    }
                },
                { $sort: { createdAt: -1 } },
                {
                    $addFields: {
                        conversationWith: {
                            $cond: [{ $eq: ['$sender', userObjectId] }, '$receiver', '$sender']
                        }
                    }
                },
                {
                    $group: {
                        _id: '$conversationWith',
                        latestMessage: { $first: '$$ROOT' }
                    }
                },
                {
                    $project: {
                        conversationWith: '$_id',
                        latestMessage: 1,
                        _id: 0
                    }
                },
                { $sort: { 'latestMessage.createdAt': -1 } }
            ]

            if (cursor && Types.ObjectId.isValid(cursor)) {
                const cursorDoc = await Message.findById(cursor).exec()
                if (cursorDoc) {
                    pipeline.push({
                        $match: {
                            'latestMessage.createdAt': { $lt: cursorDoc.createdAt }
                        }
                    })
                }
            }

            pipeline.push({ $limit: pageSize + 1 })
            const results = await Message.aggregate<RecentChatItem>(pipeline).exec()

            const hasMore = results.length > pageSize
            let nextCursor: string | null = null
            if (hasMore) {
                results.pop()
                const lastItem = results[results.length - 1]
                nextCursor = lastItem.latestMessage._id.toString()
            }

            return res.status(200).json({
                success: true,
                data: results,
                nextCursor,
                hasMore
            })
        }

        const { valid, errors } = validateRecentChatsQuery(req.query)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
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
    },

    getThreadReplies: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const parentMessageId = req.params.parentMessageId
        if (!parentMessageId) {
            return sendError(res, 400, 'parentMessageId is required')
        }

        const params = parseCursorQuery(req.query)
        const result = await executeCursorQuery(
            Message,
            { parentMessageId: new Types.ObjectId(parentMessageId as any) },
            params,
            ['message']
        )
        return res.status(200).json({
            success: true,
            data: result.data,
            nextCursor: result.nextCursor,
            hasMore: result.hasMore
        })
    },

    createReply: async (req: AuthRequest, res: Response) => {
        const { parentMessageId, message } = req.body
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        if (!parentMessageId || typeof parentMessageId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(parentMessageId)) {
            return sendError(res, 400, 'parentMessageId is required and must be a valid ID')
        }
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return sendError(res, 400, 'message is required and must be non-empty')
        }

        try {
            const parentMsg = await Message.findById(parentMessageId).exec()
            if (!parentMsg) {
                return sendError(res, 404, 'Parent message not found')
            }

            const receiverId = parentMsg.sender.toString() === userId 
                ? parentMsg.receiver.toString() 
                : parentMsg.sender.toString()

            const reply = await createMessage(userId, {
                receiverId,
                message,
                parentMessageId
            })

            const io = req.app?.get('io')
            if (io) {
                const parentMsg = await Message.findById(parentMessageId).exec()
                io.to(`user:${userId}`).to(`user:${receiverId}`).emit(SocketEvents.THREAD_CREATED, reply)
                if (parentMsg) {
                    io.to(`user:${userId}`).to(`user:${receiverId}`).emit(SocketEvents.THREAD_UPDATED, parentMsg)
                }
            }

            return sendSuccess(res, reply, 'Reply sent')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to create reply')
        }
    },

    getThreadCount: async (req: AuthRequest, res: Response) => {
        const parentMessageId = req.params.parentMessageId as any
        if (!parentMessageId || !/^[a-fA-F0-9]{24}$/.test(parentMessageId)) {
            return sendError(res, 400, 'parentMessageId is required and must be a valid ID')
        }

        try {
            const parentMsg = await Message.findById(parentMessageId).select('threadCount').exec()
            if (!parentMsg) {
                return sendError(res, 404, 'Parent message not found')
            }

            return sendSuccess(res, { threadCount: parentMsg.threadCount || 0 }, 'Thread count retrieved')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve thread count')
        }
    },

    addReaction: async (req: AuthRequest, res: Response) => {
        const messageId = req.params.messageId as string
        const { emoji } = req.body
        const userId = req.userId

        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        if (!messageId || !/^[a-fA-F0-9]{24}$/.test(messageId)) {
            return sendError(res, 400, 'messageId is required and must be a valid ID')
        }
        if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
            return sendError(res, 400, 'emoji is required and must be a non-empty string')
        }

        try {
            const result = await addReactionToMessage(messageId, userId, emoji)
            if (!result) {
                return sendError(res, 404, 'Message not found')
            }

            const receiverId = result.sender.toString() === userId 
                ? result.receiver.toString() 
                : result.sender.toString()
            const io = req.app?.get('io')
            if (io) {
                io.to(`user:${userId}`).to(`user:${receiverId}`).emit(SocketEvents.REACTION_ADD, {
                    messageId,
                    userId,
                    emoji,
                    createdAt: new Date()
                })
            }

            return sendSuccess(res, result, 'Reaction added successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to add reaction')
        }
    },

    removeReaction: async (req: AuthRequest, res: Response) => {
        const messageId = req.params.messageId as string
        const { emoji } = req.body
        const userId = req.userId

        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        if (!messageId || !/^[a-fA-F0-9]{24}$/.test(messageId)) {
            return sendError(res, 400, 'messageId is required and must be a valid ID')
        }
        if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
            return sendError(res, 400, 'emoji is required and must be a non-empty string')
        }

        try {
            const result = await removeReactionFromMessage(messageId, userId, emoji)
            if (!result) {
                return sendError(res, 404, 'Message not found')
            }

            const receiverId = result.sender.toString() === userId 
                ? result.receiver.toString() 
                : result.sender.toString()
            const io = req.app?.get('io')
            if (io) {
                io.to(`user:${userId}`).to(`user:${receiverId}`).emit(SocketEvents.REACTION_REMOVE, {
                    messageId,
                    userId,
                    emoji
                })
            }

            return sendSuccess(res, result, 'Reaction removed successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to remove reaction')
        }
    }
}
