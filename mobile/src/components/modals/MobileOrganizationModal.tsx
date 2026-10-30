import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE, getStoredToken } from '../../config';

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
  const resolvedToken = token || getStoredToken();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'organizations' | 'teams' | 'members' | 'settings'>('organizations');

  // Sub-views for creating/inviting (only open when user taps "+ Add" / "+ Invite")
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);

  // Form states
  const [newOrgName, setNewOrgName] = useState('');
  const [editOrgName, setEditOrgName] = useState('');

  // Intercept Android hardware back button
  useEffect(() => {
    if (!isOpen) return;
    let handle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        if (isCreatingOrg) {
          setIsCreatingOrg(false);
        } else if (isCreatingTeam) {
          setIsCreatingTeam(false);
        } else if (isInvitingMember) {
          setIsInvitingMember(false);
        } else {
          onClose();
        }
      }).then((h) => {
        handle = h;
      });
    } catch (_) {}
    return () => {
      handle?.remove();
    };
  }, [isOpen, isCreatingOrg, isCreatingTeam, isInvitingMember, onClose]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamIsPrivate, setNewTeamIsPrivate] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch user's real organizations dynamically
  const fetchOrganizations = async () => {
    if (!resolvedToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/organization/mine`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        const orgList = json.data || [];
        setOrganizations(orgList);
        if (orgList.length > 0) {
          const storedId = localStorage.getItem('jts_current_org_id');
          const matched = orgList.find((o: any) => o._id === storedId);
          setSelectedOrgId(matched ? matched._id : orgList[0]._id);
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
      setActiveTab('organizations');
      setIsCreatingOrg(false);
      setIsCreatingTeam(false);
      setIsInvitingMember(false);
      setStatusMsg('');
      fetchOrganizations();
    }
  }, [isOpen, resolvedToken]);

  // 2. Fetch teams and members for selected organization dynamically
  const fetchOrgDetails = async (orgId: string) => {
    if (!orgId || !resolvedToken) return;
    try {
      localStorage.setItem('jts_current_org_id', orgId);
    } catch (_) {}

    try {
      // Fetch teams
      const teamsRes = await fetch(`${API_BASE}/api/team/organization/${orgId}`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (teamsRes.ok) {
        const teamsJson = await teamsRes.json();
        setTeams(teamsJson.data || []);
      }

      // Fetch members
      const membersRes = await fetch(`${API_BASE}/api/organization/${orgId}/members`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (membersRes.ok) {
        const membersJson = await membersRes.json();
        setMembers(membersJson.data || []);
      }
    } catch (e) {
      console.error('[MobileOrg] Failed to fetch details:', e);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetails(selectedOrgId);
    }
  }, [selectedOrgId, resolvedToken]);

  if (!isOpen) return null;

  const currentOrg = organizations.find((o) => o._id === selectedOrgId) || organizations[0];

  // Create Organization Handler
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !resolvedToken) return;
    setIsSubmitting(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        const created = json.data;
        setNewOrgName('');
        setIsCreatingOrg(false);
        await fetchOrganizations();
        if (created?._id) {
          setSelectedOrgId(created._id);
        }
        setStatusMsg('Organization created successfully!');
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatusMsg(errJson.message || 'Failed to create organization.');
      }
    } catch (e) {
      setStatusMsg('Failed to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Team Handler
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !resolvedToken || !selectedOrgId) return;
    setIsSubmitting(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || 'Team workspace',
          isPrivate: newTeamIsPrivate,
        }),
      });
      if (res.ok) {
        setNewTeamName('');
        setNewTeamDesc('');
        setNewTeamIsPrivate(false);
        setIsCreatingTeam(false);
        await fetchOrgDetails(selectedOrgId);
        setStatusMsg('Team created successfully!');
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatusMsg(errJson.message || 'Failed to create team.');
      }
    } catch (e) {
      setStatusMsg('Failed to create team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invite Member Handler
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !resolvedToken || !selectedOrgId) return;
    setIsSubmitting(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/organization/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      if (res.ok) {
        setInviteEmail('');
        setIsInvitingMember(false);
        await fetchOrgDetails(selectedOrgId);
        setStatusMsg('Invitation sent successfully!');
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatusMsg(errJson.message || 'Failed to send invite.');
      }
    } catch (e) {
      setStatusMsg('Failed to send invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join?org=${selectedOrgId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    alert('Organization invite link copied to clipboard!');
  };

  const copyOrgId = () => {
    if (selectedOrgId && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(selectedOrgId);
      setStatusMsg('Organization ID copied to clipboard!');
      setTimeout(() => setStatusMsg(''), 2500);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrgName.trim() || !resolvedToken || !selectedOrgId) return;
    setIsSubmitting(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/organization/${selectedOrgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ name: editOrgName.trim() }),
      });
      if (res.ok) {
        setStatusMsg('Organization updated successfully!');
        await fetchOrganizations();
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatusMsg(errJson.message || 'Failed to update organization.');
      }
    } catch (_) {
      setStatusMsg('Failed to update organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) return;
    if (!resolvedToken || !selectedOrgId) return;
    try {
      const res = await fetch(`${API_BASE}/api/organization/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ organizationId: selectedOrgId, userId }),
      });
      if (res.ok) {
        setStatusMsg(`${memberName} removed from organization.`);
        fetchOrgDetails(selectedOrgId);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (_) {}
  };

  const handleUpdateMemberRole = async (targetUserId: string, newRole: string) => {
    if (!resolvedToken || !selectedOrgId) return;
    try {
      const res = await fetch(`${API_BASE}/api/organization/${selectedOrgId}/members/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setStatusMsg('Member role updated.');
        fetchOrgDetails(selectedOrgId);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (_) {}
  };

  const handleLeaveOrg = async () => {
    if (!window.confirm(`Are you sure you want to leave ${currentOrg?.name}? You will lose access to its teams and channels.`)) return;
    if (!resolvedToken || !selectedOrgId) return;
    try {
      const currentUser = JSON.parse(localStorage.getItem('jts_user') || '{}');
      const userId = currentUser._id || currentUser.id;
      const res = await fetch(`${API_BASE}/api/organization/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ organizationId: selectedOrgId, userId }),
      });
      if (res.ok) {
        setStatusMsg('Left organization successfully.');
        await fetchOrganizations();
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (_) {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* ── Mobile Page Header (Safe area top + Back button + Title + Close) ── */}
      <header
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
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              flexShrink: 0,
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
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
              Organization Hub
            </h3>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {currentOrg ? currentOrg.name : 'Workspaces & Collaboration'}
            </span>
          </div>
        </div>

        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      {/* ── Scrollable Body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#f8fafc',
        }}
      >

        {/* Status notification toast */}
        {statusMsg && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Segmented Sub-Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, gap: 4 }}>
          {[
            { id: 'organizations', label: `Orgs (${organizations.length})` },
            { id: 'teams', label: `Teams (${teams.length})` },
            { id: 'members', label: `Members (${members.length || currentOrg?.members?.length || 0})` },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsCreatingOrg(false);
                setIsCreatingTeam(false);
                setIsInvitingMember(false);
              }}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#0f172a' : '#64748b',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.70rem',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: ORGANIZATIONS LIST & CREATE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'organizations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isCreatingOrg ? (
              /* Create Organization Form */
              <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                    Create New Organization
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingOrg(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Organization Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation"
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

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setIsCreatingOrg(false)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newOrgName.trim()}
                    style={{
                      flex: 2,
                      padding: '9px 14px',
                      borderRadius: 10,
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.78rem',
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
                </div>
              </form>
            ) : (
              /* Organizations List View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Action Bar with "+ Add Organization" */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Your Workspaces ({organizations.length})
                  </span>
                  <button
                    onClick={() => setIsCreatingOrg(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 8,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    + New Org
                  </button>
                </div>

                {/* Organizations cards */}
                {loading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                    Loading organizations...
                  </div>
                ) : organizations.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      No organizations found. Tap <strong>+ New Org</strong> to create one.
                    </span>
                  </div>
                ) : (
                  organizations.map((org) => {
                    const isActive = org._id === selectedOrgId;
                    return (
                      <div
                        key={org._id}
                        onClick={() => setSelectedOrgId(org._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: isActive ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                          backgroundColor: isActive ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              backgroundColor: isActive ? '#10b981' : '#e2e8f0',
                              color: isActive ? '#ffffff' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                            }}
                          >
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                              {org.name}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                              {org.members?.length || 1} members • Plan: {org.planTier || 'Active'}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: '#059669',
                              backgroundColor: '#d1fae5',
                              padding: '3px 8px',
                              borderRadius: 6,
                              textTransform: 'uppercase',
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrgId(org._id);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.66rem',
                              fontWeight: 600,
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            Switch
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: TEAMS LIST & CREATE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'teams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isCreatingTeam ? (
              /* Create Team Form */
              <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                    Create Team in {currentOrg?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTeam(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Team Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Core Engineering"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Description / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend and backend developers"
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
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

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={newTeamIsPrivate}
                    onChange={(e) => setNewTeamIsPrivate(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#1e293b', fontWeight: 600 }}>
                    Make this team private (members only)
                  </span>
                </label>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTeam(false)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTeamName.trim()}
                    style={{
                      flex: 2,
                      padding: '9px 14px',
                      borderRadius: 10,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.78rem',
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
                    Create Team
                  </button>
                </div>
              </form>
            ) : (
              /* Teams List View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Action Bar with "+ Add Team" */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Teams in {currentOrg?.name || 'Workspace'} ({teams.length})
                  </span>
                  <button
                    onClick={() => setIsCreatingTeam(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 8,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    + Add Team
                  </button>
                </div>

                {teams.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      No teams created yet. Tap <strong>+ Add Team</strong> to create one.
                    </span>
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
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                          {t.members?.length || 1} members • {t.isPrivate ? 'Private' : 'Public'}
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
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: MEMBERS LIST & INVITE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isInvitingMember ? (
              /* Invite Member Form */
              <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                    Invite Teammate to {currentOrg?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsInvitingMember(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setIsInvitingMember(false)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !inviteEmail.trim()}
                    style={{
                      flex: 2,
                      padding: '9px 14px',
                      borderRadius: 10,
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.78rem',
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
                    Send Invitation
                  </button>
                </div>

                <button
                  type="button"
                  onClick={copyInviteLink}
                  style={{
                    alignSelf: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 4,
                  }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Workspace Share Link
                </button>
              </form>
            ) : (
              /* Members List View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Action Bar with "+ Invite Member" */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Team Members ({members.length || currentOrg?.members?.length || 0})
                  </span>
                  <button
                    onClick={() => setIsInvitingMember(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 8,
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    + Invite Member
                  </button>
                </div>

                {members.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {loading ? 'Loading members...' : 'No members found. Tap + Invite Member to invite someone.'}
                    </span>
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
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid #f1f5f9',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0f172a' }}>
                              {name}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                              {u.email || 'Verified Teammate'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: role === 'owner' || role === 'admin' ? '#7c3aed' : '#64748b',
                              backgroundColor: role === 'owner' || role === 'admin' ? '#f5f3ff' : '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: 6,
                              textTransform: 'uppercase',
                            }}
                          >
                            {role}
                          </span>

                          {role !== 'owner' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(u._id || m.userId, name)}
                              title="Remove Member"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                padding: '2px 4px',
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: SETTINGS & WORKSPACE INFO
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Edit Org Name Form */}
            <form onSubmit={handleUpdateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                Workspace Profile
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Workspace Name
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={editOrgName || currentOrg?.name || ''}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 10,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>

            {/* Workspace Metadata Details */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                  Workspace Plan
                </span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentOrg?.planTier || 'Enterprise PRO'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                  Workspace ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.70rem', color: '#0f172a', fontFamily: 'monospace' }}>
                    {selectedOrgId ? `${selectedOrgId.substring(0, 12)}...` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={copyOrgId}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 6,
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.64rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                  Total Teams
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                  {teams.length} Teams
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                  Total Members
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                  {members.length || currentOrg?.members?.length || 1} Members
                </span>
              </div>
            </div>

            {/* Quick Share Link Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                Workspace Invitation Link
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy Invite Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/join?org=${selectedOrgId}`;
                    const text = encodeURIComponent(`Join our team on JTS Meet:\n${url}`);
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#16a34a',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💬 WhatsApp Share
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 14,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626' }}>
                Danger Zone
              </span>
              <p style={{ fontSize: '0.70rem', color: '#991b1b', margin: 0, lineHeight: 1.4 }}>
                Leave this workspace if you no longer participate in its projects or meetings.
              </p>
              <button
                type="button"
                onClick={handleLeaveOrg}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  border: '1px solid #f87171',
                  color: '#dc2626',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Leave Organization
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOrganizationModal;
