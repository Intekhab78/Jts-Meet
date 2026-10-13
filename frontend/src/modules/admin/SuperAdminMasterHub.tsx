/**
 * ============================================================================
 * Enterprise SuperAdmin Master Platform Center Hub
 * ============================================================================
 * 
 * Central multi-tenant orchestration, global telemetry, and policy console:
 * 1. Multi-Tenant Directory:
 *    - Search, filters (all, active, suspended, enterprise, starter, free)
 *    - Real-time seat consumption and cloud storage utilization metrics
 *    - Seamless enterprise support impersonation session switching
 *    - Dynamic tenant quota management & plan tier assignment
 * 
 * 2. Real-Time Telemetry & WebRTC Health:
 *    - Live conference count, active participant totals, signaling latency (ms)
 *    - Media server bandwidth (Mbps), Node uptime, memory utilization
 *    - Active live conference rooms inspector with host details & force terminate kill-switch
 * 
 * 3. Dynamic SaaS Plans & Quotas:
 *    - Interactive tier catalog (Free, Starter, Enterprise, Custom tiers)
 *    - Dynamic limits: Member seats, storage GB, call durations, participant caps
 *    - Feature flags: AI summaries, cloud recording, interactive whiteboard, SSO/SAML
 * 
 * 4. Platform-Wide Global Broadcast Center:
 *    - Real-time WebSocket announcement ticker push across active rooms & dashboards
 *    - Severity level selector (Info Blue, Warning Amber, Critical Incident Red)
 *    - One-click emergency maintenance and security patch announcement templates
 *    - Live WYSIWYG replica preview and active broadcast takedown kill-switch
 * 
 * 5. Global Meeting Policies & Governance:
 *    - Mandatory AES-256 E2EE frame encryption enforcement
 *    - External guest access restriction & default screen sharing rights
 *    - Confidential leak deterrent watermarking & green lobby waiting room
 *    - AI Neural Governor (Gemini 1.5 Pro, GPT-4o, Claude 3.5) with token quotas
 *    - Perimeter IP whitelisting & geo-fencing country blocks
 *    - S3 cloud retention lifecycle & automated purge
 *    - SMTP email relay gateway with live diagnostic test handshake ping
 * 
 * 6. Platform Audit & Compliance Trail:
 *    - Chronological log of administrative actions, quota adjustments, and interventions
 *    - Action category filters with pagination
 *    - One-click immutable audit trail export (CSV / JSON) for GDPR / HIPAA compliance
 * 
 * Modular Architecture:
 * - Types: `superAdmin.types.ts`
 * - Hooks: `hooks/useSuperAdminState.ts`
 * - Subcomponents:
 *   - `components/superadmin/SuperAdminHeader.tsx`
 *   - `components/superadmin/TenantsTab.tsx`
 *   - `components/superadmin/TelemetryTab.tsx`
 *   - `components/superadmin/PlansTab.tsx`
 *   - `components/superadmin/BroadcastTab.tsx`
 *   - `components/superadmin/PoliciesTab.tsx`
 *   - `components/superadmin/AuditTab.tsx`
 * ============================================================================
 */

import React from 'react'
import { createPortal } from 'react-dom'

// Common Icons
import {
    IconX,
    IconPlus,
    IconSettings,
    IconSparkles,
    IconVideo,
    IconEdit,
    IconBuilding,
    IconLock,
    IconZap,
    IconBell
} from '../../components/common/Icons'

// Unified Types
import {
    SuperAdminMasterHubProps,
    TenantItem,
    TelemetryData,
    PlanItem,
    PoliciesState,
    AuditLogItem,
    SuperAdminTab
} from './superAdmin.types'

// Custom Hook
import { useSuperAdminState } from './hooks/useSuperAdminState'

// Subcomponents
import { SuperAdminHeader } from './components/superadmin/SuperAdminHeader'
import { TenantsTab } from './components/superadmin/TenantsTab'
import { TelemetryTab } from './components/superadmin/TelemetryTab'
import { PlansTab } from './components/superadmin/PlansTab'
import { BroadcastTab } from './components/superadmin/BroadcastTab'
import { PoliciesTab } from './components/superadmin/PoliciesTab'
import { AuditTab } from './components/superadmin/AuditTab'

// Export types for consumers
export type {
    SuperAdminMasterHubProps,
    TenantItem,
    TelemetryData,
    PlanItem,
    PoliciesState,
    AuditLogItem,
    SuperAdminTab
}

export function SuperAdminMasterHub({ token, currentUserId }: SuperAdminMasterHubProps) {
    const {
        activeTab,
        setActiveTab,
        toastMessage,

        // Policies & Governance
        policies,
        setPolicies,
        policiesLoading,
        savingPolicies,
        handleSavePolicies,
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
        fetchPolicies,

        // Audit Trail
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

        // Tenants Directory
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

        // Real-Time Telemetry
        telemetry,
        telemetryLoading,
        autoRefresh,
        setAutoRefresh,
        fetchTelemetry,
        handleForceEndMeeting,
        formatUptime,

        // Global Broadcast
        broadcastMsg,
        setBroadcastMsg,
        broadcastSeverity,
        setBroadcastSeverity,
        broadcastActive,
        setBroadcastActive,
        sendingBroadcast,
        handleSendBroadcast,
        handleStopBroadcast,

        // SaaS Plans & Quotas
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
    } = useSuperAdminState({ token })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', boxSizing: 'border-box' }}>
            {/* Header Title, Quick Metrics & Tabs Navigation */}
            <SuperAdminHeader
                toastMessage={toastMessage}
                telemetry={telemetry}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* TAB 1: TENANT DIRECTORY */}
            {activeTab === 'tenants' && (
                <TenantsTab
                    tenants={tenants}
                    filteredTenants={filteredTenants}
                    tenantsLoading={tenantsLoading}
                    tenantSearch={tenantSearch}
                    setTenantSearch={setTenantSearch}
                    tenantFilter={tenantFilter}
                    setTenantFilter={setTenantFilter}
                    fetchTenants={fetchTenants}
                    handleImpersonateTenant={handleImpersonateTenant}
                    setEditingTenant={setEditingTenant}
                    setEditTier={setEditTier}
                    setEditSeats={setEditSeats}
                    setEditStorageGb={setEditStorageGb}
                    handleToggleTenantStatus={handleToggleTenantStatus}
                />
            )}

            {/* TAB 2: LIVE TELEMETRY & WEBRTC HEALTH */}
            {activeTab === 'telemetry' && (
                telemetry ? (
                    <TelemetryTab
                        telemetry={telemetry}
                        autoRefresh={autoRefresh}
                        setAutoRefresh={setAutoRefresh}
                        formatUptime={formatUptime}
                        handleForceEndMeeting={handleForceEndMeeting}
                    />
                ) : (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <div
                            className="animate-spin"
                            style={{
                                width: 28,
                                height: 28,
                                margin: '0 auto 12px',
                                border: '2px solid rgba(99,102,241,0.3)',
                                borderTopColor: '#6366f1',
                                borderRadius: '50%'
                            }}
                        />
                        Loading live platform telemetry stream...
                    </div>
                )
            )}

            {/* TAB 3: SAAS PLANS & QUOTA MATRIX */}
            {activeTab === 'plans' && (
                <PlansTab
                    plans={plans}
                    plansLoading={plansLoading}
                    fetchPlans={fetchPlans}
                    handleOpenCreatePlan={handleOpenCreatePlan}
                    handleOpenEditPlan={handleOpenEditPlan}
                    handleDeletePlan={handleDeletePlan}
                />
            )}

            {/* TAB 4: GLOBAL BROADCAST COMMAND CENTER */}
            {activeTab === 'broadcast' && (
                <BroadcastTab
                    broadcastMsg={broadcastMsg}
                    setBroadcastMsg={setBroadcastMsg}
                    broadcastSeverity={broadcastSeverity}
                    setBroadcastSeverity={setBroadcastSeverity}
                    broadcastActive={broadcastActive}
                    setBroadcastActive={setBroadcastActive}
                    sendingBroadcast={sendingBroadcast}
                    handleSendBroadcast={handleSendBroadcast}
                    handleStopBroadcast={handleStopBroadcast}
                    telemetry={telemetry}
                    fetchTelemetry={fetchTelemetry}
                    tenants={tenants}
                />
            )}

            {/* TAB 5: GLOBAL MEETING POLICIES & GOVERNANCE */}
            {activeTab === 'policies' && (
                <PoliciesTab
                    policies={policies}
                    setPolicies={setPolicies}
                    policiesLoading={policiesLoading}
                    savingPolicies={savingPolicies}
                    handleSavePolicies={handleSavePolicies}
                    fetchPolicies={fetchPolicies}
                    ipInput={ipInput}
                    setIpInput={setIpInput}
                    countryInput={countryInput}
                    setCountryInput={setCountryInput}
                    handleAddIpRange={handleAddIpRange}
                    handleRemoveIpRange={handleRemoveIpRange}
                    handleAddBlockedCountry={handleAddBlockedCountry}
                    handleRemoveBlockedCountry={handleRemoveBlockedCountry}
                    purgingStorage={purgingStorage}
                    storagePurgeResult={storagePurgeResult}
                    handleRunStoragePurge={handleRunStoragePurge}
                    setSmtpTestModalOpen={setSmtpTestModalOpen}
                    showSmtpPassword={showSmtpPassword}
                    setShowSmtpPassword={setShowSmtpPassword}
                />
            )}

            {/* TAB 6: PLATFORM AUDIT & COMPLIANCE TRAIL */}
            {activeTab === 'audit' && (
                <AuditTab
                    auditLogs={auditLogs}
                    auditLoading={auditLoading}
                    auditTotal={auditTotal}
                    auditFilter={auditFilter}
                    setAuditFilter={setAuditFilter}
                    setAuditPage={setAuditPage}
                    handleExportAuditLogs={handleExportAuditLogs}
                    exportingAudit={exportingAudit}
                    fetchAuditLogs={fetchAuditLogs}
                />
            )}

            {/* ========================================================= */}
            {/* MODALS PORTAL                                             */}
            {/* ========================================================= */}

            {/* 1. Tenant Quota Edit Modal */}
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

            {/* 2. Plan Create / Edit Modal */}
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

            {/* 3. SMTP DIAGNOSTIC TEST PING MODAL */}
            {smtpTestModalOpen && createPortal(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 480, width: '100%', padding: 24, borderRadius: 16,
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconBell size={18} color="#fbbf24" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>SMTP Relay Diagnostic Test</h3>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Live handshake ping to verify credentials</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setSmtpTestModalOpen(false); setSmtpTestResult(null) }}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            Dispatches a live TLS test email through <code>{policies.smtpHost || 'smtp.gmail.com'}:{policies.smtpPort || 587}</code> to confirm relay authentication, sender SPF alignment, and firewall connectivity.
                        </p>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                Recipient Diagnostic Target Email
                            </label>
                            <input
                                type="email"
                                value={testEmailAddress}
                                onChange={(e) => setTestEmailAddress(e.target.value)}
                                placeholder="Leave blank to send to your super-admin email"
                                className="input"
                                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                        </div>

                        {smtpTestResult && (
                            <div style={{
                                padding: '12px 14px', borderRadius: 8, fontSize: '0.8rem', lineHeight: 1.45,
                                background: smtpTestResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                border: `1px solid ${smtpTestResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                color: smtpTestResult.success ? '#34d399' : '#f87171'
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                                    {smtpTestResult.success ? '✓ Diagnostic Handshake Successful' : '✕ Handshake Failed'}
                                </div>
                                <div>{smtpTestResult.message}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => { setSmtpTestModalOpen(false); setSmtpTestResult(null) }}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.82rem' }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handleRunSmtpTest}
                                disabled={testingSmtp}
                                className="btn btn-primary"
                                style={{ fontSize: '0.82rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                                {testingSmtp ? 'Sending Ping...' : '🚀 Send Diagnostic Ping'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
