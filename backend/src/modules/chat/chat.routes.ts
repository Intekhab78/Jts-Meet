import { Router } from 'express'
import { chatController } from './chat.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.post('/send', authenticate, asyncWrapper(chatController.sendMessage))
router.get('/conversation', authenticate, asyncWrapper(chatController.getConversation))
router.get('/recent', authenticate, asyncWrapper(chatController.getRecentChats))
router.post('/seen', authenticate, asyncWrapper(chatController.markSeen))
router.get('/thread/:parentMessageId', authenticate, asyncWrapper(chatController.getThreadReplies))
router.post('/thread/reply', authenticate, asyncWrapper(chatController.createReply))
router.get('/thread/:parentMessageId/count', authenticate, asyncWrapper(chatController.getThreadCount))
router.post('/message/:messageId/react', authenticate, asyncWrapper(chatController.addReaction))
router.delete('/message/:messageId/react', authenticate, asyncWrapper(chatController.removeReaction))

export default router
