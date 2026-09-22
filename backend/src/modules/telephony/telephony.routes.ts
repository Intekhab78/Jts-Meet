import { Router } from 'express'
import { telephonyController } from './telephony.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'

const router = Router()

router.get('/:meetingId/dial-in-info', asyncWrapper(telephonyController.getDialInInfo))
router.post('/voice/incoming', asyncWrapper(telephonyController.handleIncomingCall))
router.post('/voice/verify', asyncWrapper(telephonyController.handleVerifyPin))

export default router
