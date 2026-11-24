import path from 'path'
import fs from 'fs'
import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { createFileMetadata, getFileMetadata, softDeleteFile, computeChecksum, listFilesByContext } from './file.service'
import { sendSuccess, sendError } from '../../utils/responseHelper'
import { isAllowedMimeType } from './file.validator'
import { Organization } from '../organization/organization.model'
import { User } from '../../models/user.model'
import { isSuperAdminUser } from '../../middleware/adminMiddleware'
import { getEffectivePlanForUser, getStorageUsedBytes } from '../plan/planEntitlements'

const SAFE_INLINE_IMAGE_MIMES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
])

function sanitizeFilenameForHeader(name?: string): string {
    const base = path.basename(name || 'file')
    return base.replace(/[\r\n"\\;/]/g, '_') || 'file'
}

async function assertFileReadAccess(
    metadata: any,
    userId: string | undefined,
    res: Response,
    action: 'access' | 'download'
): Promise<boolean> {
    const isOwner = Boolean(userId && metadata.uploadedBy?.toString() === userId)
    const isPublicContext = metadata.contextType === 'profile'
    if (!isOwner && !isPublicContext) {
        if (!userId) {
            sendError(res, 401, 'Unauthorized access')
            return false
        }
        if (metadata.organizationId) {
            const org = await Organization.findById(metadata.organizationId).select('members ownerId').lean()
            const isMember = org?.ownerId?.toString() === userId || org?.members?.some((m: any) => m.userId?.toString() === userId)
            if (!isMember) {
                const user = Types.ObjectId.isValid(userId) ? await User.findById(userId).select('email isSuperAdmin').lean() : null
                if (!user || !isSuperAdminUser(user)) {
                    sendError(res, 403, `Forbidden: You do not have permission to ${action} this file`)
                    return false
                }
            }
        }
    }
    return true
}

interface AuthRequest extends Request {
    userId?: string
    file?: Express.Multer.File
    guestName?: string
    isGuest?: boolean
    meetingId?: string
}

export const fileController = {
    uploadFile: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        const file = req.file
        const contextType = req.body.contextType as any
        const contextId = req.body.contextId as string
        const uploaderName = req.body.uploaderName || req.guestName || undefined

        if (!userId) {
            return sendError(res, 401, 'Unauthorized')
        }

        if (!file) {
            return sendError(res, 400, 'File is required')
        }

        if (!isAllowedMimeType(file.mimetype)) {
            return sendError(res, 400, 'Unsupported file type')
        }

        if (file.size > 25 * 1024 * 1024) {
            return sendError(res, 400, 'File size exceeds limit')
        }

        const requestedOrgId = typeof req.body.organizationId === 'string' && req.body.organizationId.trim()
            ? req.body.organizationId.trim()
            : undefined

        if (req.isGuest) {
            if (requestedOrgId) {
                return sendError(res, 403, 'Forbidden: Guests cannot upload files into an organization scope')
            }
            if (req.meetingId && contextId && contextId !== req.meetingId && !contextId.startsWith(`${req.meetingId}__`)) {
                return sendError(res, 403, 'Forbidden: Guest uploads are restricted to the current meeting')
            }
        }

        let verifiedOrgId: string | undefined
        if (requestedOrgId) {
            if (!Types.ObjectId.isValid(requestedOrgId)) {
                return sendError(res, 400, 'Invalid organization ID')
            }
            const org = await Organization.findById(requestedOrgId).select('ownerId members').lean()
            if (!org) {
                return sendError(res, 404, 'Organization not found')
            }
            const isMember = String(org.ownerId) === String(userId) || org.members?.some((m: any) => String(m.userId) === String(userId))
            if (!isMember) {
                const user = Types.ObjectId.isValid(userId) ? await User.findById(userId).select('email isSuperAdmin').lean() : null
                if (!user || !isSuperAdminUser(user)) {
                    return sendError(res, 403, 'Forbidden: You are not a member of this organization')
                }
            }
            verifiedOrgId = String(org._id)
        }

        if (userId || verifiedOrgId) {
            try {
                const effectivePlan = await getEffectivePlanForUser(userId, verifiedOrgId)
                const maxBytes = effectivePlan.limits.maxStorageGb * 1024 * 1024 * 1024
                const usedBytes = await getStorageUsedBytes(userId, verifiedOrgId)
                if (usedBytes + file.size > maxBytes) {
                    return sendError(res, 403, `Cloud storage quota (${effectivePlan.limits.maxStorageGb} GB) exceeded for your ${effectivePlan.planTier.toUpperCase()} plan.`)
                }
            } catch (_) {}
        }

        const checksum = await computeChecksum(file.buffer)
        // Placeholder for virus scan integration
        if (!checksum) {
            return sendError(res, 500, 'Virus scan failed')
        }

        try {
            const metadata = await createFileMetadata(
                file.buffer,
                file.originalname,
                file.mimetype,
                userId,
                contextType,
                contextId,
                verifiedOrgId,
                undefined,
                undefined,
                undefined,
                uploaderName
            )

            return sendSuccess(res, metadata)
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Upload failed')
        }
    },

    async listContextFiles(req: AuthRequest, res: Response) {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        const contextType = Array.isArray(req.params.contextType) ? req.params.contextType[0] : req.params.contextType
        const contextId = Array.isArray(req.params.contextId) ? req.params.contextId[0] : req.params.contextId
        if (!contextType || !contextId) {
            return sendError(res, 400, 'Context type and context ID are required')
        }

        if (req.isGuest && req.meetingId && contextId !== req.meetingId && !contextId.startsWith(`${req.meetingId}__`)) {
            return sendError(res, 403, 'Forbidden: Guest access restricted to current meeting')
        }

        try {
            const files = await listFilesByContext(contextType, contextId)
            return sendSuccess(res, files)
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to list context files')
        }
    },

    async getMetadata(req: AuthRequest, res: Response) {
        const userId = req.userId
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId

        if (!fileId) {
            return sendError(res, 400, 'Invalid request')
        }

        const metadata = await getFileMetadata(fileId)
        if (!metadata || metadata.deletedAt) {
            return sendError(res, 404, 'File not found')
        }

        const allowed = await assertFileReadAccess(metadata, userId, res, 'access')
        if (!allowed) return

        return sendSuccess(res, metadata)
    },

    async downloadFile(req: AuthRequest, res: Response) {
        const userId = req.userId
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId

        if (!fileId) {
            return sendError(res, 400, 'Invalid request')
        }

        const metadata = await getFileMetadata(fileId)
        if (!metadata || metadata.deletedAt) {
            return sendError(res, 404, 'File not found')
        }

        const allowed = await assertFileReadAccess(metadata, userId, res, 'download')
        if (!allowed) return

        if (metadata.storageProvider === 'local') {
            const uploadsDir = path.resolve(process.cwd(), 'uploads')
            const filePath = path.resolve(uploadsDir, metadata.storageKey)
            if (filePath.startsWith(uploadsDir + path.sep) && fs.existsSync(filePath)) {
                const baseMime = (metadata.mimeType || '').split(';')[0].trim().toLowerCase()
                const isSafeInlineImage = SAFE_INLINE_IMAGE_MIMES.has(baseMime)
                const isView = req.path.includes('/view') || req.query.view === 'true' || isSafeInlineImage
                const safeName = sanitizeFilenameForHeader(metadata.originalName)
                res.setHeader('X-Content-Type-Options', 'nosniff')
                if (isView && isSafeInlineImage) {
                    res.setHeader('Content-Type', baseMime)
                    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`)
                    return res.sendFile(filePath)
                }
                return res.download(filePath, safeName)
            }
        }

        return res.redirect(metadata.secureUrl)
    },

    async deleteFile(req: AuthRequest, res: Response) {
        const userId = req.userId
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId

        if (!userId || !fileId) {
            return sendError(res, 400, 'Invalid request')
        }

        try {
            const deleted = await softDeleteFile(fileId, userId)
            if (!deleted) {
                return sendError(res, 404, 'File not found')
            }
            return sendSuccess(res, deleted)
        } catch (error: any) {
            return sendError(res, 403, error.message || 'Unable to delete file')
        }
    }
}
