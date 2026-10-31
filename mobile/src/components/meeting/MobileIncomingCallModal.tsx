import React, { useEffect, useRef } from 'react';
import { mobileNotificationService } from '../../services/mobileNotificationService';
import { resolveAvatarUrl } from '../../config';
import { MobileAvatar } from '../common/MobileAvatar';

export interface IncomingCallData {
  callerName: string;
  callerId?: string;
  meetingId: string;
  callType?: 'audio' | 'video';
  callerAvatar?: string;
}

interface MobileIncomingCallModalProps {
  call: IncomingCallData | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const MobileIncomingCallModal: React.FC<MobileIncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!call) {
      stopRingtone();
      return;
    }

    // 1. Notify system and trigger mobile vibration
    mobileNotificationService.notifyIncomingCall(call);

    // 2. Play synthesized soft modern chime ringtone
    startRingtone();

    return () => {
      stopRingtone();
      mobileNotificationService.stopCallVibration();
    };
  }, [call]);

  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const playChime = () => {
        try {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;

          const playTone = (freq: number, time: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

            gain.gain.setValueAtTime(0, ctx.currentTime + time);
            gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + duration);
          };

          // Pleasant Enterprise 2-tone melodic chime
          playTone(440, 0, 0.4);
          playTone(554.37, 0.15, 0.6);
          playTone(659.25, 0.35, 0.8);
        } catch (_) {}
      };

      playChime();
      ringIntervalRef.current = setInterval(playChime, 2500);
    } catch (_) {}
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
  };

  if (!call) return null;

  const initial = call.callerName ? call.callerName.charAt(0).toUpperCase() : 'C';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 'calc(var(--safe-top, 24px) + 36px)',
        paddingBottom: 'calc(var(--safe-bottom, 20px) + 36px)',
        paddingLeft: 24,
        paddingRight: 24,
        color: '#0f172a',
        animation: 'fadeIn 0.25s ease-out',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes incomingPulseRing {
          0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28); }
          70% { transform: scale(1.04); box-shadow: 0 0 0 22px rgba(37, 99, 235, 0); }
          100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>

      {/* ── Top Header: Call Type & Security Pill ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 20,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#2563eb',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              boxShadow: '0 0 8px #2563eb',
              display: 'inline-block',
            }}
          />
          Incoming {call.callType === 'video' ? 'Video Conference' : 'HD Audio Call'}
        </div>

        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          JTS Meet Enterprise Direct Line
        </span>
      </div>

      {/* ── Center: Pulsating Caller Avatar & Identity ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Pulsating Glowing Ring Container */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: '50%',
            animation: 'incomingPulseRing 2s infinite ease-in-out',
          }}
        >
          <MobileAvatar
            src={call.callerAvatar}
            name={call.callerName}
            size={104}
            border="3px solid #ffffff"
          />
        </div>

        {/* Caller Name & Meeting Info */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {call.callerName}
          </h1>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Meeting Code: {call.meetingId}
          </span>
          <span style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 700, marginTop: 4 }}>
            Ringing...
          </span>
        </div>
      </div>

      {/* ── Bottom: Native Call Action Buttons (WhatsApp / iOS Style) ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 24,
        }}
      >
        {/* Decline Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => {
              stopRingtone();
              mobileNotificationService.stopCallVibration();
              onDecline();
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)',
              transition: 'transform 0.15s ease',
            }}
            aria-label="Decline Call"
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ef4444' }}>
            Decline
          </span>
        </div>

        {/* Accept Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => {
              stopRingtone();
              mobileNotificationService.stopCallVibration();
              onAccept();
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.45)',
              transition: 'transform 0.15s ease',
            }}
            aria-label="Accept Call"
          >
            {call.callType === 'video' ? (
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            )}
          </button>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a' }}>
            Accept
          </span>
        </div>
      </div>
    </div>
  );
};

export default MobileIncomingCallModal;
