import { Router } from 'express'
import { fileController } from './file.controller'
import { fileUpload } from './file.validator'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { sendError } from '../../utils/responseHelper'

const router = Router()

const handleMulterUpload = (req: any, res: any, next: any) => {
    fileUpload(req, res, (err: any) => {
        if (err) {
            return sendError(res, 400, err.message || 'File upload failed')
        }
        next()
    })
}

router.post('/upload', authenticate, handleMulterUpload, asyncWrapper(fileController.uploadFile))
router.get('/:fileId', authenticate, asyncWrapper(fileController.getMetadata))
router.get('/:fileId/download', authenticate, asyncWrapper(fileController.downloadFile))
router.delete('/:fileId', authenticate, asyncWrapper(fileController.deleteFile))

export default router
