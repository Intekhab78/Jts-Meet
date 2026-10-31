import React, { useState } from 'react';
import { ChangePinModal } from '../modals/ChangePinModal';
import { resolveAvatarUrl } from '../../config';
import { MobileAvatar } from '../common/MobileAvatar';

interface SettingsTabProps {
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenProfileModal?: () => void;
  onOpenAdminConsole?: () => void;
  onOpenTeamHub?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  onLogout,
  onOpenAuth,
  onOpenProfileModal,
  onOpenAdminConsole,
  onOpenTeamHub,
}) => {
  const [muteOnJoin, setMuteOnJoin] = useState(() => localStorage.getItem('jts_pref_mute_join') === 'true');
  const [videoOffOnJoin, setVideoOffOnJoin] = useState(() => localStorage.getItem('jts_pref_video_off_join') === 'true');
  const [mirrorVideo, setMirrorVideo] = useState(() => localStorage.getItem('jts_pref_mirror_video') !== 'false');
  const [biometricLock, setBiometricLock] = useState(() => localStorage.getItem('jts_biometric_lock_enabled') === 'true');
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState(() => localStorage.getItem('jts_security_pin') || '1234');

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
      localStorage.setItem('jts_security_pin', '1234');
      setCurrentPin('1234');
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
          <MobileAvatar
            src={user.profileImage || user.avatar}
            name={user.name}
            size={52}
            border="2px solid #ffffff"
          />
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



      {/* Enterprise Management Section */}
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Enterprise Workspace Management
          </span>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #bfdbfe',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Admin Console Entry */}
            {onOpenAdminConsole && (
              <div
                onClick={onOpenAdminConsole}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 700 }}>
                      Admin Console
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 1 }}>
                      Manage Users, Audit Logs, Recordings & Billing
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700 }}>Open →</span>
              </div>
            )}

            {/* Teams Hub Entry */}
            {onOpenTeamHub && (
              <div
                onClick={onOpenTeamHub}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  backgroundColor: '#fafbfc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 700 }}>
                      Teams & Channels Hub
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 1 }}>
                      Manage Teams, Create Channels, Team Calls
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>Manage →</span>
              </div>
            )}
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

      {/* Enterprise Security Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            App Security & Privacy
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 8,
              backgroundColor: biometricLock ? '#eff6ff' : '#f1f5f9',
              color: biometricLock ? '#2563eb' : '#64748b',
            }}
          >
            {biometricLock ? 'Lock Enabled' : 'Lock Disabled'}
          </span>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Biometric Lock Toggle */}
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
                  width: 34,
                  height: 34,
                  borderRadius: 10,
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
                  App Lock (Fingerprint / PIN)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 1 }}>
                  {biometricLock
                    ? 'Active • Only locks when phone screen turns off'
                    : 'Turn on to protect meetings & chats with PIN'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={biometricLock}
              onChange={(e) => handleToggleBiometricLock(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }}
            />
          </div>

          {/* Change PIN Row (Always visible or visible when lock is configured) */}
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafbfc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 600 }}>
                  Security PIN
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 1 }}>
                  PIN: •••• {currentPin === '1234' ? '(Default: 1234)' : '(Customized)'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChangePinOpen(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#2563eb',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              Change PIN
            </button>
          </div>
        </div>

        {/* Security Help Note */}
        <p style={{ fontSize: '0.67rem', color: '#94a3b8', margin: '2px 4px 0 4px', lineHeight: 1.4 }}>
          💡 <strong>Tip:</strong> App ko lock hatane ke liye upar diye toggle ko band karein. App kabhi bhi in-app back karne par lock nahi hoga.
        </p>
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

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
        onSuccess={(newPin) => setCurrentPin(newPin)}
      />
    </div>
  );
};
export default SettingsTab;
