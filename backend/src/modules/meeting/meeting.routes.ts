import { Router } from 'express'
import { meetingController } from './meeting.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.post('/create', authenticate, asyncWrapper(meetingController.createMeeting))
router.get('/mine', authenticate, asyncWrapper(meetingController.getMyMeetings))
router.get('/:meetingId', authenticate, asyncWrapper(meetingController.getMeeting))
router.post('/join', authenticate, asyncWrapper(meetingController.joinMeeting))
router.post('/leave', authenticate, asyncWrapper(meetingController.leaveMeeting))
router.post('/end', authenticate, asyncWrapper(meetingController.endMeeting))

router.post('/waiting-room/approve', authenticate, asyncWrapper(meetingController.approveWaiting))
router.post('/waiting-room/toggle', authenticate, asyncWrapper(meetingController.toggleWaiting))
router.post('/cohost/promote', authenticate, asyncWrapper(meetingController.promoteCoHost))
router.post('/cohost/demote', authenticate, asyncWrapper(meetingController.demoteCoHost))
router.post('/mute', authenticate, asyncWrapper(meetingController.muteUser))
router.post('/unmute', authenticate, asyncWrapper(meetingController.unmuteUser))
router.post('/block', authenticate, asyncWrapper(meetingController.blockUser))

export default router
