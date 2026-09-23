import { Router } from 'express'
import { notificationController } from './notification.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', authenticate, asyncWrapper(notificationController.list))
router.post('/read-all', authenticate, asyncWrapper(notificationController.markAllRead))
router.post('/:id/read', authenticate, asyncWrapper(notificationController.markRead))

// Web Push endpoints
router.get('/vapid-public-key', authenticate, asyncWrapper(notificationController.getVapidPublicKey))
router.post('/push-subscribe', authenticate, asyncWrapper(notificationController.subscribePush))
router.post('/push-unsubscribe', authenticate, asyncWrapper(notificationController.unsubscribePush))
router.post('/call-reject', asyncWrapper(notificationController.rejectCallFromPush))

export default router

