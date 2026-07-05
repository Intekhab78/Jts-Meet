import { Response } from 'express'
import { NotificationService } from './notification.service'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { AuthRequest } from '../../middleware/authMiddleware'

export const notificationController = {
    list: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
        const cursor = req.query.cursor as string | undefined

        try {
            const data = await NotificationService.getUserNotifications(userId, limit, cursor)
            return sendSuccess(res, data, 'Notifications retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve notifications')
        }
    },

    markRead: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        const id = req.params.id as string

        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
            return sendError(res, 400, 'Notification ID is required and must be a valid ID')
        }

        try {
            const result = await NotificationService.markAsRead(id, userId)
            if (!result) {
                return sendError(res, 404, 'Notification not found')
            }
            return sendSuccess(res, result, 'Notification marked as read')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to mark notification as read')
        }
    },

    markAllRead: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            await NotificationService.markAllAsRead(userId)
            return sendSuccess(res, null, 'All notifications marked as read')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to mark all notifications as read')
        }
    }
}
