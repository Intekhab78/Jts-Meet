import React from 'react';
import { RemoteParticipant } from './types';
import { MobileAvatar } from '../common/MobileAvatar';

export interface DirectVideoCallViewProps {
  directPeerName: string;
  directPeerId: string;
  timer: string;
  participants: RemoteParticipant[];
  remoteStreams: Record<string, MediaStream>;
  isRemoteSpeaking: boolean;
  audioRoute: 'speaker' | 'bluetooth' | 'earpiece';
  bluetoothDeviceName: string | null;
  cycleAudioRoute: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  isVideoOff: boolean;
  toggleVideo: () => void;
  flipCamera: () => void;
  onEndCall: () => void;
  onMinimize?: () => void;
}

export const DirectVideoCallView: React.FC<DirectVideoCallViewProps> = ({
  directPeerName,
  directPeerId,
  timer,
  participants,
  remoteStreams,
  isRemoteSpeaking,
  audioRoute,
  bluetoothDeviceName,
  cycleAudioRoute,
  isMuted,
  toggleMute,
  isVideoOff,
  toggleVideo,
  flipCamera,
  onEndCall,
  onMinimize,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#07080d',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Top-Left Floating Info Badge matching Web */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-top) + 12px)',
          left: 14,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(18, 20, 32, 0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '6px 14px 6px 8px',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'auto',
        }}
      >
        <MobileAvatar
          name={directPeerName}
          size={32}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{directPeerName}</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: participants.length > 0 ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
            {participants.length > 0 ? `${timer} • HD Video Call` : 'Calling...'}
          </div>
        </div>
      </div>

      {/* Top-Right Floating Minimize Button matching Web */}
      {onMinimize && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMinimize();
          }}
          title="Minimize Call"
          style={{
            position: 'absolute',
            top: 'calc(var(--safe-top) + 12px)',
            right: 14,
            zIndex: 30,
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'rgba(18, 20, 32, 0.78)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      )}

      {/* Remote Peer Video Stream Player (Edge-to-edge full bleed) */}
      {(() => {
        const peer = participants[0];
        const peerId = peer?.userId || directPeerId;
        const stream = peerId ? (remoteStreams[peerId] || remoteStreams[peerId.toLowerCase()]) : null;
        const hasLiveVideoTrack = !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live' && !t.muted);
        const shouldShowRemoteVideo = stream && hasLiveVideoTrack && !peer?.isVideoOff;

        if (shouldShowRemoteVideo) {
          return (
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
                objectFit: 'cover',
                backgroundColor: '#07080d',
              }}
            />
          );
        }

        return (
          /* Remote Camera Off: Sleek Teams / Meet Avatar with Sound Waves */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRemoteSpeaking && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: -14,
                      borderRadius: '50%',
                      border: '2px solid rgba(129, 140, 248, 0.7)',
                      animation: 'pulseRing 1.8s infinite ease-out',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: -28,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(129, 140, 248, 0.35)',
                      animation: 'pulseRing 1.8s 0.6s infinite ease-out',
                    }}
                  />
                </>
              )}
              <MobileAvatar
                name={directPeerName}
                size={110}
                border={isRemoteSpeaking ? '4px solid #818cf8' : '4px solid rgba(255, 255, 255, 0.15)'}
                style={{
                  boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
                  zIndex: 2,
                }}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                {directPeerName}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                {participants.length === 0 ? 'Connecting video...' : isRemoteSpeaking ? 'Speaking...' : 'Camera is off'}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Glassmorphic Pill Toolbar at Bottom Center matching Web */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(var(--safe-bottom) + 20px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 35,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(18, 20, 32, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '8px 18px',
          borderRadius: 40,
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.75)',
          pointerEvents: 'auto',
        }}
      >
        {/* Mic Mute / Unmute */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: isMuted ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none',
          }}
        >
          {isMuted ? (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Camera On / Off */}
        <button
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: isVideoOff ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none',
          }}
        >
          {isVideoOff ? (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
        </button>

        {/* Audio Route Toggle (Speaker / Bluetooth / Earpiece) */}
        <button
          onClick={cycleAudioRoute}
          title={audioRoute === 'bluetooth' ? (bluetoothDeviceName || 'Bluetooth') : audioRoute === 'speaker' ? 'Speakerphone' : 'Earpiece'}
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: audioRoute === 'speaker' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.12)',
            color: audioRoute === 'speaker' ? '#38bdf8' : '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {audioRoute === 'bluetooth' ? (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m7 7 10 10-5 5V2l5 5L7 17" />
            </svg>
          ) : (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        {/* Flip Camera */}
        <button
          onClick={flipCamera}
          title="Flip Camera"
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.008.74 3.843 1.967 5.25L4 17h5v-5l-1.84 1.84C6.34 12.67 6 11.38 6 10c0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.38-.34 2.67-1.16 3.84L15 12v5h5l-1.967-1.75C19.26 13.843 20 12.008 20 10z" />
          </svg>
        </button>

        <div style={{ width: 1, height: 26, background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />

        {/* Red End Call */}
        <button
          onClick={onEndCall}
          title="End Call"
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: '#ef4444',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: '0 8px 25px rgba(239, 68, 68, 0.5)',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ transform: 'rotate(135deg)' }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DirectVideoCallView;
