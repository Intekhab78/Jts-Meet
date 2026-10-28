import React, { useState, useEffect } from 'react';
import { MobileChannel } from './types';
import { API_BASE } from '../../config';

interface MobileCreateChannelModalProps {
  isOpen: boolean;
  token?: string | null;
  onClose: () => void;
  onChannelCreated: (newChan: MobileChannel) => void;
}

export const MobileCreateChannelModal: React.FC<MobileCreateChannelModalProps> = ({
  isOpen,
  token,
  onClose,
  onChannelCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'channel' | 'member'>('channel');

  // Channel state
  const [channelName, setChannelName] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [activeOrgId, setActiveOrgId] = useState('');

  // Fetch real org and teams on open
  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchOrgAndTeams = async () => {
      try {
        const orgRes = await fetch(`${API_BASE}/api/organization/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (orgRes.ok) {
          const orgJson = await orgRes.json();
          const orgList = orgJson.data || [];
          if (orgList.length > 0) {
            const orgId = localStorage.getItem('jts_current_org_id') || orgList[0]._id;
            setActiveOrgId(orgId);

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
  }, [isOpen, token]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = channelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanName) return;

    setIsSubmitting(true);

    let createdId = `chan-${Date.now()}`;

    // Post to backend API with required fields: organizationId, teamId, name, type
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
            type: isPrivate ? 'private' : 'public',
            description: channelTopic.trim() || 'Team channel',
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?._id) createdId = json.data._id;
        }
      } catch (_) {}
    }

    const newChan: MobileChannel = {
      id: createdId,
      name: cleanName,
      topic: channelTopic.trim() || 'Team channel',
      isPrivate,
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
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);

    if (token) {
      try {
        await fetch(`${API_BASE}/api/organization/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole,
          }),
        });
      } catch (_) {}
    }

    setIsSubmitting(false);
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteEmail('');
      onClose();
    }, 1500);
  };

  const handleCopyInviteLink = () => {
    const url = window.location.origin;
    navigator.clipboard?.writeText(url);
    alert('Organization Invite Link copied to clipboard!');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
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
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '16px 18px 24px',
          boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Segmented Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              borderRadius: 10,
              padding: 3,
              gap: 4,
            }}
          >
            <button
              onClick={() => setActiveTab('channel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeTab === 'channel' ? '#ffffff' : 'transparent',
                color: activeTab === 'channel' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'channel' ? 700 : 500,
                fontSize: '0.74rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'channel' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
              New Channel
            </button>

            <button
              onClick={() => setActiveTab('member')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeTab === 'member' ? '#ffffff' : 'transparent',
                color: activeTab === 'member' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'member' ? 700 : 500,
                fontSize: '0.74rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'member' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Invite Member
            </button>
          </div>

          {/* Close Icon Button */}
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

        {/* ── Tab 1: Create Channel Form ── */}
        {activeTab === 'channel' && (
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Channel Name
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '0 10px',
                  height: 38,
                }}
              >
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.9rem', marginRight: 4 }}>#</span>
                <input
                  type="text"
                  placeholder="e.g. operations-update"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#0f172a',
                    fontSize: '0.8rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Topic / Purpose (Optional)
              </label>
              <input
                type="text"
                placeholder="What is this channel for?"
                value={channelTopic}
                onChange={(e) => setChannelTopic(e.target.value)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '8px 10px',
                  outline: 'none',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            {/* Privacy Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>
                  {isPrivate ? 'Private Channel' : 'Public Channel'}
                </span>
                <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                  {isPrivate ? 'Only invited team members can see this' : 'Anyone in the organization can join'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 12,
                  backgroundColor: isPrivate ? '#2563eb' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 2,
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transform: isPrivate ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !channelName.trim()}
              style={{
                marginTop: 6,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Create Channel
            </button>
          </form>
        )}

        {/* ── Tab 2: Invite Member Form ── */}
        {activeTab === 'member' && (
          <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Colleague Email Address
              </label>
              <input
                type="email"
                placeholder="colleague@jts.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '8px 10px',
                  outline: 'none',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Role & Permissions
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '8px 10px',
                  outline: 'none',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                }}
              >
                <option value="member">Member (Can chat & join calls)</option>
                <option value="admin">Admin (Can manage channels & users)</option>
              </select>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Link
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !inviteEmail.trim()}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {inviteSuccess ? 'Invite Sent!' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default MobileCreateChannelModal;
