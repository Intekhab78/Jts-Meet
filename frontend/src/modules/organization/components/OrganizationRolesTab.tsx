import React from 'react'
import { IconCheck } from '../../../components/common/Icons'

const ROLES_MATRIX = [
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
]

export function OrganizationRolesTab() {
    return (
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
                        {ROLES_MATRIX.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/2">
                                <td style={{ padding: '9px 14px', fontWeight: 500, color: '#e4e4e7' }}>{row.cap}</td>
                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.owner ? <IconCheck size={14} color="#4ade80" /> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.admin ? <IconCheck size={14} color="#4ade80" /> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.member ? <IconCheck size={14} color="#4ade80" /> : <span style={{ color: '#52525b' }}>—</span>}</td>
                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>{row.guest ? <IconCheck size={14} color="#4ade80" /> : <span style={{ color: '#52525b' }}>—</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
