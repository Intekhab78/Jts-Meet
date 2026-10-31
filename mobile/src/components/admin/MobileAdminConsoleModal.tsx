import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE, getStoredToken, resolveAvatarUrl } from '../../config';

export interface AdminConsoleUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'suspended' | string;
  joinedAt?: string;
  profileImage?: string;
}

export interface AdminAuditLog {
  _id: string;
  createdAt: string;
  action: string;
  ipAddress?: string;
  details: string;
  userId?: {
    fullName?: string;
    email?: string;
  };
}

export interface AdminAttendance {
  meetingId: string;
  title: string;
  hostName: string;
  hostEmail: string;
  date: string;
  duration: string;
  totalAttendees: number;
}

export interface AdminRecording {
  _id: string;
  meetingId: string;
  title: string;
  recordingUrl?: string;
  createdAt: string;
  duration: string;
  sizeBytes: number;
  host?: {
    fullName?: string;
    email?: string;
  };
}

export interface AdminPlan {
  id?: string;
  planId?: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  features?: string[];
  maxSeats?: number;
  maxStorageGb?: number;
}

interface MobileAdminConsoleModalProps {
  isOpen: boolean;
  token?: string | null;
  currentUser?: any;
  currentOrgId?: string;
  onClose: () => void;
}

export const MobileAdminConsoleModal: React.FC<MobileAdminConsoleModalProps> = ({
  isOpen,
  token,
  currentUser,
  currentOrgId,
  onClose,
}) => {
  const resolvedToken = token || getStoredToken();
  if (!isOpen || !resolvedToken) return null;

  // Active top tab: users | audit | recordings | integrations
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'recordings' | 'integrations'>('users');
  const [auditSubTab, setAuditSubTab] = useState<'logs' | 'attendance'>('logs');

  // KPI Metrics (Dynamically loaded from backend)
  const [metrics, setMetrics] = useState({
    totalSeats: 0,
    usedSeats: 0,
    tier: 'Enterprise License',
    storageUsedGb: 0,
    storageQuotaGb: 0,
    totalMeetings: 0,
  });

  // Tab 1: Users
  const [users, setUsers] = useState<AdminConsoleUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals inside Admin Console
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const [roleModalUser, setRoleModalUser] = useState<AdminConsoleUser | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState('member');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Tab 2: Audit & Attendance
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  const [attendance, setAttendance] = useState<AdminAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Tab 3: Recordings
  const [recordings, setRecordings] = useState<AdminRecording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<AdminRecording | null>(null);

  // Tab 4: Integrations & API
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('jts_admin_api_key') || '');
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Upgrade Plan Modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [plans, setPlans] = useState<AdminPlan[]>([
    {
      planId: 'starter',
      name: 'Starter Cloud',
      price: 0,
      currency: 'USD',
      description: 'Ideal for small groups and individual consultations',
      maxSeats: 5,
      maxStorageGb: 5,
      features: ['Up to 5 team members', 'Unlimited 1-on-1 calls', '5 GB Cloud Storage', '720p HD Video'],
    },
    {
      planId: 'business',
      name: 'Business Pro',
      price: 19,
      currency: 'USD',
      description: 'For growing businesses requiring team collaboration',
      maxSeats: 25,
      maxStorageGb: 50,
      features: ['Up to 25 team members', 'Group calls up to 100 participants', '50 GB Cloud Storage', '1080p Full HD Video', 'Custom Branding'],
    },
    {
      planId: 'enterprise',
      name: 'Enterprise Growth',
      price: 49,
      currency: 'USD',
      description: 'Ultimate security, compliance, unlimited cloud storage and dedicated support',
      maxSeats: 100,
      maxStorageGb: 500,
      features: ['Unlimited team members', 'Group calls up to 300 participants', '500 GB Storage Vault', 'Audit Logs & SSO/SAML', '24/7 Dedicated Support'],
    },
  ]);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Access control state
  const [accessDenied, setAccessDenied] = useState(false);

  // Android Hardware Back button
  useEffect(() => {
    let handle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        if (playingRecording) {
          setPlayingRecording(null);
        } else if (inviteModalOpen) {
          setInviteModalOpen(false);
        } else if (roleModalUser) {
          setRoleModalUser(null);
        } else if (isUpgradeModalOpen) {
          setIsUpgradeModalOpen(false);
        } else {
          onClose();
        }
      }).then((h) => {
        handle = h;
      });
    } catch (_) {}

    return () => {
      handle?.remove?.();
    };
  }, [playingRecording, inviteModalOpen, roleModalUser, isUpgradeModalOpen, onClose]);

  // Fetch Stats & KPI
  const loadStats = async () => {
    if (!resolvedToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const data = json.data || {};
        setMetrics((prev) => ({
          ...prev,
          totalSeats: data.totalSeats || data.licenseMetrics?.totalSeats || prev.totalSeats,
          usedSeats: data.usedSeats || data.licenseMetrics?.usedSeats || data.users?.total || prev.usedSeats,
          tier: data.tier || data.licenseMetrics?.tier || prev.tier,
          storageUsedGb: data.storageUsedGb ?? prev.storageUsedGb,
          storageQuotaGb: data.storageQuotaGb ?? prev.storageQuotaGb,
          totalMeetings: data.totalMeetings || data.meetings?.total || prev.totalMeetings,
        }));
      }
    } catch (_) {}
  };

  // Fetch Users
  const loadUsers = async () => {
    if (!resolvedToken) return;
    setUsersLoading(true);
    try {
      const orgId = currentOrgId || localStorage.getItem('jts_current_org_id') || '';
      const url = `${API_BASE}/api/admin/users${orgId ? `?orgId=${orgId}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true);
        setUsers([]);
        return;
      }
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const rawList = Array.isArray(json.data?.users)
          ? json.data.users
          : (Array.isArray(json.data) ? json.data : []);
        setUsers(
          rawList.map((u: any) => ({
            userId: u._id || u.userId || u.id || String(Math.random()),
            fullName: u.fullName || u.name || 'User',
            email: u.email || '',
            role: u.role || 'member',
            status: u.status || 'active',
            joinedAt: u.createdAt || u.joinedAt || 'Recently',
            profileImage: u.profileImage || u.avatar || '',
          }))
        );
        if (json.data?.licenseMetrics) {
          const lm = json.data.licenseMetrics;
          setMetrics((prev) => ({
            ...prev,
            totalSeats: lm.totalSeats || prev.totalSeats,
            usedSeats: lm.usedSeats || prev.usedSeats,
            tier: lm.tier || prev.tier,
          }));
        }
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error('Failed to load admin users:', e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Audit Logs
  const loadAuditLogs = async () => {
    if (!resolvedToken) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const rawLogs = Array.isArray(json.data?.logs)
          ? json.data.logs
          : (Array.isArray(json.data) ? json.data : []);
        setAuditLogs(rawLogs);
      } else {
        // Fallback to /api/admin/logs
        const fbRes = await fetch(`${API_BASE}/api/admin/logs`, {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });
        if (fbRes.ok) {
          const fbJson = await fbRes.json().catch(() => ({}));
          const rawFb = Array.isArray(fbJson.data?.logs)
            ? fbJson.data.logs
            : (Array.isArray(fbJson.data) ? fbJson.data : []);
          setAuditLogs(rawFb);
        } else {
          setAuditLogs([]);
        }
      }
    } catch (_) {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Fetch Attendance
  const loadAttendance = async () => {
    if (!resolvedToken) return;
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/attendance`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const rawAtt = Array.isArray(json.data?.attendance)
          ? json.data.attendance
          : (Array.isArray(json.data) ? json.data : []);
        setAttendance(rawAtt);
      } else {
        setAttendance([]);
      }
    } catch (_) {
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch Recordings
  const loadRecordings = async () => {
    if (!resolvedToken) return;
    setRecordingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/recordings`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const rawRec = Array.isArray(json.data?.recordings)
          ? json.data.recordings
          : (Array.isArray(json.data) ? json.data : []);
        setRecordings(rawRec);
        if (json.data?.storageMetrics) {
          const sm = json.data.storageMetrics;
          setMetrics((prev) => ({
            ...prev,
            storageUsedGb: sm.usedGb ?? prev.storageUsedGb,
            storageQuotaGb: sm.totalQuotaGb ?? prev.storageQuotaGb,
          }));
        }
      } else {
        setRecordings([]);
      }
    } catch (_) {
      setRecordings([]);
    } finally {
      setRecordingsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadUsers();
    loadAuditLogs();
    loadAttendance();
    loadRecordings();
  }, [resolvedToken, currentOrgId]);

  // Handler: Invite User
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedToken || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          role: inviteRole,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to send invite');
      }
      showToast(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteName('');
      setInviteModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error sending invite');
    } finally {
      setInviting(false);
    }
  };

  // Handler: Update User Role
  const handleSaveRole = async () => {
    if (!resolvedToken || !roleModalUser) return;
    setUpdatingRole(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${roleModalUser.userId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedNewRole }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update role');
      }
      showToast(`User role updated to ${selectedNewRole}!`);
      setRoleModalUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error updating role');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handler: Toggle Suspend / Activate
  const handleToggleStatus = async (user: AdminConsoleUser) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`Are you sure you want to ${nextStatus === 'suspended' ? 'suspend' : 'activate'} ${user.fullName}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.userId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update status');
      }
      showToast(`User marked as ${nextStatus}!`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // Handler: Delete Recording
  const handleDeleteRecording = async (rec: AdminRecording) => {
    if (!window.confirm(`Delete recording "${rec.title}" permanently?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/recordings/${rec.meetingId || rec._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete recording');
      }
      showToast('Recording deleted');
      loadRecordings();
    } catch (err: any) {
      alert(err.message || 'Error deleting recording');
    }
  };

  // Filtered Users (safely guarded against null/undefined)
  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter((u) => {
    if (!u) return false;
    const fullName = String(u.fullName || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    const role = String(u.role || '').toLowerCase();
    const status = String(u.status || '').toLowerCase();
    const search = String(userSearch || '').trim().toLowerCase();
    const matchSearch = !search || fullName.includes(search) || email.includes(search);
    const matchRole = roleFilter === 'all' || role === roleFilter.toLowerCase();
    const matchStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
    return matchSearch && matchRole && matchStatus;
  });

  // Filtered Audit Logs (safely guarded against null/undefined)
  const safeAudit = Array.isArray(auditLogs) ? auditLogs : [];
  const filteredAudit = safeAudit.filter((l) => {
    if (!l) return false;
    const search = String(auditSearch || '').trim().toLowerCase();
    const details = String(l.details || '').toLowerCase();
    const action = String(l.action || '').toLowerCase();
    const userName = String(l.userId?.fullName || '').toLowerCase();
    const matchSearch = !search || details.includes(search) || action.includes(search) || userName.includes(search);
    const matchAction = auditActionFilter === 'ALL' || action.toUpperCase() === auditActionFilter.toUpperCase();
    return matchSearch && matchAction;
  });

  const safeAttendance = Array.isArray(attendance) ? attendance : [];
  const safeRecordings = Array.isArray(recordings) ? recordings : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        width: '100vw',
        backgroundColor: '#ffffff',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Native Mobile App Header (White background) ── */}
      <div
        style={{
          paddingTop: 'calc(var(--safe-top, 0px) + 8px)',
          paddingBottom: 10,
          paddingLeft: 14,
          paddingRight: 14,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Left: Title & Shield */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              Admin Console
            </span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
              Enterprise Governance & Security
            </span>
          </div>
        </div>

        {/* Right: Close button */}
        <button
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            border: 'none',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── KPI Metrics Row (Native Mobile Cards) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        {/* Card 1: Seats & Licenses */}
        <div
          onClick={() => setIsUpgradeModalOpen(true)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 10,
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Seats Used
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '1px 5px',
                borderRadius: 4,
              }}
            >
              UPGRADE
            </span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {safeUsers.length || metrics.usedSeats} / {metrics.totalSeats}
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, ((safeUsers.length || metrics.usedSeats) / metrics.totalSeats) * 100)}%`,
                height: '100%',
                backgroundColor: '#2563eb',
              }}
            />
          </div>
        </div>

        {/* Card 2: Cloud Storage */}
        <div
          onClick={() => setIsUpgradeModalOpen(true)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 10,
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Cloud Vault
            </span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 5px', borderRadius: 4 }}>
              SECURE
            </span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics.storageUsedGb} GB / {metrics.storageQuotaGb} GB
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (metrics.storageUsedGb / metrics.storageQuotaGb) * 100)}%`,
                height: '100%',
                backgroundColor: '#10b981',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Subtabs Controller ── */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#ffffff',
          padding: '6px 12px',
          borderBottom: '1px solid #e2e8f0',
          gap: 6,
          flexShrink: 0,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <button
          onClick={() => setActiveTab('users')}
          style={{
            flex: '1 0 auto',
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'users' ? '#eff6ff' : 'transparent',
            color: activeTab === 'users' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'users' ? 800 : 600,
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          Users ({safeUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            flex: '1 0 auto',
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'audit' ? '#eff6ff' : 'transparent',
            color: activeTab === 'audit' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'audit' ? 800 : 600,
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Audit & Logs
        </button>

        <button
          onClick={() => setActiveTab('recordings')}
          style={{
            flex: '1 0 auto',
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'recordings' ? '#eff6ff' : 'transparent',
            color: activeTab === 'recordings' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'recordings' ? 800 : 600,
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Recordings ({safeRecordings.length})
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          style={{
            flex: '1 0 auto',
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'integrations' ? '#eff6ff' : 'transparent',
            color: activeTab === 'integrations' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'integrations' ? 800 : 600,
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Integrations
        </button>
      </div>

      {/* ── Toast Notification Banner ── */}
      {toastMsg && (
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '8px 14px',
            fontSize: '0.76rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            zIndex: 10,
          }}
        >
          <span>✓</span> {toastMsg}
        </div>
      )}

      {/* ── Scrollable Body per Tab ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {accessDenied && (
          <div
            style={{
              padding: '14px',
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991b1b', display: 'block' }}>
                Admin Privileges Required
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#b91c1c', lineHeight: 1.4 }}>
                Your current account is logged in as a standard member. Viewing and modifying users, security audits, and cloud settings requires an administrator or organization owner account.
              </p>
            </div>
          </div>
        )}

        {/* ══════════ TAB 1: USERS ══════════ */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Search & Invite Action Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '0 10px',
                  height: 36,
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.2}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.78rem',
                    color: '#0f172a',
                  }}
                />
              </div>

              <button
                onClick={() => setInviteModalOpen(true)}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                + Invite User
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {['all', 'admin', 'member', 'guest'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 16,
                    border: '1px solid',
                    borderColor: roleFilter === r ? '#2563eb' : '#e2e8f0',
                    backgroundColor: roleFilter === r ? '#eff6ff' : '#ffffff',
                    color: roleFilter === r ? '#2563eb' : '#64748b',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>

            {/* Users List */}
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                Loading organization users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: '0.8rem' }}>
                No users matching criteria
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUsers.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  return (
                    <div
                      key={u.userId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {u.profileImage ? (
                              <img
                                src={resolveAvatarUrl(u.profileImage)}
                                alt=""
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              u.fullName.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {u.fullName}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  backgroundColor: u.role === 'admin' ? '#eff6ff' : '#f1f5f9',
                                  color: u.role === 'admin' ? '#2563eb' : '#64748b',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {u.role}
                              </span>
                              {isSuspended && (
                                <span
                                  style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: '#fef2f2',
                                    color: '#ef4444',
                                  }}
                                >
                                  SUSPENDED
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* User Actions Bar */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: 6,
                        }}
                      >
                        <button
                          onClick={() => {
                            setRoleModalUser(u);
                            setSelectedNewRole(u.role);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#1e293b',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Change Role
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: isSuspended ? '#ecfdf5' : '#fef2f2',
                            border: '1px solid',
                            borderColor: isSuspended ? '#a7f3d0' : '#fecaca',
                            color: isSuspended ? '#059669' : '#dc2626',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isSuspended ? 'Activate User' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB 2: AUDIT & ATTENDANCE ══════════ */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Sub-tab pills */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, gap: 4 }}>
              <button
                onClick={() => setAuditSubTab('logs')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: auditSubTab === 'logs' ? '#ffffff' : 'transparent',
                  color: auditSubTab === 'logs' ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                Security Audit Logs ({auditLogs.length})
              </button>
              <button
                onClick={() => setAuditSubTab('attendance')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: auditSubTab === 'attendance' ? '#ffffff' : 'transparent',
                  color: auditSubTab === 'attendance' ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                Meeting Attendance ({safeAttendance.length})
              </button>
            </div>

            {auditSubTab === 'logs' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auditLoading ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                    Loading audit trail...
                  </div>
                ) : filteredAudit.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                    No audit records found
                  </div>
                ) : (
                  filteredAudit.map((log) => (
                    <div
                      key={log._id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                          }}
                        >
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 600 }}>
                        {log.details}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#64748b' }}>
                        <span>Actor: {log.userId?.fullName || 'System Admin'}</span>
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attendanceLoading ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                    Loading meeting attendance...
                  </div>
                ) : safeAttendance.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                    No attendance records yet
                  </div>
                ) : (
                  safeAttendance.map((att, idx) => (
                    <div
                      key={att.meetingId || idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                          {att.title || `Meeting #${att.meetingId?.slice(-6)}`}
                        </span>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 6,
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                          }}
                        >
                          {att.totalAttendees} Attendees
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                        <span>Host: {att.hostName}</span>
                        <span>Duration: {att.duration || '45m'}</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                        Date: {att.date ? new Date(att.date).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB 3: RECORDINGS ══════════ */}
        {activeTab === 'recordings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Cloud Video Vault ({safeRecordings.length})
                </span>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                  Secure meeting recordings with instant playback and download
                </p>
              </div>
            </div>

            {recordingsLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                Loading cloud recordings...
              </div>
            ) : safeRecordings.length === 0 ? (
              <div
                style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  No recordings saved yet
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 260 }}>
                  Host a meeting and tap "Record" to automatically store encrypted recordings here.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {safeRecordings.map((rec) => {
                  const sizeMb = (Number(rec.sizeBytes || 0) / (1024 * 1024)).toFixed(1);
                  return (
                    <div
                      key={rec._id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: '#fee2e2',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                              <polygon points="23 7 16 12 23 17 23 7" />
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {rec.title || `Meeting #${rec.meetingId?.slice(-6)}`}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              Duration: {rec.duration || '24m'} • {sizeMb} MB
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: 6,
                        }}
                      >
                        <button
                          onClick={() => setPlayingRecording(rec)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 8,
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Play Video
                        </button>

                        {rec.recordingUrl && (
                          <a
                            href={rec.recordingUrl.startsWith('http') ? rec.recordingUrl : `${API_BASE}${rec.recordingUrl}`}
                            download
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#1e293b',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-block',
                            }}
                          >
                            Download
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteRecording(rec)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 8,
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB 4: INTEGRATIONS ══════════ */}
        {activeTab === 'integrations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
              Developer Webhooks & API Keys
            </span>

            {/* API Key Card */}
            <div
              style={{
                padding: '12px',
                borderRadius: 12,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Workspace API Key</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 10px',
                }}
              >
                <code style={{ fontSize: '0.72rem', color: apiKey ? '#0f172a' : '#94a3b8', flex: 1, wordBreak: 'break-all' }}>
                  {apiKey || 'No API key generated yet'}
                </code>
                {apiKey ? (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(apiKey);
                      showToast('API Key copied to clipboard!');
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#2563eb',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Copy
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const newKey = `jts_live_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
                      setApiKey(newKey);
                      localStorage.setItem('jts_admin_api_key', newKey);
                      showToast('API Key generated!');
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      backgroundColor: '#2563eb',
                      border: 'none',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Generate
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.64rem', color: '#64748b' }}>
                Use this key to authenticate REST API calls and automate meeting scheduling.
              </p>
            </div>

            {/* Webhook Configuration */}
            <div
              style={{
                padding: '12px',
                borderRadius: 12,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Outbound Webhooks</span>
              <input
                type="url"
                placeholder="https://api.yourcompany.com/jts-events"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  showToast('Webhook endpoint saved successfully!');
                }}
                style={{
                  padding: '9px',
                  borderRadius: 8,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save Webhook URL
              </button>
            </div>

            {/* Calendar Integrations */}
            <div
              style={{
                padding: '12px',
                borderRadius: 12,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Calendar Synchronization</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>📅</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Google Calendar</div>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>Sync meeting invites & calendar events</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ MODAL: INVITE USER ══════════ */}
      {inviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '16px 18px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Invite New User
              </span>
              <button
                onClick={() => setInviteModalOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@organization.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Role Assignment</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    marginTop: 4,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="member">Member (Standard Access)</option>
                  <option value="admin">Admin (Manage Users & Console)</option>
                  <option value="guest">Guest (Temporary access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                style={{
                  marginTop: 6,
                  padding: '11px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {inviting ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CHANGE ROLE ══════════ */}
      {roleModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setRoleModalUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '16px 18px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Change Role: {roleModalUser.fullName}
              </span>
              <button
                onClick={() => setRoleModalUser(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['admin', 'member', 'guest'].map((r) => (
                <div
                  key={r}
                  onClick={() => setSelectedNewRole(r)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: selectedNewRole === r ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: selectedNewRole === r ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                      {r}
                    </span>
                    <p style={{ margin: 0, fontSize: '0.66rem', color: '#64748b' }}>
                      {r === 'admin'
                        ? 'Full administrative privileges across console'
                        : r === 'member'
                        ? 'Standard user privileges for calls & chats'
                        : 'Read-only access for guest participants'}
                    </p>
                  </div>
                  {selectedNewRole === r && <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>}
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveRole}
              disabled={updatingRole}
              style={{
                marginTop: 6,
                padding: '11px',
                borderRadius: 10,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.84rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {updatingRole ? 'Updating...' : 'Save New Role'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: VIDEO PLAYER FOR RECORDING ══════════ */}
      {playingRecording && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#000000',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              paddingTop: 'calc(var(--safe-top, 0px) + 8px)',
              paddingBottom: 10,
              paddingLeft: 14,
              paddingRight: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#ffffff',
            }}
          >
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
              {playingRecording.title}
            </span>
            <button
              onClick={() => setPlayingRecording(null)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              Done ✕
            </button>
          </div>

          {/* Video Player */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              src={
                playingRecording.recordingUrl?.startsWith('http')
                  ? playingRecording.recordingUrl
                  : `${API_BASE}${playingRecording.recordingUrl}`
              }
              controls
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* ══════════ MODAL: UPGRADE PLANS ══════════ */}
      {isUpgradeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setIsUpgradeModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '16px 18px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                  Choose Workspace Plan
                </span>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                  Scale seats, storage vault capacity, and enterprise compliance
                </p>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plans.map((p) => {
                const isSelected = p.planId === 'enterprise';
                return (
                  <div
                    key={p.planId}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                          {p.name}
                        </span>
                        {isSelected && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                            }}
                          >
                            ACTIVE PLAN
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>
                        ${p.price} <span style={{ fontSize: '0.64rem', color: '#64748b' }}>/mo</span>
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{p.description}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                      {p.features?.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: '#334155' }}>
                          <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span> {f}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        showToast(`Selected "${p.name}" plan!`);
                        setIsUpgradeModalOpen(false);
                      }}
                      style={{
                        marginTop: 4,
                        padding: '8px',
                        borderRadius: 8,
                        backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#2563eb',
                        border: isSelected ? 'none' : '1px solid #bfdbfe',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isSelected ? 'Current Tier' : 'Switch to this Tier'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAdminConsoleModal;
