import React from 'react';
import { RemoteParticipant } from './types';

export interface PipModeOverlayProps {
  isMinimized: boolean;
  isNativePip: boolean;
  onMaximize?: () => void;
  onLeave: () => void;
  timer: string;
  displayName: string;
  presenterStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  localStream: MediaStream | null;
  participants: RemoteParticipant[];
  screenSharingUserId: string | null;
  screenStream: MediaStream | null;
}

export const PipModeOverlay: React.FC<PipModeOverlayProps> = ({
  isMinimized,
  isNativePip,
  onMaximize,
  onLeave,
  timer,
  displayName,
  presenterStream,
  remoteStreams,
  localStream,
  participants,
  screenSharingUserId,
  screenStream,
}) => {
  // ── PICTURE IN PICTURE MINI-CARD VIEW ──
  if (isMinimized) {
    const activePipStream = presenterStream || Object.values(remoteStreams)[0] || localStream;

    return (
      <div
        onClick={onMaximize}
        style={{
          position: 'fixed',
          bottom: 78,
          right: 12,
          width: 148,
          height: 218,
          borderRadius: 16,
          backgroundColor: '#090d16',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
          border: '2px solid #2563eb',
          zIndex: 99999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
        }}
      >
        {/* Top Header of Mini PiP */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '6px 8px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 800 }}>
            {timer}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMaximize?.();
              }}
              title="Expand Meeting"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeave();
              }}
              title="Leave Call"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mini Video Feed */}
        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
          {activePipStream ? (
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el && activePipStream && el.srcObject !== activePipStream) {
                  el.srcObject = activePipStream;
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: presenterStream ? 'contain' : 'cover',
              }}
            />
          ) : (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: 8 }}>
              {displayName}
            </div>
          )}
        </div>

        {/* Keep audio tracks alive in mini PiP mode */}
        <div style={{ display: 'none' }}>
          {participants.map((peer) => {
            const s = remoteStreams[peer.userId] || remoteStreams[peer.userId.toLowerCase()];
            return s ? (
              <audio
                key={peer.userId}
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && s && el.srcObject !== s) el.srcObject = s;
                }}
              />
            ) : null;
          })}
        </div>
      </div>
    );
  }

  // Native Android PiP (Full-Screen Edge-to-Edge Speaker Video inside Android Floating Window)
  if (isNativePip) {
    const pStream = screenSharingUserId
      ? (remoteStreams[screenSharingUserId] || remoteStreams[screenSharingUserId.toLowerCase()] || (screenSharingUserId === 'local' ? screenStream : null))
      : null;
    const activeRemoteStream = participants.length > 0
      ? (remoteStreams[participants[0].userId] || remoteStreams[participants[0].userId.toLowerCase()])
      : null;
    const activePipStream = pStream || activeRemoteStream || localStream;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: '#000000',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: 0,
          margin: 0,
        }}
      >
        {activePipStream ? (
          <video
            autoPlay
            playsInline
            muted={activePipStream === localStream}
            ref={(el) => {
              if (el && activePipStream && el.srcObject !== activePipStream) {
                el.srcObject = activePipStream;
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: pStream ? 'contain' : 'cover',
            }}
          />
        ) : (
          <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', padding: 8 }}>
            {displayName}
          </div>
        )}

        {/* Keep remote audio streams playing in native PiP */}
        <div style={{ display: 'none' }}>
          {participants.map((peer) => {
            const s = remoteStreams[peer.userId] || remoteStreams[peer.userId.toLowerCase()];
            return s ? (
              <audio
                key={peer.userId}
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && s && el.srcObject !== s) el.srcObject = s;
                }}
              />
            ) : null;
          })}
        </div>
      </div>
    );
  }

  return null;
};
