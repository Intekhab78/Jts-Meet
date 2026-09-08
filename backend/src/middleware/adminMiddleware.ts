import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'
import { sendError } from '../utils/responseHelper'
import { User } from '../models/user.model'
import { Organization } from '../modules/organization/organization.model'
import { Types } from 'mongoose'

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId || !Types.ObjectId.isValid(req.userId)) {
        return sendError(res, 401, 'Unauthorized access')
    }

    try {
        const user = await User.findById(req.userId)
        if (!user) {
            return sendError(res, 401, 'User not found')
        }

        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
        if (adminEmail && user.email.toLowerCase() === adminEmail) {
            return next()
        }

        // Check if user is an owner or admin of any organization
        const hasOrgAdminRole = await Organization.exists({
            $or: [
                { ownerId: user._id },
                {
                    members: {
                        $elemMatch: {
                            userId: user._id,
                            role: { $in: ['owner', 'admin'] },
                            status: 'active'
                        }
                    }
                }
            ]
        })

        if (hasOrgAdminRole) {
            return next()
        }

        return sendError(res, 403, 'Forbidden: Administrator privileges required')
    } catch (error: any) {
        return sendError(res, 500, error?.message || 'Internal server error validating administrative privileges')
    }
}
