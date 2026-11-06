import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { integrationController } from './integration.controller'

const router = Router()

// Inbound webhook & room creation endpoint for external websites and CRM integrations
router.post('/webhook', asyncWrapper(integrationController.handleInboundWebhook))
router.get('/webhook', asyncWrapper(integrationController.handleInboundWebhook))

router.get('/', authenticate, asyncWrapper(integrationController.list))
router.post('/', authenticate, asyncWrapper(integrationController.create))
router.post('/:id/test', authenticate, asyncWrapper(integrationController.test))
router.patch('/:id/toggle', authenticate, asyncWrapper(integrationController.toggle))
router.delete('/:id', authenticate, asyncWrapper(integrationController.delete))

export default router
