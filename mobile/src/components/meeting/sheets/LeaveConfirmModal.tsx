import React from 'react';

export interface LeaveConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LeaveConfirmModal: React.FC<LeaveConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          backgroundColor: '#1e293b',
          borderRadius: 22,
          padding: '22px 20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
              Leave Meeting?
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
              Are you sure you want to leave this call?
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 12,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveConfirmModal;
