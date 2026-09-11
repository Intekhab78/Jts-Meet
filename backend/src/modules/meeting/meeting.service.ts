import { Types } from 'mongoose'
import { Meeting, IMeeting } from './meeting.model'
import { Organization } from '../organization/organization.model'
import { Team } from '../team/team.model'
import { User } from '../../models/user.model'
import { sendMeetingInvitationEmail } from '../../services/email.service'
import { NotificationService } from '../notification/notification.service'
import { FRONTEND_URL } from '../../config'

export interface CreateMeetingOptions {
    title: string
    isRecurring?: boolean
    recurrencePattern?: 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'none'
    scheduledDate?: string
    scheduledTime?: string
    organizationId?: string
    teamId?: string
    notifyByEmail?: boolean
}

export async function createMeeting(hostId: string, options: string | CreateMeetingOptions): Promise<IMeeting> {
    const opts: CreateMeetingOptions = typeof options === 'string' ? { title: options } : options
    const meetingId = `meet_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const hostObjectId = new Types.ObjectId(hostId)
    const participantsSet = new Set<string>([hostId])

    // If teamId provided, add all team members to participants
    if (opts.teamId && Types.ObjectId.isValid(opts.teamId)) {
        const team = await Team.findById(opts.teamId).select('members').exec()
        if (team && team.members) {
            team.members.forEach(m => participantsSet.add(m.userId.toString()))
        }
    }

    // If organizationId provided and no specific team, add all org members
    if (opts.organizationId && Types.ObjectId.isValid(opts.organizationId)) {
        const org = await Organization.findById(opts.organizationId).select('members').exec()
        if (org && org.members) {
            org.members.forEach(m => participantsSet.add(m.userId.toString()))
        }
    }

    const participantsList = Array.from(participantsSet).map(id => new Types.ObjectId(id))

    const meeting = new Meeting({
        title: opts.title.trim(),
        meetingId,
        host: hostObjectId,
        coHosts: [],
        participants: participantsList,
        waitingRoom: [],
        mutedUsers: [],
        blockedUsers: [],
        isWaitingRoomEnabled: false,
        screenShareBy: null,
        isRecordingActive: false,
        recordingUrl: '',
        status: 'scheduled',
        isRecurring: opts.isRecurring || false,
        recurrencePattern: opts.recurrencePattern || (opts.isRecurring ? 'daily' : 'none'),
        scheduledDate: opts.scheduledDate || '',
        scheduledTime: opts.scheduledTime || '',
        organizationId: opts.organizationId && Types.ObjectId.isValid(opts.organizationId) ? new Types.ObjectId(opts.organizationId) : null,
        teamId: opts.teamId && Types.ObjectId.isValid(opts.teamId) ? new Types.ObjectId(opts.teamId) : null,
        notifyByEmail: opts.notifyByEmail !== false,
        startedAt: null,
        endedAt: null
    })

    const savedMeeting = await meeting.save()

    // Send invite emails to all team members / participants if not opted out
    if (opts.notifyByEmail !== false && participantsList.length > 1) {
        try {
            const hostUser = await User.findById(hostObjectId).select('fullName').exec()
            const hostName = hostUser?.fullName || 'Meeting Host'
            const otherUserIds = participantsList.filter(p => !p.equals(hostObjectId))
            const usersToNotify = await User.find({ _id: { $in: otherUserIds } }).select('email fullName').exec()
            const inviteUrl = `${FRONTEND_URL || 'http://localhost:3000'}/meet/${meetingId}`

            let teamName: string | undefined
            if (opts.teamId && Types.ObjectId.isValid(opts.teamId)) {
                const teamObj = await Team.findById(opts.teamId).select('name').exec()
                if (teamObj) teamName = teamObj.name
            }

            for (const u of usersToNotify) {
                // In-app Notification
                NotificationService.send({
                    recipientId: u._id.toString(),
                    title: 'New Meeting Scheduled',
                    body: `${hostName} invited you to join "${opts.title.trim()}"${teamName ? ` (${teamName})` : ''}`,
                    type: 'meeting_invite',
                    metadata: { meetingId, hostName, title: opts.title.trim(), teamName }
                }).catch(err => console.error(`Failed in-app notification to ${u._id}:`, err))

                // Email Notification
                if (u.email) {
                    sendMeetingInvitationEmail(u.email, meetingId, opts.title.trim(), hostName, inviteUrl, {
                        scheduledDate: opts.scheduledDate,
                        scheduledTime: opts.scheduledTime,
                        teamName
                    }).catch(err => {
                        console.error(`Failed to send meeting invite email to ${u.email}:`, err)
                    })
                }
            }
        } catch (e) {
            console.error('Error sending immediate meeting invitation emails:', e)
        }
    }

    return savedMeeting
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
    const userObjectId = new Types.ObjectId(userId)
    return Meeting.find({
        $or: [
            { host: userObjectId },
            { participants: userObjectId },
            { coHosts: userObjectId }
        ]
    })
    .populate('host', 'fullName email avatar')
    .populate('participants', 'fullName email avatar status')
    .populate('coHosts', 'fullName email avatar')
    .sort({ updatedAt: -1, createdAt: -1 })
    .exec()
}

export async function deleteMeeting(meetingId: string, userId: string): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId)
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return false

    if (meeting.host.equals(userObjectId)) {
        await Meeting.deleteOne({ meetingId }).exec()
        return true
    } else {
        meeting.participants = meeting.participants.filter(p => !p.equals(userObjectId))
        await meeting.save()
        return true
    }
}

export async function updateMeeting(meetingId: string, userId: string, updateData: any): Promise<IMeeting | null> {
    const userObjectId = new Types.ObjectId(userId)
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const isAuthorized = meeting.host.equals(userObjectId) || meeting.coHosts.some((id) => id.equals(userObjectId))
    if (!isAuthorized) {
        throw new Error('Only the host or co-hosts can edit the scheduled conference')
    }

    if (updateData.title) meeting.title = updateData.title.trim()
    if (updateData.scheduledDate !== undefined) meeting.scheduledDate = updateData.scheduledDate
    if (updateData.scheduledTime !== undefined) meeting.scheduledTime = updateData.scheduledTime
    if (updateData.isRecurring !== undefined) meeting.isRecurring = updateData.isRecurring
    if (updateData.recurrencePattern !== undefined) meeting.recurrencePattern = updateData.recurrencePattern
    if (updateData.isWaitingRoomEnabled !== undefined) meeting.isWaitingRoomEnabled = updateData.isWaitingRoomEnabled
    if (updateData.notifyByEmail !== undefined) meeting.notifyByEmail = updateData.notifyByEmail
    if (updateData.teamId !== undefined) {
        meeting.teamId = updateData.teamId && Types.ObjectId.isValid(updateData.teamId) ? new Types.ObjectId(updateData.teamId) : null
    }

    return meeting.save()
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

export async function toggleGuestJoin(meetingId: string, hostId: string, enabled: boolean): Promise<IMeeting | null> {
    const meeting = await Meeting.findOne({ meetingId }).exec()
    if (!meeting) return null

    const hostObjectId = new Types.ObjectId(hostId)
    const isAuthorized = meeting.host.equals(hostObjectId) || meeting.coHosts.some((id) => id.equals(hostObjectId))
    if (!isAuthorized) {
        throw new Error('Unauthorized host control request')
    }

    meeting.isGuestJoinEnabled = enabled
    return meeting.save()
}
