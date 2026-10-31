import React from 'react';
import { MobileAvatar } from '../common/MobileAvatar';

export interface DirectAudioCallViewProps {
  directPeerName: string;
  timer: string;
  participantsCount: number;
  isRemoteSpeaking: boolean;
  audioRoute: 'speaker' | 'bluetooth' | 'earpiece';
  bluetoothDeviceName: string | null;
  cycleAudioRoute: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  isVideoOff: boolean;
  onUpgradeToVideo: () => void;
  onEndCall: () => void;
  onMinimize?: () => void;
}

export const DirectAudioCallView: React.FC<DirectAudioCallViewProps> = ({
  directPeerName,
  timer,
  participantsCount,
  isRemoteSpeaking,
  audioRoute,
  bluetoothDeviceName,
  cycleAudioRoute,
  isMuted,
  toggleMute,
  onUpgradeToVideo,
  onEndCall,
  onMinimize,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingTop: 'calc(var(--safe-top) + 16px)',
        paddingBottom: 'calc(var(--safe-bottom) + 36px)',
        paddingLeft: 24,
        paddingRight: 24,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header: Minimize Button + Status Pill ── */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        {onMinimize ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Minimize Call"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 42, height: 42 }} />
        )}

        {/* Status Header Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 20,
            background: participantsCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: participantsCount > 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            color: participantsCount > 0 ? '#15803d' : '#b45309',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: participantsCount > 0 ? '#22c55e' : '#f59e0b',
              display: 'inline-block',
              boxShadow: participantsCount > 0 ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
            }}
          />
          <span>
            {participantsCount > 0 ? 'CONNECTED • JTS MEET HD VOICE' : 'CONNECTING • JTS MEET HD VOICE'}
          </span>
        </div>

        <div style={{ width: 42, height: 42 }} />
      </div>

      {/* ── Center Section: Timer, Avatar with Sound Waves, Name & Status ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
          maxWidth: 360,
          zIndex: 5,
        }}
      >
        {/* Call Timer */}
        <div
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 28,
            letterSpacing: '0.01em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {participantsCount > 0 ? timer : '00:00'}
        </div>

        {/* Large Center Avatar with Pulsing Waves */}
        <div
          style={{
            position: 'relative',
            width: 140,
            height: 140,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Dynamic Waves */}
          {isRemoteSpeaking && (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: -16,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(59, 130, 246, 0.45)',
                  animation: 'pulseRing 2s infinite ease-out',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: -32,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(59, 130, 246, 0.25)',
                  animation: 'pulseRing 2s 0.6s infinite ease-out',
                }}
              />
            </>
          )}

          <MobileAvatar
            name={directPeerName}
            size={132}
            border={isRemoteSpeaking ? '4px solid #60a5fa' : '4px solid rgba(255, 255, 255, 0.9)'}
            style={{
              boxShadow: isRemoteSpeaking
                ? '0 0 35px rgba(59, 130, 246, 0.45), 0 16px 40px rgba(59, 130, 246, 0.25)'
                : '0 16px 36px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.25s ease',
              zIndex: 3,
            }}
          />
        </div>

        {/* Contact Name */}
        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {directPeerName}
        </h2>

        {/* Live Subtitle */}
        <p
          style={{
            margin: 0,
            fontSize: '0.95rem',
            color: isRemoteSpeaking ? '#2563eb' : '#64748b',
            fontWeight: isRemoteSpeaking ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isRemoteSpeaking && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 12 }}>
              <span style={{ width: 2.5, height: 8, background: '#2563eb', borderRadius: 1, animation: 'soundWave 0.6s infinite ease-in-out' }} />
              <span style={{ width: 2.5, height: 14, background: '#2563eb', borderRadius: 1, animation: 'soundWave 0.8s infinite ease-in-out 0.2s' }} />
              <span style={{ width: 2.5, height: 6, background: '#2563eb', borderRadius: 1, animation: 'soundWave 0.5s infinite ease-in-out 0.4s' }} />
            </span>
          )}
          {participantsCount === 0
            ? 'Calling colleague...'
            : isRemoteSpeaking
            ? 'Speaking...'
            : 'Live 1-on-1 Voice Call'}
        </p>
      </div>

      {/* ── Bottom Controls Bar (WhatsApp Action Bar Style) ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '14px 18px',
          borderRadius: 40,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          zIndex: 10,
        }}
      >
        {/* Audio Route Toggle (Speaker / Bluetooth / Earpiece) */}
        <button
          onClick={cycleAudioRoute}
          title={audioRoute === 'bluetooth' ? (bluetoothDeviceName || 'Bluetooth') : audioRoute === 'speaker' ? 'Speakerphone' : 'Earpiece'}
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            backgroundColor: audioRoute === 'speaker' ? 'rgba(37, 99, 235, 0.12)' : '#ffffff',
            color: audioRoute === 'speaker' ? '#2563eb' : '#334155',
            border: audioRoute === 'speaker' ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.18s ease',
          }}
        >
          {audioRoute === 'bluetooth' ? (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m7 7 10 10-5 5V2l5 5L7 17" />
            </svg>
          ) : audioRoute === 'speaker' ? (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            </svg>
          )}
        </button>

        {/* Switch to Video Call (Turn Camera On) */}
        <button
          onClick={onUpgradeToVideo}
          title="Turn on Camera / Video"
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.18s ease',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>

        {/* Mute / Unmute Mic */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            backgroundColor: isMuted ? '#ef4444' : '#ffffff',
            border: isMuted ? 'none' : '1px solid #e2e8f0',
            color: isMuted ? '#ffffff' : '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isMuted ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.18s ease',
          }}
        >
          {isMuted ? (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Red End Call Button */}
        <button
          onClick={onEndCall}
          title="End Call"
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.45)',
            transition: 'all 0.18s ease',
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

export default DirectAudioCallView;
