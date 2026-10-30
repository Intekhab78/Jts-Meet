import React from 'react';
import { MobileBgPreset } from '../types';

export interface MoreOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  facingMode: 'user' | 'environment';
  flipCamera: () => void;
  audioRoute: 'speaker' | 'bluetooth' | 'earpiece';
  bluetoothDeviceName: string | null;
  cycleAudioRoute: () => void;
  isSharingMyScreen: boolean;
  startPhoneScreenShare: () => void;
  stopPhoneScreenShare: () => void;
  onMinimize?: () => void;
  selectedBackgroundId: string;
  currentPreset?: MobileBgPreset;
  onOpenVirtualBackground: () => void;
  isNoiseShieldActive: boolean;
  onToggleNoiseShield: () => void;
  onOpenInvite: () => void;
  isHost: boolean;
  onHostMuteAll: () => void;
  isRoomLocked: boolean;
  onHostToggleLock: () => void;
}

export const MoreOptionsSheet: React.FC<MoreOptionsSheetProps> = ({
  isOpen,
  onClose,
  facingMode,
  flipCamera,
  audioRoute,
  bluetoothDeviceName,
  cycleAudioRoute,
  isSharingMyScreen,
  startPhoneScreenShare,
  stopPhoneScreenShare,
  onMinimize,
  selectedBackgroundId,
  currentPreset,
  onOpenVirtualBackground,
  isNoiseShieldActive,
  onToggleNoiseShield,
  onOpenInvite,
  isHost,
  onHostMuteAll,
  isRoomLocked,
  onHostToggleLock,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: '16px 18px calc(var(--safe-bottom) + 16px) 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
          maxHeight: '85%',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Meeting Controls
            </span>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              Audio routing, presentation & meeting options
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, color: '#64748b', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Grid of Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Flip Camera */}
          <button
            onClick={() => {
              flipCamera();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </div>
            <div>
              <div>Flip Camera</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                {facingMode === 'user' ? 'Front' : 'Back'}
              </div>
            </div>
          </button>

          {/* Audio Route: Speaker vs Bluetooth vs Earpiece */}
          <button
            onClick={cycleAudioRoute}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: audioRoute === 'bluetooth' ? '#f0fdf4' : audioRoute === 'speaker' ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${audioRoute === 'bluetooth' ? '#86efac' : audioRoute === 'speaker' ? '#bfdbfe' : '#e2e8f0'}`,
              color: audioRoute === 'bluetooth' ? '#166534' : audioRoute === 'speaker' ? '#1d4ed8' : '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: audioRoute === 'bluetooth' ? '#dcfce7' : audioRoute === 'speaker' ? '#dbeafe' : '#f1f5f9',
              color: audioRoute === 'bluetooth' ? '#15803d' : audioRoute === 'speaker' ? '#2563eb' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {audioRoute === 'bluetooth' ? (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m7 7 10 10-5 5V2l5 5L7 17" />
                </svg>
              ) : audioRoute === 'speaker' ? (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </div>
            <div>
              <div>Audio Output</div>
              <div style={{
                fontSize: '0.68rem',
                color: audioRoute === 'bluetooth' ? '#15803d' : audioRoute === 'speaker' ? '#2563eb' : '#64748b',
                fontWeight: 600,
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {audioRoute === 'bluetooth' ? (bluetoothDeviceName || 'Bluetooth Connected') : audioRoute === 'speaker' ? 'Speakerphone' : 'Earpiece'}
              </div>
            </div>
          </button>

          {/* Mobile Screen Share */}
          <button
            onClick={() => {
              if (isSharingMyScreen) {
                stopPhoneScreenShare();
                onClose();
              } else {
                startPhoneScreenShare();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: isSharingMyScreen ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${isSharingMyScreen ? '#fecaca' : '#e2e8f0'}`,
              color: isSharingMyScreen ? '#dc2626' : '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isSharingMyScreen ? '#fee2e2' : '#eff6ff', color: isSharingMyScreen ? '#dc2626' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <div>{isSharingMyScreen ? 'Stop Sharing' : 'Share Screen'}</div>
              <div style={{ fontSize: '0.68rem', color: isSharingMyScreen ? '#dc2626' : '#64748b', fontWeight: 500 }}>
                {isSharingMyScreen ? 'Active now' : 'Present your phone screen'}
              </div>
            </div>
          </button>

          {/* Minimize to PiP */}
          <button
            onClick={() => {
              onClose();
              onMinimize?.();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="12" y="12" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
            <div>
              <div>Minimize (PiP)</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                Keep in corner
              </div>
            </div>
          </button>

          {/* Virtual Background & Studio Wallpapers */}
          <button
            onClick={onOpenVirtualBackground}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: selectedBackgroundId !== 'none' ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${selectedBackgroundId !== 'none' ? '#93c5fd' : '#e2e8f0'}`,
              color: selectedBackgroundId !== 'none' ? '#1d4ed8' : '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: selectedBackgroundId !== 'none' ? '#dbeafe' : '#f1f5f9', color: selectedBackgroundId !== 'none' ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <div>Virtual Background</div>
              <div style={{ fontSize: '0.68rem', color: selectedBackgroundId !== 'none' ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                {selectedBackgroundId === 'none' ? 'Office, Library & Blur' : (currentPreset?.title || 'Applied')}
              </div>
            </div>
          </button>

          {/* Noise Shield / Voice Isolation */}
          <button
            onClick={onToggleNoiseShield}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: isNoiseShieldActive ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${isNoiseShieldActive ? '#a7f3d0' : '#e2e8f0'}`,
              color: isNoiseShieldActive ? '#065f46' : '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isNoiseShieldActive ? '#d1fae5' : '#f1f5f9', color: isNoiseShieldActive ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <div>Voice Shield</div>
              <div style={{ fontSize: '0.68rem', color: isNoiseShieldActive ? '#059669' : '#64748b', fontWeight: 600 }}>
                {isNoiseShieldActive ? 'Active (Noise Isolated)' : 'Standard Mic'}
              </div>
            </div>
          </button>
        </div>

        {/* Invite Button Shortcut */}
        <button
          onClick={onOpenInvite}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 14,
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Invite Participants (WhatsApp / Copy Link)
        </button>

        {/* Host Section - Only shown to Host */}
        {isHost && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Host Controls
              </span>
              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                You are Host
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Mute All */}
              <button
                onClick={onHostMuteAll}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                </svg>
                Mute Everyone
              </button>

              {/* Lock Room */}
              <button
                onClick={onHostToggleLock}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: isRoomLocked ? '#fef3c7' : '#f1f5f9',
                  border: `1px solid ${isRoomLocked ? '#fde68a' : '#cbd5e1'}`,
                  color: isRoomLocked ? '#b45309' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                {isRoomLocked ? (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Room Locked
                  </>
                ) : (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                    Lock Meeting
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoreOptionsSheet;
