import React from 'react';
import { RemoteParticipant } from './types';
import NetworkSignalIndicator from './NetworkSignalIndicator';
import { MobileAvatar } from '../common/MobileAvatar';

export interface ConferenceParticipantGridProps {
  participants: RemoteParticipant[];
  remoteStreams: Record<string, MediaStream>;
  isLandscape: boolean;
  activePresenterId: string | null;
  isDirectAudioCall: boolean;
  currentCallType: 'audio' | 'video';
  speakingUsers: Record<string, boolean>;
  focusedUserId: string | null;
  setFocusedUserId: (id: string | null) => void;
  networkStatus: 'online' | 'reconnecting';
  isDirectCall: boolean;
  directPeerName: string;
  timer: string;
  resolvedDisplayName: string;
  onOpenInvite: () => void;
}

export const ConferenceParticipantGrid: React.FC<ConferenceParticipantGridProps> = ({
  participants,
  remoteStreams,
  isLandscape,
  activePresenterId,
  isDirectAudioCall,
  currentCallType,
  speakingUsers,
  focusedUserId,
  setFocusedUserId,
  networkStatus,
  isDirectCall,
  directPeerName,
  timer,
  resolvedDisplayName,
  onOpenInvite,
}) => {
  if (participants.length > 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns:
            participants.length <= 1
              ? '1fr'
              : participants.length === 2
              ? (isLandscape ? '1fr 1fr' : '1fr')
              : participants.length <= 4
              ? '1fr 1fr'
              : isLandscape
              ? 'repeat(3, 1fr)'
              : '1fr 1fr',
          gridTemplateRows:
            participants.length <= 1
              ? '1fr'
              : participants.length === 2
              ? (isLandscape ? '1fr' : '1fr 1fr')
              : participants.length <= 4
              ? '1fr 1fr'
              : participants.length <= 6
              ? (isLandscape ? '1fr 1fr' : 'repeat(3, 1fr)')
              : undefined,
          gridAutoRows: participants.length > 6 ? (isLandscape ? 'calc(50% - 6px)' : 'calc(33.33% - 6px)') : undefined,
          overflowY: participants.length > 6 ? 'auto' : 'hidden',
          gap: participants.length === 1 ? 0 : 8,
          padding: participants.length === 1 ? 0 : 8,
          backgroundColor: '#030712',
        }}
      >
        {participants.map((peer) => {
          const stream = remoteStreams[peer.userId] || remoteStreams[peer.userId.toLowerCase()];
          const hasLiveVideoTrack = !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live' && !t.muted);
          const isScreen = activePresenterId?.toLowerCase() === peer.userId.toLowerCase() ||
            !!stream?.getVideoTracks().some((t) => t.label?.toLowerCase().includes('screen') || t.label?.toLowerCase().includes('display'));
          const shouldShowVideo = !isDirectAudioCall && currentCallType !== 'audio' && stream && hasLiveVideoTrack && (!peer.isVideoOff || isScreen);
          const normPeerId = peer.userId.toLowerCase();
          const isSpeaking = !!speakingUsers[normPeerId] && !peer.isMuted;

          return (
            <div
              key={peer.userId}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: participants.length > 6 ? 140 : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0f172a',
                overflow: 'hidden',
                border: isSpeaking ? '2.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSpeaking ? '0 0 0 2px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.65)' : 'none',
                borderRadius: participants.length > 1 ? 14 : 0,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Remote Video Stream Player */}
              {shouldShowVideo ? (
                <video
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  controls={false}
                  ref={(el) => {
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(() => {});
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: isScreen ? 'contain' : 'cover',
                    backgroundColor: '#030712',
                  }}
                />
              ) : (
                /* Remote Participant Avatar */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <MobileAvatar
                    name={peer.displayName}
                    size={participants.length > 4 ? 54 : 76}
                    border={isSpeaking ? '3px solid #3b82f6' : undefined}
                  />
                  <span style={{ fontSize: participants.length > 4 ? '0.78rem' : '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                    {peer.displayName}
                  </span>
                </div>
              )}

              {/* Pin / Focus Screen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusedUserId(focusedUserId === peer.userId ? null : peer.userId);
                }}
                title={focusedUserId === peer.userId ? 'Unpin' : 'Pin to screen'}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: focusedUserId === peer.userId ? '#2563eb' : 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: focusedUserId === peer.userId ? '1.5px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: focusedUserId === peer.userId ? '0 0 10px rgba(37, 99, 235, 0.5)' : 'none',
                  zIndex: 15,
                  cursor: 'pointer',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill={focusedUserId === peer.userId ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-2l-2-3V5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v7l-2 3v2z" />
                </svg>
              </button>

              {/* Name badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  padding: '4px 8px',
                  borderRadius: 8,
                  background: isSpeaking ? 'rgba(37, 99, 235, 0.9)' : 'rgba(0, 0, 0, 0.72)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: isSpeaking ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.12)',
                  maxWidth: '80%',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSpeaking && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 12 }}>
                    <span style={{ width: 2, height: 8, background: '#93c5fd', borderRadius: 1, animation: 'soundWave 0.6s infinite ease-in-out' }} />
                    <span style={{ width: 2, height: 12, background: '#93c5fd', borderRadius: 1, animation: 'soundWave 0.8s infinite ease-in-out 0.2s' }} />
                    <span style={{ width: 2, height: 6, background: '#93c5fd', borderRadius: 1, animation: 'soundWave 0.5s infinite ease-in-out 0.4s' }} />
                  </span>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peer.displayName}</span>
                <NetworkSignalIndicator isPoor={networkStatus === 'reconnecting'} />
                {peer.isMuted && (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isDirectCall) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <MobileAvatar
          name={directPeerName}
          size={100}
          style={{ marginBottom: 16 }}
        />
        <div style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
          {directPeerName}
        </div>
        <div style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600 }}>
          Connecting call • {timer}
        </div>
      </div>
    );
  }

  // CASE 3B: Alone in conference meeting
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        backgroundColor: '#090d16',
      }}
    >
      <MobileAvatar
        name={resolvedDisplayName}
        size={80}
      />
      <span style={{ marginTop: 12, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
        {resolvedDisplayName} (You)
      </span>

      {/* Exactly 1 clean invite button */}
      <div
        style={{
          marginTop: 20,
          padding: '14px 18px',
          borderRadius: 14,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          maxWidth: 290,
        }}
      >
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          You're the only one here
        </span>
        <button
          onClick={onOpenInvite}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share Invite Link
        </button>
      </div>
    </div>
  );
};
