import { Router } from 'express'
import { organizationController } from './organization.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.post('/', authenticate, asyncWrapper(organizationController.createOrganization))
router.get('/mine', authenticate, asyncWrapper(organizationController.getMyOrganizations))
router.get('/:organizationId', authenticate, asyncWrapper(organizationController.getOrganization))
router.patch('/:organizationId', authenticate, asyncWrapper(organizationController.updateOrganization))
router.post('/invite', authenticate, asyncWrapper(organizationController.inviteMember))
router.post('/invite/accept', authenticate, asyncWrapper(organizationController.acceptInvitation))
router.post('/remove', authenticate, asyncWrapper(organizationController.removeMember))
router.post('/leave', authenticate, asyncWrapper(organizationController.leaveOrganization))
router.get('/:organizationId/members', authenticate, asyncWrapper(organizationController.getMembers))

export default router
