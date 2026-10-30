import { useState, useRef, useCallback } from 'react';
import { MOBILE_BACKGROUND_PRESETS, MobileBgPreset } from '../types';

export function useVirtualBackground(localStreamRef: React.RefObject<MediaStream | null>) {
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>('none');
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const currentPreset = MOBILE_BACKGROUND_PRESETS.find((p) => p.id === selectedBackgroundId);
  const currentWallpaperUrl = selectedBackgroundId === 'custom' ? customWallpaperUrl : currentPreset?.url;

  const handleSelectBackground = useCallback((presetId: string) => {
    setSelectedBackgroundId(presetId);
    const isBlur = presetId === 'blur_light' || presetId === 'blur_heavy';
    setIsBlurActive(isBlur);

    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && 'backgroundBlur' in capabilities) {
          track.applyConstraints({ advanced: [{ backgroundBlur: isBlur } as any] });
        }
      } catch (_) {}
    }
  }, [localStreamRef]);

  const handleCustomWallpaperUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setCustomWallpaperUrl(result);
          setSelectedBackgroundId('custom');
          setIsBlurActive(false);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  }, []);

  return {
    selectedBackgroundId,
    setSelectedBackgroundId,
    customWallpaperUrl,
    isBlurActive,
    currentPreset,
    currentWallpaperUrl,
    bgFileInputRef,
    handleSelectBackground,
    handleCustomWallpaperUpload,
  };
}
