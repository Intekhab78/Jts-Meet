import React, { useState } from 'react';

export interface ScheduledMeetingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  meetingCode: string;
}

interface MeetingsTabProps {
  onStartMeeting: (code: string) => void;
  pmi?: string;
  scheduledMeetings?: ScheduledMeetingItem[];
  onDeleteMeeting?: (id: string) => void;
  onOpenScheduleModal?: () => void;
}

export const MeetingsTab: React.FC<MeetingsTabProps> = ({
  onStartMeeting,
  pmi = '789-456-123',
  scheduledMeetings = [],
  onDeleteMeeting,
  onOpenScheduleModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const meetingUrl = `https://meet.jtsmiddleeast.com/meet/${pmi}`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyMeeting = (code: string, id: string) => {
    const url = `https://meet.jtsmiddleeast.com/meet/${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my JTS Meet Room',
          text: `Join my personal meeting on JTS Meet:\n${meetingUrl}`,
          url: meetingUrl,
        });
      } catch (e) {
        // cancelled
      }
    } else {
      handleCopy();
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
      {/* Personal Meeting ID Card */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 14,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              Personal Meeting ID (PMI)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em', marginTop: 2 }}>
              {pmi}
            </div>
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              background: copied ? '#ecfdf5' : '#ffffff',
              border: `1px solid ${copied ? '#a7f3d0' : '#cbd5e1'}`,
              color: copied ? '#059669' : '#2563eb',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onStartMeeting(pmi)}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: 10,
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            Start
          </button>
          <button
            onClick={handleShareInvite}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: 10,
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Send Invite
          </button>
        </div>
      </div>

      {/* Scheduled Calls List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Scheduled Meetings ({scheduledMeetings.length})
          </span>
          {onOpenScheduleModal && (
            <button
              onClick={onOpenScheduleModal}
              style={{
                fontSize: '0.72rem',
                color: '#2563eb',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + Schedule New
            </button>
          )}
        </div>

        {scheduledMeetings.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              borderRadius: 14,
              border: '1px dashed #cbd5e1',
              backgroundColor: '#f8fafc',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.4rem' }}>📅</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              No Upcoming Meetings
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 240 }}>
              Schedule a future meeting with automatic reminders and share links with your team.
            </div>
            {onOpenScheduleModal && (
              <button
                onClick={onOpenScheduleModal}
                style={{
                  marginTop: 6,
                  padding: '7px 16px',
                  borderRadius: 8,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Schedule Meeting
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scheduledMeetings.map((item) => {
              const code = item.meetingCode || item.id;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {item.date} • {item.time}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: '0.64rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                        ID: {code}
                      </span>
                      <button
                        onClick={() => handleCopyMeeting(code, item.id)}
                        style={{
                          fontSize: '0.65rem',
                          color: isCopied ? '#16a34a' : '#64748b',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {isCopied ? '✓ Copied' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button
                      onClick={() => onStartMeeting(code)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      Start
                    </button>
                    {onDeleteMeeting && (
                      <button
                        onClick={() => onDeleteMeeting(item.id)}
                        style={{
                          padding: '7px',
                          borderRadius: 8,
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Delete meeting"
                      >
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default MeetingsTab;
