import React, { useState, useEffect, useRef } from 'react';
import { MobileChatMessage } from './types';
import { API_BASE, resolveAvatarUrl } from '../../config';
import { MobileAvatar } from '../common/MobileAvatar';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EXTENDED_REACTIONS = ['🔥', '👏', '🎉', '💯', '🚀', '😍', '🙌', '👀', '🥳', '⚡', '✨', '🤝', '💪', '🤩'];

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
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<MobileChatMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<MobileChatMessage | null>(null);
  const [showMoreEmojis, setShowMoreEmojis] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<any>(null);

  useEffect(() => {
    if (status) setCurrentStatus(status);
  }, [status]);

  // Sync cache with messages
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(`jts_chat_cache_${chatId}`, JSON.stringify(messages));
      } catch (_) {}
    }
  }, [messages, chatId]);

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
  }, [messages.length]);

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
              fileUrl: m.fileUrl,
              fileName: m.fileName,
              reactions: Array.isArray(m.reactions)
                ? m.reactions.map((r: any) => ({
                    userId: typeof r.userId === 'object' ? (r.userId?._id || r.userId?.id || String(r.userId)) : String(r.userId),
                    emoji: r.emoji,
                    createdAt: r.createdAt,
                  }))
                : [],
              isDeleted: Boolean(m.isDeleted || m.deleted),
              deletedAt: m.deletedAt,
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

  // Listen to incoming messages, reactions and deletions via socket
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
          // Prevent duplicates by ID
          if (payload._id && prev.some((p) => p.id === payload._id)) return prev;

          // If incoming message was sent by me, reconcile optimistic local message
          if (isMe) {
            const localIdx = prev.findIndex((p) => p.id.startsWith('local-') && p.text === text);
            if (localIdx !== -1) {
              const updatedList = [...prev];
              updatedList[localIdx] = {
                ...updatedList[localIdx],
                id: payload._id || updatedList[localIdx].id,
                fileUrl: payload.fileUrl || updatedList[localIdx].fileUrl,
                fileName: payload.fileName || updatedList[localIdx].fileName,
                reactions: payload.reactions || updatedList[localIdx].reactions || [],
                isDeleted: Boolean(payload.isDeleted || payload.deleted),
              };
              return updatedList;
            }
          }

          const updated = [
            ...prev,
            {
              id: payload._id || String(Date.now()),
              senderId: sId,
              senderName: rawSender?.fullName || payload.senderName || chatName,
              text,
              timestamp: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe,
              fileUrl: payload.fileUrl,
              fileName: payload.fileName,
              reactions: Array.isArray(payload.reactions) ? payload.reactions : [],
              isDeleted: Boolean(payload.isDeleted || payload.deleted),
              deletedAt: payload.deletedAt,
            },
          ];
          return updated;
        });
      }
    };

    // Reaction update listeners
    const handleReactionUpdate = (payload: any) => {
      const targetMessageId = payload?.messageId || payload?.id;
      if (!targetMessageId) return;

      if (Array.isArray(payload?.reactions)) {
        setMessages((prev) =>
          prev.map((m) => (m.id === targetMessageId ? { ...m, reactions: payload.reactions } : m))
        );
        return;
      }

      const emoji = payload?.emoji;
      const uId = payload?.userId || payload?.senderId;
      if (!emoji) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === targetMessageId) {
            const current = m.reactions || [];
            const exists = current.some((r) => String(r.userId) === String(uId) && r.emoji === emoji);
            let updated;
            if (exists) {
              updated = current.filter((r) => !(String(r.userId) === String(uId) && r.emoji === emoji));
            } else {
              updated = [...current, { userId: String(uId), emoji, createdAt: new Date() }];
            }
            return { ...m, reactions: updated };
          }
          return m;
        })
      );
    };

    const handleReactionAdd = (payload: any) => {
      const targetMessageId = payload?.messageId;
      const emoji = payload?.emoji;
      const uId = payload?.userId;
      if (!targetMessageId || !emoji) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === targetMessageId) {
            const current = m.reactions || [];
            if (current.some((r) => String(r.userId) === String(uId) && r.emoji === emoji)) return m;
            return { ...m, reactions: [...current, { userId: String(uId), emoji, createdAt: new Date() }] };
          }
          return m;
        })
      );
    };

    const handleReactionRemove = (payload: any) => {
      const targetMessageId = payload?.messageId;
      const emoji = payload?.emoji;
      const uId = payload?.userId;
      if (!targetMessageId || !emoji) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === targetMessageId) {
            const current = m.reactions || [];
            return {
              ...m,
              reactions: current.filter((r) => !(String(r.userId) === String(uId) && r.emoji === emoji)),
            };
          }
          return m;
        })
      );
    };

    // Message deletion listeners
    const handleMessageDelete = (payload: any) => {
      const targetId = payload?.messageId || payload?.id;
      if (!targetId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId ? { ...m, isDeleted: true, deletedAt: payload.deletedAt || new Date() } : m
        )
      );
    };

    const handleMessageUndo = (payload: any) => {
      const targetId = payload?.messageId || payload?.id || payload?.message?._id || payload?.message?.id;
      if (!targetId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, isDeleted: false, deletedAt: undefined } : m))
      );
    };

    // Real-time channel room lifecycle
    if (isChannel && chatId) {
      socket.emit('channel:join', { channelId: chatId });
    } else if (!isChannel && chatId) {
      socket.emit('chat:seen', { senderId: chatId });
    }

    socket.on('chat:receive', handleNewMessage);
    socket.on('chat:message', handleNewMessage);
    socket.on('channel:message:receive', handleNewMessage);
    socket.on('channel:message', handleNewMessage);

    socket.on('chat:reaction', handleReactionUpdate);
    socket.on('reaction:add', handleReactionAdd);
    socket.on('reaction:remove', handleReactionRemove);
    socket.on('chat:message:delete', handleMessageDelete);
    socket.on('message:delete', handleMessageDelete);
    socket.on('chat:message:undo', handleMessageUndo);
    socket.on('channel:reaction', handleReactionUpdate);
    socket.on('channel:message:reaction', handleReactionUpdate);
    socket.on('channel:message:delete', handleMessageDelete);
    socket.on('channel:message:undo', handleMessageUndo);

    return () => {
      if (isChannel && chatId) {
        socket.emit('channel:leave', { channelId: chatId });
      }

      socket.off('chat:receive', handleNewMessage);
      socket.off('chat:message', handleNewMessage);
      socket.off('channel:message:receive', handleNewMessage);
      socket.off('channel:message', handleNewMessage);

      socket.off('chat:reaction', handleReactionUpdate);
      socket.off('reaction:add', handleReactionAdd);
      socket.off('reaction:remove', handleReactionRemove);
      socket.off('chat:message:delete', handleMessageDelete);
      socket.off('message:delete', handleMessageDelete);
      socket.off('chat:message:undo', handleMessageUndo);
      socket.off('channel:reaction', handleReactionUpdate);
      socket.off('channel:message:reaction', handleReactionUpdate);
      socket.off('channel:message:delete', handleMessageDelete);
      socket.off('channel:message:undo', handleMessageUndo);
    };
  }, [socket, chatId, chatName, resolvedUserId, isChannel]);


  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    const tempId = `local-${Date.now()}`;
    const newMsg: MobileChatMessage = {
      id: tempId,
      senderId: resolvedUserId || 'me',
      senderName: 'You',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);

    // Send to backend API (REST endpoint saves to MongoDB and broadcasts CHAT_RECEIVE via socket)
    if (resolvedToken) {
      try {
        if (isChannel) {
          const res = await fetch(`${API_BASE}/api/channel/${chatId}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify({ content: text }),
          });
          if (res.ok) {
            const json = await res.json();
            const saved = json?.data || json;
            if (saved?._id) {
              setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: saved._id } : m)));
            }
          }
        } else {
          const res = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify({
              receiverId: chatId,
              message: text,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            const saved = json?.data || json;
            if (saved?._id) {
              setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: saved._id } : m)));
            }
          }
        }
      } catch (err) {
        console.warn('[MobileChat] Failed to send message via REST:', err);
      }
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    const existingReactions = targetMsg?.reactions || [];
    const alreadyReacted = existingReactions.some(
      (r) => String(r.userId) === String(resolvedUserId) && r.emoji === emoji
    );

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const current = m.reactions || [];
          let updated;
          if (alreadyReacted) {
            updated = current.filter(
              (r) => !(String(r.userId) === String(resolvedUserId) && r.emoji === emoji)
            );
          } else {
            updated = [
              ...current,
              { userId: String(resolvedUserId || 'me'), emoji, createdAt: new Date() },
            ];
          }
          return { ...m, reactions: updated };
        }
        return m;
      })
    );

    setSelectedMessageForAction(null);
    setShowMoreEmojis(false);

    // Socket Emit
    if (socket) {
      if (isChannel) {
        socket.emit('channel:reaction', {
          channelId: chatId,
          messageId,
          userId: resolvedUserId,
          emoji,
        });
      } else {
        if (alreadyReacted) {
          socket.emit('reaction:remove', {
            messageId,
            receiverId: chatId,
            emoji,
          });
        } else {
          socket.emit('chat:reaction', {
            receiverId: chatId,
            messageId,
            emoji,
          });
          socket.emit('reaction:add', {
            messageId,
            receiverId: chatId,
            emoji,
          });
        }
      }
    }

    // REST API Persist
    if (resolvedToken) {
      try {
        if (isChannel) {
          await fetch(`${API_BASE}/api/channel/${chatId}/chat/${messageId}/reaction`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify({ emoji }),
          });
        } else {
          if (alreadyReacted) {
            await fetch(`${API_BASE}/api/chat/message/${messageId}/react`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedToken}`,
              },
              body: JSON.stringify({ emoji }),
            });
          } else {
            await fetch(`${API_BASE}/api/chat/message/${messageId}/react`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedToken}`,
              },
              body: JSON.stringify({ emoji }),
            });
          }
        }
      } catch (err) {
        console.warn('[MobileChat] Failed to save reaction to API:', err);
      }
    }
  };

  const handleDeleteMessage = async (msg: MobileChatMessage) => {
    setMessageToDelete(null);
    setSelectedMessageForAction(null);
    setShowMoreEmojis(false);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isDeleted: true, deletedAt: new Date() } : m))
    );

    setToastMessage('Message deleted for everyone');
    setTimeout(() => {
      setToastMessage((curr) => (curr === 'Message deleted for everyone' ? null : curr));
    }, 3500);

    // Socket Emit
    if (socket) {
      if (isChannel) {
        socket.emit('channel:message:delete', { channelId: chatId, messageId: msg.id });
      } else {
        socket.emit('chat:message:delete', { messageId: msg.id, receiverId: chatId });
        socket.emit('message:delete', { messageId: msg.id, receiverId: chatId });
      }
    }

    // REST API
    if (resolvedToken) {
      try {
        if (isChannel) {
          await fetch(`${API_BASE}/api/channel/${chatId}/chat/${msg.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${resolvedToken}` },
          });
        } else {
          await fetch(`${API_BASE}/api/chat/message/${msg.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${resolvedToken}` },
          });
        }
      } catch (err) {
        console.warn('[MobileChat] Failed to delete message:', err);
      }
    }
  };

  const handleUndoDeleteMessage = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDeleted: false, deletedAt: undefined } : m))
    );
    setToastMessage('Message restored');
    setTimeout(() => {
      setToastMessage((curr) => (curr === 'Message restored' ? null : curr));
    }, 2500);

    // Socket Emit
    if (socket) {
      if (isChannel) {
        socket.emit('channel:message:undo', { channelId: chatId, messageId });
      } else {
        socket.emit('chat:message:undo', { messageId, receiverId: chatId });
      }
    }

    // REST API
    if (resolvedToken) {
      try {
        if (isChannel) {
          await fetch(`${API_BASE}/api/channel/${chatId}/chat/${messageId}/undo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${resolvedToken}` },
          });
        } else {
          await fetch(`${API_BASE}/api/chat/message/${messageId}/undo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${resolvedToken}` },
          });
        }
      } catch (err) {
        console.warn('[MobileChat] Failed to undo delete message:', err);
      }
    }
  };

  const handleCopyMessage = (text: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setToastMessage('Copied to clipboard');
      setTimeout(() => {
        setToastMessage((curr) => (curr === 'Copied to clipboard' ? null : curr));
      }, 2000);
    } catch (_) {}
    setSelectedMessageForAction(null);
    setShowMoreEmojis(false);
  };

  const handleTouchStart = (msg: MobileChatMessage) => {
    pressTimerRef.current = setTimeout(() => {
      try {
        if (window.navigator?.vibrate) {
          window.navigator.vibrate(40);
        }
      } catch (_) {}
      setSelectedMessageForAction(msg);
      setShowMoreEmojis(false);
    }, 380);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const isImageUrl = (url: string) => {
    return (
      typeof url === 'string' &&
      (/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(url) || url.startsWith('data:image/'))
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contextType', isChannel ? 'channel' : 'chat');
      formData.append('contextId', chatId);

      const res = await fetch(`${API_BASE}/api/file/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const fileUrl = json?.data?.fileUrl || json?.fileUrl || (json?.data?.filename ? `${API_BASE}/uploads/${json.data.filename}` : '');
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        const fileName = file.name;
        const msgText = fullUrl || `[Attachment: ${fileName}]`;

        if (isChannel) {
          await fetch(`${API_BASE}/api/channel/${chatId}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify({ content: msgText, fileUrl: fullUrl, fileName }),
          });
        } else {
          await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify({
              receiverId: chatId,
              message: msgText,
              fileUrl: fullUrl,
              fileName,
            }),
          });
        }

        const newMsg: MobileChatMessage = {
          id: `local-${Date.now()}`,
          senderId: resolvedUserId || 'me',
          senderName: 'You',
          text: msgText,
          fileUrl: fullUrl,
          fileName,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
        };
        setMessages((prev) => [...prev, newMsg]);
      } else {
        alert('File upload failed. Please try a smaller file.');
      }
    } catch (err) {
      console.warn('[MobileChat] Upload error:', err);
      alert('Error uploading file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            {isChannel ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>#</span>
            ) : (
              <MobileAvatar
                src={chatAvatar}
                name={chatName}
                size={34}
                backgroundColor="transparent"
              />
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
              maxWidth: '82%',
              position: 'relative',
            }}
          >
            {!msg.isMe && isChannel && (
              <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#475569', marginBottom: 2, marginLeft: 6 }}>
                {msg.senderName}
              </span>
            )}
            <div
              onTouchStart={() => !msg.isDeleted && handleTouchStart(msg)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onMouseDown={() => !msg.isDeleted && handleTouchStart(msg)}
              onMouseUp={handleTouchEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!msg.isDeleted) {
                  setSelectedMessageForAction(msg);
                  setShowMoreEmojis(false);
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: msg.isMe ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                backgroundColor: msg.isDeleted ? '#f1f5f9' : msg.isMe ? '#2563eb' : '#ffffff',
                color: msg.isDeleted ? '#64748b' : msg.isMe ? '#ffffff' : '#0f172a',
                fontSize: '0.78rem',
                lineHeight: 1.4,
                boxShadow: msg.isDeleted
                  ? 'none'
                  : msg.isMe
                  ? '0 1px 3px rgba(37,99,235,0.25)'
                  : '0 1px 2px rgba(0,0,0,0.06)',
                border: msg.isDeleted ? '1px dashed #cbd5e1' : msg.isMe ? 'none' : '1px solid #e2e8f0',
                wordBreak: 'break-word',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {msg.isDeleted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontStyle: 'italic', padding: '2px 0' }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <span>This message was deleted</span>
                  {msg.isMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUndoDeleteMessage(msg.id);
                      }}
                      style={{
                        marginLeft: 6,
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Undo
                    </button>
                  )}
                </div>
              ) : isImageUrl(msg.fileUrl || msg.text) ? (
                <div style={{ marginBottom: 4 }}>
                  <img
                    src={resolveAvatarUrl(msg.fileUrl || msg.text)}
                    alt="attachment"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 220,
                      borderRadius: 10,
                      display: 'block',
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(resolveAvatarUrl(msg.fileUrl || msg.text), '_blank')}
                  />
                  {msg.fileName && (
                    <span style={{ fontSize: '0.64rem', opacity: 0.85, marginTop: 2, display: 'block' }}>
                      {msg.fileName}
                    </span>
                  )}
                </div>
              ) : msg.fileUrl ? (
                <a
                  href={resolveAvatarUrl(msg.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: msg.isMe ? '#ffffff' : '#2563eb',
                    textDecoration: 'underline',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {msg.fileName || 'Download File'}
                </a>
              ) : (
                msg.text
              )}

              {/* Timestamp & action triggers */}
              <div
                style={{
                  fontSize: '0.6rem',
                  color: msg.isDeleted ? '#94a3b8' : msg.isMe ? 'rgba(255,255,255,0.8)' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 3,
                  marginTop: 3,
                }}
              >
                <span>{msg.timestamp}</span>
                {msg.isMe && !msg.isDeleted && (
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L7 17l-5-5" />
                    <path d="M22 10l-7.5 7.5-2-2" />
                  </svg>
                )}
                {!msg.isDeleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMessageForAction(msg);
                      setShowMoreEmojis(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '1px 2px',
                      marginLeft: 4,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: msg.isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                    }}
                    title="Reaction / Actions"
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="19" cy="12" r="1.5" />
                      <circle cx="5" cy="12" r="1.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Reaction Badges (WhatsApp Style) */}
            {msg.reactions && msg.reactions.length > 0 && !msg.isDeleted && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  marginTop: 3,
                  alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {Object.entries(
                  msg.reactions.reduce((acc: Record<string, string[]>, r) => {
                    if (!acc[r.emoji]) acc[r.emoji] = [];
                    acc[r.emoji].push(String(r.userId));
                    return acc;
                  }, {})
                ).map(([emoji, userIds]) => {
                  const hasMyReaction = userIds.includes(String(resolvedUserId));
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReaction(msg.id, emoji);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 7px',
                        borderRadius: 12,
                        backgroundColor: hasMyReaction ? '#eff6ff' : '#ffffff',
                        border: hasMyReaction ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        fontSize: '0.70rem',
                        lineHeight: 1,
                      }}
                      title={hasMyReaction ? 'Tap to remove reaction' : 'Tap to react'}
                    >
                      <span style={{ fontSize: '0.85rem' }}>{emoji}</span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: hasMyReaction ? '#2563eb' : '#64748b',
                        }}
                      >
                        {userIds.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        {/* Attachment paperclip icon button (Icon only) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Attach File"
          title="Attach Photo or Document"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            backgroundColor: isUploading ? '#eff6ff' : '#f1f5f9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isUploading ? '#2563eb' : '#64748b',
            cursor: isUploading ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          {isUploading ? (
            <div
              style={{
                width: 14,
                height: 14,
                border: '2px solid #2563eb',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          )}
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

      {/* ══════════════════════════════════════════════════════════════
          WHATSAPP FLOATING EMOJI & ACTION MENU MODAL
      ══════════════════════════════════════════════════════════════ */}
      {selectedMessageForAction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            setSelectedMessageForAction(null);
            setShowMoreEmojis(false);
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              maxWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Emojis Capsule (WhatsApp Style) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 30,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 12px 30px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
              }}
            >
              {QUICK_REACTIONS.map((emoji) => {
                const userReacted = selectedMessageForAction.reactions?.some(
                  (r) => String(r.userId) === String(resolvedUserId) && r.emoji === emoji
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(selectedMessageForAction.id, emoji)}
                    style={{
                      background: userReacted ? '#eff6ff' : 'transparent',
                      border: userReacted ? '2px solid #3b82f6' : 'none',
                      borderRadius: '50%',
                      width: 38,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowMoreEmojis((v) => !v)}
                style={{
                  background: showMoreEmojis ? '#e2e8f0' : '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
                title="More Reactions"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Extended Emoji Grid (if + clicked) */}
            {showMoreEmojis && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  padding: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 6,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  border: '1px solid #e2e8f0',
                }}
              >
                {EXTENDED_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(selectedMessageForAction.id, emoji)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                      cursor: 'pointer',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Message Action Sheet (Copy / Delete) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: '4px 0',
                width: 220,
                boxShadow: '0 12px 25px rgba(0,0,0,0.18)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {/* Copy */}
              <button
                type="button"
                onClick={() => handleCopyMessage(selectedMessageForAction.text)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'none',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Text</span>
              </button>

              {/* Delete Message (if it's my message) */}
              {selectedMessageForAction.isMe && !selectedMessageForAction.isDeleted && (
                <button
                  type="button"
                  onClick={() => {
                    setMessageToDelete(selectedMessageForAction);
                    setSelectedMessageForAction(null);
                    setShowMoreEmojis(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid #f1f5f9',
                    color: '#ef4444',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span>Delete Message</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          WHATSAPP DELETE CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════ */}
      {messageToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setMessageToDelete(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 22,
              width: '100%',
              maxWidth: 320,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                border: '2px solid #fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Delete message?
            </h3>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 18px 0', lineHeight: 1.5 }}>
              Are you sure you want to delete this message? This message will be deleted for everyone in this chat.
            </p>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleDeleteMessage(messageToDelete)}
                style={{
                  flex: 1.2,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Delete for everyone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast (e.g. Copied to clipboard, Message deleted) */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: '0.74rem',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default MobileConversationView;
