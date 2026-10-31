import React, { useState } from 'react';
import { API_BASE, setStoredToken, setStoredUser } from '../config';

interface MobileAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
}

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'sso'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = authMode === 'register' ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;
      const cleanName = name.trim() || email.split('@')[0];
      const body = authMode === 'register'
        ? { fullName: cleanName, name: cleanName, email: email.trim(), password }
        : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed. Please check details.');
      }

      const token = data.data?.accessToken || data.token || '';
      const user = data.data?.user || { email, name: cleanName };
      if (user && !user.name && user.fullName) {
        user.name = user.fullName;
      }

      setStoredToken(token);
      setStoredUser(user);
      onSuccess(user, token);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enterprise SSO Login (Google Workspace / Microsoft 365 / Corporate Slug)
  const handleSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgSlug.trim() || !email.trim()) {
      setError('Both Organization domain and your corporate email are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/sso/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          orgSlug: orgSlug.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'SSO authentication failed for workspace.');
      }

      const token = data.data?.accessToken || data.token || '';
      const user = data.data?.user || { email, name: email.split('@')[0] };

      setStoredToken(token);
      setStoredUser(user);
      onSuccess(user, token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate via Corporate SSO.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Google Workspace Auth trigger
  const handleGoogleSso = () => {
    // Open Google OAuth endpoint or prompt corporate email
    const googleAuthUrl = `${API_BASE}/api/auth/google`;
    window.location.href = googleAuthUrl;
  };

  // Quick Microsoft 365 Auth trigger
  const handleMicrosoftSso = () => {
    setAuthMode('sso');
    if (!orgSlug) setOrgSlug('microsoft-enterprise');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: '1px solid #e2e8f0',
          padding: '16px 20px calc(var(--safe-bottom) + 20px) 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 -12px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {authMode === 'sso'
                ? 'Corporate SSO Sign In'
                : authMode === 'register'
                ? 'Create JTS Meet Account'
                : 'Sign In to JTS Meet'}
            </span>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              {authMode === 'sso'
                ? 'Authenticate via Enterprise Workspace SAML / OAuth'
                : authMode === 'register'
                ? 'Fill details to create your enterprise profile'
                : 'Enter your work credentials or use 1-tap SSO'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: '9px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.76rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* ── 1-Tap Corporate SSO Buttons ── */}
        {authMode !== 'sso' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Google Workspace */}
            <button
              type="button"
              onClick={handleGoogleSso}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '11px',
                borderRadius: 12,
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                color: '#1e293b',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google Workspace
            </button>

            {/* Microsoft 365 / Entra ID */}
            <button
              type="button"
              onClick={handleMicrosoftSso}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '11px',
                borderRadius: 12,
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                color: '#1e293b',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Continue with Microsoft 365
            </button>
          </div>
        )}

        {/* Divider */}
        {authMode !== 'sso' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Or with work email
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          </div>
        )}

        {/* Form: Standard Email/Password */}
        {authMode !== 'sso' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {authMode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Corporate Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '10px 12px',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '10px 42px 10px 12px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                borderRadius: 12,
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                marginTop: 4,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                opacity: loading ? 0.7 : 1,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Authenticating...' : (authMode === 'register' ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        ) : (
          /* Form: Enterprise Workspace SSO Domain */
          <form onSubmit={handleSsoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Company Workspace Domain / Slug</label>
              <input
                type="text"
                placeholder="e.g. acme-corp"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                required
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '10px 12px',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                Enter your organization domain configured in JTS Meet
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Your Work Email</label>
              <input
                type="email"
                placeholder="employee@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '10px 12px',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                borderRadius: 12,
                background: '#059669',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                marginTop: 4,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                opacity: loading ? 0.7 : 1,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Verifying SSO Identity...' : 'Sign In with SSO'}
            </button>
          </form>
        )}

        {/* Footer Mode Switchers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center', marginTop: 4 }}>
          {authMode !== 'sso' ? (
            <>
              <button
                type="button"
                onClick={() => setAuthMode('sso')}
                style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                🔐 Sign in with Enterprise Workspace SSO
              </button>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'register' ? 'signin' : 'register')}
                style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {authMode === 'register' ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Back to standard Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAuthModal;
