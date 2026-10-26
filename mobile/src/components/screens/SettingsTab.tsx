import React, { useState } from 'react';

interface SettingsTabProps {
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
  onTestIncomingCall?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  onLogout,
  onOpenAuth,
  onTestIncomingCall,
}) => {
  const [muteOnJoin, setMuteOnJoin] = useState(() => localStorage.getItem('jts_pref_mute_join') === 'true');
  const [videoOffOnJoin, setVideoOffOnJoin] = useState(() => localStorage.getItem('jts_pref_video_off_join') === 'true');
  const [mirrorVideo, setMirrorVideo] = useState(() => localStorage.getItem('jts_pref_mirror_video') !== 'false');

  const handleToggleMuteOnJoin = (val: boolean) => {
    setMuteOnJoin(val);
    localStorage.setItem('jts_pref_mute_join', String(val));
  };

  const handleToggleVideoOffOnJoin = (val: boolean) => {
    setVideoOffOnJoin(val);
    localStorage.setItem('jts_pref_video_off_join', String(val));
  };

  const handleToggleMirrorVideo = (val: boolean) => {
    setMirrorVideo(val);
    localStorage.setItem('jts_pref_mirror_video', String(val));
  };

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

      {/* WhatsApp / iOS Call Ringing Test Card */}
      {onTestIncomingCall && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Incoming Call Ringing Alert
          </span>
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1.5px solid #86efac',
              borderRadius: 14,
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(34, 197, 94, 0.35)',
                }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#14532d' }}>
                  WhatsApp / iOS Style Call Alert
                </div>
                <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 2, lineHeight: 1.3 }}>
                  Phone par incoming video call banner, ringtone audio chime aur vibration test karein.
                </div>
              </div>
            </div>

            <button
              onClick={onTestIncomingCall}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 10,
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 3px 10px rgba(22, 163, 74, 0.25)',
              }}
            >
              <span>🔔</span>
              <span>Test Incoming Call (Simulate Now)</span>
            </button>
          </div>
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
              onChange={(e) => handleToggleMuteOnJoin(e.target.checked)}
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
              onChange={(e) => handleToggleVideoOffOnJoin(e.target.checked)}
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
              onChange={(e) => handleToggleMirrorVideo(e.target.checked)}
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
