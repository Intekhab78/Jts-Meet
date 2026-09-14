import { Router } from 'express'
import { ChannelChatController } from './channelChat.controller'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/pinned/all', ChannelChatController.getPinnedMessages)
router.get('/', ChannelChatController.getMessages)
router.get('/:messageId', ChannelChatController.getMessage)
router.post('/', ChannelChatController.createMessage)
router.put('/:messageId', ChannelChatController.editMessage)
router.delete('/:messageId', ChannelChatController.deleteMessage)
router.post('/:messageId/reaction', ChannelChatController.addReaction)
router.post('/:messageId/pin', ChannelChatController.togglePin)

export default router
