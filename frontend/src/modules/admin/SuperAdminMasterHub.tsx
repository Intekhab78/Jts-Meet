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
    const [activeTab, setActiveTab] = useState<'tenants' | 'telemetry' | 'plans' | 'broadcast'>(() => {
        try {
            const saved = localStorage.getItem('jts_superadmin_tab')
            if (saved && ['tenants', 'telemetry', 'plans', 'broadcast'].includes(saved)) {
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

    useEffect(() => {
        if (activeTab === 'tenants') fetchTenants()
        if (activeTab === 'telemetry' || activeTab === 'broadcast') fetchTelemetry()
        if (activeTab === 'plans') fetchPlans()
    }, [activeTab, token])

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
                    { id: 'plans', label: 'SaaS Plans & Quota Limits', Icon: IconCreditCard },
                    { id: 'broadcast', label: 'Global Platform Broadcast', Icon: IconBell }
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
                                            <a
                                                href={`/meet/${room.meetingId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <span>Inspect Room</span>
                                                <IconExternalLink size={11} />
                                            </a>
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
        </div>
    )
}
