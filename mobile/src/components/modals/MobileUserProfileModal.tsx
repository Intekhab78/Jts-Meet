import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE, getStoredToken, setStoredUser, resolveAvatarUrl } from '../../config';

interface MobileUserProfileModalProps {
  isOpen: boolean;
  user: any;
  token?: string | null;
  onClose: () => void;
  onUpdateUser: (updatedUser: any) => void;
}

export const MobileUserProfileModal: React.FC<MobileUserProfileModalProps> = ({
  isOpen,
  user,
  token,
  onClose,
  onUpdateUser,
}) => {
  const resolvedToken = token || getStoredToken();
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'busy' | 'away' | 'dnd' | 'in_meeting'>('online');
  const [customStatus, setCustomStatus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hardware back button support
  useEffect(() => {
    if (!isOpen) return;
    let handle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        onClose();
      }).then((h) => {
        handle = h;
      });
    } catch (_) {}
    return () => {
      handle?.remove?.();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.name || '');
      setTitle(user.title || localStorage.getItem('jts_user_title') || '');
      setDepartment(user.department || localStorage.getItem('jts_user_dept') || '');
      setPhone(user.phone || localStorage.getItem('jts_user_phone') || '');
      setPresenceStatus(user.status || 'online');
      setCustomStatus(user.customStatus || '');
      setAvatarUrl(user.profileImage || user.avatar || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Automatically resize & compress avatar image with HTML5 canvas
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawData = ev.target?.result as string;
        if (!rawData) return;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setAvatarUrl(compressed);
          } else {
            setAvatarUrl(rawData);
          }
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedToken) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Update Profile (Name & Avatar)
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          profileImage: avatarUrl || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to update profile (${res.status})`);
      }

      const resJson = await res.json().catch(() => ({}));
      const savedUser = resJson.data || resJson.user || {};

      // 2. Update Status
      await fetch(`${API_BASE}/api/auth/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({
          status: presenceStatus,
          customStatus: customStatus.trim(),
        }),
      }).catch(() => {});

      // 3. Update Password if entered
      if (showPasswordSection && oldPassword && newPassword) {
        if (newPassword.length < 8) {
          setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters' });
        } else if (newPassword !== confirmPassword) {
          setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
        } else {
          const pwdRes = await fetch(`${API_BASE}/api/auth/change-password`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify({ oldPassword, newPassword }),
          });
          const pwdJson = await pwdRes.json();
          if (pwdRes.ok) {
            setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
          } else {
            setPasswordMsg({ type: 'error', text: pwdJson.message || 'Failed to change password' });
          }
        }
      }

      // Update Local User Object with backend response
      const finalAvatar = savedUser.profileImage || avatarUrl;
      const updatedUser = {
        ...user,
        ...savedUser,
        name: fullName.trim(),
        fullName: fullName.trim(),
        profileImage: finalAvatar,
        avatar: finalAvatar,
        title: title.trim(),
        department: department.trim(),
        phone: phone.trim(),
        status: presenceStatus,
        customStatus: customStatus.trim(),
      };

      setStoredUser(updatedUser);
      localStorage.setItem('jts_display_name', fullName.trim());
      localStorage.setItem('jts_user_name', fullName.trim());
      if (title.trim()) localStorage.setItem('jts_user_title', title.trim());
      if (department.trim()) localStorage.setItem('jts_user_dept', department.trim());
      if (phone.trim()) localStorage.setItem('jts_user_phone', phone.trim());

      onUpdateUser(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: '16px 18px 28px',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: '92vh',
          overflowY: 'auto',
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        {/* Grab Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Profile & Settings
              </h3>
              <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                Configure your display name, role, and enterprise identity
              </span>
            </div>
          </div>

          {/* Large touch close button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Profile Avatar Editor */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              {avatarUrl ? (
                <img
                  src={resolveAvatarUrl(avatarUrl)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                fullName ? fullName.charAt(0).toUpperCase() : 'U'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
              {fullName || 'Your Name'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {user.email}
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                alignSelf: 'flex-start',
                marginTop: 2,
                padding: '4px 10px',
                borderRadius: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#2563eb',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📷 Upload Photo
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Display Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Full Display Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Mohit Sharma"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.84rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {/* Job Title & Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Job Title / Role
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project Lead"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +971 50 123 4567"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.84rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {/* Presence Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Presence Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                { id: 'online', label: 'Online', color: '#22c55e' },
                { id: 'busy', label: 'Busy', color: '#f59e0b' },
                { id: 'in_meeting', label: 'In Call', color: '#ef4444' },
                { id: 'away', label: 'Away', color: '#94a3b8' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setPresenceStatus(s.id as any)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: presenceStatus === s.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: presenceStatus === s.id ? '#eff6ff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: presenceStatus === s.id ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Status / Bio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Custom Bio / Status
            </label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. In meeting till 5 PM / Available for urgent calls"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.84rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {/* Change Password Accordion */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <span>🔒 Change Account Password</span>
              <span>{showPasswordSection ? '▲' : '▼'}</span>
            </button>

            {showPasswordSection && (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: '#ffffff' }}>
                <input
                  type="password"
                  placeholder="Current Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <input
                  type="password"
                  placeholder="New Password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                {passwordMsg && (
                  <span style={{ fontSize: '0.72rem', color: passwordMsg.type === 'success' ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                    {passwordMsg.text}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: '12px',
              borderRadius: 12,
              backgroundColor: saveSuccess ? '#16a34a' : '#2563eb',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 800,
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: saveSuccess ? '0 4px 14px rgba(22, 163, 74, 0.3)' : '0 4px 14px rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            {isSaving ? (
              <span>Saving Changes...</span>
            ) : saveSuccess ? (
              <>
                <span>✓ Profile Saved Successfully!</span>
              </>
            ) : (
              <span>Save & Update Profile</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default MobileUserProfileModal;
