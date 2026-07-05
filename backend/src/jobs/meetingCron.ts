import cron from 'node-cron'
import { Meeting } from '../modules/meeting/meeting.model'
import { NotificationService } from '../modules/notification/notification.service'

export function initializeCronJobs() {
    // Runs every day at 09:00 AM (0 9 * * *)
    cron.schedule('0 9 * * *', async () => {
        try {
            // eslint-disable-next-line no-console
            console.log('Running daily 9 AM meeting notification cron job...')
            
            // Find all active/scheduled meetings
            const activeMeetings = await Meeting.find({ status: 'scheduled' }).exec()

            for (const meeting of activeMeetings) {
                if (meeting.participants && meeting.participants.length > 0) {
                    for (const participantId of meeting.participants) {
                        await NotificationService.send({
                            recipientId: participantId.toString(),
                            type: 'meeting_invite',
                            title: `Upcoming Daily Meeting: ${meeting.title}`,
                            body: `It is 9:00 AM. Please click here to join your scheduled team meeting.`,
                            metadata: {
                                meetingId: meeting.meetingId,
                                link: `/meet/${meeting.meetingId}`
                            }
                        })
                    }
                }
            }
            // eslint-disable-next-line no-console
            console.log(`Daily meeting cron finished. Processed ${activeMeetings.length} meetings.`)
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error running daily meeting cron job:', error)
        }
    })
}
