import { Request, Response } from 'express'
import {
    createOrganization,
    getOrganizationById,
    updateOrganization,
    inviteMember,
    acceptInvitation,
    removeMember,
    leaveOrganization,
    getOrganizationMembers,
    listUserOrganizations
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

    getMembers: async (req: AuthRequest, res: Response) => {
        const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId
        if (!organizationId) {
            return sendError(res, 400, 'organizationId is required')
        }

        const members = await getOrganizationMembers(organizationId)
        if (!members) {
            return sendError(res, 404, 'Organization not found')
        }

        return sendSuccess(res, members, 'Organization members retrieved')
    }
}
