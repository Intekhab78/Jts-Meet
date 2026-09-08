import cron from 'node-cron'
import { Meeting } from '../modules/meeting/meeting.model'
import { NotificationService } from '../modules/notification/notification.service'
import { User } from '../models/user.model'
import { sendMeetingInvitationEmail } from '../services/email.service'
import { FRONTEND_URL } from '../config'

async function processMeetingReminders(triggerSource: string) {
    try {
        const now = new Date()
        const currentHours = String(now.getHours()).padStart(2, '0')
        const currentMinutes = String(now.getMinutes()).padStart(2, '0')
        const currentTimeStr = `${currentHours}:${currentMinutes}`
        const currentDateStr = now.toISOString().slice(0, 10)

        // Find scheduled meetings that:
        // 1. Are recurring (e.g. daily at current time) OR
        // 2. Are specifically scheduled for today and this minute OR
        // 3. Triggered by the 11:00 AM daily cron
        const scheduledMeetings = await Meeting.find({ status: 'scheduled' })
            .populate('host', 'fullName email')
            .exec()

        for (const meeting of scheduledMeetings) {
            const is11AmDaily = triggerSource === 'daily-11am' || meeting.scheduledTime === '11:00'
            const isTimeMatch = meeting.scheduledTime === currentTimeStr || (meeting.isRecurring && is11AmDaily)
            const isDateMatch = !meeting.scheduledDate || meeting.scheduledDate === currentDateStr || meeting.isRecurring

            // Prevent notifying more than once per 30 minutes for the same meeting
            if (meeting.lastNotifiedAt) {
                const diffMinutes = (now.getTime() - new Date(meeting.lastNotifiedAt).getTime()) / 60000
                if (diffMinutes < 30) {
                    continue
                }
            }

            if ((isTimeMatch && isDateMatch) || (triggerSource === 'daily-11am' && meeting.isRecurring)) {
                console.log(`[CRON] Dispatching 11:00 AM / Scheduled Meeting reminders for "${meeting.title}" (ID: ${meeting.meetingId})`)

                const hostName = (meeting.host as any)?.fullName || 'Organizer'
                const inviteUrl = `${FRONTEND_URL || 'http://localhost:3000'}/meet/${meeting.meetingId}`

                if (meeting.participants && meeting.participants.length > 0) {
                    const participantUsers = await User.find({ _id: { $in: meeting.participants } }).select('email fullName').exec()

                    for (const user of participantUsers) {
                        // 1. In-App Notification
                        await NotificationService.send({
                            recipientId: user._id.toString(),
                            type: 'meeting_invite',
                            title: `🔔 Meeting Starting: ${meeting.title}`,
                            body: `It is ${meeting.scheduledTime || '11:00 AM'}. Please click here to join your scheduled conference.`,
                            metadata: {
                                meetingId: meeting.meetingId,
                                link: `/meet/${meeting.meetingId}`
                            }
                        }).catch(() => {})

                        // 2. Email Invitation with 1-click Join Button
                        if (meeting.notifyByEmail !== false && user.email) {
                            sendMeetingInvitationEmail(user.email, meeting.meetingId, meeting.title, hostName, inviteUrl).catch(err => {
                                console.error(`[CRON] Error emailing ${user.email}:`, err)
                            })
                        }
                    }
                }

                // Update lastNotifiedAt to prevent re-triggering
                await Meeting.updateOne({ _id: meeting._id }, { $set: { lastNotifiedAt: now } })
            }
        }
    } catch (error: any) {
        if (error?.name === 'MongoServerSelectionError' || error?.message?.includes('ENOTFOUND')) {
            console.warn('[CRON] Database temporarily unreachable (waiting for network reconnection)...')
        } else {
            console.error('[CRON] Error running meeting notification cron job:', error?.message || error)
        }
    }
}

export function initializeCronJobs() {
    // 1. Dedicated daily 11:00 AM cron (0 11 * * *)
    cron.schedule('0 11 * * *', async () => {
        console.log('[CRON] Running daily 11:00 AM conference notification cron...')
        await processMeetingReminders('daily-11am')
    })

    // 2. Minute-level checker for any scheduled meetings matching current HH:mm
    cron.schedule('* * * * *', async () => {
        await processMeetingReminders('minute-check')
    })

    console.log('[CRON] Meeting scheduler & daily 11:00 AM reminder cron jobs initialized.')
}
