import cron from 'node-cron'
import { Meeting } from '../modules/meeting/meeting.model'
import { NotificationService } from '../modules/notification/notification.service'
import { User } from '../models/user.model'
import { sendMeetingInvitationEmail } from '../services/email.service'
import { FRONTEND_URL } from '../config'

async function processMeetingReminders() {
    try {
        const now = new Date()
        const currentHours = String(now.getHours()).padStart(2, '0')
        const currentMinutes = String(now.getMinutes()).padStart(2, '0')
        const currentTimeStr = `${currentHours}:${currentMinutes}`
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const currentDateStr = `${year}-${month}-${day}`

        // Find scheduled meetings (excluding 1-on-1 direct calls)
        const scheduledMeetings = await Meeting.find({
            status: 'scheduled',
            title: { $not: /^Direct Call:/i }
        })
            .populate('host', 'fullName email')
            .exec()

        for (const meeting of scheduledMeetings) {
            // 1. Time check: Must have a valid scheduledTime
            if (!meeting.scheduledTime) continue

            const isTimeMatch = meeting.scheduledTime === currentTimeStr

            // 2. Date check:
            // Recurring meetings match any day; non-recurring meetings must match scheduledDate for today
            const isDateMatch = meeting.isRecurring ? true : (!meeting.scheduledDate || meeting.scheduledDate === currentDateStr)

            if (!isTimeMatch || !isDateMatch) {
                continue
            }

            // 3. Atomically claim notification for today to eliminate race conditions and duplicates
            const claimed = await Meeting.findOneAndUpdate(
                {
                    _id: meeting._id,
                    $or: [
                        { lastNotifiedDate: { $ne: currentDateStr } },
                        { lastNotifiedDate: { $exists: false } }
                    ]
                },
                {
                    $set: {
                        lastNotifiedDate: currentDateStr,
                        lastNotifiedAt: now
                    }
                }
            ).exec()

            if (!claimed) {
                continue
            }

            console.log(`[CRON] Dispatching Scheduled Meeting reminders for "${meeting.title}" (ID: ${meeting.meetingId}) at ${currentTimeStr}`)

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
                        body: `It is ${meeting.scheduledTime}. Please click here to join your scheduled conference.`,
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
    // Minute-level checker for scheduled meetings matching current local time (including 11:00 AM)
    cron.schedule('* * * * *', async () => {
        await processMeetingReminders()
    })

    console.log('[CRON] Meeting reminder scheduler initialized (running minute-level checks).')
}
