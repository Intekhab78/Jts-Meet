import React from 'react'
import {
    IconUsers,
    IconVideo,
    IconSettings
} from '../../../../components/common/Icons'
import { TenantItem } from '../../superAdmin.types'

interface TenantsTabProps {
    tenants: TenantItem[]
    filteredTenants: TenantItem[]
    tenantsLoading: boolean
    tenantSearch: string
    setTenantSearch: (val: string) => void
    tenantFilter: 'all' | 'active' | 'inactive' | 'enterprise' | 'starter' | 'free'
    setTenantFilter: (val: 'all' | 'active' | 'inactive' | 'enterprise' | 'starter' | 'free') => void
    fetchTenants: () => void
    handleImpersonateTenant: (t: TenantItem) => void
    setEditingTenant: (t: TenantItem) => void
    setEditTier: (tier: 'free' | 'starter' | 'enterprise') => void
    setEditSeats: (seats: number) => void
    setEditStorageGb: (storage: number) => void
    handleToggleTenantStatus: (t: TenantItem) => void
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
    filteredTenants,
    tenantsLoading,
    tenantSearch,
    setTenantSearch,
    tenantFilter,
    setTenantFilter,
    fetchTenants,
    handleImpersonateTenant,
    setEditingTenant,
    setEditTier,
    setEditSeats,
    setEditStorageGb,
    handleToggleTenantStatus
}) => {
    return (
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
    )
}
