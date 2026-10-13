import React from 'react'
import {
    IconSettings,
    IconRefresh,
    IconCheck,
    IconLock,
    IconUsers,
    IconVideo,
    IconGlobe,
    IconClock,
    IconZap,
    IconSparkles,
    IconBuilding,
    IconBell
} from '../../../../components/common/Icons'
import { PoliciesState } from '../../superAdmin.types'

interface PoliciesTabProps {
    policies: PoliciesState
    setPolicies: React.Dispatch<React.SetStateAction<PoliciesState>>
    policiesLoading: boolean
    savingPolicies: boolean
    handleSavePolicies: (e?: React.FormEvent) => void
    fetchPolicies: () => void

    // IP & Country helpers
    ipInput: string
    setIpInput: (val: string) => void
    countryInput: string
    setCountryInput: (val: string) => void
    handleAddIpRange: () => void
    handleRemoveIpRange: (ip: string) => void
    handleAddBlockedCountry: () => void
    handleRemoveBlockedCountry: (code: string) => void

    // Storage Purge
    purgingStorage: boolean
    storagePurgeResult: any
    handleRunStoragePurge: () => void

    // SMTP Test
    setSmtpTestModalOpen: (open: boolean) => void
    showSmtpPassword: boolean
    setShowSmtpPassword: (show: boolean) => void
}

export const PoliciesTab: React.FC<PoliciesTabProps> = ({
    policies,
    setPolicies,
    policiesLoading,
    savingPolicies,
    handleSavePolicies,
    fetchPolicies,
    ipInput,
    setIpInput,
    countryInput,
    setCountryInput,
    handleAddIpRange,
    handleRemoveIpRange,
    handleAddBlockedCountry,
    handleRemoveBlockedCountry,
    purgingStorage,
    storagePurgeResult,
    handleRunStoragePurge,
    setSmtpTestModalOpen,
    showSmtpPassword,
    setShowSmtpPassword
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header Action Bar */}
            <div className="glass-card" style={{ padding: '20px 24px', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconSettings size={18} color="#818cf8" />
                        <span>Platform-Wide Meeting Policies & Security Governance</span>
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                        Enforce global encryption standards, guest permissions, watermarking, and emergency lockdown controls.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        type="button"
                        onClick={fetchPolicies}
                        disabled={policiesLoading}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                    >
                        <IconRefresh size={13} />
                        <span>Reload</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSavePolicies()}
                        disabled={savingPolicies}
                        className="btn btn-primary"
                        style={{
                            fontSize: '0.85rem',
                            padding: '8px 20px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconCheck size={14} color="#fff" />
                        <span>{savingPolicies ? 'Saving Policies...' : 'Save & Enforce Policies'}</span>
                    </button>
                </div>
            </div>

            {/* Policy Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {/* 1. Force E2EE */}
                <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.forceE2EE ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconLock size={18} color="#c084fc" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Mandatory End-to-End Encryption (E2EE)</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>AES-256 GCM Media Frame Encryption</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={policies.forceE2EE}
                            onChange={(e) => setPolicies({ ...policies, forceE2EE: e.target.checked })}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        When enabled, all video and audio calls across all tenant organizations must use client-side cryptographic key ratcheting. Server relay cannot decrypt conference contents.
                    </p>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.forceE2EE ? '#c084fc' : '#71717a' }}>
                        Status: {policies.forceE2EE ? '● ENFORCED PLATFORM-WIDE' : '○ Optional per-meeting'}
                    </div>
                </div>

                {/* 2. Allow External Guest Access */}
                <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconUsers size={18} color="#60a5fa" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>External Guest Join Access</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Anonymous & link-based participants</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={policies.allowGuestAccess}
                            onChange={(e) => setPolicies({ ...policies, allowGuestAccess: e.target.checked })}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Allows non-registered participants to join meetings using instant display names. Disabling this enforces that only authenticated enterprise members can access room links.
                    </p>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.allowGuestAccess ? '#60a5fa' : '#ef4444' }}>
                        Status: {policies.allowGuestAccess ? '● GUEST ACCESS ENABLED' : '● RESTRICTED (MEMBERS ONLY)'}
                    </div>
                </div>

                {/* 3. Screen Sharing Default Permission */}
                <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconVideo size={18} color="#4ade80" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Screen Sharing Default Permission</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Presentation & annotation privilege</div>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Sets the baseline screen sharing privilege when new conferences start. Hosts can still manually grant presentation rights inside the meeting room.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        {[
                            { value: 'anyone', label: 'Anyone Can Share' },
                            { value: 'host_only', label: 'Host & Co-hosts Only' }
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setPolicies({ ...policies, defaultScreenShare: opt.value as any })}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    border: policies.defaultScreenShare === opt.value ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                                    background: policies.defaultScreenShare === opt.value ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                                    color: policies.defaultScreenShare === opt.value ? '#4ade80' : '#a1a1aa',
                                    cursor: 'pointer'
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Mandatory Confidential Watermark */}
                <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.mandatoryWatermark ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconGlobe size={18} color="#22d3ee" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Mandatory Video Watermark</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Leak prevention stamp</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={policies.mandatoryWatermark}
                            onChange={(e) => setPolicies({ ...policies, mandatoryWatermark: e.target.checked })}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Permanently superimposes attendee email, organization ID, and timestamp across shared screens and video tiles to deter screen recordings and confidential leaks.
                    </p>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.mandatoryWatermark ? '#22d3ee' : '#71717a' }}>
                        Status: {policies.mandatoryWatermark ? '● MANDATORY FOR ALL CALLS' : '○ Optional Host Choice'}
                    </div>
                </div>

                {/* 5. Mandatory Waiting Room Lobby */}
                <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.waitingRoomDefault ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconClock size={18} color="#fbbf24" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Enforce Waiting Room by Default</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Host admission queue</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={policies.waitingRoomDefault}
                            onChange={(e) => setPolicies({ ...policies, waitingRoomDefault: e.target.checked })}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Requires all participants to wait in a virtual green lobby until the host or co-host explicitly admits them into the meeting room.
                    </p>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: policies.waitingRoomDefault ? '#fbbf24' : '#71717a' }}>
                        Status: {policies.waitingRoomDefault ? '● ALL CALLS QUEUED IN LOBBY' : '○ Direct Join Allowed'}
                    </div>
                </div>

                {/* 6. Emergency Platform Maintenance Mode */}
                <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: policies.maintenanceMode ? '2px solid #ef4444' : '1px solid var(--color-border)', background: policies.maintenanceMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconZap size={18} color="#ef4444" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444' }}>Emergency Maintenance Lockdown</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Pause new conference creation</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={policies.maintenanceMode}
                            onChange={(e) => setPolicies({ ...policies, maintenanceMode: e.target.checked })}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Emergency kill-switch for infrastructure upgrades. Prevents new meetings from launching while existing active calls drain.
                    </p>
                    {policies.maintenanceMode && (
                        <input
                            type="text"
                            value={policies.maintenanceNotice}
                            onChange={(e) => setPolicies({ ...policies, maintenanceNotice: e.target.value })}
                            placeholder="Maintenance advisory message for users..."
                            className="input"
                            style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
                        />
                    )}
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: policies.maintenanceMode ? '#ef4444' : '#10b981' }}>
                        Status: {policies.maintenanceMode ? '🚨 PLATFORM IN LOCKDOWN MODE' : '● ALL SYSTEMS OPERATIONAL'}
                    </div>
                </div>
            </div>

            {/* ENTERPRISE ADVANCED INFRASTRUCTURE & GOVERNANCE SUITE */}
            <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconSparkles size={16} color="#818cf8" />
                    <span>Enterprise Infrastructure, AI Governor & Multi-Cloud Vaults</span>
                </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
                {/* 1. Global AI Governor & Token Quota */}
                <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: policies.aiGlobalEnabled ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconSparkles size={18} color="#818cf8" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Global AI Governor & Token Quota</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Gemini, GPT-4o & Claude budget limits</div>
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#a5b4fc' }}>
                            <span>{policies.aiGlobalEnabled ? 'AI Active' : 'AI Disabled'}</span>
                            <input
                                type="checkbox"
                                checked={policies.aiGlobalEnabled}
                                onChange={(e) => setPolicies({ ...policies, aiGlobalEnabled: e.target.checked })}
                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                        </label>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Controls platform-wide machine intelligence features including real-time speech transcription, executive meeting summaries, and action item extraction.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Default AI Neural Engine</label>
                            <select
                                value={policies.aiProvider}
                                onChange={(e) => setPolicies({ ...policies, aiProvider: e.target.value as any })}
                                className="input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            >
                                <option value="gemini">Google Gemini 1.5 Pro</option>
                                <option value="openai">OpenAI GPT-4o</option>
                                <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                                <option value="custom">Custom On-Premises Relay</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Max Tokens Per Call</label>
                            <input
                                type="number"
                                value={policies.aiMaxTokensPerCall}
                                onChange={(e) => setPolicies({ ...policies, aiMaxTokensPerCall: Number(e.target.value) })}
                                className="input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                min={256}
                                max={32768}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Daily Token Quota / Tenant</label>
                            <input
                                type="number"
                                value={policies.aiDailyQuotaPerTenant}
                                onChange={(e) => setPolicies({ ...policies, aiDailyQuotaPerTenant: Number(e.target.value) })}
                                className="input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                                step={5000}
                                min={1000}
                            />
                        </div>
                        <div style={{ paddingTop: 18 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={policies.aiAllowFreeTier}
                                    onChange={(e) => setPolicies({ ...policies, aiAllowFreeTier: e.target.checked })}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                />
                                <span>Allow AI on Free Tier Plans</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Enterprise IP Whitelisting & Geo-Fencing */}
                <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: policies.ipWhitelistEnabled ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconGlobe size={18} color="#34d399" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>IP Whitelisting & Geo-Fencing</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Perimeter firewall & country blocks</div>
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#34d399' }}>
                            <span>{policies.ipWhitelistEnabled ? 'Firewall Active' : 'Off'}</span>
                            <input
                                type="checkbox"
                                checked={policies.ipWhitelistEnabled}
                                onChange={(e) => setPolicies({ ...policies, ipWhitelistEnabled: e.target.checked })}
                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                        </label>
                    </div>

                    {/* Allowed IP Ranges */}
                    <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Allowed IP CIDR Ranges ({policies.allowedIpRanges.length})
                        </label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <input
                                type="text"
                                value={ipInput}
                                onChange={(e) => setIpInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIpRange())}
                                placeholder="e.g. 192.168.1.0/24 or 10.0.0.1"
                                className="input"
                                style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                            <button type="button" onClick={handleAddIpRange} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                + Add IP
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {policies.allowedIpRanges.length === 0 ? (
                                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>No IP restrictions (Open to all networks)</span>
                            ) : (
                                policies.allowedIpRanges.map(ip => (
                                    <span key={ip} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <span>{ip}</span>
                                        <button type="button" onClick={() => handleRemoveIpRange(ip)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Blocked Countries (Geo-Fence) */}
                    <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Geo-Blocked Country Codes ({policies.blockedCountries.length})
                        </label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <input
                                type="text"
                                value={countryInput}
                                onChange={(e) => setCountryInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBlockedCountry())}
                                placeholder="ISO 2-letter code (e.g. KP, IR, SY)"
                                className="input"
                                style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                            <button type="button" onClick={handleAddBlockedCountry} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                + Block
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {policies.blockedCountries.length === 0 ? (
                                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>No countries blocked</span>
                            ) : (
                                policies.blockedCountries.map(cc => (
                                    <span key={cc} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <span>{cc}</span>
                                        <button type="button" onClick={() => handleRemoveBlockedCountry(cc)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Cloud Storage Vault & S3 Retention Lifecycle */}
                <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconBuilding size={18} color="#60a5fa" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Cloud Storage Vault & S3 Retention</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Multi-cloud archive & auto-purge lifecycle</div>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Defines how long recorded conferences and media transcripts are preserved before automated lifecycle expiration.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Storage Provider</label>
                            <select
                                value={policies.storageProvider}
                                onChange={(e) => setPolicies({ ...policies, storageProvider: e.target.value as any })}
                                className="input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            >
                                <option value="local">Local Storage Vault</option>
                                <option value="s3">Amazon AWS S3 Standard</option>
                                <option value="cloudinary">Cloudinary Enterprise</option>
                                <option value="wasabi">Wasabi Hot Cloud Storage</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Retention Window</label>
                            <select
                                value={policies.storageRetentionDays}
                                onChange={(e) => setPolicies({ ...policies, storageRetentionDays: Number(e.target.value) })}
                                className="input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            >
                                <option value={30}>30 Days (Fast Purge)</option>
                                <option value={60}>60 Days (Default)</option>
                                <option value={90}>90 Days (Quarterly)</option>
                                <option value={180}>180 Days (Half-Year)</option>
                                <option value={365}>365 Days (1 Year Compliance)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={policies.autoPurgeRecordings}
                                onChange={(e) => setPolicies({ ...policies, autoPurgeRecordings: e.target.checked })}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                            <span>Automated background purge</span>
                        </label>
                        <button
                            type="button"
                            onClick={handleRunStoragePurge}
                            disabled={purgingStorage}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '6px 14px', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}
                        >
                            <span>{purgingStorage ? 'Purging...' : '🧹 Run Storage Purge Now'}</span>
                        </button>
                    </div>
                    {storagePurgeResult && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem', color: '#34d399' }}>
                            ✓ Storage Purge Complete: {storagePurgeResult.purgedCount} sessions cleared, ~{storagePurgeResult.estimatedFreedMb} MB storage recovered.
                        </div>
                    )}
                </div>

                {/* 4. Enterprise SMTP Email & SMS Gateway */}
                <div className="glass-card" style={{ padding: 22, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconBell size={18} color="#fbbf24" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>SMTP Email & Relay Gateway</div>
                                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Invitations, OTPs & system alert delivery</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSmtpTestModalOpen(true)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '5px 12px', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' }}
                        >
                            🧪 Test Ping Relay
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>SMTP Server Host</label>
                            <input
                                type="text"
                                value={policies.smtpHost}
                                onChange={(e) => setPolicies({ ...policies, smtpHost: e.target.value })}
                                className="input"
                                placeholder="e.g. smtp.gmail.com"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Port</label>
                            <input
                                type="number"
                                value={policies.smtpPort}
                                onChange={(e) => setPolicies({ ...policies, smtpPort: Number(e.target.value) })}
                                className="input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>SMTP Username</label>
                            <input
                                type="text"
                                value={policies.smtpUser}
                                onChange={(e) => setPolicies({ ...policies, smtpUser: e.target.value })}
                                className="input"
                                placeholder="user@example.com"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>SMTP Password</label>
                                <button
                                    type="button"
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                    style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.68rem', cursor: 'pointer', padding: 0 }}
                                >
                                    {showSmtpPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                type={showSmtpPassword ? 'text' : 'password'}
                                value={policies.smtpPass}
                                onChange={(e) => setPolicies({ ...policies, smtpPass: e.target.value })}
                                className="input"
                                placeholder="••••••••"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Default Sender Identity</label>
                        <input
                            type="text"
                            value={policies.smtpFrom}
                            onChange={(e) => setPolicies({ ...policies, smtpFrom: e.target.value })}
                            className="input"
                            placeholder='"JTS-Meet Enterprise" <support@jtsmeet.com>'
                            style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--color-surface-2)', color: '#fff' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
