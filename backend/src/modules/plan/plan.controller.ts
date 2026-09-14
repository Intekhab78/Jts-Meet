import { Request, Response } from 'express'
import { AuthRequest } from '../../middleware/authMiddleware'
import { sendSuccess, sendError } from '../../utils/responseHelper'
import * as planService from './plan.service'

export const planController = {
    // Public endpoint for SaaS pricing matrix & self-serve upgrades
    getPublicPlans: async (req: Request, res: Response) => {
        try {
            const plans = await planService.getPublicPlans()
            return sendSuccess(res, plans, 'Public plans fetched successfully')
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to fetch public plans')
        }
    },

    // Super Admin: List all plans including archived
    getAllPlans: async (req: AuthRequest, res: Response) => {
        try {
            const includeArchived = req.query.includeArchived === 'true'
            const plans = await planService.getAllPlans(includeArchived)
            return sendSuccess(res, plans, 'All plans fetched successfully')
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to fetch plans')
        }
    },

    // Super Admin: Create new custom plan
    createPlan: async (req: AuthRequest, res: Response) => {
        try {
            const { name, priceMonthly } = req.body
            if (!name || priceMonthly === undefined) {
                return sendError(res, 400, 'Plan name and monthly price are required')
            }

            const created = await planService.createPlan(req.body)
            return sendSuccess(res, created, 'Plan created successfully')
        } catch (error: any) {
            return sendError(res, 400, error.message || 'Failed to create plan')
        }
    },

    // Super Admin: Update plan
    updatePlan: async (req: AuthRequest, res: Response) => {
        try {
            const rawPlanId = req.params.planId
            const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId
            if (!planId) {
                return sendError(res, 400, 'Plan ID is required')
            }

            const updated = await planService.updatePlan(planId, req.body)
            if (!updated) {
                return sendError(res, 404, 'Plan not found')
            }
            return sendSuccess(res, updated, 'Plan updated successfully')
        } catch (error: any) {
            return sendError(res, 400, error.message || 'Failed to update plan')
        }
    },

    // Super Admin: Delete plan
    deletePlan: async (req: AuthRequest, res: Response) => {
        try {
            const rawPlanId = req.params.planId
            const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId
            if (!planId) {
                return sendError(res, 400, 'Plan ID is required')
            }

            const deleted = await planService.deletePlan(planId)
            if (!deleted) {
                return sendError(res, 404, 'Plan not found')
            }
            return sendSuccess(res, null, 'Plan deleted successfully')
        } catch (error: any) {
            return sendError(res, 400, error.message || 'Failed to delete plan')
        }
    }
}
