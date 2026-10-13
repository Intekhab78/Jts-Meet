/**
 * ============================================================================
 * SuperAdmin Hub Unified Types & Interfaces
 * ============================================================================
 */

export type SuperAdminTab = 'tenants' | 'telemetry' | 'policies' | 'plans' | 'broadcast' | 'audit'

export interface SuperAdminMasterHubProps {
    token: string
    currentUserId: string
}

export interface TenantItem {
    _id: string
    name: string
    slug: string
    description?: string
    logo?: string
    owner?: { fullName: string; email: string; profileImage?: string }
    status: 'active' | 'inactive'
    timezone: string
    planTier: 'free' | 'starter' | 'enterprise'
    maxSeats: number
    usedSeats: number
    maxStorageGb: number
    usedStorageGb: number
    teamsCount: number
    meetingsCount: number
    createdAt: string
}

export interface TelemetryData {
    uptimeSeconds: number
    serverMemoryMb: number
    nodeVersion: string
    platformMetrics: {
        totalUsers: number
        totalOrgs: number
        activeOrgs: number
        activeConferences: number
        liveParticipants: number
        mediaBandwidthMbps: number
        signalingLatencyMs: number
    }
    liveRooms: {
        meetingId: string
        title: string
        hostName: string
        hostEmail: string
        participantsCount: number
        isRecording: boolean
        startedAt: string
    }[]
    activeBroadcast?: {
        message: string
        severity: 'info' | 'warning' | 'critical'
        createdAt: string
        active: boolean
    } | null
}

export interface PlanItem {
    _id?: string
    planId: string
    name: string
    badge: string
    description: string
    priceMonthly: number
    priceYearly: number
    currency: string
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
    featureBullets: string[]
    isPublic: boolean
    status: 'active' | 'archived'
    sortOrder: number
}

export interface PoliciesState {
    forceE2EE: boolean
    allowGuestAccess: boolean
    defaultScreenShare: 'anyone' | 'host_only'
    mandatoryWatermark: boolean
    waitingRoomDefault: boolean
    maintenanceMode: boolean
    maintenanceNotice: string

    // 1. Global AI Governor & Token Quota
    aiGlobalEnabled: boolean
    aiProvider: 'openai' | 'gemini' | 'anthropic' | 'custom'
    aiMaxTokensPerCall: number
    aiDailyQuotaPerTenant: number
    aiAllowFreeTier: boolean

    // 2. Enterprise IP Whitelisting & Geo-Fencing
    ipWhitelistEnabled: boolean
    allowedIpRanges: string[]
    geoBlockEnabled: boolean
    blockedCountries: string[]
    enforceIpOnAdminOnly: boolean

    // 3. Storage Vault & Retention Lifecycle
    storageRetentionDays: number
    autoPurgeRecordings: boolean
    storageProvider: 'local' | 's3' | 'cloudinary' | 'wasabi'
    storageBucketName: string

    // 4. SMTP Email & SMS Gateway
    smtpEnabled: boolean
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
    smtpUser: string
    smtpPass: string
    smtpFrom: string
    smsGatewayEnabled: boolean
    smsProvider: 'twilio' | 'msg91' | 'aws_sns'
}

export interface AuditLogItem {
    _id: string
    action: string
    details: string
    ipAddress?: string
    createdAt: string
    userId?: {
        fullName: string
        email: string
    }
}
