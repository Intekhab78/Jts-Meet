import { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { getOrganizationById } from '../organization/organization.service'
import { Team, ITeam, ITeamMember } from './team.model'
import { sendError } from '../../utils/responseHelper'

function getMemberFromOrganization(org: any, userId: string) {
    return org?.members?.find((member: any) => member.userId.equals(new Types.ObjectId(userId)) && member.status === 'active')
}

function getMemberFromTeam(team: ITeam, userId: string) {
    return team.members.find((member) => member.userId.equals(new Types.ObjectId(userId)))
}

export async function requireOrganizationAdmin(req: Request, res: Response, next: NextFunction) {
    const organizationId = req.body.organizationId || req.params.organizationId
    const userId = (req as any).userId

    if (!organizationId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    const organization = await getOrganizationById(organizationId)
    if (!organization) {
        return sendError(res, 404, 'Organization not found')
    }

    const member = getMemberFromOrganization(organization, userId)
    if (!member || !['owner', 'admin'].includes(member.role)) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}

export async function requireTeamMember(req: Request, res: Response, next: NextFunction) {
    const teamId = req.params.teamId || req.body?.teamId
    const userId = (req as any).userId

    if (!teamId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    const team = await Team.findById(teamId).exec()
    if (!team || team.deletedAt) {
        return sendError(res, 404, 'Team not found')
    }

    const member = getMemberFromTeam(team, userId)
    if (!member) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}

export async function requireTeamOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
    const teamId = req.params.teamId || req.body?.teamId
    const userId = (req as any).userId

    if (!teamId || !userId) {
        return sendError(res, 401, 'Unauthorized access')
    }

    const team = await Team.findById(teamId).exec()
    if (!team || team.deletedAt) {
        return sendError(res, 404, 'Team not found')
    }

    const member = getMemberFromTeam(team, userId)
    if (!member || !['owner', 'admin'].includes(member.role)) {
        return sendError(res, 403, 'Forbidden')
    }

    next()
}
