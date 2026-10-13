import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../../config'
import type {
    AdminConsoleHubProps,
    LicenseMetrics,
    StorageMetrics,
    AdminUser,
    AuditLog,
    AttendanceRecord,
    RecordingItem,
    PlanItem
} from './adminConsole.types'
import { IntegrationsTab } from './components/IntegrationsTab'
import { AdminUsersTab } from './components/console/AdminUsersTab'
import { AdminAuditTab } from './components/console/AdminAuditTab'
import { AdminRecordingsTab } from './components/console/AdminRecordingsTab'
import { AdminUpgradePlanModal } from './components/console/AdminUpgradePlanModal'
import { AdminVideoPlayerModal } from './components/console/AdminVideoPlayerModal'
import {
    IconShield,
    IconUsers,
    IconFileText,
    IconVideo,
    IconZap,
    IconSparkles
} from '../../components/common/Icons'

export function AdminConsoleHub({
    token,
    currentUserId,
    currentOrgId,
    organizations
}: AdminConsoleHubProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'recordings' | 'integrations'>(() => {
        try {
            const saved = localStorage.getItem('jts_admin_tab')
            if (saved && ['users', 'audit', 'recordings', 'integrations'].includes(saved)) {
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
    const [users, setUsers] = useState<AdminUser[]>([])
    const [licenseMetrics, setLicenseMetrics] = useState<LicenseMetrics>({
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

    // Notification toast
    const [toastMessage, setToastMessage] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3500)
    }

    // Dynamic Plan Upgrade Modal State
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    const [availablePlans, setAvailablePlans] = useState<PlanItem[]>([])
    const [upgradingPlan, setUpgradingPlan] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(false)

    // -------------------------------------------------------------
    // TAB 2: AUDIT & ATTENDANCE STATE
    // -------------------------------------------------------------
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditActionFilter, setAuditActionFilter] = useState('ALL')
    const [auditSearch, setAuditSearch] = useState('')

    const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([])
    const [attendanceLoading, setAttendanceLoading] = useState(false)

    // -------------------------------------------------------------
    // TAB 3: CLOUD RECORDINGS STATE
    // -------------------------------------------------------------
    const [recordings, setRecordings] = useState<RecordingItem[]>([])
    const [storageMetrics, setStorageMetrics] = useState<StorageMetrics>({
        totalQuotaGb: 50,
        usedGb: 0,
        percentage: 0,
        retentionPolicyDays: 30,
        cloudProvider: 'Amazon Web Services (AWS S3 Middle East DXB-1)'
    })
    const [recordingsLoading, setRecordingsLoading] = useState(false)
    const [selectedRetentionDays, setSelectedRetentionDays] = useState(30)
    const [updatingRetention, setUpdatingRetention] = useState(false)
    const [activeVideoModal, setActiveVideoModal] = useState<RecordingItem | null>(null)

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

    const handleOpenUpgrade = async () => {
        setUpgradeModalOpen(true)
        setLoadingPlans(true)
        try {
            const res = await fetch(`${API_BASE}/api/plans`)
            if (res.ok) {
                const json = await res.json()
                setAvailablePlans(json.data || [])
            }
        } catch (e) {
            console.error('Failed to load plans', e)
        } finally {
            setLoadingPlans(false)
        }
    }

    const handleExecuteUpgrade = async (planId: string) => {
        const orgId = currentOrg?._id || currentOrgId
        if (!orgId) return
        setUpgradingPlan(true)
        try {
            const res = await fetch(`${API_BASE}/api/organization/${orgId}/plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ planId, paymentToken: 'admin_console_override' })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                showToast(`🎉 Workspace subscription updated to ${planId.toUpperCase()}!`)
                setUpgradeModalOpen(false)
                fetchUsers()
                if (currentOrg) {
                    currentOrg.planTier = planId
                }
            } else {
                showToast(data.message || 'Failed to update plan')
            }
        } catch (err: any) {
            showToast(err?.message || 'Network error updating plan')
        } finally {
            setUpgradingPlan(false)
        }
    }

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
                    <IconSparkles size={16} color="#c084fc" />
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
                        boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
                    }}>
                        <IconShield size={22} color="#fff" />
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
                    { id: 'users', label: 'Users & Role Management (RBAC)', icon: <IconUsers size={15} /> },
                    { id: 'audit', label: 'Security & Audit Logs', icon: <IconFileText size={15} /> },
                    { id: 'recordings', label: 'Cloud Recordings & Storage Vault', icon: <IconVideo size={15} /> },
                    { id: 'integrations', label: 'Integrations & Webhooks', icon: <IconZap size={15} /> }
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
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* TAB 1: USERS & ROLE MANAGEMENT */}
            {activeTab === 'users' && (
                <AdminUsersTab
                    users={users}
                    licenseMetrics={licenseMetrics}
                    currentOrg={currentOrg}
                    usersLoading={usersLoading}
                    userSearch={userSearch}
                    setUserSearch={setUserSearch}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    onOpenUpgrade={handleOpenUpgrade}
                    onApproveUser={handleApproveUser}
                    onApproveAllPending={handleApproveAllPending}
                    onToggleStatus={handleToggleStatus}
                    onResetPassword={handleResetPassword}
                    onUpdateRole={handleUpdateRole}
                    onInviteUser={handleInviteUser}
                    inviteModalOpen={inviteModalOpen}
                    setInviteModalOpen={setInviteModalOpen}
                    inviteEmail={inviteEmail}
                    setInviteEmail={setInviteEmail}
                    inviteName={inviteName}
                    setInviteName={setInviteName}
                    inviteRole={inviteRole}
                    setInviteRole={setInviteRole}
                    inviting={inviting}
                    roleModalUser={roleModalUser}
                    setRoleModalUser={setRoleModalUser}
                    selectedNewRole={selectedNewRole}
                    setSelectedNewRole={setSelectedNewRole}
                    updatingRole={updatingRole}
                    resetPassResult={resetPassResult}
                    setResetPassResult={setResetPassResult}
                />
            )}

            {/* TAB 2: SECURITY & AUDIT LOGS */}
            {activeTab === 'audit' && (
                <AdminAuditTab
                    auditSubTab={auditSubTab}
                    setAuditSubTab={setAuditSubTab}
                    auditSearch={auditSearch}
                    setAuditSearch={setAuditSearch}
                    auditActionFilter={auditActionFilter}
                    setAuditActionFilter={setAuditActionFilter}
                    auditLoading={auditLoading}
                    auditLogs={auditLogs}
                    attendanceLoading={attendanceLoading}
                    attendanceList={attendanceList}
                    onExportAttendanceCsv={handleExportAttendanceCsv}
                />
            )}

            {/* TAB 3: CLOUD RECORDINGS & STORAGE VAULT */}
            {activeTab === 'recordings' && (
                <AdminRecordingsTab
                    storageMetrics={storageMetrics}
                    selectedRetentionDays={selectedRetentionDays}
                    setSelectedRetentionDays={setSelectedRetentionDays}
                    updatingRetention={updatingRetention}
                    onSaveRetentionPolicy={handleSaveRetentionPolicy}
                    recordings={recordings}
                    recordingsLoading={recordingsLoading}
                    onPlayVideo={(rec) => setActiveVideoModal(rec)}
                    onDeleteRecording={handleDeleteRecording}
                />
            )}

            {/* TAB 4: ENTERPRISE INTEGRATIONS & WEBHOOKS HUB */}
            {activeTab === 'integrations' && (
                <IntegrationsTab 
                    token={token} 
                    currentOrgId={currentOrgId}
                    planTier={organizations.find(o => (o._id || o.id) === currentOrgId)?.planTier || 'enterprise'}
                />
            )}

            {/* MODAL: Plan Upgrade */}
            <AdminUpgradePlanModal
                isOpen={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
                currentOrg={currentOrg}
                availablePlans={availablePlans}
                loadingPlans={loadingPlans}
                upgradingPlan={upgradingPlan}
                onExecuteUpgrade={handleExecuteUpgrade}
            />

            {/* MODAL: Active Video Lightbox Player */}
            <AdminVideoPlayerModal
                video={activeVideoModal}
                onClose={() => setActiveVideoModal(null)}
            />
        </div>
    )
}
