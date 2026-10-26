import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE, SOCKET_URL, getStoredToken } from '../config';

// ── Web Audio Synthetic Chimes (Zero asset latency, offline support) ──
function playToneChime(type: 'join' | 'leave' | 'chat') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'join') {
      // Pleasant rising tone (Google Meet style)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'leave') {
      // Soft descending tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'chat') {
      // Subtle pop chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(820, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (_) {}
}

const NetworkSignalIndicator: React.FC<{ isPoor?: boolean }> = ({ isPoor = false }) => (
  <div
    title={isPoor ? 'Weak Connection' : 'Great 4G / Wi-Fi Signal'}
    style={{
      display: 'inline-flex',
      alignItems: 'flex-end',
      gap: 1.5,
      height: 10,
      marginLeft: 2,
    }}
  >
    <span style={{ width: 2.5, height: 4, borderRadius: 0.5, backgroundColor: isPoor ? '#ef4444' : '#22c55e' }} />
    <span style={{ width: 2.5, height: 7, borderRadius: 0.5, backgroundColor: isPoor ? 'rgba(239, 68, 68, 0.3)' : '#22c55e' }} />
    <span style={{ width: 2.5, height: 10, borderRadius: 0.5, backgroundColor: isPoor ? 'rgba(239, 68, 68, 0.2)' : '#22c55e' }} />
  </div>
);

interface RemoteParticipant {
  userId: string;
  displayName: string;
  isVideoOff?: boolean;
  isMuted?: boolean;
}

interface MobileMeetingRoomProps {
  meetingId: string;
  displayName: string;
  initialAudioOff?: boolean;
  initialVideoOff?: boolean;
  showInitialInvite?: boolean;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onLeave: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export const MobileMeetingRoom: React.FC<MobileMeetingRoomProps> = ({
  meetingId,
  displayName,
  initialAudioOff = false,
  initialVideoOff = false,
  showInitialInvite = false,
  isMinimized = false,
  onMinimize,
  onMaximize,
  onLeave,
}) => {
  const resolvedDisplayName = (displayName && displayName !== 'Guest User')
    ? displayName
    : (localStorage.getItem('jts_display_name') || localStorage.getItem('jts_user_name') || 'Mohit');

  const [isMuted, setIsMuted] = useState(initialAudioOff);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSheet, setActiveSheet] = useState<'none' | 'chat' | 'participants' | 'invite' | 'more'>(
    showInitialInvite ? 'invite' : 'none'
  );
  const [chatMessages, setChatMessages] = useState<
    Array<{ id?: string; sender: string; text: string; time: string; timestamp?: number; isPending?: boolean }>
  >([]);
  const [msgInput, setMsgInput] = useState('');
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [screenSharingUserId, setScreenSharingUserId] = useState<string | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [timer, setTimer] = useState('00:00');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showMutedSpeakingToast, setShowMutedSpeakingToast] = useState(false);
  const mutedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const activeSheetRef = useRef(activeSheet);
  activeSheetRef.current = activeSheet;

  // Auto-scroll chat to bottom & reset unread counter when chat sheet opens
  useEffect(() => {
    if (activeSheet === 'chat') {
      setUnreadChatCount(0);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeSheet]);

  // Landscape & Controls Auto-hide (Google Meet Style)
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  const [showControls, setShowControls] = useState(true);
  const [isFullscreenShare, setIsFullscreenShare] = useState(false);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
    const landscape = typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false;
    if (landscape || isFullscreenShare) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  useEffect(() => {
    const handleOrientationOrResize = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      if (landscape || isFullscreenShare) {
        resetControlsTimer();
      } else {
        setShowControls(true);
        if (hideControlsTimerRef.current) {
          clearTimeout(hideControlsTimerRef.current);
          hideControlsTimerRef.current = null;
        }
      }
    };

    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);

    if (window.innerWidth > window.innerHeight || isFullscreenShare) {
      resetControlsTimer();
    }

    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isFullscreenShare]);

  const handleStageTap = () => {
    if (isLandscape || isFullscreenShare) {
      if (!showControls) {
        resetControlsTimer();
      } else {
        setShowControls(false);
        if (hideControlsTimerRef.current) {
          clearTimeout(hideControlsTimerRef.current);
          hideControlsTimerRef.current = null;
        }
      }
    }
  };

  // Advanced & Mobile Premier Features
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>({});
  const [networkStatus, setNetworkStatus] = useState<'online' | 'reconnecting'>('online');
  const [reconnectBannerText, setReconnectBannerText] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; senderName: string; left: number }>>([]);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [isHost, setIsHost] = useState(showInitialInvite);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [isSharingMyScreen, setIsSharingMyScreen] = useState(false);
  const [selfCorner, setSelfCorner] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'minimized'>('bottom-right');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isBlurActive, setIsBlurActive] = useState(false);

  // Screen share only where the WebView actually supports it (Android WebView does not)
  const canScreenShare = typeof navigator !== 'undefined' && !!(navigator.mediaDevices as any)?.getDisplayMedia;

  // Resolves once local camera/mic is ready, so we never join/negotiate without our own tracks
  const mediaReadyResolveRef = useRef<() => void>(() => {});
  const mediaReadyPromiseRef = useRef<Promise<void> | null>(null);
  if (!mediaReadyPromiseRef.current) {
    mediaReadyPromiseRef.current = new Promise<void>((resolve) => {
      mediaReadyResolveRef.current = resolve;
    });
  }
  const peerIdMapRef = useRef<Record<string, string>>({});

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const peerStreamsRef = useRef<Record<string, MediaStream>>({});
  const timerSecRef = useRef(0);
  const myUserIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Record<string, { analyser: AnalyserNode; dataArray: Uint8Array<ArrayBuffer> }>>({});

  const meetingUrl = `https://meet.jtsmiddleeast.com/meet/${meetingId}`;

  // 1. Android Native Back Button Intercept (Capacitor)
  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', () => {
      if (showLeaveConfirm) {
        setShowLeaveConfirm(false);
      } else if (activeSheetRef.current !== 'none') {
        setActiveSheet('none');
      } else if (isFullscreenShare) {
        setIsFullscreenShare(false);
      } else {
        setShowLeaveConfirm(true);
      }
    });

    return () => {
      backListener.then((h: any) => h.remove()).catch(() => {});
    };
  }, [showLeaveConfirm, isFullscreenShare]);

  // 1b. Active Speaker & Speaking While Muted Detector (Real-time Web Audio Analyser)
  useEffect(() => {
    if (!localStream) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animFrame: number | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      audioCtx = new AudioCtx();
      const rawTrackStream = new MediaStream([audioTracks[0].clone()]);
      const source = audioCtx.createMediaStreamSource(rawTrackStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingFrames = 0;
      let quietFrames = 0;

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        if (isMuted) {
          if (avg > 24) {
            speakingFrames++;
            if (speakingFrames > 8) {
              setShowMutedSpeakingToast(true);
              if (mutedToastTimeoutRef.current) clearTimeout(mutedToastTimeoutRef.current);
              mutedToastTimeoutRef.current = setTimeout(() => {
                setShowMutedSpeakingToast(false);
              }, 3200);
              speakingFrames = 0;
            }
          } else {
            speakingFrames = Math.max(0, speakingFrames - 1);
          }
          setSpeakingUsers((prev) => (prev['local'] ? { ...prev, local: false } : prev));
        } else {
          if (avg > 18) {
            quietFrames = 0;
            setSpeakingUsers((prev) => {
              if (!prev['local']) {
                socketRef.current?.emit('meeting:speaking', { meetingId, isSpeaking: true });
                return { ...prev, local: true };
              }
              return prev;
            });
          } else {
            quietFrames++;
            if (quietFrames > 14) {
              setSpeakingUsers((prev) => {
                if (prev['local']) {
                  socketRef.current?.emit('meeting:speaking', { meetingId, isSpeaking: false });
                  return { ...prev, local: false };
                }
                return prev;
              });
            }
          }
        }
        animFrame = requestAnimationFrame(checkVolume);
      };

      animFrame = requestAnimationFrame(checkVolume);
    } catch (_) {}

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [localStream, isMuted, meetingId]);

  // 2. Call Timer
  useEffect(() => {
    const interval = setInterval(() => {
      timerSecRef.current += 1;
      const m = Math.floor(timerSecRef.current / 60).toString().padStart(2, '0');
      const s = (timerSecRef.current % 60).toString().padStart(2, '0');
      setTimer(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Screen WakeLock (Prevent Phone Screen from Turning Off) & Network Watchdog
  useEffect(() => {
    let wakeLockSentinel: any = null;
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (_) {}
    }
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleOnline = () => {
      setNetworkStatus('online');
      setReconnectBannerText('Connected! Re-syncing audio & video...');
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        try { pc.restartIce(); } catch (_) {}
      });
      setTimeout(() => setReconnectBannerText(null), 2500);
    };

    const handleOffline = () => {
      setNetworkStatus('reconnecting');
      setReconnectBannerText('Network disconnected. Reconnecting...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
      try {
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
      } catch (_) {}
    };
  }, []);

  // Attach local tracks to a peer connection. Returns true if renegotiation is required.
  const attachLocalTracks = (pc: RTCPeerConnection, stream: MediaStream): boolean => {
    let needsNegotiation = false;
    stream.getTracks().forEach((track) => {
      const existing = pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (existing) {
        if (existing.track !== track) existing.replaceTrack(track).catch(() => {});
        return;
      }
      // Reuse an idle transceiver created by the remote offer (recv-only slot)
      const idle = pc.getTransceivers().find(
        (t) => !t.sender.track && t.receiver.track?.kind === track.kind && t.direction !== 'stopped'
      );
      if (idle) {
        idle.sender.replaceTrack(track).catch(() => {});
        try {
          (idle.sender as any).setStreams?.(stream);
        } catch (_) {}
        if (idle.direction !== 'sendrecv' && idle.direction !== 'sendonly') {
          try {
            idle.direction = 'sendrecv';
          } catch (_) {}
          needsNegotiation = true;
        }
      } else {
        pc.addTrack(track, stream);
        needsNegotiation = true;
      }
    });
    return needsNegotiation;
  };

  // Apply ICE candidates that arrived before the remote description
  const flushPendingIce = async (pc: RTCPeerConnection) => {
    const queue: any[] = (pc as any).__pendingIce || [];
    (pc as any).__pendingIce = [];
    for (const c of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (_) {}
    }
  };

  // Send a fresh offer to a peer (used when our camera/mic becomes available after connecting)
  const renegotiate = async (normId: string, attempt = 0) => {
    const pc = peerConnectionsRef.current[normId];
    const socket = socketRef.current;
    if (!pc || !socket) return;
    if (pc.signalingState !== 'stable') {
      if (attempt < 5) setTimeout(() => renegotiate(normId, attempt + 1), 1200);
      return;
    }
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', {
        targetUserId: peerIdMapRef.current[normId] || normId,
        meetingId,
        offer,
        displayName,
        isVideoOff,
        isMuted,
      });
    } catch (err) {
      console.warn('[Mobile WebRTC] Renegotiation failed:', err);
    }
  };

  // 3. Local Camera & Mic Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    async function startMedia() {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (videoErr) {
          console.warn('[Mobile] Camera unavailable, falling back to audio only:', videoErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (isMuted) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        if (isVideoOff) {
          stream.getVideoTracks().forEach((t) => (t.enabled = false));
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        socketRef.current?.emit('meeting:camera-toggle', { meetingId, isVideoOff });
        socketRef.current?.emit('meeting:mic-toggle', { meetingId, isMuted });

        // Add or update tracks on existing peer connections (+ renegotiate if new tracks were added)
        Object.entries(peerConnectionsRef.current).forEach(([normId, pc]) => {
          if (attachLocalTracks(pc, stream!)) {
            renegotiate(normId);
          }
        });
      } catch (err) {
        console.error('Failed to get media devices:', err);
      } finally {
        mediaReadyResolveRef.current();
      }
    }
    startMedia();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  // Helper: Create/Retrieve Peer Connection
  const getOrCreatePeerConnection = (targetUserId: string, targetName: string): RTCPeerConnection => {
    const normId = targetUserId.toLowerCase();
    if (peerConnectionsRef.current[normId]) {
      return peerConnectionsRef.current[normId];
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      bundlePolicy: 'max-bundle',
    });
    peerConnectionsRef.current[normId] = pc;
    peerIdMapRef.current[normId] = targetUserId;

    // Add local tracks
    if (localStreamRef.current) {
      attachLocalTracks(pc, localStreamRef.current);
    }

    // On remote track arrival (camera or screen share)
    pc.ontrack = (event) => {
      let pStream = peerStreamsRef.current[normId];
      if (!pStream) {
        pStream = new MediaStream();
        peerStreamsRef.current[normId] = pStream;
      }

      // Remove superseded track of same kind (e.g. camera replaced by screen share)
      pStream.getTracks().forEach((oldTrack) => {
        if (oldTrack.kind === event.track.kind && oldTrack.id !== event.track.id) {
          try {
            pStream.removeTrack(oldTrack);
          } catch (_) {}
        }
      });

      if (!pStream.getTracks().some((t) => t.id === event.track.id)) {
        pStream.addTrack(event.track);
      }

      const freshStream = new MediaStream(pStream.getTracks());
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: freshStream,
        [normId]: freshStream,
      }));

      setParticipants((prev) => {
        if (!prev.some((p) => p.userId.toLowerCase() === normId)) {
          return [...prev, { userId: targetUserId, displayName: targetName || 'Participant' }];
        }
        return prev;
      });
    };

    // On ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', {
          targetUserId,
          meetingId,
          candidate: event.candidate,
        });
      }
    };

    // Auto-recover if ICE failed; DO NOT delete participant on temporary disconnected state!
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch (_) {}
      }
    };

    return pc;
  };

  const cleanupPeer = (targetUserId: string) => {
    const normId = targetUserId.toLowerCase();
    try {
      peerConnectionsRef.current[normId]?.close();
    } catch (_) {}
    delete peerConnectionsRef.current[normId];
    delete peerStreamsRef.current[normId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[targetUserId];
      delete next[normId];
      return next;
    });
    setParticipants((prev) => prev.filter((p) => p.userId.toLowerCase() !== normId));
    setScreenSharingUserId((prev) => (prev?.toLowerCase() === normId ? null : prev));
  };

  // 4. Socket & WebRTC Signaling
  useEffect(() => {
    let socket: Socket | null = null;
    let isCancelled = false;

    async function initConnection() {
      let token = getStoredToken();

      if (!token) {
        try {
          const res = await fetch(`${API_BASE}/api/guest/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId, guestName: resolvedDisplayName }),
          });
          const data = await res.json();
          if (data.success && data.data?.token) {
            token = data.data.token;
            myUserIdRef.current = data.data.userId || '';
          }
        } catch (err) {
          console.error('[Mobile] Failed to obtain guest token:', err);
        }
      }

      if (isCancelled) return;

      // Wait for our own camera/mic (max 15s) so the first offer/answer already carries our video
      await Promise.race([
        mediaReadyPromiseRef.current,
        new Promise<void>((resolve) => setTimeout(resolve, 15000)),
      ]);

      if (isCancelled) return;

      socket = io(SOCKET_URL, {
        auth: { token: token || '' },
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket?.emit('webrtc:join', {
          meetingId,
          displayName: resolvedDisplayName,
          isVideoOff,
          isMuted,
        });
        socket?.emit('meeting:camera-toggle', { meetingId, isVideoOff });
        socket?.emit('meeting:video-toggle', { meetingId, isVideoOff });
        socket?.emit('meeting:mic-toggle', { meetingId, isMuted });
        socket?.emit('meeting:audio-toggle', { meetingId, isMuted });
      });

      // Existing peers in room: Register them & wait for their offer.
      // Set failsafe timer (1500ms) to initiate offer if peer did not start.
      socket.on('webrtc:join', async (payload: { meetingId: string; peers?: any[]; participants?: number }) => {
        if (payload?.peers && Array.isArray(payload.peers)) {
          for (const peer of payload.peers) {
            if (!peer.userId || peer.userId.toLowerCase() === myUserIdRef.current.toLowerCase()) continue;

            const normId = peer.userId.toLowerCase();
            setParticipants((prev) => {
              if (!prev.some((p) => p.userId.toLowerCase() === normId)) {
                return [...prev, { userId: peer.userId, displayName: peer.displayName || 'Participant', isVideoOff: peer.isVideoOff, isMuted: peer.isMuted }];
              }
              return prev;
            });

            const pc = getOrCreatePeerConnection(peer.userId, peer.displayName);
            // Failsafe: if remote hasn't sent us an offer in 1500ms, initiate offer from mobile
            setTimeout(async () => {
              if (pc.signalingState === 'stable' && !peerStreamsRef.current[normId] && socket?.connected) {
                try {
                  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                  await pc.setLocalDescription(offer);
                  socket?.emit('webrtc:offer', {
                    targetUserId: peer.userId,
                    meetingId,
                    offer,
                    displayName,
                    isVideoOff,
                    isMuted,
                  });
                } catch (_) {}
              }
            }, 1500);
          }
        }
      });

      // New user joined: We are the existing peer, so we initiate the offer immediately!
      socket.on('webrtc:user-joined', async (payload: { userId: string; meetingId: string; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
        if (!payload?.userId || payload.userId.toLowerCase() === myUserIdRef.current.toLowerCase()) return;
        playToneChime('join');
        const normId = payload.userId.toLowerCase();

        setParticipants((prev) => {
          if (!prev.some((p) => p.userId.toLowerCase() === normId)) {
            return [...prev, { userId: payload.userId, displayName: payload.displayName || 'Participant', isVideoOff: payload.isVideoOff, isMuted: payload.isMuted }];
          }
          return prev;
        });

        try {
          const pc = getOrCreatePeerConnection(payload.userId, payload.displayName || 'Participant');
          if (localStreamRef.current) {
            attachLocalTracks(pc, localStreamRef.current);
          }
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          socket?.emit('webrtc:offer', {
            targetUserId: payload.userId,
            meetingId,
            offer,
            displayName: resolvedDisplayName,
            isVideoOff,
            isMuted,
          });
        } catch (err) {
          console.error('[Mobile WebRTC] Offer error to joining user:', err);
        }
      });

      // Offer from peer
      socket.on('webrtc:offer', async (payload: { fromUserId: string; offer: any; displayName?: string; isVideoOff?: boolean; isMuted?: boolean }) => {
        try {
          const pc = getOrCreatePeerConnection(payload.fromUserId, payload.displayName || 'Participant');
          if (pc.signalingState === 'have-local-offer') {
            // Offer collision: rollback local offer and accept incoming remote offer
            try {
              await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
            } catch (_) {}
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          await flushPendingIce(pc);
          // Make sure our local camera/mic tracks are attached before answering
          let needsFollowUp = false;
          if (localStreamRef.current) {
            needsFollowUp = attachLocalTracks(pc, localStreamRef.current);
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit('webrtc:answer', {
            targetUserId: payload.fromUserId,
            meetingId,
            answer,
            displayName: resolvedDisplayName,
            isVideoOff,
            isMuted,
          });
          if (needsFollowUp) {
            setTimeout(() => renegotiate(payload.fromUserId.toLowerCase()), 800);
          }
        } catch (err) {
          console.error('[Mobile WebRTC] Offer handling error:', err);
        }
      });

      // Answer from peer
      socket.on('webrtc:answer', async (payload: { fromUserId: string; answer: any }) => {
        try {
          const normId = payload.fromUserId.toLowerCase();
          const pc = peerConnectionsRef.current[normId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            await flushPendingIce(pc);
          }
        } catch (err) {
          console.error('[Mobile WebRTC] Answer handling error:', err);
        }
      });

      // ICE candidate
      socket.on('webrtc:ice-candidate', async (payload: { fromUserId: string; candidate: any }) => {
        try {
          const normId = payload.fromUserId.toLowerCase();
          const pc = peerConnectionsRef.current[normId];
          if (pc && payload.candidate) {
            if (!pc.remoteDescription) {
              const queue = ((pc as any).__pendingIce ||= []) as any[];
              queue.push(payload.candidate);
              return;
            }
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch (_) {}
      });

      // Screen Share Started by remote user
      socket.on('screen:start', (payload: { userId: string }) => {
        console.log('[Mobile WebRTC] Screen share started by:', payload.userId);
        setScreenSharingUserId(payload.userId);
      });

      socket.on('screen:changed', (payload: { userId: string; active: boolean }) => {
        console.log('[Mobile WebRTC] Screen share changed:', payload);
        setScreenSharingUserId(payload.active ? payload.userId : null);
      });

      socket.on('screen:stop', () => {
        console.log('[Mobile WebRTC] Screen share stopped');
        setScreenSharingUserId(null);
      });

      // User Left -> Clean up properly and play soft leave chime
      socket.on('webrtc:user-left', (payload: { userId: string }) => {
        playToneChime('leave');
        cleanupPeer(payload.userId);
      });
      socket.on('meeting:leave', (payload: { userId: string }) => {
        if (payload?.userId) {
          playToneChime('leave');
          cleanupPeer(payload.userId);
        }
      });
      socket.on('meeting:user-left', (payload: { userId: string }) => {
        if (payload?.userId) {
          playToneChime('leave');
          cleanupPeer(payload.userId);
        }
      });

      // Mic/Video toggles from peers
      const handleRemoteMic = (payload: { userId: string; isMuted: boolean }) => {
        const normId = payload.userId.toLowerCase();
        setParticipants((prev) =>
          prev.map((p) => (p.userId.toLowerCase() === normId ? { ...p, isMuted: payload.isMuted } : p))
        );
      };
      socket.on('meeting:mic-toggle', handleRemoteMic);
      socket.on('meeting:audio-toggle', handleRemoteMic);

      const handleRemoteVideo = (payload: { userId: string; isVideoOff: boolean }) => {
        const normId = payload.userId.toLowerCase();
        setParticipants((prev) =>
          prev.map((p) => (p.userId.toLowerCase() === normId ? { ...p, isVideoOff: payload.isVideoOff } : p))
        );
      };
      socket.on('meeting:video-toggle', handleRemoteVideo);
      socket.on('meeting:camera-toggle', handleRemoteVideo);

      // Role update from server (Host vs Guest/Participant)
      socket.on('meeting:role', (payload: { role?: string; isHost?: boolean }) => {
        if (payload?.isHost === true || payload?.role === 'host' || payload?.role === 'co-host') {
          setIsHost(true);
        } else {
          setIsHost(false);
        }
      });

      // Active Speaker update from other participants
      socket.on('meeting:speaking', (payload: { userId: string; isSpeaking: boolean }) => {
        if (!payload?.userId) return;
        const normId = payload.userId.toLowerCase();
        setSpeakingUsers((prev) => ({
          ...prev,
          [normId]: payload.isSpeaking,
        }));
      });

      // Chat messages (with strict deduplication for optimistic vs server broadcast)
      socket.on('meeting:chat:receive', (msg: any) => {
        const msgText = msg.message || msg.text || '';
        const msgSender = msg.senderName || msg.sender || resolvedDisplayName;
        const msgId = msg._id || msg.id;

        if (activeSheetRef.current !== 'chat' && msgSender !== resolvedDisplayName) {
          setUnreadChatCount((cnt) => cnt + 1);
          playToneChime('chat');
        }

        setChatMessages((prev) => {
          // 1. Exact message ID deduplication
          if (msgId && prev.some((p) => p.id === msgId)) {
            return prev;
          }
          // 2. Resolve optimistic pending message sent by us
          const pendingIdx = prev.findIndex((p) => p.isPending && p.text === msgText);
          if (pendingIdx !== -1) {
            const updated = [...prev];
            updated[pendingIdx] = {
              id: msgId || updated[pendingIdx].id,
              sender: msgSender,
              text: msgText,
              time: updated[pendingIdx].time,
              timestamp: updated[pendingIdx].timestamp,
              isPending: false,
            };
            return updated;
          }
          // 3. Time-window deduplication (guard against duplicate broadcast of recent message)
          const isRecentDup = prev.some(
            (p) => p.text === msgText && (p.sender === msgSender || p.sender === resolvedDisplayName) && Date.now() - (p.timestamp || 0) < 3000
          );
          if (isRecentDup) {
            return prev;
          }

          return [
            ...prev,
            {
              id: msgId || 'm_' + Date.now(),
              sender: msgSender,
              text: msgText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: Date.now(),
              isPending: false,
            },
          ];
        });
      });

      // Emoji Reactions Broadcast
      socket.on('meeting:reaction', (payload: any) => {
        if (!payload?.emoji) return;
        const newReaction = {
          id: payload.id || 'r_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          emoji: payload.emoji,
          senderName: payload.senderName || 'Participant',
          left: payload.left || (15 + Math.floor(Math.random() * 70)),
        };
        setReactions((prev) => [...prev.slice(-15), newReaction]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 2800);
      });

      // Host Mute All Broadcast
      socket.on('meeting:mute-all', () => {
        setIsMuted(true);
        localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
        socket?.emit('meeting:audio-toggle', { meetingId, isMuted: true });
      });

      // Host Lock Toggle Broadcast
      socket.on('meeting:lock-toggle', (payload: { isLocked: boolean }) => {
        setIsRoomLocked(payload.isLocked);
      });
    }

    initConnection();

    return () => {
      isCancelled = true;
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.keys(peerConnectionsRef.current).forEach((id) => cleanupPeer(id));
      socket?.emit('meeting:leave', { meetingId });
      socket?.disconnect();
    };
  }, [meetingId, displayName]);

  // Mobile Screen Sharing (Broadcast Phone Screen to Call)
  const startPhoneScreenShare = async () => {
    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(screenTrack);
            }
          });

          setIsSharingMyScreen(true);
          socketRef.current?.emit('screen:start', { meetingId });

          screenTrack.onended = () => {
            stopPhoneScreenShare();
          };
          return;
        }
      }
    } catch (err: any) {
      console.warn('[ScreenShare] Start cancelled or failed:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        return;
      }
    }

    // Fallback: If Android WebView blocks getDisplayMedia, open in Chrome seamlessly
    const meetingUrl = `https://meet.jtsmiddleeast.com/#meeting?id=${encodeURIComponent(meetingId)}&name=${encodeURIComponent(resolvedDisplayName)}`;
    const shouldOpen = window.confirm(
      'Phone screen sharing requires Chrome browser. Open this meeting in Chrome now to share your screen?'
    );
    if (shouldOpen) {
      window.open(meetingUrl, '_system');
    }
  };

  const stopPhoneScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(camTrack);
        }
      });
    }
    setIsSharingMyScreen(false);
    socketRef.current?.emit('screen:stop', { meetingId });
  };

  // Floating Emoji Reaction Helper
  const sendReaction = (emoji: string) => {
    setShowReactionsBar(false);
    socketRef.current?.emit('meeting:reaction', {
      meetingId,
      emoji,
      senderName: displayName,
    });
    const newReaction = {
      id: 'local_' + Date.now(),
      emoji,
      senderName: 'You',
      left: 20 + Math.floor(Math.random() * 60),
    };
    setReactions((prev) => [...prev.slice(-15), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);
  };

  // Host Action Helpers
  const handleHostMuteAll = () => {
    if (window.confirm('Mute all other participants in this meeting?')) {
      socketRef.current?.emit('meeting:mute-all', { meetingId });
    }
  };

  const handleHostToggleLock = () => {
    const nextLocked = !isRoomLocked;
    setIsRoomLocked(nextLocked);
    socketRef.current?.emit('meeting:lock-toggle', { meetingId, isLocked: nextLocked });
  };

  // Controls
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    socketRef.current?.emit('meeting:audio-toggle', { meetingId, isMuted: next });
    socketRef.current?.emit('meeting:mic-toggle', { meetingId, isMuted: next });
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    socketRef.current?.emit('meeting:video-toggle', { meetingId, isVideoOff: next });
    socketRef.current?.emit('meeting:camera-toggle', { meetingId, isVideoOff: next });
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleSpeaker = () => {
    setIsSpeaker((prev) => !prev);
  };

  const toggleHand = () => {
    setIsHandRaised((prev) => !prev);
    socketRef.current?.emit('meeting:raise-hand', { meetingId, raised: !isHandRaised });
  };

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(meetingUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2200);
    }
  };

  const handleNativeShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join JTS Meet Call',
          text: `Join my video meeting on JTS Meet:\nMeeting ID: ${meetingId}\n${meetingUrl}`,
          url: meetingUrl,
        });
      } catch (_) {}
    } else {
      handleCopyInvite();
    }
  };

  const handleWhatsAppShareInvite = () => {
    const text = encodeURIComponent(`Join my video meeting on JTS Meet:\nMeeting ID: ${meetingId}\n${meetingUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = msgInput.trim();
    if (!cleanMsg) return;

    const tempId = 'temp_' + Date.now();
    const newMsg = {
      senderName: resolvedDisplayName,
      message: cleanMsg,
      meetingId,
    };

    setChatMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: resolvedDisplayName,
        text: cleanMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isPending: true,
      },
    ]);

    socketRef.current?.emit('meeting:chat:send', newMsg);
    setMsgInput('');
  };

  // Find presenter if active (screen share or user-focused tile)
  const activePresenterId = screenSharingUserId || focusedUserId;
  const presenter = activePresenterId
    ? participants.find((p) => p.userId.toLowerCase() === activePresenterId.toLowerCase())
    : null;
  const presenterStream = activePresenterId
    ? remoteStreams[activePresenterId] || remoteStreams[activePresenterId.toLowerCase()]
    : null;

  // ── PICTURE IN PICTURE MINI-CARD VIEW ──
  if (isMinimized) {
    const activePipStream = presenterStream || Object.values(remoteStreams)[0] || localStreamRef.current;

    return (
      <div
        onClick={onMaximize}
        style={{
          position: 'fixed',
          bottom: 78,
          right: 12,
          width: 148,
          height: 218,
          borderRadius: 16,
          backgroundColor: '#090d16',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
          border: '2px solid #2563eb',
          zIndex: 99999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
        }}
      >
        {/* Top Header of Mini PiP */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '6px 8px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 800 }}>
            {timer}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMaximize?.();
              }}
              title="Expand Meeting"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeave();
              }}
              title="Leave Call"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mini Video Feed */}
        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
          {activePipStream ? (
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el && activePipStream && el.srcObject !== activePipStream) {
                  el.srcObject = activePipStream;
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: presenterStream ? 'contain' : 'cover',
              }}
            />
          ) : (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: 8 }}>
              {displayName}
            </div>
          )}
        </div>

        {/* Keep audio tracks alive in mini PiP mode */}
        <div style={{ display: 'none' }}>
          {participants.map((peer) => {
            const s = remoteStreams[peer.userId] || remoteStreams[peer.userId.toLowerCase()];
            return s ? (
              <audio
                key={peer.userId}
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && s && el.srcObject !== s) el.srcObject = s;
                }}
              />
            ) : null;
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: '#090d16',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Bar (Clean & Uncluttered: Minimize, Audio, Flip, Code & Leave) ── */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          resetControlsTimer();
        }}
        style={{
          paddingTop: 'calc(var(--safe-top) + 8px)',
          paddingBottom: 10,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 35,
          position: (isLandscape || isFullscreenShare) ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          right: 0,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          transform: (!showControls && (isLandscape || isFullscreenShare)) ? 'translateY(-100%)' : 'translateY(0)',
          opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0 : 1,
          pointerEvents: (!showControls && (isLandscape || isFullscreenShare)) ? 'none' : 'auto',
        }}
      >
        {/* Left: Minimize (PiP) + Speaker + Flip Camera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Minimize into PiP button */}
          <button
            onClick={onMinimize}
            title="Minimize to Picture-in-Picture"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Speaker route */}
          <button
            onClick={toggleSpeaker}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: isSpeaker ? '#38bdf8' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>

          {/* Flip camera */}
          <button
            onClick={flipCamera}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.008.74 3.843 1.967 5.25L4 17h5v-5l-1.84 1.84C6.34 12.67 6 11.38 6 10c0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.38-.34 2.67-1.16 3.84L15 12v5h5l-1.967-1.75C19.26 13.843 20 12.008 20 10z" />
            </svg>
          </button>
        </div>

        {/* Center: Meeting Code & Call Duration */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
            {meetingId}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {timer}
          </span>
        </div>

        {/* Right: Leave Button with Accidental Tap Protection */}
        <button
          onClick={() => setShowLeaveConfirm(true)}
          style={{
            padding: '6px 14px',
            borderRadius: 16,
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 800,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
          }}
        >
          Leave
        </button>
      </div>

      {/* ── Network Reconnecting / Offline Banner ── */}
      {reconnectBannerText && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(var(--safe-top) + 54px)',
            left: 14,
            right: 14,
            zIndex: 100,
            padding: '8px 14px',
            borderRadius: 12,
            backgroundColor: networkStatus === 'online' ? '#16a34a' : '#d97706',
            color: '#ffffff',
            fontSize: '0.76rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ffffff' }} />
          <span>{reconnectBannerText}</span>
        </div>
      )}

      {/* ── Active Screen Share Banner (Phone) ── */}
      {isSharingMyScreen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(var(--safe-top) + 54px)',
            left: 14,
            right: 14,
            zIndex: 95,
            padding: '6px 14px',
            borderRadius: 20,
            backgroundColor: 'rgba(34, 197, 94, 0.92)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📱 You are sharing your screen</span>
          </div>
          <button
            onClick={stopPhoneScreenShare}
            style={{
              padding: '3px 12px',
              borderRadius: 12,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
            }}
          >
            Stop
          </button>
        </div>
      )}

      {/* ── Floating Emoji Reactions Overlay ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 80,
        }}
      >
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{
              position: 'absolute',
              bottom: 90,
              left: `${r.left}%`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'floatUpSway 2.8s ease-out forwards',
            }}
          >
            <span style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
              {r.emoji}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '1px 6px',
                borderRadius: 8,
                marginTop: 2,
              }}
            >
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main Stage Area (Handles Screen Sharing & Video Tiles) ── */}
      <div
        onClick={handleStageTap}
        style={{
          flex: 1,
          width: '100%',
          height: (isLandscape || isFullscreenShare) ? '100%' : 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* CASE 1: SCREEN SHARING ACTIVE OR USER PINNED -> SCREEN TAKES FULL STAGE */}
        {/* CASE 1: SCREEN SHARING ACTIVE OR USER PINNED -> SCREEN TAKES FULL STAGE */}
        {activePresenterId ? (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Top-Left Presenter Badge (Safe from notch/status bar) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                resetControlsTimer();
              }}
              style={{
                position: 'absolute',
                top: (isLandscape || isFullscreenShare)
                  ? (showControls ? 'calc(var(--safe-top, 28px) + 54px)' : 'calc(var(--safe-top, 28px) + 12px)')
                  : 'calc(var(--safe-top, 28px) + 10px)',
                left: 12,
                zIndex: 35,
                padding: '6px 12px',
                borderRadius: 20,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                color: '#60a5fa',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(59, 130, 246, 0.35)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0.5 : 1,
                pointerEvents: 'auto',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                maxWidth: '55%',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ flexShrink: 0 }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {presenter?.displayName || 'Someone'}'s Screen
              </span>
            </div>

            {/* Top-Right Floating Controls (PURE ICONS, ALWAYS ACCESSIBLE & SAFE FROM STATUS BAR) */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: (isLandscape || isFullscreenShare)
                  ? (showControls ? 'calc(var(--safe-top, 28px) + 54px)' : 'calc(var(--safe-top, 28px) + 12px)')
                  : 'calc(var(--safe-top, 28px) + 10px)',
                right: 12,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                borderRadius: 24,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'opacity 0.25s ease, top 0.25s ease',
                opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0.65 : 1,
                pointerEvents: 'auto',
              }}
            >
              {/* Aspect Ratio Fit / Fill Toggle (ICON ONLY) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'));
                  resetControlsTimer();
                }}
                title={videoFit === 'contain' ? 'Crop to Fill' : 'Fit to Screen'}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: videoFit === 'cover' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  {videoFit === 'contain' ? (
                    <path d="M7 12h10M12 9l3 3-3 3" />
                  ) : (
                    <path d="M12 8v8M9 11l3-3 3 3" />
                  )}
                </svg>
              </button>

              {/* Fullscreen Expand / Compress Toggle (ICON ONLY) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreenShare((prev) => !prev);
                  resetControlsTimer();
                }}
                title={isFullscreenShare ? 'Exit Full Screen' : 'Full Screen'}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: isFullscreenShare ? '#2563eb' : 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isFullscreenShare ? '1.5px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: isFullscreenShare ? '0 0 12px rgba(37, 99, 235, 0.6)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  {isFullscreenShare ? (
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                  ) : (
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  )}
                </svg>
              </button>

              {/* Unpin Presenter Button if user pinned (ICON ONLY) */}
              {focusedUserId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedUserId(null);
                    resetControlsTimer();
                  }}
                  title="Unpin"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.85)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="2" y1="2" x2="22" y2="22" />
                    <line x1="12" y1="17" x2="12" y2="22" />
                    <path d="M5 17h14v-2l-2-3V9" />
                    <path d="M9 3h6a2 2 0 0 1 2 2v4" />
                  </svg>
                </button>
              )}
            </div>

            {/* Screen Video Element (objectFit: contain for sharp text, toggleable to cover) */}
            <div
              onClick={() => {
                if (isLandscape || isFullscreenShare) {
                  setShowControls((prev) => !prev);
                  resetControlsTimer();
                }
              }}
              style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', cursor: 'pointer' }}
              onDoubleClick={() => setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
            >
              {presenterStream ? (
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => {
                    if (el && presenterStream && el.srcObject !== presenterStream) {
                      el.srcObject = presenterStream;
                      el.play().catch(() => {});
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: videoFit,
                    transition: 'all 0.2s ease',
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}>
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span style={{ fontSize: '0.85rem' }}>Loading {presenter?.displayName || 'screen'}...</span>
                </div>
              )}
            </div>

            {/* Bottom thumbnail strip of meeting participants (Hidden during Full Screen mode for 100% full view) */}
            {!isFullscreenShare && (
              <div
                style={{
                  position: 'absolute',
                  bottom: (isLandscape ? 12 : 12),
                  left: 12,
                  right: 12,
                  display: 'flex',
                  gap: 8,
                  zIndex: 20,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  transition: 'opacity 0.3s ease',
                  opacity: (!showControls && isLandscape) ? 0 : 1,
                  pointerEvents: (!showControls && isLandscape) ? 'none' : 'auto',
                }}
              >
                {participants.map((p) => (
                  <div
                    key={p.userId}
                    style={{
                      width: 72,
                      height: 90,
                      borderRadius: 10,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.62rem', color: '#fff', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64 }}>
                      {p.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : participants.length > 0 ? (
          /* CASE 2: NORMAL PARTICIPANT VIDEO/AVATAR GRID (Google Meet Style 1 to 10+ Dynamic Grid) */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns:
                participants.length <= 1
                  ? '1fr'
                  : participants.length === 2
                  ? (isLandscape ? '1fr 1fr' : '1fr')
                  : participants.length <= 4
                  ? '1fr 1fr'
                  : isLandscape
                  ? 'repeat(3, 1fr)'
                  : '1fr 1fr',
              gridTemplateRows:
                participants.length <= 1
                  ? '1fr'
                  : participants.length === 2
                  ? (isLandscape ? '1fr' : '1fr 1fr')
                  : participants.length <= 4
                  ? '1fr 1fr'
                  : participants.length <= 6
                  ? (isLandscape ? '1fr 1fr' : 'repeat(3, 1fr)')
                  : undefined,
              gridAutoRows: participants.length > 6 ? (isLandscape ? 'calc(50% - 6px)' : 'calc(33.33% - 6px)') : undefined,
              overflowY: participants.length > 6 ? 'auto' : 'hidden',
              gap: participants.length === 1 ? 0 : 8,
              padding: participants.length === 1 ? 0 : 8,
              backgroundColor: '#030712',
            }}
          >
            {participants.map((peer) => {
              const stream = remoteStreams[peer.userId] || remoteStreams[peer.userId.toLowerCase()];
              const hasLiveVideoTrack = !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
              const isScreen = activePresenterId?.toLowerCase() === peer.userId.toLowerCase() ||
                !!stream?.getVideoTracks().some((t) => t.label?.toLowerCase().includes('screen') || t.label?.toLowerCase().includes('display'));
              // Do NOT let peer.isVideoOff block live video! If live frames are present, display video!
              const shouldShowVideo = stream && hasLiveVideoTrack && (!peer.isVideoOff || isScreen);
              const normPeerId = peer.userId.toLowerCase();
              const isSpeaking = !!speakingUsers[normPeerId] && !peer.isMuted;

              return (
                <div
                  key={peer.userId}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: participants.length > 6 ? 140 : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f172a',
                    overflow: 'hidden',
                    border: isSpeaking ? '2.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isSpeaking ? '0 0 0 2px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.65)' : 'none',
                    borderRadius: participants.length > 1 ? 14 : 0,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Remote Audio Track Player */}
                  {stream && (
                    <audio
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el && stream && el.srcObject !== stream) el.srcObject = stream;
                      }}
                    />
                  )}

                  {/* Remote Video Stream Player */}
                  {shouldShowVideo ? (
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(el) => {
                        if (el && stream && el.srcObject !== stream) {
                          el.srcObject = stream;
                          el.play().catch(() => {});
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: isScreen ? 'contain' : 'cover',
                      }}
                    />
                  ) : (
                    /* Remote Participant Avatar */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: participants.length > 4 ? 54 : 76,
                          height: participants.length > 4 ? 54 : 76,
                          borderRadius: '50%',
                          background: isSpeaking ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          fontSize: participants.length > 4 ? '1.4rem' : '1.8rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSpeaking ? '0 0 20px rgba(59, 130, 246, 0.7)' : '0 8px 24px rgba(37, 99, 235, 0.35)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {peer.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: participants.length > 4 ? '0.78rem' : '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                        {peer.displayName}
                      </span>
                    </div>
                  )}

                  {/* Pin / Focus Screen Button (PURE ICON, NO TEXT, SAFE FROM STATUS BAR) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedUserId(focusedUserId === peer.userId ? null : peer.userId);
                    }}
                    title={focusedUserId === peer.userId ? 'Unpin' : 'Pin to screen'}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: focusedUserId === peer.userId ? '#2563eb' : 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: focusedUserId === peer.userId ? '1.5px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: focusedUserId === peer.userId ? '0 0 10px rgba(37, 99, 235, 0.5)' : 'none',
                      zIndex: 15,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill={focusedUserId === peer.userId ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                      <line x1="12" y1="17" x2="12" y2="22" />
                      <path d="M5 17h14v-2l-2-3V5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v7l-2 3v2z" />
                    </svg>
                  </button>

                  {/* Name badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: isSpeaking ? 'rgba(37, 99, 235, 0.9)' : 'rgba(0, 0, 0, 0.72)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      border: isSpeaking ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.12)',
                      maxWidth: '80%',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isSpeaking && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 12 }}>
                        <span style={{ width: 2, height: 8, background: '#93c5fd', borderRadius: 1, animation: 'soundWave 0.6s infinite ease-in-out' }} />
                        <span style={{ width: 2, height: 12, background: '#93c5fd', borderRadius: 1, animation: 'soundWave 0.8s infinite ease-in-out 0.2s' }} />
                        <span style={{ width: 2, height: 6, background: '#93c5fd', borderRadius: 1, animation: 'soundWave 0.5s infinite ease-in-out 0.4s' }} />
                      </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peer.displayName}</span>
                    <NetworkSignalIndicator isPoor={networkStatus === 'reconnecting'} />
                    {peer.isMuted && (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* CASE 3: ALONE IN MEETING -> SINGLE CLEAN CARD */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                color: '#ffffff',
                fontSize: '1.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
              }}
            >
              {resolvedDisplayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ marginTop: 12, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              {resolvedDisplayName} (You)
            </span>

            {/* Exactly 1 clean invite button */}
            <div
              style={{
                marginTop: 20,
                padding: '14px 18px',
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                maxWidth: 290,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                You're the only one here
              </span>
              <button
                onClick={() => setActiveSheet('invite')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Invite Link
              </button>
            </div>
          </div>
        )}

        {/* Floating Local PiP Tile (Tap to cycle corners or minimize; hidden in fullscreen) */}
        {!isFullscreenShare && (
          <div
            onClick={() => {
              setSelfCorner((prev) => {
                if (prev === 'bottom-right') return 'top-right';
                if (prev === 'top-right') return 'top-left';
                if (prev === 'top-left') return 'bottom-left';
                if (prev === 'bottom-left') return 'minimized';
                return 'bottom-right';
              });
            }}
            title="Tap to move camera tile out of the way"
            style={{
              position: 'absolute',
              ...(selfCorner === 'bottom-right'
                ? { bottom: (isLandscape ? 16 : 84), right: 12 }
                : selfCorner === 'top-right'
                ? { top: 64, right: 12 }
                : selfCorner === 'top-left'
                ? { top: 64, left: 12 }
                : selfCorner === 'bottom-left'
                ? { bottom: (isLandscape ? 16 : 84), left: 12 }
                : { bottom: 84, right: 12, width: 40, height: 40, borderRadius: '50%' }),
              ...(selfCorner !== 'minimized' ? { width: 92, height: 132, borderRadius: 12 } : {}),
              backgroundColor: '#111827',
              border: (speakingUsers['local'] && !isMuted) ? '2.5px solid #3b82f6' : '2px solid rgba(255, 255, 255, 0.25)',
              boxShadow: (speakingUsers['local'] && !isMuted) ? '0 0 0 2px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.65)' : '0 8px 24px rgba(0, 0, 0, 0.55)',
              zIndex: 25,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
              opacity: (!showControls && isLandscape) ? 0 : 1,
              pointerEvents: (!showControls && isLandscape) ? 'none' : 'auto',
            }}
          >
            {selfCorner === 'minimized' ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 800 }}>
                {resolvedDisplayName.charAt(0).toUpperCase()}
              </div>
            ) : (
              <>
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                      el.srcObject = localStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    filter: isBlurActive ? 'contrast(1.04) brightness(1.02)' : 'none',
                    display: isVideoOff ? 'none' : 'block',
                  }}
                />
                {isVideoOff && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#111827',
                      color: '#94a3b8',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Camera Off
                  </div>
                )}
                {isMuted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      padding: 3,
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                    }}
                  >
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    </svg>
                  </div>
                )}

                {/* Local Name Badge & Signal */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    padding: '2px 5px',
                    borderRadius: 6,
                    background: (speakingUsers['local'] && !isMuted) ? 'rgba(37, 99, 235, 0.9)' : 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    border: (speakingUsers['local'] && !isMuted) ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {(speakingUsers['local'] && !isMuted) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, height: 8 }}>
                      <span style={{ width: 1.5, height: 6, background: '#93c5fd', borderRadius: 0.5, animation: 'soundWave 0.6s infinite ease-in-out' }} />
                      <span style={{ width: 1.5, height: 8, background: '#93c5fd', borderRadius: 0.5, animation: 'soundWave 0.8s infinite ease-in-out 0.2s' }} />
                      <span style={{ width: 1.5, height: 5, background: '#93c5fd', borderRadius: 0.5, animation: 'soundWave 0.5s infinite ease-in-out 0.4s' }} />
                    </span>
                  )}
                  <span>You</span>
                  <NetworkSignalIndicator isPoor={networkStatus === 'reconnecting'} />
                </div>

                {isBlurActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      padding: '1px 5px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(37, 99, 235, 0.85)',
                      color: '#ffffff',
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    BLUR
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Reactions Float Bar (Above Bottom Controls) ── */}
      {showReactionsBar && showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: (isLandscape || isFullscreenShare) ? 'calc(var(--safe-bottom) + 60px)' : 'calc(var(--safe-bottom) + 72px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 30,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65)',
            zIndex: 40,
          }}
        >
          {['👍', '❤️', '👏', '🎉', '😂', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              style={{
                fontSize: '1.35rem',
                padding: '3px 6px',
                borderRadius: 8,
                transition: 'transform 0.15s ease',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom Controls Bar (Mic, Video, Share, React, Hand, Chat, People, More) ── */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          resetControlsTimer();
        }}
        style={{
          paddingTop: 8,
          paddingBottom: 'calc(var(--safe-bottom) + 8px)',
          paddingLeft: 8,
          paddingRight: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 35,
          overflowX: 'auto',
          position: (isLandscape || isFullscreenShare) ? 'absolute' : 'relative',
          bottom: 0,
          left: 0,
          right: 0,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          transform: (!showControls && (isLandscape || isFullscreenShare)) ? 'translateY(100%)' : 'translateY(0)',
          opacity: (!showControls && (isLandscape || isFullscreenShare)) ? 0 : 1,
          pointerEvents: (!showControls && (isLandscape || isFullscreenShare)) ? 'none' : 'auto',
        }}
      >
        {/* Mic */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: isMuted ? '#ef4444' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: isMuted ? '0 3px 10px rgba(239, 68, 68, 0.4)' : 'none',
          }}
        >
          {isMuted ? (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Video */}
        <button
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: isVideoOff ? '#ef4444' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: isVideoOff ? '0 3px 10px rgba(239, 68, 68, 0.4)' : 'none',
          }}
        >
          {isVideoOff ? (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
        </button>


        {/* Emoji Reactions */}
        <button
          onClick={() => setShowReactionsBar((prev) => !prev)}
          title="Send Reaction"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: showReactionsBar ? '#3b82f6' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        {/* Raise Hand */}
        <button
          onClick={toggleHand}
          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: isHandRaised ? '#f59e0b' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: isHandRaised ? '0 3px 10px rgba(245, 158, 11, 0.4)' : 'none',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </button>

        {/* Chat with Unread Notification Badge */}
        <button
          onClick={() => {
            setActiveSheet('chat');
            setUnreadChatCount(0);
          }}
          title="Chat"
          style={{
            position: 'relative',
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: activeSheet === 'chat' ? '#2563eb' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadChatCount > 0 && activeSheet !== 'chat' && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 800,
                minWidth: 17,
                height: 17,
                borderRadius: 9,
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.6)',
              }}
            >
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Participants (shows live count) */}
        <button
          onClick={() => setActiveSheet('participants')}
          title="Participants"
          style={{
            position: 'relative',
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              width: 17,
              height: 17,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {participants.length + 1}
          </span>
        </button>

        {/* More Actions (Host Controls, Audio, Settings) */}
        <button
          onClick={() => setActiveSheet('more')}
          title="More Options"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: activeSheet === 'more' ? '#3b82f6' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {/* ── Slide-up Invite Sheet ── */}
      {activeSheet === 'invite' && (
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
          onClick={() => setActiveSheet('none')}
        >
          <div
            className="anim-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: '16px 18px calc(var(--safe-bottom) + 16px) 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Invite Others
                </span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                  Share this meeting link with people you want to join
                </div>
              </div>
              <button
                onClick={() => setActiveSheet('none')}
                style={{ padding: 6, color: '#64748b', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Meeting Code
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>
                  {meetingId}
                </span>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  wordBreak: 'break-all',
                }}
              >
                {meetingUrl}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handleCopyInvite}
                style={{
                  padding: '11px',
                  borderRadius: 10,
                  backgroundColor: inviteCopied ? '#ecfdf5' : '#f1f5f9',
                  border: `1px solid ${inviteCopied ? '#a7f3d0' : '#cbd5e1'}`,
                  color: inviteCopied ? '#059669' : '#0f172a',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {inviteCopied ? (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>

              <button
                onClick={handleNativeShareInvite}
                style={{
                  padding: '11px',
                  borderRadius: 10,
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Apps
              </button>
            </div>

            <button
              onClick={handleWhatsAppShareInvite}
              style={{
                padding: '11px',
                borderRadius: 10,
                backgroundColor: '#25D366',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
              Share via WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* ── Slide-up Chat Sheet ── */}
      {activeSheet === 'chat' && (
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
          onClick={() => setActiveSheet('none')}
        >
          <div
            className="anim-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              height: '75%',
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
                In-Call Chat
              </span>
              <button onClick={() => setActiveSheet('none')} style={{ padding: 6, color: '#64748b' }}>
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No messages yet. Say hello!
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                      <span style={{ fontWeight: 700 }}>{msg.sender}</span>
                      <span>{msg.time}</span>
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '0.82rem' }}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Send a message..."
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  outline: 'none',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0 14px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Slide-up Participants Sheet ── */}
      {activeSheet === 'participants' && (
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
          onClick={() => setActiveSheet('none')}
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
              <button onClick={() => setActiveSheet('none')} style={{ padding: 6, color: '#64748b' }}>
                ✕
              </button>
            </div>

            <button
              onClick={() => setActiveSheet('invite')}
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
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                    }}
                  >
                    {resolvedDisplayName.charAt(0).toUpperCase()}
                  </div>
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
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                      }}
                    >
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
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
      )}

      {/* ── Slide-up More Options / Host Controls Sheet ── */}
      {activeSheet === 'more' && (
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
          onClick={() => setActiveSheet('none')}
        >
          <div
            className="anim-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: '16px 18px calc(var(--safe-bottom) + 16px) 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
              maxHeight: '85%',
              overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Meeting Controls
                </span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                  Audio routing, presentation & meeting options
                </div>
              </div>
              <button
                onClick={() => setActiveSheet('none')}
                style={{ padding: 6, color: '#64748b', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Grid of Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Flip Camera */}
              <button
                onClick={() => {
                  flipCamera();
                  setActiveSheet('none');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </div>
                <div>
                  <div>Flip Camera</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                    {facingMode === 'user' ? 'Front' : 'Back'}
                  </div>
                </div>
              </button>

              {/* Audio Route: Speaker vs Earpiece */}
              <button
                onClick={toggleSpeaker}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: isSpeaker ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${isSpeaker ? '#bfdbfe' : '#e2e8f0'}`,
                  color: isSpeaker ? '#1d4ed8' : '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isSpeaker ? '#dbeafe' : '#f1f5f9', color: isSpeaker ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSpeaker ? (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  ) : (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </div>
                <div>
                  <div>Audio Output</div>
                  <div style={{ fontSize: '0.68rem', color: isSpeaker ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                    {isSpeaker ? 'Speakerphone' : 'Earpiece'}
                  </div>
                </div>
              </button>

              {/* Mobile Screen Share */}
              <button
                onClick={() => {
                  if (isSharingMyScreen) {
                    stopPhoneScreenShare();
                  } else {
                    startPhoneScreenShare();
                  }
                  setActiveSheet('none');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: isSharingMyScreen ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${isSharingMyScreen ? '#fecaca' : '#e2e8f0'}`,
                  color: isSharingMyScreen ? '#dc2626' : '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isSharingMyScreen ? '#fee2e2' : '#eff6ff', color: isSharingMyScreen ? '#dc2626' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <div>{isSharingMyScreen ? 'Stop Sharing' : 'Share Screen'}</div>
                  <div style={{ fontSize: '0.68rem', color: isSharingMyScreen ? '#dc2626' : '#64748b', fontWeight: 500 }}>
                    {isSharingMyScreen ? 'Active now' : 'Present your phone screen'}
                  </div>
                </div>
              </button>

              {/* Minimize to PiP */}
              <button
                onClick={() => {
                  setActiveSheet('none');
                  onMinimize?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <rect x="12" y="12" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
                  </svg>
                </div>
                <div>
                  <div>Minimize (PiP)</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                    Keep in corner
                  </div>
                </div>
              </button>

              {/* Virtual Background / Studio Blur */}
              <button
                onClick={() => {
                  const next = !isBlurActive;
                  setIsBlurActive(next);
                  const track = localStreamRef.current?.getVideoTracks()[0];
                  if (track) {
                    try {
                      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
                      if (capabilities && 'backgroundBlur' in capabilities) {
                        track.applyConstraints({ advanced: [{ backgroundBlur: next } as any] });
                      }
                    } catch (_) {}
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: isBlurActive ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${isBlurActive ? '#93c5fd' : '#e2e8f0'}`,
                  color: isBlurActive ? '#1d4ed8' : '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isBlurActive ? '#dbeafe' : '#f1f5f9', color: isBlurActive ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity={isBlurActive ? 0.35 : 0} />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <div>
                  <div>Blur Effect</div>
                  <div style={{ fontSize: '0.68rem', color: isBlurActive ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                    {isBlurActive ? 'Blur Active' : 'Studio Bokeh'}
                  </div>
                </div>
              </button>

              {/* Noise Shield / Voice Isolation */}
              <button
                onClick={() => {
                  alert('Voice Shield is Active: Acoustic Echo Cancellation & Noise Isolation are active.');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <div>
                  <div>Voice Shield</div>
                  <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                    Noise Isolated
                  </div>
                </div>
              </button>
            </div>

            {/* Invite Button Shortcut */}
            <button
              onClick={() => setActiveSheet('invite')}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 14,
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Invite Participants (WhatsApp / Copy Link)
            </button>

            {/* Host Section - Only shown to Host */}
            {isHost && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Host Controls
                  </span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    You are Host
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {/* Mute All */}
                  <button
                    onClick={handleHostMuteAll}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    </svg>
                    Mute Everyone
                  </button>

                  {/* Lock Room */}
                  <button
                    onClick={handleHostToggleLock}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: isRoomLocked ? '#fef3c7' : '#f1f5f9',
                      border: `1px solid ${isRoomLocked ? '#fde68a' : '#cbd5e1'}`,
                      color: isRoomLocked ? '#b45309' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {isRoomLocked ? (
                      <>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Room Locked
                      </>
                    ) : (
                      <>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                        Lock Meeting
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── "You are Speaking while Muted" Alert Toast ── */}
      {showMutedSpeakingToast && isMuted && (
        <div
          onClick={() => {
            toggleMute();
            setShowMutedSpeakingToast(false);
          }}
          style={{
            position: 'absolute',
            bottom: (isLandscape || isFullscreenShare) ? 68 : 88,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 150,
            padding: '8px 18px',
            borderRadius: 24,
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 18px rgba(239, 68, 68, 0.45)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🎙️ You're on mute. Tap to unmute</span>
        </div>
      )}

      {/* ── Leave Meeting Confirmation Dialog (Accidental Exit Protection) ── */}
      {showLeaveConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 320,
              backgroundColor: '#1e293b',
              borderRadius: 22,
              padding: '22px 20px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0,
                }}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Leave Meeting?
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                  Are you sure you want to leave this call?
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeave();
                }}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 12,
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  cursor: 'pointer',
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MobileMeetingRoom;
