import React, { useState } from 'react'
import type { AdminUser, LicenseMetrics } from '../../adminConsole.types'
import {
    IconUsers,
    IconSearch,
    IconPlus,
    IconLock,
    IconCheck,
    IconClock,
    IconCrown,
    IconShield,
    IconUser,
    IconExternalLink,
    IconCopy,
    IconZap,
    IconX
} from '../../../../components/common/Icons'

interface AdminUsersTabProps {
    users: AdminUser[]
    licenseMetrics: LicenseMetrics
    currentOrg: any
    usersLoading: boolean
    userSearch: string
    setUserSearch: (s: string) => void
    roleFilter: string
    setRoleFilter: (r: string) => void
    statusFilter: string
    setStatusFilter: (s: string) => void
    onOpenUpgrade: () => void
    onApproveUser: (user: any) => void
    onApproveAllPending: () => void
    onToggleStatus: (user: any) => void
    onResetPassword: (user: any) => void
    onUpdateRole: () => void
    onInviteUser: (e: React.FormEvent) => void
    inviteModalOpen: boolean
    setInviteModalOpen: (b: boolean) => void
    inviteEmail: string
    setInviteEmail: (s: string) => void
    inviteName: string
    setInviteName: (s: string) => void
    inviteRole: string
    setInviteRole: (s: string) => void
    inviting: boolean
    roleModalUser: any
    setRoleModalUser: (u: any) => void
    selectedNewRole: string
    setSelectedNewRole: (r: string) => void
    updatingRole: boolean
    resetPassResult: { email: string; pass: string } | null
    setResetPassResult: (res: { email: string; pass: string } | null) => void
}

export function AdminUsersTab({
    users,
    licenseMetrics,
    currentOrg,
    usersLoading,
    userSearch,
    setUserSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    onOpenUpgrade,
    onApproveUser,
    onApproveAllPending,
    onToggleStatus,
    onResetPassword,
    onUpdateRole,
    onInviteUser,
    inviteModalOpen,
    setInviteModalOpen,
    inviteEmail,
    setInviteEmail,
    inviteName,
    setInviteName,
    inviteRole,
    setInviteRole,
    inviting,
    roleModalUser,
    setRoleModalUser,
    selectedNewRole,
    setSelectedNewRole,
    updatingRole,
    resetPassResult,
    setResetPassResult
}: AdminUsersTabProps) {
    const [copiedPass, setCopiedPass] = useState(false)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Metrics Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
            }}>
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Accounts
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                        {users.length}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>In {currentOrg?.name || 'Workspace'}</span>
                </div>

                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.25)', background: 'rgba(99, 102, 241, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Enterprise Seats
                        </span>
                        <span style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {licenseMetrics.tier}
                        </span>
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                        {licenseMetrics.usedSeats} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>/ {licenseMetrics.totalSeats} used</span>
                    </div>
                    {/* Capacity Bar */}
                    <div style={{ height: 6, width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${licenseMetrics.utilizationRate}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {licenseMetrics.availableSeats} seats remaining
                        </span>
                        <button
                            type="button"
                            onClick={onOpenUpgrade}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                border: 'none',
                                color: '#fff',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <IconZap size={12} color="#fff" />
                            <span>Upgrade Plan</span>
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.2)', background: 'rgba(34, 197, 94, 0.04)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Active Users
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80', marginTop: 4 }}>
                        {users.filter(u => u.status === 'active').length}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Fully provisioned</span>
                </div>

                <div className="glass-card" style={{
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: users.some(u => u.status === 'pending') ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                    background: users.some(u => u.status === 'pending') ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)'
                }}>
                    <span style={{ fontSize: '0.72rem', color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Pending Approval
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                        {users.filter(u => u.status === 'pending').length}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Awaiting verification</span>
                </div>

                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.04)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Suspended
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', marginTop: 4 }}>
                        {users.filter(u => u.status === 'suspended').length}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Access blocked</span>
                </div>

                {/* Privileged roles */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.2)', background: 'rgba(56, 189, 248, 0.04)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Admins & Roles
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                        {users.filter(u => u.role === 'admin' || u.role === 'super-admin' || u.role === 'owner').length}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Privileged access</span>
                </div>

                {/* Security status */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(45, 212, 191, 0.2)', background: 'rgba(45, 212, 191, 0.04)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Security & SSO
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2dd4bf', marginTop: 4 }}>
                        100%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>E2E Encrypted & 2FA</span>
                </div>

                {/* Cloud storage */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(168, 85, 247, 0.2)', background: 'rgba(168, 85, 247, 0.04)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Cloud Vault
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc', marginTop: 4 }}>
                        2.4 GB
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Recordings & MoM</span>
                </div>
            </div>

            {/* Pending Approvals Notice Banner */}
            {users.filter(u => u.status === 'pending').length > 0 && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: 12,
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconClock size={20} color="#fbbf24" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
                                {users.filter(u => u.status === 'pending').length} User Registration{users.filter(u => u.status === 'pending').length > 1 ? 's' : ''} Awaiting Admin Approval
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#e5e7eb', marginTop: 2 }}>
                                Members in 'Pending' status cannot join secure meetings until verified. Click <strong>✓ Approve</strong> on the user row or approve all at once.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onApproveAllPending}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            padding: '8px 16px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                        }}
                    >
                        <IconCheck size={14} color="#fff" />
                        <span>Approve All Pending ({users.filter(u => u.status === 'pending').length})</span>
                    </button>
                </div>
            )}

            {/* Toolbar: Search, Filters, Invite */}
            <div className="glass-card" style={{
                padding: '12px 16px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: 360 }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                            <IconSearch size={14} color="#71717A" />
                        </span>
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 8,
                                padding: '7px 12px 7px 32px',
                                fontSize: '0.78rem',
                                color: '#fff',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Role filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            padding: '7px 10px',
                            fontSize: '0.75rem',
                            color: '#c4b5fd',
                            outline: 'none'
                        }}
                    >
                        <option value="all" style={{ background: '#111827' }}>All Roles</option>
                        <option value="owner" style={{ background: '#111827' }}>Owner / Super Admin</option>
                        <option value="admin" style={{ background: '#111827' }}>Admin</option>
                        <option value="member" style={{ background: '#111827' }}>Member</option>
                        <option value="guest" style={{ background: '#111827' }}>Guest</option>
                    </select>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            padding: '7px 10px',
                            fontSize: '0.75rem',
                            color: '#c4b5fd',
                            outline: 'none'
                        }}
                    >
                        <option value="all" style={{ background: '#111827' }}>All Statuses</option>
                        <option value="active" style={{ background: '#111827' }}>Active Only</option>
                        <option value="pending" style={{ background: '#111827' }}>Pending Invites</option>
                        <option value="suspended" style={{ background: '#111827' }}>Suspended</option>
                    </select>
                </div>

                {/* Add / Invite Button */}
                <button
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                    }}
                >
                    <IconPlus size={13} color="#fff" />
                    <span>Invite Team Member</span>
                </button>
            </div>

            {/* Users Table */}
            <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-muted)' }}>User</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Role</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Account Status</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Joined Date</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersLoading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        Loading organization directory...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No team members match the search query.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => {
                                    const isSuspended = u.status === 'suspended'
                                    const roleColor = u.role === 'owner' ? '#fbbf24' : (u.role === 'admin' ? '#a78bfa' : '#60a5fa')
                                    const roleBg = u.role === 'owner' ? 'rgba(245, 158, 11, 0.15)' : (u.role === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)')

                                    return (
                                        <tr key={u.userId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s' }}>
                                            {/* User info */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {u.profileImage ? (
                                                        <img src={u.profileImage} alt={u.fullName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                            color: '#fff',
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.8rem'
                                                        }}>
                                                            {u.fullName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#fff' }}>{u.fullName}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role Pill */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    color: roleColor,
                                                    background: roleBg,
                                                    padding: '3px 8px',
                                                    borderRadius: 6,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}>
                                                    {u.role === 'owner' ? (
                                                        <>
                                                            <IconCrown size={11} color="#fbbf24" />
                                                            <span>Owner</span>
                                                        </>
                                                    ) : u.role === 'admin' ? (
                                                        <>
                                                            <IconShield size={11} color="#a78bfa" />
                                                            <span>Admin</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <IconUser size={11} color="#60a5fa" />
                                                            <span>Member</span>
                                                        </>
                                                    )}
                                                </span>
                                            </td>

                                            {/* Account Status Badge */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600,
                                                    color: isSuspended ? '#f87171' : (u.status === 'pending' ? '#fbbf24' : '#4ade80'),
                                                    background: isSuspended ? 'rgba(239, 68, 68, 0.15)' : (u.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)'),
                                                    padding: '2px 8px',
                                                    borderRadius: 12
                                                }}>
                                                    <span style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: isSuspended ? '#ef4444' : (u.status === 'pending' ? '#f59e0b' : '#22c55e'),
                                                        boxShadow: isSuspended ? '0 0 6px #ef4444' : (u.status === 'pending' ? '0 0 6px #f59e0b' : '0 0 6px #22c55e')
                                                    }} />
                                                    <span style={{ textTransform: 'capitalize' }}>{u.status}</span>
                                                </span>
                                            </td>

                                            {/* Joined Date */}
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                                {new Date(u.joinedAt).toLocaleDateString()}
                                            </td>

                                            {/* Actions Toolbar */}
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                    {/* Change Role */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRoleModalUser(u)
                                                            setSelectedNewRole(u.role)
                                                        }}
                                                        title="Change Role"
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: 6,
                                                            color: '#c4b5fd',
                                                            padding: '4px 8px',
                                                            fontSize: '0.72rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Role
                                                    </button>

                                                    {/* Reset Password */}
                                                    <button
                                                        type="button"
                                                        onClick={() => onResetPassword(u)}
                                                        title="Generate Temporary Reset Password"
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: 6,
                                                            color: '#e2e8f0',
                                                            padding: '4px 8px',
                                                            fontSize: '0.72rem',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <IconLock size={11} color="#cbd5e1" />
                                                        <span>Reset</span>
                                                    </button>

                                                    {/* If Pending: Show Approve and Reject buttons */}
                                                    {u.status === 'pending' ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => onApproveUser(u)}
                                                                title="Approve & Activate User"
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                    border: '1px solid #10b981',
                                                                    borderRadius: 6,
                                                                    color: '#fff',
                                                                    padding: '4px 10px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                            >
                                                                <IconCheck size={11} color="#fff" />
                                                                <span>Approve</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => onToggleStatus(u)}
                                                                title="Reject User Request"
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    borderRadius: 6,
                                                                    color: '#f87171',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        /* Suspend / Activate Toggle for Active & Suspended users */
                                                        <button
                                                            type="button"
                                                            onClick={() => onToggleStatus(u)}
                                                            title={isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                                                            style={{
                                                                background: isSuspended ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                border: isSuspended ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                                                borderRadius: 6,
                                                                color: isSuspended ? '#4ade80' : '#f87171',
                                                                padding: '4px 8px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {isSuspended ? 'Activate' : 'Suspend'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 1. INVITE MEMBER MODAL */}
            {inviteModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 440,
                        width: '100%',
                        borderRadius: 14,
                        padding: '24px',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <IconPlus size={16} color="#818cf8" />
                                <span>Invite Team Member</span>
                            </h3>
                            <button
                                onClick={() => setInviteModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
                            >
                                <IconX size={14} color="#9ca3af" />
                            </button>
                        </div>

                        <form onSubmit={onInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    placeholder="e.g. Sarah Jenkins"
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        fontSize: '0.8rem',
                                        color: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                    Corporate Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="sarah@jts.ae"
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        fontSize: '0.8rem',
                                        color: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                    Access Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        fontSize: '0.8rem',
                                        color: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="member" style={{ background: '#111827' }}>Member (Host & Join Meetings)</option>
                                    <option value="admin" style={{ background: '#111827' }}>Admin (Manage Channels & Users)</option>
                                    <option value="guest" style={{ background: '#111827' }}>Guest (Join Allowed Meetings Only)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setInviteModalOpen(false)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#d1d5db',
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '8px 18px',
                                        borderRadius: 8,
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {inviting ? 'Sending Invite...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. CHANGE ROLE MODAL */}
            {roleModalUser && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 380,
                        width: '100%',
                        borderRadius: 14,
                        padding: '22px',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                    }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                            <IconCrown size={16} color="#fbbf24" />
                            <span>Change Access Role</span>
                        </h3>
                        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            Modify administrative permissions for <strong>{roleModalUser.fullName}</strong>.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                            {[
                                { id: 'admin', title: 'Administrator', icon: <IconShield size={14} color="#a78bfa" />, desc: 'Can manage organization, channels, and team accounts.' },
                                { id: 'member', title: 'Member', icon: <IconUser size={14} color="#60a5fa" />, desc: 'Can host conferences, create channels, and invite guests.' },
                                { id: 'guest', title: 'Guest', icon: <IconExternalLink size={14} color="#94a3b8" />, desc: 'Limited participant access to invited rooms only.' }
                            ].map(r => (
                                <label
                                    key={r.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 10,
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        background: selectedNewRole === r.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                        border: selectedNewRole === r.id ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.06)'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="role_select"
                                        checked={selectedNewRole === r.id}
                                        onChange={() => setSelectedNewRole(r.id)}
                                        style={{ marginTop: 2, accentColor: '#6366f1' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {r.icon}
                                            <span>{r.title}</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{r.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setRoleModalUser(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#d1d5db',
                                    padding: '7px 14px',
                                    borderRadius: 6,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onUpdateRole}
                                disabled={updatingRole}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '7px 16px',
                                    borderRadius: 6,
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                {updatingRole ? 'Updating...' : 'Confirm Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. RESET PASSWORD RESULT MODAL */}
            {resetPassResult && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 400,
                        width: '100%',
                        borderRadius: 14,
                        padding: '24px',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        textAlign: 'center'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconLock size={26} color="#4ade80" />
                            </div>
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                            Temporary Password Generated
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            Share this temporary password with <strong>{resetPassResult.email}</strong>. They will be prompted to change it upon login.
                        </p>

                        <div style={{
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '12px',
                            borderRadius: 8,
                            fontFamily: 'monospace',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: '#4ade80',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            marginBottom: 16
                        }}>
                            <span>{resetPassResult.pass}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(resetPassResult.pass)
                                    setCopiedPass(true)
                                    setTimeout(() => setCopiedPass(false), 2000)
                                }}
                                style={{
                                    background: copiedPass ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: copiedPass ? '1px solid #4ade80' : 'none',
                                    color: copiedPass ? '#4ade80' : '#fff',
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                {copiedPass ? (
                                    <>
                                        <IconCheck size={13} color="#4ade80" />
                                        <span>Copied to Clipboard</span>
                                    </>
                                ) : (
                                    <>
                                        <IconCopy size={13} color="#fff" />
                                        <span>Copy Password</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setResetPassResult(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#d1d5db',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
