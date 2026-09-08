import { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { Channel } from './channel.model'
import { Team } from '../team/team.model'
import { getOrganizationById } from '../organization/organization.service'
import { sendError } from '../../utils/responseHelper'

function getTeamMember(team: any, userId: string) {
    return team?.members?.find((member: any) => member.userId.equals(new Types.ObjectId(userId)))
}

function getChannelMember(channel: any, userId: string) {
    return channel?.members?.find((member: any) => member.userId.equals(new Types.ObjectId(userId)))
}

async function isUserAuthorizedForTeam(team: any, userId: string): Promise<boolean> {
    const member = getTeamMember(team, userId)
    if (member) return true

    if (team.organizationId) {
        try {
            const organization = await getOrganizationById(team.organizationId.toString())
            if (organization) {
                const orgMember = organization.members?.find((m: any) => (m.userId?.equals ? m.userId.equals(new Types.ObjectId(userId)) : m.userId?.toString() === userId) && m.status === 'active')
                if (orgMember) {
                    if (['owner', 'admin'].includes(orgMember.role)) {
                        return true
                    }
                    if (team.isPublic !== false) {
                        return true
                    }
                }
            }
        } catch (e) {
            // ignore org lookup errors
        }
    }
    return false
}

export async function requireTeamMember(req: Request, res: Response, next: NextFunction) {
    const teamId = req.body?.teamId || req.params.teamId
    const userId = (req as any).userId

    if (!teamId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    if (!Types.ObjectId.isValid(teamId)) {
        return sendError(res, 400, 'Invalid teamId')
    }

    const team = await Team.findById(teamId).exec()
    if (!team || team.deletedAt) {
        return sendError(res, 404, 'Team not found')
    }

    const isAuthorized = await isUserAuthorizedForTeam(team, userId)
    if (!isAuthorized) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}

export async function requireTeamMemberFromChannel(req: Request, res: Response, next: NextFunction) {
    const channelId = req.body?.channelId || req.params.channelId
    const userId = (req as any).userId

    if (!channelId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    if (!Types.ObjectId.isValid(channelId)) {
        return sendError(res, 400, 'Invalid channelId')
    }

    const channel = await Channel.findById(channelId).exec()
    if (!channel || channel.deletedAt) {
        return sendError(res, 404, 'Channel not found')
    }

    const team = await Team.findById(channel.teamId).exec()
    if (!team || team.deletedAt) {
        return sendError(res, 404, 'Team not found')
    }

    const isAuthorized = await isUserAuthorizedForTeam(team, userId)
    if (!isAuthorized) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}

export async function requireChannelAccess(req: Request, res: Response, next: NextFunction) {
    const channelId = req.params.channelId || req.body?.channelId
    const userId = (req as any).userId

    if (!channelId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    if (!Types.ObjectId.isValid(channelId)) {
        return sendError(res, 400, 'Invalid channelId')
    }

    const channel = await Channel.findById(channelId).exec()
    if (!channel || channel.deletedAt) {
        return sendError(res, 404, 'Channel not found')
    }

    const team = await Team.findById(channel.teamId).exec()
    if (!team || team.deletedAt) {
        return sendError(res, 404, 'Team not found')
    }

    const isAuthorized = await isUserAuthorizedForTeam(team, userId)
    if (!isAuthorized) {
        return sendError(res, 403, 'Forbidden')
    }

    if (channel.type === 'public') {
        return next()
    }

    const member = getChannelMember(channel, userId)
    if (!member) {
        if (team.organizationId) {
            try {
                const organization = await getOrganizationById(team.organizationId.toString())
                const orgMember = organization?.members?.find((m: any) => (m.userId?.equals ? m.userId.equals(new Types.ObjectId(userId)) : m.userId?.toString() === userId) && m.status === 'active')
                if (orgMember && ['owner', 'admin'].includes(orgMember.role)) {
                    return next()
                }
            } catch (e) {
                // ignore
            }
        }
        return sendError(res, 403, 'Forbidden')
    }

    next()
}

export async function requireChannelMember(req: Request, res: Response, next: NextFunction) {
    const channelId = req.params.channelId || req.body?.channelId
    const userId = (req as any).userId

    if (!channelId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    if (!Types.ObjectId.isValid(channelId)) {
        return sendError(res, 400, 'Invalid channelId')
    }

    const channel = await Channel.findById(channelId).exec()
    if (!channel || channel.deletedAt) {
        return sendError(res, 404, 'Channel not found')
    }

    const member = getChannelMember(channel, userId)
    if (!member) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}

export async function requireChannelOwnerOrModerator(req: Request, res: Response, next: NextFunction) {
    const channelId = req.params.channelId || req.body?.channelId
    const userId = (req as any).userId

    if (!channelId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    if (!Types.ObjectId.isValid(channelId)) {
        return sendError(res, 400, 'Invalid channelId')
    }

    const channel = await Channel.findById(channelId).exec()
    if (!channel || channel.deletedAt) {
        return sendError(res, 404, 'Channel not found')
    }

    const member = getChannelMember(channel, userId)
    if (!member || !['owner', 'moderator'].includes(member.role)) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}
