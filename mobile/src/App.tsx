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
import { MobileTeamHubModal } from './components/team/MobileTeamHubModal';
import { MobileAdminConsoleModal } from './components/admin/MobileAdminConsoleModal';
import { MobileBiometricLockScreen } from './components/modals/MobileBiometricLockScreen';
import { MobileUserProfileModal } from './components/modals/MobileUserProfileModal';
import { MobileIncomingCallModal } from './components/meeting/MobileIncomingCallModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { mobileNotificationService } from './services/mobileNotificationService';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser, clearAllSessionStorageAndData, SOCKET_URL, API_BASE } from './config';

export function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>('meet');
  const [user, setUser] = useState<any>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());

  // Modals
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const lastOrgModalClosedRef = useRef(0);
  const [isTeamHubOpen, setIsTeamHubOpen] = useState(false);
  const lastTeamHubClosedRef = useRef(0);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const lastAdminConsoleClosedRef = useRef(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [targetChat, setTargetChat] = useState<{ id: string; name: string; avatar?: string; isChannel: boolean } | null>(null);

  // Active Meeting state
  const [activeMeeting, setActiveMeeting] = useState<{
    id: string;
    displayName: string;
    audioOff?: boolean;
    videoOff?: boolean;
    showInitialInvite?: boolean;
    callType?: 'audio' | 'video';
    peerName?: string;
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
    callerId?: string;
    callerName: string;
    callerAvatar?: string;
    callType?: 'audio' | 'video';
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
  const [isAppLocked, setIsAppLocked] = useState(() => {
    const hasActiveMeeting = Boolean(localStorage.getItem('jts_active_mobile_meeting'));
    return !hasActiveMeeting && localStorage.getItem('jts_biometric_lock_enabled') === 'true';
  });
  const lastBackgroundTimeRef = useRef<number>(0);

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

  // Handle Google / Microsoft OAuth redirect with ?token=...
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = searchParams.get('token');
      if (tokenFromUrl) {
        setStoredToken(tokenFromUrl);
        setToken(tokenFromUrl);
        fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${tokenFromUrl}` },
        })
          .then((res) => res.json())
          .then((data) => {
            const u = data?.data?.user || data?.user || data?.data;
            if (u) {
              setStoredUser(u);
              setUser(u);
            }
          })
          .catch(() => {});
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (_) {}
  }, []);

  const closeChatConversationRef = useRef<(() => boolean) | null>(null);

  // Android Native Hardware Back Button Handler for App Navigation (Closes Modals & Tabs)
  useEffect(() => {
    let backHandle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        // If an active meeting is in foreground (not minimized), MobileMeetingRoom handles its own back flow
        if (activeMeeting && !isMeetingMinimized) return;

        // 1. Close open modals first
        if (isAdminConsoleOpen) {
          setIsAdminConsoleOpen(false);
          return;
        }
        if (isTeamHubOpen) {
          setIsTeamHubOpen(false);
          return;
        }
        if (isProfileOpen) {
          setIsProfileOpen(false);
          return;
        }
        if (isAuthOpen) {
          setIsAuthOpen(false);
          return;
        }
        if (isOrganizationOpen) {
          setIsOrganizationOpen(false);
          return;
        }
        if (isJoinOpen) {
          setIsJoinOpen(false);
          return;
        }
        if (isNewMeetingOpen) {
          setIsNewMeetingOpen(false);
          return;
        }
        if (isScheduleOpen) {
          setIsScheduleOpen(false);
          return;
        }
        if (outgoingCall) {
          setOutgoingCall(null);
          return;
        }
        if (incomingCall) {
          setIncomingCall(null);
          return;
        }

        // 2. If a chat conversation is open in Messages tab, close conversation back to list
        if (closeChatConversationRef.current && closeChatConversationRef.current()) {
          return;
        }

        // 3. If on secondary tab, return to main 'meet' tab
        if (activeTab !== 'meet') {
          setActiveTab('meet');
          return;
        }

        // 4. If on 'meet' tab at root, minimize app without locking
        CapacitorApp.minimizeApp().catch(() => {});
      }).then((handle) => {
        backHandle = handle;
      });
    } catch (_) {}

    return () => {
      backHandle?.remove?.();
    };
  }, [
    activeMeeting,
    isMeetingMinimized,
    isAdminConsoleOpen,
    isTeamHubOpen,
    isProfileOpen,
    isAuthOpen,
    isOrganizationOpen,
    isJoinOpen,
    isNewMeetingOpen,
    isScheduleOpen,
    outgoingCall,
    incomingCall,
    activeTab,
  ]);

  // Smart App Lock: Only lock if enabled AND phone was locked / minimized for > 15s. Never lock during meeting or on back press.
  useEffect(() => {
    let appStateHandle: any = null;
    try {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // App went into background or phone screen turned off
          lastBackgroundTimeRef.current = Date.now();
        } else {
          // App returned to foreground
          const wasInBackgroundForMs = Date.now() - (lastBackgroundTimeRef.current || 0);
          const isLockEnabled = localStorage.getItem('jts_biometric_lock_enabled') === 'true';

          // NEVER lock if lock is disabled, or if user is in an active meeting/call,
          // or if it was just a momentary pause (less than 15s, e.g. back navigation or file picker)
          if (isLockEnabled && !activeMeeting && wasInBackgroundForMs > 15000) {
            setIsAppLocked(true);
          }
        }
      }).then((handle) => {
        appStateHandle = handle;
      });
    } catch (_) {}

    return () => {
      appStateHandle?.remove();
    };
  }, [activeMeeting]);

  // Window Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      if (socketRef.current?.connected) {
        setNetworkState('online');
      } else {
        setNetworkState('reconnecting');
        socketRef.current?.connect();
        // Failsafe: Return to online after 3s so banner never hangs
        setTimeout(() => {
          setNetworkState((s) => (s === 'reconnecting' ? 'online' : s));
        }, 3000);
      }
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
    if (!effectiveToken) {
      setNetworkState('online');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Ensure FCM token is linked to the authenticated user on backend
    mobileNotificationService.syncStoredFcmToken(effectiveToken);

    const bgSocket = io(SOCKET_URL, {
      auth: { token: effectiveToken },
      transports: ['websocket', 'polling'], // WebSocket first for instant, stable mobile connection
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    });
    socketRef.current = bgSocket;
    setSocket(bgSocket);

    let reconnectTimer: any = null;

    bgSocket.on('connect', () => {
      console.log('[MobileApp] Connected to background socket:', bgSocket.id);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setNetworkState((prev) => {
        if (prev === 'reconnecting' || prev === 'offline') {
          setTimeout(() => setNetworkState('online'), 2000);
          return 'restored';
        }
        return 'online';
      });
    });

    bgSocket.on('disconnect', (reason) => {
      console.warn('[MobileApp] Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server rejected auth - do not loop in reconnecting state
        setNetworkState('online');
      } else if (reason !== 'io client disconnect') {
        if (!navigator.onLine) {
          setNetworkState('offline');
        } else {
          setNetworkState('reconnecting');
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            setNetworkState((s) => (s === 'reconnecting' ? 'online' : s));
          }, 3500);
        }
      }
    });

    bgSocket.on('connect_error', (err) => {
      console.warn('[MobileApp] Socket connect error:', err?.message || err);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setNetworkState((s) => (s === 'reconnecting' ? 'online' : s));
      }, 3500);
    });

    bgSocket.on('reconnect_attempt', () => {
      if (!navigator.onLine) {
        setNetworkState('offline');
      }
    });

    bgSocket.on('call:incoming', (payload: any) => {
      console.log('[MobileApp] Received incoming call:', payload);
      if (payload?.meetingId) {
        setIncomingCall({
          meetingId: payload.meetingId,
          callerId: payload.callerId,
          callerName: payload.callerName || 'Colleague',
          callerAvatar: payload.callerAvatar,
          callType: payload.callType || 'video',
        });
      }
    });

    bgSocket.on('call:accepted', (payload: any) => {
      console.log('[MobileApp] Outgoing call accepted:', payload);
      setOutgoingCall((curr) => {
        if (curr && (!payload?.meetingId || payload.meetingId === curr.meetingId)) {
          stopRingtone();
          const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
          handleJoinMeeting(
            curr.meetingId,
            storedName,
            false,
            curr.callType === 'audio',
            false,
            curr.callType,
            curr.targetName
          );
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
    const callerName = user?.fullName || user?.name || localStorage.getItem('jts_display_name') || 'Enterprise User';
    const callerAvatar = user?.profileImage || user?.avatar || '';

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

  // Recent meetings (dynamically loaded from local history for authenticated user)
  const [recentMeetings, setRecentMeetings] = useState<string[]>(() => {
    try {
      if (!getStoredToken()) return [];
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
    showInitialInvite = false,
    callType?: 'audio' | 'video',
    peerName?: string
  ) => {
    setIsJoinOpen(false);
    setIsNewMeetingOpen(false);
    setIncomingCall(null);
    stopRingtone();

    const savedName = localStorage.getItem('jts_display_name') || localStorage.getItem('jts_user_name') || '';
    const resolvedName = (displayName && displayName !== 'Guest User')
      ? displayName
      : (user?.name || savedName || 'Guest User');

    localStorage.setItem('jts_display_name', resolvedName);

    // Add to recent meetings
    setRecentMeetings((prev) => {
      const updated = [meetingId, ...prev.filter((m) => m !== meetingId)].slice(0, 5);
      try { localStorage.setItem('jts_recent_meetings', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    const isDirect = meetingId.startsWith('call_') || Boolean(callType);
    const resolvedCallType = callType || (isDirect ? (videoOff ? 'audio' : 'video') : undefined);

    setActiveMeeting({
      id: meetingId,
      displayName: resolvedName,
      audioOff,
      videoOff,
      showInitialInvite,
      callType: resolvedCallType,
      peerName,
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
          const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Guest User';
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
    const hostName = user?.name || localStorage.getItem('jts_display_name') || 'Guest User';
    handleJoinMeeting(meetingCode, hostName, false, !videoOn, true);
  };

  // Handle quick join from code input
  const handleQuickJoin = (code: string) => {
    const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Guest User';
    handleJoinMeeting(code, storedName, false, false, false);
  };

  // Scheduled Meetings (Dynamically fetched from backend API for authenticated user)
  const [scheduledMeetings, setScheduledMeetings] = useState<
    Array<{ id: string; title: string; date: string; time: string; meetingCode: string }>
  >(() => {
    try {
      if (!getStoredToken()) return [];
      const stored = localStorage.getItem('jts_scheduled_meetings');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    if (!token) {
      setScheduledMeetings([]);
      return;
    }
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
    try {
      const storedRecent = localStorage.getItem('jts_recent_meetings');
      if (storedRecent) setRecentMeetings(JSON.parse(storedRecent));
    } catch (_) {}
  };

  // Handle Logout - Strict Enterprise Data Isolation & Cache Purge
  const handleLogout = () => {
    clearAllSessionStorageAndData();
    setUser(null);
    setToken(null);
    setRecentMeetings([]);
    setScheduledMeetings([]);
    setTargetChat(null);
    setIsOrganizationOpen(false);
    setIsTeamHubOpen(false);
    setIsAdminConsoleOpen(false);
    setIsProfileOpen(false);
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (_) {}
      socketRef.current = null;
      setSocket(null);
    }
    setActiveTab('meet');
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

      {/* ── Native Full-Screen Incoming Call Screen (WhatsApp / Enterprise CallKit Style) ── */}
      <MobileIncomingCallModal
        call={incomingCall}
        onDecline={() => {
          stopRingtone();
          if (socketRef.current && incomingCall?.callerId) {
            socketRef.current.emit('call:rejected', {
              callerId: incomingCall.callerId,
              meetingId: incomingCall.meetingId,
              reason: 'declined',
            });
          }
          setIncomingCall(null);
        }}
        onAccept={() => {
          if (!incomingCall) return;
          stopRingtone();
          if (socketRef.current) {
            socketRef.current.emit('call:accepted', {
              meetingId: incomingCall.meetingId,
              callerId: incomingCall.callerId,
            });
          }
          const storedName = localStorage.getItem('jts_display_name') || user?.name || 'Mohit';
          handleJoinMeeting(
            incomingCall.meetingId,
            storedName,
            false,
            incomingCall.callType === 'audio',
            false,
            incomingCall.callType,
            incomingCall.callerName
          );
          setIncomingCall(null);
        }}
      />

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

      {/* ── Active Video / Audio Meeting Room (Full-Screen or In-App PiP Floating Mini-Card) ── */}
      {activeMeeting && (
        <MobileMeetingRoom
          meetingId={activeMeeting.id}
          displayName={activeMeeting.displayName}
          initialAudioOff={activeMeeting.audioOff}
          initialVideoOff={activeMeeting.videoOff}
          showInitialInvite={activeMeeting.showInitialInvite}
          callType={activeMeeting.callType}
          peerName={activeMeeting.peerName}
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
        onOpenAdminConsole={() => {
          if (Date.now() - lastAdminConsoleClosedRef.current < 450) return;
          setIsAdminConsoleOpen(true);
        }}
      />

      {/* ── Main Tab Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {activeTab === 'meet' && (
          <MeetTab
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onStartNewMeeting={() => setIsNewMeetingOpen(true)}
            onOpenJoinModal={() => setIsJoinOpen(true)}
            onOpenScheduleModal={() => {
              if (!user) {
                setIsAuthOpen(true);
              } else {
                setIsScheduleOpen(true);
              }
            }}
            onOpenOrganizationModal={() => {
              if (!user) {
                setIsAuthOpen(true);
                return;
              }
              if (Date.now() - lastOrgModalClosedRef.current < 450) return;
              setIsOrganizationOpen(true);
            }}
            onOpenTeamHub={() => {
              if (!user) {
                setIsAuthOpen(true);
                return;
              }
              if (Date.now() - lastTeamHubClosedRef.current < 450) return;
              setIsTeamHubOpen(true);
            }}
            onOpenAdminConsole={() => {
              if (!user) {
                setIsAuthOpen(true);
                return;
              }
              if (Date.now() - lastAdminConsoleClosedRef.current < 450) return;
              setIsAdminConsoleOpen(true);
            }}
            onQuickJoin={handleQuickJoin}
            recentMeetings={user ? recentMeetings : []}
            onTestIncomingCall={handleTestIncomingCall}
          />
        )}

        {activeTab === 'meetings' && (
          <MeetingsTab
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            pmi={user ? (user.personalMeetingId || (user._id || user.id ? String(user._id || user.id).replace(/\D/g, '').padEnd(9, '7').slice(0, 9).replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3') : '789-456-123')) : undefined}
            onStartMeeting={(code) => handleQuickJoin(code)}
            scheduledMeetings={user ? scheduledMeetings : []}
            onDeleteMeeting={handleDeleteScheduled}
            onOpenScheduleModal={() => {
              if (!user) {
                setIsAuthOpen(true);
              } else {
                setIsScheduleOpen(true);
              }
            }}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            token={token}
            currentUser={user}
            socket={socket}
            onOpenAuth={() => setIsAuthOpen(true)}
            onStartMeeting={(code) => handleQuickJoin(code)}
            onStartCall={handleStartCall}
            onOpenTeamHub={() => {
              if (Date.now() - lastTeamHubClosedRef.current < 450) return;
              setIsTeamHubOpen(true);
            }}
            registerCloseConversation={(fn) => {
              closeChatConversationRef.current = fn;
            }}
            targetConversation={targetChat}
            onClearTargetConversation={() => setTargetChat(null)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenProfileModal={() => setIsProfileOpen(true)}
            onOpenAdminConsole={() => {
              if (Date.now() - lastAdminConsoleClosedRef.current < 450) return;
              setIsAdminConsoleOpen(true);
            }}
            onOpenTeamHub={() => {
              if (Date.now() - lastTeamHubClosedRef.current < 450) return;
              setIsTeamHubOpen(true);
            }}
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
        onClose={() => {
          lastOrgModalClosedRef.current = Date.now();
          setIsOrganizationOpen(false);
        }}
        onStartMeeting={(code) => handleQuickJoin(code)}
      />

      {/* ── Enterprise Teams Hub Modal ── */}
      <MobileTeamHubModal
        isOpen={isTeamHubOpen}
        token={token}
        currentUser={user}
        onClose={() => {
          lastTeamHubClosedRef.current = Date.now();
          setIsTeamHubOpen(false);
        }}
        onStartTeamCall={(team) => {
          setIsTeamHubOpen(false);
          handleQuickJoin(`team-${team._id}`);
        }}
        onStartChannelCall={(chan) => {
          setIsTeamHubOpen(false);
          handleQuickJoin(chan.id);
        }}
        onSelectChannel={(chan) => {
          setIsTeamHubOpen(false);
          setTargetChat({ id: chan.id, name: chan.name, isChannel: true });
          setActiveTab('messages');
        }}
      />

      {/* ── Enterprise Admin Console Modal ── */}
      <ErrorBoundary
        fallbackTitle="Unable to load Admin Console"
        onReset={() => setIsAdminConsoleOpen(false)}
      >
        <MobileAdminConsoleModal
          isOpen={isAdminConsoleOpen}
          token={token}
          currentUser={user}
          onClose={() => {
            lastAdminConsoleClosedRef.current = Date.now();
            setIsAdminConsoleOpen(false);
          }}
        />
      </ErrorBoundary>

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
