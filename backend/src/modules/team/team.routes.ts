import { Router } from 'express'
import { teamController } from './team.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { requireOrganizationAdmin, requireTeamOwnerOrAdmin, requireTeamMember } from './team.permission'

const router = Router()

// Specific & static paths MUST come before generic :teamId parameterized routes
router.post('/', authenticate, asyncWrapper(requireOrganizationAdmin), asyncWrapper(teamController.createTeam))
router.get('/organization/:organizationId', authenticate, asyncWrapper(teamController.listOrganizationTeams))
router.post('/invite', authenticate, asyncWrapper(requireTeamOwnerOrAdmin), asyncWrapper(teamController.inviteMember))
router.post('/join', authenticate, asyncWrapper(teamController.joinPublicTeam))
router.post('/leave', authenticate, asyncWrapper(teamController.leaveTeam))
router.post('/remove', authenticate, asyncWrapper(requireTeamOwnerOrAdmin), asyncWrapper(teamController.removeMember))
router.patch('/member-role', authenticate, asyncWrapper(requireTeamOwnerOrAdmin), asyncWrapper(teamController.updateMemberRole))

// Wildcard :teamId routes
router.get('/:teamId', authenticate, asyncWrapper(requireTeamMember), asyncWrapper(teamController.getTeam))
router.patch('/:teamId', authenticate, asyncWrapper(requireTeamOwnerOrAdmin), asyncWrapper(teamController.updateTeam))
router.delete('/:teamId', authenticate, asyncWrapper(requireTeamOwnerOrAdmin), asyncWrapper(teamController.deleteTeam))
router.get('/:teamId/members', authenticate, asyncWrapper(requireTeamMember), asyncWrapper(teamController.getMembers))

export default router
