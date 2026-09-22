import { getMeetingByMeetingId } from '../meeting/meeting.service'

export async function authorizeMeetingJoin(
    userId: string, 
    meetingId: string, 
    isGuest?: boolean, 
    guestMeetingId?: string, 
    isPending?: boolean
): Promise<boolean> {
    const baseMeetingId = meetingId.includes('__sub_') ? meetingId.split('__sub_')[0] : meetingId

    if (isGuest) {
        if (baseMeetingId.startsWith('room-')) {
            return true
        }
        return !isPending && (guestMeetingId === meetingId || guestMeetingId === baseMeetingId)
    }

    const meeting = await getMeetingByMeetingId(baseMeetingId)
    if (!meeting) {
        // If meeting doc does not exist yet (e.g. ad-hoc instant meeting), allow join
        return true
    }

    // 1. Host is always authorized
    const hostId = meeting.host?._id ? meeting.host._id.toString() : meeting.host?.toString()
    if (hostId === userId) {
        return true
    }

    // 2. Co-hosts are always authorized
    const isCoHost = meeting.coHosts?.some((ch: any) => {
        const chId = ch?._id ? ch._id.toString() : ch?.toString()
        return chId === userId
    })
    if (isCoHost) {
        return true
    }

    // 3. Current active participants are authorized
    const isParticipant = meeting.participants?.some((participant: any) => {
        const participantId = participant?._id ? participant._id.toString() : participant?.toString()
        return participantId === userId
    })
    if (isParticipant) {
        return true
    }

    // 4. For instant / ad-hoc meetings (or if waiting room is disabled), allow logged-in user with link to join directly
    if (!meeting.isWaitingRoomEnabled || baseMeetingId.startsWith('room-')) {
        return true
    }

    return false
}
