import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../../config'

interface AdminConsoleHubProps {
    token: string
    currentUserId: string
    currentOrgId?: string
    organizations: any[]
}

export function AdminConsoleHub({
    token,
    currentUserId,
    currentOrgId,
    organizations
}: AdminConsoleHubProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'recordings'>(() => {
        try {
            const saved = localStorage.getItem('jts_admin_tab')
            if (saved && ['users', 'audit', 'recordings'].includes(saved)) {
                return saved as any
            }
        } catch (_) {}
        return 'users'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_admin_tab', activeTab)
        } catch (_) {}
    }, [activeTab])

    const [auditSubTab, setAuditSubTab] = useState<'logs' | 'attendance'>(() => {
        try {
            const saved = localStorage.getItem('jts_admin_audit_subtab')
            if (saved && ['logs', 'attendance'].includes(saved)) {
                return saved as any
            }
        } catch (_) {}
        return 'logs'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_admin_audit_subtab', auditSubTab)
        } catch (_) {}
    }, [auditSubTab])

    // -------------------------------------------------------------
    // TAB 1: USERS & ROLES STATE
    // -------------------------------------------------------------
    const [users, setUsers] = useState<any[]>([])
    const [licenseMetrics, setLicenseMetrics] = useState<any>({
        totalSeats: 25,
        usedSeats: 0,
        availableSeats: 25,
        tier: 'Enterprise Growth Tier (25 Seats)',
        utilizationRate: 0
    })
    const [usersLoading, setUsersLoading] = useState(false)
    const [userSearch, setUserSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    // Modals
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteName, setInviteName] = useState('')
    const [inviteRole, setInviteRole] = useState('member')
    const [inviting, setInviting] = useState(false)

    const [roleModalUser, setRoleModalUser] = useState<any | null>(null)
    const [selectedNewRole, setSelectedNewRole] = useState('member')
    const [updatingRole, setUpdatingRole] = useState(false)

    const [resetPassResult, setResetPassResult] = useState<{ email: string; pass: string } | null>(null)
    const [copiedPass, setCopiedPass] = useState(false)

    // Notification toast
    const [toastMessage, setToastMessage] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3500)
    }

    // -------------------------------------------------------------
    // TAB 2: AUDIT & ATTENDANCE STATE
    // -------------------------------------------------------------
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditActionFilter, setAuditActionFilter] = useState('ALL')
    const [auditSearch, setAuditSearch] = useState('')

    const [attendanceList, setAttendanceList] = useState<any[]>([])
    const [attendanceLoading, setAttendanceLoading] = useState(false)

    // -------------------------------------------------------------
    // TAB 3: CLOUD RECORDINGS STATE
    // -------------------------------------------------------------
    const [recordings, setRecordings] = useState<any[]>([])
    const [storageMetrics, setStorageMetrics] = useState<any>({
        totalQuotaGb: 50,
        usedGb: 0,
        percentage: 0,
        retentionPolicyDays: 30,
        cloudProvider: 'Amazon Web Services (AWS S3 Middle East DXB-1)'
    })
    const [recordingsLoading, setRecordingsLoading] = useState(false)
    const [selectedRetentionDays, setSelectedRetentionDays] = useState(30)
    const [updatingRetention, setUpdatingRetention] = useState(false)
    const [activeVideoModal, setActiveVideoModal] = useState<any | null>(null)

    // Current Organization
    const currentOrg = useMemo(() => {
        return organizations.find(o => o._id === currentOrgId) || organizations[0] || null
    }, [organizations, currentOrgId])

    // =============================================================
    // API CALLS
    // =============================================================

    // Fetch Users & Roles
    const fetchUsers = async () => {
        setUsersLoading(true)
        try {
            const query = new URLSearchParams()
            if (currentOrgId) query.set('orgId', currentOrgId)
            if (userSearch) query.set('search', userSearch)
            if (roleFilter !== 'all') query.set('role', roleFilter)
            if (statusFilter !== 'all') query.set('status', statusFilter)

            const res = await fetch(`${API_BASE}/api/admin/users?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                setUsers(data.data.users || [])
                if (data.data.licenseMetrics) {
                    setLicenseMetrics(data.data.licenseMetrics)
                }
            }
        } catch (err) {
            console.error('Failed to fetch admin users:', err)
        } finally {
            setUsersLoading(false)
        }
    }

    // Fetch Audit Logs
    const fetchAuditLogs = async () => {
        setAuditLoading(true)
        try {
            const query = new URLSearchParams()
            if (auditActionFilter !== 'ALL') query.set('action', auditActionFilter)
            if (auditSearch) query.set('search', auditSearch)

            const res = await fetch(`${API_BASE}/api/admin/logs?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                setAuditLogs(data.data.logs || [])
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err)
        } finally {
            setAuditLoading(false)
        }
    }

    // Fetch Attendance Compliance
    const fetchAttendance = async () => {
        setAttendanceLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/attendance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                setAttendanceList(data.data.attendance || [])
            }
        } catch (err) {
            console.error('Failed to fetch attendance records:', err)
        } finally {
            setAttendanceLoading(false)
        }
    }

    // Fetch Recordings & Storage
    const fetchRecordings = async () => {
        setRecordingsLoading(true)
        try {
            const query = new URLSearchParams()
            if (currentOrgId) query.set('orgId', currentOrgId)

            const res = await fetch(`${API_BASE}/api/admin/recordings?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                setRecordings(data.data.recordings || [])
                if (data.data.storageMetrics) {
                    setStorageMetrics(data.data.storageMetrics)
                    setSelectedRetentionDays(data.data.storageMetrics.retentionPolicyDays || 30)
                }
            }
        } catch (err) {
            console.error('Failed to fetch admin recordings:', err)
        } finally {
            setRecordingsLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers()
        } else if (activeTab === 'audit') {
            if (auditSubTab === 'logs') fetchAuditLogs()
            else fetchAttendance()
        } else if (activeTab === 'recordings') {
            fetchRecordings()
        }
    }, [activeTab, auditSubTab, currentOrgId])

    // Trigger user search debounce / filter
    useEffect(() => {
        if (activeTab === 'users') {
            const t = setTimeout(() => fetchUsers(), 300)
            return () => clearTimeout(t)
        }
    }, [userSearch, roleFilter, statusFilter])

    // Trigger audit search
    useEffect(() => {
        if (activeTab === 'audit' && auditSubTab === 'logs') {
            const t = setTimeout(() => fetchAuditLogs(), 300)
            return () => clearTimeout(t)
        }
    }, [auditActionFilter, auditSearch])

    // =============================================================
    // USER ACTIONS
    // =============================================================

    const handleUpdateRole = async () => {
        if (!roleModalUser) return
        setUpdatingRole(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${roleModalUser.userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: selectedNewRole, orgId: currentOrgId })
            })
            const data = await res.json()
            if (data.success) {
                showToast(`Role updated to ${selectedNewRole.toUpperCase()} for ${roleModalUser.fullName}`)
                setRoleModalUser(null)
                fetchUsers()
            }
        } catch (err) {
            showToast('Failed to update user role')
        } finally {
            setUpdatingRole(false)
        }
    }

    const handleApproveUser = async (user: any) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${user.userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'active', orgId: currentOrgId })
            })
            const data = await res.json()
            if (data.success) {
                showToast(`✓ Account for ${user.fullName} approved and activated!`)
                fetchUsers()
            } else {
                showToast(data.message || 'Failed to approve user')
            }
        } catch (err) {
            showToast('Failed to approve user')
        }
    }

    const handleApproveAllPending = async () => {
        const pendingUsers = users.filter(u => u.status === 'pending')
        if (pendingUsers.length === 0) return
        try {
            for (const u of pendingUsers) {
                await fetch(`${API_BASE}/api/admin/users/${u.userId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'active', orgId: currentOrgId })
                })
            }
            showToast(`✓ All ${pendingUsers.length} pending accounts approved and activated!`)
            fetchUsers()
        } catch (err) {
            showToast('Failed to approve all users')
        }
    }

    const handleToggleStatus = async (user: any) => {
        const nextStatus = user.status === 'suspended' ? 'active' : 'suspended'
        const confirmMsg = nextStatus === 'suspended'
            ? `Are you sure you want to suspend ${user.fullName}? They will not be able to log in or join meetings.`
            : `Re-activate ${user.fullName}'s account?`

        if (!window.confirm(confirmMsg)) return

        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${user.userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus, orgId: currentOrgId })
            })
            const data = await res.json()
            if (data.success) {
                showToast(`Account status updated to ${nextStatus.toUpperCase()}`)
                fetchUsers()
            }
        } catch (err) {
            showToast('Failed to update account status')
        }
    }

    const handleResetPassword = async (user: any) => {
        if (!window.confirm(`Generate temporary password for ${user.fullName}?`)) return
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${user.userId}/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                setResetPassResult({
                    email: data.data.email,
                    pass: data.data.temporaryPassword
                })
                showToast('Temporary password generated!')
            }
        } catch (err) {
            showToast('Failed to reset password')
        }
    }

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return
        setInviting(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    fullName: inviteName.trim(),
                    role: inviteRole,
                    orgId: currentOrgId
                })
            })
            const data = await res.json()
            if (data.success) {
                showToast(`Invitation sent to ${inviteEmail}`)
                setInviteModalOpen(false)
                setInviteEmail('')
                setInviteName('')
                setInviteRole('member')
                fetchUsers()
            }
        } catch (err) {
            showToast('Failed to invite user')
        } finally {
            setInviting(false)
        }
    }

    // =============================================================
    // STORAGE & RECORDING ACTIONS
    // =============================================================

    const handleSaveRetentionPolicy = async () => {
        setUpdatingRetention(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/storage/retention`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ days: selectedRetentionDays })
            })
            const data = await res.json()
            if (data.success) {
                showToast(`Auto-retention policy set to ${selectedRetentionDays > 0 ? `${selectedRetentionDays} Days` : 'Unlimited'}`)
                fetchRecordings()
            }
        } catch (err) {
            showToast('Failed to update retention policy')
        } finally {
            setUpdatingRetention(false)
        }
    }

    const handleDeleteRecording = async (rec: any) => {
        if (!window.confirm(`Delete recording for "${rec.title}"? This cannot be undone.`)) return
        try {
            const res = await fetch(`${API_BASE}/api/admin/recordings/${rec.meetingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                showToast('Recording purged from cloud vault')
                fetchRecordings()
            }
        } catch (err) {
            showToast('Failed to delete recording')
        }
    }

    const handleExportAttendanceCsv = () => {
        if (attendanceList.length === 0) {
            showToast('No attendance records to export')
            return
        }

        const headers = ['Meeting ID', 'Topic', 'Host Name', 'Host Email', 'Date', 'Duration', 'Attendees Count']
        const rows = attendanceList.map(a => [
            `"${a.meetingId}"`,
            `"${a.title.replace(/"/g, '""')}"`,
            `"${a.hostName}"`,
            `"${a.hostEmail}"`,
            `"${new Date(a.date).toLocaleString()}"`,
            `"${a.duration}"`,
            a.totalAttendees
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `jts_attendance_audit_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('Compliance CSV exported successfully!')
    }

    function formatBytes(bytes: number) {
        if (!bytes || bytes === 0) return '0 MB'
        const mb = bytes / (1024 * 1024)
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(2)} GB`
        }
        return `${mb.toFixed(1)} MB`
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', color: '#fff', fontFamily: 'var(--font-sans)', minHeight: 0 }}>
            {/* TOAST NOTIFICATION */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                    border: '1px solid #8b5cf6',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(139, 92, 246, 0.4)',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 10,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span>✨</span>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* HEADER BANNER */}
            <div className="glass-card" style={{
                padding: '20px 24px',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.25)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
                    }}>
                        🛡️
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                                Enterprise Admin Console
                            </h2>
                            <span style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ade80',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                textTransform: 'uppercase'
                            }}>
                                Super Admin Active
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Centralized governance for {currentOrg?.name || 'Workspace'} • RBAC, security audit trail, and cloud recordings storage.
                        </p>
                    </div>
                </div>

                {/* Workspace Switcher Pill */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: '0.78rem'
                }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Tenant:</span>
                    <strong style={{ color: '#c4b5fd' }}>{currentOrg?.name || 'JTS Middle East'}</strong>
                </div>
            </div>

            {/* TOP LEVEL NAVIGATION TABS */}
            <div style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 2,
                overflowX: 'auto'
            }}>
                {[
                    { id: 'users', label: 'Users & Role Management (RBAC)', icon: '👥' },
                    { id: 'audit', label: 'Security & Audit Logs', icon: '📜' },
                    { id: 'recordings', label: 'Cloud Recordings & Storage Vault', icon: '☁️' }
                ].map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 18px',
                                borderRadius: '8px 8px 0 0',
                                fontSize: '0.82rem',
                                fontWeight: isActive ? 700 : 500,
                                background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                                color: isActive ? '#fff' : 'var(--color-text-muted)',
                                border: 'none',
                                borderBottom: isActive ? '3px solid #6366f1' : '3px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: USERS & ROLE MANAGEMENT */}
            {/* ========================================================================= */}
            {activeTab === 'users' && (
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
                                <span style={{ fontSize: '1.4rem' }}>⏳</span>
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
                                onClick={handleApproveAllPending}
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
                                ✓ Approve All Pending ({users.filter(u => u.status === 'pending').length})
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
                                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                    🔍
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
                            <span>➕</span>
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
                                                            letterSpacing: '0.04em'
                                                        }}>
                                                            {u.role === 'owner' ? '👑 Owner' : (u.role === 'admin' ? '🛡️ Admin' : '👤 Member')}
                                                        </span>
                                                    </td>

                                                    {/* Account Status Badge */}
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            color: isSuspended ? '#f87171' : (u.status === 'pending' ? '#fbbf24' : '#4ade80'),
                                                            background: isSuspended ? 'rgba(239, 68, 68, 0.15)' : (u.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)'),
                                                            padding: '2px 8px',
                                                            borderRadius: 12
                                                        }}>
                                                            <span>{isSuspended ? '🔴' : (u.status === 'pending' ? '🟡' : '🟢')}</span>
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
                                                                onClick={() => handleResetPassword(u)}
                                                                title="Generate Temporary Reset Password"
                                                                style={{
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                    borderRadius: 6,
                                                                    color: '#e2e8f0',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.72rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                🔑 Reset
                                                            </button>

                                                            {/* If Pending: Show Approve and Reject buttons */}
                                                            {u.status === 'pending' ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleApproveUser(u)}
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
                                                                        ✓ Approve
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleStatus(u)}
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
                                                                    onClick={() => handleToggleStatus(u)}
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
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: SECURITY & AUDIT LOGS (COMPLIANCE & ATTENDANCE) */}
            {/* ========================================================================= */}
            {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Sub Tab Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 6, background: 'rgba(255, 255, 255, 0.04)', padding: 4, borderRadius: 8 }}>
                            <button
                                type="button"
                                onClick={() => setAuditSubTab('logs')}
                                style={{
                                    background: auditSubTab === 'logs' ? '#6366f1' : 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                📜 Activity Audit Trail
                            </button>
                            <button
                                type="button"
                                onClick={() => setAuditSubTab('attendance')}
                                style={{
                                    background: auditSubTab === 'attendance' ? '#6366f1' : 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                👥 Meeting Attendance Records
                            </button>
                        </div>

                        {auditSubTab === 'attendance' && (
                            <button
                                type="button"
                                onClick={handleExportAttendanceCsv}
                                style={{
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#4ade80',
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span>📥</span>
                                <span>Export Compliance CSV</span>
                            </button>
                        )}
                    </div>

                    {/* SUBTAB 1: LOGS */}
                    {auditSubTab === 'logs' && (
                        <>
                            {/* Filter Bar */}
                            <div className="glass-card" style={{ padding: '10px 14px', borderRadius: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                    <input
                                        type="text"
                                        value={auditSearch}
                                        onChange={(e) => setAuditSearch(e.target.value)}
                                        placeholder="Search audit details or IP address..."
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: 6,
                                            padding: '6px 10px',
                                            fontSize: '0.78rem',
                                            color: '#fff',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <select
                                    value={auditActionFilter}
                                    onChange={(e) => setAuditActionFilter(e.target.value)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 6,
                                        padding: '6px 10px',
                                        fontSize: '0.75rem',
                                        color: '#c4b5fd',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="ALL" style={{ background: '#111827' }}>All Audit Actions</option>
                                    <option value="ROLE_CHANGE" style={{ background: '#111827' }}>Role Changes</option>
                                    <option value="STATUS_CHANGE" style={{ background: '#111827' }}>Status Changes</option>
                                    <option value="PASSWORD_RESET" style={{ background: '#111827' }}>Password Resets</option>
                                    <option value="USER_INVITE" style={{ background: '#111827' }}>User Invites</option>
                                    <option value="STORAGE_POLICY_CHANGE" style={{ background: '#111827' }}>Storage Policy</option>
                                    <option value="RECORDING_DELETE" style={{ background: '#111827' }}>Recordings Purged</option>
                                </select>
                            </div>

                            {/* Logs Table */}
                            <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Timestamp</th>
                                                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Actor / User</th>
                                                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Event Action</th>
                                                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>IP & Region</th>
                                                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Audit Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLoading ? (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                        Loading audit trail...
                                                    </td>
                                                </tr>
                                            ) : auditLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                        No audit logs recorded for this criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                auditLogs.map((log) => {
                                                    const actor = log.userId || {}
                                                    return (
                                                        <tr key={log._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                            <td style={{ padding: '10px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                                {new Date(log.createdAt).toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>
                                                                {actor.fullName || 'System Admin'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <span style={{
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 700,
                                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                                    color: '#a5b4fc',
                                                                    padding: '2px 6px',
                                                                    borderRadius: 4
                                                                }}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: '#60a5fa', fontFamily: 'monospace' }}>
                                                                {log.ipAddress || '127.0.0.1 (DXB)'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>
                                                                {log.details}
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* SUBTAB 2: ATTENDANCE RECORDS */}
                    {auditSubTab === 'attendance' && (
                        <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Meeting ID</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Conference Topic</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Host</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Date</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Duration</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Attendees</th>
                                            <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Compliance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceLoading ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                    Loading attendance records...
                                                </td>
                                            </tr>
                                        ) : attendanceList.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                    No meeting attendance records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            attendanceList.map((rec) => (
                                                <tr key={rec.meetingId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#c4b5fd' }}>
                                                        {rec.meetingId}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>
                                                        {rec.title}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#d1d5db' }}>
                                                        {rec.hostName}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                                        {new Date(rec.date).toLocaleDateString()}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#4ade80' }}>
                                                        {rec.duration}
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                                            👥 {rec.totalAttendees} participants
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                        <span style={{ color: '#4ade80', fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                                                            ✓ Verified
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: CLOUD RECORDINGS & STORAGE VAULT */}
            {/* ========================================================================= */}
            {activeTab === 'recordings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Storage Meter & Policy Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 14
                    }}>
                        {/* Storage Quota Card */}
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 14, border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase' }}>
                                    Organization Cloud Storage
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                    Healthy Quota
                                </span>
                            </div>

                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                                    {storageMetrics.usedGb} GB
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    / {storageMetrics.totalQuotaGb} GB allocated
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div style={{ height: 8, width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.max(5, storageMetrics.percentage)}%`,
                                    background: 'linear-gradient(90deg, #22c55e, #6366f1)',
                                    borderRadius: 4
                                }} />
                            </div>

                            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{storageMetrics.percentage}% capacity utilized</span>
                                <span>{storageMetrics.cloudProvider}</span>
                            </div>
                        </div>

                        {/* Retention Policy Card */}
                        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                                Auto-Retention Policy
                            </span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 12px' }}>
                                Automatically manage cloud storage lifecycle to comply with enterprise data security guidelines.
                            </p>

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                {[
                                    { days: 30, label: '30 Days' },
                                    { days: 60, label: '60 Days' },
                                    { days: 90, label: '90 Days' },
                                    { days: 0, label: 'Unlimited / Forever' }
                                ].map(option => (
                                    <button
                                        key={option.days}
                                        type="button"
                                        onClick={() => setSelectedRetentionDays(option.days)}
                                        style={{
                                            background: selectedRetentionDays === option.days ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                            border: selectedRetentionDays === option.days ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                            color: selectedRetentionDays === option.days ? '#fff' : '#d1d5db',
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveRetentionPolicy}
                                disabled={updatingRetention}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                {updatingRetention ? 'Saving...' : 'Update Policy'}
                            </button>
                        </div>
                    </div>

                    {/* Recordings Table / Vault */}
                    <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                    Organization Conference Recordings ({recordings.length})
                                </h3>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                    All recorded sessions across departments stored with encrypted DTLS-SRTP playback.
                                </p>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Session Topic</th>
                                        <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Host</th>
                                        <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Recorded Date</th>
                                        <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>Duration</th>
                                        <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>File Size</th>
                                        <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recordingsLoading ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                Loading recording assets...
                                            </td>
                                        </tr>
                                    ) : recordings.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No cloud recordings found in this workspace.
                                            </td>
                                        </tr>
                                    ) : (
                                        recordings.map((rec) => (
                                            <tr key={rec._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#f87171',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.8rem'
                                                        }}>
                                                            🎥
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#fff' }}>{rec.title}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                                                ID: {rec.meetingId}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#d1d5db' }}>
                                                    {(rec.host as any)?.fullName || 'Host'}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                                                    {new Date(rec.createdAt).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#c4b5fd' }}>
                                                    {rec.duration}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#86efac' }}>
                                                    {formatBytes(rec.sizeBytes)}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveVideoModal(rec)}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                                border: 'none',
                                                                color: '#fff',
                                                                padding: '4px 10px',
                                                                borderRadius: 6,
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            ▶ Play
                                                        </button>
                                                        <a
                                                            href={rec.recordingUrl}
                                                            download={`${rec.title}.mp4`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                color: '#e2e8f0',
                                                                padding: '4px 8px',
                                                                borderRadius: 6,
                                                                fontSize: '0.72rem',
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            ⬇ MP4
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteRecording(rec)}
                                                            title="Delete Recording Asset"
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                color: '#f87171',
                                                                padding: '4px 8px',
                                                                borderRadius: 6,
                                                                fontSize: '0.72rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODALS */}
            {/* ========================================================================= */}

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
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                                ➕ Invite Team Member
                            </h3>
                            <button
                                onClick={() => setInviteModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.1rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                        <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                            👑 Change Access Role
                        </h3>
                        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            Modify administrative permissions for <strong>{roleModalUser.fullName}</strong>.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                            {[
                                { id: 'admin', title: '🛡️ Administrator', desc: 'Can manage organization, channels, and team accounts.' },
                                { id: 'member', title: '👤 Member', desc: 'Can host conferences, create channels, and invite guests.' },
                                { id: 'guest', title: '🔗 Guest', desc: 'Limited participant access to invited rooms only.' }
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
                                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{r.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{r.desc}</div>
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
                                onClick={handleUpdateRole}
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
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔑</div>
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
                                    cursor: 'pointer'
                                }}
                            >
                                {copiedPass ? '✓ Copied to Clipboard' : '📋 Copy Password'}
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

            {/* 4. VIDEO LIGHTBOX PLAYER MODAL */}
            {activeVideoModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.88)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 780,
                        width: '100%',
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
                    }}>
                        <div style={{
                            padding: '12px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                                    {activeVideoModal.title}
                                </h4>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    Recorded on {new Date(activeVideoModal.createdAt).toLocaleDateString()} • {activeVideoModal.duration}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveVideoModal(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ background: '#000', position: 'relative' }}>
                            <video
                                src={activeVideoModal.recordingUrl}
                                controls
                                autoPlay
                                style={{ width: '100%', maxHeight: '65vh', display: 'block' }}
                            />
                        </div>

                        <div style={{
                            padding: '12px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(10, 11, 15, 0.95)'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: '#86efac' }}>
                                🔒 Enterprise 256-bit DTLS Encrypted Stream
                            </span>
                            <a
                                href={activeVideoModal.recordingUrl}
                                download={`${activeVideoModal.title}.mp4`}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: '#fff',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textDecoration: 'none'
                                }}
                            >
                                ⬇ Download Video (.mp4)
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
