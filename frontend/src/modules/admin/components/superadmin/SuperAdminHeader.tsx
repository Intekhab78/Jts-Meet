import React from 'react'
import {
    IconGlobe,
    IconSparkles,
    IconBuilding,
    IconZap,
    IconCreditCard,
    IconBell,
    IconSettings,
    IconLock
} from '../../../../components/common/Icons'
import { SuperAdminTab, TelemetryData } from '../../superAdmin.types'

interface SuperAdminHeaderProps {
    toastMessage: string | null
    telemetry: TelemetryData | null
    activeTab: SuperAdminTab
    setActiveTab: (tab: SuperAdminTab) => void
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
    toastMessage,
    telemetry,
    activeTab,
    setActiveTab
}) => {
    return (
        <>
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
                        onClick={() => setActiveTab(tab.id as SuperAdminTab)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <tab.Icon size={16} color={activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)'} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
        </>
    )
}
