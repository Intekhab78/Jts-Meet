import React, { useState, useEffect } from 'react';
import { MobileChannel } from './types';
import { MobileCreateChannelModal } from './MobileCreateChannelModal';
import { API_BASE, getStoredToken } from '../../config';

interface MobileChannelsListProps {
  token?: string | null;
  searchQuery: string;
  onSelectChannel: (channel: MobileChannel) => void;
  onStartChannelCall: (channel: MobileChannel) => void;
  onOpenTeamHub?: () => void;
}

export const MobileChannelsList: React.FC<MobileChannelsListProps> = ({
  token,
  searchQuery,
  onSelectChannel,
  onStartChannelCall,
  onOpenTeamHub,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastModalClosedRef = React.useRef(0);
  const [channels, setChannels] = useState<MobileChannel[]>([]);
  const [loading, setLoading] = useState(false);

  // Load real channels dynamically from the backend
  const loadDynamicChannels = async () => {
    const resolvedToken = token || getStoredToken();
    if (!resolvedToken) return;
    setLoading(true);
    try {
      // 1. Get user's organizations
      const orgRes = await fetch(`${API_BASE}/api/organization/mine`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (!orgRes.ok) throw new Error('Org fetch failed');
      const orgJson = await orgRes.json();
      const orgList = orgJson.data || [];

      if (orgList.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      const activeOrgId = localStorage.getItem('jts_current_org_id') || orgList[0]._id;

      // 2. Get teams for this organization
      const teamsRes = await fetch(`${API_BASE}/api/team/organization/${activeOrgId}`, {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (!teamsRes.ok) throw new Error('Teams fetch failed');
      const teamsJson = await teamsRes.json();
      const teamsList = teamsJson.data || [];

      if (teamsList.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      // 3. Get channels for each team
      const allLoadedChannels: MobileChannel[] = [];
      for (const team of teamsList) {
        try {
          const chanRes = await fetch(`${API_BASE}/api/channel/team/${team._id}`, {
            headers: { Authorization: `Bearer ${resolvedToken}` },
          });
          if (chanRes.ok) {
            const chanJson = await chanRes.json();
            const chanList = chanJson.data || [];
            chanList.forEach((c: any) => {
              allLoadedChannels.push({
                id: c._id || c.id,
                name: c.name,
                topic: c.description || c.topic || `Team: ${team.name}`,
                memberCount: c.members?.length || 1,
                lastMessage: c.lastMessage || 'Active team channel',
                lastMessageTime: 'Recently',
                unreadCount: 0,
              });
            });
          }
        } catch (_) {}
      }

      setChannels(allLoadedChannels);
    } catch (err) {
      console.error('[MobileChannels] Dynamic fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDynamicChannels();
  }, [token]);

  const filtered = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.topic && c.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 14px 14px' }}>
      {/* ── Channels Header & Quick Actions Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0 10px',
        }}
      >
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
          Team Channels ({channels.length})
        </span>

        {/* Actions: Teams Hub & Add Channel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onOpenTeamHub && (
            <button
              onClick={onOpenTeamHub}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 9px',
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Teams Hub
            </button>
          )}

          {/* Pure Icon Button to Add Channel or Invite Member */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (Date.now() - lastModalClosedRef.current < 450) return;
              setIsModalOpen(true);
            }}
            aria-label="Create Channel"
            title="Create Channel or Invite Member"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Channels List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
            Loading organization channels...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: 14,
              border: '1px dashed #cbd5e1',
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
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
              {searchQuery ? `No channels matching "${searchQuery}"` : 'No Channels in this Team'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 260 }}>
              Create a channel to collaborate, send team messages, and launch group video conferences.
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (Date.now() - lastModalClosedRef.current < 450) return;
                setIsModalOpen(true);
              }}
              style={{
                marginTop: 6,
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create First Channel
            </button>
          </div>
        ) : (
          filtered.map((chan) => (
            <div
              key={chan.id}
              onClick={() => onSelectChannel(chan)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 14,
                backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                gap: 10,
              }}
            >
              {/* Channel Icon & Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  #
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      #{chan.name}
                    </span>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>{chan.lastMessageTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                    >
                      {chan.lastMessage}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8', flexShrink: 0 }}>
                      {chan.memberCount} members
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Channel Call Button (Icon Only) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChannelCall(chan);
                }}
                aria-label="Start Channel Call"
                title="Start Channel Video Call"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#2563eb',
                  flexShrink: 0,
                }}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Create Channel & Invite Member Modal ── */}
      <MobileCreateChannelModal
        isOpen={isModalOpen}
        token={token}
        onClose={() => {
          lastModalClosedRef.current = Date.now();
          setIsModalOpen(false);
        }}
        onChannelCreated={(newChan) => {
          setChannels((prev) => [newChan, ...prev]);
        }}
      />
    </div>
  );
};
export default MobileChannelsList;
