import { Meeting } from '../meeting/meeting.model'

export class CalendarService {
    /**
     * Formats an ISO Date or Date object into iCalendar UTC format: YYYYMMDDTHHMMSSZ
     */
    private formatIcsDate(date: Date): string {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    /**
     * Compute event start and end Date objects from meeting scheduledDate and scheduledTime
     */
    private getMeetingDates(meeting: any): { startDate: Date; endDate: Date } {
        let startDate = new Date()
        if (meeting.scheduledDate) {
            const dateStr = meeting.scheduledDate
            const timeStr = meeting.scheduledTime || '10:00'
            const parsed = new Date(`${dateStr}T${timeStr}:00`)
            if (!isNaN(parsed.getTime())) {
                startDate = parsed
            }
        }

        const durationMinutes = meeting.duration || 45
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
        return { startDate, endDate }
    }

    /**
     * Generate standard RFC 5545 .ics text for a single meeting
     */
    public async generateSingleMeetingIcs(meetingId: string, baseUrl: string): Promise<string | null> {
        const meeting = await Meeting.findOne({
            $or: [{ _id: meetingId }, { meetingId: meetingId }, { customId: meetingId }]
        }).populate('host', 'fullName email')

        if (!meeting) return null

        const { startDate, endDate } = this.getMeetingDates(meeting)
        const meetUrl = `${baseUrl}/meeting/${meeting.customId || meeting.meetingId}`
        const hostName = (meeting.host as any)?.fullName || 'Host'

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JTS Meet//Calendar Synchronization Engine//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:jts-meet-${meeting.meetingId || meeting._id}@jtsmeet.com`,
            `DTSTAMP:${this.formatIcsDate(new Date())}`,
            `DTSTART:${this.formatIcsDate(startDate)}`,
            `DTEND:${this.formatIcsDate(endDate)}`,
            `SUMMARY:${meeting.title || 'JTS Meet Conference'}`,
            `DESCRIPTION:Join your JTS Meet secure conference call.\\n\\nMeeting Link: ${meetUrl}\\nMeeting ID: ${meeting.meetingId}\\nHost: ${hostName}\\n\\nPowered by JTS Meet Enterprise`,
            `URL:${meetUrl}`,
            `LOCATION:${meetUrl}`,
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'TRIGGER:-PT15M',
            'ACTION:DISPLAY',
            'DESCRIPTION:Upcoming JTS Meet Conference Reminder',
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR'
        ]

        return lines.join('\r\n')
    }

    /**
     * Generate an RFC 5545 Live Subscription Feed (.ics) containing all scheduled
     * and upcoming meetings for a user.
     * Google Calendar, Outlook, and Apple Calendar poll this URL to stay in 2-way sync.
     */
    public async generateUserCalendarFeed(userId: string, baseUrl: string): Promise<string> {
        const meetings = await Meeting.find({
            $or: [
                { host: userId },
                { 'participants.userId': userId },
                { participants: userId }
            ],
            status: { $in: ['scheduled', 'active'] }
        }).populate('host', 'fullName email').sort({ createdAt: -1 }).limit(100)

        const eventsIcs: string[] = []

        meetings.forEach((m) => {
            const { startDate, endDate } = this.getMeetingDates(m)
            const meetUrl = `${baseUrl}/meeting/${m.customId || m.meetingId}`
            const hostName = (m.host as any)?.fullName || 'Host'

            eventsIcs.push([
                'BEGIN:VEVENT',
                `UID:jts-meet-${m.meetingId || m._id}@jtsmeet.com`,
                `DTSTAMP:${this.formatIcsDate(new Date())}`,
                `DTSTART:${this.formatIcsDate(startDate)}`,
                `DTEND:${this.formatIcsDate(endDate)}`,
                `SUMMARY:${m.title || 'JTS Meet Conference'}`,
                `DESCRIPTION:Join JTS Meet Call: ${meetUrl}\\nMeeting ID: ${m.meetingId}\\nHost: ${hostName}`,
                `URL:${meetUrl}`,
                `LOCATION:${meetUrl}`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'TRIGGER:-PT10M',
                'ACTION:DISPLAY',
                'DESCRIPTION:Upcoming JTS Meet Reminder',
                'END:VALARM',
                'END:VEVENT'
            ].join('\r\n'))
        })

        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JTS Meet//User Live Conference Feed//EN',
            'CALSCALE:GREGORIAN',
            'X-WR-CALNAME:JTS Meet Scheduled Conferences',
            'X-WR-CALDESC:Live bi-directional conference calendar from JTS Meet',
            'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
            'X-PUBLISHED-TTL:PT15M',
            ...eventsIcs,
            'END:VCALENDAR'
        ].join('\r\n')
    }

    /**
     * Compute 1-click deeplink URLs for Google Calendar & Microsoft Outlook
     */
    public getSyncLinks(meeting: any, baseUrl: string) {
        const { startDate, endDate } = this.getMeetingDates(meeting)
        const meetUrl = `${baseUrl}/meeting/${meeting.customId || meeting.meetingId}`

        const startUtc = this.formatIcsDate(startDate)
        const endUtc = this.formatIcsDate(endDate)
        const title = encodeURIComponent(meeting.title || 'JTS Meet Conference')
        const details = encodeURIComponent(
            `Join your JTS Meet conference call.\n\nVideo Call Link: ${meetUrl}\nMeeting ID: ${meeting.meetingId}\n\nPowered by JTS Meet Enterprise.`
        )
        const location = encodeURIComponent(meetUrl)

        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`
        const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${details}&location=${location}`

        return {
            googleCalendarUrl: googleUrl,
            outlookCalendarUrl: outlookUrl,
            directIcsUrl: `${baseUrl}/api/calendar/meeting/${meeting.customId || meeting.meetingId}.ics`
        }
    }
}

export const calendarService = new CalendarService()
