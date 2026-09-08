import path from 'path'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, BACKEND_API_URL } from '../../config'

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true
    })
}

export interface UploadedFileResult {
    secureUrl: string
    publicId: string
    mimeType: string
    size: number
    provider: 'cloudinary' | 'local'
}

export async function uploadFileToDisk(fileBuffer: Buffer, filename: string, mimeType: string): Promise<UploadedFileResult> {
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(uploadsDir, safeFilename)
    await fs.promises.writeFile(filePath, fileBuffer)

    const baseUrl = (BACKEND_API_URL || 'http://localhost:4000').replace(/\/$/, '')
    const secureUrl = `${baseUrl}/uploads/${safeFilename}`

    return {
        secureUrl,
        publicId: safeFilename,
        mimeType,
        size: fileBuffer.length,
        provider: 'local'
    }
}

export async function uploadFileToCloudinary(fileBuffer: Buffer, filename: string, mimeType: string): Promise<UploadedFileResult> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                folder: 'jts-meet-files',
                use_filename: true,
                unique_filename: false,
                overwrite: false,
                public_id: filename.replace(/\.[^/.]+$/, '')
            },
            (error, result) => {
                if (error) {
                    reject(error)
                    return
                }

                if (!result || !result.secure_url || !result.public_id) {
                    reject(new Error('Cloudinary upload failed'))
                    return
                }

                resolve({
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                    mimeType: result.format || mimeType,
                    size: Number(result.bytes || 0),
                    provider: 'cloudinary'
                })
            }
        )

        stream.end(fileBuffer)
    })
}

export async function storeFile(fileBuffer: Buffer, filename: string, mimeType: string): Promise<UploadedFileResult> {
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_CLOUD_NAME.trim() !== '' && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        try {
            return await uploadFileToCloudinary(fileBuffer, filename, mimeType)
        } catch (err: any) {
            console.warn('[Storage] Cloudinary upload failed, falling back to local disk storage:', err?.message || err)
        }
    }

    return await uploadFileToDisk(fileBuffer, filename, mimeType)
}

export async function deleteFileFromCloudinary(publicId: string): Promise<void> {
    if (CLOUDINARY_CLOUD_NAME) {
        try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' })
        } catch (err) {
            console.warn('[Storage] Cloudinary destroy failed:', err)
        }
    }
}

export async function deleteStoredFile(publicId: string, provider: string): Promise<void> {
    if (provider === 'cloudinary') {
        await deleteFileFromCloudinary(publicId)
        return
    }

    try {
        const uploadsDir = path.join(process.cwd(), 'uploads')
        const filePath = path.join(uploadsDir, publicId)
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath)
        }
    } catch (err) {
        console.warn('[Storage] Local file delete failed:', err)
    }
}

