import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../../config'

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
})

export interface UploadedFileResult {
    secureUrl: string
    publicId: string
    mimeType: string
    size: number
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
                    size: Number(result.bytes || 0)
                })
            }
        )

        stream.end(fileBuffer)
    })
}

export async function deleteFileFromCloudinary(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' })
}
