import { Router } from 'express'
import { chatController } from './chat.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.post('/send', authenticate, asyncWrapper(chatController.sendMessage))
router.get('/conversation', authenticate, asyncWrapper(chatController.getConversation))
router.get('/recent', authenticate, asyncWrapper(chatController.getRecentChats))
router.post('/seen', authenticate, asyncWrapper(chatController.markSeen))

export default router
