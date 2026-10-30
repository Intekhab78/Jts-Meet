import React from 'react';
import { MOBILE_BACKGROUND_PRESETS, MobileBgPreset } from '../types';

export interface VirtualBackgroundSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBackgroundId: string;
  customWallpaperUrl: string | null;
  currentPreset?: MobileBgPreset;
  onSelectBackground: (presetId: string) => void;
  bgFileInputRef: React.RefObject<HTMLInputElement | null>;
  onCustomWallpaperUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const VirtualBackgroundSheet: React.FC<VirtualBackgroundSheetProps> = ({
  isOpen,
  onClose,
  selectedBackgroundId,
  customWallpaperUrl,
  currentPreset,
  onSelectBackground,
  bgFileInputRef,
  onCustomWallpaperUpload,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
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
          gap: 12,
          maxHeight: '82vh',
          overflowY: 'auto',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Grab Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Virtual Background & Wallpapers
            </span>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              Modern office, cozy library ya phone gallery se custom photo choose karein
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, color: '#64748b', fontSize: '1.1rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Currently Active Status Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 10,
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 700 }}>
            <span>✨ Active:</span>
            <span>{selectedBackgroundId === 'custom' ? 'Custom Wallpaper' : (currentPreset?.title || 'None (Original Camera)')}</span>
          </div>
          {selectedBackgroundId !== 'none' && (
            <button
              onClick={() => onSelectBackground('none')}
              style={{
                fontSize: '0.7rem',
                color: '#dc2626',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reset to Camera
            </button>
          )}
        </div>

        {/* Hidden File Input for Custom Gallery Wallpaper */}
        <input
          type="file"
          ref={bgFileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onCustomWallpaperUpload}
        />

        {/* Presets Grid (2 Columns, Mobile-First) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {MOBILE_BACKGROUND_PRESETS.map((preset) => {
            const isSelected = selectedBackgroundId === preset.id;
            const isCustom = preset.id === 'custom';

            return (
              <button
                key={preset.id}
                onClick={() => {
                  if (isCustom) {
                    bgFileInputRef.current?.click();
                  } else {
                    onSelectBackground(preset.id);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                }}
              >
                {/* Thumbnail preview image */}
                <div
                  style={{
                    height: 76,
                    width: '100%',
                    backgroundColor: '#1e293b',
                    backgroundImage: isCustom && customWallpaperUrl
                      ? `url(${customWallpaperUrl})`
                      : preset.thumbnail
                      ? `url(${preset.thumbnail})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {preset.id === 'none' && (
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 6 }}>
                      No Effect
                    </div>
                  )}
                  {preset.category === 'blur' && (
                    <div style={{ color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, backgroundColor: 'rgba(37, 99, 235, 0.75)', padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>
                      {preset.id === 'blur_light' ? 'Soft Bokeh' : 'Full Privacy'}
                    </div>
                  )}
                  {isCustom && !customWallpaperUrl && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#60a5fa' }}>
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span style={{ fontSize: '0.66rem', fontWeight: 700 }}>Choose from Gallery</span>
                    </div>
                  )}

                  {/* Checkmark badge */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                      }}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Text Details */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                    {preset.title}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.25 }}>
                    {preset.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Done CTA */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            marginTop: 4,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          Apply & Done
        </button>
      </div>
    </div>
  );
};

export default VirtualBackgroundSheet;
