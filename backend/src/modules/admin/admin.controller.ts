import { Response } from 'express'
import { Types } from 'mongoose'
import { Meeting } from '../meeting/meeting.model'
import { AuditLog } from './audit.model'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { getDashboardStats, getRecentMeetings, getAuditLogs } from './admin.service'
import { AuthRequest } from '../../middleware/authMiddleware'
import { parseCursorQuery, executeCursorQuery } from '../../utils/paginationHelper'

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

        if (req.query.cursor !== undefined || req.query.pageSize !== undefined || req.query.search !== undefined || req.query.status !== undefined) {
            const params = parseCursorQuery(req.query)
            const result = await executeCursorQuery(
                Meeting,
                {},
                params,
                ['title'],
                { status: req.query.status }
            )
            const populatedData = await Meeting.populate(result.data, { path: 'host', select: 'fullName email' })
            return res.status(200).json({
                success: true,
                data: populatedData,
                nextCursor: result.nextCursor,
                hasMore: result.hasMore
            })
        }

        const page = parseInt(req.query.page as any) || 1
        const limit = parseInt(req.query.limit as any) || 20
        const search = (req.query.search as any) || ''
        const status = (req.query.status as any) || ''

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

        if (req.query.cursor !== undefined || req.query.pageSize !== undefined || req.query.search !== undefined || req.query.action !== undefined) {
            const params = parseCursorQuery(req.query)
            const result = await executeCursorQuery(
                AuditLog,
                {},
                params,
                ['action', 'details'],
                { action: req.query.action }
            )
            const populatedData = await AuditLog.populate(result.data, { path: 'userId', select: 'fullName email' })
            return res.status(200).json({
                success: true,
                data: populatedData,
                nextCursor: result.nextCursor,
                hasMore: result.hasMore
            })
        }

        const page = parseInt(req.query.page as any) || 1
        const limit = parseInt(req.query.limit as any) || 20

        try {
            const result = await getAuditLogs(page, limit)
            return sendSuccess(res, result, 'Audit logs retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve audit logs')
        }
    }
}
