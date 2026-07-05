import React, { useEffect, useState } from 'react'
import { createOrganization, getOrganization, updateOrganization, inviteOrganizationMember, removeOrganizationMember, leaveOrganization } from './organization.service'
import type { Organization, UpdateOrganizationPayload } from './organization.types'
import { CreateOrganizationModal } from './CreateOrganizationModal'
import { InviteMemberModal } from './InviteMemberModal'
import { MemberList } from './MemberList'
import { listOrganizationTeams } from '../team/team.service'
import { listTeamChannels } from '../channel/channel.service'

interface OrganizationSettingsPageProps {
    token: string
    organizationId?: string
}

export function OrganizationSettingsPage({ token, organizationId }: OrganizationSettingsPageProps) {
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [error, setError] = useState('')
    const [teamsCount, setTeamsCount] = useState(0)
    const [channelsCount, setChannelsCount] = useState(0)

    const loadOrganization = async (orgId: string) => {
        setLoading(true)
        try {
            const org = await getOrganization(orgId, token)
            setOrganization(org)

            // Dynamic loading of teams & channels count
            try {
                const teamsList = await listOrganizationTeams(orgId, token)
                setTeamsCount(teamsList.length)

                let totalChannels = 0
                for (const team of teamsList) {
                    try {
                        const chList = await listTeamChannels(team._id, token)
                        totalChannels += chList.length
                    } catch (e) {
                        console.error('Failed to load channels for team', team._id, e)
                    }
                }
                setChannelsCount(totalChannels)
            } catch (teamErr) {
                console.error('Failed to load teams/channels for stats:', teamErr)
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to load organization')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (organizationId) {
            loadOrganization(organizationId)
        }
    }, [organizationId])

    const handleCreateOrganization = async (payload: any) => {
        const org = await createOrganization(payload, token)
        setOrganization(org)
    }

    const handleUpdateOrganization = async (payload: UpdateOrganizationPayload) => {
        if (!organization) {
            return
        }
        const org = await updateOrganization(organization._id, payload, token)
        setOrganization(org)
    }

    const handleInviteMember = async (userId: string, role: string) => {
        if (!organization) {
            return
        }
        const org = await inviteOrganizationMember({ organizationId: organization._id, userId, role: role as any }, token)
        setOrganization(org)
    }

    const handleRemoveMember = async (userId: string) => {
        if (!organization) {
            return
        }
        const org = await removeOrganizationMember({ organizationId: organization._id, userId }, token)
        setOrganization(org)
    }

    const handleLeaveOrganization = async () => {
        if (!organization) {
            return
        }
        const org = await leaveOrganization({ organizationId: organization._id, userId: '' }, token)
        setOrganization(org)
    }

    const scrollToForm = () => {
        const formEl = document.getElementById('org-profile-form');
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="px-4 py-6 md:p-10" style={{ background: '#09090B', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Organization</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                        <span style={{ color: '#6366F1' }}>Settings</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold" style={{ margin: 0, letterSpacing: '-0.03em', background: 'linear-gradient(to right, #ffffff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Organization Settings
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                        Manage organization profile, members, permissions, and workspace settings.
                    </p>
                </div>

                <div className="w-full sm:w-auto">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn w-full sm:w-auto justify-center"
                        style={{
                            height: '42px',
                            borderRadius: '12px',
                            padding: '0 20px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'transform 150ms'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Create Organization
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '14px 18px', borderRadius: '14px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠</span>
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9375rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading organization settings profile...
                </div>
            ) : organization ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* SECTION 2: Quick Statistics */}
                    <style>{`
                        .stats-grid-org {
                            display: grid !important;
                            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                            gap: 24px !important;
                        }
                        @media (min-width: 640px) {
                            .stats-grid-org {
                                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                            }
                        }
                        @media (min-width: 1024px) {
                            .stats-grid-org {
                                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                            }
                        }
                    `}</style>
                    <div className="stats-grid-org">
                        {[
                            {
                                title: 'Members',
                                val: organization.members.length,
                                desc: 'Active workspace collaborators',
                                color: '#6366F1',
                                icon: (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                )
                            },
                            {
                                title: 'Teams',
                                val: teamsCount,
                                desc: 'Structured departments & cells',
                                color: '#8B5CF6',
                                icon: (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>
                                    </svg>
                                )
                            },
                            {
                                title: 'Channels',
                                val: channelsCount,
                                desc: 'Active conversation threads',
                                color: '#22C55E',
                                icon: (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                                        <line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>
                                    </svg>
                                )
                            },
                            {
                                title: 'Pending Invites',
                                val: organization.members.filter(m => m.status === 'pending').length,
                                desc: 'Awaiting team verification',
                                color: '#F59E0B',
                                icon: (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                )
                            }
                        ].map((stat, idx) => (
                            <div
                                key={idx}
                                style={{
                                    background: '#111827',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '18px',
                                    padding: '20px 24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 200ms ease-in-out',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                    e.currentTarget.style.boxShadow = `0 10px 20px rgba(0,0,0,0.2), 0 0 15px ${stat.color}15`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.title}</span>
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stat.val}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{stat.desc}</span>
                                </div>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {stat.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Left Column: SECTION 1 & SECTION 3 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            
                            {/* SECTION 1: Organization Overview */}
                            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: '#fff',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                    }}>
                                        {organization.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>{organization.name}</h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>/{organization.slug}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8125rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                                        <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: '0.625rem', fontWeight: 700, borderRadius: '6px' }}>
                                            {organization.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Timezone:</span>
                                        <span style={{ fontWeight: 600, color: '#fff' }}>{organization.timezone || 'UTC'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Created:</span>
                                        <span style={{ fontWeight: 600, color: '#fff' }}>{new Date(organization.createdAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Owner ID:</span>
                                        <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{organization.ownerId}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={scrollToForm}
                                    className="btn btn-secondary"
                                    style={{
                                        width: '100%',
                                        height: '38px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        fontSize: '0.8125rem',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        transition: 'all 150ms'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    Edit Organization Details
                                </button>
                            </div>

                            {/* SECTION 3: Workspace Actions */}
                            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h3 style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Quick Workspace Actions</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        {
                                            title: 'Invite Members',
                                            desc: 'Add new collaborators to this workspace.',
                                            btnText: 'Invite',
                                            btnClass: 'btn-success',
                                            btnStyle: { background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)', border: 'none' },
                                            action: () => setShowInviteModal(true)
                                        },
                                        {
                                            title: 'Manage Roles',
                                            desc: 'Configure workspace permissions and attributes.',
                                            btnText: 'Configure',
                                            btnClass: 'btn-secondary',
                                            btnStyle: { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
                                            action: () => alert('Scroll to the Roles & Permissions section below to read permissions!')
                                        }
                                    ].map((act, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{act.title}</h4>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{act.desc}</p>
                                            </div>
                                            <button
                                                onClick={act.action}
                                                className={`btn ${act.btnClass} w-full sm:w-auto`}
                                                style={{
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '0 12px',
                                                    cursor: 'pointer',
                                                    color: '#fff',
                                                    ...act.btnStyle
                                                }}
                                            >
                                                {act.btnText}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Columns: SECTION 4 & SECTION 5 */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* SECTION 4: Organization Profile */}
                            <div id="org-profile-form" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>Organization Profile</h3>
                                <form
                                    onSubmit={async (event) => {
                                        event.preventDefault()
                                        await handleUpdateOrganization({ description: organization.description || '', timezone: organization.timezone, logo: organization.logo || '' })
                                        alert('Organization profile updated successfully!')
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Organization Name</label>
                                            <input
                                                type="text"
                                                value={organization.name}
                                                onChange={(e) => setOrganization((current) => current && { ...current, name: e.target.value })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '10px 12px',
                                                    fontSize: '0.875rem',
                                                    color: '#fff',
                                                    outline: 'none',
                                                    transition: 'border-color 150ms'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Default Timezone</label>
                                            <input
                                                value={organization.timezone || 'UTC'}
                                                onChange={(event) => setOrganization((current) => current && { ...current, timezone: event.target.value })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '10px 12px',
                                                    fontSize: '0.875rem',
                                                    color: '#fff',
                                                    outline: 'none',
                                                    transition: 'border-color 150ms'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Organization Description</label>
                                        <textarea
                                            value={organization.description || ''}
                                            onChange={(event) => setOrganization((current) => current && { ...current, description: event.target.value })}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                fontSize: '0.875rem',
                                                color: '#fff',
                                                resize: 'none',
                                                height: '80px',
                                                outline: 'none',
                                                transition: 'border-color 150ms'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{
                                                height: '40px',
                                                borderRadius: '10px',
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
                                                cursor: 'pointer',
                                                padding: '0 24px'
                                            }}
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* SECTION 5: Members */}
                            <MemberList organizationId={organization._id} token={token} onRemove={handleRemoveMember} />
                        </div>
                    </div>

                    {/* SECTION 6: Permissions & Roles */}
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>Roles & Workspace Permissions</h3>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                Details of access tiers and responsibilities assigned inside the organization.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { title: 'Owner', desc: 'Full administration, billing management, deletion, and credentials allocation.', color: '#F59E0B' },
                                { title: 'Admin', desc: 'Can manage workspace channels, invites, team settings, and member moderation.', color: '#8B5CF6' },
                                { title: 'Moderator', desc: 'Assigned to moderate channels, mute participants, and invite team members.', color: '#6366F1' },
                                { title: 'Member', desc: 'Standard access, joining authorized rooms, chat flow, and screen sharing.', color: '#22C55E' },
                                { title: 'Guest', desc: 'External collaborators, restricted view, read-only logs, and meeting joins.', color: '#A1A1AA' }
                            ].map((role, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: role.color }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{role.title}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{role.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 7: Danger Zone */}
                    <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#EF4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Danger Zone
                            </h3>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                Irreversible operations related to your organization membership.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.02)', border: '1px dashed rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', flexWrap: 'wrap', gap: '14px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Leave Organization</h4>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    This will revoke all your workspace permissions and access roles for this organization.
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
                                    height: '38px',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    fontSize: '0.8125rem',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    padding: '0 16px'
                                }}
                            >
                                Leave Organization
                            </button>
                        </div>
                    </div>

                </div>
            ) : (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '18px', background: '#111827' }}>
                    🏢 No organization selected. Choose an organization in the workspace switcher sidebar.
                </div>
            )}

            <CreateOrganizationModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateOrganization} />
            <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={handleInviteMember} />
        </div>
    )
}

