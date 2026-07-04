import { getMeetingByMeetingId } from '../meeting/meeting.service'

export async function authorizeMeetingJoin(userId: string, meetingId: string): Promise<boolean> {
    const meeting = await getMeetingByMeetingId(meetingId)
    if (!meeting) {
        return false
    }

    return meeting.participants.some((participant: any) => {
        const participantId = participant._id ? participant._id.toString() : participant.toString()
        return participantId === userId
    })
}
