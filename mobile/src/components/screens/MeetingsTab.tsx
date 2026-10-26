import React, { useState } from 'react';

interface MeetingsTabProps {
  onStartMeeting: (code: string) => void;
  pmi?: string;
}

export const MeetingsTab: React.FC<MeetingsTabProps> = ({
  onStartMeeting,
  pmi = '789-456-123',
}) => {
  const [copied, setCopied] = useState(false);

  const meetingUrl = `https://meet.jtsmiddleeast.com/meet/${pmi}`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  const scheduledMeetings = [
    { id: 'daily-scrum', title: 'Daily Standup Call', time: '10:00 AM - 10:30 AM', date: 'Today' },
    { id: 'client-review', title: 'Project Demo & Review', time: '03:00 PM - 04:00 PM', date: 'Tomorrow' },
  ];

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
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
          Scheduled Meetings
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scheduledMeetings.map((item) => (
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {item.date} • {item.time}
                </span>
              </div>
              <button
                onClick={() => onStartMeeting(item.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                }}
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default MeetingsTab;
