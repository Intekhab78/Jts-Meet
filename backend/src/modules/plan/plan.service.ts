import fs from 'fs'
import path from 'path'
import { Plan, IPlan, DEFAULT_TIERS } from './plan.model'

const PLANS_FILE = path.join(process.cwd(), 'src', 'config', 'plans.json')

function loadFilePlans(): any[] {
    try {
        if (fs.existsSync(PLANS_FILE)) {
            const content = fs.readFileSync(PLANS_FILE, 'utf-8')
            return JSON.parse(content)
        }
    } catch (err) {
        console.warn('Failed to read plans.json:', err)
    }
    return DEFAULT_TIERS
}

function saveFilePlans(plans: any[]): void {
    try {
        fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8')
    } catch (err) {
        console.warn('Failed to write plans.json:', err)
    }
}

export async function getAllPlans(includeArchived = false): Promise<IPlan[]> {
    try {
        const query = includeArchived ? {} : { status: 'active' }
        const dbPlans = await Plan.find(query).sort({ sortOrder: 1, priceMonthly: 1 }).lean().exec()
        if (dbPlans && dbPlans.length > 0) {
            return dbPlans as unknown as IPlan[]
        }
    } catch (_) {
        // Fallback to resilient file store if Mongo collection limit is hit
    }

    const filePlans = loadFilePlans()
    return (includeArchived ? filePlans : filePlans.filter(p => p.status === 'active'))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) as unknown as IPlan[]
}

export async function getPublicPlans(): Promise<IPlan[]> {
    try {
        const dbPlans = await Plan.find({ status: 'active', isPublic: true }).sort({ sortOrder: 1, priceMonthly: 1 }).lean().exec()
        if (dbPlans && dbPlans.length > 0) {
            return dbPlans as unknown as IPlan[]
        }
    } catch (_) {
        // Fallback
    }

    const filePlans = loadFilePlans()
    return filePlans
        .filter(p => p.status === 'active' && p.isPublic !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) as unknown as IPlan[]
}

export async function getPlanByPlanId(planId: string): Promise<IPlan | null> {
    const slug = planId.toLowerCase().trim()
    try {
        const dbPlan = await Plan.findOne({ planId: slug }).lean().exec()
        if (dbPlan) return dbPlan as unknown as IPlan
    } catch (_) {
        // Fallback
    }

    const filePlans = loadFilePlans()
    const found = filePlans.find(p => p.planId === slug)
    return (found || null) as unknown as IPlan | null
}

export async function createPlan(data: Partial<IPlan>): Promise<IPlan> {
    const planId = (data.planId || data.name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')

    const filePlans = loadFilePlans()
    const existing = filePlans.find(p => p.planId === planId)
    if (existing) {
        throw new Error(`Plan with ID "${planId}" already exists. Please pick a unique identifier.`)
    }

    const newPlan: any = {
        planId,
        name: data.name?.trim() || 'Custom Plan',
        badge: data.badge?.trim() || 'New Tier',
        description: data.description?.trim() || '',
        priceMonthly: Number(data.priceMonthly ?? 0),
        priceYearly: Number(data.priceYearly ?? 0),
        currency: data.currency?.toUpperCase().trim() || 'USD',
        limits: {
            maxSeats: Number(data.limits?.maxSeats ?? 15),
            maxStorageGb: Number(data.limits?.maxStorageGb ?? 5),
            maxMeetingDurationMins: Number(data.limits?.maxMeetingDurationMins ?? 0),
            maxParticipantsPerCall: Number(data.limits?.maxParticipantsPerCall ?? 50)
        },
        features: {
            aiSummary: Boolean(data.features?.aiSummary),
            cloudRecording: Boolean(data.features?.cloudRecording),
            whiteboard: Boolean(data.features?.whiteboard ?? true),
            customBranding: Boolean(data.features?.customBranding),
            ssoLogin: Boolean(data.features?.ssoLogin),
            prioritySupport: Boolean(data.features?.prioritySupport)
        },
        featureBullets: Array.isArray(data.featureBullets) ? data.featureBullets : [],
        isPublic: data.isPublic !== false,
        status: data.status || 'active',
        sortOrder: Number(data.sortOrder || filePlans.length + 1),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    filePlans.push(newPlan)
    saveFilePlans(filePlans)

    try {
        const mongoPlan = new Plan(newPlan)
        await mongoPlan.save()
    } catch (_) {}

    return newPlan as IPlan
}

export async function updatePlan(planId: string, data: Partial<IPlan>): Promise<IPlan | null> {
    const slug = planId.toLowerCase().trim()
    const filePlans = loadFilePlans()
    const idx = filePlans.findIndex(p => p.planId === slug)
    if (idx === -1) return null

    const plan = filePlans[idx]

    if (data.name !== undefined) plan.name = data.name.trim()
    if (data.badge !== undefined) plan.badge = data.badge.trim()
    if (data.description !== undefined) plan.description = data.description.trim()
    if (data.priceMonthly !== undefined) plan.priceMonthly = Number(data.priceMonthly)
    if (data.priceYearly !== undefined) plan.priceYearly = Number(data.priceYearly)
    if (data.currency !== undefined) plan.currency = data.currency.toUpperCase().trim()

    if (data.limits) {
        plan.limits = {
            maxSeats: Number(data.limits.maxSeats ?? plan.limits.maxSeats),
            maxStorageGb: Number(data.limits.maxStorageGb ?? plan.limits.maxStorageGb),
            maxMeetingDurationMins: Number(data.limits.maxMeetingDurationMins ?? plan.limits.maxMeetingDurationMins),
            maxParticipantsPerCall: Number(data.limits.maxParticipantsPerCall ?? plan.limits.maxParticipantsPerCall)
        }
    }

    if (data.features) {
        plan.features = {
            aiSummary: Boolean(data.features.aiSummary ?? plan.features.aiSummary),
            cloudRecording: Boolean(data.features.cloudRecording ?? plan.features.cloudRecording),
            whiteboard: Boolean(data.features.whiteboard ?? plan.features.whiteboard),
            customBranding: Boolean(data.features.customBranding ?? plan.features.customBranding),
            ssoLogin: Boolean(data.features.ssoLogin ?? plan.features.ssoLogin),
            prioritySupport: Boolean(data.features.prioritySupport ?? plan.features.prioritySupport)
        }
    }

    if (Array.isArray(data.featureBullets)) {
        plan.featureBullets = data.featureBullets.filter((b: string) => typeof b === 'string' && b.trim().length > 0)
    }

    if (data.isPublic !== undefined) plan.isPublic = Boolean(data.isPublic)
    if (data.status !== undefined) plan.status = data.status
    if (data.sortOrder !== undefined) plan.sortOrder = Number(data.sortOrder)
    plan.updatedAt = new Date().toISOString()

    filePlans[idx] = plan
    saveFilePlans(filePlans)

    try {
        await Plan.updateOne({ planId: slug }, { $set: plan })
    } catch (_) {}

    return plan as IPlan
}

export async function deletePlan(planId: string): Promise<boolean> {
    const slug = planId.toLowerCase().trim()
    const filePlans = loadFilePlans()
    const nextPlans = filePlans.filter(p => p.planId !== slug)
    if (nextPlans.length === filePlans.length) return false

    saveFilePlans(nextPlans)

    try {
        await Plan.deleteOne({ planId: slug })
    } catch (_) {}

    return true
}
