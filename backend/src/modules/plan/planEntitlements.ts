import { Types } from 'mongoose'
import { Organization } from '../organization/organization.model'
import { User } from '../../models/user.model'
import { isSuperAdminUser } from '../../middleware/adminMiddleware'
import { FileMetadata } from '../file/file.model'
import { Clip } from '../clip/clip.model'
import { DEFAULT_TIERS, IPlan } from './plan.model'
import { getPlanByPlanId } from './plan.service'

export interface EffectivePlan {
    planTier: string
    name: string
    priceMonthly: number
    priceYearly: number
    isPaid: boolean
    limits: {
        maxSeats: number
        maxStorageGb: number
        maxMeetingDurationMins: number
        maxParticipantsPerCall: number
    }
    features: {
        aiSummary: boolean
        cloudRecording: boolean
        whiteboard: boolean
        customBranding: boolean
        ssoLogin: boolean
        prioritySupport: boolean
    }
}

function toEffectivePlan(planTier: string, plan: Partial<IPlan> | null): EffectivePlan {
    const slug = (planTier || 'free').toLowerCase().trim()
    const fallback = DEFAULT_TIERS.find(t => t.planId === slug) || DEFAULT_TIERS[0]
    const limits = plan?.limits || fallback.limits
    const features = plan?.features || fallback.features
    const priceMonthly = Number(plan?.priceMonthly ?? fallback.priceMonthly ?? 0)
    const priceYearly = Number(plan?.priceYearly ?? fallback.priceYearly ?? 0)
    const isPaid = slug !== 'free' && (
        priceMonthly > 0 ||
        priceYearly > 0 ||
        ['starter', 'pro', 'enterprise'].includes(slug)
    )

    return {
        planTier: slug,
        name: String(plan?.name || fallback.name || slug),
        priceMonthly,
        priceYearly,
        isPaid,
        limits: {
            maxSeats: Number(limits?.maxSeats ?? fallback.limits.maxSeats),
            maxStorageGb: Number(limits?.maxStorageGb ?? fallback.limits.maxStorageGb),
            maxMeetingDurationMins: Number(limits?.maxMeetingDurationMins ?? fallback.limits.maxMeetingDurationMins),
            maxParticipantsPerCall: Number(limits?.maxParticipantsPerCall ?? fallback.limits.maxParticipantsPerCall)
        },
        features: {
            aiSummary: Boolean(features?.aiSummary ?? fallback.features.aiSummary),
            cloudRecording: Boolean(features?.cloudRecording ?? fallback.features.cloudRecording),
            whiteboard: Boolean(features?.whiteboard ?? fallback.features.whiteboard),
            customBranding: Boolean(features?.customBranding ?? fallback.features.customBranding),
            ssoLogin: Boolean(features?.ssoLogin ?? fallback.features.ssoLogin),
            prioritySupport: Boolean(features?.prioritySupport ?? fallback.features.prioritySupport)
        }
    }
}

export async function getEffectivePlanForOrg(orgId?: string | null): Promise<EffectivePlan> {
    let planTier = 'free'
    const orgOverrides: { maxSeats?: number; maxStorageGb?: number } = {}
    if (orgId && Types.ObjectId.isValid(orgId)) {
        try {
            const org = await Organization.findById(orgId).select('planTier maxSeats maxStorageGb').lean()
            if (org?.planTier) planTier = org.planTier.toLowerCase().trim()
            if (org?.maxSeats) orgOverrides.maxSeats = org.maxSeats
            if (org?.maxStorageGb) orgOverrides.maxStorageGb = org.maxStorageGb
        } catch (_) {}
    }

    const plan = await getPlanByPlanId(planTier).catch(() => null)
    const effective = toEffectivePlan(planTier, plan)
    if (orgOverrides.maxSeats) effective.limits.maxSeats = orgOverrides.maxSeats
    if (orgOverrides.maxStorageGb) effective.limits.maxStorageGb = orgOverrides.maxStorageGb
    return effective
}

export async function getEffectivePlanForUser(userId?: string | null, preferredOrgId?: string | null): Promise<EffectivePlan> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
        return toEffectivePlan('free', null)
    }

    try {
        const user = await User.findById(userId).select('isSuperAdmin role email').lean()
        if (user && isSuperAdminUser(user)) {
            const entPlan = await getPlanByPlanId('enterprise').catch(() => null)
            return toEffectivePlan('enterprise', entPlan)
        }

        const userObjectId = new Types.ObjectId(userId)
        const orgs = await Organization.find({
            status: 'active',
            $or: [
                { ownerId: userObjectId },
                { members: { $elemMatch: { userId: userObjectId, status: 'active' } } }
            ]
        })
            .select('_id planTier maxSeats maxStorageGb')
            .lean()

        if (!orgs || orgs.length === 0) {
            return toEffectivePlan('free', null)
        }

        if (preferredOrgId && Types.ObjectId.isValid(preferredOrgId)) {
            const preferredMatch = orgs.find(o => String(o._id) === String(preferredOrgId))
            if (preferredMatch) {
                return getEffectivePlanForOrg(String(preferredMatch._id))
            }
        }

        const resolvedPlans = await Promise.all(
            orgs.map(o => getEffectivePlanForOrg(String(o._id)))
        )

        resolvedPlans.sort((a, b) => {
            if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1
            if (b.priceMonthly !== a.priceMonthly) return b.priceMonthly - a.priceMonthly
            return b.limits.maxSeats - a.limits.maxSeats
        })

        return resolvedPlans[0]
    } catch (_) {
        return toEffectivePlan('free', null)
    }
}

export async function getStorageUsedBytes(userId?: string | null, orgId?: string | null): Promise<number> {
    try {
        const userObjectIds: Types.ObjectId[] = []

        if (orgId && Types.ObjectId.isValid(orgId)) {
            const org = await Organization.findById(orgId).select('ownerId members').lean()
            if (org) {
                if (org.ownerId && Types.ObjectId.isValid(String(org.ownerId))) {
                    userObjectIds.push(new Types.ObjectId(String(org.ownerId)))
                }
                for (const m of org.members || []) {
                    if (m.userId && m.status === 'active' && Types.ObjectId.isValid(String(m.userId))) {
                        userObjectIds.push(new Types.ObjectId(String(m.userId)))
                    }
                }
            }
        }

        if (userObjectIds.length === 0 && userId && Types.ObjectId.isValid(userId)) {
            userObjectIds.push(new Types.ObjectId(userId))
        }

        if (userObjectIds.length === 0) return 0

        const uniqueUserIds = Array.from(new Set(userObjectIds.map(id => String(id)))).map(id => new Types.ObjectId(id))

        const fileMatch: any = { deletedAt: null }
        if (orgId && Types.ObjectId.isValid(orgId)) {
            fileMatch.$or = [
                { organizationId: new Types.ObjectId(orgId) },
                { uploadedBy: { $in: uniqueUserIds } }
            ]
        } else {
            fileMatch.uploadedBy = { $in: uniqueUserIds }
        }

        const clipMatch: any = { senderId: { $in: uniqueUserIds } }

        const [fileAgg, clipAgg] = await Promise.all([
            FileMetadata.aggregate([
                { $match: fileMatch },
                { $group: { _id: null, totalSize: { $sum: '$size' } } }
            ]),
            Clip.aggregate([
                { $match: clipMatch },
                { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
            ])
        ])

        return Number(fileAgg[0]?.totalSize || 0) + Number(clipAgg[0]?.totalSize || 0)
    } catch (_) {
        return 0
    }
}
