import { Response } from 'express'
import { Types } from 'mongoose'
import { Meeting } from './meeting.model'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import {
    createMeeting,
    getMeetingByMeetingId,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    getMyMeetings,
    approveWaitingUser,
    promoteCoHost,
    demoteCoHost,
    muteUser,
    unmuteUser,
    blockUser,
    toggleWaitingRoom,
    toggleGuestJoin,
    deleteMeeting,
    updateMeeting
} from './meeting.service'
import { validateCreateMeeting, validateMeetingAction } from './meeting.validator'
import { AuthRequest } from '../../middleware/authMiddleware'
import { User } from '../../models/user.model'
import { NotificationService } from '../notification/notification.service'
import { sendMeetingInvitationEmail } from '../../services/email.service'
import { Team } from '../team/team.model'
import { FRONTEND_URL } from '../../config'
import { parseCursorQuery, executeCursorQuery } from '../../utils/paginationHelper'

export const meetingController = {
    createMeeting: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateCreateMeeting(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const meeting = await createMeeting(userId, {
            title: req.body.title,
            isRecurring: req.body.isRecurring,
            recurrencePattern: req.body.recurrencePattern,
            scheduledDate: req.body.scheduledDate,
            scheduledTime: req.body.scheduledTime,
            organizationId: req.body.organizationId,
            teamId: req.body.teamId,
            notifyByEmail: req.body.notifyByEmail
        })
        return sendSuccess(res, meeting, 'Meeting created')
    },

    getMeeting: async (req: AuthRequest, res: Response) => {
        const meetingId = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId
        const meeting = await getMeetingByMeetingId(meetingId)

        if (!meeting) {
            return sendError(res, 404, 'Meeting not found')
        }

        return sendSuccess(res, meeting, 'Meeting retrieved')
    },

    joinMeeting: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateMeetingAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const meeting = await joinMeeting(req.body.meetingId, userId)
        if (!meeting) {
            return sendError(res, 404, 'Meeting not found')
        }

        return sendSuccess(res, meeting, 'Joined meeting')
    },

    leaveMeeting: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateMeetingAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const meeting = await leaveMeeting(req.body.meetingId, userId)
        if (!meeting) {
            return sendError(res, 404, 'Meeting not found')
        }

        return sendSuccess(res, meeting, 'Left meeting')
    },

    endMeeting: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateMeetingAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await endMeeting(req.body.meetingId, userId)
            if (!meeting) {
                return sendError(res, 404, 'Meeting not found')
            }

            return sendSuccess(res, meeting, 'Meeting ended')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    getMyMeetings: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        if (req.query.cursor !== undefined || req.query.pageSize !== undefined || req.query.search !== undefined || req.query.status !== undefined) {
            const params = parseCursorQuery(req.query)
            const result = await executeCursorQuery(
                Meeting,
                { participants: new Types.ObjectId(userId) },
                params,
                ['title'],
                { status: req.query.status }
            )
            return res.status(200).json({
                success: true,
                data: result.data,
                nextCursor: result.nextCursor,
                hasMore: result.hasMore
            })
        }

        const meetings = await getMyMeetings(userId)
        return sendSuccess(res, meetings, 'Retrieved user meetings')
    },

    approveWaiting: async (req: AuthRequest, res: Response) => {
        const { meetingId, targetUserId } = req.body as { meetingId: string; targetUserId: string }
        if (!meetingId || !targetUserId) {
            return sendError(res, 400, 'Meeting ID and Target User ID are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await approveWaitingUser(meetingId, userId, targetUserId)
            return sendSuccess(res, meeting, 'Waiting user approved')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    toggleWaiting: async (req: AuthRequest, res: Response) => {
        const { meetingId, enabled } = req.body as { meetingId: string; enabled: boolean }
        if (!meetingId || enabled === undefined) {
            return sendError(res, 400, 'Meeting ID and enabled status are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await toggleWaitingRoom(meetingId, userId, enabled)
            return sendSuccess(res, meeting, 'Waiting room status updated')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    promoteCoHost: async (req: AuthRequest, res: Response) => {
        const { meetingId, targetUserId } = req.body as { meetingId: string; targetUserId: string }
        if (!meetingId || !targetUserId) {
            return sendError(res, 400, 'Meeting ID and Target User ID are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await promoteCoHost(meetingId, userId, targetUserId)
            return sendSuccess(res, meeting, 'Co-host promoted successfully')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    demoteCoHost: async (req: AuthRequest, res: Response) => {
        const { meetingId, targetUserId } = req.body as { meetingId: string; targetUserId: string }
        if (!meetingId || !targetUserId) {
            return sendError(res, 400, 'Meeting ID and Target User ID are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await demoteCoHost(meetingId, userId, targetUserId)
            return sendSuccess(res, meeting, 'Co-host demoted successfully')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    muteUser: async (req: AuthRequest, res: Response) => {
        const { meetingId, targetUserId } = req.body as { meetingId: string; targetUserId: string }
        if (!meetingId || !targetUserId) {
            return sendError(res, 400, 'Meeting ID and Target User ID are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await muteUser(meetingId, userId, targetUserId)
            return sendSuccess(res, meeting, 'User muted successfully')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    unmuteUser: async (req: AuthRequest, res: Response) => {
        const { meetingId, targetUserId } = req.body as { meetingId: string; targetUserId: string }
        if (!meetingId || !targetUserId) {
            return sendError(res, 400, 'Meeting ID and Target User ID are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await unmuteUser(meetingId, userId, targetUserId)
            return sendSuccess(res, meeting, 'User unmuted successfully')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    blockUser: async (req: AuthRequest, res: Response) => {
        const { meetingId, targetUserId } = req.body as { meetingId: string; targetUserId: string }
        if (!meetingId || !targetUserId) {
            return sendError(res, 400, 'Meeting ID and Target User ID are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await blockUser(meetingId, userId, targetUserId)
            return sendSuccess(res, meeting, 'User blocked and removed successfully')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    toggleGuestJoin: async (req: AuthRequest, res: Response) => {
        const { meetingId, enabled } = req.body as { meetingId: string; enabled: boolean }
        if (!meetingId || enabled === undefined) {
            return sendError(res, 400, 'Meeting ID and enabled status are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await toggleGuestJoin(meetingId, userId, enabled)
            return sendSuccess(res, meeting, 'Guest Join status updated')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    sendEmailInvite: async (req: AuthRequest, res: Response) => {
        const { meetingId, toEmail } = req.body as { meetingId: string; toEmail: string }
        if (!meetingId || !toEmail) {
            return sendError(res, 400, 'Meeting ID and Recipient Email are required')
        }

        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await getMeetingByMeetingId(meetingId)
            if (!meeting) {
                return sendError(res, 404, 'Meeting not found')
            }

            const hostUser = await User.findById(userId)
            const hostName = hostUser?.fullName || 'Organizer'
            const origin = req.headers.origin || FRONTEND_URL || 'http://localhost:3000'
            const fullInviteLink = `${origin}/meet/${meetingId}`

            const recipientUser = await User.findOne({ email: toEmail.toLowerCase().trim() })

            let teamName: string | undefined
            if (meeting.teamId) {
                const team = await Team.findById(meeting.teamId).select('name')
                if (team) teamName = team.name
            }

            if (recipientUser) {
                // Registered JTS Meet user: deliver both in-app notification and email
                await NotificationService.send({
                    recipientId: recipientUser._id.toString(),
                    title: 'Meeting Invitation',
                    body: `${hostName} has invited you to join the meeting "${meeting.title}"`,
                    type: 'meeting_invite',
                    metadata: { meetingId, hostName, title: meeting.title, teamName },
                    emailData: {
                        to: toEmail,
                        template: 'meeting_invite',
                        params: {
                            meetingId,
                            meetingTitle: meeting.title,
                            hostName,
                            inviteLink: fullInviteLink,
                            scheduledDate: meeting.scheduledDate,
                            scheduledTime: meeting.scheduledTime,
                            teamName
                        }
                    }
                })
            } else {
                // External guest recipient: send email invitation only (prevents sending in-app notification to host)
                await sendMeetingInvitationEmail(toEmail, meetingId, meeting.title, hostName, fullInviteLink, {
                    scheduledDate: meeting.scheduledDate,
                    scheduledTime: meeting.scheduledTime,
                    teamName
                })
            }

            return sendSuccess(res, null, 'Invitation email sent successfully')
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to send invitation')
        }
    },

    deleteMeeting: async (req: AuthRequest, res: Response) => {
        const meetingId = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        const success = await deleteMeeting(meetingId, userId)
        if (!success) {
            return sendError(res, 404, 'Meeting not found')
        }
        return sendSuccess(res, null, 'Meeting removed from history')
    },

    updateMeeting: async (req: AuthRequest, res: Response) => {
        const meetingId = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        try {
            const updated = await updateMeeting(meetingId, userId, req.body)
            if (!updated) {
                return sendError(res, 404, 'Meeting not found')
            }
            return sendSuccess(res, updated, 'Meeting schedule updated successfully')
        } catch (error: any) {
            return sendError(res, 400, error.message || 'Failed to update meeting')
        }
    },

    startAndNotifyTeam: async (req: AuthRequest, res: Response) => {
        const meetingId = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId
        const userId = req.userId
        if (!userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const meeting = await getMeetingByMeetingId(meetingId)
            if (!meeting) {
                return sendError(res, 404, 'Meeting not found')
            }

            // Mark meeting as active if not already
            if (meeting.status !== 'active') {
                meeting.status = 'active'
                meeting.startedAt = new Date()
                await meeting.save()
            }

            const hostUser = await User.findById(userId).select('fullName email').exec()
            const hostName = hostUser?.fullName || 'Organizer'
            const origin = req.headers.origin || FRONTEND_URL || 'http://localhost:3000'
            const inviteUrl = `${origin}/meet/${meetingId}`

            let teamName: string | undefined
            const participantsToNotify = new Set<string>()

            // 1. If linked to a team, notify all team members
            if (meeting.teamId) {
                const team = await Team.findById(meeting.teamId).select('name members').exec()
                if (team) {
                    teamName = team.name
                    team.members?.forEach(m => {
                        if (m.userId && m.userId.toString() !== userId) {
                            participantsToNotify.add(m.userId.toString())
                        }
                    })
                }
            }

            // 2. Also include any participants explicitly listed in meeting.participants
            if (meeting.participants && meeting.participants.length > 0) {
                meeting.participants.forEach(pId => {
                    const pStr = pId.toString()
                    if (pStr !== userId && Types.ObjectId.isValid(pStr)) {
                        participantsToNotify.add(pStr)
                    }
                })
            }

            const userIdsList = Array.from(participantsToNotify).filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id))
            let notifiedCount = 0

            if (userIdsList.length > 0) {
                const users = await User.find({ _id: { $in: userIdsList } }).select('email fullName').exec()

                for (const u of users) {
                    // Send In-App Real-time Notification
                    NotificationService.send({
                        recipientId: u._id.toString(),
                        title: `🔴 Meeting LIVE Now: ${meeting.title}`,
                        body: `${hostName} has started the conference. Click here to join immediately.`,
                        type: 'meeting_invite',
                        metadata: { meetingId, hostName, title: meeting.title, teamName, isLiveNow: true }
                    }).catch(() => {})

                    // Send Instant Live Email
                    if (meeting.notifyByEmail !== false && u.email) {
                        sendMeetingInvitationEmail(u.email, meetingId, meeting.title, hostName, inviteUrl, {
                            scheduledDate: meeting.scheduledDate,
                            scheduledTime: meeting.scheduledTime,
                            teamName,
                            isLiveNow: true
                        }).catch(err => console.error(`Error sending live start email to ${u.email}:`, err))
                        notifiedCount++
                    }
                }
            }

            return sendSuccess(res, { meetingId, notifiedCount }, `Live conference started! ${notifiedCount} team members notified with 1-click join link.`)
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to dispatch live start notifications')
        }
    }
}
