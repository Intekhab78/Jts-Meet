import React, { useEffect, useState } from 'react'
import { createOrganization, getOrganization, updateOrganization, inviteOrganizationMember, removeOrganizationMember, leaveOrganization } from './organization.service'
import type { Organization, UpdateOrganizationPayload } from './organization.types'
import { CreateOrganizationModal } from './CreateOrganizationModal'
import { InviteMemberModal } from './InviteMemberModal'
import { MemberList } from './MemberList'
import { listOrganizationTeams, createTeam } from '../team/team.service'
import { listTeamChannels } from '../channel/channel.service'
import { CreateTeamModal } from '../team/CreateTeamModal'
import type { Team } from '../team/team.types'
import type { Channel } from '../channel/channel.types'
import { IntegrationsTab } from '../admin/components/IntegrationsTab'
import { OrganizationProfileTab } from './OrganizationProfileTab'
import { OrganizationHeroHeader } from './components/OrganizationHeroHeader'
import { OrganizationDepartmentsTab } from './components/OrganizationDepartmentsTab'
import { OrganizationChannelsTab } from './components/OrganizationChannelsTab'
import { OrganizationRolesTab } from './components/OrganizationRolesTab'
import { OrganizationBillingTab } from './components/OrganizationBillingTab'
import { OrganizationUpgradeModal } from './components/OrganizationUpgradeModal'
import { API_BASE } from '../../config'
import {
    IconAlertTriangle,
    IconRefresh,
    IconCheck,
    IconPlus,
    IconUsers,
    IconBuilding,
    IconHash,
    IconShield,
    IconCreditCard,
    IconSettings,
    IconZap
} from '../../components/common/Icons'

interface OrganizationSettingsPageProps {
    token: string
    organizationId?: string
    organizations?: any[]
    onSelectOrganization?: (id: string) => void
    onOrganizationCreated?: (org: Organization) => void
}

export function OrganizationSettingsPage({
    token,
    organizationId,
    organizations = [],
    onSelectOrganization,
    onOrganizationCreated
}: OrganizationSettingsPageProps) {
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [teams, setTeams] = useState<Team[]>([])
    const [channels, setChannels] = useState<(Channel & { teamName?: string })[]>([])
    const [activeSubTab, setActiveSubTab] = useState<'members' | 'departments' | 'channels' | 'roles' | 'billing' | 'settings' | 'integrations' | 'danger'>('members')
    const [copiedOwner, setCopiedOwner] = useState(false)
    const [copiedSlug, setCopiedSlug] = useState(false)
    const [copiedInviteLink, setCopiedInviteLink] = useState(false)

    // Dynamic Plan & Quota Upgrade State
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [availablePlans, setAvailablePlans] = useState<any[]>([])
    const [upgradingPlan, setUpgradingPlan] = useState(false)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    const [billingTransactions, setBillingTransactions] = useState<any[]>([])
    const [loadingTransactions, setLoadingTransactions] = useState(false)

    const loadPlans = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/plans`)
            if (res.ok) {
                const data = await res.json()
                setAvailablePlans(data.data || [])
            }
        } catch (e) {
            console.error('Failed to load plans:', e)
        }
    }

    const loadBillingTransactions = async (orgId?: string) => {
        const id = orgId || organization?._id
        if (!id) return
        setLoadingTransactions(true)
        try {
            const res = await fetch(`${API_BASE}/api/payment/transactions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setBillingTransactions(data.data || [])
            }
        } catch (e) {
            console.error('Failed to load billing transactions:', e)
        } finally {
            setLoadingTransactions(false)
        }
    }

    const handleUpgradePlan = async (planId: string) => {
        if (!organization) return
        setUpgradingPlan(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE}/api/organization/${organization._id}/plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    planId,
                    billingCycle,
                    paymentToken: `pay_direct_${Date.now()}`
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setSuccessMessage(`Workspace subscription upgraded to ${planId.toUpperCase()} successfully!`)
                setShowUpgradeModal(false)
                try {
                    localStorage.setItem('jts_active_plan_tier', planId)
                } catch (_) {}
                loadOrganization(organization._id)
                loadBillingTransactions(organization._id)
            } else {
                setError(data.message || 'Failed to upgrade plan')
            }
        } catch (err: any) {
            setError(err?.message || 'Network error upgrading plan')
        } finally {
            setUpgradingPlan(false)
        }
    }

    const handleInitiateRazorpay = async (plan: any) => {
        if (!organization) return
        if (plan.planId === 'free' || (plan.priceMonthly === 0 && plan.priceYearly === 0)) {
            return handleUpgradePlan(plan.planId)
        }

        setUpgradingPlan(true)
        setError('')

        try {
            // 1. Create Razorpay Order on backend
            const orderRes = await fetch(`${API_BASE}/api/payment/razorpay/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    organizationId: organization._id,
                    planId: plan.planId,
                    billingCycle
                })
            })

            const orderData = await orderRes.json()
            if (!orderRes.ok || !orderData.success) {
                throw new Error(orderData.message || 'Failed to initialize Razorpay checkout order')
            }

            const { orderId, amount, currency, keyId } = orderData.data

            if (typeof (window as any).Razorpay === 'undefined') {
                throw new Error('Razorpay SDK is loading. Please try again in a few moments.')
            }

            const rzpOptions = {
                key: keyId,
                amount,
                currency,
                name: 'JTS Meet Enterprise',
                description: `Upgrade to ${plan.name} (${billingCycle === 'yearly' ? 'Annual' : 'Monthly'})`,
                order_id: orderId,
                prefill: {
                    name: organization.name,
                    email: organization.billingContactEmail || ''
                },
                theme: {
                    color: '#6366f1'
                },
                modal: {
                    ondismiss: () => {
                        setUpgradingPlan(false)
                    }
                },
                handler: async (response: any) => {
                    setUpgradingPlan(true)
                    try {
                        // 2. Verify signature on backend
                        const verifyRes = await fetch(`${API_BASE}/api/payment/razorpay/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                organizationId: organization._id,
                                planId: plan.planId
                            })
                        })

                        const verifyData = await verifyRes.json()
                        if (verifyRes.ok && verifyData.success) {
                            setSuccessMessage(`🎉 Razorpay payment verified (${response.razorpay_payment_id})! Workspace upgraded to ${plan.name} successfully!`)
                            setShowUpgradeModal(false)
                            try {
                                localStorage.setItem('jts_active_plan_tier', plan.planId)
                            } catch (_) {}
                            loadOrganization(organization._id)
                            loadBillingTransactions(organization._id)
                        } else {
                            setError(verifyData.message || 'Payment signature verification failed')
                        }
                    } catch (verifyErr: any) {
                        setError(verifyErr?.message || 'Failed to verify Razorpay payment')
                    } finally {
                        setUpgradingPlan(false)
                    }
                }
            }

            const rzp = new (window as any).Razorpay(rzpOptions)
            rzp.on('payment.failed', function (resp: any) {
                setError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`)
                setUpgradingPlan(false)
            })
            rzp.open()
        } catch (err: any) {
            setError(err?.message || 'Error launching Razorpay payment')
            setUpgradingPlan(false)
        }
    }

    // Edit form state
    const [formName, setFormName] = useState('')
    const [formTimezone, setFormTimezone] = useState('UTC')
    const [formDescription, setFormDescription] = useState('')
    const retryTimeoutRef = React.useRef<any>(null)

    const loadOrganization = async (orgId: string, isSilent = false) => {
        if (!orgId) return
        if (!isSilent) {
            setLoading(true)
        }
        setError('')
        try {
            const org = await getOrganization(orgId, token)
            if (org) {
                setOrganization(org)
                setFormName(org.name || '')
                setFormTimezone(org.timezone || 'Asia/Kolkata')
                setFormDescription(org.description || '')
                if (org.planTier) {
                    try {
                        localStorage.setItem('jts_active_plan_tier', org.planTier)
                    } catch (_) {}
                }
            }
            setLoading(false)

            // Load teams & channels in parallel in background
            try {
                const teamsList = await listOrganizationTeams(orgId, token)
                setTeams(teamsList)

                const channelPromises = teamsList.map(async (t) => {
                    const chs = await listTeamChannels(t._id, token).catch(() => [] as Channel[])
                    return chs.map(c => ({ ...c, teamName: t.name }))
                })
                const allChannelsNested = await Promise.all(channelPromises)
                const flatChannels = allChannelsNested.flat()
                setChannels(flatChannels)
            } catch (teamErr) {
                console.error('Failed to load teams/channels for org:', teamErr)
            }
        } catch (err: any) {
            const msg = err?.message || 'Unable to load organization'
            setError(msg)
            setLoading(false)

            // Auto-retry once after 1.5s if transient network error
            if (msg.toLowerCase().includes('failed to fetch')) {
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
                retryTimeoutRef.current = setTimeout(() => {
                    if (orgId) loadOrganization(orgId, true)
                }, 1500)
            }
        }
    }

    useEffect(() => {
        const targetId = organizationId || (organizations.length > 0 ? organizations[0]._id : undefined)
        if (targetId) {
            // Instant optimistic render if organization data already exists in memory!
            const cachedOrg = organizations.find(o => o._id === targetId)
            if (cachedOrg) {
                setOrganization(cachedOrg)
                setFormName(cachedOrg.name || '')
                setFormTimezone(cachedOrg.timezone || 'Asia/Kolkata')
                setFormDescription(cachedOrg.description || '')
                setLoading(false)
                // Background refresh without blocking UI
                loadOrganization(targetId, true)
            } else {
                loadOrganization(targetId, false)
            }
        } else {
            setOrganization(null)
            setLoading(false)
        }
        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
        }
    }, [organizationId, organizations])

    useEffect(() => {
        if (activeSubTab === 'billing' && organization?._id) {
            loadPlans()
            loadBillingTransactions(organization._id)
        }
    }, [activeSubTab, organization?._id])

    const handleCreateOrganization = async (payload: any) => {
        const org = await createOrganization(payload, token)
        setOrganization(org)
        onOrganizationCreated?.(org)
        if (onSelectOrganization && org._id) {
            onSelectOrganization(org._id)
        }
    }

    const handleUpdateOrganization = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization) return
        setSaving(true)
        setError('')
        try {
            const payload: UpdateOrganizationPayload = {
                name: formName,
                timezone: formTimezone,
                description: formDescription
            }
            const updated = await updateOrganization(organization._id, payload, token)
            setOrganization(updated)
            setSuccessMessage('Organization profile updated successfully!')
            setTimeout(() => setSuccessMessage(''), 3500)
        } catch (err: any) {
            setError(err?.message || 'Failed to update organization profile')
        } finally {
            setSaving(false)
        }
    }

    const handleInviteMember = async (userId: string, role: string) => {
        if (!organization) return
        const org = await inviteOrganizationMember({ organizationId: organization._id, userId, role: role as any }, token)
        setOrganization(org)
        setSuccessMessage('Member invited successfully!')
        setTimeout(() => setSuccessMessage(''), 3500)
    }

    const handleRemoveMember = async (userId: string) => {
        if (!organization) return
        const org = await removeOrganizationMember({ organizationId: organization._id, userId }, token)
        setOrganization(org)
        setSuccessMessage('Member removed from workspace.')
        setTimeout(() => setSuccessMessage(''), 3500)
    }

    const handleLeaveOrganization = async () => {
        if (!organization) return
        await leaveOrganization({ organizationId: organization._id, userId: '' }, token)
        setOrganization(null)
    }

    const handleCreateTeam = async (payload: any) => {
        if (!organization) return
        try {
            await createTeam({ ...payload, organizationId: organization._id }, token)
            const updatedTeams = await listOrganizationTeams(organization._id, token)
            setTeams(updatedTeams)
            setSuccessMessage(`Department "${payload.name}" created successfully!`)
            setTimeout(() => setSuccessMessage(''), 3500)
        } catch (err: any) {
            setError(err?.message || 'Failed to create department')
        }
    }

    const copyToClipboard = (text: string, type: 'owner' | 'slug' | 'invite') => {
        navigator.clipboard.writeText(text)
        if (type === 'owner') {
            setCopiedOwner(true)
            setTimeout(() => setCopiedOwner(false), 2000)
        } else if (type === 'slug') {
            setCopiedSlug(true)
            setTimeout(() => setCopiedSlug(false), 2000)
        } else {
            setCopiedInviteLink(true)
            setTimeout(() => setCopiedInviteLink(false), 2000)
        }
    }

    const inviteLinkUrl = organization ? `${window.location.origin}/#organization?invite=${organization.slug || organization._id}` : ''

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', color: '#fff', fontFamily: 'var(--font-sans)' }}>
            
            {/* ALERT NOTIFICATIONS */}
            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconAlertTriangle size={15} color="#f87171" />
                        <span>{error}</span>
                    </div>
                    {(organizationId || organizations.length > 0) && (
                        <button
                            type="button"
                            onClick={() => loadOrganization(organizationId || organizations[0]._id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            <IconRefresh size={12} />
                            <span>Retry</span>
                        </button>
                    )}
                </div>
            )}
            {successMessage && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconCheck size={15} color="#4ade80" />
                    <span>{successMessage}</span>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading enterprise workspace profile...
                </div>
            ) : organization ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* TOP HERO HEADER & INTERACTIVE METRICS */}
                    <OrganizationHeroHeader
                        organization={organization}
                        teamsCount={teams.length}
                        channelsCount={channels.length}
                        activeSubTab={activeSubTab}
                        setActiveSubTab={setActiveSubTab}
                        copiedOwner={copiedOwner}
                        copiedSlug={copiedSlug}
                        copiedInviteLink={copiedInviteLink}
                        inviteLinkUrl={inviteLinkUrl}
                        onCopy={copyToClipboard}
                        onOpenInviteModal={() => setShowInviteModal(true)}
                        onOpenCreateModal={() => setShowCreateModal(true)}
                    />

                    {/* QUICK WORKSPACE SHORTCUT BAR */}
                    <div className="glass-card" style={{ padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconZap size={15} color="#eab308" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Workspace Actions:</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="btn"
                                style={{
                                    height: 28,
                                    padding: '0 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ade80',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <IconPlus size={13} />
                                <span>Invite Member</span>
                            </button>

                            <button
                                onClick={() => setShowCreateTeamModal(true)}
                                className="btn"
                                style={{
                                    height: 28,
                                    padding: '0 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: '#818cf8',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <IconPlus size={13} />
                                <span>New Department</span>
                            </button>

                            <button
                                onClick={() => setActiveSubTab('roles')}
                                className="btn"
                                style={{
                                    height: 28,
                                    padding: '0 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    color: '#c084fc',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <IconShield size={13} />
                                <span>Manage Roles</span>
                            </button>

                            <button
                                onClick={() => setActiveSubTab('settings')}
                                className="btn"
                                style={{
                                    height: 28,
                                    padding: '0 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#d4d4d8',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <IconSettings size={13} />
                                <span>Workspace Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* SEGMENTED TAB NAVIGATION */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                        {[
                            { id: 'members', label: `Members (${organization.members?.length || 0})`, icon: <IconUsers size={14} /> },
                            { id: 'departments', label: `Departments (${teams.length})`, icon: <IconBuilding size={14} /> },
                            { id: 'channels', label: `Channels (${channels.length})`, icon: <IconHash size={14} /> },
                            { id: 'roles', label: 'Roles & Access', icon: <IconShield size={14} /> },
                            { id: 'billing', label: 'Subscription & Quotas', icon: <IconCreditCard size={14} /> },
                            { id: 'settings', label: 'Organization Profile', icon: <IconSettings size={14} /> },
                            { id: 'integrations', label: 'Integrations & Webhooks', icon: <IconZap size={14} /> },
                            { id: 'danger', label: 'Danger Zone', icon: <IconAlertTriangle size={14} color="#f87171" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id as any)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeSubTab === tab.id ? '2px solid #6366F1' : '2px solid transparent',
                                    color: activeSubTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                                    padding: '8px 14px',
                                    fontSize: '0.8125rem',
                                    fontWeight: activeSubTab === tab.id ? 700 : 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* TAB 1: MEMBERS */}
                    {activeSubTab === 'members' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <MemberList
                                organizationId={organization._id}
                                token={token}
                                initialMembers={organization.members}
                                onRemove={handleRemoveMember}
                                onRoleUpdated={() => loadOrganization(organization._id)}
                                onInviteClick={() => setShowInviteModal(true)}
                            />
                        </div>
                    )}

                    {/* TAB 2: DEPARTMENTS & TEAMS */}
                    {activeSubTab === 'departments' && (
                        <OrganizationDepartmentsTab
                            organization={organization}
                            teams={teams}
                            channels={channels}
                            onOpenCreateTeamModal={() => setShowCreateTeamModal(true)}
                        />
                    )}

                    {/* TAB 3: CHANNELS */}
                    {activeSubTab === 'channels' && (
                        <OrganizationChannelsTab
                            channels={channels}
                        />
                    )}

                    {/* TAB 4: ROLES & ACCESS MATRIX */}
                    {activeSubTab === 'roles' && (
                        <OrganizationRolesTab />
                    )}

                    {/* TAB 5: PROFILE & SETTINGS */}
                    {activeSubTab === 'settings' && (
                        <OrganizationProfileTab
                            organization={organization}
                            token={token}
                            onOrganizationUpdated={(updated) => {
                                setOrganization(updated)
                                setSuccessMessage('Organization profile & enterprise policies updated successfully!')
                                setTimeout(() => setSuccessMessage(''), 3500)
                            }}
                        />
                    )}

                    {/* TAB: ENTERPRISE INTEGRATIONS & WEBHOOKS */}
                    {activeSubTab === 'integrations' && (
                        <IntegrationsTab 
                            token={token} 
                            currentOrgId={organization._id} 
                            planTier={organization.planTier || 'enterprise'}
                        />
                    )}

                    {/* TAB: SUBSCRIPTION & QUOTA USAGE */}
                    {activeSubTab === 'billing' && (
                        <OrganizationBillingTab
                            organization={organization}
                            token={token}
                            billingTransactions={billingTransactions}
                            loadingTransactions={loadingTransactions}
                            onOpenUpgradeModal={() => {
                                loadPlans()
                                setShowUpgradeModal(true)
                            }}
                            onRefreshTransactions={() => loadBillingTransactions(organization._id)}
                        />
                    )}

                    {/* TAB 6: DANGER ZONE */}
                    {activeSubTab === 'danger' && (
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconAlertTriangle size={18} color="#ef4444" />
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#EF4444', margin: 0 }}>Danger Zone</h3>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                Irreversible actions regarding your account and organization membership.
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Leave Organization</h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                                        Revoke all your workspace privileges, room accesses, and team roles for {organization.name}.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to leave this organization? This action is irreversible.')) {
                                            handleLeaveOrganization();
                                        }
                                    }}
                                    className="btn btn-danger"
                                    style={{
                                        height: 32,
                                        padding: '0 14px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Leave Organization
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            ) : organizations && organizations.length > 0 ? (
                <div className="glass-card" style={{ padding: 'clamp(24px, 4vw, 36px)', display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'center', alignItems: 'center' }}>
                    <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconBuilding size={28} color="#818cf8" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Select an Organization</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, maxWidth: 460 }}>
                            Choose an organization to manage company settings, team rosters, and member permissions.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, width: '100%', maxWidth: 700 }}>
                        {organizations.map(org => (
                            <div
                                key={org._id}
                                onClick={() => {
                                    onSelectOrganization?.(org._id)
                                    loadOrganization(org._id)
                                }}
                                className="glass-card"
                                style={{
                                    cursor: 'pointer',
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.15s ease',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                            >
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{org.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>slug: {org.slug}</div>
                                </div>
                                <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 600, flexShrink: 0 }}>
                                    Manage →
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: 'clamp(28px, 4vw, 44px)', display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', alignItems: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconBuilding size={32} color="#818cf8" />
                    </div>
                    <div style={{ maxWidth: 480 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Create Your First Organization</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                            Bring together departments, team chat channels, and role-based permissions under a unified enterprise workspace.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                        style={{
                            height: 38,
                            padding: '0 20px',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            borderRadius: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 0 20px rgba(99,102,241,0.3)'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Create Organization Now
                    </button>
                </div>
            )}

            <CreateOrganizationModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateOrganization} />
            <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={handleInviteMember} />
            <CreateTeamModal open={showCreateTeamModal} onClose={() => setShowCreateTeamModal(false)} onCreate={handleCreateTeam} />

            {/* UPGRADE / PLAN PICKER MODAL */}
            <OrganizationUpgradeModal
                open={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                upgradingPlan={upgradingPlan}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
                availablePlans={availablePlans}
                currentPlanTier={organization?.planTier || 'free'}
                onUpgradePlan={handleUpgradePlan}
                onInitiateRazorpay={handleInitiateRazorpay}
            />
        </div>
    )
}
