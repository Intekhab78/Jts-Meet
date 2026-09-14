import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { ClipController } from './clip.controller'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncWrapper } from '../../utils/asyncWrapper'

const router = Router()

const clipsDir = path.join(process.cwd(), 'uploads', 'clips')
if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, clipsDir)
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        const ext = path.extname(file.originalname) || '.webm'
        cb(null, `clip-${uniqueSuffix}${ext}`)
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 250 * 1024 * 1024 } // 250MB max for HD 10-min clips
})

router.post('/upload', authenticate, upload.single('clip'), asyncWrapper(ClipController.uploadClip))
router.get('/my', authenticate, asyncWrapper(ClipController.getMyClips))
router.get('/:clipId', authenticate, asyncWrapper(ClipController.getClip))
router.delete('/:clipId', authenticate, asyncWrapper(ClipController.deleteClip))

export default router
