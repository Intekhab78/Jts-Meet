import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RemoteParticipant } from './types';
import { MobileAvatar } from '../common/MobileAvatar';

export interface ScreenShareStageProps {
  presenter?: RemoteParticipant;
  presenterStream: MediaStream | null;
  isLandscape: boolean;
  isFullscreenShare: boolean;
  showControls: boolean;
  resetControlsTimer: () => void;
  videoFit: 'contain' | 'cover';
  setVideoFit: React.Dispatch<React.SetStateAction<'contain' | 'cover'>>;
  setIsFullscreenShare: React.Dispatch<React.SetStateAction<boolean>>;
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>;
  focusedUserId: string | null;
  setFocusedUserId: (id: string | null) => void;
  participants: RemoteParticipant[];
}

export const ScreenShareStage: React.FC<ScreenShareStageProps> = ({
  presenter,
  presenterStream,
  isLandscape,
  isFullscreenShare,
  showControls,
  resetControlsTimer,
  videoFit,
  setVideoFit,
  setIsFullscreenShare,
  setShowControls,
  focusedUserId,
  setFocusedUserId,
  participants,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ── Pinch to Zoom & Pan State for Mobile Screen Share ──
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsZooming(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = zoomScale;
      setIsZooming(true);
    } else if (e.touches.length === 1) {
      lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        if (zoomScale > 1.2) {
          resetZoom();
        } else {
          setZoomScale(2.2);
          setPanOffset({ x: 0, y: 0 });
        }
      }
      lastTapTimeRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.min(Math.max(touchStartScaleRef.current * factor, 1), 4);
      setZoomScale(newScale);
      if (newScale <= 1.02) {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && zoomScale > 1.1 && lastTouchPosRef.current) {
      const dx = e.touches[0].clientX - lastTouchPosRef.current.x;
      const dy = e.touches[0].clientY - lastTouchPosRef.current.y;
      lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      const cWidth = containerRef.current?.clientWidth || 360;
      const cHeight = containerRef.current?.clientHeight || 640;
      const maxPanX = (cWidth * (zoomScale - 1)) / 2;
      const maxPanY = (cHeight * (zoomScale - 1)) / 2;

      setPanOffset((prev) => ({
        x: Math.min(Math.max(prev.x + dx, -maxPanX), maxPanX),
        y: Math.min(Math.max(prev.y + dy, -maxPanY), maxPanY),
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = null;
      setIsZooming(false);
    }
    if (e.touches.length === 0) {
      lastTouchPosRef.current = null;
      if (zoomScale <= 1.05) {
        resetZoom();
      }
    }
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !presenterStream) return;

    if (el.srcObject !== presenterStream) {
      el.srcObject = presenterStream;
    }
    el.play().catch(() => {});

    const handleUpdate = () => {
      if (el && el.srcObject !== presenterStream) {
        el.srcObject = presenterStream;
      }
      el?.play().catch(() => {});
    };

    presenterStream.addEventListener('addtrack', handleUpdate);
    presenterStream.addEventListener('removetrack', handleUpdate);
    presenterStream.getVideoTracks().forEach(t => {
      t.addEventListener('unmute', handleUpdate);
    });

    const watchdog = setInterval(() => {
      if (el && el.paused && presenterStream.getVideoTracks().length > 0) {
        el.play().catch(() => {});
      }
    }, 800);

    return () => {
      clearInterval(watchdog);
      presenterStream.removeEventListener('addtrack', handleUpdate);
      presenterStream.removeEventListener('removetrack', handleUpdate);
      presenterStream.getVideoTracks().forEach(t => {
        t.removeEventListener('unmute', handleUpdate);
      });
    };
  }, [presenterStream]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Top-Left Presenter Badge (Safe from notch/status bar) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          resetControlsTimer();
        }}
        style={{
          position: 'absolute',
          top: (isLandscape || isFullscreenShare)
            ? (showControls ? 'calc(var(--safe-top, 28px) + 54px)' : 'calc(var(--safe-top, 28px) + 12px)')
            : 'calc(var(--safe-top, 28px) + 10px)',
          left: 12,
          zIndex: 35,
          padding: '6px 12px',
          borderRadius: 20,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          color: '#60a5fa',
          fontSize: '0.74rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: '1px solid rgba(59, 130, 246, 0.35)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0.5 : 1,
          pointerEvents: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          maxWidth: '55%',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ flexShrink: 0 }}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {presenter?.displayName || 'Someone'}'s Screen
        </span>
      </div>

      {/* Top-Right Floating Controls (PURE ICONS, ALWAYS ACCESSIBLE & SAFE FROM STATUS BAR) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: (isLandscape || isFullscreenShare)
            ? (showControls ? 'calc(var(--safe-top, 28px) + 54px)' : 'calc(var(--safe-top, 28px) + 12px)')
            : 'calc(var(--safe-top, 28px) + 10px)',
          right: 12,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 6px',
          borderRadius: 24,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'opacity 0.25s ease, top 0.25s ease',
          opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0.65 : 1,
          pointerEvents: 'auto',
        }}
      >
        {/* Aspect Ratio Fit / Fill Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'));
            resetControlsTimer();
          }}
          title={videoFit === 'contain' ? 'Crop to Fill' : 'Fit to Screen'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: videoFit === 'cover' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            {videoFit === 'contain' ? (
              <path d="M7 12h10M12 9l3 3-3 3" />
            ) : (
              <path d="M12 8v8M9 11l3-3 3 3" />
            )}
          </svg>
        </button>

        {/* Fullscreen Expand / Compress Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreenShare((prev) => !prev);
            resetControlsTimer();
          }}
          title={isFullscreenShare ? 'Exit Full Screen' : 'Full Screen'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: isFullscreenShare ? '#2563eb' : 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isFullscreenShare ? '1.5px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: isFullscreenShare ? '0 0 12px rgba(37, 99, 235, 0.6)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            {isFullscreenShare ? (
              <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
            ) : (
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            )}
          </svg>
        </button>

        {/* Unpin Presenter Button if user pinned */}
        {focusedUserId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFocusedUserId(null);
              resetControlsTimer();
            }}
            title="Unpin"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.85)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              cursor: 'pointer',
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="2" y1="2" x2="22" y2="22" />
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-2l-2-3V9" />
              <path d="M9 3h6a2 2 0 0 1 2 2v4" />
            </svg>
          </button>
        )}
      </div>

      {/* Floating Zoom Level & Tap to Reset Badge */}
      {zoomScale > 1.08 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          style={{
            position: 'absolute',
            top: (isLandscape || isFullscreenShare)
              ? (showControls ? 'calc(var(--safe-top, 28px) + 54px)' : 'calc(var(--safe-top, 28px) + 12px)')
              : 'calc(var(--safe-top, 28px) + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'rgba(37, 99, 235, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
        >
          <span>🔍 {zoomScale.toFixed(1)}x • Tap to Reset</span>
        </div>
      )}

      {/* Screen Video Element with Pinch-to-Zoom & Pan Gesture */}
      <div
        ref={containerRef}
        onClick={() => {
          if (zoomScale <= 1.08 && (isLandscape || isFullscreenShare)) {
            setShowControls((prev) => !prev);
            resetControlsTimer();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          cursor: zoomScale > 1.1 ? 'grab' : 'pointer',
          overflow: 'hidden',
          position: 'relative',
          touchAction: zoomScale > 1.08 ? 'none' : 'auto',
        }}
      >
        {presenterStream ? (
          <video
            autoPlay
            playsInline
            muted
            ref={(el) => {
              videoRef.current = el;
              if (el && presenterStream && el.srcObject !== presenterStream) {
                el.srcObject = presenterStream;
                el.play().catch(() => {});
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: videoFit,
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: isZooming ? 'none' : 'transform 0.16s cubic-bezier(0.2, 0, 0, 1)',
              willChange: 'transform',
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}>
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span style={{ fontSize: '0.85rem' }}>Loading {presenter?.displayName || 'screen'}...</span>
          </div>
        )}
      </div>

      {/* Bottom thumbnail strip of meeting participants (Hidden during Full Screen mode for 100% full view) */}
      {!isFullscreenShare && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            display: 'flex',
            gap: 8,
            zIndex: 20,
            overflowX: 'auto',
            paddingBottom: 4,
            transition: 'opacity 0.3s ease',
            opacity: (!showControls && isLandscape) ? 0 : 1,
            pointerEvents: (!showControls && isLandscape) ? 'none' : 'auto',
          }}
        >
          {participants.map((p) => (
            <div
              key={p.userId}
              style={{
                width: 72,
                height: 90,
                borderRadius: 10,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                flexShrink: 0,
              }}
            >
              <MobileAvatar
                name={p.displayName}
                size={34}
              />
              <span style={{ fontSize: '0.62rem', color: '#fff', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64 }}>
                {p.displayName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
