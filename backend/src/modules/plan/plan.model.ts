import { Schema, model, Document } from 'mongoose'

export interface IPlanLimits {
    maxSeats: number
    maxStorageGb: number
    maxMeetingDurationMins: number // 0 means unlimited
    maxParticipantsPerCall: number
}

export interface IPlanFeatures {
    aiSummary: boolean
    cloudRecording: boolean
    whiteboard: boolean
    customBranding: boolean
    ssoLogin: boolean
    prioritySupport: boolean
}

export interface IPlan extends Document {
    planId: string
    name: string
    badge: string
    description: string
    priceMonthly: number
    priceYearly: number
    currency: string
    limits: IPlanLimits
    features: IPlanFeatures
    featureBullets: string[]
    isPublic: boolean
    isDefault?: boolean
    status: 'active' | 'archived'
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}

const PlanSchema = new Schema<IPlan>(
    {
        planId: { type: String, required: true, unique: true, trim: true, lowercase: true },
        name: { type: String, required: true, trim: true },
        badge: { type: String, default: 'Standard', trim: true },
        description: { type: String, default: '' },
        priceMonthly: { type: Number, required: true, default: 0 },
        priceYearly: { type: Number, required: true, default: 0 },
        currency: { type: String, default: 'USD', uppercase: true },
        limits: {
            maxSeats: { type: Number, default: 15 },
            maxStorageGb: { type: Number, default: 5 },
            maxMeetingDurationMins: { type: Number, default: 45 },
            maxParticipantsPerCall: { type: Number, default: 50 }
        },
        features: {
            aiSummary: { type: Boolean, default: false },
            cloudRecording: { type: Boolean, default: false },
            whiteboard: { type: Boolean, default: true },
            customBranding: { type: Boolean, default: false },
            ssoLogin: { type: Boolean, default: false },
            prioritySupport: { type: Boolean, default: false }
        },
        featureBullets: { type: [String], default: [] },
        isPublic: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: false },
        status: { type: String, enum: ['active', 'archived'], default: 'active' },
        sortOrder: { type: Number, default: 0 }
    },
    { timestamps: true }
)

export const Plan = model<IPlan>('Plan', PlanSchema)

export const DEFAULT_TIERS = [
    {
        planId: 'free',
        name: 'Starter Free',
        badge: 'Free Forever',
        description: 'Perfect for small teams, agile squads, and quick ad-hoc conferences.',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'USD',
        limits: {
            maxSeats: 15,
            maxStorageGb: 5,
            maxMeetingDurationMins: 45,
            maxParticipantsPerCall: 25
        },
        features: {
            aiSummary: false,
            cloudRecording: false,
            whiteboard: true,
            customBranding: false,
            ssoLogin: false,
            prioritySupport: false
        },
        featureBullets: [
            'Up to 15 Member Seats',
            '5 GB Cloud Storage Vault',
            '45-Minute Meeting Duration',
            'Collaborative Interactive Whiteboard',
            'HD WebRTC Peer Video & Audio'
        ],
        isPublic: true,
        isDefault: true,
        status: 'active' as const,
        sortOrder: 1
    },
    {
        planId: 'starter',
        name: 'Growth Pro',
        badge: 'Most Popular',
        description: 'Ideal for fast-scaling companies needing AI summaries and cloud recording.',
        priceMonthly: 49,
        priceYearly: 470,
        currency: 'USD',
        limits: {
            maxSeats: 50,
            maxStorageGb: 50,
            maxMeetingDurationMins: 0, // unlimited
            maxParticipantsPerCall: 100
        },
        features: {
            aiSummary: true,
            cloudRecording: true,
            whiteboard: true,
            customBranding: true,
            ssoLogin: false,
            prioritySupport: true
        },
        featureBullets: [
            'Up to 50 Member Seats',
            '50 GB High-Speed Cloud Recording Vault',
            'Unlimited Meeting Duration (24/7)',
            'Automatic AI Meeting Summaries & Action Items',
            'Cloud Recording & MP4 Downloads',
            'Custom Workspace Branding & Channels'
        ],
        isPublic: true,
        isDefault: false,
        status: 'active' as const,
        sortOrder: 2
    },
    {
        planId: 'enterprise',
        name: 'Enterprise Master',
        badge: 'Custom & Scalable',
        description: 'Dedicated enterprise infrastructure with SSO, compliance, and limitless scale.',
        priceMonthly: 199,
        priceYearly: 1990,
        currency: 'USD',
        limits: {
            maxSeats: 500,
            maxStorageGb: 500,
            maxMeetingDurationMins: 0, // unlimited
            maxParticipantsPerCall: 500
        },
        features: {
            aiSummary: true,
            cloudRecording: true,
            whiteboard: true,
            customBranding: true,
            ssoLogin: true,
            prioritySupport: true
        },
        featureBullets: [
            'Up to 500+ Member Seats',
            '500 GB Dedicated Enterprise Cloud Storage',
            'Unlimited Multi-Room HD Video & Breakouts',
            'Enterprise AI Note-taker & Real-Time Transcripts',
            'SAML / Google Workspace SSO Integration',
            'Dedicated 99.99% SLA & 24/7 Priority Support'
        ],
        isPublic: true,
        isDefault: false,
        status: 'active' as const,
        sortOrder: 3
    }
]

export async function seedDefaultPlans() {
    try {
        const count = await Plan.countDocuments()
        if (count === 0) {
            await Plan.insertMany(DEFAULT_TIERS)
            console.log('Default SaaS plans seeded successfully into MongoDB Atlas.')
        }
    } catch (err: any) {
        console.warn('Failed to seed default plans:', err?.message || err)
    }
}
