import React, { useState } from 'react'
import type { ChannelMember, ChannelRole } from './channel.types'

interface ChannelMembersPageProps {
    members: ChannelMember[]
    currentUserId?: string
    onRemove?: (userId: string) => Promise<void>
    onRoleChange?: (userId: string, role: Exclude<ChannelRole, 'owner'>) => Promise<void>
}

export function ChannelMembersPage({ members, currentUserId, onRemove, onRoleChange }: ChannelMembersPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')

    // Filter members in-memory
    const filteredMembers = members.filter((member) => {
        const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null;
        const fullName = (userObj ? userObj.fullName : (member.user?.fullName || '')).toLowerCase();
        const email = (userObj ? userObj.email : (member.user?.email || '')).toLowerCase();
        
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });

    return (
        <div className="glass-card lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>Channel Members</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        Manage visibility permissions and member roles.
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
                            width: '180px',
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
                        <option value="moderator">Moderator</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                    </select>
                </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>User</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Role / Permissions</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Joined At</th>
                            <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No channel members found.
                                </td>
                            </tr>
                        ) : (
                            filteredMembers.map((member) => {
                                const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null;
                                const userIdStr = userObj ? userObj._id : (member.userId as string);
                                const fullName = userObj ? userObj.fullName : (member.user?.fullName || userIdStr);
                                const email = userObj ? userObj.email : (member.user?.email || 'No email available');
                                const joinedStr = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A';

                                return (
                                    <tr key={userIdStr} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 150ms' }} className="hover:bg-white/2">
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
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
                                                    <span style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {fullName}
                                                        {userIdStr === currentUserId && (
                                                            <span style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.625rem', padding: '1px 5px', borderRadius: '4px' }}>You</span>
                                                        )}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            {onRoleChange && member.role !== 'owner' ? (
                                                <select
                                                    value={member.role}
                                                    onChange={async (event) => {
                                                        await onRoleChange(userIdStr, event.target.value as Exclude<ChannelRole, 'owner'>);
                                                    }}
                                                    style={{
                                                        background: '#1F2937',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.75rem',
                                                        color: '#fff',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="moderator">Moderator</option>
                                                    <option value="member">Member</option>
                                                    <option value="guest">Guest</option>
                                                </select>
                                            ) : (
                                                <span style={{
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    color: '#F59E0B',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                    borderRadius: '8px',
                                                    padding: '2px 8px',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.02em'
                                                }}>
                                                    {member.role}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 18px', color: 'var(--color-text-muted)' }}>
                                            {joinedStr}
                                        </td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                            {onRemove && userIdStr !== currentUserId && member.role !== 'owner' && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm(`Remove ${fullName} from this channel?`)) {
                                                            await onRemove(userIdStr);
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
