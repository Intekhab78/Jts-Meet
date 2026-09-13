import { Request, Response } from 'express'
import {
    createOrganization,
    getOrganizationById,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    acceptInvitation,
    removeMember,
    leaveOrganization,
    getOrganizationMembers,
    getOrganizationMembersPaginated,
    listUserOrganizations,
    updateMemberRole
} from './organization.service'
import {
    validateCreateOrganization,
    validateUpdateOrganization,
    validateInviteMember,
    validateInvitationAction
} from './organization.validator'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { AuthRequest } from '../../middleware/authMiddleware'

export const organizationController = {
    getMyOrganizations: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        try {
            const list = await listUserOrganizations(req.userId)
            return sendSuccess(res, list, 'Organizations retrieved')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to list organizations')
        }
    },
    createOrganization: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateCreateOrganization(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const organization = await createOrganization(req.userId, req.body)
        return sendSuccess(res, organization, 'Organization created')
    },

    getOrganization: async (req: AuthRequest, res: Response) => {
        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        if (!organizationId) {
            return sendError(res, 400, 'organizationId is required')
        }

        const organization = await getOrganizationById(organizationId)
        if (!organization) {
            return sendError(res, 404, 'Organization not found')
        }

        return sendSuccess(res, organization, 'Organization retrieved')
    },

    updateOrganization: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateUpdateOrganization(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        if (!organizationId) {
            return sendError(res, 400, 'organizationId is required')
        }

        try {
            const organization = await updateOrganization(organizationId, req.userId, req.body)
            if (!organization) {
                return sendError(res, 404, 'Organization not found')
            }
            return sendSuccess(res, organization, 'Organization updated')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    inviteMember: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateInviteMember(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const organization = await inviteMember(req.body.organizationId, req.userId, {
                userId: req.body.userId,
                role: req.body.role
            })
            if (!organization) {
                return sendError(res, 404, 'Organization not found')
            }
            return sendSuccess(res, organization, 'Member invited')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    acceptInvitation: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateInvitationAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        if (req.userId !== req.body.userId) {
            return sendError(res, 403, 'Cannot accept invitation for another user')
        }

        try {
            const organization = await acceptInvitation(req.body.organizationId, req.userId)
            if (!organization) {
                return sendError(res, 404, 'Organization not found')
            }
            return sendSuccess(res, organization, 'Invitation accepted')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    removeMember: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateInvitationAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const organization = await removeMember(req.body.organizationId, req.userId, req.body.userId)
            if (!organization) {
                return sendError(res, 404, 'Organization not found')
            }
            return sendSuccess(res, organization, 'Member removed')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    leaveOrganization: async (req: AuthRequest, res: Response) => {
        const { valid, errors } = validateInvitationAction(req.body)
        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const organization = await leaveOrganization(req.body.organizationId, req.userId)
            if (!organization) {
                return sendError(res, 404, 'Organization not found')
            }
            return sendSuccess(res, organization, 'Left organization')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    updateMemberRole: async (req: AuthRequest, res: Response) => {
        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        const targetUserId = Array.isArray(req.params.targetUserId) ? req.params.targetUserId[0] : req.params.targetUserId
        const { role } = req.body

        if (!organizationId || !targetUserId || !role) {
            return sendError(res, 400, 'organizationId, targetUserId, and role are required')
        }

        if (!['owner', 'admin', 'member', 'guest'].includes(role)) {
            return sendError(res, 400, 'Invalid role specified')
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const organization = await updateMemberRole(organizationId, req.userId, targetUserId, role)
            if (!organization) {
                return sendError(res, 404, 'Organization or member not found')
            }
            return sendSuccess(res, organization, 'Member role updated successfully')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    },

    getMembers: async (req: AuthRequest, res: Response) => {
        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        if (!organizationId) {
            return sendError(res, 400, 'organizationId is required')
        }

        const limit = Math.min(100, Number(req.query.limit || req.query.pageSize) || 50)
        const cursor = req.query.cursor ? String(req.query.cursor) : undefined
        const search = req.query.search ? String(req.query.search) : undefined

        const result = await getOrganizationMembersPaginated(organizationId, limit, cursor, search)
        if (!result) {
            return sendError(res, 404, 'Organization not found')
        }

        return res.status(200).json({
            success: true,
            data: result.members,
            members: result.members,
            nextCursor: result.nextCursor,
            hasMore: !!result.nextCursor,
            total: result.members.length
        })
    },

    deleteOrganization: async (req: AuthRequest, res: Response) => {
        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        if (!organizationId) {
            return sendError(res, 400, 'organizationId is required')
        }

        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const org = await deleteOrganization(organizationId, req.userId)
            if (!org) {
                return sendError(res, 404, 'Organization not found')
            }
            return sendSuccess(res, org, 'Organization and nested teams/channels successfully deleted')
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Forbidden')
        }
    }
}
