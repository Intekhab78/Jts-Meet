import React from 'react';
import { RemoteParticipant } from '../types';
import { MobileAvatar } from '../../common/MobileAvatar';

export interface ParticipantsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInvite: () => void;
  participants: RemoteParticipant[];
  resolvedDisplayName: string;
  screenSharingUserId: string | null;
}

export const ParticipantsSheet: React.FC<ParticipantsSheetProps> = ({
  isOpen,
  onClose,
  onOpenInvite,
  participants,
  resolvedDisplayName,
  screenSharingUserId,
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
          height: '70%',
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Participants ({participants.length + 1})
          </span>
          <button
            onClick={onClose}
            style={{ padding: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>

        <button
          onClick={onOpenInvite}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#2563eb',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          + Invite More Participants
        </button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* You */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 10,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MobileAvatar
                name={resolvedDisplayName}
                size={32}
              />
              <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                {resolvedDisplayName} (You)
              </span>
            </div>
          </div>

          {/* Remote Participants */}
          {participants.map((p) => (
            <div
              key={p.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MobileAvatar
                  name={p.displayName}
                  size={32}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                    {p.displayName}
                  </span>
                  {screenSharingUserId && screenSharingUserId.toLowerCase() === p.userId.toLowerCase() && (
                    <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>
                      Sharing screen
                    </span>
                  )}
                </div>
              </div>
              {p.isMuted && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
                  Muted
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsSheet;
