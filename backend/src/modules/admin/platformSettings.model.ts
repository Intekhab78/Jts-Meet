import { Schema, model, Document } from 'mongoose'

export interface IPlatformSettings extends Document {
    key: string
    // Global Meeting Policies
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

    updatedAt: Date
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
    {
        key: { type: String, default: 'global_config', unique: true },
        // Global Meeting Policies
        forceE2EE: { type: Boolean, default: false },
        allowGuestAccess: { type: Boolean, default: true },
        defaultScreenShare: { type: String, enum: ['anyone', 'host_only'], default: 'anyone' },
        mandatoryWatermark: { type: Boolean, default: false },
        waitingRoomDefault: { type: Boolean, default: false },
        maintenanceMode: { type: Boolean, default: false },
        maintenanceNotice: { type: String, default: 'System maintenance in progress. New meetings are temporarily paused.' },

        // 1. Global AI Governor & Token Quota
        aiGlobalEnabled: { type: Boolean, default: true },
        aiProvider: { type: String, enum: ['openai', 'gemini', 'anthropic', 'custom'], default: 'gemini' },
        aiMaxTokensPerCall: { type: Number, default: 2048 },
        aiDailyQuotaPerTenant: { type: Number, default: 50000 },
        aiAllowFreeTier: { type: Boolean, default: false },

        // 2. Enterprise IP Whitelisting & Geo-Fencing
        ipWhitelistEnabled: { type: Boolean, default: false },
        allowedIpRanges: { type: [String], default: [] },
        geoBlockEnabled: { type: Boolean, default: false },
        blockedCountries: { type: [String], default: [] },
        enforceIpOnAdminOnly: { type: Boolean, default: true },

        // 3. Storage Vault & Retention Lifecycle
        storageRetentionDays: { type: Number, default: 60 },
        autoPurgeRecordings: { type: Boolean, default: false },
        storageProvider: { type: String, enum: ['local', 's3', 'cloudinary', 'wasabi'], default: 'local' },
        storageBucketName: { type: String, default: 'jts-recordings-vault' },

        // 4. SMTP Email & SMS Gateway
        smtpEnabled: { type: Boolean, default: true },
        smtpHost: { type: String, default: 'smtp.gmail.com' },
        smtpPort: { type: Number, default: 587 },
        smtpSecure: { type: Boolean, default: false },
        smtpUser: { type: String, default: '' },
        smtpPass: { type: String, default: '' },
        smtpFrom: { type: String, default: '"JTS-Meet Enterprise" <support@jtsmeet.com>' },
        smsGatewayEnabled: { type: Boolean, default: false },
        smsProvider: { type: String, enum: ['twilio', 'msg91', 'aws_sns'], default: 'twilio' }
    },
    { timestamps: true }
)

export const PlatformSettings = model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema)

