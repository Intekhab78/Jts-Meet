import React, { useState, useRef, useEffect } from 'react';
import { RemoteParticipant } from './types';
import { MobileAvatar } from '../common/MobileAvatar';

export interface PipModeOverlayProps {
  isMinimized: boolean;
  isNativePip: boolean;
  onMaximize?: () => void;
  onLeave: () => void;
  timer: string;
  displayName: string;
  peerName?: string;
  peerAvatar?: string | null;
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
  peerName,
  peerAvatar,
  presenterStream,
  remoteStreams,
  localStream,
  participants,
  screenSharingUserId,
  screenStream,
}) => {
  // ── PICTURE IN PICTURE MINI-CARD VIEW ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isActivelyDragging, setIsActivelyDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });

  // Floating coordinates on screen
  const CARD_WIDTH = 148;
  const CARD_HEIGHT = 214;
  const PILL_WIDTH = 168;
  const PILL_HEIGHT = 44;

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 640;
    return {
      x: Math.max(12, screenW - CARD_WIDTH - 12),
      y: Math.max(56, screenH - CARD_HEIGHT - 82),
    };
  });

  // Ensure position stays within boundaries if screen resizes or mode toggles
  useEffect(() => {
    const curW = isCollapsed ? PILL_WIDTH : CARD_WIDTH;
    const curH = isCollapsed ? PILL_HEIGHT : CARD_HEIGHT;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    setPos((prev) => ({
      x: Math.min(Math.max(8, prev.x), Math.max(8, screenW - curW - 8)),
      y: Math.min(Math.max(50, prev.y), Math.max(50, screenH - curH - 74)),
    }));
  }, [isCollapsed]);

  // Touch and Pointer Drag Gestures
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    touchStartRef.current = {
      x: clientX,
      y: clientY,
      posX: pos.x,
      posY: pos.y,
    };
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current.x) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;

    if (Math.hypot(deltaX, deltaY) > 6) {
      isDraggingRef.current = true;
      setIsActivelyDragging(true);
    }

    if (isDraggingRef.current) {
      const curW = isCollapsed ? PILL_WIDTH : CARD_WIDTH;
      const curH = isCollapsed ? PILL_HEIGHT : CARD_HEIGHT;
      const minX = 8;
      const maxX = Math.max(8, window.innerWidth - curW - 8);
      const minY = 50;
      const maxY = Math.max(50, window.innerHeight - curH - 74);

      const nextX = Math.min(Math.max(minX, touchStartRef.current.posX + deltaX), maxX);
      const nextY = Math.min(Math.max(minY, touchStartRef.current.posY + deltaY), maxY);

      setPos({ x: nextX, y: nextY });
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      const curW = isCollapsed ? PILL_WIDTH : CARD_WIDTH;
      const midPoint = window.innerWidth / 2;
      const snapLeft = 10;
      const snapRight = Math.max(10, window.innerWidth - curW - 10);

      // Snap to nearest horizontal edge smoothly
      const finalX = (pos.x + curW / 2 < midPoint) ? snapLeft : snapRight;
      setPos((prev) => ({ ...prev, x: finalX }));

      setTimeout(() => {
        isDraggingRef.current = false;
        setIsActivelyDragging(false);
      }, 70);
    } else {
      setIsActivelyDragging(false);
    }
    touchStartRef.current = { x: 0, y: 0, posX: 0, posY: 0 };
  };

  if (isMinimized) {
    const activePipStream = presenterStream || Object.values(remoteStreams)[0] || localStream;
    const effectiveTitle = peerName || displayName || 'Call';

    const hasLiveVideoTrack = Boolean(
      activePipStream &&
      activePipStream.getVideoTracks().some(track => track.enabled && track.readyState === 'live')
    );

    // ── COLLAPSED / HIDDEN COMPACT FLOATING PILL ──
    if (isCollapsed) {
      return (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onClick={() => {
            if (!isDraggingRef.current) {
              setIsCollapsed(false);
            }
          }}
          title="Drag anywhere or tap to expand call card"
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            width: PILL_WIDTH,
            height: PILL_HEIGHT,
            borderRadius: 22,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65), 0 0 0 1.5px rgba(59, 130, 246, 0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 4px 10px',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
            transition: isActivelyDragging ? 'none' : 'left 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), top 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
          }}
        >
          {/* Pulsing Call Dot & Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                animation: 'pulse 1.8s infinite',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 64,
                }}
              >
                {effectiveTitle}
              </span>
              <span style={{ fontSize: '0.62rem', color: '#60a5fa', fontWeight: 600 }}>
                {timer}
              </span>
            </div>
          </div>

          {/* Action buttons on pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(false);
              }}
              title="Expand to Card"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    // ── FULL FLOATING CARD VIEW (DRAGGABLE & COLLAPSIBLE) ──
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onClick={() => {
          if (!isDraggingRef.current) {
            onMaximize?.();
          }
        }}
        title="Drag anywhere or tap to maximize"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 16,
          backgroundColor: '#090d16',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 0 2px #2563eb',
          zIndex: 99999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
          transition: isActivelyDragging ? 'none' : 'left 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), top 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
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
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.3) 70%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 6px #22c55e',
              }}
            />
            <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 800 }}>
              {timer}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* Hide / Collapse to Pill Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              title="Hide to floating pill"
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {/* Maximize to full meeting */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMaximize?.();
              }}
              title="Expand Meeting"
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            {/* Leave / End call button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeave();
              }}
              title="Leave Call"
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mini Video Feed or Audio Avatar Fallback */}
        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', position: 'relative' }}>
          {hasLiveVideoTrack ? (
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '24px 8px 8px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    border: '2px solid rgba(59, 130, 246, 0.4)',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <MobileAvatar
                  name={effectiveTitle}
                  src={peerAvatar}
                  size={52}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {effectiveTitle}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#38bdf8', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  <span>In Call</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Keep audio tracks alive in mini PiP mode (Always in layout tree, off-screen) */}
        <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}>
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

        {/* Keep remote audio streams playing in native PiP (Always in layout tree, off-screen) */}
        <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}>
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
