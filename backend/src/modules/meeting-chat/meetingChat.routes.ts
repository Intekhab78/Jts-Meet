import { Router } from 'express'
import { meetingChatController } from './meetingChat.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/history', authenticate, asyncWrapper(meetingChatController.getHistory))
router.post('/send', authenticate, asyncWrapper(meetingChatController.sendMessage))
router.delete('/message/:messageId', authenticate, asyncWrapper(meetingChatController.deleteMessage))

export default router
