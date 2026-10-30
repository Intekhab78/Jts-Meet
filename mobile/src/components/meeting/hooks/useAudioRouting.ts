import { useState, useEffect, useCallback } from 'react';

export function useAudioRouting() {
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [audioRoute, setAudioRoute] = useState<'speaker' | 'bluetooth' | 'earpiece'>('speaker');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(null);

  const applyAudioSink = useCallback(async (route: 'speaker' | 'bluetooth' | 'earpiece') => {
    try {
      if (typeof (HTMLMediaElement.prototype as any).setSinkId === 'function') {
        const audioEls = document.querySelectorAll('audio, video');
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        const audioOutputs = devices?.filter((d) => d.kind === 'audiooutput') || [];

        let targetDevice = audioOutputs[0];
        if (route === 'bluetooth') {
          targetDevice = audioOutputs.find((d) =>
            /bluetooth|headset|headphone|airpod|buds|wireless/i.test(d.label)
          ) || audioOutputs[0];
        } else if (route === 'speaker') {
          targetDevice = audioOutputs.find((d) =>
            /speaker|loudspeaker/i.test(d.label)
          ) || audioOutputs[0];
        } else if (route === 'earpiece') {
          targetDevice = audioOutputs.find((d) =>
            /earpiece|receiver|phone/i.test(d.label)
          ) || audioOutputs[1] || audioOutputs[0];
        }

        if (targetDevice) {
          audioEls.forEach((el: any) => {
            el.setSinkId?.(targetDevice.deviceId).catch(() => {});
          });
        }
      }
    } catch (_) {}

    // Native Android AudioManager switching (speakerphone vs earpiece hardware routing)
    try {
      (window as any).MobileAppBridge?.setAudioMode?.(route);
    } catch (_) {}
  }, []);

  // Auto-detect Bluetooth connect/disconnect
  useEffect(() => {
    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        const bt = devices?.find((d) =>
          d.kind === 'audiooutput' && /bluetooth|headset|headphone|airpod|buds|wireless/i.test(d.label)
        );
        if (bt) {
          setBluetoothDeviceName(bt.label || 'Bluetooth Headset');
          setAudioRoute('bluetooth');
          setIsSpeaker(false);
          applyAudioSink('bluetooth');
        } else {
          setBluetoothDeviceName(null);
          if (audioRoute === 'bluetooth') {
            setAudioRoute('speaker');
            setIsSpeaker(true);
            applyAudioSink('speaker');
          }
        }
      } catch (_) {}
    };

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      handleDeviceChange();
    }
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [audioRoute, applyAudioSink]);

  const cycleAudioRoute = useCallback(async () => {
    let nextRoute: 'speaker' | 'bluetooth' | 'earpiece' = 'speaker';
    if (audioRoute === 'speaker') {
      nextRoute = bluetoothDeviceName ? 'bluetooth' : 'earpiece';
    } else if (audioRoute === 'bluetooth') {
      nextRoute = 'earpiece';
    } else {
      nextRoute = 'speaker';
    }
    setAudioRoute(nextRoute);
    setIsSpeaker(nextRoute === 'speaker');
    await applyAudioSink(nextRoute);
  }, [audioRoute, bluetoothDeviceName, applyAudioSink]);

  return {
    isSpeaker,
    setIsSpeaker,
    audioRoute,
    setAudioRoute,
    bluetoothDeviceName,
    applyAudioSink,
    cycleAudioRoute,
  };
}
