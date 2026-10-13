import React from 'react'
import type { PlanItem } from '../../adminConsole.types'
import {
    IconZap,
    IconX,
    IconClock,
    IconUsers,
    IconVideo,
    IconLock
} from '../../../../components/common/Icons'

interface AdminUpgradePlanModalProps {
    isOpen: boolean
    onClose: () => void
    currentOrg: any
    availablePlans: PlanItem[]
    loadingPlans: boolean
    upgradingPlan: boolean
    onExecuteUpgrade: (planId: string) => void
}

export function AdminUpgradePlanModal({
    isOpen,
    onClose,
    currentOrg,
    availablePlans,
    loadingPlans,
    upgradingPlan,
    onExecuteUpgrade
}: AdminUpgradePlanModalProps) {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                maxWidth: 960,
                width: '100%',
                background: '#0d111d',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 18,
                boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, transparent 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconZap size={18} color="#818cf8" />
                            <span>Upgrade Workspace Subscription</span>
                            <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.25)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 9999 }}>
                                Current: {currentOrg?.planTier?.toUpperCase() || 'FREE'}
                            </span>
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Select an enterprise plan tier to expand user seats, cloud recordings storage, and AI meeting quotas.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            color: '#94a3b8',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <IconX size={14} color="#94a3b8" />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {loadingPlans ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                <IconClock size={28} color="#818cf8" />
                            </div>
                            Fetching available subscription tiers...
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: 16
                        }}>
                            {availablePlans.map((plan: any) => {
                                const planIdKey = plan.planId || plan.id || ''
                                const isCurrent = (currentOrg?.planTier || 'free').toLowerCase() === planIdKey.toLowerCase()
                                const displayPrice = plan.priceMonthly ?? plan.price ?? 0
                                const maxSeats = plan.limits?.maxSeats ?? plan.maxSeats ?? 15
                                const maxStorage = plan.limits?.maxStorageGb ?? plan.maxStorageGb ?? 5
                                const bullets = plan.featureBullets || (Array.isArray(plan.features) ? plan.features : [])
                                return (
                                    <div
                                        key={planIdKey}
                                        style={{
                                            background: isCurrent ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                            border: isCurrent ? '2px solid #6366f1' : plan.popular ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 14,
                                            padding: 20,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            position: 'relative'
                                        }}
                                    >
                                        {(plan.popular || plan.badge) && !isCurrent && (
                                            <span style={{
                                                position: 'absolute',
                                                top: -10,
                                                right: 16,
                                                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                                color: '#fff',
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 9999,
                                                textTransform: 'uppercase'
                                            }}>
                                                {plan.badge || 'Popular'}
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span style={{
                                                position: 'absolute',
                                                top: -10,
                                                right: 16,
                                                background: '#6366f1',
                                                color: '#fff',
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 9999,
                                                textTransform: 'uppercase'
                                            }}>
                                                Active Plan
                                            </span>
                                        )}

                                        <div>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                                                {plan.name}
                                            </h4>
                                            <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#94a3b8', minHeight: 34 }}>
                                                {plan.description}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                                                <span style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff' }}>
                                                    {plan.currency || '$'} {displayPrice}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/{plan.billingPeriod || 'month'}</span>
                                            </div>

                                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14, marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 8 }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <IconUsers size={13} color="#a5b4fc" />
                                                        <span>Max Team Seats:</span>
                                                    </span>
                                                    <strong style={{ color: '#a5b4fc' }}>{maxSeats >= 99999 ? 'Unlimited' : maxSeats}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 8 }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <IconVideo size={13} color="#a5b4fc" />
                                                        <span>Cloud Storage:</span>
                                                    </span>
                                                    <strong style={{ color: '#a5b4fc' }}>{maxStorage} GB</strong>
                                                </div>
                                            </div>

                                            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: 20 }}>
                                                {bullets.slice(0, 5).map((f: string, idx: number) => (
                                                    <li key={idx}>{f}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={isCurrent || upgradingPlan}
                                            onClick={() => onExecuteUpgrade(planIdKey)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 0',
                                                borderRadius: 8,
                                                border: isCurrent ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                                                background: isCurrent ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                color: isCurrent ? '#94a3b8' : '#fff',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                cursor: isCurrent || upgradingPlan ? 'not-allowed' : 'pointer',
                                                boxShadow: isCurrent ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {isCurrent ? 'Current Plan' : upgradingPlan ? 'Processing Upgrade...' : `Upgrade to ${plan.name}`}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '14px 24px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconLock size={12} color="#64748b" />
                        <span>Secure enterprise upgrade • Quotas apply instantaneously to your workspace.</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#cbd5e1',
                            padding: '6px 16px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
