import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config';

interface MobileOrganizationModalProps {
  isOpen: boolean;
  token?: string | null;
  onClose: () => void;
  onStartMeeting?: (code: string) => void;
}

export const MobileOrganizationModal: React.FC<MobileOrganizationModalProps> = ({
  isOpen,
  token,
  onClose,
  onStartMeeting,
}) => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'members' | 'create'>('overview');

  // Form states
  const [newOrgName, setNewOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteStatus, setInviteStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch user's real organizations dynamically
  const fetchOrganizations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/organization/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const orgList = json.data || [];
        setOrganizations(orgList);
        if (orgList.length > 0) {
          const currentId = localStorage.getItem('jts_current_org_id') || orgList[0]._id;
          setSelectedOrgId(currentId);
        }
      }
    } catch (err) {
      console.error('[MobileOrg] Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
      fetchOrganizations();
    }
  }, [isOpen, token]);

  // 2. Fetch teams and members for selected organization dynamically
  useEffect(() => {
    if (!selectedOrgId || !token) return;
    try {
      localStorage.setItem('jts_current_org_id', selectedOrgId);
    } catch (_) {}

    const fetchOrgDetails = async () => {
      try {
        // Fetch teams
        const teamsRes = await fetch(`${API_BASE}/api/team/organization/${selectedOrgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (teamsRes.ok) {
          const teamsJson = await teamsRes.json();
          setTeams(teamsJson.data || []);
        }

        // Fetch members
        const membersRes = await fetch(`${API_BASE}/api/organization/${selectedOrgId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (membersRes.ok) {
          const membersJson = await membersRes.json();
          setMembers(membersJson.data || []);
        }
      } catch (e) {
        console.error('[MobileOrg] Failed to fetch details:', e);
      }
    };

    fetchOrgDetails();
  }, [selectedOrgId, token]);

  if (!isOpen) return null;

  const currentOrg = organizations.find((o) => o._id === selectedOrgId) || organizations[0];

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setNewOrgName('');
        await fetchOrganizations();
        setActiveTab('overview');
      }
    } catch (e) {
      alert('Failed to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !token || !selectedOrgId) return;
    setIsSubmitting(true);
    setInviteStatus('Sending...');
    try {
      const res = await fetch(`${API_BASE}/api/organization/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      if (res.ok) {
        setInviteStatus('Invite sent!');
        setInviteEmail('');
        setTimeout(() => setInviteStatus(''), 2000);
      } else {
        setInviteStatus('Failed to send.');
      }
    } catch (e) {
      setInviteStatus('Error sending.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join?org=${selectedOrgId}`;
    navigator.clipboard?.writeText(url);
    alert('Organization invite link copied to clipboard!');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: '16px 18px 26px',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: '88vh',
          overflowY: 'auto',
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
                <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
                <line x1="10" y1="6" x2="14" y2="6" />
                <line x1="10" y1="10" x2="14" y2="10" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Organization Hub
              </h3>
              <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                {currentOrg ? currentOrg.name : 'Manage Workspaces'}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Dynamic Organization Selector (if multiple) */}
        {organizations.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', padding: 4, borderRadius: 8 }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', paddingLeft: 6 }}>Switch:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name} ({org.planTier || 'Active'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Segmented Sub-Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, gap: 4 }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'teams', label: `Teams (${teams.length})` },
            { id: 'members', label: `Members (${members.length || currentOrg?.members?.length || 0})` },
            { id: 'create', label: '+ New Org' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#0f172a' : '#64748b',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.68rem',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: Overview ── */}
        {activeTab === 'overview' && currentOrg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Org Card */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentOrg.name}
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: '#059669',
                    backgroundColor: '#d1fae5',
                    padding: '2px 8px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {currentOrg.planTier || 'Active'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
                <div style={{ textAlign: 'center', background: '#ffffff', padding: '6px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb' }}>
                    {teams.length}
                  </div>
                  <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 600 }}>Teams</div>
                </div>

                <div style={{ textAlign: 'center', background: '#ffffff', padding: '6px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>
                    {members.length || currentOrg.members?.length || 1}
                  </div>
                  <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 600 }}>Members</div>
                </div>

                <div style={{ textAlign: 'center', background: '#ffffff', padding: '6px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#7c3aed' }}>
                    24/7
                  </div>
                  <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 600 }}>Cloud Sync</div>
                </div>
              </div>
            </div>

            {/* Quick Invite Form */}
            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Quick Invite Teammate
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail.trim()}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0 12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {inviteStatus || 'Invite'}
                </button>
              </div>

              <button
                type="button"
                onClick={copyInviteLink}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Workspace Share Link
              </button>
            </form>
          </div>
        )}

        {/* ── Tab 2: Teams ── */}
        {activeTab === 'teams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {teams.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                No teams found in this organization.
              </div>
            ) : (
              teams.map((t) => (
                <div
                  key={t._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                      {t.members?.length || 1} team members • {t.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>

                  {onStartMeeting && (
                    <button
                      onClick={() => {
                        onClose();
                        onStartMeeting(`team-${t._id}`);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Call Team
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab 3: Members ── */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                {loading ? 'Loading members...' : 'No members listed.'}
              </div>
            ) : (
              members.map((m: any, idx) => {
                const u = m.userId || m;
                const name = u.fullName || u.name || 'Member';
                const role = m.role || 'Member';

                return (
                  <div
                    key={m._id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                        }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                          {name}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                          {u.email || 'Verified Member'}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.60rem',
                        fontWeight: 700,
                        color: role === 'owner' || role === 'admin' ? '#7c3aed' : '#64748b',
                        backgroundColor: role === 'owner' || role === 'admin' ? '#f5f3ff' : '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {role}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab 4: Create Organization ── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Create a new organization workspace for your company or enterprise team.
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Organization Name
              </label>
              <input
                type="text"
                placeholder="e.g. JTS Middle East Logistics"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newOrgName.trim()}
              style={{
                marginTop: 6,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Create Organization
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default MobileOrganizationModal;
