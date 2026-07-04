import { Response } from 'express'
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
    toggleWaitingRoom
} from './meeting.service'
import { validateCreateMeeting, validateMeetingAction } from './meeting.validator'
import { AuthRequest } from '../../middleware/authMiddleware'

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

        const meeting = await createMeeting(userId, req.body.title)
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
    }
}
