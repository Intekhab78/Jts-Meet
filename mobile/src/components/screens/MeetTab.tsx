import React, { useState } from 'react';

interface MeetTabProps {
  onStartNewMeeting: () => void;
  onOpenJoinModal: () => void;
  onOpenScheduleModal: () => void;
  onQuickJoin: (code: string) => void;
  recentMeetings?: string[];
}

export const MeetTab: React.FC<MeetTabProps> = ({
  onStartNewMeeting,
  onOpenJoinModal,
  onOpenScheduleModal,
  onQuickJoin,
  recentMeetings = ['demo-sync', 'team-weekly'],
}) => {
  const [meetingCode, setMeetingCode] = useState('');

  const cleanMeetingId = (input: string) => {
    let clean = input.trim();
    if (clean.includes('?id=')) {
      clean = clean.split('?id=')[1].split('&')[0];
    } else if (clean.includes('/meet/')) {
      clean = clean.split('/meet/')[1].split('?')[0].split('#')[0];
    } else if (clean.includes('/')) {
      clean = clean.substring(clean.lastIndexOf('/') + 1).split('?')[0].split('#')[0];
    }
    return clean.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanMeetingId(meetingCode);
    if (clean) {
      onQuickJoin(clean);
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
        gap: 18,
        backgroundColor: '#ffffff',
      }}
    >
      {/* 3 Iconic Action Tiles (Zoom / Google Meet Style) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {/* New Meeting */}
        <button
          onClick={onStartNewMeeting}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
            }}
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e293b', textAlign: 'center' }}>
            New Meeting
          </span>
        </button>

        {/* Join */}
        <button
          onClick={onOpenJoinModal}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e293b', textAlign: 'center' }}>
            Join
          </span>
        </button>

        {/* Schedule */}
        <button
          onClick={onOpenScheduleModal}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e293b', textAlign: 'center' }}>
            Schedule
          </span>
        </button>
      </div>

      {/* Quick Join Card */}
      <form
        onSubmit={handleJoinSubmit}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Quick Join
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '0 10px',
              height: 42,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="text"
              placeholder="Meeting Code or Link"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#0f172a',
                fontSize: '0.85rem',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!meetingCode.trim()}
            style={{
              padding: '0 16px',
              height: 42,
              borderRadius: 10,
              background: meetingCode.trim() ? '#2563eb' : '#e2e8f0',
              color: meetingCode.trim() ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.82rem',
              transition: 'all 0.15s ease',
            }}
          >
            Join
          </button>
        </div>
      </form>

      {/* Recent Meetings */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
          Recent Meetings
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentMeetings.map((code) => (
            <div
              key={code}
              className="card-pressable"
              onClick={() => onQuickJoin(code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                  }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    {code}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Tap to re-join
                  </div>
                </div>
              </div>
              <button
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default MeetTab;
