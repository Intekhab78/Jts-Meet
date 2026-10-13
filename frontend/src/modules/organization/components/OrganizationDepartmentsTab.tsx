import React from 'react'
import type { Organization } from '../organization.types'
import type { Team } from '../../team/team.types'
import type { Channel } from '../../channel/channel.types'
import { IconBuilding, IconUsers, IconHash } from '../../../components/common/Icons'

interface OrganizationDepartmentsTabProps {
    organization: Organization
    teams: Team[]
    channels: (Channel & { teamName?: string })[]
    onOpenCreateTeamModal: () => void
}

export function OrganizationDepartmentsTab({
    organization,
    teams,
    channels,
    onOpenCreateTeamModal
}: OrganizationDepartmentsTabProps) {
    return (
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
                    onClick={onOpenCreateTeamModal}
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
                    <div style={{ display: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <IconBuilding size={36} color="#818cf8" strokeWidth={1.5} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>No departments created yet</div>
                    <p style={{ fontSize: '0.75rem', margin: '4px 0 12px' }}>Create departments like Engineering, Sales, or Marketing to organize your company.</p>
                    <button
                        type="button"
                        onClick={onOpenCreateTeamModal}
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
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconUsers size={12} color="var(--color-text-muted)" /> {t.members?.length || 0} members</span>
                                        <span>•</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconHash size={12} color="var(--color-text-muted)" /> {teamChannels.length} channels</span>
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
    )
}
