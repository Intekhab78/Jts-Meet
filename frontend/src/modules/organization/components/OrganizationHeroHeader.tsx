import React from 'react'
import type { Organization } from '../organization.types'
import {
    IconGlobe,
    IconCalendar,
    IconLock,
    IconCheck,
    IconCopy,
    IconExternalLink
} from '../../../components/common/Icons'

interface OrganizationHeroHeaderProps {
    organization: Organization
    teamsCount: number
    channelsCount: number
    activeSubTab: string
    setActiveSubTab: (tab: 'members' | 'departments' | 'channels' | 'roles' | 'billing' | 'settings' | 'integrations' | 'danger') => void
    copiedOwner: boolean
    copiedSlug: boolean
    copiedInviteLink: boolean
    inviteLinkUrl: string
    onCopy: (text: string, type: 'owner' | 'slug' | 'invite') => void
    onOpenInviteModal: () => void
    onOpenCreateModal: () => void
}

export function OrganizationHeroHeader({
    organization,
    teamsCount,
    channelsCount,
    activeSubTab,
    setActiveSubTab,
    copiedOwner,
    copiedSlug,
    copiedInviteLink,
    inviteLinkUrl,
    onCopy,
    onOpenInviteModal,
    onOpenCreateModal
}: OrganizationHeroHeaderProps) {
    return (
        <>
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
                                    onClick={() => onCopy(organization.slug, 'slug')}
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
                                    {copiedSlug ? <IconCheck size={11} color="#4ade80" /> : <IconCopy size={11} />}
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
                            onClick={() => onCopy(inviteLinkUrl, 'invite')}
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
                            {copiedInviteLink ? <IconCheck size={13} color="#4ade80" /> : <IconExternalLink size={13} />}
                            <span>{copiedInviteLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
                        </button>

                        <button
                            onClick={onOpenInviteModal}
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
                            onClick={onOpenCreateModal}
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
                        <IconGlobe size={13} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)' }}>Timezone:</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{organization.timezone || 'UTC'}</span>
                    </div>

                    <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconCalendar size={13} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)' }}>Created:</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{new Date(organization.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>

                    <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconLock size={13} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)' }}>Owner ID:</span>
                        <span style={{ fontFamily: 'monospace', color: '#e4e4e7', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                            {String(organization.ownerId || '').slice(0, 12)}...
                        </span>
                        <button
                            type="button"
                            onClick={() => onCopy(String(organization.ownerId || ''), 'owner')}
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
                        val: teamsCount,
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
                        val: channelsCount,
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
        </>
    )
}
