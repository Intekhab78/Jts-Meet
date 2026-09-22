import { Router } from 'express'
import { calendarController } from './calendar.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'

const router = Router()

// Public .ics endpoints so Google Calendar, Outlook, and Apple Calendar can subscribe
router.get('/feed/:userId.ics', asyncWrapper(calendarController.getUserCalendarFeed))
router.get('/meeting/:meetingId.ics', asyncWrapper(calendarController.getMeetingIcs))
router.get('/sync-links/:meetingId', asyncWrapper(calendarController.getSyncLinks))

export default router
