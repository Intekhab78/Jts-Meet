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
    const [activeSubTab, setActiveSubTab] = useState<'members' | 'departments' | 'channels' | 'roles' | 'settings' | 'danger'>('members')
    const [copiedOwner, setCopiedOwner] = useState(false)
    const [copiedSlug, setCopiedSlug] = useState(false)
    const [copiedInviteLink, setCopiedInviteLink] = useState(false)

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
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                    {(organizationId || organizations.length > 0) && (
                        <button
                            type="button"
                            onClick={() => loadOrganization(organizationId || organizations[0]._id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: 6, cursor: 'pointer' }}
                        >
                            🔄 Retry
                        </button>
                    )}
                </div>
            )}
            {successMessage && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span>
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

                    {/* TOP HERO CARD: TEAMS / SLACK STYLE ENTERPRISE HEADER */}
                    <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            
                            {/* Left: Avatar + Title + Inline Badges */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    minWidth: 44,
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.125rem',
                                    fontWeight: 800,
                                    color: '#fff',
                                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)'
                                }}>
                                    {organization.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                                            {organization.name}
                                        </h2>
                                        
                                        {/* Status badge */}
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 8px',
                                            borderRadius: 20,
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            background: organization.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            color: organization.status === 'active' ? '#4ade80' : '#fbbf24',
                                            border: `1px solid ${organization.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                        }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                                            {organization.status.toUpperCase()}
                                        </span>

                                        {/* Slug pill with copy */}
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(organization.slug, 'slug')}
                                            title="Click to copy slug"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '2px 7px',
                                                borderRadius: 6,
                                                fontSize: '0.6875rem',
                                                fontFamily: 'monospace',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#a1a1aa',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            /{organization.slug}
                                            <span style={{ fontSize: '0.65rem' }}>{copiedSlug ? '✓' : '📋'}</span>
                                        </button>
                                    </div>

                                    {/* Inline description */}
                                    {organization.description && (
                                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                                            {organization.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Inline Compact Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(inviteLinkUrl, 'invite')}
                                    className="btn btn-secondary"
                                    style={{
                                        height: 32,
                                        padding: '0 12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        color: copiedInviteLink ? '#4ade80' : '#818cf8',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}
                                    title="Copy public invitation link"
                                >
                                    <span>{copiedInviteLink ? '✓' : '🔗'}</span>
                                    <span>{copiedInviteLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
                                </button>

                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="btn btn-primary"
                                    style={{
                                        height: 32,
                                        padding: '0 14px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                        border: 'none',
                                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Invite Member
                                </button>

                                <button
                                    onClick={() => setActiveSubTab('settings')}
                                    className="btn btn-secondary"
                                    style={{
                                        height: 32,
                                        padding: '0 12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: activeSubTab === 'settings' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                        border: `1px solid ${activeSubTab === 'settings' ? '#6366F1' : 'rgba(255, 255, 255, 0.1)'}`,
                                        color: '#fff',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                    Edit Details
                                </button>

                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="btn btn-secondary"
                                    style={{
                                        height: 32,
                                        padding: '0 12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#fff',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}
                                    title="Create another organization"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    New Org
                                </button>
                            </div>
                        </div>

                        {/* COMPACT INLINE METADATA BAR */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px 16px',
                            paddingTop: 10,
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>🌐 Timezone:</span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{organization.timezone || 'UTC'}</span>
                            </div>

                            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>📅 Created:</span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{new Date(organization.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>

                            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>🔑 Owner ID:</span>
                                <span style={{ fontFamily: 'monospace', color: '#e4e4e7', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                                    {String(organization.ownerId || '').slice(0, 12)}...
                                </span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(String(organization.ownerId || ''), 'owner')}
                                    title="Copy full owner ID"
                                    style={{ background: 'transparent', border: 'none', color: copiedOwner ? '#4ade80' : '#818cf8', cursor: 'pointer', padding: 0, fontSize: '0.7rem' }}
                                >
                                    {copiedOwner ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* COMPACT 4-STAT INTERACTIVE METRIC ROW (Teams Style - Clickable!) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                        {[
                            {
                                id: 'members',
                                label: 'Members',
                                val: organization.members?.length || 0,
                                sub: 'Collaborators',
                                color: '#6366F1',
                                icon: (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
                                    </svg>
                                )
                            },
                            {
                                id: 'departments',
                                label: 'Departments',
                                val: teams.length,
                                sub: 'Active teams',
                                color: '#8B5CF6',
                                icon: (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5">
                                        <rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect>
                                    </svg>
                                )
                            },
                            {
                                id: 'channels',
                                label: 'Channels',
                                val: channels.length,
                                sub: 'Chat streams',
                                color: '#22C55E',
                                icon: (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                                        <line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line>
                                        <line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>
                                    </svg>
                                )
                            },
                            {
                                id: 'pending',
                                label: 'Pending',
                                val: organization.members?.filter(m => m.status === 'pending').length || 0,
                                sub: 'Invites sent',
                                color: '#F59E0B',
                                icon: (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    </svg>
                                )
                            }
                        ].map((item) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'pending') {
                                        setActiveSubTab('members')
                                    } else {
                                        setActiveSubTab(item.id as any)
                                    }
                                }}
                                className="glass-card"
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: activeSubTab === item.id ? `1px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                    e.currentTarget.style.borderColor = item.color
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    if (activeSubTab !== item.id) {
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
                                    }
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 2 }}>{item.val}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 1 }}>{item.sub}</div>
                                </div>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {item.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* QUICK WORKSPACE SHORTCUT BAR */}
                    <div className="glass-card" style={{ padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.85rem' }}>⚡</span>
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
                                <span>+</span>
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
                                <span>+</span>
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
                                <span>🛡️</span>
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
                                <span>⚙️</span>
                                <span>Workspace Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* SEGMENTED TAB NAVIGATION (Teams Style) */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                        {[
                            { id: 'members', label: `Members (${organization.members?.length || 0})`, icon: '👥' },
                            { id: 'departments', label: `Departments (${teams.length})`, icon: '🏢' },
                            { id: 'channels', label: `Channels (${channels.length})`, icon: '💬' },
                            { id: 'roles', label: 'Roles & Access', icon: '🛡️' },
                            { id: 'settings', label: 'Organization Profile', icon: '⚙️' },
                            { id: 'danger', label: 'Danger Zone', icon: '⚠️' }
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
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>Active Departments & Teams</span>
                                        <span style={{ fontSize: '0.72rem', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                                            {teams.length} Active
                                        </span>
                                    </h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                        Cross-functional units, departments, and project workgroups in {organization.name}.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateTeamModal(true)}
                                    className="btn btn-primary"
                                    style={{
                                        height: 32,
                                        padding: '0 14px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>+</span>
                                    <span>New Department</span>
                                </button>
                            </div>

                            {teams.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🏢</div>
                                    <div style={{ fontWeight: 600, color: '#fff' }}>No departments created yet</div>
                                    <p style={{ fontSize: '0.75rem', margin: '4px 0 12px' }}>Create departments like Engineering, Sales, or Marketing to organize your company.</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateTeamModal(true)}
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: 8 }}
                                    >
                                        Create Department
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                    {teams.map((t) => {
                                        const teamChannels = channels.filter(c => c.teamId === t._id)
                                        return (
                                            <div
                                                key={t._id}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: 12,
                                                    padding: '14px 16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: 7,
                                                                background: t.color ? `${t.color}25` : 'rgba(99, 102, 241, 0.2)',
                                                                border: `1px solid ${t.color || '#6366F1'}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                color: t.color || '#6366F1'
                                                            }}>
                                                                {t.name.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{t.name}</h4>
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.625rem',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            background: t.visibility === 'public' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                            color: t.visibility === 'public' ? '#4ade80' : '#fbbf24',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {t.visibility}
                                                        </span>
                                                    </div>

                                                    <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--color-text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {t.description || 'General department workspace for cross-team coordination and files.'}
                                                    </p>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 10 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                        <span>👥 {t.members?.length || 0} members</span>
                                                        <span>•</span>
                                                        <span>💬 {teamChannels.length} channels</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            window.location.hash = '#team'
                                                        }}
                                                        style={{
                                                            padding: '3px 10px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            background: 'rgba(99, 102, 241, 0.12)',
                                                            border: '1px solid rgba(99, 102, 241, 0.25)',
                                                            borderRadius: 6,
                                                            color: '#818cf8',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Manage →
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: CHANNELS */}
                    {activeSubTab === 'channels' && (
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>Organization Channels & Chat Streams</span>
                                    <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                                        {channels.length} Total
                                    </span>
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                    Persistent chat rooms, topic threads, and announcement channels across all departments.
                                </p>
                            </div>

                            {channels.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>💬</div>
                                    <div style={{ fontWeight: 600, color: '#fff' }}>No channels found in this organization</div>
                                    <p style={{ fontSize: '0.75rem', margin: '4px 0 12px' }}>Channels are hosted within departments. Open a department to create channels.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
                                    <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Channel Name</th>
                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Department</th>
                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Type</th>
                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Members</th>
                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {channels.map((ch) => (
                                                <tr key={ch._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/2">
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.85rem' }}>#</span>
                                                            <div>
                                                                <span style={{ fontWeight: 600, color: '#fff' }}>{ch.name}</span>
                                                                {ch.description && (
                                                                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                                                        {ch.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#e4e4e7', fontWeight: 500 }}>
                                                        {ch.teamName || 'General'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            background: ch.type === 'public' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                            color: ch.type === 'public' ? '#4ade80' : '#fbbf24',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {ch.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                                        {ch.members?.length || 0} participants
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                window.location.hash = '#channel'
                                                            }}
                                                            style={{
                                                                padding: '4px 10px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                background: 'rgba(34, 197, 94, 0.1)',
                                                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                                                borderRadius: 6,
                                                                color: '#4ade80',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Open Chat →
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: ROLES & ACCESS MATRIX (Teams Style) */}
                    {activeSubTab === 'roles' && (
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>Enterprise Role & Permissions Matrix</span>
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                    Hierarchical privileges and capability access levels granted to members across this organization.
                                </p>
                            </div>

                            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
                                <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '38%' }}>Workspace Capability</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, color: '#F59E0B', textAlign: 'center' }}>Owner</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, color: '#A78BFA', textAlign: 'center' }}>Admin</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4ADE80', textAlign: 'center' }}>Member</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, color: '#94A3B8', textAlign: 'center' }}>Guest</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { cap: 'Organization Profile & Billing Settings', owner: true, admin: false, member: false, guest: false },
                                            { cap: 'Invite New Collaborators & Guests', owner: true, admin: true, member: false, guest: false },
                                            { cap: 'Promote / Demote Member Roles', owner: true, admin: true, member: false, guest: false },
                                            { cap: 'Create & Manage Departments/Teams', owner: true, admin: true, member: true, guest: false },
                                            { cap: 'Create & Archive Chat Channels', owner: true, admin: true, member: true, guest: false },
                                            { cap: 'Host Video Meetings & Breakout Rooms', owner: true, admin: true, member: true, guest: true },
                                            { cap: 'Live Screen Share & Annotation Tools', owner: true, admin: true, member: true, guest: true },
                                            { cap: 'AI Noise Cancellation & Audio Soundboard', owner: true, admin: true, member: true, guest: true },
                                            { cap: 'Structured Q&A & Poll Moderation', owner: true, admin: true, member: true, guest: false },
                                            { cap: 'Delete / Transfer Organization', owner: true, admin: false, member: false, guest: false }
                                        ].map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/2">
                                                <td style={{ padding: '9px 14px', fontWeight: 500, color: '#e4e4e7' }}>{row.cap}</td>
                                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.owner ? <span style={{ color: '#4ade80', fontWeight: 800 }}>✓</span> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.admin ? <span style={{ color: '#4ade80', fontWeight: 800 }}>✓</span> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.member ? <span style={{ color: '#4ade80', fontWeight: 800 }}>✓</span> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.guest ? <span style={{ color: '#4ade80', fontWeight: 800 }}>✓</span> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: PROFILE & SETTINGS */}
                    {activeSubTab === 'settings' && (
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0 }}>Organization Profile Settings</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                    Update your company name, primary timezone, and public description.
                                </p>
                            </div>

                            <form onSubmit={handleUpdateOrganization} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Organization Name</label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            required
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 8,
                                                padding: '8px 12px',
                                                fontSize: '0.8125rem',
                                                color: '#fff',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Default Timezone</label>
                                        <input
                                            type="text"
                                            value={formTimezone}
                                            onChange={(e) => setFormTimezone(e.target.value)}
                                            placeholder="e.g. Asia/Dubai, UTC, America/New_York"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 8,
                                                padding: '8px 12px',
                                                fontSize: '0.8125rem',
                                                color: '#fff',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Organization Description</label>
                                    <textarea
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Brief summary of organization goals and activity..."
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 8,
                                            padding: '8px 12px',
                                            fontSize: '0.8125rem',
                                            color: '#fff',
                                            resize: 'none',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, marginTop: 4 }}>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn btn-primary"
                                        style={{
                                            height: 34,
                                            padding: '0 20px',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                            border: 'none',
                                            color: '#fff'
                                        }}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSubTab('members')}
                                        className="btn btn-secondary"
                                        style={{
                                            height: 34,
                                            padding: '0 16px',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#fff'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TAB 6: DANGER ZONE */}
                    {activeSubTab === 'danger' && (
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#EF4444', fontSize: '1.1rem' }}>⚠️</span>
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
                    <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                        🏢
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
                    <div style={{ width: 60, height: 60, borderRadius: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                        🏢
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
        </div>
    )
}
