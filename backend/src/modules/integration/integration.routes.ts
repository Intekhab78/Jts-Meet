import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { integrationController } from './integration.controller'

const router = Router()

router.get('/', authenticate, asyncWrapper(integrationController.list))
router.post('/', authenticate, asyncWrapper(integrationController.create))
router.post('/:id/test', authenticate, asyncWrapper(integrationController.test))
router.patch('/:id/toggle', authenticate, asyncWrapper(integrationController.toggle))
router.delete('/:id', authenticate, asyncWrapper(integrationController.delete))

export default router
