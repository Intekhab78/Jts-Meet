import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../../config'

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

export function SuperAdminMasterHub({ token }: SuperAdminMasterHubProps) {
    const [activeTab, setActiveTab] = useState<'tenants' | 'telemetry' | 'plans' | 'broadcast'>(() => {
        try {
            const saved = localStorage.getItem('jts_superadmin_tab')
            if (saved && ['tenants', 'telemetry', 'plans', 'broadcast'].includes(saved)) {
                return saved as any
            }
        } catch (_) {}
        return 'tenants'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_superadmin_tab', activeTab)
        } catch (_) {}
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

    useEffect(() => {
        if (activeTab === 'tenants') fetchTenants()
        if (activeTab === 'telemetry' || activeTab === 'broadcast') fetchTelemetry()
    }, [activeTab, token])

    // Auto-refresh telemetry every 5s if enabled
    useEffect(() => {
        if (activeTab !== 'telemetry' || !autoRefresh) return
        const interval = setInterval(fetchTelemetry, 5000)
        return () => clearInterval(interval)
    }, [activeTab, autoRefresh, token])

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
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.875rem'
                }}>
                    ✨ {toastMessage}
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
                        fontSize: '1.5rem', boxShadow: 'var(--shadow-glow-accent)', color: '#fff'
                    }}>
                        🌐
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
                    { id: 'tenants', label: '🏢 Tenant Directory (All Companies)', icon: '🏢' },
                    { id: 'telemetry', label: '⚡ Live WebRTC Telemetry', icon: '⚡' },
                    { id: 'plans', label: '💳 SaaS Plans & Quota Limits', icon: '💳' },
                    { id: 'broadcast', label: '📢 Global Platform Broadcast', icon: '📢' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {tab.label}
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
                                                    <div style={{ color: '#fff' }}>👥 {t.teamsCount} Teams</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>📹 {t.meetingsCount} Conferences</div>
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
                                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                            title="Edit Plan Tier & Quota"
                                                        >
                                                            ⚙️ Edit Quota
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
                                🔴 Live Active Conference Rooms ({telemetry.liveRooms.length})
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
                                            <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600 }}>
                                                👥 {room.participantsCount} Connected
                                            </span>
                                            <a
                                                href={`/meet/${room.meetingId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                            >
                                                Inspect Room ↗
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: SAAS PLANS & QUOTA MATRIX */}
            {activeTab === 'plans' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                    {/* Free Tier */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#9ca3af' }}>Free Tier</h3>
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 9999, fontSize: '0.75rem', color: '#9ca3af' }}>Standard</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>$0 <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>/ month</span></div>
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li>Up to <strong>5 Member Seats</strong></li>
                            <li><strong>2 GB Cloud Storage</strong></li>
                            <li>45 Minutes Max Meeting Duration</li>
                            <li>Standard WebRTC Quality</li>
                        </ul>
                    </div>

                    {/* Starter Tier */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid rgba(59,130,246,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#60a5fa' }}>Growth Tier</h3>
                            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: 9999, fontSize: '0.75rem' }}>Popular</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>$49 <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>/ month</span></div>
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li>Up to <strong>25 Member Seats</strong></li>
                            <li><strong>10 GB Cloud Storage</strong></li>
                            <li>Unlimited Meeting Duration</li>
                            <li>AI Noise Suppression & Transcripts</li>
                        </ul>
                    </div>

                    {/* Enterprise Tier */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid rgba(99,102,241,0.5)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 100%)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#818cf8' }}>Enterprise Master</h3>
                            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700 }}>Custom</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>$199+ <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>/ month</span></div>
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li><strong>50 - 500+ Member Seats</strong></li>
                            <li><strong>25 - 100 GB Dedicated Vault</strong></li>
                            <li>Multi-tenant Channels & Teams</li>
                            <li>Full Compliance & Audit Trail</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* TAB 4: GLOBAL BROADCAST */}
            {activeTab === 'broadcast' && (
                <div className="glass-card" style={{ padding: 28, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
                            📢 Platform-Wide Global Broadcast Banner
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                            Post an instant alert banner to all active users and organizations across the platform.
                        </p>
                    </div>

                    <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                Broadcast Notice Text:
                            </label>
                            <textarea
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                placeholder="e.g. Scheduled system maintenance tonight at 02:00 UTC. Live meetings will not be interrupted."
                                rows={3}
                                className="input"
                                style={{ background: 'var(--color-surface-2)', width: '100%', fontSize: '0.85rem' }}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                    Notice Urgency / Severity:
                                </label>
                                <select
                                    value={broadcastSeverity}
                                    onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                                    className="input"
                                    style={{ background: 'var(--color-surface-2)', color: '#fff', fontSize: '0.85rem' }}
                                >
                                    <option value="info">ℹ️ Info (Blue)</option>
                                    <option value="warning">⚠️ Warning / Maintenance (Amber)</option>
                                    <option value="critical">🚨 Critical / Security (Red)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={broadcastActive}
                                        onChange={(e) => setBroadcastActive(e.target.checked)}
                                    />
                                    Enable & Display Banner Now
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                            <button
                                type="submit"
                                disabled={sendingBroadcast}
                                className="btn btn-primary"
                                style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: 700 }}
                            >
                                {sendingBroadcast ? 'Publishing...' : '📢 Publish Global Announcement'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Quota Edit Modal */}
            {editingTenant && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div className="glass-card anim-scale-in" style={{
                        maxWidth: 440, width: '100%', padding: 28, display: 'flex', flexDirection: 'column', gap: 20
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                                Edit Tenant Quota
                            </h3>
                            <button onClick={() => setEditingTenant(null)} className="btn btn-ghost" style={{ padding: 4 }}>✕</button>
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
                </div>
            )}
        </div>
    )
}
