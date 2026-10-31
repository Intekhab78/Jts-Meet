import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE, getStoredToken, resolveAvatarUrl } from '../../config';

export interface MobileTeamMember {
  userId: any;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt?: string;
}

export interface MobileTeam {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility: 'public' | 'private';
  ownerId?: string;
  createdBy?: string;
  members: MobileTeamMember[];
  createdAt?: string;
}

export interface MobileTeamChannel {
  id: string;
  name: string;
  topic?: string;
  memberCount?: number;
  unreadCount?: number;
}

interface MobileTeamHubModalProps {
  isOpen: boolean;
  token?: string | null;
  currentUser?: any;
  currentOrgId?: string;
  onClose: () => void;
  onSelectChannel?: (channel: { id: string; name: string }) => void;
  onStartTeamCall?: (team: MobileTeam) => void;
  onStartChannelCall?: (channel: MobileTeamChannel) => void;
}

export const MobileTeamHubModal: React.FC<MobileTeamHubModalProps> = ({
  isOpen,
  token,
  currentUser,
  currentOrgId,
  onClose,
  onSelectChannel,
  onStartTeamCall,
  onStartChannelCall,
}) => {
  const resolvedToken = token || getStoredToken();
  if (!isOpen || !resolvedToken) return null;

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<'channels' | 'members' | 'settings' | 'allTeams'>('channels');

  // Teams & Active Team state
  const [teams, setTeams] = useState<MobileTeam[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Channels state for the active team
  const [channels, setChannels] = useState<MobileTeamChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Create Channel in team modal state
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isChannelPrivate, setIsChannelPrivate] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Create Team modal state
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamVisibility, setNewTeamVisibility] = useState<'public' | 'private'>('public');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite Team Member modal state
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteUserEmail, setInviteUserEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [invitingMember, setInvitingMember] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  // Team settings state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public');
  const [savingSettings, setSavingSettings] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Android Hardware Back Button handling
  useEffect(() => {
    let backListener: any;
    try {
      backListener = CapacitorApp.addListener('backButton', () => {
        if (isCreateChannelOpen) {
          setIsCreateChannelOpen(false);
        } else if (isCreateTeamOpen) {
          setIsCreateTeamOpen(false);
        } else if (isInviteMemberOpen) {
          setIsInviteMemberOpen(false);
        } else {
          onClose();
        }
      });
    } catch (_) {}

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [isCreateChannelOpen, isCreateTeamOpen, isInviteMemberOpen, onClose]);

  // Load Organization & Teams
  const loadTeams = async () => {
    if (!resolvedToken) {
      setTeams([]);
      setChannels([]);
      setActiveTeamId('');
      setLoadingTeams(false);
      return;
    }
    setLoadingTeams(true);
    try {
      let orgId = currentOrgId || localStorage.getItem('jts_current_org_id');
      if (!orgId) {
        // Fetch user organizations
        const orgRes = await fetch(`${API_BASE}/api/organization/mine`, {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          const list = orgData.data || [];
          if (list.length > 0) {
            orgId = list[0]._id;
            localStorage.setItem('jts_current_org_id', orgId as string);
          }
        }
      }

      if (!orgId) {
        setTeams([]);
        setLoadingTeams(false);
        return;
      }

      // Fetch teams for this org
      const res = await fetch(`${API_BASE}/api/team/organization/${orgId}`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        const teamList: MobileTeam[] = json.data || [];
        setTeams(teamList);
        if (teamList.length > 0) {
          const stored = localStorage.getItem('jts_active_team_id');
          const matched = teamList.find((t) => t._id === stored);
          const selected = matched ? matched._id : teamList[0]._id;
          setActiveTeamId(selected);
          localStorage.setItem('jts_active_team_id', selected);
        }
      }
    } catch (e) {
      console.error('Failed to load teams:', e);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Load Org Members for invitations
  const loadOrgMembers = async () => {
    if (!resolvedToken) return;
    const orgId = currentOrgId || localStorage.getItem('jts_current_org_id');
    if (!orgId) return;
    try {
      const res = await fetch(`${API_BASE}/api/organization/${orgId}/members`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setOrgMembers(json.data || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadTeams();
    loadOrgMembers();
  }, [resolvedToken, currentOrgId]);

  const activeTeam = teams.find((t) => t._id === activeTeamId) || teams[0];

  // Sync settings when active team changes
  useEffect(() => {
    if (activeTeam) {
      setEditName(activeTeam.name);
      setEditDesc(activeTeam.description || '');
      setEditVisibility(activeTeam.visibility || 'public');
    }
  }, [activeTeam]);

  // Load Channels for active team
  const loadTeamChannels = async () => {
    if (!resolvedToken || !activeTeam?._id) return;
    setLoadingChannels(true);
    try {
      const res = await fetch(`${API_BASE}/api/channel/team/${activeTeam._id}`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        const chanList = (json.data || []).map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          topic: c.description || c.topic || 'Team channel',
          memberCount: c.members?.length || 1,
          unreadCount: 0,
        }));
        setChannels(chanList);
      }
    } catch (e) {
      console.error('Failed to load team channels:', e);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    if (activeTeam?._id) {
      loadTeamChannels();
    }
  }, [activeTeam?._id, resolvedToken]);

  // Determine permissions
  const myUserId = currentUser?._id || currentUser?.id;
  const isTeamOwner = activeTeam?.ownerId === myUserId || activeTeam?.createdBy === myUserId;
  const myRole = activeTeam?.members?.find((m) => {
    const uid = typeof m.userId === 'object' ? m.userId?._id : m.userId;
    return uid === myUserId;
  })?.role || (isTeamOwner ? 'owner' : 'member');
  const canManageTeam = isTeamOwner || myRole === 'owner' || myRole === 'admin';

  // Handler: Create Channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedToken || !activeTeam?._id || !newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const cleanName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
      const res = await fetch(`${API_BASE}/api/channel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: activeTeam._id,
          name: cleanName,
          description: newChannelDesc.trim() || undefined,
          isPrivate: isChannelPrivate,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create channel');
      }

      showToast(`Channel #${cleanName} created!`);
      setNewChannelName('');
      setNewChannelDesc('');
      setIsChannelPrivate(false);
      setIsCreateChannelOpen(false);
      loadTeamChannels();
    } catch (err: any) {
      alert(err.message || 'Error creating channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  // Handler: Create New Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedToken || !newTeamName.trim()) return;
    const orgId = currentOrgId || localStorage.getItem('jts_current_org_id');
    if (!orgId) {
      alert('Organization ID is missing. Please select or join an organization first.');
      return;
    }
    setCreatingTeam(true);
    try {
      const res = await fetch(`${API_BASE}/api/team`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: orgId,
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || undefined,
          visibility: newTeamVisibility,
          starterChannels: ['general', 'announcements', 'random'],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create team');
      }

      const json = await res.json();
      const created: MobileTeam = json.data;
      showToast(`Team "${created.name}" created!`);
      setNewTeamName('');
      setNewTeamDesc('');
      setIsCreateTeamOpen(false);
      await loadTeams();
      if (created?._id) {
        setActiveTeamId(created._id);
        setActiveTab('channels');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating team');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Handler: Invite Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedToken || !activeTeam?._id) return;
    if (!inviteUserId && !inviteUserEmail) {
      alert('Please select an organization member or enter an email.');
      return;
    }

    setInvitingMember(true);
    try {
      const res = await fetch(`${API_BASE}/api/team/invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: activeTeam._id,
          userId: inviteUserId || undefined,
          email: !inviteUserId ? inviteUserEmail : undefined,
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to invite team member');
      }

      showToast('Member invited to team!');
      setInviteUserId('');
      setInviteUserEmail('');
      setIsInviteMemberOpen(false);
      loadTeams();
    } catch (err: any) {
      alert(err.message || 'Error inviting member');
    } finally {
      setInvitingMember(false);
    }
  };

  // Handler: Remove Member
  const handleRemoveMember = async (targetUserId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/team/remove`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: activeTeam._id,
          userId: targetUserId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to remove member');
      }

      showToast('Member removed from team');
      loadTeams();
    } catch (err: any) {
      alert(err.message || 'Error removing member');
    }
  };

  // Handler: Update Member Role
  const handleUpdateRole = async (targetUserId: string, newRole: 'admin' | 'member' | 'guest') => {
    try {
      const res = await fetch(`${API_BASE}/api/team/member-role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: activeTeam._id,
          userId: targetUserId,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update role');
      }

      showToast(`Role updated to ${newRole}`);
      loadTeams();
    } catch (err: any) {
      alert(err.message || 'Error updating role');
    }
  };

  // Handler: Save Team Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedToken || !activeTeam?._id) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_BASE}/api/team/${activeTeam._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          visibility: editVisibility,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update team settings');
      }

      showToast('Team settings updated successfully!');
      loadTeams();
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handler: Delete Team
  const handleDeleteTeam = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${activeTeam.name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/team/${activeTeam._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete team');
      }
      showToast('Team deleted');
      await loadTeams();
      setActiveTab('allTeams');
    } catch (err: any) {
      alert(err.message || 'Error deleting team');
    }
  };

  // Handler: Leave Team
  const handleLeaveTeam = async () => {
    if (!window.confirm(`Leave team "${activeTeam.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/team/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: activeTeam._id,
          userId: myUserId,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to leave team');
      }
      showToast('You left the team');
      await loadTeams();
      setActiveTab('allTeams');
    } catch (err: any) {
      alert(err.message || 'Error leaving team');
    }
  };

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
        {/* Left: Team Title with Icon & Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <span
              style={{
                fontSize: '0.94rem',
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeTeam ? activeTeam.name : 'Teams Hub'}
            </span>
            {activeTeam && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  backgroundColor: activeTeam.visibility === 'private' ? '#fef3c7' : '#ecfdf5',
                  color: activeTeam.visibility === 'private' ? '#b45309' : '#059669',
                  textTransform: 'uppercase',
                }}
              >
                {activeTeam.visibility || 'public'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {activeTeam ? `${activeTeam.members?.length || 1} members • ${channels.length} channels` : 'Collaborate'}
          </span>
        </div>

        {/* Right: Quick Call Team & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeTeam && onStartTeamCall && (
            <button
              onClick={() => onStartTeamCall(activeTeam)}
              title="Start Team Conference Call"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
          )}

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
      </div>

      {/* ── Subtabs Controller (Segmented Horizontal Bar) ── */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f8fafc',
          padding: '6px 12px',
          borderBottom: '1px solid #e2e8f0',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setActiveTab('channels')}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'channels' ? '#ffffff' : 'transparent',
            color: activeTab === 'channels' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'channels' ? 800 : 600,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'channels' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
          Channels ({channels.length})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'members' ? '#ffffff' : 'transparent',
            color: activeTab === 'members' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'members' ? 800 : 600,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'members' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Members ({activeTeam?.members?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'settings' ? '#ffffff' : 'transparent',
            color: activeTab === 'settings' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'settings' ? 800 : 600,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>

        <button
          onClick={() => setActiveTab('allTeams')}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: activeTab === 'allTeams' ? '#ffffff' : 'transparent',
            color: activeTab === 'allTeams' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'allTeams' ? 800 : 600,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'allTeams' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          All Teams ({teams.length})
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

      {/* ── Scrollable Body per Active Tab ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* ══════════ TAB 1: CHANNELS ══════════ */}
        {activeTab === 'channels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header with Quick "+ New Channel" */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Channels in {activeTeam ? activeTeam.name : 'Team'}
                </span>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                  Organize team discussions, messages, and calls by topic
                </p>
              </div>

              <button
                onClick={() => setIsCreateChannelOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)',
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Channel
              </button>
            </div>

            {loadingChannels ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                Loading channels...
              </div>
            ) : channels.length === 0 ? (
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
                  gap: 8,
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
                  #
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  No channels in this team yet
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 260 }}>
                  Create your first channel (e.g. #general, #updates) to start group chats and meetings.
                </span>
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  style={{
                    marginTop: 4,
                    padding: '8px 16px',
                    borderRadius: 8,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Create First Channel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {channels.map((chan) => (
                  <div
                    key={chan.id}
                    onClick={() => {
                      if (onSelectChannel) {
                        onSelectChannel({ id: chan.id, name: chan.name });
                        onClose();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 800,
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        #
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          #{chan.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {chan.topic || `${chan.memberCount} members`}
                        </span>
                      </div>
                    </div>

                    {/* Quick Call icon */}
                    {onStartChannelCall && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartChannelCall(chan);
                        }}
                        title="Start Channel Video Call"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB 2: MEMBERS ══════════ */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Team Members ({activeTeam?.members?.length || 0})
                </span>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                  People who have access to this team and its channels
                </p>
              </div>

              {canManageTeam && (
                <button
                  onClick={() => setIsInviteMemberOpen(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Member
                </button>
              )}
            </div>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeTeam?.members?.map((m, idx) => {
                const userObj = typeof m.userId === 'object' ? m.userId : null;
                const memberId = userObj?._id || m.userId;
                const memberName = userObj?.fullName || userObj?.name || 'Team Member';
                const memberEmail = userObj?.email || '';
                const isThisMe = memberId === myUserId;
                const isOwner = m.role === 'owner' || activeTeam.ownerId === memberId;

                return (
                  <div
                    key={memberId || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {userObj?.profileImage ? (
                          <img
                            src={resolveAvatarUrl(userObj.profileImage)}
                            alt=""
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          memberName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {memberName} {isThisMe ? '(You)' : ''}
                          </span>
                          <span
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 6,
                              backgroundColor: isOwner ? '#eff6ff' : '#f1f5f9',
                              color: isOwner ? '#2563eb' : '#64748b',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isOwner ? 'Owner' : m.role}
                          </span>
                        </div>
                        {memberEmail && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {memberEmail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member Controls (if admin & not owner) */}
                    {canManageTeam && !isOwner && !isThisMe && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(memberId, e.target.value as any)}
                          style={{
                            padding: '4px 6px',
                            borderRadius: 6,
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.68rem',
                            color: '#1e293b',
                            fontWeight: 600,
                          }}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="guest">Guest</option>
                        </select>

                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          title="Remove from team"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ TAB 3: SETTINGS ══════════ */}
        {activeTab === 'settings' && activeTeam && (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
              Team Settings & Actions
            </span>

            {/* Team Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Team Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!canManageTeam}
                required
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: canManageTeam ? '#ffffff' : '#f8fafc',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={!canManageTeam}
                rows={3}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: canManageTeam ? '#ffffff' : '#f8fafc',
                  fontSize: '0.8rem',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Visibility */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Visibility</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div
                  onClick={() => canManageTeam && setEditVisibility('public')}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: editVisibility === 'public' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: editVisibility === 'public' ? '#eff6ff' : '#ffffff',
                    cursor: canManageTeam ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>🌐 Public</span>
                  <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Anyone in org can discover & join</span>
                </div>

                <div
                  onClick={() => canManageTeam && setEditVisibility('private')}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: editVisibility === 'private' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: editVisibility === 'private' ? '#eff6ff' : '#ffffff',
                    cursor: canManageTeam ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>🔒 Private</span>
                  <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Only invited members can view</span>
                </div>
              </div>
            </div>

            {canManageTeam && (
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                }}
              >
                {savingSettings ? 'Saving...' : 'Save Team Changes'}
              </button>
            )}

            {/* Quick Actions (Call team, leave, delete) */}
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onStartTeamCall && (
                <button
                  type="button"
                  onClick={() => onStartTeamCall(activeTeam)}
                  style={{
                    padding: '11px',
                    borderRadius: 10,
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Start Team Instant Meeting
                </button>
              )}

              {!isTeamOwner && (
                <button
                  type="button"
                  onClick={handleLeaveTeam}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#e11d48',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Leave This Team
                </button>
              )}

              {canManageTeam && (
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Delete Team Permanently
                </button>
              )}
            </div>
          </form>
        )}

        {/* ══════════ TAB 4: ALL TEAMS ══════════ */}
        {activeTab === 'allTeams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Workspace Teams ({teams.length})
                </span>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                  Switch between active teams or create a new one
                </p>
              </div>

              <button
                onClick={() => setIsCreateTeamOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)',
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Team
              </button>
            </div>

            {loadingTeams ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.78rem' }}>
                Loading workspace teams...
              </div>
            ) : teams.length === 0 ? (
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
                  gap: 8,
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  No Teams Found
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 260 }}>
                  Create your first team to start structuring channels, departments, and discussions.
                </span>
                <button
                  onClick={() => setIsCreateTeamOpen(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Create First Team
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teams.map((t) => {
                  const isActive = t._id === activeTeamId;
                  return (
                    <div
                      key={t._id}
                      onClick={() => {
                        setActiveTeamId(t._id);
                        localStorage.setItem('jts_active_team_id', t._id);
                        setActiveTab('channels');
                        showToast(`Switched to "${t.name}"`);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: isActive ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
                            color: isActive ? '#ffffff' : '#334155',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: '0.84rem',
                                fontWeight: 800,
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {t.name}
                            </span>
                            {isActive && (
                              <span
                                style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  backgroundColor: '#dbeafe',
                                  color: '#1d4ed8',
                                }}
                              >
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {t.members?.length || 1} members • {t.visibility || 'public'}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.74rem', color: isActive ? '#2563eb' : '#94a3b8', fontWeight: 700 }}>
                        {isActive ? 'Current →' : 'Switch →'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ MODAL: CREATE CHANNEL ══════════ */}
      {isCreateChannelOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setIsCreateChannelOpen(false)}
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
                Create Channel in #{activeTeam?.name}
              </span>
              <button
                onClick={() => setIsCreateChannelOpen(false)}
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

            <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Channel Name</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '0 10px',
                    marginTop: 4,
                  }}
                >
                  <span style={{ color: '#94a3b8', fontWeight: 700 }}>#</span>
                  <input
                    type="text"
                    placeholder="e.g. daily-standup"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: '9px 6px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="What is this channel about?"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
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

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Private Channel</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Only invited members can view this channel</div>
                </div>
                <input
                  type="checkbox"
                  checked={isChannelPrivate}
                  onChange={(e) => setIsChannelPrivate(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                />
              </div>

              <button
                type="submit"
                disabled={creatingChannel || !newChannelName.trim()}
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
                {creatingChannel ? 'Creating...' : 'Create Channel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CREATE TEAM ══════════ */}
      {isCreateTeamOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setIsCreateTeamOpen(false)}
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
                Create New Team
              </span>
              <button
                onClick={() => setIsCreateTeamOpen(false)}
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

            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Marketing, Operations"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
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
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Description</label>
                <textarea
                  placeholder="Briefly describe what this team works on"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Visibility</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                  <div
                    onClick={() => setNewTeamVisibility('public')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: newTeamVisibility === 'public' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: newTeamVisibility === 'public' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>🌐 Public</div>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>Anyone in org can join</div>
                  </div>

                  <div
                    onClick={() => setNewTeamVisibility('private')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: newTeamVisibility === 'private' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: newTeamVisibility === 'private' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>🔒 Private</div>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>Invitation only</div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingTeam || !newTeamName.trim()}
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
                {creatingTeam ? 'Creating Team...' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: INVITE MEMBER TO TEAM ══════════ */}
      {isInviteMemberOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setIsInviteMemberOpen(false)}
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
                Add Member to {activeTeam?.name}
              </span>
              <button
                onClick={() => setIsInviteMemberOpen(false)}
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

            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orgMembers.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Select from Organization Members
                  </label>
                  <select
                    value={inviteUserId}
                    onChange={(e) => {
                      setInviteUserId(e.target.value);
                      if (e.target.value) setInviteUserEmail('');
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      marginTop: 4,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="">-- Choose member --</option>
                    {orgMembers.map((m: any) => {
                      const u = typeof m.userId === 'object' ? m.userId : m;
                      const uid = u._id || m.userId;
                      return (
                        <option key={uid} value={uid}>
                          {u.fullName || u.name || 'Member'} ({u.email})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                  Or enter member Email
                </label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteUserEmail}
                  onChange={(e) => {
                    setInviteUserEmail(e.target.value);
                    if (e.target.value) setInviteUserId('');
                  }}
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
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Role in Team</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    marginTop: 4,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="member">Member (Can post & call)</option>
                  <option value="admin">Admin (Can manage channels & members)</option>
                  <option value="guest">Guest (Read only)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={invitingMember || (!inviteUserId && !inviteUserEmail)}
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
                {invitingMember ? 'Inviting...' : 'Add to Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTeamHubModal;
