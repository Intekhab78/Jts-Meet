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
import { MobileOutgoingCallModal } from './components/chat/MobileOutgoingCallModal';
import { MobileOrganizationModal } from './components/modals/MobileOrganizationModal';
import { MobileBiometricLockScreen } from './components/modals/MobileBiometricLockScreen';
import { MobileUserProfileModal } from './components/modals/MobileUserProfileModal';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser, SOCKET_URL, API_BASE } from './config';

export function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>('meet');
  const [user, setUser] = useState<any>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());

  // Modals
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Active Meeting state
  const [activeMeeting, setActiveMeeting] = useState<{
    id: string;
    displayName: string;
    audioOff?: boolean;
    videoOff?: boolean;
    showInitialInvite?: boolean;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('jts_active_mobile_meeting');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return null;
  });
  const [isMeetingMinimized, setIsMeetingMinimized] = useState(false);

  useEffect(() => {
    if (activeMeeting) {
      try {
        localStorage.setItem('jts_active_mobile_meeting', JSON.stringify(activeMeeting));
      } catch (_) {}
    } else {
      localStorage.removeItem('jts_active_mobile_meeting');
    }
  }, [activeMeeting]);

  // Incoming Call State (WhatsApp / iOS Call Ringing Alert)
  const [incomingCall, setIncomingCall] = useState<{
    meetingId: string;
    callerName: string;
    callerAvatar?: string;
  } | null>(null);

  const [outgoingCall, setOutgoingCall] = useState<{
    targetUserId: string;
    targetName: string;
    targetAvatar?: string;
    callType: 'audio' | 'video';
    meetingId: string;
    channelName?: string;
  } | null>(null);

  // Network Reconnection & Online/Offline Status (Enterprise 4G <-> Wi-Fi Sync)
  const [networkState, setNetworkState] = useState<'online' | 'reconnecting' | 'offline' | 'restored'>('online');

  // Enterprise Biometric App Lock
  const [isAppLocked, setIsAppLocked] = useState(() => localStorage.getItem('jts_biometric_lock_enabled') === 'true');

  const socketRef = useRef<any>(null);
  const [socket, setSocket] = useState<any>(null);

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

  // Biometric App Lock on app resume
  useEffect(() => {
    let appStateHandle: any = null;
    try {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && localStorage.getItem('jts_biometric_lock_enabled') === 'true') {
          setIsAppLocked(true);
        }
      }).then((handle) => {
        appStateHandle = handle;
      });
    } catch (_) {}

    return () => {
      appStateHandle?.remove();
    };
  }, []);

  // Window Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setNetworkState('reconnecting');
      socketRef.current?.connect();
    };
    const handleOffline = () => {
      setNetworkState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background socket for incoming & outgoing call alerts & network synchronization
  useEffect(() => {
    const effectiveToken = token || getStoredToken();
    const bgSocket = io(SOCKET_URL, {
      auth: { token: effectiveToken || undefined },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
    });
    socketRef.current = bgSocket;
    setSocket(bgSocket);

    bgSocket.on('connect', () => {
      console.log('[MobileApp] Connected to background socket:', bgSocket.id);
      setNetworkState((prev) => {
        if (prev === 'reconnecting' || prev === 'offline') {
          setTimeout(() => setNetworkState('online'), 2500);
          return 'restored';
        }
        return 'online';
      });
    });

    bgSocket.on('disconnect', (reason) => {
      console.warn('[MobileApp] Socket disconnected:', reason);
      if (reason !== 'io client disconnect') {
        setNetworkState('reconnecting');
      }
    });

    bgSocket.on('reconnect_attempt', () => {
      setNetworkState('reconnecting');
    });

    bgSocket.on('call:incoming', (payload: any) => {
      console.log('[MobileApp] Received incoming call:', payload);
      if (payload?.meetingId) {
        setIncomingCall({
          meetingId: payload.meetingId,
          callerName: payload.callerName || 'Colleague',
          callerAvatar: payload.callerAvatar,
        });
      }
    });

    bgSocket.on('call:accepted', (payload: any) => {
      console.log('[MobileApp] Outgoing call accepted:', payload);
      setOutgoingCall((curr) => {
        if (curr && (!payload?.meetingId || payload.meetingId === curr.meetingId)) {
          stopRingtone();
          const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
          handleJoinMeeting(curr.meetingId, storedName, curr.callType === 'audio', false, false);
          return null;
        }
        return curr;
      });
    });

    bgSocket.on('call:rejected', (payload: any) => {
      console.log('[MobileApp] Call rejected or unavailable:', payload);
      setOutgoingCall((curr) => {
        if (curr) {
          stopRingtone();
          alert(payload?.reason === 'no_answer' ? 'User is unavailable.' : 'Call declined.');
          return null;
        }
        return curr;
      });
    });

    bgSocket.on('call:cancelled', () => {
      setIncomingCall(null);
      stopRingtone();
    });

    return () => {
      bgSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token]);

  const handleStartCall = (
    targetUserId: string,
    targetName: string,
    callType: 'audio' | 'video',
    targetAvatar?: string,
    channelName?: string
  ) => {
    const meetingId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const callerName = user?.name || localStorage.getItem('jts_display_name') || 'Mohit';
    const callerAvatar = user?.avatar || '';

    setOutgoingCall({
      targetUserId,
      targetName,
      targetAvatar,
      callType,
      meetingId,
      channelName,
    });

    startRingtone();

    if (socketRef.current) {
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
      socketRef.current.emit('call:initiate', {
        targetUserId,
        calleeId: targetUserId,
        callerId: user?._id || user?.id,
        callType,
        callerName,
        callerAvatar,
        meetingId,
        channelName,
        channelId: channelName ? targetUserId : undefined,
      });
    }

    // Auto timeout after 60 seconds if unanswered (matches server ringing timeout)
    setTimeout(() => {
      setOutgoingCall((curr) => {
        if (curr && curr.meetingId === meetingId) {
          stopRingtone();
          if (socketRef.current) {
            socketRef.current.emit('call:cancelled', {
              targetUserId,
              meetingId,
            });
          }
          return null;
        }
        return curr;
      });
    }, 60000);
  };

  const handleCancelOutgoingCall = () => {
    if (outgoingCall && socketRef.current) {
      socketRef.current.emit('call:cancelled', {
        targetUserId: outgoingCall.targetUserId,
        meetingId: outgoingCall.meetingId,
      });
    }
    stopRingtone();
    setOutgoingCall(null);
  };

  // Recent meetings (dynamically loaded from local history)
  const [recentMeetings, setRecentMeetings] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('jts_recent_meetings');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  });

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
    setRecentMeetings((prev) => {
      const updated = [meetingId, ...prev.filter((m) => m !== meetingId)].slice(0, 5);
      try { localStorage.setItem('jts_recent_meetings', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

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

  // Scheduled Meetings (Dynamically fetched from backend API)
  const [scheduledMeetings, setScheduledMeetings] = useState<
    Array<{ id: string; title: string; date: string; time: string; meetingCode: string }>
  >(() => {
    try {
      const stored = localStorage.getItem('jts_scheduled_meetings');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    if (!token) return;
    const fetchMyMeetings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/meeting/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data && Array.isArray(json.data)) {
            const mapped = json.data
              .filter((m: any) => m.status === 'scheduled' || m.status === 'active')
              .map((m: any) => ({
                id: m.meetingId,
                title: m.title || `Meeting ${m.meetingId}`,
                date: m.scheduledDate || (m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Today'),
                time: m.scheduledTime || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'),
                meetingCode: m.meetingId,
              }));
            setScheduledMeetings(mapped);
            try { localStorage.setItem('jts_scheduled_meetings', JSON.stringify(mapped)); } catch (_) {}
          }
        }
      } catch (_) {}
    };
    fetchMyMeetings();
  }, [token]);

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
      {/* ── Floating Network Reconnection Pill (4G <-> Wi-Fi Smooth Switch) ── */}
      {networkState !== 'online' && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(var(--safe-top, 24px) + 6px)',
            left: 0,
            right: 0,
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              backgroundColor: networkState === 'restored' ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${networkState === 'restored' ? '#86efac' : '#fde68a'}`,
              color: networkState === 'restored' ? '#15803d' : '#b45309',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
            }}
          >
            {networkState === 'restored' ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span>Connected to workspace</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    animation: 'pulse 1s infinite',
                  }}
                />
                <span>{networkState === 'offline' ? 'No internet connection' : 'Reconnecting to workspace...'}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── High-Priority Incoming Call Banner (White Background Enterprise iOS Style) ── */}
      {incomingCall && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(var(--safe-top, 24px) + 12px)',
            left: 12,
            right: 12,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            border: '1.5px solid #bfdbfe',
            borderRadius: 18,
            padding: '14px 16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12), 0 0 15px rgba(37, 99, 235, 0.15)',
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
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              }}
            >
              {incomingCall.callerName.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Incoming Call
              </div>
              <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {incomingCall.callerName}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
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

            {/* Accept - Icon only */}
            <button
              onClick={() => {
                stopRingtone();
                const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
                handleJoinMeeting(incomingCall.meetingId, storedName, false, false, false);
                setIncomingCall(null);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
              }}
              title="Accept Call"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Outgoing Call Modal (Native iOS / WhatsApp Ringing Screen) ── */}
      {outgoingCall && (
        <MobileOutgoingCallModal
          isOpen={Boolean(outgoingCall)}
          targetName={outgoingCall.targetName}
          targetAvatar={outgoingCall.targetAvatar}
          callType={outgoingCall.callType}
          isChannel={Boolean(outgoingCall.channelName)}
          onCancel={handleCancelOutgoingCall}
        />
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
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* ── Main Tab Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {activeTab === 'meet' && (
          <MeetTab
            onStartNewMeeting={() => setIsNewMeetingOpen(true)}
            onOpenJoinModal={() => setIsJoinOpen(true)}
            onOpenScheduleModal={() => setIsScheduleOpen(true)}
            onOpenOrganizationModal={() => setIsOrganizationOpen(true)}
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
            token={token}
            currentUser={user}
            socket={socket}
            onStartMeeting={(code) => handleQuickJoin(code)}
            onStartCall={handleStartCall}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenProfileModal={() => setIsProfileOpen(true)}
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

      <MobileOrganizationModal
        isOpen={isOrganizationOpen}
        token={token}
        onClose={() => setIsOrganizationOpen(false)}
        onStartMeeting={(code) => handleQuickJoin(code)}
      />

      <MobileAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Enterprise User Profile Modal ── */}
      <MobileUserProfileModal
        isOpen={isProfileOpen}
        user={user}
        token={token}
        onClose={() => setIsProfileOpen(false)}
        onUpdateUser={(updatedUser) => {
          setUser(updatedUser);
          setStoredUser(updatedUser);
        }}
      />

      {/* ── Enterprise Biometric Screen Lock ── */}
      <MobileBiometricLockScreen
        isLocked={isAppLocked}
        onUnlock={() => setIsAppLocked(false)}
      />
    </div>
  );
}

export default App;
