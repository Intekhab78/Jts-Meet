import React, { useState } from 'react';
import { MobileDirectMessagesList } from '../chat/MobileDirectMessagesList';
import { MobileChannelsList } from '../chat/MobileChannelsList';
import { MobileConversationView } from '../chat/MobileConversationView';
import { MobileContact, MobileChannel } from '../chat/types';

interface MessagesTabProps {
  token?: string | null;
  currentUser?: any;
  socket?: any;
  onStartMeeting?: (code: string) => void;
  onStartCall?: (
    targetUserId: string,
    targetName: string,
    callType: 'audio' | 'video',
    targetAvatar?: string,
    channelName?: string
  ) => void;
  onOpenTeamHub?: () => void;
  registerCloseConversation?: (fn: (() => boolean) | null) => void;
  targetConversation?: { id: string; name: string; avatar?: string; isChannel: boolean } | null;
  onClearTargetConversation?: () => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  token,
  currentUser,
  socket,
  onStartMeeting,
  onStartCall,
  onOpenTeamHub,
  registerCloseConversation,
  targetConversation,
  onClearTargetConversation,
}) => {
  const [activeSegment, setActiveSegment] = useState<'dm' | 'channel'>('dm');
  const [search, setSearch] = useState('');
  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    name: string;
    avatar?: string;
    isChannel: boolean;
    status?: string;
  } | null>(null);

  // Auto-open target conversation if passed from outside (e.g. Teams Hub)
  React.useEffect(() => {
    if (targetConversation) {
      setActiveSegment(targetConversation.isChannel ? 'channel' : 'dm');
      setActiveConversation({
        id: targetConversation.id,
        name: targetConversation.name,
        avatar: targetConversation.avatar,
        isChannel: targetConversation.isChannel,
      });
      onClearTargetConversation?.();
    }
  }, [targetConversation, onClearTargetConversation]);

  // Inform root Android back handler when conversation is active
  React.useEffect(() => {
    if (registerCloseConversation) {
      if (activeConversation) {
        registerCloseConversation(() => {
          setActiveConversation(null);
          return true; // handled
        });
      } else {
        registerCloseConversation(null);
      }
    }
    return () => {
      registerCloseConversation?.(null);
    };
  }, [activeConversation, registerCloseConversation]);

  // If a conversation is active, render the dedicated mobile conversation screen
  if (activeConversation) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <MobileConversationView
          chatId={activeConversation.id}
          chatName={activeConversation.name}
          chatAvatar={activeConversation.avatar}
          isChannel={activeConversation.isChannel}
          status={activeConversation.status || 'online'}
          token={token}
          currentUserId={currentUser?._id || currentUser?.id}
          socket={socket}
          onBack={() => setActiveConversation(null)}
          onStartAudioCall={() => {
            if (activeConversation.isChannel) {
              if (onStartCall) {
                onStartCall(
                  activeConversation.id,
                  activeConversation.name,
                  'audio',
                  undefined,
                  activeConversation.name
                );
              }
            } else if (onStartCall) {
              onStartCall(
                activeConversation.id,
                activeConversation.name,
                'audio',
                activeConversation.avatar
              );
            }
          }}
          onStartVideoCall={() => {
            if (activeConversation.isChannel) {
              if (onStartCall) {
                onStartCall(
                  activeConversation.id,
                  activeConversation.name,
                  'video',
                  undefined,
                  activeConversation.name
                );
              }
            } else if (onStartCall) {
              onStartCall(
                activeConversation.id,
                activeConversation.name,
                'video',
                activeConversation.avatar
              );
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header with Mobile Segmented Pill Switcher ── */}
      <div
        style={{
          padding: '10px 14px 8px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Segmented Controller (Direct Messages vs Teams/Channels) */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: 10,
            padding: 3,
            gap: 4,
          }}
        >
          {/* Direct Messages tab */}
          <button
            onClick={() => setActiveSegment('dm')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeSegment === 'dm' ? '#ffffff' : 'transparent',
              color: activeSegment === 'dm' ? '#0f172a' : '#64748b',
              fontWeight: activeSegment === 'dm' ? 700 : 500,
              fontSize: '0.74rem',
              cursor: 'pointer',
              boxShadow: activeSegment === 'dm' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Direct Messages
          </button>

          {/* Teams & Channels tab */}
          <button
            onClick={() => setActiveSegment('channel')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeSegment === 'channel' ? '#ffffff' : 'transparent',
              color: activeSegment === 'channel' ? '#0f172a' : '#64748b',
              fontWeight: activeSegment === 'channel' ? 700 : 500,
              fontSize: '0.74rem',
              cursor: 'pointer',
              boxShadow: activeSegment === 'channel' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
            Teams & Channels
          </button>
        </div>

        {/* Compact Search Bar with SVG Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '0 10px',
            height: 34,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={activeSegment === 'dm' ? 'Search direct contacts...' : 'Search team channels...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#0f172a',
              fontSize: '0.78rem',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#e2e8f0',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                padding: 0,
              }}
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable List Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {activeSegment === 'dm' ? (
          <MobileDirectMessagesList
            token={token}
            socket={socket}
            searchQuery={search}
            onSelectChat={(contact: MobileContact) => {
              setActiveConversation({
                id: contact.id,
                name: contact.name,
                avatar: contact.avatar,
                isChannel: false,
                status: contact.status,
              });
            }}
            onStartAudioCall={(contact: MobileContact) => {
              if (onStartCall) {
                onStartCall(contact.id, contact.name, 'audio', contact.avatar);
              }
            }}
            onStartVideoCall={(contact: MobileContact) => {
              if (onStartCall) {
                onStartCall(contact.id, contact.name, 'video', contact.avatar);
              }
            }}
          />
        ) : (
          <MobileChannelsList
            token={token}
            searchQuery={search}
            onOpenTeamHub={onOpenTeamHub}
            onSelectChannel={(channel: MobileChannel) => {
              setActiveConversation({
                id: channel.id,
                name: channel.name,
                isChannel: true,
              });
            }}
            onStartChannelCall={(channel: MobileChannel) => {
              if (onStartMeeting) {
                onStartMeeting(channel.id);
              } else if (onStartCall) {
                onStartCall(channel.id, channel.name, 'video', undefined, channel.name);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
