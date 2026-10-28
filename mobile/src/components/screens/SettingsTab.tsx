import React, { useState } from 'react';

interface SettingsTabProps {
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenProfileModal?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  onLogout,
  onOpenAuth,
  onOpenProfileModal,
}) => {
  const [muteOnJoin, setMuteOnJoin] = useState(() => localStorage.getItem('jts_pref_mute_join') === 'true');
  const [videoOffOnJoin, setVideoOffOnJoin] = useState(() => localStorage.getItem('jts_pref_video_off_join') === 'true');
  const [mirrorVideo, setMirrorVideo] = useState(() => localStorage.getItem('jts_pref_mirror_video') !== 'false');
  const [biometricLock, setBiometricLock] = useState(() => localStorage.getItem('jts_biometric_lock_enabled') === 'true');

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

  const handleToggleBiometricLock = (val: boolean) => {
    setBiometricLock(val);
    localStorage.setItem('jts_biometric_lock_enabled', String(val));
    if (val && !localStorage.getItem('jts_security_pin')) {
      const pin = prompt('Enter a 4-digit backup PIN for your workspace:');
      if (pin && pin.trim().length >= 4) {
        localStorage.setItem('jts_security_pin', pin.trim());
      } else {
        localStorage.setItem('jts_security_pin', '1234');
      }
    }
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
          onClick={onOpenProfileModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px',
            background: '#ffffff',
            border: '1px solid #bfdbfe',
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {user.profileImage || user.avatar ? (
              <img src={user.profileImage || user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || 'JTS User'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email || 'user@example.com'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                PRO Member
              </span>
              <span style={{ fontSize: '0.66rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                {user.status === 'in_meeting' ? 'In Call' : 'Online'}
              </span>
            </div>
          </div>

          {/* Edit Profile Action Chip */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfileModal?.();
            }}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span>Edit</span>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
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

      {/* Enterprise Security Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Enterprise Security
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
          {/* Biometric Lock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: biometricLock ? '#eff6ff' : '#f1f5f9',
                  color: biometricLock ? '#2563eb' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 600 }}>
                  Biometric App Lock (Fingerprint / PIN)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 1 }}>
                  Protect meetings & chats when returning to app
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={biometricLock}
              onChange={(e) => handleToggleBiometricLock(e.target.checked)}
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
