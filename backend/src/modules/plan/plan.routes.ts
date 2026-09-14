import { Router } from 'express'
import { planController } from './plan.controller'
import { asyncWrapper } from '../../utils/asyncWrapper'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin } from '../../middleware/adminMiddleware'

const router = Router()

// Public SaaS Pricing
router.get('/', asyncWrapper(planController.getPublicPlans))

// Super Admin Dynamic Plan Management
router.get('/admin', authenticate, requireAdmin, asyncWrapper(planController.getAllPlans))
router.post('/admin', authenticate, requireAdmin, asyncWrapper(planController.createPlan))
router.patch('/admin/:planId', authenticate, requireAdmin, asyncWrapper(planController.updatePlan))
router.delete('/admin/:planId', authenticate, requireAdmin, asyncWrapper(planController.deletePlan))

export default router
