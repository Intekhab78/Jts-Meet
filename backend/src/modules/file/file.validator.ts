import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'

const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
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
    'text/csv',
    'application/json',
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
    'video/mpeg'
]

const BLOCKED_MIME_TYPES = new Set([
    'image/svg+xml',
    'text/html',
    'application/xhtml+xml',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/x-javascript',
    'application/octet-stream'
])

export const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (isAllowedMimeType(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Unsupported file type'))
        }
    }
}).single('file')

export function isAllowedMimeType(mimeType: string) {
    if (!mimeType || typeof mimeType !== 'string') return false
    const rawMime = mimeType.trim().toLowerCase()
    const baseMime = rawMime.split(';')[0].trim()
    if (!baseMime || BLOCKED_MIME_TYPES.has(baseMime) || baseMime.includes('svg') || baseMime.includes('html') || baseMime.includes('javascript')) {
        return false
    }
    return (
        ALLOWED_MIME_TYPES.includes(baseMime) ||
        ALLOWED_MIME_TYPES.includes(rawMime) ||
        baseMime.startsWith('audio/') ||
        baseMime.startsWith('video/') ||
        baseMime.startsWith('image/')
    )
}
