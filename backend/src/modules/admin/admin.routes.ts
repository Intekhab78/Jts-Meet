import { Router } from 'express'
import { adminController } from './admin.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin } from '../../middleware/adminMiddleware'

const router = Router()

router.get('/stats', authenticate, requireAdmin, asyncWrapper(adminController.getStats))
router.get('/meetings', authenticate, requireAdmin, asyncWrapper(adminController.getMeetingsList))
router.get('/logs', authenticate, requireAdmin, asyncWrapper(adminController.getLogsList))

export default router

