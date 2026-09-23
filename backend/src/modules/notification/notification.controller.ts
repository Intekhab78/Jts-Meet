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
    },

    getVapidPublicKey: async (_req: AuthRequest, res: Response) => {
        try {
            const key = NotificationService.getVapidPublicKey()
            return sendSuccess(res, { publicKey: key }, 'VAPID public key retrieved')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve VAPID key')
        }
    },

    subscribePush: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const { subscription } = req.body
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return sendError(res, 400, 'Invalid subscription object')
        }

        try {
            const userAgent = req.headers['user-agent'] || ''
            await NotificationService.savePushSubscription(userId, subscription, userAgent)
            return sendSuccess(res, { subscribed: true }, 'Push subscription registered successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to save push subscription')
        }
    },

    unsubscribePush: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const { endpoint } = req.body
        if (!endpoint) {
            return sendError(res, 400, 'Endpoint is required')
        }

        try {
            await NotificationService.removePushSubscription(userId, endpoint)
            return sendSuccess(res, { unsubscribed: true }, 'Push subscription removed successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to remove push subscription')
        }
    },

    rejectCallFromPush: async (req: AuthRequest, res: Response) => {
        const { meetingId, callerId, reason } = req.body
        const userId = req.userId

        try {
            const globalIo = (global as any).io
            if (globalIo) {
                const rejectData = {
                    calleeId: userId,
                    meetingId,
                    reason: reason || 'declined_from_push'
                }
                if (callerId) {
                    globalIo.to(`user:${callerId}`).emit('call:rejected', rejectData)
                }
                if (meetingId) {
                    globalIo.to(`meeting:${meetingId}`).emit('call:rejected', rejectData)
                }
            }
            return sendSuccess(res, { rejected: true }, 'Call rejected successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to process rejection')
        }
    }
}


