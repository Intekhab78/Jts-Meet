import React from 'react'
import {
    IconCrown,
    IconRefresh,
    IconPlus,
    IconUsers,
    IconVideo,
    IconClock,
    IconCheck,
    IconX,
    IconSettings
} from '../../../../components/common/Icons'
import { PlanItem } from '../../superAdmin.types'

interface PlansTabProps {
    plans: PlanItem[]
    plansLoading: boolean
    fetchPlans: () => void
    handleOpenCreatePlan: () => void
    handleOpenEditPlan: (plan: PlanItem) => void
    handleDeletePlan: (plan: PlanItem) => void
}

export const PlansTab: React.FC<PlansTabProps> = ({
    plans,
    plansLoading,
    fetchPlans,
    handleOpenCreatePlan,
    handleOpenEditPlan,
    handleDeletePlan
}) => {
    return (
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
    )
}
