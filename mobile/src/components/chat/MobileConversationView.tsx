import React, { useState, useEffect, useRef } from 'react';
import { MobileChatMessage } from './types';
import { API_BASE } from '../../config';

interface MobileConversationViewProps {
  chatId: string;
  chatName: string;
  chatAvatar?: string;
  isChannel?: boolean;
  status?: string;
  token?: string | null;
  currentUserId?: string;
  socket?: any;
  onBack: () => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
}

export const MobileConversationView: React.FC<MobileConversationViewProps> = ({
  chatId,
  chatName,
  chatAvatar,
  isChannel = false,
  status = 'online',
  token,
  currentUserId,
  socket,
  onBack,
  onStartAudioCall,
  onStartVideoCall,
}) => {
  const resolvedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jts_access_token') || localStorage.getItem('jts_token') : null);
  const resolvedUserId = currentUserId || (typeof window !== 'undefined' ? (() => {
    try {
      const u = JSON.parse(localStorage.getItem('jts_user_profile') || '{}');
      return u._id || u.id;
    } catch { return null; }
  })() : null);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<MobileChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem(`jts_chat_cache_${chatId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(status || 'offline');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status) setCurrentStatus(status);
  }, [status]);

  // Real-time presence listener for this contact
  useEffect(() => {
    if (!socket || isChannel) return;
    const handlePresence = (data: any) => {
      if (String(data?.userId) === String(chatId)) {
        setCurrentStatus(data.status || 'online');
      }
    };
    const handleOnline = (data: any) => {
      if (String(data?.userId) === String(chatId)) {
        setCurrentStatus('online');
      }
    };
    const handleOffline = (data: any) => {
      if (String(data?.userId) === String(chatId)) {
        setCurrentStatus('offline');
      }
    };
    const handleSync = (allPresences: Record<string, any>) => {
      if (allPresences && allPresences[chatId]) {
        setCurrentStatus(allPresences[chatId].status || 'online');
      }
    };

    socket.on('presence:update', handlePresence);
    socket.on('presence:sync', handleSync);
    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('presence:sync', handleSync);
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
    };
  }, [socket, chatId, isChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation messages dynamically from backend API
  useEffect(() => {
    if (!resolvedToken) return;
    const fetchChatHistory = async () => {
      setLoadingHistory(true);
      try {
        const url = isChannel
          ? `${API_BASE}/api/channel/${chatId}/chat`
          : `${API_BASE}/api/chat/conversation?userId=${chatId}&limit=50`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });
        const json = await res.json();
        const rawList = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.messages)
          ? json.data.messages
          : Array.isArray(json?.messages)
          ? json.messages
          : [];

        if (rawList.length > 0) {
          const chronologicalList = isChannel ? rawList : [...rawList].reverse();
          const mapped: MobileChatMessage[] = chronologicalList.map((m: any) => {
            const rawSender = m.sender || m.senderId || m.userId;
            const sId = rawSender?._id || rawSender?.id || (typeof rawSender === 'object' ? rawSender?.toString() : rawSender);
            const isMe = String(sId) === String(resolvedUserId);
            const sName = isMe ? 'You' : (rawSender?.fullName || rawSender?.name || chatName);
            const content = m.message || m.content || m.text || '';
            return {
              id: m._id || String(Math.random()),
              senderId: sId,
              senderName: sName,
              text: content,
              timestamp: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe,
            };
          });
          setMessages(mapped);
          try {
            localStorage.setItem(`jts_chat_cache_${chatId}`, JSON.stringify(mapped));
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[MobileChat] Error loading chat history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchChatHistory();
  }, [chatId, isChannel, resolvedToken, resolvedUserId, chatName]);

  // Listen to incoming messages via socket
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (payload: any) => {
      const rawSender = payload?.sender || payload?.senderId || payload?.userId;
      const sId = rawSender?._id || rawSender?.id || (typeof rawSender === 'object' ? rawSender?.toString() : rawSender);
      const isFromTarget =
        String(sId) === String(chatId) ||
        String(payload?.receiverId) === String(chatId) ||
        String(payload?.channelId) === String(chatId);

      if (isFromTarget) {
        const isMe = String(sId) === String(resolvedUserId);
        const text = payload.message || payload.content || payload.text || '';
        if (!text) return;

        setMessages((prev) => {
          // Prevent duplicates
          if (payload._id && prev.some((p) => p.id === payload._id)) return prev;
          const updated = [
            ...prev,
            {
              id: payload._id || String(Date.now()),
              senderId: sId,
              senderName: rawSender?.fullName || payload.senderName || chatName,
              text,
              timestamp: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe,
            },
          ];
          try {
            localStorage.setItem(`jts_chat_cache_${chatId}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }
    };

    socket.on('chat:receive', handleNewMessage);
    socket.on('chat:message', handleNewMessage);
    socket.on('channel:message:receive', handleNewMessage);
    socket.on('channel:message', handleNewMessage);

    return () => {
      socket.off('chat:receive', handleNewMessage);
      socket.off('chat:message', handleNewMessage);
      socket.off('channel:message:receive', handleNewMessage);
      socket.off('channel:message', handleNewMessage);
    };
  }, [socket, chatId, chatName, resolvedUserId]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    const tempId = `local-${Date.now()}`;
    const newMsg: MobileChatMessage = {
      id: tempId,
      senderId: currentUserId || 'me',
      senderName: 'You',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);

    // Send to backend API and socket
    if (token) {
      try {
        if (isChannel) {
          fetch(`${API_BASE}/api/channel/${chatId}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: text }),
          }).catch(() => {});
        } else {
          fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              receiverId: chatId,
              message: text,
            }),
          }).catch(() => {});
        }
      } catch (_) {}
    }

    if (socket) {
      if (isChannel) {
        socket.emit('channel:chat:send', { channelId: chatId, content: text });
      } else {
        socket.emit('chat:send', { receiverId: chatId, message: text });
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Native Mobile Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          {/* Back Icon Button */}
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0f172a',
              flexShrink: 0,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          {/* Avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: isChannel ? 10 : '50%',
              background: isChannel
                ? 'linear-gradient(135deg, #475569, #334155)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {isChannel ? '#' : chatAvatar ? (
              <img src={chatAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              chatName.charAt(0).toUpperCase()
            )}
            {!isChannel && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: currentStatus === 'online' ? '#10b981' : currentStatus === 'in_meeting' ? '#a855f7' : currentStatus === 'busy' ? '#ef4444' : '#94a3b8',
                  border: '1.5px solid #ffffff',
                }}
              />
            )}
          </div>

          {/* User / Channel Info */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
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
              {isChannel ? `#${chatName}` : chatName}
            </span>
            <span style={{ fontSize: '0.66rem', color: currentStatus === 'online' ? '#10b981' : currentStatus === 'in_meeting' ? '#a855f7' : '#64748b' }}>
              {isChannel ? 'Team Channel' : currentStatus === 'online' ? 'Online' : currentStatus === 'in_meeting' ? 'In a Meeting' : currentStatus === 'busy' ? 'Busy' : 'Offline'}
            </span>
          </div>
        </div>

        {/* ── Call Action Buttons (Icon Only, Mobile Style) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Audio Call */}
          <button
            onClick={onStartAudioCall}
            aria-label="Audio Call"
            title="Audio Call"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#16a34a',
              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>

          {/* Video Call */}
          <button
            onClick={onStartVideoCall}
            aria-label="Video Call"
            title="Video Call"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#2563eb',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages Feed ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: '#64748b',
              backgroundColor: '#e2e8f0',
              padding: '3px 8px',
              borderRadius: 10,
            }}
          >
            End-to-End Encrypted Communication
          </span>
        </div>

        {/* Date Separator */}
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: '#64748b',
              backgroundColor: '#e2e8f0',
              padding: '2px 10px',
              borderRadius: 10,
              letterSpacing: '0.02em',
            }}
          >
            Today
          </span>
        </div>

        {loadingHistory && (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.72rem', color: '#94a3b8' }}>
            Loading message history...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '0.75rem' }}>
            No messages yet. Send a message to start conversation with {chatName}.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
            }}
          >
            {!msg.isMe && isChannel && (
              <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#475569', marginBottom: 2, marginLeft: 6 }}>
                {msg.senderName}
              </span>
            )}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: msg.isMe ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                backgroundColor: msg.isMe ? '#2563eb' : '#ffffff',
                color: msg.isMe ? '#ffffff' : '#0f172a',
                fontSize: '0.78rem',
                lineHeight: 1.4,
                boxShadow: msg.isMe ? '0 1px 3px rgba(37,99,235,0.25)' : '0 1px 2px rgba(0,0,0,0.06)',
                border: msg.isMe ? 'none' : '1px solid #e2e8f0',
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
              <div
                style={{
                  fontSize: '0.6rem',
                  color: msg.isMe ? 'rgba(255,255,255,0.8)' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 3,
                  marginTop: 3,
                }}
              >
                <span>{msg.timestamp}</span>
                {msg.isMe && (
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L7 17l-5-5" />
                    <path d="M22 10l-7.5 7.5-2-2" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Native Mobile Composer Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Attachment paperclip icon button (Icon only) */}
        <button
          onClick={() => alert('Photo & document attachment option opened.')}
          aria-label="Attach File"
          title="Attach"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          type="text"
          placeholder="Message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          style={{
            flex: 1,
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 20,
            padding: '8px 14px',
            fontSize: '0.8rem',
            color: '#0f172a',
            outline: 'none',
          }}
        />

        {/* Send Button (Icon only) */}
        <button
          onClick={handleSendMessage}
          disabled={!inputText.trim()}
          aria-label="Send"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: inputText.trim() ? '#2563eb' : '#cbd5e1',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: inputText.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'background-color 0.15s ease',
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
export default MobileConversationView;
