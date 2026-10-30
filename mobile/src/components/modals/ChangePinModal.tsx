import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPin: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Android back button
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

  if (!isOpen) return null;

  const currentStoredPin = localStorage.getItem('jts_security_pin') || '1234';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Verify current PIN
    if (currentPinInput.trim() !== currentStoredPin) {
      setErrorMsg('Current PIN is incorrect. (Default PIN is 1234)');
      return;
    }

    // 2. Validate new PIN
    const cleanNewPin = newPinInput.trim();
    if (!/^\d{4,6}$/.test(cleanNewPin)) {
      setErrorMsg('New PIN must be 4 to 6 digits long.');
      return;
    }

    // 3. Confirm matching
    if (cleanNewPin !== confirmPinInput.trim()) {
      setErrorMsg('New PIN and Confirm PIN do not match.');
      return;
    }

    // 4. Save
    localStorage.setItem('jts_security_pin', cleanNewPin);
    setSuccessMsg('Security PIN updated successfully!');
    setTimeout(() => {
      onSuccess(cleanNewPin);
      onClose();
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setSuccessMsg('');
    }, 1000);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset PIN to default (1234)?')) {
      localStorage.setItem('jts_security_pin', '1234');
      setSuccessMsg('PIN reset to default: 1234');
      setTimeout(() => {
        onSuccess('1234');
        onClose();
        setSuccessMsg('');
      }, 1000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
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
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Change Security PIN
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Manage your App Lock PIN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.75rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                fontSize: '0.75rem',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Current PIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                Current PIN
              </label>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                (Default: 1234)
              </span>
            </div>
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '1.1rem',
                letterSpacing: '0.25em',
                textAlign: 'center',
                outline: 'none',
                color: '#0f172a',
              }}
              required
            />
          </div>

          {/* New PIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
              New 4-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '1.1rem',
                letterSpacing: '0.25em',
                textAlign: 'center',
                outline: 'none',
                color: '#0f172a',
              }}
              required
            />
          </div>

          {/* Confirm New PIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
              Confirm New PIN
            </label>
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '1.1rem',
                letterSpacing: '0.25em',
                textAlign: 'center',
                outline: 'none',
                color: '#0f172a',
              }}
              required
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              style={{
                padding: '11px',
                borderRadius: 10,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
              }}
            >
              Save New PIN
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              style={{
                padding: '8px',
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              Forgot PIN? Reset to Default (1234)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePinModal;
