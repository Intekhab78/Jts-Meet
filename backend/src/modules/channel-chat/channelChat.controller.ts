import { Response } from 'express'
import { AuthRequest } from '../../middleware/authMiddleware'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { ChannelChatService } from './channelChat.service'
import * as ChannelService from '../channel/channel.service'
import { sendError, sendSuccess } from '../../utils/responseHelper'

export class ChannelChatController {
    static getMessages = asyncWrapper(async (req: AuthRequest, res: Response) => {
        const { channelId } = req.params as { channelId: string }
        const { limit, before, threadParentId, cursor, pageSize, search } = req.query as { limit?: string; before?: string; threadParentId?: string; cursor?: string; pageSize?: string; search?: string }

        await ChannelService.ensureMember(channelId, req.userId as string)

        if (cursor !== undefined || pageSize !== undefined || search !== undefined) {
            const pageSizeVal = Math.min(100, Number(pageSize || limit) || 20)
            const messages = await ChannelChatService.getMessages(channelId, pageSizeVal + 1, before, threadParentId, cursor, search)
            
            const hasMore = messages.length > pageSizeVal
            let nextCursor: string | null = null
            if (hasMore) {
                messages.pop()
                const lastMsg = messages[messages.length - 1]
                nextCursor = lastMsg._id.toString()
            }

            return res.status(200).json({
                success: true,
                data: messages,
                nextCursor,
                hasMore
            })
        }

        const messages = await ChannelChatService.getMessages(channelId, Number(limit) || 50, before, threadParentId)
        return sendSuccess(res, messages)
    })

    static getMessage = asyncWrapper(async (req: AuthRequest, res: Response) => {
        const { channelId, messageId } = req.params as { channelId: string; messageId: string }

        await ChannelService.ensureMember(channelId, req.userId as string)
        const message = await ChannelChatService.getMessageById(messageId)
        if (!message || message.channelId !== channelId) {
            return sendError(res, 404, 'Message not found')
        }

        return sendSuccess(res, message)
    })

    static createMessage = asyncWrapper(async (req: AuthRequest, res: Response) => {
        const { channelId } = req.params as { channelId: string }
        const { content, replyTo } = req.body as { content: string; replyTo?: string }

        await ChannelService.ensureMember(channelId, req.userId as string)
        const message = await ChannelChatService.createMessage(channelId, req.userId as string, content, replyTo)
        return sendSuccess(res, message, 'Message created')
    })

    static editMessage = asyncWrapper(async (req: AuthRequest, res: Response) => {
        const { channelId, messageId } = req.params as { channelId: string; messageId: string }
        const { content } = req.body as { content: string }

        await ChannelService.ensureMember(channelId, req.userId as string)
        const message = await ChannelChatService.editMessage(messageId, req.userId as string, content)
        if (!message || message.channelId !== channelId) {
            return sendError(res, 404, 'Message not found')
        }

        return sendSuccess(res, message, 'Message updated')
    })

    static deleteMessage = asyncWrapper(async (req: AuthRequest, res: Response) => {
        const { channelId, messageId } = req.params as { channelId: string; messageId: string }

        await ChannelService.ensureMember(channelId, req.userId as string)
        await ChannelChatService.deleteMessage(messageId, req.userId as string)
        return res.status(204).send()
    })
}
