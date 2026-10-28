import React from 'react';
import { MobileContact } from './types';

interface MobileOnlineStoriesBarProps {
  contacts: MobileContact[];
  onSelectContact: (contact: MobileContact) => void;
  onStartVideoCall?: (contact: MobileContact) => void;
}

export const MobileOnlineStoriesBar: React.FC<MobileOnlineStoriesBarProps> = ({
  contacts,
  onSelectContact,
}) => {
  // Prioritize online / in-meeting contacts, then active teammates
  const displayContacts = [...contacts].sort((a, b) => {
    const scoreA = a.status === 'online' ? 2 : a.status === 'in_meeting' ? 1 : 0;
    const scoreB = b.status === 'online' ? 2 : b.status === 'in_meeting' ? 1 : 0;
    return scoreB - scoreA;
  }).slice(0, 12);

  if (displayContacts.length === 0) return null;

  const onlineCount = contacts.filter((c) => c.status === 'online').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 14px 6px',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: onlineCount > 0 ? '#22c55e' : '#94a3b8',
              display: 'inline-block',
              boxShadow: onlineCount > 0 ? '0 0 0 2px rgba(34, 197, 94, 0.25)' : 'none',
            }}
          />
          {onlineCount > 0 ? `Active Now (${onlineCount} Online)` : `Teammates (${displayContacts.length})`}
        </span>
      </div>

      {/* Horizontal Scrollable Avatars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {displayContacts.map((contact) => {
          const isOnline = contact.status === 'online';
          const isInMeeting = contact.status === 'in_meeting';
          const isOffline = !isOnline && !isInMeeting;
          const firstName = contact.name.split(' ')[0];

          return (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                outline: 'none',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  padding: 2,
                  background: isInMeeting
                    ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
                    : isOnline
                    ? 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)'
                    : '#e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: isInMeeting
                          ? 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)'
                          : isOnline
                          ? 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)'
                          : '#f1f5f9',
                        color: isInMeeting ? '#dc2626' : isOnline ? '#2563eb' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Status Dot: Green if Online, Red if In Call, Neutral Gray if Offline */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    backgroundColor: isInMeeting ? '#ef4444' : isOnline ? '#22c55e' : '#94a3b8',
                    border: '2px solid #ffffff',
                    boxShadow: isInMeeting
                      ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                      : isOnline
                      ? '0 0 0 2px rgba(34, 197, 94, 0.3)'
                      : 'none',
                  }}
                />
              </div>

              {/* Name */}
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: isOnline || isInMeeting ? 700 : 500,
                  color: isInMeeting ? '#dc2626' : isOnline ? '#0f172a' : '#64748b',
                  maxWidth: 48,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {firstName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default MobileOnlineStoriesBar;
