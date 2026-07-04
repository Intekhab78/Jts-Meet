import { Response } from 'express'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { getDashboardStats, getRecentMeetings, getAuditLogs } from './admin.service'
import { AuthRequest } from '../../middleware/authMiddleware'

export const adminController = {
    getStats: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const stats = await getDashboardStats()
            return sendSuccess(res, stats, 'Dashboard stats retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve dashboard statistics')
        }
    },

    getMeetingsList: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const search = (req.query.search as string) || ''
        const status = (req.query.status as string) || ''

        try {
            const result = await getRecentMeetings({ page, limit, search, status })
            return sendSuccess(res, result, 'Meetings list retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve meetings list')
        }
    },

    getLogsList: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20

        try {
            const result = await getAuditLogs(page, limit)
            return sendSuccess(res, result, 'Audit logs retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve audit logs')
        }
    }
}
