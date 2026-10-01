import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'
import { sendError } from '../utils/responseHelper'
import { User } from '../models/user.model'
import { Organization } from '../modules/organization/organization.model'
import { PlatformSettings } from '../modules/admin/platformSettings.model'
import { Types } from 'mongoose'

function getClientIp(req: AuthRequest): string {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim()
    }
    return req.socket?.remoteAddress || '127.0.0.1'
}

function checkIpWhitelist(clientIp: string, allowedRanges: string[]): boolean {
    if (!allowedRanges || allowedRanges.length === 0) return true
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || clientIp.includes('::ffff:127.0.0.1')) return true
    for (const range of allowedRanges) {
        const clean = range.trim()
        if (clean === clientIp) return true
        if (clean.includes('/')) {
            const prefix = clean.split('/')[0].split('.').slice(0, 3).join('.')
            if (clientIp.startsWith(prefix)) return true
        }
    }
    return false
}

export const isSuperAdminUser = (user: any): boolean => {
    if (!user) return false
    if (user.isSuperAdmin) return true
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    if (adminEmail && user.email && user.email.toLowerCase() === adminEmail) {
        return true
    }
    return false
}

export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId || !Types.ObjectId.isValid(req.userId)) {
        return sendError(res, 401, 'Unauthorized access')
    }

    try {
        const user = await User.findById(req.userId)
        if (!user) {
            return sendError(res, 401, 'User not found')
        }

        if (isSuperAdminUser(user)) {
            // Verify IP Whitelist if enabled in Platform Settings
            const settings = await PlatformSettings.findOne({ key: 'global_config' }).lean()
            if (settings && settings.ipWhitelistEnabled && settings.allowedIpRanges?.length > 0) {
                const clientIp = getClientIp(req)
                if (!checkIpWhitelist(clientIp, settings.allowedIpRanges)) {
                    return sendError(res, 403, `Access denied: Client IP ${clientIp} is not authorized by the platform IP whitelist policy.`)
                }
            }
            return next()
        }

        return sendError(res, 403, 'Forbidden: Master Platform Super-Administrator privileges required')
    } catch (error: any) {
        return sendError(res, 500, error?.message || 'Internal server error validating administrative privileges')
    }
}

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId || !Types.ObjectId.isValid(req.userId)) {
        return sendError(res, 401, 'Unauthorized access')
    }

    try {
        const user = await User.findById(req.userId)
        if (!user) {
            return sendError(res, 401, 'User not found')
        }

        if (isSuperAdminUser(user)) {
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
