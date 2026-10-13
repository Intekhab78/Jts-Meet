import React from 'react'
import { createPortal } from 'react-dom'
import {
    IconZap,
    IconX,
    IconUsers,
    IconDownload,
    IconClock,
    IconCheck,
    IconCreditCard
} from '../../../components/common/Icons'

interface OrganizationUpgradeModalProps {
    open: boolean
    onClose: () => void
    upgradingPlan: boolean
    billingCycle: 'monthly' | 'yearly'
    setBillingCycle: React.Dispatch<React.SetStateAction<'monthly' | 'yearly'>>
    availablePlans: any[]
    currentPlanTier?: string
    onUpgradePlan: (planId: string) => void
    onInitiateRazorpay: (plan: any) => void
}

export function OrganizationUpgradeModal({
    open,
    onClose,
    upgradingPlan,
    billingCycle,
    setBillingCycle,
    availablePlans,
    currentPlanTier = 'free',
    onUpgradePlan,
    onInitiateRazorpay
}: OrganizationUpgradeModalProps) {
    if (!open) return null

    return createPortal(
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget && !upgradingPlan) {
                    onClose()
                }
            }}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999999,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px',
                overflowY: 'auto', boxSizing: 'border-box'
            }}
        >
            <div className="glass-card anim-scale-in" style={{
                maxWidth: 820, width: '100%', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconZap size={20} color="#eab308" /> Upgrade Workspace Subscription
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                            Select an enterprise tier to instantly scale member seats, cloud storage, and AI features.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost"
                        style={{ padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {/* Billing Cycle Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '4px 0' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: billingCycle === 'monthly' ? '#fff' : 'var(--color-text-muted)' }}>
                        Monthly Billing
                    </span>
                    <button
                        type="button"
                        onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
                        style={{
                            width: 46,
                            height: 24,
                            borderRadius: 12,
                            background: billingCycle === 'yearly' ? '#6366f1' : 'rgba(255,255,255,0.2)',
                            border: 'none',
                            padding: 2,
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s ease',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#fff',
                            transform: billingCycle === 'yearly' ? 'translateX(22px)' : 'translateX(0)',
                            transition: 'transform 0.2s ease'
                        }} />
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: billingCycle === 'yearly' ? '#fff' : 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Annual Billing
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                            SAVE 20%
                        </span>
                    </span>
                </div>

                {availablePlans.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <div className="animate-spin" style={{ width: 24, height: 24, margin: '0 auto 12px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                        Loading subscription tiers...
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                        {availablePlans.map((plan: any) => {
                            const isCurrent = currentPlanTier === plan.planId
                            const isEnterprise = plan.planId === 'enterprise'

                            return (
                                <div
                                    key={plan.planId}
                                    className="glass-card"
                                    style={{
                                        padding: 20,
                                        borderRadius: 14,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 14,
                                        border: isCurrent
                                            ? '2px solid #22c55e'
                                            : isEnterprise
                                            ? '1px solid rgba(99, 102, 241, 0.4)'
                                            : '1px solid rgba(255, 255, 255, 0.1)',
                                        background: isCurrent
                                            ? 'rgba(34, 197, 94, 0.04)'
                                            : 'rgba(255, 255, 255, 0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                                            {plan.name}
                                        </h4>
                                        {plan.badge && (
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                                                {plan.badge}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                                            ${billingCycle === 'yearly' ? (plan.priceYearly || plan.priceMonthly * 10) : plan.priceMonthly}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {billingCycle === 'yearly' ? ' / year' : ' / month'}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconUsers size={13} color="#818cf8" /> <span><strong>{plan.limits?.maxSeats}</strong> Member Seats</span></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconDownload size={13} color="#38bdf8" /> <span><strong>{plan.limits?.maxStorageGb} GB</strong> Storage Vault</span></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconClock size={13} color="#f59e0b" /> <span><strong>{plan.limits?.maxMeetingDurationMins === 0 ? 'Unlimited Duration' : `${plan.limits?.maxMeetingDurationMins}m Duration`}</strong></span></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{plan.features?.aiSummary ? <><IconCheck size={13} color="#4ade80" /> <span>AI Meeting Summary</span></> : <><IconX size={13} color="#71717a" /> <span style={{ color: '#71717a' }}>No AI Notes</span></>}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{plan.features?.cloudRecording ? <><IconCheck size={13} color="#4ade80" /> <span>Cloud Recording</span></> : <><IconX size={13} color="#71717a" /> <span style={{ color: '#71717a' }}>No Recording</span></>}</div>
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                        {isCurrent ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="btn btn-secondary"
                                                style={{ width: '100%', fontSize: '0.8rem', fontWeight: 700, opacity: 0.6, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            >
                                                <IconCheck size={14} /> Current Plan
                                            </button>
                                        ) : plan.planId === 'free' ? (
                                            <button
                                                type="button"
                                                disabled={upgradingPlan}
                                                onClick={() => onUpgradePlan(plan.planId)}
                                                className="btn btn-secondary"
                                                style={{ width: '100%', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                                            >
                                                {upgradingPlan ? 'Processing...' : 'Select Starter Free'}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    disabled={upgradingPlan}
                                                    onClick={() => onInitiateRazorpay(plan)}
                                                    className="btn btn-primary"
                                                    style={{
                                                        width: '100%',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 800,
                                                        background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                                                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8,
                                                        padding: '9px 14px'
                                                    }}
                                                >
                                                    <IconCreditCard size={15} /> {upgradingPlan ? 'Connecting Razorpay...' : `Pay with Razorpay`}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={upgradingPlan}
                                                    onClick={() => onUpgradePlan(plan.planId)}
                                                    className="btn btn-ghost"
                                                    style={{ width: '100%', fontSize: '0.72rem', color: 'var(--color-text-muted)', padding: '3px 8px' }}
                                                    title="Instant activation without entering test card details"
                                                >
                                                    ⚡ Instant Sandbox Bypass
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
