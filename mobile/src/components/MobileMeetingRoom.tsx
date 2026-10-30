import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE, SOCKET_URL, getStoredToken, getStoredUser } from '../config';

function parseJwtUserId(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      return payload.userId || payload.id || payload._id || '';
    }
  } catch (_) {}
  return '';
}

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

import {
  RemoteParticipant,
  MobileMeetingRoomProps,
  MobileBgPreset,
  MOBILE_BACKGROUND_PRESETS,
  ICE_SERVERS,
  ChatMessage,
  ReactionItem,
  NetworkSignalIndicator,
  DirectAudioCallView,
  DirectVideoCallView,
  MeetingTopBar,
  MeetingControlsBar,
  LocalPipTile,
  PipModeOverlay,
  ReactionsOverlay,
  ScreenShareStage,
  ConferenceParticipantGrid,
  LeaveConfirmModal,
  InviteSheet,
  ChatSheet,
  ParticipantsSheet,
  MoreOptionsSheet,
  VirtualBackgroundSheet,
  useAudioRouting,
  useSpeakingDetector,
  useWakeLockAndNetwork,
  useScreenShare,
  useVirtualBackground,
} from './meeting';

export type { RemoteParticipant, MobileMeetingRoomProps, MobileBgPreset, ChatMessage, ReactionItem };
export { MOBILE_BACKGROUND_PRESETS, ICE_SERVERS };


export const MobileMeetingRoom: React.FC<MobileMeetingRoomProps> = ({
  meetingId,
  displayName,
  initialAudioOff = false,
  initialVideoOff = false,
  showInitialInvite = false,
  callType,
  peerName,
  isMinimized = false,
  onMinimize,
  onMaximize,
  onLeave,
}) => {
  const isDirectCall = meetingId.startsWith('call_') || Boolean(callType);

  const resolvedDisplayName = (displayName && displayName !== 'Guest User')
    ? displayName
    : (localStorage.getItem('jts_display_name') || localStorage.getItem('jts_user_name') || 'Guest User');

  const [isMuted, setIsMuted] = useState(initialAudioOff);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [currentCallType, setCurrentCallType] = useState<'audio' | 'video'>(() => {
    if (callType) return callType;
    if (meetingId.startsWith('call_') && initialVideoOff) return 'audio';
    return 'video';
  });

  useEffect(() => {
    if (callType) {
      setCurrentCallType(callType);
    }
  }, [callType]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const {
    isSpeaker,
    setIsSpeaker,
    audioRoute,
    bluetoothDeviceName,
    cycleAudioRoute,
  } = useAudioRouting();
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSheet, setActiveSheet] = useState<'none' | 'chat' | 'participants' | 'invite' | 'more' | 'virtual_background'>(
    (showInitialInvite && !isDirectCall) ? 'invite' : 'none'
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
  const [isNativePip, setIsNativePip] = useState(false);

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

  // Android Native Hardware Back Button handler inside Meeting Room
  useEffect(() => {
    let backHandle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        if (showLeaveConfirm) {
          setShowLeaveConfirm(false);
          return;
        }
        if (activeSheet !== 'none') {
          setActiveSheet('none');
          return;
        }
        if (isMinimized) {
          return;
        }
        // Seamlessly minimize to floating PiP mini-card so meeting is never lost
        if (onMinimize) {
          onMinimize();
        } else {
          setShowLeaveConfirm(true);
        }
      }).then((handle) => {
        backHandle = handle;
      });
    } catch (_) {}

    return () => {
      backHandle?.remove?.();
    };
  }, [showLeaveConfirm, activeSheet, isMinimized, onMinimize]);

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
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; senderName: string; left: number }>>([]);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [isHost, setIsHost] = useState(showInitialInvite);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [selfCorner, setSelfCorner] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'minimized'>('bottom-right');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isNoiseShieldActive, setIsNoiseShieldActive] = useState(true);

  const {
    selectedBackgroundId,
    setSelectedBackgroundId,
    customWallpaperUrl,
    currentPreset,
    currentWallpaperUrl,
    bgFileInputRef,
    handleSelectBackground,
    handleCustomWallpaperUpload,
  } = useVirtualBackground(localStreamRef);

  const socketRef = useRef<Socket | null>(null);

  const {
    speakingUsers,
    setSpeakingUsers,
    showMutedSpeakingToast,
    setShowMutedSpeakingToast,
  } = useSpeakingDetector({
    localStream,
    isMuted,
    meetingId,
    socketRef,
  });

  const directPeerName = (participants[0]?.displayName && participants[0].displayName !== 'Guest User')
    ? participants[0].displayName
    : (peerName && peerName !== 'Guest User' ? peerName : 'Colleague');
  const directPeerId = participants[0]?.userId?.toLowerCase() || '';

  const isRemoteVideoActive = participants.some((p) => {
    if (p.isVideoOff) return false;
    const s = remoteStreams[p.userId] || remoteStreams[p.userId.toLowerCase()];
    const vt = s?.getVideoTracks().find((t) => t.enabled && t.readyState === 'live');
    return !!vt && !vt.muted;
  });

  // If remote peer turns on their video during an audio call, upgrade to video call
  useEffect(() => {
    if (isRemoteVideoActive && currentCallType === 'audio') {
      setCurrentCallType('video');
    }
  }, [isRemoteVideoActive, currentCallType]);

  const isDirectAudioCall = isDirectCall && currentCallType === 'audio';

  const isRemoteSpeaking = !!(
    (directPeerId && speakingUsers[directPeerId]) ||
    (participants[0]?.userId && speakingUsers[participants[0].userId.toLowerCase()])
  );

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

  // 1a. Native Android PiP (Picture-in-Picture) Full-Screen Video Mode Listener
  useEffect(() => {
    (window as any).__onNativePiPModeChanged = (inPip: boolean) => {
      setIsNativePip(Boolean(inPip));
      if (inPip) {
        setActiveSheet('none');
        setShowLeaveConfirm(false);
      }
    };
    return () => {
      delete (window as any).__onNativePiPModeChanged;
    };
  }, []);

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

  const {
    networkStatus,
    reconnectBannerText,
  } = useWakeLockAndNetwork({
    peerConnectionsRef,
    audioContextRef,
  });

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

      if (token) {
        myUserIdRef.current = getStoredUser()?._id || getStoredUser()?.id || parseJwtUserId(token) || '';
      } else {
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

      // User Left -> Clean up properly, play chime, and auto-exit if direct call
      const handleUserLeft = (leftUserId: string) => {
        playToneChime('leave');
        cleanupPeer(leftUserId);
        if (isDirectCall) {
          try {
            (window as any).MobileAppBridge?.showToast?.('Call ended');
          } catch (_) {}
          onLeave();
        }
      };

      socket.on('webrtc:user-left', (payload: { userId: string }) => {
        handleUserLeft(payload.userId);
      });
      socket.on('meeting:leave', (payload: { userId: string }) => {
        if (payload?.userId) {
          handleUserLeft(payload.userId);
        }
      });
      socket.on('meeting:user-left', (payload: { userId: string }) => {
        if (payload?.userId) {
          handleUserLeft(payload.userId);
        }
      });
      socket.on('call:ended', () => {
        if (isDirectCall) {
          try {
            (window as any).MobileAppBridge?.showToast?.('Call ended');
          } catch (_) {}
          onLeave();
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      Object.keys(peerConnectionsRef.current).forEach((id) => cleanupPeer(id));
      if (isDirectCall) {
        try { socket?.emit('call:ended', { meetingId }); } catch (_) {}
      }
      socket?.emit('meeting:leave', { meetingId });
      socket?.disconnect();
    };
  }, [meetingId, displayName]);

  const {
    isSharingMyScreen,
    startPhoneScreenShare,
    stopPhoneScreenShare,
  } = useScreenShare({
    meetingId,
    socketRef,
    peerConnectionsRef,
    localStreamRef,
    screenStreamRef,
    onCloseSheet: () => setActiveSheet('none'),
  });

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

  // ── PICTURE IN PICTURE MINI-CARD & NATIVE PIP OVERLAY ──
  if (isMinimized || isNativePip) {
    return (
      <PipModeOverlay
        isMinimized={isMinimized}
        isNativePip={isNativePip}
        onMaximize={onMaximize}
        onLeave={onLeave}
        timer={timer}
        displayName={displayName}
        presenterStream={presenterStream}
        remoteStreams={remoteStreams}
        localStream={localStream}
        participants={participants}
        screenSharingUserId={screenSharingUserId}
        screenStream={screenStreamRef.current}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: isDirectAudioCall ? '#ffffff' : '#090d16',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Bar for Conference Meetings (Hidden during Direct 1-on-1 Calls) ── */}
      {!isDirectCall && (
        <MeetingTopBar
          meetingId={meetingId}
          timer={timer}
          isLandscape={isLandscape}
          isFullscreenShare={isFullscreenShare}
          showControls={showControls}
          audioRoute={audioRoute}
          bluetoothDeviceName={bluetoothDeviceName}
          cycleAudioRoute={cycleAudioRoute}
          flipCamera={flipCamera}
          onMinimize={onMinimize}
          onLeaveClick={() => setShowLeaveConfirm(true)}
          resetControlsTimer={resetControlsTimer}
        />
      )}

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
        {/* ── Global Continuous Remote Audio (Never cuts out during screen share or pinning) ── */}
        <div style={{ display: 'none' }}>
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <audio
              key={`global_audio_${peerId}`}
              autoPlay
              playsInline
              ref={(el) => {
                if (el && stream && el.srcObject !== stream) {
                  el.srcObject = stream;
                  el.play().catch(() => {});
                }
              }}
            />
          ))}
        </div>

        {/* CASE 1: SCREEN SHARING ACTIVE OR USER PINNED -> SCREEN TAKES FULL STAGE */}
        {activePresenterId ? (
          <ScreenShareStage
            presenter={presenter || undefined}
            presenterStream={presenterStream}
            isLandscape={isLandscape}
            isFullscreenShare={isFullscreenShare}
            showControls={showControls}
            resetControlsTimer={resetControlsTimer}
            videoFit={videoFit}
            setVideoFit={setVideoFit}
            setIsFullscreenShare={setIsFullscreenShare}
            setShowControls={setShowControls}
            focusedUserId={focusedUserId}
            setFocusedUserId={setFocusedUserId}
            participants={participants}
          />
        ) : isDirectAudioCall ? (
          <DirectAudioCallView
            directPeerName={directPeerName}
            timer={timer}
            participantsCount={participants.length}
            isRemoteSpeaking={isRemoteSpeaking}
            audioRoute={audioRoute}
            bluetoothDeviceName={bluetoothDeviceName}
            cycleAudioRoute={cycleAudioRoute}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isVideoOff={isVideoOff}
            onUpgradeToVideo={() => {
              setCurrentCallType('video');
              if (isVideoOff) toggleVideo();
            }}
            onEndCall={onLeave}
            onMinimize={onMinimize}
          />
        ) : isDirectCall && !isDirectAudioCall ? (
          <DirectVideoCallView
            directPeerName={directPeerName}
            directPeerId={directPeerId}
            timer={timer}
            participants={participants}
            remoteStreams={remoteStreams}
            isRemoteSpeaking={isRemoteSpeaking}
            audioRoute={audioRoute}
            bluetoothDeviceName={bluetoothDeviceName}
            cycleAudioRoute={cycleAudioRoute}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isVideoOff={isVideoOff}
            toggleVideo={toggleVideo}
            flipCamera={flipCamera}
            onEndCall={onLeave}
            onMinimize={onMinimize}
          />
        ) : (
          /* CASE 3: NORMAL PARTICIPANT VIDEO/AVATAR GRID OR ALONE IN MEETING */
          <ConferenceParticipantGrid
            participants={participants}
            remoteStreams={remoteStreams}
            isLandscape={isLandscape}
            activePresenterId={activePresenterId}
            isDirectAudioCall={isDirectAudioCall}
            currentCallType={currentCallType}
            speakingUsers={speakingUsers}
            focusedUserId={focusedUserId}
            setFocusedUserId={setFocusedUserId}
            networkStatus={networkStatus}
            isDirectCall={isDirectCall}
            directPeerName={directPeerName}
            timer={timer}
            resolvedDisplayName={resolvedDisplayName}
            onOpenInvite={() => setActiveSheet('invite')}
          />
        )}

        {/* Floating Local PiP Tile (Tap to cycle corners or minimize; hidden in fullscreen or direct audio call) */}
        <LocalPipTile
          isFullscreenShare={isFullscreenShare}
          isDirectAudioCall={isDirectAudioCall}
          selfCorner={selfCorner}
          setSelfCorner={setSelfCorner}
          isLandscape={isLandscape}
          showControls={showControls}
          speakingUsers={speakingUsers}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          facingMode={facingMode}
          selectedBackgroundId={selectedBackgroundId}
          currentWallpaperUrl={currentWallpaperUrl}
          currentPreset={currentPreset}
          resolvedDisplayName={resolvedDisplayName}
          networkStatus={networkStatus}
          localVideoRef={localVideoRef}
          localStream={localStream}
        />
      </div>

      {/* ── Floating Emoji Reactions & Quick Floating Reactions Bar ── */}
      <ReactionsOverlay
        reactions={reactions}
        showReactionsBar={showReactionsBar}
        showControls={showControls}
        isLandscape={isLandscape}
        isFullscreenShare={isFullscreenShare}
        onSendReaction={sendReaction}
      />

      {/* ── Bottom Controls Bar for Conference Meetings (Hidden during Direct 1-on-1 Calls) ── */}
      {!isDirectCall && (
        <MeetingControlsBar
          isMuted={isMuted}
          toggleMute={toggleMute}
          isVideoOff={isVideoOff}
          toggleVideo={toggleVideo}
          showReactionsBar={showReactionsBar}
          setShowReactionsBar={setShowReactionsBar}
          isHandRaised={isHandRaised}
          toggleHand={toggleHand}
          activeSheet={activeSheet}
          setActiveSheet={setActiveSheet}
          unreadChatCount={unreadChatCount}
          participantsCount={participants.length}
          isLandscape={isLandscape}
          isFullscreenShare={isFullscreenShare}
          showControls={showControls}
          resetControlsTimer={resetControlsTimer}
        />
      )}

      {/* ── Slide-up Sheets (Invite, Chat, Participants, More, Virtual Background) ── */}
      <InviteSheet
        isOpen={activeSheet === 'invite'}
        onClose={() => setActiveSheet('none')}
        meetingId={meetingId}
        meetingUrl={meetingUrl}
        inviteCopied={inviteCopied}
        onCopyInvite={handleCopyInvite}
        onNativeShare={handleNativeShareInvite}
        onWhatsAppShare={handleWhatsAppShareInvite}
      />

      <ChatSheet
        isOpen={activeSheet === 'chat'}
        onClose={() => setActiveSheet('none')}
        chatMessages={chatMessages}
        msgInput={msgInput}
        setMsgInput={setMsgInput}
        onSendChat={handleSendChat}
        chatEndRef={chatEndRef}
      />

      <ParticipantsSheet
        isOpen={activeSheet === 'participants'}
        onClose={() => setActiveSheet('none')}
        onOpenInvite={() => setActiveSheet('invite')}
        participants={participants}
        resolvedDisplayName={resolvedDisplayName}
        screenSharingUserId={screenSharingUserId}
      />

      <MoreOptionsSheet
        isOpen={activeSheet === 'more'}
        onClose={() => setActiveSheet('none')}
        facingMode={facingMode}
        flipCamera={flipCamera}
        audioRoute={audioRoute}
        bluetoothDeviceName={bluetoothDeviceName}
        cycleAudioRoute={cycleAudioRoute}
        isSharingMyScreen={isSharingMyScreen}
        startPhoneScreenShare={startPhoneScreenShare}
        stopPhoneScreenShare={stopPhoneScreenShare}
        onMinimize={onMinimize}
        selectedBackgroundId={selectedBackgroundId}
        currentPreset={currentPreset}
        onOpenVirtualBackground={() => setActiveSheet('virtual_background')}
        isNoiseShieldActive={isNoiseShieldActive}
        onToggleNoiseShield={() => setIsNoiseShieldActive((prev) => !prev)}
        onOpenInvite={() => setActiveSheet('invite')}
        isHost={isHost}
        onHostMuteAll={handleHostMuteAll}
        isRoomLocked={isRoomLocked}
        onHostToggleLock={handleHostToggleLock}
      />

      <VirtualBackgroundSheet
        isOpen={activeSheet === 'virtual_background'}
        onClose={() => setActiveSheet('none')}
        selectedBackgroundId={selectedBackgroundId}
        customWallpaperUrl={customWallpaperUrl}
        currentPreset={currentPreset}
        onSelectBackground={handleSelectBackground}
        bgFileInputRef={bgFileInputRef}
        onCustomWallpaperUpload={handleCustomWallpaperUpload}
      />

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
      <LeaveConfirmModal
        isOpen={showLeaveConfirm}
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          onLeave();
        }}
      />
    </div>
  );
};
export default MobileMeetingRoom;
