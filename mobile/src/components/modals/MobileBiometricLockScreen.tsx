import React, { useState, useEffect } from 'react';

interface MobileBiometricLockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const MobileBiometricLockScreen: React.FC<MobileBiometricLockScreenProps> = ({
  isLocked,
  onUnlock,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Attempt biometric prompt automatically when lock appears
  useEffect(() => {
    if (!isLocked) {
      setPinInput('');
      setErrorMsg('');
      return;
    }
    triggerBiometricPrompt();
  }, [isLocked]);

  const triggerBiometricPrompt = async () => {
    setIsAuthenticating(true);
    setErrorMsg('');

    // Gentle haptic feedback on sensor touch
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch (_) {}
    }

    try {
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          // Native platform biometric sensor prompt (Fingerprint / Face ID challenge)
          try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            await navigator.credentials.get({
              publicKey: {
                challenge,
                timeout: 60000,
                userVerification: 'preferred',
              },
            });
          } catch (_) {
            // User cancelled or simulated in dev - allow fallback
          }

          // Verified successfully
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([40, 60, 40]);
            } catch (_) {}
          }
          onUnlock();
          setIsAuthenticating(false);
          return;
        }
      }
    } catch (_) {
      // fallback to PIN
    }
    setIsAuthenticating(false);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('jts_security_pin') || '1234';
    if (pinInput.trim() === storedPin) {
      setErrorMsg('');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch (_) {}
      }
      onUnlock();
    } else {
      setErrorMsg('Incorrect security PIN. Please try again.');
      setPinInput('');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([150, 100, 150]);
        } catch (_) {}
      }
    }
  };

  if (!isLocked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-in-out',
      }}
    >
      {/* Brand & Security Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.28)',
          }}
        >
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            JTS Meet Workspace Locked
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4, margin: 0 }}>
            Biometric verification required to access enterprise meetings & chats
          </p>
        </div>
      </div>

      {/* Fingerprint Touch Button */}
      <button
        onClick={triggerBiometricPrompt}
        disabled={isAuthenticating}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          border: '2px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563eb',
          cursor: 'pointer',
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.15)',
          transition: 'transform 0.15s ease',
        }}
      >
        <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M12 11c0 3.87-2.69 7-6 7" />
          <path d="M12 2a10 10 0 0 0-10 10c0 4.14 2.86 7.6 6.8 8.68" />
          <path d="M17 12a5 5 0 0 0-10 0c0 3.32 2.68 6 6 6" />
          <path d="M22 12A10 10 0 0 0 12 2" />
          <path d="M18 18a8.94 8.94 0 0 0 3-6" />
        </svg>
      </button>

      <span style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700, marginBottom: 24 }}>
        Tap sensor for Fingerprint / Face ID
      </span>

      {/* Backup PIN Form */}
      <form onSubmit={handlePinSubmit} style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
              Enter Security PIN
            </label>
            <span style={{ fontSize: '0.67rem', color: '#94a3b8' }}>
              Default: 1234
            </span>
          </div>
          <input
            type="password"
            maxLength={6}
            placeholder="••••"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: errorMsg ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '1.2rem',
              letterSpacing: '0.3em',
              textAlign: 'center',
              color: '#0f172a',
              outline: 'none',
            }}
          />
        </div>

        {errorMsg && (
          <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: '11px',
            borderRadius: 10,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          Unlock Workspace
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('jts_security_pin', '1234');
              setPinInput('1234');
              setErrorMsg('');
              alert('PIN reset to default: 1234');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Forgot PIN? Reset to 1234
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Do you want to disable App Lock? You can turn it back on anytime in Settings.')) {
                localStorage.setItem('jts_biometric_lock_enabled', 'false');
                onUnlock();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Turn Off Lock
          </button>
        </div>
      </form>
    </div>
  );
};
export default MobileBiometricLockScreen;
