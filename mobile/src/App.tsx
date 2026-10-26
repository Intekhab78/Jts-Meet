import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
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
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser } from './config';

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
        } else if (fullUrl.startsWith('jtsmeet://')) {
          meetingId = fullUrl.replace('jtsmeet://', '').split('?')[0];
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

  // Handle schedule
  const handleSchedule = (title: string, date: string, time: string) => {
    setIsScheduleOpen(false);
    alert(`Meeting "${title}" scheduled for ${date} at ${time}!`);
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
          />
        )}

        {activeTab === 'meetings' && (
          <MeetingsTab
            onStartMeeting={(code) => handleQuickJoin(code)}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthOpen(true)}
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
