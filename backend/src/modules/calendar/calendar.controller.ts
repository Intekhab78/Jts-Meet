import { Request, Response } from 'express'
import { calendarService } from './calendar.service'
import { Meeting } from '../meeting/meeting.model'
import { FRONTEND_URL } from '../../config'

export class CalendarController {
    /**
     * Download .ics file for a single meeting
     */
    public async getMeetingIcs(req: Request, res: Response) {
        const meetingId = String(req.params.meetingId || '')
        const baseUrl = FRONTEND_URL || `${req.protocol}://${req.get('host')}`

        const icsContent = await calendarService.generateSingleMeetingIcs(meetingId, baseUrl)
        if (!icsContent) {
            return res.status(404).json({ success: false, message: 'Meeting not found' })
        }

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="jts-meet-${meetingId}.ics"`)
        return res.send(icsContent)
    }

    /**
     * Public / Authenticated Live 2-Way Subscription Feed
     * Google Calendar, Apple Calendar, and Outlook poll this to keep all scheduled meetings in sync.
     */
    public async getUserCalendarFeed(req: Request, res: Response) {
        const userId = String(req.params.userId || '')
        const baseUrl = FRONTEND_URL || `${req.protocol}://${req.get('host')}`

        const icsFeed = await calendarService.generateUserCalendarFeed(userId, baseUrl)
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.setHeader('Content-Disposition', `inline; filename="jts-calendar-feed-${userId}.ics"`)
        res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
        return res.send(icsFeed)
    }

    /**
     * Get 1-click sync URLs for Google Calendar and Microsoft Outlook
     */
    public async getSyncLinks(req: Request, res: Response) {
        const { meetingId } = req.params
        const baseUrl = FRONTEND_URL || `${req.protocol}://${req.get('host')}`

        const meeting = await Meeting.findOne({
            $or: [{ _id: meetingId }, { meetingId }, { customId: meetingId }]
        })

        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' })
        }

        const links = calendarService.getSyncLinks(meeting, baseUrl)
        return res.json({ success: true, data: links })
    }
}

export const calendarController = new CalendarController()
