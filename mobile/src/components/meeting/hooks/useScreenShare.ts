import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface UseScreenShareProps {
  meetingId: string;
  socketRef: React.RefObject<Socket | null>;
  peerConnectionsRef: React.RefObject<Record<string, RTCPeerConnection>>;
  localStreamRef: React.RefObject<MediaStream | null>;
  screenStreamRef: React.RefObject<MediaStream | null>;
  onCloseSheet: () => void;
}

export function useScreenShare({
  meetingId,
  socketRef,
  peerConnectionsRef,
  localStreamRef,
  screenStreamRef,
  onCloseSheet,
}: UseScreenShareProps) {
  const [isSharingMyScreen, setIsSharingMyScreen] = useState(false);
  const isStoppingScreenShareRef = useRef(false);
  const nativeScreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopPhoneScreenShare = useCallback(() => {
    if (isStoppingScreenShareRef.current) return;
    isStoppingScreenShareRef.current = true;
    setTimeout(() => {
      isStoppingScreenShareRef.current = false;
    }, 1500);

    try {
      (window as any).MobileAppBridge?.stopNativeScreenShare?.();
    } catch (_) {}

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack && peerConnectionsRef.current) {
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
        if (sender) {
          sender.replaceTrack(camTrack);
        }
      });
    }
    setIsSharingMyScreen(false);
    socketRef.current?.emit('screen:stop', { meetingId });
    try { (window as any).MobileAppBridge?.showToast?.('Screen sharing stopped'); } catch (_) {}
  }, [meetingId, socketRef, peerConnectionsRef, localStreamRef, screenStreamRef]);

  // Native Android In-App Screen Sharing Listeners (Zero Browser Redirect)
  useEffect(() => {
    (window as any).__onNativeScreenShareStarted = () => {
      const canvas = nativeScreenCanvasRef.current || document.createElement('canvas');
      canvas.width = 540;
      canvas.height = 960;
      nativeScreenCanvasRef.current = canvas;

      try {
        const stream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
        if (stream) {
          screenStreamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          if (track && peerConnectionsRef.current) {
            Object.values(peerConnectionsRef.current).forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
              if (sender) {
                sender.replaceTrack(track);
              } else {
                try { pc.addTrack(track, stream); } catch (_) {}
              }
            });

            setIsSharingMyScreen(true);
            onCloseSheet();
            socketRef.current?.emit('screen:start', { meetingId });
            try { (window as any).MobileAppBridge?.showToast?.('Screen sharing active in meeting'); } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Could not capture native canvas stream:', err);
      }
    };

    let frameImage: HTMLImageElement | null = null;
    let isDrawing = false;

    (window as any).__onNativeScreenFrame = (base64: string) => {
      const canvas = nativeScreenCanvasRef.current;
      if (!canvas || isDrawing) return;
      isDrawing = true;

      if (!frameImage) {
        frameImage = new Image();
      }

      frameImage.onload = () => {
        try {
          const ctx = canvas.getContext('2d');
          if (ctx && frameImage) {
            if (canvas.width !== frameImage.width) canvas.width = frameImage.width;
            if (canvas.height !== frameImage.height) canvas.height = frameImage.height;
            ctx.drawImage(frameImage, 0, 0);
          }
        } finally {
          isDrawing = false;
        }
      };

      frameImage.onerror = () => {
        isDrawing = false;
      };

      frameImage.src = 'data:image/jpeg;base64,' + base64;
    };

    (window as any).__onNativeScreenShareCancelled = () => {
      try { (window as any).MobileAppBridge?.showToast?.('Screen share cancelled'); } catch (_) {}
    };

    (window as any).__onNativeScreenShareStopped = () => {
      if (isSharingMyScreen && !isStoppingScreenShareRef.current) {
        stopPhoneScreenShare();
      }
    };

    return () => {
      delete (window as any).__onNativeScreenShareStarted;
      delete (window as any).__onNativeScreenFrame;
      delete (window as any).__onNativeScreenShareCancelled;
      delete (window as any).__onNativeScreenShareStopped;
    };
  }, [meetingId, isSharingMyScreen, onCloseSheet, peerConnectionsRef, screenStreamRef, socketRef, stopPhoneScreenShare]);

  const startPhoneScreenShare = async () => {
    // Priority 1: Native In-App Android Screen Capture
    if ((window as any).MobileAppBridge?.startNativeScreenShare) {
      try {
        (window as any).MobileAppBridge.startNativeScreenShare();
        return;
      } catch (e) {
        console.warn('Could not launch native screen share:', e);
      }
    }

    // Priority 2: Direct device getDisplayMedia
    if (navigator.mediaDevices && typeof (navigator.mediaDevices as any).getDisplayMedia === 'function') {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: false,
        });

        if (stream && stream.getVideoTracks().length > 0) {
          const screenTrack = stream.getVideoTracks()[0];
          screenStreamRef.current = stream;

          if (peerConnectionsRef.current) {
            Object.values(peerConnectionsRef.current).forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
              if (sender) {
                sender.replaceTrack(screenTrack);
              } else {
                try { pc.addTrack(screenTrack, stream); } catch (_) {}
              }
            });
          }

          setIsSharingMyScreen(true);
          onCloseSheet();
          socketRef.current?.emit('screen:start', { meetingId });

          screenTrack.onended = () => {
            stopPhoneScreenShare();
          };

          try { (window as any).MobileAppBridge?.showToast?.('Screen sharing active'); } catch (_) {}
          return;
        }
      } catch (err: any) {
        console.warn('[ScreenShare] getDisplayMedia error:', err);
        if (err?.name === 'NotAllowedError') {
          return;
        }
      }
    }

    try { (window as any).MobileAppBridge?.showToast?.('Screen share not supported on this device'); } catch (_) {}
  };

  return {
    isSharingMyScreen,
    startPhoneScreenShare,
    stopPhoneScreenShare,
  };
}
