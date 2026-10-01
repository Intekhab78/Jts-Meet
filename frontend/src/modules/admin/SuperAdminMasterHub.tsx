import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE } from '../../config'
import {
    IconGlobe,
    IconSparkles,
    IconBuilding,
    IconZap,
    IconCreditCard,
    IconBell,
    IconUsers,
    IconVideo,
    IconSettings,
    IconCheck,
    IconX,
    IconPlus,
    IconCrown,
    IconRefresh,
    IconClock,
    IconExternalLink,
    IconSearch,
    IconTrash,
    IconEdit,
    IconLock
} from '../../components/common/Icons'

interface SuperAdminMasterHubProps {
    token: string
    currentUserId: string
}

interface TenantItem {
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

interface TelemetryData {
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

export function SuperAdminMasterHub({ token }: SuperAdminMasterHubProps) {
    const [activeTab, setActiveTab] = useState<'tenants' | 'telemetry' | 'policies' | 'plans' | 'broadcast' | 'audit'>(() => {
        try {
            const saved = localStorage.getItem('jts_superadmin_tab')
            if (saved && ['tenants', 'telemetry', 'policies', 'plans', 'broadcast', 'audit'].includes(saved)) {
                return saved as any
            }
        } catch (_) { }
        return 'tenants'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_superadmin_tab', activeTab)
        } catch (_) { }
    }, [activeTab])

    // -------------------------------------------------------------
    // GLOBAL POLICIES & GOVERNANCE STATE (ZOOM / TEAMS STYLE)
    // -------------------------------------------------------------
    const [policies, setPolicies] = useState({
        forceE2EE: false,
        allowGuestAccess: true,
        defaultScreenShare: 'anyone' as 'anyone' | 'host_only',
        mandatoryWatermark: false,
        waitingRoomDefault: false,
        maintenanceMode: false,
        maintenanceNotice: 'System maintenance in progress. New meetings are temporarily paused.',

        // 1. Global AI Governor & Token Quota
        aiGlobalEnabled: true,
        aiProvider: 'gemini' as 'openai' | 'gemini' | 'anthropic' | 'custom',
        aiMaxTokensPerCall: 2048,
        aiDailyQuotaPerTenant: 50000,
        aiAllowFreeTier: false,

        // 2. Enterprise IP Whitelisting & Geo-Fencing
        ipWhitelistEnabled: false,
        allowedIpRanges: [] as string[],
        geoBlockEnabled: false,
        blockedCountries: [] as string[],
        enforceIpOnAdminOnly: true,

        // 3. Storage Vault & Retention Lifecycle
        storageRetentionDays: 60,
        autoPurgeRecordings: false,
        storageProvider: 'local' as 'local' | 's3' | 'cloudinary' | 'wasabi',
        storageBucketName: 'jts-recordings-vault',

        // 4. SMTP Email & SMS Gateway
        smtpEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        smtpFrom: '"JTS-Meet Enterprise" <support@jtsmeet.com>',
        smsGatewayEnabled: false,
        smsProvider: 'twilio' as 'twilio' | 'msg91' | 'aws_sns'
    })
    const [policiesLoading, setPoliciesLoading] = useState(false)
    const [savingPolicies, setSavingPolicies] = useState(false)

    // Helper states for IP & Geo-fencing tags
    const [ipInput, setIpInput] = useState('')
    const [countryInput, setCountryInput] = useState('')
    const [showSmtpPassword, setShowSmtpPassword] = useState(false)

    // SMTP Test state
    const [testEmailAddress, setTestEmailAddress] = useState('')
    const [testingSmtp, setTestingSmtp] = useState(false)
    const [smtpTestModalOpen, setSmtpTestModalOpen] = useState(false)
    const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null)

    // Storage Purge state
    const [purgingStorage, setPurgingStorage] = useState(false)
    const [storagePurgeResult, setStoragePurgeResult] = useState<any>(null)

    // Compliance export state
    const [exportingAudit, setExportingAudit] = useState(false)

    // -------------------------------------------------------------
    // AUDIT & COMPLIANCE LOGS STATE
    // -------------------------------------------------------------
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditFilter, setAuditFilter] = useState('all')
    const [auditPage, setAuditPage] = useState(1)
    const [auditTotal, setAuditTotal] = useState(0)

    // -------------------------------------------------------------
    // TENANTS DIRECTORY STATE
    // -------------------------------------------------------------
    const [tenants, setTenants] = useState<TenantItem[]>([])
    const [tenantsLoading, setTenantsLoading] = useState(false)
    const [tenantSearch, setTenantSearch] = useState('')
    const [tenantFilter, setTenantFilter] = useState<'all' | 'active' | 'inactive' | 'enterprise' | 'starter' | 'free'>('all')

    // Tenant Quota Edit Modal
    const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null)
    const [editTier, setEditTier] = useState<'free' | 'starter' | 'enterprise'>('enterprise')
    const [editSeats, setEditSeats] = useState(50)
    const [editStorageGb, setEditStorageGb] = useState(25)
    const [savingQuota, setSavingQuota] = useState(false)

    // -------------------------------------------------------------
    // TELEMETRY STATE
    // -------------------------------------------------------------
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
    const [telemetryLoading, setTelemetryLoading] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)

    // -------------------------------------------------------------
    // BROADCAST STATE
    // -------------------------------------------------------------
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'critical'>('warning')
    const [broadcastActive, setBroadcastActive] = useState(true)
    const [sendingBroadcast, setSendingBroadcast] = useState(false)

    // Notification Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3500)
    }

    // -------------------------------------------------------------
    // DYNAMIC SAAS PLANS & QUOTAS STATE
    // -------------------------------------------------------------
    const [plans, setPlans] = useState<PlanItem[]>([])
    const [plansLoading, setPlansLoading] = useState(false)
    const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)
    const [isCreatingNewPlan, setIsCreatingNewPlan] = useState(false)
    const [planForm, setPlanForm] = useState<any>({})
    const [bulletsInput, setBulletsInput] = useState('')
    const [savingPlan, setSavingPlan] = useState(false)

    // -------------------------------------------------------------
    // API CALLS
    // -------------------------------------------------------------
    const fetchTenants = async () => {
        setTenantsLoading(true)
        try {
            const query = new URLSearchParams()
            if (tenantSearch) query.set('search', tenantSearch)
            const res = await fetch(`${API_BASE}/api/admin/tenants?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setTenants(data.data || [])
            }
        } catch (err) {
            console.error('Failed to fetch platform tenants:', err)
        } finally {
            setTenantsLoading(false)
        }
    }

    const fetchTelemetry = async () => {
        setTelemetryLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/telemetry`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setTelemetry(data.data)
                if (data.data?.activeBroadcast) {
                    setBroadcastMsg(data.data.activeBroadcast.message || '')
                    setBroadcastSeverity(data.data.activeBroadcast.severity || 'warning')
                    setBroadcastActive(data.data.activeBroadcast.active !== false)
                }
            }
        } catch (err) {
            console.error('Failed to fetch telemetry:', err)
        } finally {
            setTelemetryLoading(false)
        }
    }

    const fetchPlans = async () => {
        setPlansLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/plans?includeArchived=true`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPlans(data.data || [])
            }
        } catch (err) {
            console.error('Failed to fetch SaaS plans:', err)
        } finally {
            setPlansLoading(false)
        }
    }

    const fetchPolicies = async () => {
        setPoliciesLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                if (json.data) {
                    setPolicies({
                        forceE2EE: Boolean(json.data.forceE2EE),
                        allowGuestAccess: json.data.allowGuestAccess !== false,
                        defaultScreenShare: json.data.defaultScreenShare || 'anyone',
                        mandatoryWatermark: Boolean(json.data.mandatoryWatermark),
                        waitingRoomDefault: Boolean(json.data.waitingRoomDefault),
                        maintenanceMode: Boolean(json.data.maintenanceMode),
                        maintenanceNotice: json.data.maintenanceNotice || 'System maintenance in progress. New meetings are temporarily paused.',

                        // AI Governor
                        aiGlobalEnabled: json.data.aiGlobalEnabled !== false,
                        aiProvider: json.data.aiProvider || 'gemini',
                        aiMaxTokensPerCall: Number(json.data.aiMaxTokensPerCall) || 2048,
                        aiDailyQuotaPerTenant: Number(json.data.aiDailyQuotaPerTenant) || 50000,
                        aiAllowFreeTier: Boolean(json.data.aiAllowFreeTier),

                        // IP Whitelisting & Geo-Fencing
                        ipWhitelistEnabled: Boolean(json.data.ipWhitelistEnabled),
                        allowedIpRanges: Array.isArray(json.data.allowedIpRanges) ? json.data.allowedIpRanges : [],
                        geoBlockEnabled: Boolean(json.data.geoBlockEnabled),
                        blockedCountries: Array.isArray(json.data.blockedCountries) ? json.data.blockedCountries : [],
                        enforceIpOnAdminOnly: json.data.enforceIpOnAdminOnly !== false,

                        // Storage Vault & Retention
                        storageRetentionDays: Number(json.data.storageRetentionDays) || 60,
                        autoPurgeRecordings: Boolean(json.data.autoPurgeRecordings),
                        storageProvider: json.data.storageProvider || 'local',
                        storageBucketName: json.data.storageBucketName || 'jts-recordings-vault',

                        // SMTP Gateway
                        smtpEnabled: json.data.smtpEnabled !== false,
                        smtpHost: json.data.smtpHost || 'smtp.gmail.com',
                        smtpPort: Number(json.data.smtpPort) || 587,
                        smtpSecure: Boolean(json.data.smtpSecure),
                        smtpUser: json.data.smtpUser || '',
                        smtpPass: json.data.smtpPass || '',
                        smtpFrom: json.data.smtpFrom || '"JTS-Meet Enterprise" <support@jtsmeet.com>',
                        smsGatewayEnabled: Boolean(json.data.smsGatewayEnabled),
                        smsProvider: json.data.smsProvider || 'twilio'
                    })
                }
            }
        } catch (err) {
            console.error('Failed to fetch platform policies:', err)
        } finally {
            setPoliciesLoading(false)
        }
    }

    const handleSavePolicies = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSavingPolicies(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(policies)
            })
            if (res.ok) {
                showToast('Global platform policies & infrastructure settings updated successfully!')
            } else {
                showToast('Failed to update platform policies.')
            }
        } catch (err) {
            console.error('Error saving policies:', err)
            showToast('Error saving policies.')
        } finally {
            setSavingPolicies(false)
        }
    }

    // 1. Tenant Impersonation Action Handler
    const handleImpersonateTenant = async (tenant: TenantItem) => {
        if (!window.confirm(`Initiate Enterprise Support Impersonation session for "${tenant.name}"? You will temporarily switch into their organization workspace.`)) return
        try {
            const res = await fetch(`${API_BASE}/api/admin/tenants/${tenant._id}/impersonate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const data = await res.json()
            if (res.ok && data.data?.token) {
                sessionStorage.setItem('jts_original_admin_token', token)
                sessionStorage.setItem('jts_impersonated_org_name', tenant.name)
                localStorage.setItem('token', data.data.token)
                showToast(`Switching to ${tenant.name} Support Session...`)
                setTimeout(() => {
                    window.location.hash = ''
                    window.location.reload()
                }, 800)
            } else {
                alert(data.message || 'Failed to initiate tenant impersonation session')
            }
        } catch (err: any) {
            alert(err?.message || 'Network error initiating tenant support session')
        }
    }

    // 2. SMTP Live Test Ping Handler
    const handleRunSmtpTest = async () => {
        setTestingSmtp(true)
        setSmtpTestResult(null)
        try {
            const res = await fetch(`${API_BASE}/api/admin/smtp/test`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ testEmail: testEmailAddress.trim() || undefined })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setSmtpTestResult({
                    success: true,
                    message: data.message || `Diagnostic handshake ping delivered successfully to ${data.data?.recipient || 'administrator email'}!`
                })
                showToast('SMTP Test ping delivered successfully!')
            } else {
                setSmtpTestResult({
                    success: false,
                    message: data.message || 'SMTP Handshake failed. Please verify credentials, host, and port.'
                })
            }
        } catch (err: any) {
            setSmtpTestResult({
                success: false,
                message: err?.message || 'Network error attempting SMTP test ping.'
            })
        } finally {
            setTestingSmtp(false)
        }
    }

    // 3. Storage Retention Purge Handler
    const handleRunStoragePurge = async () => {
        if (!window.confirm(`Execute Cloud Storage Retention Purge now? This will clean up archived conference assets older than ${policies.storageRetentionDays} days.`)) return
        setPurgingStorage(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/storage/purge-expired`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ retentionDays: policies.storageRetentionDays })
            })
            const data = await res.json()
            if (res.ok) {
                setStoragePurgeResult(data.data)
                showToast(`Storage Purge Completed: Cleared ${data.data.purgedCount} sessions (~${data.data.estimatedFreedMb} MB freed)`)
            } else {
                alert(data.message || 'Failed to execute storage purge')
            }
        } catch (err: any) {
            alert(err?.message || 'Network error running storage purge')
        } finally {
            setPurgingStorage(false)
        }
    }

    // 4. Compliance Data Export (CSV / JSON)
    const handleExportAuditLogs = async (format: 'csv' | 'json') => {
        setExportingAudit(true)
        try {
            const query = new URLSearchParams()
            query.set('format', format)
            if (auditFilter && auditFilter !== 'all') query.set('action', auditFilter)

            const res = await fetch(`${API_BASE}/api/admin/audit-logs/export?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Export request failed')

            if (format === 'csv') {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `jts-compliance-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(url)
                showToast('Compliance audit CSV downloaded successfully!')
            } else {
                const json = await res.json()
                const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `jts-compliance-audit-trail-${new Date().toISOString().slice(0, 10)}.json`
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(url)
                showToast('Compliance audit JSON downloaded successfully!')
            }
        } catch (err: any) {
            alert(err?.message || 'Failed to export compliance logs')
        } finally {
            setExportingAudit(false)
        }
    }

    // 5. IP & Geo-fencing Tag Helpers
    const handleAddIpRange = () => {
        const trimmed = ipInput.trim()
        if (!trimmed) return
        if (policies.allowedIpRanges.includes(trimmed)) return
        setPolicies({
            ...policies,
            allowedIpRanges: [...policies.allowedIpRanges, trimmed]
        })
        setIpInput('')
    }

    const handleRemoveIpRange = (ip: string) => {
        setPolicies({
            ...policies,
            allowedIpRanges: policies.allowedIpRanges.filter(item => item !== ip)
        })
    }

    const handleAddBlockedCountry = () => {
        const trimmed = countryInput.trim().toUpperCase()
        if (!trimmed) return
        if (policies.blockedCountries.includes(trimmed)) return
        setPolicies({
            ...policies,
            blockedCountries: [...policies.blockedCountries, trimmed]
        })
        setCountryInput('')
    }

    const handleRemoveBlockedCountry = (code: string) => {
        setPolicies({
            ...policies,
            blockedCountries: policies.blockedCountries.filter(item => item !== code)
        })
    }

    const fetchAuditLogs = async () => {
        setAuditLoading(true)
        try {
            const query = new URLSearchParams()
            query.set('page', String(auditPage))
            query.set('limit', '40')
            if (auditFilter && auditFilter !== 'all') query.set('action', auditFilter)

            const res = await fetch(`${API_BASE}/api/admin/audit-logs?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                setAuditLogs(json.data?.logs || [])
                setAuditTotal(json.data?.total || 0)
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err)
        } finally {
            setAuditLoading(false)
        }
    }

    const handleForceEndMeeting = async (meetingId: string, title?: string) => {
        const confirmed = window.confirm(`Are you sure you want to force terminate the meeting "${title || meetingId}"? All active participants will be immediately disconnected.`)
        if (!confirmed) return

        try {
            const res = await fetch(`${API_BASE}/api/admin/meetings/${encodeURIComponent(meetingId)}/terminate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Terminated by Super Administrator' })
            })

            if (res.ok) {
                showToast(`Meeting "${title || meetingId}" has been force terminated!`)
                fetchTelemetry()
            } else {
                showToast('Failed to terminate meeting.')
            }
        } catch (err) {
            console.error('Failed to terminate meeting:', err)
            showToast('Failed to terminate meeting.')
        }
    }

    useEffect(() => {
        if (activeTab === 'tenants') fetchTenants()
        if (activeTab === 'telemetry' || activeTab === 'broadcast') fetchTelemetry()
        if (activeTab === 'plans') fetchPlans()
        if (activeTab === 'policies') fetchPolicies()
        if (activeTab === 'audit') fetchAuditLogs()
    }, [activeTab, token, auditPage, auditFilter])

    // Auto-refresh telemetry every 5s if enabled
    useEffect(() => {
        if ((activeTab !== 'telemetry' && activeTab !== 'broadcast') || !autoRefresh) return
        const interval = setInterval(fetchTelemetry, 5000)
        return () => clearInterval(interval)
    }, [activeTab, autoRefresh, token])

    // Quota Handlers
    const handleOpenCreatePlan = () => {
        setIsCreatingNewPlan(true)
        setEditingPlan(null)
        const newPlan = {
            planId: '',
            name: '',
            badge: 'New Tier',
            description: '',
            priceMonthly: 29,
            priceYearly: 290,
            currency: 'USD',
            limits: {
                maxSeats: 30,
                maxStorageGb: 25,
                maxMeetingDurationMins: 0,
                maxParticipantsPerCall: 50
            },
            features: {
                aiSummary: true,
                cloudRecording: true,
                whiteboard: true,
                customBranding: false,
                ssoLogin: false,
                prioritySupport: false
            },
            featureBullets: [
                'Up to 30 Team Member Seats',
                '25 GB Cloud Recording Vault',
                'Unlimited HD Meetings (24/7)',
                'AI Summaries & Interactive Whiteboard'
            ],
            isPublic: true,
            status: 'active',
            sortOrder: plans.length + 1
        }
        setPlanForm(newPlan)
        setBulletsInput(newPlan.featureBullets.join('\n'))
    }

    const handleOpenEditPlan = (plan: PlanItem) => {
        setIsCreatingNewPlan(false)
        setEditingPlan(plan)
        setPlanForm(JSON.parse(JSON.stringify(plan)))
        setBulletsInput((plan.featureBullets || []).join('\n'))
    }

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!planForm.name?.trim()) {
            alert('Plan name is required')
            return
        }
        setSavingPlan(true)
        try {
            const formattedBullets = bulletsInput
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0)

            const payload = {
                ...planForm,
                featureBullets: formattedBullets
            }

            const url = isCreatingNewPlan
                ? `${API_BASE}/api/admin/plans`
                : `${API_BASE}/api/admin/plans/${editingPlan?.planId}`
            const method = isCreatingNewPlan ? 'POST' : 'PATCH'

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (res.ok && data.success) {
                showToast(isCreatingNewPlan ? `✓ Plan "${planForm.name}" created!` : `✓ Plan "${planForm.name}" updated!`)
                setEditingPlan(null)
                setIsCreatingNewPlan(false)
                fetchPlans()
            } else {
                alert(data.message || 'Failed to save plan')
            }
        } catch (err: any) {
            alert(err?.message || 'Error saving plan')
        } finally {
            setSavingPlan(false)
        }
    }

    const handleDeletePlan = async (plan: PlanItem) => {
        if (!window.confirm(`Are you sure you want to delete plan "${plan.name}"?`)) return
        try {
            const res = await fetch(`${API_BASE}/api/admin/plans/${plan.planId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok && data.success) {
                showToast(`✓ Plan "${plan.name}" deleted`)
                fetchPlans()
            } else {
                alert(data.message || 'Failed to delete plan')
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting plan')
        }
    }

    // Toggle Tenant Status (Active / Suspend)
    const handleToggleTenantStatus = async (tenant: TenantItem) => {
        const nextStatus = tenant.status === 'active' ? 'inactive' : 'active'
        const confirmMsg = nextStatus === 'inactive'
            ? `Are you sure you want to SUSPEND organization "${tenant.name}"? Members won't be able to start new meetings.`
            : `Are you sure you want to RE-ACTIVATE organization "${tenant.name}"?`

        if (!window.confirm(confirmMsg)) return

        try {
            const res = await fetch(`${API_BASE}/api/admin/tenants/${tenant._id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus })
            })
            if (res.ok) {
                showToast(`Organization "${tenant.name}" is now ${nextStatus === 'active' ? 'Active' : 'Suspended'}`)
                fetchTenants()
            } else {
                const data = await res.json()
                alert(data.message || 'Failed to update tenant status')
            }
        } catch (err: any) {
            alert(err?.message || 'Network error updating tenant')
        }
    }

    // Save Quota & Plan
    const handleSaveQuota = async () => {
        if (!editingTenant) return
        setSavingQuota(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/tenants/${editingTenant._id}/quota`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    planTier: editTier,
                    maxSeats: Number(editSeats),
                    maxStorageGb: Number(editStorageGb)
                })
            })
            if (res.ok) {
                showToast(`Plan & Quota updated for "${editingTenant.name}"`)
                setEditingTenant(null)
                fetchTenants()
            } else {
                const data = await res.json()
                alert(data.message || 'Failed to update quota')
            }
        } catch (err: any) {
            alert(err?.message || 'Network error updating quota')
        } finally {
            setSavingQuota(false)
        }
    }

    // Submit Platform Broadcast
    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!broadcastMsg.trim()) return
        setSendingBroadcast(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: broadcastMsg.trim(),
                    severity: broadcastSeverity,
                    active: broadcastActive
                })
            })
            if (res.ok) {
                showToast('Global platform broadcast published successfully!')
                fetchTelemetry()
            } else {
                const data = await res.json()
                alert(data.message || 'Failed to post broadcast notice')
            }
        } catch (err: any) {
            alert(err?.message || 'Network error posting broadcast')
        } finally {
            setSendingBroadcast(false)
        }
    }

    // Stop / Takedown Active Broadcast
    const handleStopBroadcast = async () => {
        if (!window.confirm('Are you sure you want to stop and takedown the active global broadcast banner across all meetings?')) return
        setSendingBroadcast(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: broadcastMsg || 'Broadcast deactivated',
                    severity: broadcastSeverity,
                    active: false
                })
            })
            if (res.ok) {
                setBroadcastActive(false)
                showToast('✓ Active broadcast banner taken down')
                fetchTelemetry()
            }
        } catch (err: any) {
            alert(err?.message || 'Network error stopping broadcast')
        } finally {
            setSendingBroadcast(false)
        }
    }

    // Filtered Tenants List
    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                t.slug.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                (t.owner?.email || '').toLowerCase().includes(tenantSearch.toLowerCase())

            if (!matchesSearch) return false
            if (tenantFilter === 'all') return true
            if (tenantFilter === 'active') return t.status === 'active'
            if (tenantFilter === 'inactive') return t.status === 'inactive'
            return t.planTier === tenantFilter
        })
    }, [tenants, tenantSearch, tenantFilter])

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24))
        const h = Math.floor((seconds % (3600 * 24)) / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${d}d ${h}h ${m}m`
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
            {/* Toast Banner */}
            {toastMessage && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff', padding: '12px 20px', borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <IconSparkles size={16} color="#fff" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header Title Card */}
            <div className="glass-card" style={{
                padding: '24px 28px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow-accent)', color: '#fff'
                    }}>
                        <IconGlobe size={24} color="#fff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                                Master Platform Center
                            </h1>
                            <span style={{
                                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#f87171', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                                padding: '2px 8px', borderRadius: 9999, letterSpacing: '0.05em'
                            }}>
                                Super Admin Exclusive
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Global multi-tenant governance, live WebRTC telemetry, and SaaS tier control.
                        </p>
                    </div>
                </div>

                {/* Top Level Quick Metrics */}
                {telemetry && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Tenants</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{telemetry.platformMetrics.totalOrgs}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Live Calls</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                                {telemetry.platformMetrics.activeConferences}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 12, overflowX: 'auto' }}>
                {[
                    { id: 'tenants', label: 'Tenant Directory (All Companies)', Icon: IconBuilding },
                    { id: 'telemetry', label: 'Live WebRTC Telemetry', Icon: IconZap },
                    { id: 'policies', label: 'Global Meeting Policies', Icon: IconSettings },
                    { id: 'plans', label: 'SaaS Plans & Quota Limits', Icon: IconCreditCard },
                    { id: 'broadcast', label: 'Global Platform Broadcast', Icon: IconBell },
                    { id: 'audit', label: 'Audit & Compliance Trail', Icon: IconLock }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <tab.Icon size={16} color={activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)'} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* TAB 1: TENANT DIRECTORY */}
            {activeTab === 'tenants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Controls Bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260 }}>
                            <input
                                type="text"
                                value={tenantSearch}
                                onChange={(e) => setTenantSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchTenants()}
                                placeholder="Search organization name, slug, or owner email..."
                                className="input"
                                style={{ background: 'var(--color-surface-2)', maxWidth: 380, fontSize: '0.85rem' }}
                            />
                            <button onClick={fetchTenants} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                Search
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            {(['all', 'active', 'inactive', 'enterprise', 'starter', 'free'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTenantFilter(f)}
                                    style={{
                                        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                        border: tenantFilter === f ? '1px solid #6366f1' : '1px solid var(--color-border)',
                                        background: tenantFilter === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                        color: tenantFilter === f ? '#fff' : 'var(--color-text-secondary)',
                                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                        <th style={{ padding: '14px 16px', fontWeight: 700 }}>ORGANIZATION</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 700 }}>OWNER</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 700 }}>PLAN TIER</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 700 }}>SEATS</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 700 }}>TEAMS / MTGS</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 700 }}>STATUS</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenantsLoading ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                Loading platform tenants...
                                            </td>
                                        </tr>
                                    ) : filteredTenants.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No organizations found matching the criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTenants.map(t => (
                                            <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{t.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                        slug: <span style={{ color: '#a5b4fc' }}>{t.slug}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ color: '#fff', fontWeight: 600 }}>{t.owner?.fullName || 'Platform Creator'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.owner?.email || 'N/A'}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '3px 8px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 800,
                                                        textTransform: 'uppercase', letterSpacing: '0.04em',
                                                        background: t.planTier === 'enterprise' ? 'rgba(99,102,241,0.2)' : t.planTier === 'starter' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)',
                                                        color: t.planTier === 'enterprise' ? '#818cf8' : t.planTier === 'starter' ? '#60a5fa' : '#9ca3af',
                                                        border: `1px solid ${t.planTier === 'enterprise' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {t.planTier}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontWeight: 600, color: '#fff' }}>{t.usedSeats} / {t.maxSeats}</div>
                                                    <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.min(100, (t.usedSeats / t.maxSeats) * 100)}%`, height: '100%', background: '#6366f1' }} />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <IconUsers size={14} color="#818cf8" />
                                                        <span>{t.teamsCount} Teams</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                        <IconVideo size={13} color="#71717a" />
                                                        <span>{t.meetingsCount} Conferences</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '4px 10px',
                                                        borderRadius: 9999,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        background: t.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                        color: t.status === 'active' ? '#34d399' : '#f87171',
                                                        border: `1px solid ${t.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        <span style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: t.status === 'active' ? '#10b981' : '#ef4444',
                                                            boxShadow: t.status === 'active' ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                                                            flexShrink: 0
                                                        }} />
                                                        {t.status === 'active' ? 'Active' : 'Suspended'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                        <button
                                                            onClick={() => handleImpersonateTenant(t)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                borderRadius: 'var(--radius-sm)',
                                                                border: '1px solid rgba(99,102,241,0.4)',
                                                                background: 'rgba(99,102,241,0.15)',
                                                                color: '#c7d2fe',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5
                                                            }}
                                                            title={`Enterprise Support Login: Assume session for ${t.name}`}
                                                        >
                                                            <span>👁️ Support Login</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingTenant(t)
                                                                setEditTier(t.planTier)
                                                                setEditSeats(t.maxSeats)
                                                                setEditStorageGb(t.maxStorageGb)
                                                            }}
                                                            className="btn btn-ghost"
                                                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                                            title="Edit Plan Tier & Quota"
                                                        >
                                                            <IconSettings size={12} />
                                                            <span>Edit Quota</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleTenantStatus(t)}
                                                            style={{
                                                                padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                                                                border: t.status === 'active' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)',
                                                                background: t.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                color: t.status === 'active' ? '#f87171' : '#34d399',
                                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                                            }}
                                                        >
                                                            {t.status === 'active' ? 'Suspend' : 'Activate'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: LIVE TELEMETRY & WEBRTC HEALTH */}
            {activeTab === 'telemetry' && telemetry && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Real-time Health Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #10b981' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Live Conferences</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                                {telemetry.platformMetrics.activeConferences}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#34d399' }}>● WebRTC SFU Mesh Active</div>
                        </div>

                        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #6366f1' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Live Stream Participants</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                                {telemetry.platformMetrics.liveParticipants}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#818cf8' }}>Bandwidth: ~{telemetry.platformMetrics.mediaBandwidthMbps} Mbps</div>
                        </div>

                        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Signaling Latency</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                                {telemetry.platformMetrics.signalingLatencyMs} ms
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>Socket Engine: Ultra Low Latency</div>
                        </div>

                        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #ec4899' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Server Node Uptime</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
                                {formatUptime(telemetry.uptimeSeconds)}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Memory: {telemetry.serverMemoryMb} MB (Node {telemetry.nodeVersion})</div>
                        </div>
                    </div>

                    {/* Active Live Rooms List */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)' }} />
                                <span>Live Active Conference Rooms ({telemetry.liveRooms.length})</span>
                            </h3>
                            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                />
                                Auto-refresh (every 5s)
                            </label>
                        </div>

                        {telemetry.liveRooms.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                                No active meetings running right now across the platform.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                                {telemetry.liveRooms.map(room => (
                                    <div key={room.meetingId} style={{
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, color: '#fff' }}>{room.title}</span>
                                            {room.isRecording && (
                                                <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                                                    REC ●
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                            Host: <strong style={{ color: '#fff' }}>{room.hostName}</strong> ({room.hostEmail})
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                            Meeting ID: <code style={{ color: '#818cf8' }}>{room.meetingId}</code>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                <IconUsers size={14} color="#34d399" />
                                                <span>{room.participantsCount} Connected</span>
                                            </span>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <a
                                                    href={`/meet/${room.meetingId}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    <span>Inspect</span>
                                                    <IconExternalLink size={11} />
                                                </a>
                                                <button
                                                    onClick={() => handleForceEndMeeting(room.meetingId, room.title)}
                                                    className="btn btn-ghost"
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        padding: '3px 10px',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                                        color: '#f87171',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Force terminate this active conference immediately"
                                                >
                                                    <span>Force End</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: SAAS PLANS & QUOTA MATRIX (DYNAMIC ATLAS BACKED) */}
            {activeTab === 'plans' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Header Action Bar */}
                    <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconCrown size={18} color="#fbbf24" />
                                <span>Live SaaS Subscription Plans & Tier Limits</span>
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Configure prices, member seats, storage vaults, and AI/recording feature flags dynamically.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                                type="button"
                                onClick={fetchPlans}
                                disabled={plansLoading}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                            >
                                {plansLoading ? 'Refreshing...' : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <IconRefresh size={13} />
                                        <span>Sync Plans</span>
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenCreatePlan}
                                className="btn btn-primary"
                                style={{ fontSize: '0.8rem', padding: '6px 16px', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <IconPlus size={13} color="#fff" />
                                    <span>Create New Plan</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Plans Grid */}
                    {plansLoading && plans.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            <div className="animate-spin" style={{ width: 24, height: 24, margin: '0 auto 12px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                            Loading dynamic tiers from database...
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                            {plans.map((plan) => {
                                const isArchived = plan.status === 'archived'
                                const isEnterprise = plan.planId === 'enterprise'
                                const isGrowth = plan.planId === 'starter'

                                return (
                                    <div
                                        key={plan.planId}
                                        className="glass-card"
                                        style={{
                                            padding: 24,
                                            borderRadius: 16,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 16,
                                            position: 'relative',
                                            border: isEnterprise
                                                ? '1px solid rgba(99,102,241,0.45)'
                                                : isGrowth
                                                    ? '1px solid rgba(59,130,246,0.35)'
                                                    : '1px solid rgba(255,255,255,0.08)',
                                            background: isEnterprise
                                                ? 'linear-gradient(135deg, rgba(99,102,241,0.09) 0%, rgba(168,85,247,0.06) 100%)'
                                                : 'rgba(255,255,255,0.02)',
                                            opacity: isArchived ? 0.6 : 1
                                        }}
                                    >
                                        {/* Top Card Title & Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                                                        {plan.name}
                                                    </h3>
                                                    {plan.badge && (
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 9999,
                                                            background: isEnterprise ? 'rgba(99,102,241,0.2)' : 'rgba(59,130,246,0.15)',
                                                            color: isEnterprise ? '#a5b4fc' : '#60a5fa',
                                                            border: `1px solid ${isEnterprise ? 'rgba(99,102,241,0.4)' : 'rgba(59,130,246,0.3)'}`
                                                        }}>
                                                            {plan.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                                    ID: <code>{plan.planId}</code>
                                                </div>
                                            </div>

                                            <span style={{
                                                fontSize: '0.68rem',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                fontWeight: 700,
                                                background: plan.isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: plan.isPublic ? '#4ade80' : '#f87171'
                                            }}>
                                                {plan.isPublic ? 'PUBLIC' : 'PRIVATE'}
                                            </span>
                                        </div>

                                        {/* Price Tag */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>
                                                ${plan.priceMonthly}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                / month
                                            </span>
                                            {plan.priceYearly > 0 && (
                                                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', marginLeft: 6 }}>
                                                    (${plan.priceYearly}/yr)
                                                </span>
                                            )}
                                        </div>

                                        {plan.description && (
                                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                                {plan.description}
                                            </p>
                                        )}

                                        {/* Quotas Box */}
                                        <div style={{
                                            background: 'rgba(0,0,0,0.25)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 10,
                                            padding: '10px 14px',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 8,
                                            fontSize: '0.78rem'
                                        }}>
                                            <div>
                                                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>SEATS LIMIT</span>
                                                <strong style={{ color: '#fff', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <IconUsers size={13} color="#a5b4fc" />
                                                    <span>{plan.limits?.maxSeats} Members</span>
                                                </strong>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>CLOUD STORAGE</span>
                                                <strong style={{ color: '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <IconVideo size={13} color="#60a5fa" />
                                                    <span>{plan.limits?.maxStorageGb} GB</span>
                                                </strong>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>CALL DURATION</span>
                                                <strong style={{ color: '#34d399', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <IconClock size={13} color="#34d399" />
                                                    <span>{plan.limits?.maxMeetingDurationMins === 0 ? 'Unlimited' : `${plan.limits?.maxMeetingDurationMins}m`}</span>
                                                </strong>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>ROOM CAPACITY</span>
                                                <strong style={{ color: '#c084fc', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <IconVideo size={13} color="#c084fc" />
                                                    <span>{plan.limits?.maxParticipantsPerCall || 50} Max</span>
                                                </strong>
                                            </div>
                                        </div>

                                        {/* Feature Flags Chips */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            <span style={{
                                                fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
                                                background: plan.features?.aiSummary ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                                                color: plan.features?.aiSummary ? '#818cf8' : '#71717a',
                                                display: 'inline-flex', alignItems: 'center', gap: 5
                                            }}>
                                                {plan.features?.aiSummary ? <IconCheck size={11} color="#818cf8" /> : <IconX size={10} color="#71717a" />}
                                                <span>AI Summary</span>
                                            </span>
                                            <span style={{
                                                fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
                                                background: plan.features?.cloudRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                                                color: plan.features?.cloudRecording ? '#f87171' : '#71717a',
                                                display: 'inline-flex', alignItems: 'center', gap: 5
                                            }}>
                                                {plan.features?.cloudRecording ? <IconCheck size={11} color="#f87171" /> : <IconX size={10} color="#71717a" />}
                                                <span>Recording</span>
                                            </span>
                                            <span style={{
                                                fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
                                                background: plan.features?.whiteboard ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                                                color: plan.features?.whiteboard ? '#4ade80' : '#71717a',
                                                display: 'inline-flex', alignItems: 'center', gap: 5
                                            }}>
                                                {plan.features?.whiteboard ? <IconCheck size={11} color="#4ade80" /> : <IconX size={10} color="#71717a" />}
                                                <span>Whiteboard</span>
                                            </span>
                                            <span style={{
                                                fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
                                                background: plan.features?.ssoLogin ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                                                color: plan.features?.ssoLogin ? '#c084fc' : '#71717a',
                                                display: 'inline-flex', alignItems: 'center', gap: 5
                                            }}>
                                                {plan.features?.ssoLogin ? <IconCheck size={11} color="#c084fc" /> : <IconX size={10} color="#71717a" />}
                                                <span>SAML / SSO</span>
                                            </span>
                                        </div>

                                        {/* Bullets */}
                                        {plan.featureBullets && plan.featureBullets.length > 0 && (
                                            <ul style={{ paddingLeft: 18, margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {plan.featureBullets.map((b, i) => (
                                                    <li key={i}>{b}</li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            {plan.planId !== 'free' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePlan(plan)}
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: '0.75rem', color: '#f87171', padding: '4px 8px' }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditPlan(plan)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.78rem', padding: '4px 14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                            >
                                                <IconSettings size={12} />
                                                <span>Edit Plan</span>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: GLOBAL BROADCAST COMMAND CENTER */}
            {activeTab === 'broadcast' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, alignItems: 'start', width: '100%' }}>
                    {/* Left Column: Broadcast Composer */}
                    <div className="glass-card" style={{ padding: '24px 26px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconBell size={18} color="#fbbf24" />
                                <span>Platform-Wide Global Broadcast Center</span>
                            </h3>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Push instant real-time announcement banners to all active conferences, dashboards, and connected tenant organizations.
                            </p>
                        </div>

                        {/* Quick One-Click Announcement Templates */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                One-Click Announcement Templates:
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                {[
                                    {
                                        label: 'Scheduled Maintenance',
                                        icon: '🛠️',
                                        severity: 'warning' as const,
                                        text: 'Scheduled system infrastructure maintenance tonight from 02:00 to 03:00 UTC. Live video conferences will remain connected.'
                                    },
                                    {
                                        label: 'AI & Remote Control Release',
                                        icon: '🚀',
                                        severity: 'info' as const,
                                        text: 'New feature update! Google Gemini AI meeting summaries, live captions, and AnyDesk-style native remote control are now active.'
                                    },
                                    {
                                        label: 'Peak Traffic Advisory',
                                        icon: '⚡',
                                        severity: 'warning' as const,
                                        text: 'High conference volume detected across global media nodes. All media relays and telephony bridges are performing normally.'
                                    },
                                    {
                                        label: 'Security & Compliance Patch',
                                        icon: '🛡️',
                                        severity: 'critical' as const,
                                        text: 'Enterprise security update deployed. If prompted, please refresh your browser tab or restart your desktop client.'
                                    },
                                    {
                                        label: 'All Systems Operational',
                                        icon: '🟢',
                                        severity: 'info' as const,
                                        text: 'All global WebRTC media servers, audio dial-in bridges, and recording vaults are operating at 100% health.'
                                    }
                                ].map((tpl) => (
                                    <button
                                        key={tpl.label}
                                        type="button"
                                        onClick={() => {
                                            setBroadcastMsg(tpl.text)
                                            setBroadcastSeverity(tpl.severity)
                                            setBroadcastActive(true)
                                        }}
                                        style={{
                                            padding: '6px 11px',
                                            borderRadius: 7,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            color: '#e4e4e7',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#6366F1'
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                                        }}
                                    >
                                        <span>{tpl.icon}</span>
                                        <span>{tpl.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Broadcast Text Input */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                        Broadcast Notice Message <span style={{ color: '#f87171' }}>*</span>
                                    </label>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        {broadcastMsg.length} characters
                                    </span>
                                </div>
                                <textarea
                                    value={broadcastMsg}
                                    onChange={(e) => setBroadcastMsg(e.target.value)}
                                    placeholder="Enter public alert announcement text that will be displayed across meeting rooms and user dashboards..."
                                    rows={4}
                                    className="input"
                                    style={{
                                        background: 'rgba(15, 17, 26, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: 8,
                                        width: '100%',
                                        fontSize: '0.85rem',
                                        color: '#fff',
                                        padding: '10px 14px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                    required
                                />
                            </div>

                            {/* Severity Level Cards */}
                            <div>
                                <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                                    Notice Urgency & Severity Level:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                    {[
                                        { id: 'info', label: 'Info (Blue)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', desc: 'General news, tips, new features' },
                                        { id: 'warning', label: 'Warning (Amber)', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', desc: 'Scheduled maintenance, advisory' },
                                        { id: 'critical', label: 'Critical (Red)', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', desc: 'Urgent security, incident alerts' }
                                    ].map((s) => {
                                        const isSelected = broadcastSeverity === s.id
                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => setBroadcastSeverity(s.id as any)}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 8,
                                                    border: isSelected ? `1.5px solid ${s.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: isSelected ? s.bg : 'rgba(255, 255, 255, 0.02)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 3,
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8125rem', color: isSelected ? s.color : '#fff' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                                                    <span>{s.label}</span>
                                                </div>
                                                <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>
                                                    {s.desc}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Active Broadcasting Toggle */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                        Enable & Stream Banner Live
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        When checked, the alert banner is pushed in real time via WebSockets to all connected clients.
                                    </div>
                                </div>
                                <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={broadcastActive}
                                        onChange={(e) => setBroadcastActive(e.target.checked)}
                                        style={{ display: 'none' }}
                                    />
                                    <div
                                        style={{
                                            width: 44,
                                            height: 24,
                                            borderRadius: 12,
                                            background: broadcastActive ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                            position: 'relative',
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                position: 'absolute',
                                                top: 3,
                                                left: broadcastActive ? 23 : 3,
                                                transition: 'left 0.2s ease'
                                            }}
                                        />
                                    </div>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBroadcastMsg('')
                                        setBroadcastActive(false)
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#a1a4c9',
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Clear Text
                                </button>

                                <button
                                    type="submit"
                                    disabled={sendingBroadcast}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '10px 24px',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                        border: 'none',
                                        borderRadius: 8,
                                        color: '#fff',
                                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                                        cursor: sendingBroadcast ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}
                                >
                                    {sendingBroadcast ? 'Publishing Notice...' : (
                                        <>
                                            <IconBell size={15} color="#fff" />
                                            <span>Publish Global Announcement</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Live WYSIWYG Preview & Platform Reach */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Live WYSIWYG Banner Preview Card */}
                        <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>📺 Live WYSIWYG Banner Preview</span>
                                </h4>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: broadcastActive ? 'rgba(34, 197, 94, 0.18)' : 'rgba(113, 113, 122, 0.2)',
                                        color: broadcastActive ? '#4ade80' : '#a1a1aa',
                                        border: `1px solid ${broadcastActive ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}
                                >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: broadcastActive ? '#4ade80' : '#a1a1aa' }} />
                                    <span>{broadcastActive ? 'ON AIR' : 'DRAFT'}</span>
                                </span>
                            </div>

                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                Real-time replica of how the alert ticker renders at the top of active video conference rooms and dashboards:
                            </p>

                            {/* Live Replica Render */}
                            <div
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    background: broadcastSeverity === 'critical'
                                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(153, 27, 27, 0.35) 100%)'
                                        : broadcastSeverity === 'warning'
                                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.35) 100%)'
                                            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(29, 78, 216, 0.35) 100%)',
                                    border: `1px solid ${broadcastSeverity === 'critical'
                                            ? 'rgba(239, 68, 68, 0.45)'
                                            : broadcastSeverity === 'warning'
                                                ? 'rgba(245, 158, 11, 0.45)'
                                                : 'rgba(59, 130, 246, 0.45)'
                                        }`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 8,
                                            background: broadcastSeverity === 'critical' ? '#ef4444' : broadcastSeverity === 'warning' ? '#f59e0b' : '#3b82f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            flexShrink: 0
                                        }}
                                    >
                                        <IconBell size={14} />
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>
                                        {broadcastMsg.trim() || 'No announcement message specified yet. Type your notice on the left or pick a template.'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: 6,
                                        width: 22,
                                        height: 22,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    <IconX size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Real-time Audience Telemetry & Broadcast Reach */}
                        <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IconZap size={16} color="#6366f1" />
                                    <span>Real-Time Platform Audience Reach</span>
                                </h4>
                                <button
                                    type="button"
                                    onClick={fetchTelemetry}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    <IconRefresh size={12} /> Refresh
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Live Participants</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80', marginTop: 2 }}>
                                        {telemetry?.platformMetrics?.liveParticipants || 0}
                                    </div>
                                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Connected on WebRTC</div>
                                </div>

                                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Active Meetings</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#818cf8', marginTop: 2 }}>
                                        {telemetry?.platformMetrics?.activeConferences || 0}
                                    </div>
                                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Live video rooms</div>
                                </div>

                                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tenant Companies</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                                        {telemetry?.platformMetrics?.totalOrgs || tenants.length || 0}
                                    </div>
                                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Active SaaS workspaces</div>
                                </div>

                                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Users</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                                        {telemetry?.platformMetrics?.totalUsers || 0}
                                    </div>
                                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Registered accounts</div>
                                </div>
                            </div>
                        </div>

                        {/* Active Broadcast Governance, One-Click Takedown & Target Channels */}
                        <div className="glass-card" style={{ padding: '20px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IconLock size={15} color="#818cf8" />
                                    <span>Active Broadcast Governance & Controls</span>
                                </h4>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: broadcastActive && broadcastMsg.trim() ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    color: broadcastActive && broadcastMsg.trim() ? '#4ade80' : '#a1a1aa',
                                    border: `1px solid ${broadcastActive && broadcastMsg.trim() ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
                                }}>
                                    {broadcastActive && broadcastMsg.trim() ? '● LIVE BROADCASTING' : 'IDLE / STANDBY'}
                                </span>
                            </div>

                            {/* Live Status Summary */}
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        Current Target Scope
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                                        All Global Tenants & Live Peer Conferences
                                    </div>
                                </div>
                                {broadcastActive && broadcastMsg.trim() ? (
                                    <button
                                        type="button"
                                        onClick={handleStopBroadcast}
                                        disabled={sendingBroadcast}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            color: '#f87171',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <IconX size={13} color="#f87171" />
                                        <span>Takedown Broadcast</span>
                                    </button>
                                ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#71717a' }}>No active banner live</span>
                                )}
                            </div>

                            {/* Active Delivery Channels Matrix */}
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                                    Broadcasting Channels & Relays:
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {[
                                        { name: 'Live Conference Ticker', icon: '🎥', status: 'Active' },
                                        { name: 'Web Dashboard Banner', icon: '🌐', status: 'Active' },
                                        { name: 'Desktop App Tray Alert', icon: '💻', status: 'Active' },
                                        { name: 'WebSocket Relay', icon: '⚡', status: 'Active' }
                                    ].map(ch => (
                                        <div
                                            key={ch.name}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e7', fontWeight: 500 }}>
                                                <span>{ch.icon}</span>
                                                <span>{ch.name}</span>
                                            </span>
                                            <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.7rem' }}>✓</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: GLOBAL MEETING POLICIES & GOVERNANCE (ZOOM / TEAMS STYLE) */}
            {activeTab === 'policies' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Header Action Bar */}
                    <div className="glass-card" style={{ padding: '20px 24px', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconSettings size={18} color="#818cf8" />
                                <span>Platform-Wide Meeting Policies & Security Governance</span>
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Enforce global encryption standards, guest permissions, watermarking, and emergency lockdown controls.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                                type="button"
                                onClick={fetchPolicies}
                                disabled={policiesLoading}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                            >
                                <IconRefresh size={13} />
                                <span>Reload</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSavePolicies()}
                                disabled={savingPolicies}
                                className="btn btn-primary"
                                style={{
                                    fontSize: '0.85rem',
                                    padding: '8px 20px',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <IconCheck size={14} color="#fff" />
                                <span>{savingPolicies ? 'Saving Policies...' : 'Save & Enforce Policies'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Policy Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                        {/* 1. Force E2EE */}
                        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.forceE2EE ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconLock size={18} color="#c084fc" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Mandatory End-to-End Encryption (E2EE)</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>AES-256 GCM Media Frame Encryption</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policies.forceE2EE}
                                    onChange={(e) => setPolicies({ ...policies, forceE2EE: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                When enabled, all video and audio calls across all tenant organizations must use client-side cryptographic key ratcheting. Server relay cannot decrypt conference contents.
                            </p>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.forceE2EE ? '#c084fc' : '#71717a' }}>
                                Status: {policies.forceE2EE ? '● ENFORCED PLATFORM-WIDE' : '○ Optional per-meeting'}
                            </div>
                        </div>

                        {/* 2. Allow External Guest Access */}
                        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconUsers size={18} color="#60a5fa" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>External Guest Join Access</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Anonymous & link-based participants</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policies.allowGuestAccess}
                                    onChange={(e) => setPolicies({ ...policies, allowGuestAccess: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Allows non-registered participants to join meetings using instant display names. Disabling this enforces that only authenticated enterprise members can access room links.
                            </p>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.allowGuestAccess ? '#60a5fa' : '#ef4444' }}>
                                Status: {policies.allowGuestAccess ? '● GUEST ACCESS ENABLED' : '● RESTRICTED (MEMBERS ONLY)'}
                            </div>
                        </div>

                        {/* 3. Screen Sharing Default Permission */}
                        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconVideo size={18} color="#4ade80" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Screen Sharing Default Permission</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Presentation & annotation privilege</div>
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Sets the baseline screen sharing privilege when new conferences start. Hosts can still manually grant presentation rights inside the meeting room.
                            </p>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                {[
                                    { value: 'anyone', label: 'Anyone Can Share' },
                                    { value: 'host_only', label: 'Host & Co-hosts Only' }
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPolicies({ ...policies, defaultScreenShare: opt.value as any })}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            border: policies.defaultScreenShare === opt.value ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                                            background: policies.defaultScreenShare === opt.value ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: policies.defaultScreenShare === opt.value ? '#4ade80' : '#a1a1aa',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Mandatory Confidential Watermark */}
                        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.mandatoryWatermark ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconGlobe size={18} color="#22d3ee" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Mandatory Video Watermark</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Leak prevention stamp</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policies.mandatoryWatermark}
                                    onChange={(e) => setPolicies({ ...policies, mandatoryWatermark: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Permanently superimposes attendee email, organization ID, and timestamp across shared screens and video tiles to deter screen recordings and confidential leaks.
                            </p>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.mandatoryWatermark ? '#22d3ee' : '#71717a' }}>
                                Status: {policies.mandatoryWatermark ? '● MANDATORY FOR ALL CALLS' : '○ Optional Host Choice'}
                            </div>
                        </div>

                        {/* 5. Mandatory Waiting Room Lobby */}
                        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.waitingRoomDefault ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconClock size={18} color="#fbbf24" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Enforce Waiting Room by Default</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Host admission queue</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policies.waitingRoomDefault}
                                    onChange={(e) => setPolicies({ ...policies, waitingRoomDefault: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Requires all participants to wait in a virtual green lobby until the host or co-host explicitly admits them into the meeting room.
                            </p>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.waitingRoomDefault ? '#fbbf24' : '#71717a' }}>
                                Status: {policies.waitingRoomDefault ? '● ALL CALLS QUEUED IN LOBBY' : '○ Direct Join Allowed'}
                            </div>
                        </div>

                        {/* 6. Emergency Platform Maintenance Mode */}
                        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.maintenanceMode ? '2px solid #ef4444' : '1px solid var(--color-border)', background: policies.maintenanceMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconZap size={18} color="#ef4444" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444' }}>Emergency Maintenance Lockdown</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Pause new conference creation</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policies.maintenanceMode}
                                    onChange={(e) => setPolicies({ ...policies, maintenanceMode: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Emergency kill-switch for infrastructure upgrades. Prevents new meetings from launching while existing active calls drain.
                            </p>
                            {policies.maintenanceMode && (
                                <input
                                    type="text"
                                    value={policies.maintenanceNotice}
                                    onChange={(e) => setPolicies({ ...policies, maintenanceNotice: e.target.value })}
                                    placeholder="Maintenance advisory message for users..."
                                    className="input"
                                    style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
                                />
                            )}
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: policies.maintenanceMode ? '#ef4444' : '#10b981' }}>
                                Status: {policies.maintenanceMode ? '🚨 PLATFORM IN LOCKDOWN MODE' : '● ALL SYSTEMS OPERATIONAL'}
                            </div>
                        </div>
                    </div>

                    {/* ENTERPRISE ADVANCED INFRASTRUCTURE & GOVERNANCE SUITE */}
                    <div style={{ marginTop: 12 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconSparkles size={16} color="#818cf8" />
                            <span>Enterprise Infrastructure, AI Governor & Multi-Cloud Vaults</span>
                        </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
                        {/* 1. Global AI Governor & Token Quota */}
                        <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: policies.aiGlobalEnabled ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconSparkles size={18} color="#818cf8" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Global AI Governor & Token Quota</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Gemini, GPT-4o & Claude budget limits</div>
                                    </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#a5b4fc' }}>
                                    <span>{policies.aiGlobalEnabled ? 'AI Active' : 'AI Disabled'}</span>
                                    <input
                                        type="checkbox"
                                        checked={policies.aiGlobalEnabled}
                                        onChange={(e) => setPolicies({ ...policies, aiGlobalEnabled: e.target.checked })}
                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                    />
                                </label>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Controls platform-wide machine intelligence features including real-time speech transcription, executive meeting summaries, and action item extraction.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Default AI Neural Engine</label>
                                    <select
                                        value={policies.aiProvider}
                                        onChange={(e) => setPolicies({ ...policies, aiProvider: e.target.value as any })}
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    >
                                        <option value="gemini">Google Gemini 1.5 Pro</option>
                                        <option value="openai">OpenAI GPT-4o</option>
                                        <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                                        <option value="custom">Custom On-Premises Relay</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Max Tokens Per Call</label>
                                    <input
                                        type="number"
                                        value={policies.aiMaxTokensPerCall}
                                        onChange={(e) => setPolicies({ ...policies, aiMaxTokensPerCall: Number(e.target.value) })}
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                        min={256}
                                        max={32768}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Daily Token Quota / Tenant</label>
                                    <input
                                        type="number"
                                        value={policies.aiDailyQuotaPerTenant}
                                        onChange={(e) => setPolicies({ ...policies, aiDailyQuotaPerTenant: Number(e.target.value) })}
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                        step={5000}
                                        min={1000}
                                    />
                                </div>
                                <div style={{ paddingTop: 18 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={policies.aiAllowFreeTier}
                                            onChange={(e) => setPolicies({ ...policies, aiAllowFreeTier: e.target.checked })}
                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                        <span>Allow AI on Free Tier Plans</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 2. Enterprise IP Whitelisting & Geo-Fencing */}
                        <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: policies.ipWhitelistEnabled ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconGlobe size={18} color="#34d399" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>IP Whitelisting & Geo-Fencing</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Perimeter firewall & country blocks</div>
                                    </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#34d399' }}>
                                    <span>{policies.ipWhitelistEnabled ? 'Firewall Active' : 'Off'}</span>
                                    <input
                                        type="checkbox"
                                        checked={policies.ipWhitelistEnabled}
                                        onChange={(e) => setPolicies({ ...policies, ipWhitelistEnabled: e.target.checked })}
                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                    />
                                </label>
                            </div>

                            {/* Allowed IP Ranges */}
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    Allowed IP CIDR Ranges ({policies.allowedIpRanges.length})
                                </label>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                    <input
                                        type="text"
                                        value={ipInput}
                                        onChange={(e) => setIpInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIpRange())}
                                        placeholder="e.g. 192.168.1.0/24 or 10.0.0.1"
                                        className="input"
                                        style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    />
                                    <button type="button" onClick={handleAddIpRange} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                        + Add IP
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {policies.allowedIpRanges.length === 0 ? (
                                        <span style={{ fontSize: '0.72rem', color: '#71717a' }}>No IP restrictions (Open to all networks)</span>
                                    ) : (
                                        policies.allowedIpRanges.map(ip => (
                                            <span key={ip} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                <span>{ip}</span>
                                                <button type="button" onClick={() => handleRemoveIpRange(ip)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Blocked Countries (Geo-Fence) */}
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    Geo-Blocked Country Codes ({policies.blockedCountries.length})
                                </label>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                    <input
                                        type="text"
                                        value={countryInput}
                                        onChange={(e) => setCountryInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBlockedCountry())}
                                        placeholder="ISO 2-letter code (e.g. KP, IR, SY)"
                                        className="input"
                                        style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    />
                                    <button type="button" onClick={handleAddBlockedCountry} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                        + Block
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {policies.blockedCountries.length === 0 ? (
                                        <span style={{ fontSize: '0.72rem', color: '#71717a' }}>No countries blocked</span>
                                    ) : (
                                        policies.blockedCountries.map(cc => (
                                            <span key={cc} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                <span>{cc}</span>
                                                <button type="button" onClick={() => handleRemoveBlockedCountry(cc)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Cloud Storage Vault & S3 Retention Lifecycle */}
                        <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconBuilding size={18} color="#60a5fa" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Cloud Storage Vault & S3 Retention</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Multi-cloud archive & auto-purge lifecycle</div>
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                                Defines how long recorded conferences and media transcripts are preserved before automated lifecycle expiration.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Storage Provider</label>
                                    <select
                                        value={policies.storageProvider}
                                        onChange={(e) => setPolicies({ ...policies, storageProvider: e.target.value as any })}
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    >
                                        <option value="local">Local Storage Vault</option>
                                        <option value="s3">Amazon AWS S3 Standard</option>
                                        <option value="cloudinary">Cloudinary Enterprise</option>
                                        <option value="wasabi">Wasabi Hot Cloud Storage</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Retention Window</label>
                                    <select
                                        value={policies.storageRetentionDays}
                                        onChange={(e) => setPolicies({ ...policies, storageRetentionDays: Number(e.target.value) })}
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    >
                                        <option value={30}>30 Days (Fast Purge)</option>
                                        <option value={60}>60 Days (Default)</option>
                                        <option value={90}>90 Days (Quarterly)</option>
                                        <option value={180}>180 Days (Half-Year)</option>
                                        <option value={365}>365 Days (1 Year Compliance)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={policies.autoPurgeRecordings}
                                        onChange={(e) => setPolicies({ ...policies, autoPurgeRecordings: e.target.checked })}
                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                    />
                                    <span>Automated background purge</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={handleRunStoragePurge}
                                    disabled={purgingStorage}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '6px 14px', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}
                                >
                                    <span>{purgingStorage ? 'Purging...' : '🧹 Run Storage Purge Now'}</span>
                                </button>
                            </div>
                            {storagePurgeResult && (
                                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem', color: '#34d399' }}>
                                    ✓ Storage Purge Complete: {storagePurgeResult.purgedCount} sessions cleared, ~{storagePurgeResult.estimatedFreedMb} MB storage recovered.
                                </div>
                            )}
                        </div>

                        {/* 4. Enterprise SMTP Email & SMS Gateway */}
                        <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconBell size={18} color="#fbbf24" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>SMTP Email & Relay Gateway</div>
                                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Invitations, OTPs & system alert delivery</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSmtpTestModalOpen(true)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '5px 12px', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' }}
                                >
                                    🧪 Test Ping Relay
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>SMTP Server Host</label>
                                    <input
                                        type="text"
                                        value={policies.smtpHost}
                                        onChange={(e) => setPolicies({ ...policies, smtpHost: e.target.value })}
                                        className="input"
                                        placeholder="e.g. smtp.gmail.com"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Port</label>
                                    <input
                                        type="number"
                                        value={policies.smtpPort}
                                        onChange={(e) => setPolicies({ ...policies, smtpPort: Number(e.target.value) })}
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>SMTP Username</label>
                                    <input
                                        type="text"
                                        value={policies.smtpUser}
                                        onChange={(e) => setPolicies({ ...policies, smtpUser: e.target.value })}
                                        className="input"
                                        placeholder="user@example.com"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>SMTP Password</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                            style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.68rem', cursor: 'pointer', padding: 0 }}
                                        >
                                            {showSmtpPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <input
                                        type={showSmtpPassword ? 'text' : 'password'}
                                        value={policies.smtpPass}
                                        onChange={(e) => setPolicies({ ...policies, smtpPass: e.target.value })}
                                        className="input"
                                        placeholder="••••••••"
                                        style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Default Sender Identity</label>
                                <input
                                    type="text"
                                    value={policies.smtpFrom}
                                    onChange={(e) => setPolicies({ ...policies, smtpFrom: e.target.value })}
                                    className="input"
                                    placeholder='"JTS-Meet Enterprise" <support@jtsmeet.com>'
                                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 6: PLATFORM AUDIT & COMPLIANCE TRAIL */}
            {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Filter & Action Bar */}
                    <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconLock size={18} color="#a78bfa" />
                                <span>Platform Security Audit & Compliance Trail ({auditTotal} events)</span>
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Immutable chronological log of administrative interventions, status changes, quota updates, and terminations.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <select
                                value={auditFilter}
                                onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(1) }}
                                className="input"
                                style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--color-surface-2)', color: '#fff' }}
                            >
                                <option value="all">All Action Categories</option>
                                <option value="TENANT_STATUS_CHANGE">Tenant Status Changes</option>
                                <option value="TENANT_QUOTA_UPDATE">Tenant Quota Updates</option>
                                <option value="TENANT_IMPERSONATION">Support Impersonations</option>
                                <option value="MEETING_TERMINATED">Meeting Terminations</option>
                                <option value="PLATFORM_BROADCAST">Global Broadcasts</option>
                                <option value="PLATFORM_POLICY_UPDATE">Meeting Policies Updates</option>
                                <option value="STORAGE_PURGE">Storage Purges</option>
                                <option value="SMTP_TEST">SMTP Gateway Tests</option>
                                <option value="COMPLIANCE_EXPORT">Compliance Exports</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => handleExportAuditLogs('csv')}
                                disabled={exportingAudit}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                title="Export immutable audit trail for GDPR / HIPAA compliance in CSV format"
                            >
                                <span>{exportingAudit ? 'Exporting...' : '📥 Export Trail (CSV)'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleExportAuditLogs('json')}
                                disabled={exportingAudit}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                title="Export full audit records in JSON format"
                            >
                                <span>📄 Export (JSON)</span>
                            </button>

                            <button
                                type="button"
                                onClick={fetchAuditLogs}
                                disabled={auditLoading}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                            >
                                <IconRefresh size={13} />
                                <span>{auditLoading ? 'Loading...' : 'Refresh Logs'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Audit Logs Table */}
                    <div className="glass-card" style={{ padding: 0, borderRadius: 14, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 18px' }}>Timestamp</th>
                                        <th style={{ padding: '12px 18px' }}>Admin Operator</th>
                                        <th style={{ padding: '12px 18px' }}>Action Type</th>
                                        <th style={{ padding: '12px 18px' }}>Event Details</th>
                                        <th style={{ padding: '12px 18px' }}>IP / Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLoading && auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                Loading platform compliance trail...
                                            </td>
                                        </tr>
                                    ) : auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No audit events recorded for the selected filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log: any) => {
                                            const isTerminated = log.action === 'MEETING_TERMINATED'
                                            const isQuota = log.action === 'TENANT_QUOTA_UPDATE'
                                            const isBroadcast = log.action === 'PLATFORM_BROADCAST'
                                            const isStatus = log.action === 'TENANT_STATUS_CHANGE'

                                            return (
                                                <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '12px 18px', whiteSpace: 'nowrap', color: '#a1a1aa' }}>
                                                        {new Date(log.createdAt).toLocaleString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <div style={{ fontWeight: 600, color: '#fff' }}>
                                                            {log.userId?.fullName || 'Super Administrator'}
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                            {log.userId?.email || 'System'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            padding: '3px 8px',
                                                            borderRadius: 4,
                                                            background: isTerminated
                                                                ? 'rgba(239, 68, 68, 0.15)'
                                                                : isQuota
                                                                    ? 'rgba(59, 130, 246, 0.15)'
                                                                    : isBroadcast
                                                                        ? 'rgba(245, 158, 11, 0.15)'
                                                                        : isStatus
                                                                            ? 'rgba(168, 85, 247, 0.15)'
                                                                            : 'rgba(255, 255, 255, 0.08)',
                                                            color: isTerminated
                                                                ? '#f87171'
                                                                : isQuota
                                                                    ? '#60a5fa'
                                                                    : isBroadcast
                                                                        ? '#fbbf24'
                                                                        : isStatus
                                                                            ? '#c084fc'
                                                                            : '#e4e4e7',
                                                            fontFamily: 'monospace'
                                                        }}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 18px', color: '#e4e4e7' }}>
                                                        {log.details}
                                                    </td>
                                                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a1a1aa' }}>
                                                        {log.ipAddress || '127.0.0.1'}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Quota Edit Modal */}
            {editingTenant && createPortal(
                <div
                    onClick={(e) => { if (e.target === e.currentTarget && !savingQuota) setEditingTenant(null) }}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px',
                        overflowY: 'auto', boxSizing: 'border-box'
                    }}
                >
                    <div className="glass-card anim-scale-in" style={{
                        maxWidth: 440, width: '100%', maxHeight: 'calc(100vh - 48px)', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                                Edit Tenant Quota
                            </h3>
                            <button onClick={() => setEditingTenant(null)} className="btn btn-ghost" style={{ padding: 4 }}>
                                <IconX size={16} />
                            </button>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Organization:</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{editingTenant.name} ({editingTenant.slug})</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Plan Tier:
                                </label>
                                <select
                                    value={editTier}
                                    onChange={(e) => setEditTier(e.target.value as any)}
                                    className="input"
                                    style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                >
                                    <option value="free">Free Tier</option>
                                    <option value="starter">Growth Tier</option>
                                    <option value="enterprise">Enterprise Tier</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Max Member Seats:
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={5000}
                                    value={editSeats}
                                    onChange={(e) => setEditSeats(Number(e.target.value))}
                                    className="input"
                                    style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Cloud Storage Quota (GB):
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={editStorageGb}
                                    onChange={(e) => setEditStorageGb(Number(e.target.value))}
                                    className="input"
                                    style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                            <button onClick={() => setEditingTenant(null)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                Cancel
                            </button>
                            <button onClick={handleSaveQuota} disabled={savingQuota} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                                {savingQuota ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Plan Create / Edit Modal */}
            {(editingPlan || isCreatingNewPlan) && createPortal(
                <div
                    onClick={(e) => { if (e.target === e.currentTarget && !savingPlan) { setEditingPlan(null); setIsCreatingNewPlan(false) } }}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999999,
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px',
                        overflowY: 'auto', boxSizing: 'border-box'
                    }}
                >
                    <div className="glass-card anim-scale-in" style={{
                        maxWidth: 620, width: '100%', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {isCreatingNewPlan ? (
                                    <>
                                        <IconPlus size={18} color="#818cf8" />
                                        <span>Create New Subscription Tier</span>
                                    </>
                                ) : (
                                    <>
                                        <IconSettings size={18} color="#818cf8" />
                                        <span>Edit Tier: {editingPlan?.name}</span>
                                    </>
                                )}
                            </h3>
                            <button
                                type="button"
                                onClick={() => { setEditingPlan(null); setIsCreatingNewPlan(false) }}
                                className="btn btn-ghost"
                                style={{ padding: 6, fontSize: '1rem' }}
                            >
                                <IconX size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* General Tier Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                        Plan Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={planForm.name || ''}
                                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                        placeholder="e.g. Scale Pro"
                                        className="input"
                                        style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                        Badge Label
                                    </label>
                                    <input
                                        type="text"
                                        value={planForm.badge || ''}
                                        onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                                        placeholder="e.g. Most Popular"
                                        className="input"
                                        style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </div>

                            {/* Plan ID */}
                            {isCreatingNewPlan && (
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                        Plan Identifier / Slug (Optional, auto-generated)
                                    </label>
                                    <input
                                        type="text"
                                        value={planForm.planId || ''}
                                        onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                                        placeholder="e.g. scale-pro"
                                        className="input"
                                        style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                    />
                                </div>
                            )}

                            {/* Pricing */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                        Monthly Price ($) *
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        required
                                        value={planForm.priceMonthly ?? 0}
                                        onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                                        className="input"
                                        style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                        Yearly Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={planForm.priceYearly ?? 0}
                                        onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                                        className="input"
                                        style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                        Currency
                                    </label>
                                    <input
                                        type="text"
                                        value={planForm.currency || 'USD'}
                                        onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value.toUpperCase() })}
                                        className="input"
                                        style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </div>

                            {/* Quota Limits Matrix */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c4b5fd', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <IconSettings size={14} color="#c4b5fd" />
                                    <span>Dynamic Quota Limits</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                            Max Member Seats:
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10000}
                                            value={planForm.limits?.maxSeats ?? 25}
                                            onChange={(e) => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, maxSeats: Number(e.target.value) }
                                            })}
                                            className="input"
                                            style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                            Cloud Storage Quota (GB):
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={5000}
                                            value={planForm.limits?.maxStorageGb ?? 20}
                                            onChange={(e) => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, maxStorageGb: Number(e.target.value) }
                                            })}
                                            className="input"
                                            style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                            Call Duration (0 = Unlimited):
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={planForm.limits?.maxMeetingDurationMins ?? 0}
                                            onChange={(e) => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, maxMeetingDurationMins: Number(e.target.value) }
                                            })}
                                            className="input"
                                            style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                            Room Max Participants:
                                        </label>
                                        <input
                                            type="number"
                                            min={2}
                                            max={1000}
                                            value={planForm.limits?.maxParticipantsPerCall ?? 50}
                                            onChange={(e) => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, maxParticipantsPerCall: Number(e.target.value) }
                                            })}
                                            className="input"
                                            style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Feature Flags */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                                    Active Feature Permissions:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {[
                                        { key: 'aiSummary', label: 'AI Summary & Notes', Icon: IconSparkles, color: '#c084fc' },
                                        { key: 'cloudRecording', label: 'Cloud Recording', Icon: IconVideo, color: '#f87171' },
                                        { key: 'whiteboard', label: 'Whiteboard', Icon: IconEdit, color: '#4ade80' },
                                        { key: 'customBranding', label: 'Custom Branding', Icon: IconBuilding, color: '#60a5fa' },
                                        { key: 'ssoLogin', label: 'SAML / SSO Login', Icon: IconLock, color: '#a78bfa' },
                                        { key: 'prioritySupport', label: '24/7 Priority Support', Icon: IconZap, color: '#fbbf24' }
                                    ].map((feat) => (
                                        <label key={feat.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#e4e4e7', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 6 }}>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(planForm.features?.[feat.key])}
                                                onChange={(e) => setPlanForm({
                                                    ...planForm,
                                                    features: { ...planForm.features, [feat.key]: e.target.checked }
                                                })}
                                            />
                                            <feat.Icon size={14} color={feat.color} />
                                            <span>{feat.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Feature Bullets */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Marketing Feature Bullets (1 per line):
                                </label>
                                <textarea
                                    rows={4}
                                    value={bulletsInput}
                                    onChange={(e) => setBulletsInput(e.target.value)}
                                    placeholder="Up to 50 Member Seats&#10;50 GB Cloud Storage&#10;Unlimited Duration"
                                    className="input"
                                    style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.82rem', width: '100%' }}
                                />
                            </div>

                            {/* Visibility & Status */}
                            <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingTop: 4 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#fff', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={planForm.isPublic !== false}
                                        onChange={(e) => setPlanForm({ ...planForm, isPublic: e.target.checked })}
                                    />
                                    Publicly Visible to Tenants
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#fff', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={planForm.status !== 'archived'}
                                        onChange={(e) => setPlanForm({ ...planForm, status: e.target.checked ? 'active' : 'archived' })}
                                    />
                                    Active (Accept New Subscriptions)
                                </label>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => { setEditingPlan(null); setIsCreatingNewPlan(false) }}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPlan}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.85rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                >
                                    {savingPlan ? 'Saving...' : (isCreatingNewPlan ? 'Create Plan Tier' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* SMTP DIAGNOSTIC TEST PING MODAL */}
            {smtpTestModalOpen && createPortal(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 480, width: '100%', padding: 24, borderRadius: 16,
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconBell size={18} color="#fbbf24" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>SMTP Relay Diagnostic Test</h3>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Live handshake ping to verify credentials</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setSmtpTestModalOpen(false); setSmtpTestResult(null) }}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            Dispatches a live TLS test email through <code>{policies.smtpHost || 'smtp.gmail.com'}:{policies.smtpPort || 587}</code> to confirm relay authentication, sender SPF alignment, and firewall connectivity.
                        </p>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                Recipient Diagnostic Target Email
                            </label>
                            <input
                                type="email"
                                value={testEmailAddress}
                                onChange={(e) => setTestEmailAddress(e.target.value)}
                                placeholder="Leave blank to send to your super-admin email"
                                className="input"
                                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                        </div>

                        {smtpTestResult && (
                            <div style={{
                                padding: '12px 14px', borderRadius: 8, fontSize: '0.8rem', lineHeight: 1.45,
                                background: smtpTestResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                border: `1px solid ${smtpTestResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                color: smtpTestResult.success ? '#34d399' : '#f87171'
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                                    {smtpTestResult.success ? '✓ Diagnostic Handshake Successful' : '✕ Handshake Failed'}
                                </div>
                                <div>{smtpTestResult.message}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => { setSmtpTestModalOpen(false); setSmtpTestResult(null) }}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.82rem' }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handleRunSmtpTest}
                                disabled={testingSmtp}
                                className="btn btn-primary"
                                style={{ fontSize: '0.82rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                                {testingSmtp ? 'Sending Ping...' : '🚀 Send Diagnostic Ping'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
