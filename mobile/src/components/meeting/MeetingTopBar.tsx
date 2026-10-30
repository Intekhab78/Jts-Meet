import React from 'react';

export interface MeetingTopBarProps {
  meetingId: string;
  timer: string;
  isLandscape: boolean;
  isFullscreenShare: boolean;
  showControls: boolean;
  audioRoute: 'speaker' | 'bluetooth' | 'earpiece';
  bluetoothDeviceName: string | null;
  cycleAudioRoute: () => void;
  flipCamera: () => void;
  onMinimize?: () => void;
  onLeaveClick: () => void;
  resetControlsTimer: () => void;
}

export const MeetingTopBar: React.FC<MeetingTopBarProps> = ({
  meetingId,
  timer,
  isLandscape,
  isFullscreenShare,
  showControls,
  audioRoute,
  bluetoothDeviceName,
  cycleAudioRoute,
  flipCamera,
  onMinimize,
  onLeaveClick,
  resetControlsTimer,
}) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        resetControlsTimer();
      }}
      style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        paddingBottom: 10,
        paddingLeft: 12,
        paddingRight: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 35,
        position: (isLandscape || isFullscreenShare) ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        transform: (!showControls && (isLandscape || isFullscreenShare)) ? 'translateY(-100%)' : 'translateY(0)',
        opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0 : 1,
        pointerEvents: (!showControls && (isLandscape || isFullscreenShare)) ? 'none' : 'auto',
      }}
    >
      {/* Left: Minimize (PiP) + Native Floating PiP + Speaker + Flip Camera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Minimize into in-app mini card */}
        <button
          onClick={onMinimize}
          title="Minimize to In-App Card"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Native Android PiP (Floating Window over other apps) */}
        <button
          onClick={() => {
            if ((window as any).MobileAppBridge?.enterPipMode) {
              (window as any).MobileAppBridge.enterPipMode();
            } else if (onMinimize) {
              onMinimize();
            }
          }}
          title="Floating Window (Android PiP)"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <rect x="11" y="9" width="9" height="6" rx="1" ry="1" fill="currentColor" fillOpacity="0.4" />
          </svg>
        </button>

        {/* Audio output routing (Speaker / Bluetooth / Earpiece) */}
        <button
          onClick={cycleAudioRoute}
          title={audioRoute === 'bluetooth' ? (bluetoothDeviceName || 'Bluetooth') : audioRoute === 'speaker' ? 'Speakerphone' : 'Earpiece'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: audioRoute === 'bluetooth' ? 'rgba(34, 197, 94, 0.25)' : audioRoute === 'speaker' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.12)',
            color: audioRoute === 'bluetooth' ? '#4ade80' : audioRoute === 'speaker' ? '#38bdf8' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
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

        {/* Flip camera */}
        <button
          onClick={flipCamera}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.008.74 3.843 1.967 5.25L4 17h5v-5l-1.84 1.84C6.34 12.67 6 11.38 6 10c0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.38-.34 2.67-1.16 3.84L15 12v5h5l-1.967-1.75C19.26 13.843 20 12.008 20 10z" />
          </svg>
        </button>
      </div>

      {/* Center: Meeting Code & Call Duration */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meetingId}
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
          {timer}
        </span>
      </div>

      {/* Right: Leave Button with Accidental Tap Protection */}
      <button
        onClick={onLeaveClick}
        style={{
          padding: '6px 14px',
          borderRadius: 16,
          backgroundColor: '#ef4444',
          color: '#ffffff',
          fontSize: '0.78rem',
          fontWeight: 800,
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Leave
      </button>
    </div>
  );
};

export default MeetingTopBar;
