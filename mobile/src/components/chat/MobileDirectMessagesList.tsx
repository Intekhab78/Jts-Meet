import React, { useState, useEffect } from 'react';
import { MobileContact } from './types';
import { MobileOnlineStoriesBar } from './MobileOnlineStoriesBar';
import { API_BASE, getStoredToken, resolveAvatarUrl } from '../../config';

interface MobileDirectMessagesListProps {
  token?: string | null;
  socket?: any;
  searchQuery: string;
  onSelectChat: (contact: MobileContact) => void;
  onStartAudioCall: (contact: MobileContact) => void;
  onStartVideoCall: (contact: MobileContact) => void;
}

export const MobileDirectMessagesList: React.FC<MobileDirectMessagesListProps> = ({
  token,
  socket,
  searchQuery,
  onSelectChat,
  onStartAudioCall,
  onStartVideoCall,
}) => {
  const [contacts, setContacts] = useState<MobileContact[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real contacts dynamically from backend
  useEffect(() => {
    const resolvedToken = token || getStoredToken();
    if (!resolvedToken) {
      setContacts([]);
      return;
    }
    const loadContacts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/chat/contacts`, {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: MobileContact[] = data.data.map((u: any) => {
            const isOnline = u.status === 'online' || u.isOnline === true;
            return {
              id: u._id || u.id,
              name: u.fullName || u.name || 'Team Member',
              email: u.email,
              avatar: u.profileImage,
              status: u.inMeeting ? 'in_meeting' : isOnline ? 'online' : (u.status || 'offline'),
              lastMessage: u.lastMessage || 'Tap to chat',
              lastMessageTime: u.lastSeen
                ? new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recently',
              unreadCount: u.unreadCount || 0,
              role: u.role || 'Member',
            };
          });
          setContacts(mapped);
        }
      } catch (_) {}
      finally {
        setLoading(false);
      }
    };
    loadContacts();
  }, [token]);

  // Real-time socket presence tracking
  useEffect(() => {
    if (!socket) return;
    const handlePresenceUpdate = (data: { userId: string; status: string }) => {
      if (!data?.userId) return;
      setContacts((prev) =>
        prev.map((c) =>
          String(c.id) === String(data.userId)
            ? { ...c, status: (data.status as any) || 'online' }
            : c
        )
      );
    };

    const handlePresenceSync = (allPresences: Record<string, any>) => {
      if (!allPresences) return;
      setContacts((prev) =>
        prev.map((c) => {
          const pres = allPresences[c.id];
          if (pres && pres.status) {
            return { ...c, status: pres.status };
          }
          return c;
        })
      );
    };

    const handleUserOnline = (data: { userId: string }) => {
      if (!data?.userId) return;
      setContacts((prev) =>
        prev.map((c) =>
          String(c.id) === String(data.userId) ? { ...c, status: 'online' } : c
        )
      );
    };

    const handleUserOffline = (data: { userId: string }) => {
      if (!data?.userId) return;
      setContacts((prev) =>
        prev.map((c) =>
          String(c.id) === String(data.userId) ? { ...c, status: 'offline' } : c
        )
      );
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('presence:sync', handlePresenceSync);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('presence:sync', handlePresenceSync);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCallAttempt = (contact: MobileContact, type: 'audio' | 'video') => {
    if (contact.status === 'in_meeting') {
      const confirmed = window.confirm(
        `${contact.name} is currently in a meeting. Do you still want to call them?`
      );
      if (!confirmed) return;
    }
    if (type === 'audio') {
      onStartAudioCall(contact);
    } else {
      onStartVideoCall(contact);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Active Online Teammates Stories Strip (shown when not searching) ── */}
      {!searchQuery && (
        <MobileOnlineStoriesBar
          contacts={contacts}
          onSelectContact={onSelectChat}
          onStartVideoCall={onStartVideoCall}
        />
      )}

      {/* ── Contacts List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
            No direct messages matching "{searchQuery}"
          </div>
        ) : (
          filtered.map((contact) => {
            const isInMeeting = contact.status === 'in_meeting';
            const isOnline = contact.status === 'online';
            const isBusy = contact.status === 'busy';

            return (
              <div
                key={contact.id}
                onClick={() => onSelectChat(contact)}
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
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Avatar & Contact Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: isInMeeting
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                      {contact.avatar && (
                        <img
                          src={resolveAvatarUrl(contact.avatar)}
                          alt=""
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    {/* Status Dot */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: isInMeeting
                          ? '#ef4444'
                          : isOnline
                          ? '#10b981'
                          : isBusy
                          ? '#f59e0b'
                          : '#94a3b8',
                        border: '2px solid #ffffff',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
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
                          {contact.name}
                        </span>

                        {contact.email && (
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ({contact.email})
                          </span>
                        )}

                        {/* In Meeting Tag */}
                        {isInMeeting && (
                          <span
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              color: '#ef4444',
                              backgroundColor: '#fee2e2',
                              padding: '1px 5px',
                              borderRadius: 4,
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em',
                              flexShrink: 0,
                            }}
                          >
                            In Call
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8', flexShrink: 0 }}>
                        {contact.lastMessageTime}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '85%',
                        }}
                      >
                        {contact.lastMessage}
                      </span>

                      {contact.unreadCount ? (
                        <span
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            minWidth: 16,
                            height: 16,
                            borderRadius: 8,
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {contact.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Quick Calling Action Buttons (Icon Only) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {/* Audio Call */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallAttempt(contact, 'audio');
                    }}
                    aria-label="Call"
                    title="Audio Call"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: isInMeeting ? '#fef2f2' : '#f0fdf4',
                      border: isInMeeting ? '1px solid #fecaca' : '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isInMeeting ? '#ef4444' : '#16a34a',
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
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  {/* Video Call */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallAttempt(contact, 'video');
                    }}
                    aria-label="Video Call"
                    title="Video Call"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: isInMeeting ? '#fef2f2' : '#eff6ff',
                      border: isInMeeting ? '1px solid #fecaca' : '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isInMeeting ? '#ef4444' : '#2563eb',
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default MobileDirectMessagesList;
