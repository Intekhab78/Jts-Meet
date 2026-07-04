import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/octet-stream',
    ''
]

export const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Unsupported file type'))
        }
    }
}).single('file')

export function isAllowedMimeType(mimeType: string) {
    return ALLOWED_MIME_TYPES.includes(mimeType)
}
