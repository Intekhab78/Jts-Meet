import { Router } from 'express'
import { adminController } from './admin.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/stats', authenticate, asyncWrapper(adminController.getStats))
router.get('/meetings', authenticate, asyncWrapper(adminController.getMeetingsList))
router.get('/logs', authenticate, asyncWrapper(adminController.getLogsList))

export default router
