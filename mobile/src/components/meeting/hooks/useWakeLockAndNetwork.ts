import { useState, useEffect } from 'react';

export interface UseWakeLockAndNetworkProps {
  peerConnectionsRef: React.RefObject<Record<string, RTCPeerConnection>>;
  audioContextRef: React.RefObject<AudioContext | null>;
}

export function useWakeLockAndNetwork({
  peerConnectionsRef,
  audioContextRef,
}: UseWakeLockAndNetworkProps) {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'reconnecting'>('online');
  const [reconnectBannerText, setReconnectBannerText] = useState<string | null>(null);

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
      if (peerConnectionsRef.current) {
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          try { pc.restartIce(); } catch (_) {}
        });
      }
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
  }, [peerConnectionsRef, audioContextRef]);

  return {
    networkStatus,
    reconnectBannerText,
  };
}
