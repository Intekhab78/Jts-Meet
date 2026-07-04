import { Router } from 'express'
import { channelController } from './channel.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import {
    requireTeamMember,
    requireChannelAccess,
    requireChannelMember,
    requireChannelOwnerOrModerator
} from './channel.permission'
import channelChatRoutes from '../channel-chat/channelChat.routes'

const router = Router()

router.post('/', authenticate, asyncWrapper(requireTeamMember), asyncWrapper(channelController.createChannel))
router.get('/:channelId', authenticate, asyncWrapper(requireChannelAccess), asyncWrapper(channelController.getChannel))
router.get('/team/:teamId', authenticate, asyncWrapper(requireTeamMember), asyncWrapper(channelController.listTeamChannels))
router.patch('/:channelId', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.updateChannel))
router.post('/:channelId/archive', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.archiveChannel))
router.post('/:channelId/restore', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.restoreChannel))
router.delete('/:channelId', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.deleteChannel))
router.post('/join', authenticate, asyncWrapper(channelController.joinChannel))
router.post('/leave', authenticate, asyncWrapper(requireChannelMember), asyncWrapper(channelController.leaveChannel))
router.post('/invite', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.inviteMember))
router.post('/remove', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.removeMember))
router.patch('/member-role', authenticate, asyncWrapper(requireChannelOwnerOrModerator), asyncWrapper(channelController.updateMemberRole))
router.get('/:channelId/members', authenticate, asyncWrapper(requireChannelAccess), asyncWrapper(channelController.getMembers))
router.use('/:channelId/chat', channelChatRoutes)

export default router
