import React from 'react';

export interface InviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingUrl: string;
  inviteCopied: boolean;
  onCopyInvite: () => void;
  onNativeShare: () => void;
  onWhatsAppShare: () => void;
}

export const InviteSheet: React.FC<InviteSheetProps> = ({
  isOpen,
  onClose,
  meetingId,
  meetingUrl,
  inviteCopied,
  onCopyInvite,
  onNativeShare,
  onWhatsAppShare,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: '16px 18px calc(var(--safe-bottom) + 16px) 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Invite Others
            </span>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              Share this meeting link with people you want to join
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, color: '#64748b', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Meeting Code
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>
              {meetingId}
            </span>
          </div>

          <div
            style={{
              padding: '8px 10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#0f172a',
              wordBreak: 'break-all',
            }}
          >
            {meetingUrl}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={onCopyInvite}
            style={{
              padding: '11px',
              borderRadius: 10,
              backgroundColor: inviteCopied ? '#ecfdf5' : '#f1f5f9',
              border: `1px solid ${inviteCopied ? '#a7f3d0' : '#cbd5e1'}`,
              color: inviteCopied ? '#059669' : '#0f172a',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            {inviteCopied ? (
              <>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Link
              </>
            )}
          </button>

          <button
            onClick={onNativeShare}
            style={{
              padding: '11px',
              borderRadius: 10,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share Apps
          </button>
        </div>

        <button
          onClick={onWhatsAppShare}
          style={{
            padding: '11px',
            borderRadius: 10,
            backgroundColor: '#25D366',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          Share via WhatsApp
        </button>
      </div>
    </div>
  );
};

export default InviteSheet;
