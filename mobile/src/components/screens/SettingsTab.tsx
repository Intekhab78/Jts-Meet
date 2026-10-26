import React, { useState } from 'react';

interface SettingsTabProps {
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  onLogout,
  onOpenAuth,
}) => {
  const [muteOnJoin, setMuteOnJoin] = useState(false);
  const [videoOffOnJoin, setVideoOffOnJoin] = useState(false);
  const [mirrorVideo, setMirrorVideo] = useState(true);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        backgroundColor: '#ffffff',
      }}
    >
      {/* User Profile Card */}
      {user ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
              {user.name || 'JTS User'}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {user.email || 'user@example.com'}
            </span>
            <span
              style={{
                alignSelf: 'flex-start',
                marginTop: 2,
                padding: '2px 8px',
                borderRadius: 10,
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              PRO Member
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          }}
        >
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
            Sign In to JTS Meet
          </span>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Sync your scheduled meetings, contacts, and personal preferences across all devices.
          </span>
          <button
            onClick={onOpenAuth}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              width: '100%',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Meeting Preferences Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Meeting Preferences
        </span>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Mute on join */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 500 }}>
              Always Mute My Microphone
            </span>
            <input
              type="checkbox"
              checked={muteOnJoin}
              onChange={(e) => setMuteOnJoin(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: '#2563eb' }}
            />
          </div>

          {/* Video off on join */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 500 }}>
              Always Turn Off My Camera
            </span>
            <input
              type="checkbox"
              checked={videoOffOnJoin}
              onChange={(e) => setVideoOffOnJoin(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: '#2563eb' }}
            />
          </div>

          {/* Mirror video */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 500 }}>
              Mirror My Video
            </span>
            <input
              type="checkbox"
              checked={mirrorVideo}
              onChange={(e) => setMirrorVideo(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: '#2563eb' }}
            />
          </div>
        </div>
      </div>

      {/* App Info & Sign out */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
          <span>Version</span>
          <span>1.0.0 (Native Android Build)</span>
        </div>

        {user && (
          <button
            onClick={onLogout}
            style={{
              padding: '10px',
              borderRadius: 10,
              background: '#fef2f2',
              color: '#ef4444',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: '1px solid #fecaca',
            }}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};
export default SettingsTab;
