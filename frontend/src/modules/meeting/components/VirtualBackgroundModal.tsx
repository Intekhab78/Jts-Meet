import React, { useRef, useEffect, useState } from 'react'
import { BACKGROUND_PRESETS, BackgroundPreset, virtualBackgroundService } from '../../../services/virtualBackground.service'
import { IconSparkles, IconX, IconVideoOff, IconZap, IconPlus, IconCheck, IconInfo } from '../../../components/common/Icons'

interface VirtualBackgroundModalProps {
    isOpen: boolean
    onClose: () => void
    activePreset: string
    onSelectPreset: (presetId: string) => void
    onUploadCustom: (file: File) => void
    localStream: MediaStream | null
    isApplying?: boolean
}

export function VirtualBackgroundModal({
    isOpen,
    onClose,
    activePreset,
    onSelectPreset,
    onUploadCustom,
    localStream,
    isApplying = false
}: VirtualBackgroundModalProps) {
    const previewVideoRef = useRef<HTMLVideoElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Bind local stream to the live preview window
    const currentTrackId = localStream?.getVideoTracks()[0]?.id
    useEffect(() => {
        if (!isOpen) return
        const vid = previewVideoRef.current
        if (!vid) return

        if (localStream) {
            vid.srcObject = null
            vid.srcObject = localStream
            vid.play().catch(() => {})
        } else {
            vid.srcObject = null
        }
    }, [isOpen, localStream, activePreset, currentTrackId])

    if (!isOpen) return null

    const [customWallpaper, setCustomWallpaper] = useState<string | null>(() => virtualBackgroundService.getCustomWallpaper())

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string
                if (dataUrl) {
                    setCustomWallpaper(dataUrl)
                }
            }
            reader.readAsDataURL(file)
            onUploadCustom(file)
            e.target.value = ''
        }
    }

    const handleRemoveCustom = (e: React.MouseEvent) => {
        e.stopPropagation()
        virtualBackgroundService.clearCustomWallpaper()
        setCustomWallpaper(null)
        if (activePreset === 'custom') {
            onSelectPreset('none')
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 10002,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'jts-fade-in 0.2s ease-out'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="glass-card"
                style={{
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'rgba(15, 17, 23, 0.96)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'jts-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <IconSparkles size={22} color="#a5b4fc" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                                Visual Effects & Virtual Backgrounds
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                                Real AI person segmentation: Your face stays crystal-clear while only background blurs or transforms.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--color-text-secondary)',
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                            e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.color = 'var(--color-text-secondary)'
                        }}
                        aria-label="Close"
                    >
                        <IconX size={15} />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Live Preview Window */}
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: 240,
                            borderRadius: '16px',
                            overflow: 'hidden',
                            background: '#090a0f',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)'
                        }}
                    >
                        {localStream && localStream.getVideoTracks().length > 0 ? (
                            <video
                                ref={previewVideoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)' // Mirror preview like standard webcam
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    color: 'var(--color-text-muted)'
                                }}
                            >
                                <IconVideoOff size={32} color="var(--color-text-muted)" />
                                <span style={{ fontSize: '0.875rem' }}>Camera preview inactive or turned off</span>
                            </div>
                        )}

                        {/* Status badge in preview */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 12,
                                left: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'rgba(10, 11, 15, 0.85)',
                                backdropFilter: 'blur(10px)',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                fontSize: '0.75rem',
                                color: '#fff',
                                fontWeight: 600
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: isApplying ? '#f59e0b' : activePreset !== 'none' ? '#10b981' : '#6b7280',
                                    boxShadow: activePreset !== 'none' ? '0 0 8px #10b981' : 'none'
                                }}
                            />
                            {isApplying ? (
                                'AI Segmenting...'
                            ) : activePreset === 'none' ? (
                                'Standard Camera'
                            ) : (
                                `Applied: ${BACKGROUND_PRESETS.find(p => p.id === activePreset)?.title || 'Custom Wallpaper'}`
                            )}
                        </div>

                        {/* AI edge engine pill */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 14,
                                background: 'rgba(99, 102, 241, 0.2)',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                backdropFilter: 'blur(10px)',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.6875rem',
                                color: '#a5b4fc',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                            }}
                        >
                            <IconZap size={12} color="#a5b4fc" /> MediaPipe WebGL Engine
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Background Effects
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Click any effect to apply instantly
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                                gap: 12
                            }}
                        >
                            {/* Upload / Active Custom Card */}
                            <div
                                onClick={() => {
                                    if (customWallpaper) {
                                        onSelectPreset('custom')
                                    } else {
                                        fileInputRef.current?.click()
                                    }
                                }}
                                style={{
                                    border: activePreset === 'custom' ? '2px solid #818cf8' : '1px dashed rgba(255, 255, 255, 0.2)',
                                    background: activePreset === 'custom' ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '16px',
                                    padding: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    position: 'relative',
                                    transition: 'all 0.18s ease',
                                    boxShadow: activePreset === 'custom' ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                            >
                                {customWallpaper ? (
                                    <div
                                        style={{
                                            width: '100%',
                                            height: 72,
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}
                                    >
                                        <img
                                            src={customWallpaper}
                                            alt="Custom wallpaper"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        {activePreset === 'custom' && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    background: '#6366f1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                <IconCheck size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                        {/* Action buttons on hover/overlay */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                right: 2,
                                                display: 'flex',
                                                gap: 3
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    fileInputRef.current?.click()
                                                }}
                                                title="Change custom wallpaper"
                                                style={{
                                                    padding: '2px 5px',
                                                    borderRadius: 4,
                                                    background: 'rgba(0,0,0,0.7)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    color: '#a5b4fc',
                                                    fontSize: '0.625rem',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Change
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveCustom}
                                                title="Remove custom wallpaper"
                                                style={{
                                                    padding: '2px 5px',
                                                    borderRadius: 4,
                                                    background: 'rgba(239, 68, 68, 0.75)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    color: '#fff',
                                                    fontSize: '0.625rem',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            width: '100%',
                                            height: 72,
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 4,
                                            color: '#818cf8'
                                        }}
                                    >
                                        <IconPlus size={22} color="#818cf8" />
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Upload Image</span>
                                    </div>
                                )}
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', textAlign: 'center' }}>
                                    {customWallpaper ? 'Custom (Saved)' : 'Custom'}
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Standard Presets */}
                            {BACKGROUND_PRESETS.map((preset) => {
                                const isSelected = activePreset === preset.id
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => onSelectPreset(preset.id)}
                                        style={{
                                            border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                                            background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                                            borderRadius: '16px',
                                            padding: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 8,
                                            position: 'relative',
                                            transition: 'all 0.18s ease',
                                            boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                    >
                                        {/* Thumbnail Container */}
                                        <div
                                            style={{
                                                width: '100%',
                                                height: 72,
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                background: preset.type === 'blur' || preset.type === 'none' ? preset.thumbnail : '#000',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {preset.id === 'none' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                    <IconVideoOff size={20} color="var(--color-text-muted)" />
                                                    <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>Off</span>
                                                </div>
                                            )}

                                            {preset.type === 'blur' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                    <IconSparkles size={18} color="#a5b4fc" />
                                                    <span style={{ fontSize: '0.625rem', color: '#a5b4fc', fontWeight: 600 }}>
                                                        {preset.id === 'blur_light' ? '8px Soft' : '20px Deep'}
                                                    </span>
                                                </div>
                                            )}

                                            {preset.type === 'image' && (
                                                <img
                                                    src={preset.thumbnail}
                                                    alt={preset.title}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                    loading="lazy"
                                                />
                                            )}

                                            {/* Active Checkmark */}
                                            {isSelected && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        background: '#6366f1',
                                                        color: '#fff',
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                                                    }}
                                                >
                                                    <IconCheck size={12} color="#ffffff" />
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? '#fff' : 'var(--color-text-secondary)', textAlign: 'center' }}>
                                                {preset.title}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    color: 'var(--color-text-muted)',
                                                    textAlign: 'center',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    width: '100%'
                                                }}
                                                title={preset.description}
                                            >
                                                {preset.category === 'blur' ? 'AI Face Protected' : preset.category === 'wallpaper' ? 'HD Wallpaper' : 'Standard'}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Explanatory callout */}
                    <div
                        style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '14px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}
                    >
                        <IconInfo size={20} color="#818cf8" />
                        <div style={{ fontSize: '0.78125rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                            <strong style={{ color: '#fff' }}>Crystal-Clear Guarantee:</strong> Unlike basic CSS filters that blur your entire screen, our real-time WebGL neural model separates your silhouette from your surroundings. Both your local preview and all participants on the call receive the AI composited video.
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        background: 'rgba(10, 11, 15, 0.4)'
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--color-accent)',
                            color: '#fff',
                            border: 'none',
                            padding: '9px 24px',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
