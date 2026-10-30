import React from 'react';

export interface MeetingControlsBarProps {
  isMuted: boolean;
  toggleMute: () => void;
  isVideoOff: boolean;
  toggleVideo: () => void;
  showReactionsBar: boolean;
  setShowReactionsBar: React.Dispatch<React.SetStateAction<boolean>>;
  isHandRaised: boolean;
  toggleHand: () => void;
  activeSheet: string;
  setActiveSheet: (sheet: 'none' | 'chat' | 'participants' | 'invite' | 'more' | 'virtual_background') => void;
  unreadChatCount: number;
  participantsCount: number;
  isLandscape: boolean;
  isFullscreenShare: boolean;
  showControls: boolean;
  resetControlsTimer: () => void;
}

export const MeetingControlsBar: React.FC<MeetingControlsBarProps> = ({
  isMuted,
  toggleMute,
  isVideoOff,
  toggleVideo,
  showReactionsBar,
  setShowReactionsBar,
  isHandRaised,
  toggleHand,
  activeSheet,
  setActiveSheet,
  unreadChatCount,
  participantsCount,
  isLandscape,
  isFullscreenShare,
  showControls,
  resetControlsTimer,
}) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        resetControlsTimer();
      }}
      style={{
        paddingTop: 8,
        paddingBottom: 'calc(var(--safe-bottom) + 8px)',
        paddingLeft: 8,
        paddingRight: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 6,
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 35,
        overflowX: 'auto',
        position: (isLandscape || isFullscreenShare) ? 'absolute' : 'relative',
        bottom: 0,
        left: 0,
        right: 0,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        transform: (!showControls && (isLandscape || isFullscreenShare)) ? 'translateY(100%)' : 'translateY(0)',
        opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0 : 1,
        pointerEvents: (!showControls && (isLandscape || isFullscreenShare)) ? 'none' : 'auto',
      }}
    >
      {/* Mic */}
      <button
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: isMuted ? '#ef4444' : '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
          boxShadow: isMuted ? '0 3px 10px rgba(239, 68, 68, 0.4)' : 'none',
        }}
      >
        {isMuted ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      {/* Video */}
      <button
        onClick={toggleVideo}
        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: isVideoOff ? '#ef4444' : '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
          boxShadow: isVideoOff ? '0 3px 10px rgba(239, 68, 68, 0.4)' : 'none',
        }}
      >
        {isVideoOff ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        )}
      </button>

      {/* Emoji Reactions */}
      <button
        onClick={() => setShowReactionsBar((prev) => !prev)}
        title="Send Reaction"
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: showReactionsBar ? '#3b82f6' : '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {/* Raise Hand */}
      <button
        onClick={toggleHand}
        title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: isHandRaised ? '#f59e0b' : '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
          boxShadow: isHandRaised ? '0 3px 10px rgba(245, 158, 11, 0.4)' : 'none',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      </button>

      {/* Chat with Unread Notification Badge */}
      <button
        onClick={() => {
          setActiveSheet('chat');
        }}
        title="Chat"
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: activeSheet === 'chat' ? '#2563eb' : '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unreadChatCount > 0 && activeSheet !== 'chat' && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.6)',
            }}
          >
            {unreadChatCount}
          </span>
        )}
      </button>

      {/* Participants (shows live count) */}
      <button
        onClick={() => setActiveSheet('participants')}
        title="Participants"
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '0.62rem',
            fontWeight: 800,
            width: 17,
            height: 17,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {participantsCount}
        </span>
      </button>

      {/* More Actions (Host Controls, Audio, Settings) */}
      <button
        onClick={() => setActiveSheet('more')}
        title="More Options"
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: activeSheet === 'more' ? '#3b82f6' : '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </div>
  );
};

export default MeetingControlsBar;
