import React, { useState, useEffect } from 'react';
import { resolveAvatarUrl } from '../../config';

interface MobileOutgoingCallModalProps {
  isOpen: boolean;
  targetName: string;
  targetAvatar?: string;
  callType: 'audio' | 'video';
  isChannel?: boolean;
  onCancel: () => void;
}

export const MobileOutgoingCallModal: React.FC<MobileOutgoingCallModalProps> = ({
  isOpen,
  targetName,
  targetAvatar,
  callType,
  isChannel = false,
  onCancel,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callStatus, setCallStatus] = useState('Calling...');

  useEffect(() => {
    if (!isOpen) {
      setCallStatus('Calling...');
      return;
    }
    const timer = setTimeout(() => {
      setCallStatus('Ringing...');
    }, 2000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '52px 24px 48px',
        color: '#0f172a',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes mobileCallPulseLight {
          0% {
            transform: scale(0.96);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.35);
          }
          70% {
            transform: scale(1.03);
            box-shadow: 0 0 0 22px rgba(37, 99, 235, 0);
          }
          100% {
            transform: scale(0.96);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }
        @keyframes waveBarLight {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
      `}</style>

      {/* Top Header info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 12px',
            borderRadius: 20,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            fontSize: '0.66rem',
            color: '#2563eb',
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}
        >
          {callType === 'video' ? (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
          <span>{isChannel ? 'CHANNEL CALL' : callType === 'video' ? 'ENCRYPTED VIDEO CALL' : 'ENCRYPTED VOICE CALL'}</span>
        </div>

        <h2
          style={{
            margin: '8px 0 0',
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.3px',
          }}
        >
          {isChannel ? `#${targetName}` : targetName}
        </h2>

        {/* Audio Wave Visualizer & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {/* Animated Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 22 }}>
            {[0.1, 0.3, 0.2, 0.4].map((delay, idx) => (
              <span
                key={idx}
                style={{
                  width: 3,
                  backgroundColor: '#2563eb',
                  borderRadius: 2,
                  animation: `waveBarLight 1.2s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </div>

          <span
            style={{
              fontSize: '0.78rem',
              color: '#2563eb',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {callStatus}
          </span>
        </div>
      </div>

      {/* Center Pulsing Avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: isChannel
              ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 12px 32px rgba(37, 99, 235, 0.3)',
            animation: 'mobileCallPulseLight 2.2s infinite ease-in-out',
            border: '4px solid #ffffff',
            overflow: 'hidden',
          }}
        >
          {targetAvatar ? (
            <img
              src={resolveAvatarUrl(targetAvatar)}
              alt={targetName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : isChannel ? (
            '#'
          ) : (
            targetName.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
        }}
      >
        {/* Quick toggles (Microphone Mute, Speaker) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          {/* Mic Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label="Mute Microphone"
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: isMuted ? '#fee2e2' : '#f1f5f9',
              color: isMuted ? '#dc2626' : '#1e293b',
              border: isMuted ? '1px solid #fecaca' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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

          {/* Speaker / Audio Output Icon */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            title="Speaker"
            aria-label="Speaker"
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: isSpeaker ? '#eff6ff' : '#f1f5f9',
              color: isSpeaker ? '#2563eb' : '#1e293b',
              border: isSpeaker ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
        </div>

        {/* End Call / Cancel Button - Pure Icon Button */}
        <button
          onClick={onCancel}
          title="End Call"
          aria-label="End Call"
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
            transform: 'scale(1)',
          }}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            style={{ transform: 'rotate(135deg)' }}
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
export default MobileOutgoingCallModal;
