import React from 'react'
import type { Team } from '../team.types'
import {
    IconUsers, IconHash, IconShield, IconCalendar,
    IconGlobe, IconLock, IconVideo, IconUserPlus
} from '../../../components/common/Icons'

interface TeamOverviewTabProps {
    selectedTeam: Team
    teamChannelsCount: number
    onStartTeamMeeting: () => void
    onScheduleTeamMeeting: () => void
    onOpenInviteModal: () => void
}

export function TeamOverviewTab({
    selectedTeam,
    teamChannelsCount,
    onStartTeamMeeting,
    onScheduleTeamMeeting,
    onOpenInviteModal
}: TeamOverviewTabProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <IconUsers size={13} color="#818cf8" /> Total Members
                    </span>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>{selectedTeam.members.length}</h3>
                    <span style={{ fontSize: '0.7rem', color: '#4ade80', marginTop: 4, display: 'block' }}>● Active workspace members</span>
                </div>

                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <IconHash size={13} color="#818cf8" /> Channels
                    </span>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>{teamChannelsCount}</h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>Text & Voice spaces</span>
                </div>

                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <IconShield size={13} color="#818cf8" /> Privacy Mode
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '8px 0 0', color: '#fff', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {selectedTeam.visibility === 'public' ? <><IconGlobe size={16} /> Public</> : <><IconLock size={16} /> Private</>}
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                        {selectedTeam.visibility === 'public' ? 'Open to all colleagues' : 'Restricted to invited members'}
                    </span>
                </div>

                <div className="glass-card" style={{ padding: '16px 18px', borderRadius: 12 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <IconCalendar size={13} color="#818cf8" /> Created Date
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '8px 0 0', color: '#fff' }}>
                        {selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Active'}
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>Status: ● Active</span>
                </div>
            </div>

            {/* Mission & Description */}
            <div className="glass-card" style={{ padding: '20px 22px', borderRadius: 12 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>About this Team</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    {selectedTeam.description || 'No description provided for this team yet. Use the Settings tab to add a clear mission statement and purpose for your colleagues.'}
                </p>
            </div>

            {/* Quick Collaboration Card */}
            <div className="glass-card" style={{ padding: '20px 22px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff' }}>Quick Collaboration</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={onStartTeamMeeting}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <IconVideo size={14} /> Launch Instant Video Conference
                    </button>
                    <button
                        type="button"
                        onClick={onScheduleTeamMeeting}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <IconCalendar size={14} /> Schedule a Team Sync
                    </button>
                    <button
                        type="button"
                        onClick={onOpenInviteModal}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <IconUserPlus size={14} /> Invite New Colleagues
                    </button>
                </div>
            </div>
        </div>
    )
}
