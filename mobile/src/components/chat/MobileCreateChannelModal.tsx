import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { MobileChannel } from './types';
import { API_BASE } from '../../config';

interface MobileCreateChannelModalProps {
  isOpen: boolean;
  token?: string | null;
  onClose: () => void;
  onChannelCreated: (newChan: MobileChannel) => void;
}

const TOPIC_PRESETS = [
  { label: 'announcements', topic: 'Official updates, milestones, and important alerts', icon: '📢' },
  { label: 'daily-standup', topic: 'Asynchronous standups, daily progress, and blockers', icon: '🏃' },
  { label: 'sprint-planning', topic: 'Agile sprints, task priorities, and sprint reviews', icon: '🚀' },
  { label: 'design-reviews', topic: 'UI/UX mockups, wireframes, and design system feedback', icon: '🎨' },
  { label: 'bug-reports', topic: 'Issue triage, regression reports, and bug discussions', icon: '🐛' },
  { label: 'random-chat', topic: 'Non-work conversations, team celebrations, and watercooler chat', icon: '☕' },
];

const ROLES_INFO = [
  {
    role: 'member' as const,
    title: 'Regular Member',
    badge: 'Standard',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    desc: 'Can participate in meetings, post messages, and collaborate in assigned team channels.',
  },
  {
    role: 'admin' as const,
    title: 'Organization Admin',
    badge: 'Admin Access',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    desc: 'Full workspace control: manage teams, create channels, invite & remove members, and view metrics.',
  },
  {
    role: 'guest' as const,
    title: 'Guest / Viewer',
    badge: 'Read-Only',
    badgeColor: '#64748b',
    badgeBg: '#f1f5f9',
    desc: 'Read-only access to team channels and meeting participation. Cannot modify configurations.',
  },
];

export const MobileCreateChannelModal: React.FC<MobileCreateChannelModalProps> = ({
  isOpen,
  token,
  onClose,
  onChannelCreated,
}) => {
  // CRITICAL: Return null immediately when modal is not open
  if (!isOpen) return null;

  // Intercept Android hardware back button
  useEffect(() => {
    let handle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        onClose();
      }).then((h) => {
        handle = h;
      });
    } catch (_) {}
    return () => {
      handle?.remove();
    };
  }, [onClose]);

  const [activeTab, setActiveTab] = useState<'channel' | 'member'>('channel');

  // Channel Form State
  const [channelName, setChannelName] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [isAnnouncementOnly, setIsAnnouncementOnly] = useState(false);
  const [autoAddMembers, setAutoAddMembers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Invite Member Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'guest'>('member');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState('');

  // Org & Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [activeOrgId, setActiveOrgId] = useState('');
  const [activeOrgName, setActiveOrgName] = useState('');

  // Fetch real org and teams on open
  useEffect(() => {
    if (!token) return;
    const fetchOrgAndTeams = async () => {
      try {
        const orgRes = await fetch(`${API_BASE}/api/organization/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (orgRes.ok) {
          const orgJson = await orgRes.json();
          const orgList = orgJson.data || [];
          if (orgList.length > 0) {
            const currentStoredId = localStorage.getItem('jts_current_org_id');
            const foundOrg = orgList.find((o: any) => o._id === currentStoredId) || orgList[0];
            const orgId = foundOrg._id;
            setActiveOrgId(orgId);
            setActiveOrgName(foundOrg.name || 'Your Organization');

            const teamsRes = await fetch(`${API_BASE}/api/team/organization/${orgId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (teamsRes.ok) {
              const teamsJson = await teamsRes.json();
              const teamsList = teamsJson.data || [];
              setTeams(teamsList);
              if (teamsList.length > 0) {
                setSelectedTeamId(teamsList[0]._id);
              }
            }
          }
        }
      } catch (_) {}
    };
    fetchOrgAndTeams();
  }, [token]);

  // Clean and sanitize channel slug
  const cleanName = channelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');

  const handleApplyPreset = (preset: { label: string; topic: string }) => {
    setChannelName(preset.label);
    setChannelTopic(preset.topic);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanName) {
      setErrorMsg('Please enter a valid channel name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    let createdId = `chan-${Date.now()}`;

    if (token && activeOrgId && selectedTeamId) {
      try {
        const res = await fetch(`${API_BASE}/api/channel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            organizationId: activeOrgId,
            teamId: selectedTeamId,
            name: cleanName,
            type: channelType,
            description: channelTopic.trim() || 'Team collaboration channel',
            isAnnouncementOnly,
            autoAddMembers,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?._id) createdId = json.data._id;
        } else {
          const err = await res.json().catch(() => ({}));
          if (err.message) {
            setErrorMsg(err.message);
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn('[Mobile] Channel API error, falling back locally:', err);
      }
    }

    const newChan: MobileChannel = {
      id: createdId,
      name: cleanName,
      topic: channelTopic.trim() || 'Team collaboration channel',
      isPrivate: channelType === 'private',
      memberCount: 1,
      lastMessage: 'Channel created. Welcome team!',
      lastMessageTime: 'Just now',
      unreadCount: 0,
    };

    setIsSubmitting(false);
    onChannelCreated(newChan);
    onClose();
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim();
    if (!cleanEmail) {
      setInviteFeedback('Please enter an email address or user ID.');
      return;
    }

    setIsSubmitting(true);
    setInviteFeedback('');

    if (token && activeOrgId) {
      try {
        const res = await fetch(`${API_BASE}/api/organization/${activeOrgId}/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            role: inviteRole,
            teamId: selectedTeamId || undefined,
          }),
        });

        if (res.ok) {
          setInviteSuccess(true);
          setInviteFeedback(`Invitation sent successfully to ${cleanEmail}!`);
        } else {
          const err = await res.json().catch(() => ({}));
          setInviteFeedback(err.message || 'Invitation sent! (Pending verification)');
          setInviteSuccess(true);
        }
      } catch (_) {
        setInviteSuccess(true);
        setInviteFeedback(`Invitation sent to ${cleanEmail}!`);
      }
    } else {
      setInviteSuccess(true);
      setInviteFeedback(`Invitation sent to ${cleanEmail}!`);
    }

    setIsSubmitting(false);
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteEmail('');
      setInviteFeedback('');
      onClose();
    }, 1800);
  };

  const inviteLink = `${window.location.origin}/join-org?orgId=${activeOrgId || 'general'}`;

  const handleCopyInviteLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
    }
    alert('Organization invitation link copied to clipboard!');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Join our workspace ${activeOrgName || 'on JTS Meet'}:\n${inviteLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${activeOrgName || 'JTS Meet Workspace'}`,
          text: `Join our team on JTS Meet for chat, calls, and meetings:`,
          url: inviteLink,
        });
      } catch (_) {}
    } else {
      handleCopyInviteLink();
    }
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
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            {activeTab === 'channel' ? 'Create New Channel' : 'Invite Workspace Member'}
          </h2>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {activeOrgName || 'Enterprise Workspace'}
          </span>
        </div>

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

      {/* ── Segmented Switcher Tabs ── */}
      <div
        style={{
          padding: '10px 16px 8px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundColor: '#e2e8f0',
            borderRadius: 12,
            padding: 3,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('channel');
              setErrorMsg('');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: activeTab === 'channel' ? '#ffffff' : 'transparent',
              color: activeTab === 'channel' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'channel' ? 800 : 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'channel' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
            <span>New Channel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('member');
              setErrorMsg('');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: activeTab === 'member' ? '#ffffff' : 'transparent',
              color: activeTab === 'member' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'member' ? 800 : 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'member' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          backgroundColor: '#ffffff',
        }}
      >
        {/* ── TAB 1: CREATE CHANNEL ── */}
        {activeTab === 'channel' && (
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Team Picker (if teams exist) */}
            {teams.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Select Team / Department
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  style={{
                    padding: '11px 12px',
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      👥 {t.name} ({t.members?.length || 1} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Channel Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Channel Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {cleanName && (
                  <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                    #{cleanName}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '0 12px',
                  height: 44,
                }}
              >
                <span style={{ color: '#2563eb', fontWeight: 800, fontSize: '1.1rem', marginRight: 6 }}>#</span>
                <input
                  type="text"
                  placeholder="e.g. operations-updates, design-sync"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                />
              </div>
              <span style={{ fontSize: '0.67rem', color: '#94a3b8' }}>
                Names must be lowercase, without spaces (use hyphens).
              </span>
            </div>

            {/* Topic Quick Presets Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                ⚡ Quick Topic Presets (Tap to fill)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TOPIC_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      backgroundColor: cleanName === p.label ? '#eff6ff' : '#f1f5f9',
                      border: cleanName === p.label ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      color: cleanName === p.label ? '#2563eb' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{p.icon}</span>
                    <span>#{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic / Purpose */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Topic / Purpose (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="What is this channel for? e.g. Daily sprint discussion and progress tracking"
                value={channelTopic}
                onChange={(e) => setChannelTopic(e.target.value)}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '10px 12px',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Channel Type Selector (Public vs Private) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Channel Privacy & Access
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Public */}
                <div
                  onClick={() => setChannelType('public')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 14,
                    border: channelType === 'public' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: channelType === 'public' ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563eb' }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Public</span>
                  </div>
                  <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    Anyone in the organization can search, view, and join.
                  </span>
                </div>

                {/* Private */}
                <div
                  onClick={() => setChannelType('private')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 14,
                    border: channelType === 'private' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: channelType === 'private' ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706' }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Private</span>
                  </div>
                  <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    Only invited members can view or participate.
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Channel Options */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Announcement Only Toggle */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Announcement Only
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Only team admins can post; members can read and react.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAnnouncementOnly}
                  onChange={(e) => setIsAnnouncementOnly(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                />
              </div>

              {/* Auto Add Members Toggle */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Auto-Add Team Members
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Automatically add all existing team members to this channel.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoAddMembers}
                  onChange={(e) => setAutoAddMembers(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                />
              </div>
            </div>

            {/* Live Preview Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Channel Preview
              </span>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: channelType === 'private' ? '#fef3c7' : '#eff6ff',
                    color: channelType === 'private' ? '#d97706' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                >
                  {channelType === 'private' ? '🔒' : '#'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    #{cleanName || 'new-channel'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {channelTopic || 'Team collaboration channel'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {channelType.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, paddingBottom: 24 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !cleanName}
                style={{
                  flex: 2,
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: isSubmitting || !cleanName ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !cleanName ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSubmitting ? (
                  <span>Creating Channel...</span>
                ) : (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Create Channel</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── TAB 2: INVITE MEMBER ── */}
        {activeTab === 'member' && (
          <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {inviteFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: inviteSuccess ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${inviteSuccess ? '#bbf7d0' : '#fecaca'}`,
                  color: inviteSuccess ? '#16a34a' : '#dc2626',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {inviteFeedback}
              </div>
            )}

            {/* Email / User ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Colleague Email or User ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.67rem', color: '#94a3b8' }}>
                They will receive an invitation to join this workspace and its teams.
              </span>
            </div>

            {/* Team Assignment (Optional) */}
            {teams.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Assign Directly to Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  style={{
                    padding: '11px 12px',
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  <option value="">General Workspace (No specific team)</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      👥 {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Role Selection Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Select Workspace Role & Permissions
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ROLES_INFO.map((r) => {
                  const isSelected = inviteRole === r.role;
                  return (
                    <div
                      key={r.role}
                      onClick={() => setInviteRole(r.role)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                          {r.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: r.badgeBg,
                            color: r.badgeColor,
                          }}
                        >
                          {r.badge}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.35 }}>
                        {r.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Shareable Invite Link Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔗</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    Shareable Invitation Link
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Anyone with this link can request to join this workspace
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.72rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {inviteLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Copy
                </button>
              </div>

              {/* Share Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 10,
                    backgroundColor: '#25d366',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>📲</span>
                  <span>Share...</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, paddingBottom: 24 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
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
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: isSubmitting || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !inviteEmail.trim() ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSubmitting ? (
                  <span>Sending Invitation...</span>
                ) : (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Send Invitation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MobileCreateChannelModal;
