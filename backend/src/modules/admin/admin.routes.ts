import { Router } from 'express'
import { adminController } from './admin.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin } from '../../middleware/adminMiddleware'

const router = Router()

// General Stats & Meetings
router.get('/stats', authenticate, requireAdmin, asyncWrapper(adminController.getStats))
router.get('/meetings', authenticate, requireAdmin, asyncWrapper(adminController.getMeetingsList))
router.get('/logs', authenticate, requireAdmin, asyncWrapper(adminController.getLogsList))

// TAB 1: User & Role Management (RBAC & Licenses)
router.get('/users', authenticate, requireAdmin, asyncWrapper(adminController.getUsers))
router.patch('/users/:userId/role', authenticate, requireAdmin, asyncWrapper(adminController.updateRole))
router.patch('/users/:userId/status', authenticate, requireAdmin, asyncWrapper(adminController.updateStatus))
router.post('/users/:userId/reset-password', authenticate, requireAdmin, asyncWrapper(adminController.resetPassword))
router.post('/users/invite', authenticate, requireAdmin, asyncWrapper(adminController.inviteUser))

// TAB 2: Attendance & Compliance
router.get('/attendance', authenticate, requireAdmin, asyncWrapper(adminController.getAttendance))

// TAB 3: Cloud Recordings & Storage Vault
router.get('/recordings', authenticate, requireAdmin, asyncWrapper(adminController.getRecordings))
router.patch('/storage/retention', authenticate, requireAdmin, asyncWrapper(adminController.updateRetention))
router.delete('/recordings/:meetingId', authenticate, requireAdmin, asyncWrapper(adminController.deleteRecordingItem))

// SUPER ADMIN MASTER PLATFORM CENTER (MULTI-TENANT & TELEMETRY)
router.get('/tenants', authenticate, requireAdmin, asyncWrapper(adminController.getTenantsList))
router.patch('/tenants/:orgId/status', authenticate, requireAdmin, asyncWrapper(adminController.updateTenantStatusAction))
router.patch('/tenants/:orgId/quota', authenticate, requireAdmin, asyncWrapper(adminController.updateTenantQuotaAction))
router.get('/telemetry', authenticate, requireAdmin, asyncWrapper(adminController.getTelemetryAction))
router.post('/broadcast', authenticate, requireAdmin, asyncWrapper(adminController.broadcastNoticeAction))

export default router

