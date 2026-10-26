import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { API_BASE } from '../../../config'
import {
    SuperAdminTab,
    TenantItem,
    TelemetryData,
    PlanItem,
    PoliciesState,
    AuditLogItem
} from '../superAdmin.types'

interface UseSuperAdminStateProps {
    token: string
}

export function useSuperAdminState({ token }: UseSuperAdminStateProps) {
    const [activeTab, setActiveTab] = useState<SuperAdminTab>(() => {
        try {
            const saved = localStorage.getItem('jts_superadmin_tab')
            if (saved && ['tenants', 'telemetry', 'policies', 'plans', 'broadcast', 'audit'].includes(saved)) {
                return saved as SuperAdminTab
            }
        } catch (_) { }
        return 'tenants'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_superadmin_tab', activeTab)
        } catch (_) { }
    }, [activeTab])

    // Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const showToast = useCallback((msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3500)
    }, [])

    // -------------------------------------------------------------
    // GLOBAL POLICIES STATE
    // -------------------------------------------------------------
    const [policies, setPolicies] = useState<PoliciesState>({
        forceE2EE: false,
        allowGuestAccess: true,
        defaultScreenShare: 'anyone',
        mandatoryWatermark: false,
        waitingRoomDefault: false,
        maintenanceMode: false,
        maintenanceNotice: 'System maintenance in progress. New meetings are temporarily paused.',

        // AI Governor
        aiGlobalEnabled: true,
        aiProvider: 'gemini',
        aiMaxTokensPerCall: 2048,
        aiDailyQuotaPerTenant: 50000,
        aiAllowFreeTier: false,

        // IP & Geo Fencing
        ipWhitelistEnabled: false,
        allowedIpRanges: [],
        geoBlockEnabled: false,
        blockedCountries: [],
        enforceIpOnAdminOnly: true,

        // Storage Vault
        storageRetentionDays: 60,
        autoPurgeRecordings: false,
        storageProvider: 'local',
        storageBucketName: 'jts-recordings-vault',

        // SMTP Gateway
        smtpEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        smtpFrom: '"JTS-Meet Enterprise" <support@jtsmeet.com>',
        smsGatewayEnabled: false,
        smsProvider: 'twilio'
    })
    const [policiesLoading, setPoliciesLoading] = useState(false)
    const [savingPolicies, setSavingPolicies] = useState(false)

    // IP & Geo-fencing helpers
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

    // Audit logs state
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditFilter, setAuditFilter] = useState('all')
    const [auditPage, setAuditPage] = useState(1)
    const [auditTotal, setAuditTotal] = useState(0)
    const [exportingAudit, setExportingAudit] = useState(false)

    // Tenants state
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

    // Telemetry state
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
    const [telemetryLoading, setTelemetryLoading] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)

    // Broadcast state
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'critical'>('warning')
    const [broadcastActive, setBroadcastActive] = useState(true)
    const [sendingBroadcast, setSendingBroadcast] = useState(false)

    // Dynamic SaaS Plans state
    const [plans, setPlans] = useState<PlanItem[]>([])
    const [plansLoading, setPlansLoading] = useState(false)
    const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)
    const [isCreatingNewPlan, setIsCreatingNewPlan] = useState(false)
    const [planForm, setPlanForm] = useState<any>({})
    const [bulletsInput, setBulletsInput] = useState('')
    const [savingPlan, setSavingPlan] = useState(false)

    // -------------------------------------------------------------
    // API FETCHERS
    // -------------------------------------------------------------
    const fetchTenants = useCallback(async () => {
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
    }, [tenantSearch, token])

    const fetchTelemetry = useCallback(async () => {
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
            } else if (res.status === 403) {
                setAutoRefresh(false)
            }
        } catch (err) {
            console.error('Failed to fetch telemetry:', err)
        } finally {
            setTelemetryLoading(false)
        }
    }, [token])

    const fetchPlans = useCallback(async () => {
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
    }, [token])

    const fetchPolicies = useCallback(async () => {
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
    }, [token])

    const fetchAuditLogs = useCallback(async () => {
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
    }, [auditPage, auditFilter, token])

    // Trigger tab-specific fetches
    useEffect(() => {
        if (activeTab === 'tenants') fetchTenants()
        if (activeTab === 'telemetry' || activeTab === 'broadcast') fetchTelemetry()
        if (activeTab === 'plans') fetchPlans()
        if (activeTab === 'policies') fetchPolicies()
        if (activeTab === 'audit') fetchAuditLogs()
    }, [activeTab, fetchTenants, fetchTelemetry, fetchPlans, fetchPolicies, fetchAuditLogs])

    // Auto-refresh telemetry every 5s if active
    useEffect(() => {
        if ((activeTab !== 'telemetry' && activeTab !== 'broadcast') || !autoRefresh) return
        const interval = setInterval(fetchTelemetry, 5000)
        return () => clearInterval(interval)
    }, [activeTab, autoRefresh, fetchTelemetry])

    // -------------------------------------------------------------
    // POLICY & GOVERNANCE HANDLERS
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // SAAS PLANS HANDLERS
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // TENANTS HANDLERS
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // BROADCAST HANDLERS
    // -------------------------------------------------------------
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

    return {
        activeTab,
        setActiveTab,
        toastMessage,
        showToast,

        // Policies
        policies,
        setPolicies,
        policiesLoading,
        savingPolicies,
        handleSavePolicies,
        fetchPolicies,
        ipInput,
        setIpInput,
        countryInput,
        setCountryInput,
        showSmtpPassword,
        setShowSmtpPassword,
        handleAddIpRange,
        handleRemoveIpRange,
        handleAddBlockedCountry,
        handleRemoveBlockedCountry,
        testEmailAddress,
        setTestEmailAddress,
        testingSmtp,
        smtpTestModalOpen,
        setSmtpTestModalOpen,
        smtpTestResult,
        setSmtpTestResult,
        handleRunSmtpTest,
        purgingStorage,
        storagePurgeResult,
        handleRunStoragePurge,

        // Audit
        auditLogs,
        auditLoading,
        auditFilter,
        setAuditFilter,
        auditPage,
        setAuditPage,
        auditTotal,
        exportingAudit,
        handleExportAuditLogs,
        fetchAuditLogs,

        // Tenants
        tenants,
        tenantsLoading,
        tenantSearch,
        setTenantSearch,
        tenantFilter,
        setTenantFilter,
        filteredTenants,
        editingTenant,
        setEditingTenant,
        editTier,
        setEditTier,
        editSeats,
        setEditSeats,
        editStorageGb,
        setEditStorageGb,
        savingQuota,
        handleSaveQuota,
        handleToggleTenantStatus,
        handleImpersonateTenant,
        fetchTenants,

        // Telemetry
        telemetry,
        telemetryLoading,
        autoRefresh,
        setAutoRefresh,
        fetchTelemetry,
        handleForceEndMeeting,
        formatUptime,

        // Broadcast
        broadcastMsg,
        setBroadcastMsg,
        broadcastSeverity,
        setBroadcastSeverity,
        broadcastActive,
        setBroadcastActive,
        sendingBroadcast,
        handleSendBroadcast,
        handleStopBroadcast,

        // Plans
        plans,
        plansLoading,
        editingPlan,
        setEditingPlan,
        isCreatingNewPlan,
        setIsCreatingNewPlan,
        planForm,
        setPlanForm,
        bulletsInput,
        setBulletsInput,
        savingPlan,
        handleOpenCreatePlan,
        handleOpenEditPlan,
        handleSavePlan,
        handleDeletePlan,
        fetchPlans
    }
}
