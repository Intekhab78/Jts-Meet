import { Request, Response } from 'express'
import {
    createTeam,
    getTeam,
    listOrganizationTeams,
    updateTeam,
    deleteTeam,
    inviteTeamMember,
    joinPublicTeam,
    leaveTeam,
    removeTeamMember,
    updateTeamMemberRole,
    getTeamMembers
} from './team.service'
import {
    validateCreateTeam,
    validateUpdateTeam,
    validateInviteTeamMember,
    validateTeamMembershipAction,
    validateUpdateTeamMemberRole
} from './team.validator'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { AuthRequest } from '../../middleware/authMiddleware'

export const teamController = {
    createTeam: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateCreateTeam(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const team = await createTeam(req.userId, req.body)
            return sendSuccess(res, team, 'Team created')
        } catch (error: any) {
            return sendError(res, error.status || 500, error.message || 'Unable to create team')
        }
    },

    getTeam: async (req: AuthRequest, res: Response) => {
        const teamId = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId
        if (!teamId) {
            return sendError(res, 400, 'teamId is required')
        }

        const team = await getTeam(teamId)
        if (!team) {
            return sendError(res, 404, 'Team not found')
        }

        return sendSuccess(res, team, 'Team retrieved')
    },

    listOrganizationTeams: async (req: AuthRequest, res: Response) => {
        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        if (!organizationId) {
            return sendError(res, 400, 'organizationId is required')
        }

        const teams = await listOrganizationTeams(organizationId)
        return sendSuccess(res, teams, 'Teams retrieved')
    },

    updateTeam: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateUpdateTeam(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const teamId = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId
        if (!teamId) {
            return sendError(res, 400, 'teamId is required')
        }

        try {
            const team = await updateTeam(teamId, req.userId, req.body)
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Team updated')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    deleteTeam: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const teamId = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId
        if (!teamId) {
            return sendError(res, 400, 'teamId is required')
        }

        try {
            const team = await deleteTeam(teamId, req.userId)
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Team deleted')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    inviteMember: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateInviteTeamMember(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const team = await inviteTeamMember(req.body.teamId, req.userId, { userId: req.body.userId, role: req.body.role })
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Member invited')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    joinPublicTeam: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateTeamMembershipAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const team = await joinPublicTeam(req.body.teamId, req.userId)
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Joined public team')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    leaveTeam: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateTeamMembershipAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const team = await leaveTeam(req.body.teamId, req.userId)
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Left team')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    removeMember: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateTeamMembershipAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const team = await removeTeamMember(req.body.teamId, req.userId, req.body.userId)
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Member removed')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    updateMemberRole: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateUpdateTeamMemberRole(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const team = await updateTeamMemberRole(req.body.teamId, req.userId, { userId: req.body.userId, role: req.body.role })
            if (!team) {
                return sendError(res, 404, 'Team not found')
            }
            return sendSuccess(res, team, 'Member role updated')
        } catch (error: any) {
            return sendError(res, error.status || 403, error.message || 'Forbidden')
        }
    },

    getMembers: async (req: AuthRequest, res: Response) => {
        const teamId = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId
        if (!teamId) {
            return sendError(res, 400, 'teamId is required')
        }

        const members = await getTeamMembers(teamId)
        if (!members) {
            return sendError(res, 404, 'Team not found')
        }

        return sendSuccess(res, members, 'Team members retrieved')
    }
}
