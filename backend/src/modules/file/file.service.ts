import crypto from 'crypto'
import { Types } from 'mongoose'
import { FileMetadata, IFileMetadata } from './file.model'
import { storeFile, deleteStoredFile } from './storage.service'

export async function computeChecksum(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function createFileMetadata(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    uploadedBy?: string,
    contextType?: IFileMetadata['contextType'],
    contextId?: string,
    organizationId?: string,
    teamId?: string,
    channelId?: string,
    messageId?: string,
    uploaderName?: string
): Promise<IFileMetadata> {
    const checksum = await computeChecksum(buffer)
    const validUserId = uploadedBy && Types.ObjectId.isValid(uploadedBy) ? new Types.ObjectId(uploadedBy) : null
    const existing = await FileMetadata.findOne({
        checksum,
        originalName,
        ...(validUserId ? { uploadedBy: validUserId } : {}),
        deletedAt: null
    }).exec()
    if (existing) {
        return existing
    }

    const extension = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() || '' : ''
    const safeOriginal = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const stored = await storeFile(buffer, safeOriginal, mimeType)

    const metadata = new FileMetadata({
        originalName,
        fileName: stored.publicId,
        mimeType,
        checksum,
        extension,
        size: buffer.length,
        storageProvider: stored.provider,
        storageKey: stored.publicId,
        secureUrl: stored.secureUrl,
        uploadedBy: validUserId,
        uploaderName: uploaderName || (!validUserId && uploadedBy ? uploadedBy : undefined),
        uploadedAt: new Date(),
        contextType,
        contextId,
        organizationId: organizationId && Types.ObjectId.isValid(organizationId) ? new Types.ObjectId(organizationId) : null,
        teamId: teamId && Types.ObjectId.isValid(teamId) ? new Types.ObjectId(teamId) : null,
        channelId: channelId && Types.ObjectId.isValid(channelId) ? new Types.ObjectId(channelId) : null,
        messageId: messageId && Types.ObjectId.isValid(messageId) ? new Types.ObjectId(messageId) : null
    })

    await metadata.save()
    return metadata
}

export async function getFileMetadata(fileId: string): Promise<IFileMetadata | null> {
    if (!Types.ObjectId.isValid(fileId)) {
        return null
    }
    return FileMetadata.findById(fileId).exec()
}

export async function softDeleteFile(fileId: string, userId: string): Promise<IFileMetadata | null> {
    const file = await getFileMetadata(fileId)
    if (!file) {
        return null
    }

    if (!file.uploadedBy || !file.uploadedBy.equals(new Types.ObjectId(userId))) {
        throw new Error('Forbidden')
    }

    file.deletedAt = new Date()
    await deleteStoredFile(file.storageKey, file.storageProvider)
    return file.save()
}

export async function getFileByChecksum(checksum: string): Promise<IFileMetadata | null> {
    return FileMetadata.findOne({ checksum, deletedAt: null }).exec()
}

export async function listChannelFiles(channelId: string): Promise<IFileMetadata[]> {
    const conditions: any[] = [{ contextId: channelId }]
    if (Types.ObjectId.isValid(channelId)) {
        conditions.push({ channelId: new Types.ObjectId(channelId) })
    }
    return FileMetadata.find({
        $or: conditions,
        deletedAt: null
    }).populate('uploadedBy', 'fullName email profileImage').sort({ uploadedAt: -1 }).exec()
}

export async function listFilesByContext(contextType: string, contextId: string): Promise<IFileMetadata[]> {
    return FileMetadata.find({
        contextType,
        contextId,
        deletedAt: null
    })
    .populate('uploadedBy', 'fullName email profileImage')
    .sort({ uploadedAt: -1 })
    .exec()
}


