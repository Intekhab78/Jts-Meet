import React from 'react'
import { IconLock, IconZap } from '../../../components/common/Icons'

export interface UpgradeModalFeatureInfo {
    icon: string | React.ReactNode
    requiredPlan: string
    title: string
    description: string
}

export interface UpgradePlanModalProps {
    feature: UpgradeModalFeatureInfo | null
    currentPlanTier: string
    onClose: () => void
    onUpgrade: () => void
}

export function UpgradePlanModal({
    feature,
    currentPlanTier,
    onClose,
    onUpgrade
}: UpgradePlanModalProps) {
    if (!feature) return null

    const planName = currentPlanTier ? currentPlanTier.charAt(0).toUpperCase() + currentPlanTier.slice(1) : 'Free'

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                maxWidth: 480,
                width: '100%',
                background: '#0d111d',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                borderRadius: 20,
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(245, 158, 11, 0.15)',
                overflow: 'hidden',
                textAlign: 'center',
                padding: '28px 24px',
                animation: 'jts-slide-up 0.2s ease-out'
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.9rem',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'
                }}>
                    {feature.icon}
                </div>

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '3px 12px',
                    borderRadius: 9999,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#fbbf24',
                    marginBottom: 12
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <IconLock size={12} color="#fbbf24" /> Current Plan: {planName} • Requires {feature.requiredPlan}
                    </span>
                </div>

                <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                    {feature.title}
                </h3>

                <p style={{ margin: '0 0 20px', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6 }}>
                    {feature.description}
                </p>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    padding: '14px 18px',
                    marginBottom: 20,
                    textAlign: 'left'
                }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Included with upgraded plan:
                    </span>
                    <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.65 }}>
                        <li>Cloud MP4 Recording &amp; Auto-Archive Vault</li>
                        <li>AI Meeting Minutes (MoM) &amp; Action Item Tracking</li>
                        <li>Multi-Platform 1080p RTMP Live Broadcast Studio</li>
                        <li>Unlimited Meeting Duration &amp; Expanded Seats</li>
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: 8,
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Maybe Later
                    </button>
                    <button
                        type="button"
                        onClick={onUpgrade}
                        style={{
                            flex: 1.4,
                            padding: '10px 0',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: '#fff',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconZap size={14} /> Upgrade Workspace Plan</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
