import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { io } from 'socket.io-client';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { MeetTab } from './components/screens/MeetTab';
import { MeetingsTab } from './components/screens/MeetingsTab';
import { MessagesTab } from './components/screens/MessagesTab';
import { SettingsTab } from './components/screens/SettingsTab';
import { JoinMeetingModal } from './components/modals/JoinMeetingModal';
import { NewMeetingModal } from './components/modals/NewMeetingModal';
import { ScheduleMeetingModal } from './components/modals/ScheduleMeetingModal';
import { MobileAuthModal } from './components/MobileAuthModal';
import { MobileMeetingRoom } from './components/MobileMeetingRoom';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser, SOCKET_URL } from './config';

export function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>('meet');
  const [user, setUser] = useState<any>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());

  // Modals
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Active Meeting state
  const [activeMeeting, setActiveMeeting] = useState<{
    id: string;
    displayName: string;
    audioOff?: boolean;
    videoOff?: boolean;
    showInitialInvite?: boolean;
  } | null>(null);

  // Incoming Call State (WhatsApp / iOS Call Ringing Alert)
  const [incomingCall, setIncomingCall] = useState<{
    meetingId: string;
    callerName: string;
    callerAvatar?: string;
  } | null>(null);

  const ringAudioRef = useRef<{ stop: () => void } | null>(null);

  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      let isPlaying = true;

      const playChime = () => {
        if (!isPlaying || ctx.state === 'closed') return;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.35);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.85);

        if (navigator.vibrate) {
          try {
            navigator.vibrate([300, 150, 300]);
          } catch (_) {}
        }
      };

      playChime();
      const interval = setInterval(playChime, 2200);

      ringAudioRef.current = {
        stop: () => {
          isPlaying = false;
          clearInterval(interval);
          ctx.close().catch(() => {});
        },
      };
    } catch (_) {}
  };

  const stopRingtone = () => {
    if (ringAudioRef.current) {
      ringAudioRef.current.stop();
      ringAudioRef.current = null;
    }
  };

  const handleTestIncomingCall = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const dummyCtx = new AudioCtx();
        if (dummyCtx.state === 'suspended') {
          dummyCtx.resume().catch(() => {});
        }
      }
    } catch (_) {}

    setIncomingCall({
      meetingId: 'jts-' + Math.floor(1000 + Math.random() * 9000),
      callerName: 'Rajesh Sharma (JTS Meet)',
      callerAvatar: '',
    });
  };

  useEffect(() => {
    if (incomingCall) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [incomingCall]);

  // Background socket for incoming call alerts
  useEffect(() => {
    const bgSocket = io(SOCKET_URL, {
      auth: { token: token || undefined },
      transports: ['websocket', 'polling'],
    });

    bgSocket.on('call:incoming', (payload: any) => {
      if (payload?.meetingId) {
        setIncomingCall({
          meetingId: payload.meetingId,
          callerName: payload.callerName || 'Colleague',
          callerAvatar: payload.callerAvatar,
        });
      }
    });

    return () => {
      bgSocket.disconnect();
    };
  }, [token]);

  // Recent meetings
  const [recentMeetings, setRecentMeetings] = useState<string[]>(['jts-team-sync', 'all-hands']);

  // Handle joining a meeting
  const handleJoinMeeting = (
    meetingId: string,
    displayName: string,
    audioOff = false,
    videoOff = false,
    showInitialInvite = false
  ) => {
    setIsJoinOpen(false);
    setIsNewMeetingOpen(false);
    setIncomingCall(null);
    stopRingtone();

    const savedName = localStorage.getItem('jts_display_name') || localStorage.getItem('jts_user_name') || '';
    const resolvedName = (displayName && displayName !== 'Guest User')
      ? displayName
      : (user?.name || savedName || 'Mohit');

    localStorage.setItem('jts_display_name', resolvedName);

    // Add to recent meetings
    setRecentMeetings((prev) => [meetingId, ...prev.filter((m) => m !== meetingId)].slice(0, 5));

    setActiveMeeting({
      id: meetingId,
      displayName: resolvedName,
      audioOff,
      videoOff,
      showInitialInvite,
    });
  };

  // ── Deep Linking for WhatsApp & Web Meeting Links ──
  useEffect(() => {
    const checkUrlForMeeting = (fullUrl: string) => {
      try {
        if (!fullUrl) return;
        let meetingId = '';
        if (fullUrl.includes('?id=')) {
          meetingId = fullUrl.split('?id=')[1]?.split('&')[0];
        } else if (fullUrl.includes('/meet/')) {
          meetingId = fullUrl.split('/meet/')[1]?.split('?')[0]?.split('#')[0];
        } else if (fullUrl.includes('/room-')) {
          meetingId = 'room-' + fullUrl.split('/room-')[1]?.split('?')[0]?.split('#')[0];
        } else if (fullUrl.startsWith('jtsmeet://')) {
          meetingId = fullUrl.replace('jtsmeet://', '').replace('meet/', '').split('?')[0];
        }
        if (meetingId && meetingId.trim()) {
          const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
          handleJoinMeeting(meetingId.trim(), storedName, false, false, false);
        }
      } catch (_) {}
    };

    checkUrlForMeeting(window.location.href);

    const listener = CapacitorApp.addListener('appUrlOpen', (event: { url: string }) => {
      checkUrlForMeeting(event.url);
    });

    return () => {
      listener.then((h) => h.remove()).catch(() => {});
    };
  }, [user]);

  // Handle starting a new meeting (auto-opens invite sheet on enter)
  const handleStartNewMeeting = (videoOn: boolean, usePmi: boolean, customCode?: string) => {
    const meetingCode = customCode || (usePmi ? '789-456-123' : `meet-${Math.random().toString(36).substring(2, 8)}`);
    const hostName = user?.name || localStorage.getItem('jts_display_name') || 'Mohit';
    handleJoinMeeting(meetingCode, hostName, false, !videoOn, true);
  };

  // Handle quick join from code input
  const handleQuickJoin = (code: string) => {
    const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
    handleJoinMeeting(code, storedName, false, false, false);
  };

  // Scheduled Meetings (Persisted in localStorage)
  const [scheduledMeetings, setScheduledMeetings] = useState<
    Array<{ id: string; title: string; date: string; time: string; meetingCode: string }>
  >(() => {
    try {
      const stored = localStorage.getItem('jts_scheduled_meetings');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [
      { id: 'daily-scrum', title: 'Daily Standup Call', date: 'Today', time: '10:00 AM - 10:30 AM', meetingCode: 'daily-scrum' },
      { id: 'client-review', title: 'Project Demo & Review', date: 'Tomorrow', time: '03:00 PM - 04:00 PM', meetingCode: 'client-review' },
    ];
  });

  const handleSchedule = (title: string, date: string, time: string) => {
    setIsScheduleOpen(false);
    const meetingCode = `sync-${Math.random().toString(36).substring(2, 8)}`;
    const newMeeting = {
      id: meetingCode,
      title: title.trim() || 'Team Meeting',
      date,
      time,
      meetingCode,
    };
    setScheduledMeetings((prev) => {
      const updated = [newMeeting, ...prev];
      localStorage.setItem('jts_scheduled_meetings', JSON.stringify(updated));
      return updated;
    });
    setActiveTab('meetings');
  };

  const handleDeleteScheduled = (id: string) => {
    setScheduledMeetings((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      localStorage.setItem('jts_scheduled_meetings', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle Auth success
  const handleAuthSuccess = (loggedUser: any, authToken: string) => {
    setUser(loggedUser);
    setToken(authToken);
  };

  // Handle Logout
  const [isMeetingMinimized, setIsMeetingMinimized] = useState(false);

  const handleLogout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setUser(null);
    setToken(null);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        overflow: 'hidden',
      }}
    >
      {/* ── High-Priority Incoming Call Banner (WhatsApp / iOS Style) ── */}
      {incomingCall && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(var(--safe-top, 24px) + 12px)',
            left: 12,
            right: 12,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            border: '1.5px solid #3b82f6',
            borderRadius: 18,
            padding: '14px 16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
              }}
            >
              {incomingCall.callerName.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Incoming Video Call
              </div>
              <div style={{ fontSize: '0.92rem', color: '#ffffff', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {incomingCall.callerName}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Meeting: {incomingCall.meetingId}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Decline */}
            <button
              onClick={() => {
                stopRingtone();
                setIncomingCall(null);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              }}
              title="Decline"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Accept */}
            <button
              onClick={() => {
                stopRingtone();
                const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
                handleJoinMeeting(incomingCall.meetingId, storedName, false, false, false);
                setIncomingCall(null);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 20,
                backgroundColor: '#22c55e',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
              Join
            </button>
          </div>
        </div>
      )}
      {/* ── Active Video Meeting Room (Full-Screen or In-App PiP Floating Mini-Card) ── */}
      {activeMeeting && (
        <MobileMeetingRoom
          meetingId={activeMeeting.id}
          displayName={activeMeeting.displayName}
          initialAudioOff={activeMeeting.audioOff}
          initialVideoOff={activeMeeting.videoOff}
          showInitialInvite={activeMeeting.showInitialInvite}
          isMinimized={isMeetingMinimized}
          onMinimize={() => setIsMeetingMinimized(true)}
          onMaximize={() => setIsMeetingMinimized(false)}
          onLeave={() => {
            setActiveMeeting(null);
            setIsMeetingMinimized(false);
          }}
        />
      )}
      {/* ── Top Header Bar ── */}
      <MobileTopBar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setActiveTab('settings')}
      />

      {/* ── Main Tab Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {activeTab === 'meet' && (
          <MeetTab
            onStartNewMeeting={() => setIsNewMeetingOpen(true)}
            onOpenJoinModal={() => setIsJoinOpen(true)}
            onOpenScheduleModal={() => setIsScheduleOpen(true)}
            onQuickJoin={handleQuickJoin}
            recentMeetings={recentMeetings}
            onTestIncomingCall={handleTestIncomingCall}
          />
        )}

        {activeTab === 'meetings' && (
          <MeetingsTab
            onStartMeeting={(code) => handleQuickJoin(code)}
            scheduledMeetings={scheduledMeetings}
            onDeleteMeeting={handleDeleteScheduled}
            onOpenScheduleModal={() => setIsScheduleOpen(true)}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            onStartMeeting={(code) => handleQuickJoin(code)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthOpen(true)}
            onTestIncomingCall={handleTestIncomingCall}
          />
        )}
      </main>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── Modals / Bottom Sheets ── */}
      <JoinMeetingModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoin={(id, name, audio, video) => handleJoinMeeting(id, name, audio, video, false)}
        defaultName={user?.name || localStorage.getItem('jts_display_name') || ''}
      />

      <NewMeetingModal
        isOpen={isNewMeetingOpen}
        onClose={() => setIsNewMeetingOpen(false)}
        onStart={handleStartNewMeeting}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSchedule={handleSchedule}
      />

      <MobileAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
