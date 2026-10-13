import { API_BASE } from '../../config'

export interface AdminConsoleHubProps {
    token: string
    currentUserId: string
    currentOrgId?: string
    organizations: any[]
}

export interface LicenseMetrics {
    totalSeats: number
    usedSeats: number
    availableSeats: number
    tier: string
    utilizationRate: number
}

export interface StorageMetrics {
    totalQuotaGb: number
    usedGb: number
    percentage: number
    retentionPolicyDays: number
    cloudProvider: string
}

export interface AdminUser {
    userId: string
    fullName: string
    email: string
    role: string
    status: 'active' | 'pending' | 'suspended' | string
    joinedAt: string
    profileImage?: string
}

export interface AuditLog {
    _id: string
    createdAt: string
    action: string
    ipAddress?: string
    details: string
    userId?: {
        fullName?: string
        email?: string
    }
}

export interface AttendanceRecord {
    meetingId: string
    title: string
    hostName: string
    hostEmail: string
    date: string
    duration: string
    totalAttendees: number
}

export interface RecordingItem {
    _id: string
    meetingId: string
    title: string
    recordingUrl?: string
    createdAt: string
    duration: string
    sizeBytes: number
    host?: {
        fullName?: string
        email?: string
    }
    createdAtFormatted?: string
    fileSizeDisplay?: string
}

export interface PlanItem {
    id?: string
    planId?: string
    name: string
    description?: string
    price?: number
    priceMonthly?: number
    currency?: string
    billingPeriod?: string
    limits?: {
        maxSeats?: number
        maxStorageGb?: number
    }
    maxSeats?: number
    maxStorageGb?: number
    features?: string[]
    featureBullets?: string[]
    popular?: boolean
    badge?: string
}

export const resolveRecordingUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

export function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(1)} MB`
}
