import { Response } from 'express'
import { AuthRequest } from '../../middleware/authMiddleware'
import {
    createChannel,
    getChannel,
    listTeamChannels,
    updateChannel,
    archiveChannel,
    restoreChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    inviteChannelMember,
    removeChannelMember,
    updateChannelMemberRole,
    getChannelMembers,
    createGeneralChannel
} from './channel.service'
import {
    validateCreateChannel,
    validateUpdateChannel,
    validateChannelMembershipAction,
    validateInviteChannelMember,
    validateUpdateChannelMemberRole
} from './channel.validator'
import { sendError, sendSuccess } from '../../utils/responseHelper'

export const channelController = {
    createChannel: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateCreateChannel(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const channel = await createChannel(req.userId, req.body)
            return sendSuccess(res, channel, 'Channel created')
        } catch (error: any) {
            return sendError(res, error.status || 500, error.message || 'Unable to create channel')
        }
    },

    getChannel: async (req: AuthRequest, res: Response) => {
        const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId
        if (!channelId) {
            return sendError(res, 400, 'channelId is required')
        }

        const channel = await getChannel(channelId)
        if (!channel) {
            return sendError(res, 404, 'Channel not found')
        }

        return sendSuccess(res, channel, 'Channel retrieved')
    },

    listTeamChannels: async (req: AuthRequest, res: Response) => {
        const teamId = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId
        if (!teamId) {
            return sendError(res, 400, 'teamId is required')
        }

        const channels = await listTeamChannels(teamId)
        return sendSuccess(res, channels, 'Channels retrieved')
    },

    updateChannel: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateUpdateChannel(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId
        if (!channelId) {
            return sendError(res, 400, 'channelId is required')
        }

        try {
            const channel = await updateChannel(channelId, req.userId, req.body)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Channel updated')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    archiveChannel: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId
        if (!channelId) {
            return sendError(res, 400, 'channelId is required')
        }

        try {
            const channel = await archiveChannel(channelId, req.userId)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Channel archived')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    restoreChannel: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId
        if (!channelId) {
            return sendError(res, 400, 'channelId is required')
        }

        try {
            const channel = await restoreChannel(channelId, req.userId)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Channel restored')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    deleteChannel: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId
        if (!channelId) {
            return sendError(res, 400, 'channelId is required')
        }

        try {
            const channel = await deleteChannel(channelId, req.userId)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Channel deleted')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    joinChannel: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateChannelMembershipAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const channel = await joinChannel(req.body.channelId, req.userId)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Joined channel')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    leaveChannel: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateChannelMembershipAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const channel = await leaveChannel(req.body.channelId, req.userId)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Left channel')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    inviteMember: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateInviteChannelMember(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const channel = await inviteChannelMember(req.body.channelId, req.userId, { userId: req.body.userId, role: req.body.role })
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Member invited')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    removeMember: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateChannelMembershipAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const channel = await removeChannelMember(req.body.channelId, req.userId, req.body.userId)
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Member removed')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    updateMemberRole: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateUpdateChannelMemberRole(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const channel = await updateChannelMemberRole(req.body.channelId, req.userId, { userId: req.body.userId, role: req.body.role })
            if (!channel) {
                return sendError(res, 404, 'Channel not found')
            }
            return sendSuccess(res, channel, 'Member role updated')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    getMembers: async (req: AuthRequest, res: Response) => {
        const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId
        if (!channelId) {
            return sendError(res, 400, 'channelId is required')
        }

        const members = await getChannelMembers(channelId)
        if (!members) {
            return sendError(res, 404, 'Channel not found')
        }

        return sendSuccess(res, members, 'Channel members retrieved')
    }
}
