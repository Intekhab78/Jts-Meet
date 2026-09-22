import { Router } from 'express'
import { adminController } from './admin.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin, requireSuperAdmin } from '../../middleware/adminMiddleware'
import { planController } from '../plan/plan.controller'

const router = Router()

// General Stats & Meetings
router.get('/stats', authenticate, requireAdmin, asyncWrapper(adminController.getStats))
router.get('/meetings', authenticate, requireAdmin, asyncWrapper(adminController.getMeetingsList))
router.get('/logs', authenticate, requireAdmin, asyncWrapper(adminController.getLogsList))

// TAB 1: User & Role Management (RBAC & Licenses)
router.get('/users', authenticate, requireAdmin, asyncWrapper(adminController.getUsers))
router.patch('/users/:userId/role', authenticate, requireAdmin, asyncWrapper(adminController.updateRole))
router.patch('/users/:userId/status', authenticate, requireAdmin, asyncWrapper(adminController.updateStatus))
router.post('/users/:userId/reset-password', authenticate, requireSuperAdmin, asyncWrapper(adminController.resetPassword))
router.post('/users/invite', authenticate, requireAdmin, asyncWrapper(adminController.inviteUser))

// TAB 2: Attendance & Compliance
router.get('/attendance', authenticate, requireAdmin, asyncWrapper(adminController.getAttendance))

// TAB 3: Cloud Recordings & Storage Vault
router.get('/recordings', authenticate, requireAdmin, asyncWrapper(adminController.getRecordings))
router.patch('/storage/retention', authenticate, requireAdmin, asyncWrapper(adminController.updateRetention))
router.delete('/recordings/:meetingId', authenticate, requireAdmin, asyncWrapper(adminController.deleteRecordingItem))

// SUPER ADMIN MASTER PLATFORM CENTER (MULTI-TENANT & TELEMETRY)
router.get('/tenants', authenticate, requireSuperAdmin, asyncWrapper(adminController.getTenantsList))
router.patch('/tenants/:orgId/status', authenticate, requireSuperAdmin, asyncWrapper(adminController.updateTenantStatusAction))
router.patch('/tenants/:orgId/quota', authenticate, requireSuperAdmin, asyncWrapper(adminController.updateTenantQuotaAction))
router.get('/telemetry', authenticate, requireSuperAdmin, asyncWrapper(adminController.getTelemetryAction))
router.get('/broadcast/active', asyncWrapper(adminController.getActiveBroadcastNoticeAction))
router.post('/broadcast', authenticate, requireSuperAdmin, asyncWrapper(adminController.broadcastNoticeAction))

// DYNAMIC SAAS PLAN TIER MANAGEMENT (SUPER ADMIN)
router.get('/plans', authenticate, requireSuperAdmin, asyncWrapper(planController.getAllPlans))
router.post('/plans', authenticate, requireSuperAdmin, asyncWrapper(planController.createPlan))
router.patch('/plans/:planId', authenticate, requireSuperAdmin, asyncWrapper(planController.updatePlan))
router.delete('/plans/:planId', authenticate, requireSuperAdmin, asyncWrapper(planController.deletePlan))

export default router


