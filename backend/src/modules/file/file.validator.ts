import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'

const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'text/csv',
    'application/json',
    'application/octet-stream',
    // Audio / Voice Notes
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a',
    'audio/m4a',
    'audio/flac',
    // Video
    'video/webm',
    'video/mp4',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    ''
]

export const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const rawMime = file.mimetype || ''
        const baseMime = rawMime.split(';')[0].trim().toLowerCase()
        if (
            ALLOWED_MIME_TYPES.includes(baseMime) ||
            ALLOWED_MIME_TYPES.includes(rawMime.toLowerCase()) ||
            baseMime.startsWith('audio/') ||
            baseMime.startsWith('video/') ||
            baseMime.startsWith('image/')
        ) {
            cb(null, true)
        } else {
            cb(new Error('Unsupported file type'))
        }
    }
}).single('file')

export function isAllowedMimeType(mimeType: string) {
    if (!mimeType) return true
    const rawMime = mimeType || ''
    const baseMime = rawMime.split(';')[0].trim().toLowerCase()
    return (
        ALLOWED_MIME_TYPES.includes(baseMime) ||
        ALLOWED_MIME_TYPES.includes(rawMime.toLowerCase()) ||
        baseMime.startsWith('audio/') ||
        baseMime.startsWith('video/') ||
        baseMime.startsWith('image/')
    )
}
