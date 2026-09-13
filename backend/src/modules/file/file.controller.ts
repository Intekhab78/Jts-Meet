import path from 'path'
import fs from 'fs'
import { Request, Response } from 'express'
import { createFileMetadata, getFileMetadata, softDeleteFile, computeChecksum } from './file.service'
import { sendSuccess, sendError } from '../../utils/responseHelper'
import { fileUpload, isAllowedMimeType } from './file.validator'
import { Organization } from '../organization/organization.model'

interface AuthRequest extends Request {
    userId?: string
    file?: Express.Multer.File
}

export const fileController = {
    uploadFile: async (req: AuthRequest, res: Response) => {
        const userId = req.userId
        const file = req.file
        const contextType = req.body.contextType as any
        const contextId = req.body.contextId as string

        if (!userId || !file) {
            return sendError(res, 400, 'File and authentication required')
        }

        if (!isAllowedMimeType(file.mimetype)) {
            return sendError(res, 400, 'Unsupported file type')
        }

        if (file.size > 25 * 1024 * 1024) {
            return sendError(res, 400, 'File size exceeds limit')
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
                contextId
            )

            return sendSuccess(res, metadata)
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Upload failed')
        }
    },

    async getMetadata(req: AuthRequest, res: Response) {
        const userId = req.userId
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId

        if (!userId || !fileId) {
            return sendError(res, 400, 'Invalid request')
        }

        const metadata = await getFileMetadata(fileId)
        if (!metadata || metadata.deletedAt) {
            return sendError(res, 404, 'File not found')
        }

        // IDOR Access Authorization Guard
        const isOwner = metadata.uploadedBy?.toString() === userId
        const isPublicContext = metadata.contextType === 'profile'
        if (!isOwner && !isPublicContext && metadata.organizationId) {
            const org = await Organization.findById(metadata.organizationId).select('members ownerId')
            const isMember = org?.ownerId?.toString() === userId || org?.members?.some((m: any) => m.userId?.toString() === userId)
            if (!isMember) {
                return sendError(res, 403, 'Forbidden: You do not have permission to access this file')
            }
        }

        return sendSuccess(res, metadata)
    },

    async downloadFile(req: AuthRequest, res: Response) {
        const userId = req.userId
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId

        if (!userId || !fileId) {
            return sendError(res, 400, 'Invalid request')
        }

        const metadata = await getFileMetadata(fileId)
        if (!metadata || metadata.deletedAt) {
            return sendError(res, 404, 'File not found')
        }

        // IDOR Access Authorization Guard
        const isOwner = metadata.uploadedBy?.toString() === userId
        const isPublicContext = metadata.contextType === 'profile'
        if (!isOwner && !isPublicContext && metadata.organizationId) {
            const org = await Organization.findById(metadata.organizationId).select('members ownerId')
            const isMember = org?.ownerId?.toString() === userId || org?.members?.some((m: any) => m.userId?.toString() === userId)
            if (!isMember) {
                return sendError(res, 403, 'Forbidden: You do not have permission to download this file')
            }
        }

        if (metadata.storageProvider === 'local') {
            const uploadsDir = path.join(process.cwd(), 'uploads')
            const filePath = path.join(uploadsDir, metadata.storageKey)
            if (fs.existsSync(filePath)) {
                return res.download(filePath, metadata.originalName)
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
