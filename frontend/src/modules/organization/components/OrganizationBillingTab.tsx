import React from 'react'
import type { Organization } from '../organization.types'
import { API_BASE } from '../../../config'
import {
    IconCrown,
    IconZap,
    IconUsers,
    IconDownload,
    IconAlertTriangle,
    IconShield,
    IconCreditCard,
    IconRefresh
} from '../../../components/common/Icons'

interface OrganizationBillingTabProps {
    organization: Organization
    token: string
    billingTransactions: any[]
    loadingTransactions: boolean
    onOpenUpgradeModal: () => void
    onRefreshTransactions: () => void
}

export function OrganizationBillingTab({
    organization,
    token,
    billingTransactions,
    loadingTransactions,
    onOpenUpgradeModal,
    onRefreshTransactions
}: OrganizationBillingTabProps) {
    const activeMembersCount = organization.members ? organization.members.filter((m: any) => m.status === 'active').length : 0
    const totalSeats = organization.maxSeats || 15
    const seatUsagePercent = Math.min(100, Math.round((activeMembersCount / totalSeats) * 100))
    const maxStorageGb = organization.maxStorageGb || 5
    const currentTierSlug = organization.planTier || 'free'
    const isEnterprise = currentTierSlug === 'enterprise'
    const isGrowth = currentTierSlug === 'starter' || currentTierSlug === 'growth'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Active Plan Overview Banner */}
            <div className="glass-card" style={{
                padding: '24px 28px',
                borderRadius: 16,
                border: isEnterprise
                    ? '1px solid rgba(99, 102, 241, 0.45)'
                    : isGrowth
                    ? '1px solid rgba(59, 130, 246, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                background: isEnterprise
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IconCrown size={22} color="#818cf8" />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                            {currentTierSlug.toUpperCase()} PLAN
                        </h3>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                            ACTIVE
                        </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '6px 0 0' }}>
                        Enterprise multi-tenant workspace with {totalSeats} seats allocation & {maxStorageGb} GB dedicated cloud storage vault.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onOpenUpgradeModal}
                    className="btn btn-primary"
                    style={{
                        padding: '10px 22px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer'
                    }}
                >
                    <IconZap size={15} color="#fff" />
                    <span>Upgrade / Change Plan</span>
                </button>
            </div>

            {/* Dynamic Quota Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Member Seats Progress Bar */}
                <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <IconUsers size={14} color="#818cf8" /> Member Seats Quota
                        </span>
                        <span style={{ fontSize: '0.78rem', color: seatUsagePercent >= 90 ? '#f87171' : '#a1a1aa', fontWeight: 600 }}>
                            {activeMembersCount} / {totalSeats} Used ({seatUsagePercent}%)
                        </span>
                    </div>

                    <div style={{ height: 10, width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${seatUsagePercent}%`,
                            background: seatUsagePercent >= 90
                                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            borderRadius: 5,
                            transition: 'width 0.4s ease'
                        }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <span>Available: {Math.max(0, totalSeats - activeMembersCount)} Seats</span>
                        {activeMembersCount >= totalSeats && (
                            <span style={{ color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconAlertTriangle size={12} color="#f87171" /> Limit Reached
                            </span>
                        )}
                    </div>
                </div>

                {/* Storage Vault Progress Bar */}
                <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <IconDownload size={14} color="#38bdf8" /> Cloud Storage Vault
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600 }}>
                            0.4 GB / {maxStorageGb} GB Used (8%)
                        </span>
                    </div>

                    <div style={{ height: 10, width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: '8%',
                            background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                            borderRadius: 5
                        }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <span>High-speed recording & attachment retention</span>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>Healthy</span>
                    </div>
                </div>
            </div>

            {/* Active Feature Entitlements Matrix */}
            <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconShield size={16} color="#818cf8" /> Active Workspace Feature Entitlements
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                        { title: 'AI Meeting Summaries', desc: 'Automatic note-taking & action items', active: !isEnterprise && currentTierSlug === 'free' ? false : true },
                        { title: 'Cloud Video Recording', desc: 'MP4 recording vault & sharing', active: !isEnterprise && currentTierSlug === 'free' ? false : true },
                        { title: '24/7 Unlimited Duration', desc: 'No 45-minute timeout', active: currentTierSlug !== 'free' },
                        { title: 'Collaborative Whiteboard', desc: 'Interactive real-time canvas', active: true },
                        { title: 'SAML / SSO Sign-On', desc: 'Google Workspace & Okta integration', active: isEnterprise },
                        { title: 'Dedicated Priority SLA', desc: '24/7 Enterprise escalation channel', active: isEnterprise }
                    ].map((feat, idx) => (
                        <div key={idx} style={{
                            background: feat.active ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                            border: feat.active ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: 10,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{feat.title}</span>
                                <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: feat.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                    color: feat.active ? '#4ade80' : '#71717a'
                                }}>
                                    {feat.active ? 'UNLOCKED' : 'LOCKED'}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{feat.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invoices & Billing History */}
            <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconCreditCard size={16} color="#818cf8" /> Billing History & Official Tax Invoices
                    </h4>
                    <button
                        type="button"
                        onClick={onRefreshTransactions}
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <IconRefresh size={12} className={loadingTransactions ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {loadingTransactions ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        Loading billing statements...
                    </div>
                ) : billingTransactions.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 10 }}>
                        No payment transactions recorded yet. When you upgrade your workspace plan, official tax invoices and receipts will appear here automatically.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--color-text-muted)' }}>
                                    <th style={{ padding: '8px 12px' }}>Date</th>
                                    <th style={{ padding: '8px 12px' }}>Invoice #</th>
                                    <th style={{ padding: '8px 12px' }}>Plan / Cycle</th>
                                    <th style={{ padding: '8px 12px' }}>Amount</th>
                                    <th style={{ padding: '8px 12px' }}>Status</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billingTransactions.map((tx: any) => (
                                    <tr key={tx._id || tx.transactionId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                                            {new Date(tx.createdAt || tx.completedAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                                            {tx.invoiceNumber || tx.transactionId}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#cbd5e1', textTransform: 'capitalize' }}>
                                            <span style={{ fontWeight: 700 }}>{tx.planId}</span> ({tx.billingCycle || 'monthly'})
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#4ade80' }}>
                                            ${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount} {tx.currency || 'USD'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 9999,
                                                background: tx.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                color: tx.status === 'completed' ? '#4ade80' : '#fbbf24',
                                                border: `1px solid ${tx.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                            }}>
                                                {tx.status?.toUpperCase() || 'PAID'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            <a
                                                href={`${API_BASE}/api/payment/transactions/${tx.transactionId || tx._id}/invoice?token=${token}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary"
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                <IconDownload size={12} /> PDF Invoice
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
