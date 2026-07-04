import crypto from 'crypto'
import { Types } from 'mongoose'
import { FileMetadata, IFileMetadata } from './file.model'
import { uploadFileToCloudinary, deleteFileFromCloudinary } from './storage.service'

const STORAGE_PROVIDER = 'cloudinary'

export async function computeChecksum(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function createFileMetadata(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    uploadedBy: string,
    contextType?: IFileMetadata['contextType'],
    contextId?: string,
    organizationId?: string,
    teamId?: string,
    channelId?: string,
    messageId?: string
): Promise<IFileMetadata> {
    const checksum = await computeChecksum(buffer)
    const existing = await FileMetadata.findOne({ checksum, originalName, deletedAt: null }).exec()
    if (existing) {
        return existing
    }

    const extension = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() || '' : ''
    const fileName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const stored = await uploadFileToCloudinary(buffer, fileName, mimeType)

    const metadata = new FileMetadata({
        originalName,
        fileName,
        mimeType,
        checksum,
        extension,
        size: buffer.length,
        storageProvider: STORAGE_PROVIDER,
        storageKey: stored.publicId,
        secureUrl: stored.secureUrl,
        uploadedBy: new Types.ObjectId(uploadedBy),
        uploadedAt: new Date(),
        contextType,
        contextId,
        organizationId: organizationId ? new Types.ObjectId(organizationId) : null,
        teamId: teamId ? new Types.ObjectId(teamId) : null,
        channelId: channelId ? new Types.ObjectId(channelId) : null,
        messageId: messageId ? new Types.ObjectId(messageId) : null
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

    if (!file.uploadedBy.equals(new Types.ObjectId(userId))) {
        throw new Error('Forbidden')
    }

    file.deletedAt = new Date()
    await deleteFileFromCloudinary(file.storageKey)
    return file.save()
}

export async function getFileByChecksum(checksum: string): Promise<IFileMetadata | null> {
    return FileMetadata.findOne({ checksum, deletedAt: null }).exec()
}
