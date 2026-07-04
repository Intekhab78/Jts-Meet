import React, { useState } from 'react'
import type { OrganizationMember } from './organization.types'

interface MemberListProps {
    members: OrganizationMember[]
    onRemove?: (userId: string) => void
}

export function MemberList({ members, onRemove }: MemberListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    // Filter members in-memory
    const filteredMembers = members.filter((member) => {
        const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null;
        const fullName = (userObj ? userObj.fullName : (member.user?.fullName || '')).toLowerCase();
        const email = (userObj ? userObj.email : (member.user?.email || '')).toLowerCase();
        
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' };
            case 'admin': return { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.2)' };
            case 'moderator': return { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366F1', border: 'rgba(99, 102, 241, 0.2)' };
            case 'member': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.2)' };
            default: return { bg: 'rgba(255, 255, 255, 0.05)', text: '#A1A1AA', border: 'rgba(255, 255, 255, 0.08)' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return { bg: '#22C55E', text: '#fff' };
            case 'pending': return { bg: '#F59E0B', text: '#000' };
            default: return { bg: 'rgba(255, 255, 255, 0.1)', text: '#A1A1AA' };
        }
    };

    return (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>Organization Members</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        Manage access permissions and workspace invitations.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.8125rem',
                            color: '#fff',
                            width: '200px',
                            outline: 'none'
                        }}
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            background: '#1F2937',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.8125rem',
                            color: '#fff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Roles</option>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            background: '#1F2937',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.8125rem',
                            color: '#fff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="removed">Removed</option>
                    </select>
                </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Member</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Role</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Joined Date</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No organization members matched your query.
                                </td>
                            </tr>
                        ) : (
                            filteredMembers.map((member) => {
                                const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null;
                                const userIdStr = userObj ? userObj._id : (member.userId as string);
                                const fullName = userObj ? userObj.fullName : (member.user?.fullName || userIdStr);
                                const email = userObj ? userObj.email : (member.user?.email || 'No email available');
                                const roleColors = getRoleColor(member.role);
                                const joinedStr = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A';

                                return (
                                    <tr key={userIdStr} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 150ms' }} className="hover:bg-white/2">
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600,
                                                    fontSize: '0.8125rem',
                                                    color: '#fff'
                                                }}>
                                                    {fullName.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <span style={{ fontWeight: 600, color: '#fff' }}>{fullName}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <span style={{
                                                background: roleColors.bg,
                                                color: roleColors.text,
                                                border: `1px solid ${roleColors.border}`,
                                                borderRadius: '8px',
                                                padding: '2px 8px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.02em'
                                            }}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: getStatusColor(member.status).bg
                                                }} />
                                                <span style={{ textTransform: 'capitalize', fontWeight: 500, color: '#E5E7EB' }}>{member.status}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px', color: 'var(--color-text-muted)' }}>
                                            {joinedStr}
                                        </td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                            {onRemove && member.status !== 'removed' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to remove ${fullName} from the organization?`)) {
                                                            onRemove(userIdStr);
                                                        }
                                                    }}
                                                    className="btn btn-ghost"
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#EF4444',
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(239, 68, 68, 0.05)',
                                                        border: '1px solid rgba(239, 68, 68, 0.1)',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                        transition: 'all 150ms'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.1)';
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>Showing {filteredMembers.length} of {members.length} members</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button disabled style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', cursor: 'not-allowed' }}>Prev</button>
                    <button disabled style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', cursor: 'not-allowed' }}>Next</button>
                </div>
            </div>
        </div>
    )
}

