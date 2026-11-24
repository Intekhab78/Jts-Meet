import { Router } from 'express'
import { notificationController } from './notification.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate, optionalAuthenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', authenticate, asyncWrapper(notificationController.list))
router.post('/read-all', authenticate, asyncWrapper(notificationController.markAllRead))
router.post('/:id/read', authenticate, asyncWrapper(notificationController.markRead))

// Web Push endpoints
router.get('/vapid-public-key', authenticate, asyncWrapper(notificationController.getVapidPublicKey))
router.post('/push-subscribe', authenticate, asyncWrapper(notificationController.subscribePush))
router.post('/push-unsubscribe', authenticate, asyncWrapper(notificationController.unsubscribePush))
router.post('/fcm-token', authenticate, asyncWrapper(notificationController.registerFcmToken))
router.delete('/fcm-token', authenticate, asyncWrapper(notificationController.unregisterFcmToken))
router.post('/fcm-token/unregister', authenticate, asyncWrapper(notificationController.unregisterFcmToken))
router.post('/call-initiate', authenticate, asyncWrapper(notificationController.initiateCall))
router.post('/call-accept', authenticate, asyncWrapper(notificationController.acceptCall))
router.post('/call-cancel', authenticate, asyncWrapper(notificationController.cancelCall))
router.post('/call-reject', optionalAuthenticate, asyncWrapper(notificationController.rejectCallFromPush))

export default router


