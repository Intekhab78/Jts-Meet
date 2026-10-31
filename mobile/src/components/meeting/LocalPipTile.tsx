import React from 'react';
import { MobileBgPreset } from './types';
import NetworkSignalIndicator from './NetworkSignalIndicator';
import { MobileAvatar } from '../common/MobileAvatar';

export interface LocalPipTileProps {
  isFullscreenShare: boolean;
  isDirectAudioCall: boolean;
  selfCorner: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'minimized';
  setSelfCorner: React.Dispatch<React.SetStateAction<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'minimized'>>;
  isLandscape: boolean;
  showControls: boolean;
  speakingUsers: Record<string, boolean>;
  isMuted: boolean;
  isVideoOff: boolean;
  facingMode: 'user' | 'environment';
  selectedBackgroundId: string;
  currentWallpaperUrl?: string | null;
  currentPreset?: MobileBgPreset;
  resolvedDisplayName: string;
  networkStatus: 'online' | 'reconnecting';
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  localStream: MediaStream | null;
}

export const LocalPipTile: React.FC<LocalPipTileProps> = ({
  isFullscreenShare,
  isDirectAudioCall,
  selfCorner,
  setSelfCorner,
  isLandscape,
  showControls,
  speakingUsers,
  isMuted,
  isVideoOff,
  facingMode,
  selectedBackgroundId,
  currentWallpaperUrl,
  currentPreset,
  resolvedDisplayName,
  networkStatus,
  localVideoRef,
  localStream,
}) => {
  if (isFullscreenShare || isDirectAudioCall) return null;

  return (
    <div
      onClick={() => {
        setSelfCorner((prev) => {
          if (prev === 'bottom-right') return 'top-right';
          if (prev === 'top-right') return 'top-left';
          if (prev === 'top-left') return 'bottom-left';
          if (prev === 'bottom-left') return 'minimized';
          return 'bottom-right';
        });
      }}
      title="Tap to move camera tile out of the way"
      style={{
        position: 'absolute',
        ...(selfCorner === 'bottom-right'
          ? { bottom: (isLandscape ? 16 : 84), right: 12 }
          : selfCorner === 'top-right'
          ? { top: 64, right: 12 }
          : selfCorner === 'top-left'
          ? { top: 64, left: 12 }
          : selfCorner === 'bottom-left'
          ? { bottom: (isLandscape ? 16 : 84), left: 12 }
          : { bottom: 84, right: 12, width: 40, height: 40, borderRadius: '50%' }),
        ...(selfCorner !== 'minimized' ? { width: 92, height: 132, borderRadius: 12 } : {}),
        backgroundColor: '#111827',
        border: (speakingUsers['local'] && !isMuted) ? '2.5px solid #3b82f6' : '2px solid rgba(255, 255, 255, 0.25)',
        boxShadow: (speakingUsers['local'] && !isMuted) ? '0 0 0 2px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.65)' : '0 8px 24px rgba(0, 0, 0, 0.55)',
        zIndex: 25,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        opacity: (!showControls && isLandscape) ? 0 : 1,
        pointerEvents: (!showControls && isLandscape) ? 'none' : 'auto',
      }}
    >
      {selfCorner === 'minimized' ? (
        <MobileAvatar
          name={resolvedDisplayName}
          size={40}
        />
      ) : (
        <>
          <video
            ref={(el) => {
              if (localVideoRef) {
                (localVideoRef as any).current = el;
              }
              if (el && localStream && el.srcObject !== localStream) {
                el.srcObject = localStream;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: (facingMode === 'user' && localStorage.getItem('jts_pref_mirror_video') !== 'false') ? 'scaleX(-1)' : 'none',
              filter: selectedBackgroundId === 'blur_heavy'
                ? 'contrast(1.08) brightness(1.03) saturate(1.05)'
                : selectedBackgroundId === 'blur_light'
                ? 'contrast(1.04) brightness(1.02)'
                : 'none',
              display: isVideoOff ? 'none' : 'block',
            }}
          />
          {/* Active Wallpaper Backdrop if video is off or backdrop is active */}
          {currentWallpaperUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${currentWallpaperUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: isVideoOff ? 0.9 : 0.25,
                pointerEvents: 'none',
              }}
            />
          )}
          {isVideoOff && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'linear-gradient(135deg, #1e2030 0%, #12141f 100%)',
                color: '#94a3b8',
                fontSize: '0.68rem',
                fontWeight: 600,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2}>
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <span>Camera Off</span>
            </div>
          )}
          {isMuted && (
            <div
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                padding: 3,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
              }}
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              </svg>
            </div>
          )}

          {/* Local Name Badge & Signal */}
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              padding: '2px 5px',
              borderRadius: 6,
              background: (speakingUsers['local'] && !isMuted) ? 'rgba(37, 99, 235, 0.9)' : 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              border: (speakingUsers['local'] && !isMuted) ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {(speakingUsers['local'] && !isMuted) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, height: 8 }}>
                <span style={{ width: 1.5, height: 6, background: '#93c5fd', borderRadius: 0.5, animation: 'soundWave 0.6s infinite ease-in-out' }} />
                <span style={{ width: 1.5, height: 8, background: '#93c5fd', borderRadius: 0.5, animation: 'soundWave 0.8s infinite ease-in-out 0.2s' }} />
                <span style={{ width: 1.5, height: 5, background: '#93c5fd', borderRadius: 0.5, animation: 'soundWave 0.5s infinite ease-in-out 0.4s' }} />
              </span>
            )}
            <span>You</span>
            <NetworkSignalIndicator isPoor={networkStatus === 'reconnecting'} />
          </div>

          {selectedBackgroundId !== 'none' && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                padding: '1px 5px',
                borderRadius: 4,
                backgroundColor: 'rgba(37, 99, 235, 0.9)',
                color: '#ffffff',
                fontSize: '0.52rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {currentPreset?.title || 'EFFECT'}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LocalPipTile;
