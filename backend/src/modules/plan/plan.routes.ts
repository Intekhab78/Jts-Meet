import { Router } from 'express'
import { planController } from './plan.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { requireSuperAdmin } from '../../middleware/adminMiddleware'

const router = Router()

// Public SaaS Pricing
router.get('/', asyncWrapper(planController.getPublicPlans))

// Super Admin Dynamic Plan Management
router.get('/admin', authenticate, requireSuperAdmin, asyncWrapper(planController.getAllPlans))
router.post('/admin', authenticate, requireSuperAdmin, asyncWrapper(planController.createPlan))
router.patch('/admin/:planId', authenticate, requireSuperAdmin, asyncWrapper(planController.updatePlan))
router.delete('/admin/:planId', authenticate, requireSuperAdmin, asyncWrapper(planController.deletePlan))

export default router
