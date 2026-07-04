import { Types } from 'mongoose'
import { Meeting, IMeeting } from './meeting.model'

export async function createMeeting(hostId: string, title: string): Promise<IMeeting> {
    const meetingId = `meet_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const meeting = new Meeting({
        title: title.trim(),
        meetingId,
        host: new Types.ObjectId(hostId),
        coHosts: [],
        participants: [new Types.ObjectId(hostId)],
        waitingRoom: [],
        mutedUsers: [],
        blockedUsers: [],
        isWaitingRoomEnabled: false,
        screenShareBy: null,
        isRecordingActive: false,
        recordingUrl: '',
        status: 'scheduled',
        startedAt: null,
        endedAt: null
    })

    return meeting.save()
}

export async function getMeetingByMeetingId(meetingId: string): Promise<IMeeting | null> {
    return Meeting.findOne({ meetingId })
        .populate('host', 'fullName email')
        .populate('coHosts', 'fullName email')
        .populate('participants', 'fullName email')
        .populate('waitingRoom', 'fullName email')
        .populate('mutedUsers', 'fullName email')
        .exec()
}

export async function joinMeeting(meetingId: string, userId: string): Promise<IMeeting | null> {
    let meeting = await Meeting.findOne({ meetingId }).exec()
    const userObjectId = new Types.ObjectId(userId)

    if (!meeting) {
        meeting = new Meeting({
            title: `Instant Meeting (${meetingId})`,
            meetingId,
            host: userObjectId,
            coHosts: [],
            participants: [userObjectId],
            waitingRoom: [],
            mutedUsers: [],
            blockedUsers: [],
            isWaitingRoomEnabled: false,
            status: 'active',
            startedAt: new Date(),
            endedAt: null
        })
        return meeting.save()
    }
    
    // Check if user is banned/blocked
    const isBlocked = meeting.blockedUsers.some((id) => id.equals(userObjectId))
    if (isBlocked) {
        throw new Error('You have been blocked from joining this meeting')
    }

    // Handle waiting room
    if (meeting.isWaitingRoomEnabled && !meeting.host.equals(userObjectId) && !meeting.coHosts.some((id) => id.equals(userObjectId))) {
        const isWaiting = meeting.waitingRoom.some((id) => id.equals(userObjectId))
        const isParticipant = meeting.participants.some((id) => id.equals(userObjectId))
        if (!isWaiting && !isParticipant) {
            meeting.waitingRoom.push(userObjectId)
        }
    } else {
        const isParticipant = meeting.participants.some((id) => id.equals(userObjectId))
        if (!isParticipant) {
            meeting.participants.push(userObjectId)
        }
    }

    if (meeting.status === 'scheduled') {
        meeting.status = 'active'
        meeting.startedAt = new Date()
    }

    return meeting.save()
}

export async function leaveMeeting(meetingId: string, userId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) {
        return null
    }

    const userObjectId = new Types.ObjectId(userId)
    meeting.participants = meeting.participants.filter((participant) => !participant.equals(userObjectId))
    meeting.waitingRoom = meeting.waitingRoom.filter((participant) => !participant.equals(userObjectId))
    return meeting.save()
}

export async function endMeeting(meetingId: string, userId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) {
        return null
    }

    const userObjectId = new Types.ObjectId(userId)
    const isAuthorized = meeting.host.equals(userObjectId) || meeting.coHosts.some((id) => id.equals(userObjectId))
    if (!isAuthorized) {
        throw new Error('Only the host or co-hosts can end the meeting')
    }

    meeting.status = 'ended'
    meeting.endedAt = new Date()
    return meeting.save()
}

export async function getMyMeetings(userId: string): Promise<IMeeting[]> {
    return Meeting.find({ participants: new Types.ObjectId(userId) }).populate('host', 'fullName email').sort({ updatedAt: -1 }).exec()
}

// Host controls implementation
export async function approveWaitingUser(meetingId: string, hostId: string, targetUserId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const hostObjectId = new Types.ObjectId(hostId)
    const isAuthorized = meeting.host.equals(hostObjectId) || meeting.coHosts.some((id) => id.equals(hostObjectId))
    if (!isAuthorized) {
        throw new Error('Unauthorized host control request')
    }

    const targetObjectId = new Types.ObjectId(targetUserId)
    meeting.waitingRoom = meeting.waitingRoom.filter((id) => !id.equals(targetObjectId))
    const isParticipant = meeting.participants.some((id) => id.equals(targetObjectId))
    if (!isParticipant) {
        meeting.participants.push(targetObjectId)
    }

    return meeting.save()
}

export async function promoteCoHost(meetingId: string, hostId: string, targetUserId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    if (!meeting.host.equals(new Types.ObjectId(hostId))) {
        throw new Error('Only the host can promote co-hosts')
    }

    const targetObjectId = new Types.ObjectId(targetUserId)
    const isCoHost = meeting.coHosts.some((id) => id.equals(targetObjectId))
    if (!isCoHost) {
        meeting.coHosts.push(targetObjectId)
    }

    return meeting.save()
}

export async function demoteCoHost(meetingId: string, hostId: string, targetUserId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    if (!meeting.host.equals(new Types.ObjectId(hostId))) {
        throw new Error('Only the host can demote co-hosts')
    }

    const targetObjectId = new Types.ObjectId(targetUserId)
    meeting.coHosts = meeting.coHosts.filter((id) => !id.equals(targetObjectId))
    return meeting.save()
}

export async function muteUser(meetingId: string, requesterId: string, targetUserId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const reqObjectId = new Types.ObjectId(requesterId)
    const isAuthorized = meeting.host.equals(reqObjectId) || meeting.coHosts.some((id) => id.equals(reqObjectId))
    if (!isAuthorized) {
        throw new Error('Unauthorized host control request')
    }

    const targetObjectId = new Types.ObjectId(targetUserId)
    const isMuted = meeting.mutedUsers.some((id) => id.equals(targetObjectId))
    if (!isMuted) {
        meeting.mutedUsers.push(targetObjectId)
    }

    return meeting.save()
}

export async function unmuteUser(meetingId: string, requesterId: string, targetUserId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const reqObjectId = new Types.ObjectId(requesterId)
    const isAuthorized = meeting.host.equals(reqObjectId) || meeting.coHosts.some((id) => id.equals(reqObjectId))
    if (!isAuthorized) {
        throw new Error('Unauthorized host control request')
    }

    const targetObjectId = new Types.ObjectId(targetUserId)
    meeting.mutedUsers = meeting.mutedUsers.filter((id) => !id.equals(targetObjectId))
    return meeting.save()
}

export async function blockUser(meetingId: string, requesterId: string, targetUserId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const reqObjectId = new Types.ObjectId(requesterId)
    const isAuthorized = meeting.host.equals(reqObjectId) || meeting.coHosts.some((id) => id.equals(reqObjectId))
    if (!isAuthorized) {
        throw new Error('Unauthorized host control request')
    }

    const targetObjectId = new Types.ObjectId(targetUserId)
    meeting.participants = meeting.participants.filter((id) => !id.equals(targetObjectId))
    meeting.coHosts = meeting.coHosts.filter((id) => !id.equals(targetObjectId))
    
    const isBlocked = meeting.blockedUsers.some((id) => id.equals(targetObjectId))
    if (!isBlocked) {
        meeting.blockedUsers.push(targetObjectId)
    }

    return meeting.save()
}

export async function toggleWaitingRoom(meetingId: string, hostId: string, enabled: boolean): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const hostObjectId = new Types.ObjectId(hostId)
    const isAuthorized = meeting.host.equals(hostObjectId) || meeting.coHosts.some((id) => id.equals(hostObjectId))
    if (!isAuthorized) {
        throw new Error('Unauthorized host control request')
    }

    meeting.isWaitingRoomEnabled = enabled
    return meeting.save()
}
