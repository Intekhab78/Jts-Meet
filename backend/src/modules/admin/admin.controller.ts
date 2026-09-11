import { Response } from 'express'
import { Types } from 'mongoose'
import { Meeting } from '../meeting/meeting.model'
import { AuditLog } from './audit.model'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { 
    getDashboardStats, 
    getRecentMeetings, 
    getAuditLogs,
    getOrganizationUsers,
    updateUserRole,
    updateUserStatus,
    resetUserPassword,
    inviteUserToOrg,
    getOrganizationRecordings,
    updateStorageRetentionPolicy,
    deleteRecording,
    getAttendanceRecords,
    getAllTenants,
    updateTenantStatus,
    updateTenantQuota,
    getLiveTelemetry,
    postBroadcastNotice
} from './admin.service'
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
        const action = (req.query.action as any) || ''
        const search = (req.query.search as any) || ''

        try {
            const result = await getAuditLogs(page, limit, action, search)
            return sendSuccess(res, result, 'Audit logs retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve audit logs')
        }
    },

    // -------------------------------------------------------------
    // USER & ROLE MANAGEMENT (RBAC)
    // -------------------------------------------------------------
    getUsers: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const orgId = req.query.orgId as string
            const search = (req.query.search as string) || ''
            const role = (req.query.role as string) || ''
            const status = (req.query.status as string) || ''

            const result = await getOrganizationUsers(orgId, search, role, status)
            return sendSuccess(res, result, 'Organization users retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve organization users')
        }
    },

    updateRole: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const userId = String(req.params.userId)
            const { role, orgId } = req.body
            if (!role) return sendError(res, 400, 'Role is required')

            const result = await updateUserRole(req.userId, userId, role, orgId)
            return sendSuccess(res, result, 'User role updated successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to update user role')
        }
    },

    updateStatus: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const userId = String(req.params.userId)
            const { status, orgId } = req.body
            if (!status) return sendError(res, 400, 'Status is required')

            const result = await updateUserStatus(req.userId, userId, status, orgId)
            return sendSuccess(res, result, 'User status updated successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to update user status')
        }
    },

    resetPassword: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const userId = String(req.params.userId)
            const result = await resetUserPassword(req.userId, userId)
            return sendSuccess(res, result, 'Temporary password generated successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to reset password')
        }
    },

    inviteUser: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const { email, fullName, role, orgId } = req.body
            if (!email) return sendError(res, 400, 'Email address is required')

            const result = await inviteUserToOrg(req.userId, email, fullName, role || 'member', orgId)
            return sendSuccess(res, result, 'User invited successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to invite user')
        }
    },

    // -------------------------------------------------------------
    // CLOUD RECORDINGS & STORAGE VAULT
    // -------------------------------------------------------------
    getRecordings: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const orgId = req.query.orgId as string
            const result = await getOrganizationRecordings(orgId)
            return sendSuccess(res, result, 'Organization cloud recordings retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve cloud recordings')
        }
    },

    updateRetention: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const { days } = req.body
            const result = await updateStorageRetentionPolicy(req.userId, parseInt(days))
            return sendSuccess(res, result, 'Retention policy updated successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to update retention policy')
        }
    },

    deleteRecordingItem: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const meetingId = String(req.params.meetingId)
            const result = await deleteRecording(req.userId, meetingId)
            return sendSuccess(res, result, 'Recording deleted successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to delete recording')
        }
    },

    // -------------------------------------------------------------
    // MEETING ATTENDANCE COMPLIANCE
    // -------------------------------------------------------------
    getAttendance: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const page = parseInt(req.query.page as any) || 1
            const limit = parseInt(req.query.limit as any) || 15
            const result = await getAttendanceRecords(page, limit)
            return sendSuccess(res, result, 'Meeting attendance records retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve attendance records')
        }
    },

    // -------------------------------------------------------------
    // SUPER ADMIN EXCLUSIVE: TENANTS & PLATFORM TELEMETRY
    // -------------------------------------------------------------
    getTenantsList: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const search = (req.query.search as string) || ''
            const result = await getAllTenants(search)
            return sendSuccess(res, result, 'All platform tenants retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve platform tenants')
        }
    },

    updateTenantStatusAction: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const orgId = String(req.params.orgId)
            const { status } = req.body
            if (!status || !['active', 'inactive'].includes(status)) {
                return sendError(res, 400, 'Valid status is required (active/inactive)')
            }
            const result = await updateTenantStatus(req.userId, orgId, status)
            return sendSuccess(res, result, `Tenant organization status updated to ${status}`)
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to update tenant status')
        }
    },

    updateTenantQuotaAction: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const orgId = String(req.params.orgId)
            const result = await updateTenantQuota(req.userId, orgId, req.body)
            return sendSuccess(res, result, 'Tenant plan and quotas updated successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to update tenant quota')
        }
    },

    getTelemetryAction: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const result = await getLiveTelemetry()
            return sendSuccess(res, result, 'Platform telemetry retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to retrieve platform telemetry')
        }
    },

    broadcastNoticeAction: async (req: AuthRequest, res: Response) => {
        if (!req.userId) return sendError(res, 401, 'Unauthorized access')

        try {
            const { message, severity, active } = req.body
            if (!message) return sendError(res, 400, 'Broadcast message text is required')
            const result = await postBroadcastNotice(req.userId, message, severity || 'info', active !== false)
            return sendSuccess(res, result, 'Platform broadcast notice updated successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to post broadcast notice')
        }
    }
}
