import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { meetingController } from './meeting.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const recordingsDir = path.join(process.cwd(), 'uploads', 'recordings')
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true })
}

const recordingStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, recordingsDir)
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.webm'
        const uniqueName = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
        cb(null, uniqueName)
    }
})

const uploadRecording = multer({
    storage: recordingStorage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
})

const router = Router()

router.post('/create', authenticate, asyncWrapper(meetingController.createMeeting))
router.get('/mine', authenticate, asyncWrapper(meetingController.getMyMeetings))
router.get('/:meetingId', authenticate, asyncWrapper(meetingController.getMeeting))
router.post('/:meetingId/recording', authenticate, uploadRecording.single('recording'), asyncWrapper(meetingController.uploadRecording))
router.post('/:meetingId/dispatch-summary-email', authenticate, asyncWrapper(meetingController.dispatchSummaryEmail))
router.post('/join', authenticate, asyncWrapper(meetingController.joinMeeting))
router.post('/leave', authenticate, asyncWrapper(meetingController.leaveMeeting))
router.post('/end', authenticate, asyncWrapper(meetingController.endMeeting))
router.delete('/:meetingId', authenticate, asyncWrapper(meetingController.deleteMeeting))
router.put('/:meetingId', authenticate, asyncWrapper(meetingController.updateMeeting))
router.post('/:meetingId/start-notify', authenticate, asyncWrapper(meetingController.startAndNotifyTeam))

router.post('/waiting-room/approve', authenticate, asyncWrapper(meetingController.approveWaiting))
router.post('/waiting-room/toggle', authenticate, asyncWrapper(meetingController.toggleWaiting))
router.post('/guest-join/toggle', authenticate, asyncWrapper(meetingController.toggleGuestJoin))
router.post('/invite-email', authenticate, asyncWrapper(meetingController.sendEmailInvite))
router.post('/cohost/promote', authenticate, asyncWrapper(meetingController.promoteCoHost))
router.post('/cohost/demote', authenticate, asyncWrapper(meetingController.demoteCoHost))
router.post('/mute', authenticate, asyncWrapper(meetingController.muteUser))
router.post('/unmute', authenticate, asyncWrapper(meetingController.unmuteUser))
router.post('/block', authenticate, asyncWrapper(meetingController.blockUser))

export default router
