import React, { useState, useEffect } from 'react';
import { API_BASE, getStoredToken } from '../../config';
import { mobileNotificationService } from '../../services/mobileNotificationService';

export interface CalendarMeeting {
  id: string;
  meetingId: string;
  title: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status: string;
}

interface MobileCalendarScheduleCardProps {
  onJoinMeeting: (meetingId: string) => void;
  onOpenScheduleModal: () => void;
}

export const MobileCalendarScheduleCard: React.FC<MobileCalendarScheduleCardProps> = ({
  onJoinMeeting,
  onOpenScheduleModal,
}) => {
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [remindedMeetings, setRemindedMeetings] = useState<Set<string>>(new Set());

  const fetchMeetings = async () => {
    const token = getStoredToken();
    if (!token) {
      setMeetings([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/meetings/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        const formatted: CalendarMeeting[] = list.map((m: any) => ({
          id: m._id || m.meetingId || Math.random().toString(),
          meetingId: m.meetingId || m.customId || 'conf',
          title: m.title || 'Corporate Meeting',
          scheduledDate: m.scheduledDate || '',
          scheduledTime: m.scheduledTime || '10:00',
          status: m.status || 'scheduled',
        }));
        setMeetings(formatted);
      }
    } catch (_) {
      // Offline or network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 60000); // 1-minute auto refresh
    return () => clearInterval(interval);
  }, []);

  // Pre-meeting 10-minute automated alert check
  useEffect(() => {
    if (!meetings.length) return;

    const now = new Date();
    meetings.forEach((m) => {
      if (m.scheduledTime && !remindedMeetings.has(m.meetingId)) {
        const [hh, mm] = m.scheduledTime.split(':').map(Number);
        if (!isNaN(hh) && !isNaN(mm)) {
          const meetTime = new Date();
          meetTime.setHours(hh, mm, 0, 0);
          const diffMinutes = Math.round((meetTime.getTime() - now.getTime()) / 60000);

          if (diffMinutes > 0 && diffMinutes <= 10) {
            mobileNotificationService.notifyMeetingReminder({
              title: m.title,
              meetingId: m.meetingId,
              scheduledTime: m.scheduledTime,
              startsInMinutes: diffMinutes,
            });
            setRemindedMeetings((prev) => new Set(prev).add(m.meetingId));
          }
        }
      }
    });
  }, [meetings, remindedMeetings]);

  const generateGoogleCalendarUrl = (m: CalendarMeeting) => {
    const title = encodeURIComponent(m.title);
    const details = encodeURIComponent(`Join JTS Meet video conference: https://jts-meet.internal/meet/${m.meetingId}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
  };

  const generateOutlookCalendarUrl = (m: CalendarMeeting) => {
    const title = encodeURIComponent(m.title);
    const details = encodeURIComponent(`Join JTS Meet video conference: https://jts-meet.internal/meet/${m.meetingId}`);
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&body=${details}`;
  };

  const activeList = meetings.slice(0, 3);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              Today's Schedule & Agenda
            </span>
            <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
              Google & Outlook Calendar 1-Tap Sync
            </div>
          </div>
        </div>

        <button
          onClick={onOpenScheduleModal}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Schedule
        </button>
      </div>

      {/* Meeting Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {activeList.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.74rem',
            }}
          >
            No upcoming meetings scheduled for today
          </div>
        ) : (
          activeList.map((m) => (
            <div
              key={m.id}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>🕒 {m.scheduledTime}</span>
                    <span>•</span>
                    <span>Code: {m.meetingId}</span>
                  </div>
                </div>

                {/* 1-Tap Join Button */}
                <button
                  onClick={() => onJoinMeeting(m.meetingId)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  Join Now
                </button>
              </div>

              {/* Calendar Sync Quick Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>
                <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600 }}>Sync:</span>
                <a
                  href={generateGoogleCalendarUrl(m)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.66rem',
                    color: '#2563eb',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  📅 Google Calendar
                </a>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <a
                  href={generateOutlookCalendarUrl(m)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.66rem',
                    color: '#0284c7',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  📧 Outlook
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MobileCalendarScheduleCard;
