import { Router } from 'express'
import { notificationController } from './notification.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', authenticate, asyncWrapper(notificationController.list))
router.post('/read-all', authenticate, asyncWrapper(notificationController.markAllRead))
router.post('/:id/read', authenticate, asyncWrapper(notificationController.markRead))

export default router
