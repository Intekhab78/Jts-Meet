import React from 'react';
import { ReactionItem } from './types';

export interface ReactionsOverlayProps {
  reactions: ReactionItem[];
  showReactionsBar: boolean;
  showControls: boolean;
  isLandscape: boolean;
  isFullscreenShare: boolean;
  onSendReaction: (emoji: string) => void;
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({
  reactions,
  showReactionsBar,
  showControls,
  isLandscape,
  isFullscreenShare,
  onSendReaction,
}) => {
  return (
    <>
      {/* ── Floating Emoji Reactions Overlay ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 80,
        }}
      >
        {reactions.map((r) => (
          <div
            key={r.id}
            className="floating-reaction"
            style={{
              position: 'absolute',
              bottom: 90,
              left: `${r.leftPercent ?? r.left ?? 50}%`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'floatUpAndFade 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            }}
          >
            <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.45))' }}>
              {r.emoji}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: 8,
                marginTop: 2,
                fontWeight: 700,
                backdropFilter: 'blur(4px)',
              }}
            >
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* ── Quick Reactions Float Bar (Above Bottom Controls) ── */}
      {showReactionsBar && showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: (isLandscape || isFullscreenShare) ? 'calc(var(--safe-bottom) + 60px)' : 'calc(var(--safe-bottom) + 72px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 30,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65)',
            zIndex: 40,
          }}
        >
          {['👍', '❤️', '👏', '🎉', '😂', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              style={{
                fontSize: '1.35rem',
                padding: '3px 6px',
                borderRadius: 8,
                transition: 'transform 0.15s ease',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
