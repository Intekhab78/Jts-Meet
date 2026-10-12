import React, { useState, useEffect, useRef } from 'react'
import {
    IconX,
    IconMic,
    IconVideo,
    IconSparkles,
    IconHelp,
    IconMonitor,
    IconEdit,
    IconShield
} from '../../../components/common/Icons'

export interface SettingsPanelProps {
    localStream: MediaStream | null
    onClose: () => void
    addToast: (msg: string, type?: 'info' | 'success' | 'warning') => void
    isHost: boolean
    isGuestJoinEnabled: boolean
    onToggleGuestJoin: (enabled: boolean) => void
    isWaitingRoomEnabled: boolean
    onToggleWaitingRoom: (enabled: boolean) => void
    screenSharePolicy?: 'everyone' | 'host_only'
    onToggleScreenSharePolicy?: (policy: 'everyone' | 'host_only') => void
}

export function SettingsPanel({
    localStream, onClose, addToast, isHost,
    isGuestJoinEnabled, onToggleGuestJoin, isWaitingRoomEnabled, onToggleWaitingRoom,
    screenSharePolicy = 'everyone', onToggleScreenSharePolicy
}: SettingsPanelProps) {
    const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'background' | 'accessibility' | 'shortcuts' | 'theme' | 'host'>('audio')
    const [micTesting, setMicTesting] = useState(false)
    const [selectedMic, setSelectedMic] = useState('default')
    const [selectedCam, setSelectedCam] = useState('default')
    const [selectedSpeaker, setSelectedSpeaker] = useState('default')
    const [noiseSuppression, setNoiseSuppression] = useState(true)
    const [echoCancellation, setEchoCancellation] = useState(true)
    const [mirrorVideo, setMirrorVideo] = useState(true)
    const [virtualBackground, setVirtualBackground] = useState('none')
    const [fontSize, setFontSize] = useState(14)
    const [highContrast, setHighContrast] = useState(false)
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')

    const videoRef = useRef<HTMLVideoElement>(null)

    // Play test Sound
    const playTestSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            const ctx = new AudioCtx()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.frequency.setValueAtTime(440, ctx.currentTime) // A4 pitch
            gain.gain.setValueAtTime(0.25, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

            osc.start()
            osc.stop(ctx.currentTime + 0.6)
            addToast('Test chime played successfully', 'success')
        } catch (err) {
            addToast('Unable to test speaker', 'warning')
        }
    }

    // Video stream binding
    useEffect(() => {
        if (activeTab === 'video') {
            const el = videoRef.current
            if (!el) return
            if (localStream) {
                el.srcObject = localStream
                el.play().catch(() => { })
            } else {
                el.srcObject = null
            }
        }
    }, [activeTab, localStream])

    // Apply font size adjustments
    const handleFontSizeChange = (sz: number) => {
        setFontSize(sz)
        document.documentElement.style.setProperty('--settings-chat-font-size', `${sz}px`)
    }

    // Apply theme changes
    const handleThemeChange = (t: 'dark' | 'light') => {
        setTheme(t)
        if (t === 'light') {
            document.documentElement.classList.add('light')
            document.documentElement.setAttribute('data-theme', 'light')
        } else {
            document.documentElement.classList.remove('light')
            document.documentElement.setAttribute('data-theme', 'dark')
        }
        addToast(`Theme set to ${t} mode`, 'success')
    }

    // Apply high contrast
    const handleContrastToggle = (checked: boolean) => {
        setHighContrast(checked)
        if (checked) {
            document.documentElement.classList.add('high-contrast')
            document.documentElement.style.setProperty('--color-border', '#fff')
        } else {
            document.documentElement.classList.remove('high-contrast')
            document.documentElement.style.setProperty('--color-border', 'rgba(255,255,255,0.06)')
        }
    }

    const shortcutList = [
        { key: 'Ctrl + D', desc: 'Toggle Audio Mute', cat: 'Media' },
        { key: 'Ctrl + E', desc: 'Toggle Video Camera', cat: 'Media' },
        { key: 'Ctrl + S', desc: 'Toggle Screen Share', cat: 'Media' },
        { key: 'Ctrl + C', desc: 'Toggle Chat Panel', cat: 'Interface' },
        { key: 'Ctrl + P', desc: 'Toggle Participants Panel', cat: 'Interface' }
    ]

    const backgroundEffects = [
        { id: 'none', name: 'None', preview: 'rgba(255,255,255,0.02)', desc: 'No background modification' },
        { id: 'blur', name: 'Lens Blur', preview: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.3) 100%)', desc: 'Soft lens background blur' },
        { id: 'office', name: 'Sleek Office', preview: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', desc: 'Scenic corporate room' },
        { id: 'lounge', name: 'Virtual Lounge', preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', desc: 'Cozy modern studio' },
        { id: 'beach', name: 'Sunny Beach', preview: 'linear-gradient(135deg, #075985 0%, #0369a1 100%)', desc: 'Warm beach vacation scene' }
    ]

    return (
        <div className="side-panel" style={{
            display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0,
            width: '100%', maxWidth: 440, background: 'var(--color-surface)'
        } as React.CSSProperties}>
            {/* Header */}
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                </span>
                <button className="btn-icon" onClick={onClose} aria-label="Close settings">
                    <IconX />
                </button>
            </div>

            {/* Sidebar Tabs & Contents */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left side Tab Nav */}
                <div style={{
                    width: 72, background: 'rgba(0,0,0,0.15)', borderRight: '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 16
                }}>
                    {(() => {
                        const tabs = [
                            { id: 'audio', icon: <IconMic size={18} />, label: 'Audio' },
                            { id: 'video', icon: <IconVideo size={18} />, label: 'Video' },
                            { id: 'background', icon: <IconSparkles size={18} />, label: 'Virtual' },
                            { id: 'accessibility', icon: <IconHelp size={18} />, label: 'Access' },
                            { id: 'shortcuts', icon: <IconMonitor size={18} />, label: 'Keys' },
                            { id: 'theme', icon: <IconEdit size={18} />, label: 'Theme' }
                        ];
                        if (isHost) {
                            tabs.push({ id: 'host', icon: <IconShield size={18} />, label: 'Host' });
                        }
                        return tabs;
                    })().map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                background: activeTab === tab.id ? 'var(--color-accent-light)' : 'transparent',
                                border: 'none', width: 48, height: 48, borderRadius: 'var(--radius-md)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                            title={tab.label}
                        >
                            <span style={{ fontSize: '1.25rem', marginBottom: 2 }}>{tab.icon}</span>
                            <span style={{ fontSize: '0.625rem', color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: 600 }}>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Right side Tab Contents */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* AUDIO TAB */}
                    {activeTab === 'audio' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Audio Settings</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Microphone Input</label>
                                <select
                                    value={selectedMic}
                                    onChange={(e) => setSelectedMic(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                        color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none'
                                    }}
                                >
                                    <option value="default">Default System Microphone</option>
                                    <option value="builtin">Built-in Digital Mic</option>
                                    <option value="usb">USB Gaming Headset Mic</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Input Level</label>
                                    <button
                                        onClick={() => setMicTesting(!micTesting)}
                                        className={`btn ${micTesting ? 'btn-danger' : 'btn-secondary'}`}
                                        style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
                                    >
                                        {micTesting ? 'Stop Test' : 'Test Mic'}
                                    </button>
                                </div>
                                <MicLevelIndicator stream={localStream} testing={micTesting} />
                            </div>

                            <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Speaker Output</label>
                                <select
                                    value={selectedSpeaker}
                                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                        color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none'
                                    }}
                                >
                                    <option value="default">Default System Speaker</option>
                                    <option value="headphones">External Headphones</option>
                                    <option value="monitor">HDMI Display Audio</option>
                                </select>
                            </div>

                            <button onClick={playTestSound} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8125rem', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <IconMic size={14} /> <span>Test Speaker output</span>
                            </button>

                            <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                    <input type="checkbox" checked={noiseSuppression} onChange={(e) => {
                                        setNoiseSuppression(e.target.checked)
                                        addToast(e.target.checked ? 'Noise suppression activated' : 'Noise suppression off', 'info')
                                    }} />
                                    AI Noise Suppression
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                    <input type="checkbox" checked={echoCancellation} onChange={(e) => setEchoCancellation(e.target.checked)} />
                                    Acoustic Echo Cancellation
                                </label>
                            </div>
                        </div>
                    )}

                    {/* VIDEO TAB */}
                    {activeTab === 'video' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Video Settings</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Camera device</label>
                                <select
                                    value={selectedCam}
                                    onChange={(e) => setSelectedCam(e.target.value)}
                                    style={{
                                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                        color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none'
                                    }}
                                >
                                    <option value="default">Default Web Camera</option>
                                    <option value="builtin">FaceTime HD Webcam</option>
                                    <option value="obs">OBS Virtual Camera</option>
                                </select>
                            </div>

                            {/* Camera Preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Video preview</label>
                                <div style={{
                                    width: '100%', aspectRatio: '16/9', background: '#090a0f',
                                    borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)',
                                    position: 'relative'
                                }}>
                                    {localStream ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            style={{
                                                width: '100%', height: '100%', objectFit: 'cover',
                                                transform: mirrorVideo ? 'scaleX(-1)' : 'none'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                            Camera stream off or unavailable
                                        </div>
                                    )}
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                <input type="checkbox" checked={mirrorVideo} onChange={(e) => setMirrorVideo(e.target.checked)} />
                                Mirror my webcam video
                            </label>
                        </div>
                    )}

                    {/* VIRTUAL BACKGROUND TAB */}
                    {activeTab === 'background' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Background Effects</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                {backgroundEffects.map(eff => (
                                    <button
                                        key={eff.id}
                                        onClick={() => {
                                            setVirtualBackground(eff.id)
                                            addToast(`Background changed: ${eff.name}`, 'success')
                                        }}
                                        style={{
                                            border: virtualBackground === eff.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                            background: 'var(--color-surface-2)', padding: '12px 10px',
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                                            flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '100%', height: 48, borderRadius: 'var(--radius-sm)',
                                            background: eff.preview, border: '1px solid rgba(255,255,255,0.04)'
                                        }} />
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{eff.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ACCESSIBILITY TAB */}
                    {activeTab === 'accessibility' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Accessibility</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <label style={{ color: 'var(--color-text-secondary)' }}>Chat Font Scale</label>
                                    <span>{fontSize}px</span>
                                </div>
                                <input
                                    type="range" min="12" max="22" value={fontSize}
                                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>

                            <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                <input type="checkbox" checked={highContrast} onChange={(e) => handleContrastToggle(e.target.checked)} />
                                High Contrast borders mode
                            </label>
                        </div>
                    )}

                    {/* SHORTCUTS TAB */}
                    {activeTab === 'shortcuts' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Keyboard Shortcuts</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {shortcutList.map(item => (
                                    <div
                                        key={item.key}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: 'rgba(255,255,255,0.02)', padding: '10px 14px',
                                            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.desc}</span>
                                            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{item.cat}</span>
                                        </div>
                                        <kbd style={{
                                            background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)',
                                            color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem',
                                            fontFamily: 'monospace', fontWeight: 700
                                        }}>{item.key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* THEME TAB */}
                    {activeTab === 'theme' && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Color Theme</h4>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    style={{
                                        flex: 1, padding: '16px 12px', background: 'var(--color-surface-2)',
                                        border: theme === 'dark' ? '2.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                                        flexDirection: 'column', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a0b0f', border: '1px solid #ffffff10' }} />
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Dark Theme</span>
                                </button>

                                <button
                                    onClick={() => handleThemeChange('light')}
                                    style={{
                                        flex: 1, padding: '16px 12px', background: '#fff',
                                        border: theme === 'light' ? '2.5px solid var(--color-accent)' : '1px solid rgba(0,0,0,0.1)',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                                        flexDirection: 'column', alignItems: 'center', gap: 8, color: '#333'
                                    }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f8fafc', border: '1px solid #00000010' }} />
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#333' }}>Light Theme</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* HOST CONTROLS TAB */}
                    {activeTab === 'host' && isHost && (
                        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Host Room Control</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span>Organization Guest Join</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Allow external guest links to join</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isGuestJoinEnabled}
                                        onChange={(e) => onToggleGuestJoin(e.target.checked)}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span>Admission Waiting Room</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Place guests in lobby before admitting</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isWaitingRoomEnabled}
                                        onChange={(e) => onToggleWaitingRoom(e.target.checked)}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span>Participant Screen Sharing</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Allow attendees to present their screen</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={screenSharePolicy !== 'host_only'}
                                        onChange={(e) => onToggleScreenSharePolicy?.(e.target.checked ? 'everyone' : 'host_only')}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    )
}

export function MicLevelIndicator({ stream, testing }: { stream: MediaStream | null, testing: boolean }) {
    const [level, setLevel] = useState(0)

    useEffect(() => {
        if (!testing) {
            setLevel(0)
            return
        }

        if (testing) {
            const interval = setInterval(() => {
                setLevel(Math.floor(Math.random() * 60) + 20)
            }, 100)
            return () => clearInterval(interval)
        }

        if (!stream || stream.getAudioTracks().length === 0) {
            setLevel(0)
            return
        }

        let audioCtx: AudioContext | null = null
        let source: MediaStreamAudioSourceNode | null = null
        let analyser: AnalyserNode | null = null
        let animId: number | null = null

        try {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            audioCtx = new AudioCtxClass()
            source = audioCtx.createMediaStreamSource(stream)
            analyser = audioCtx.createAnalyser()
            analyser.fftSize = 64
            analyser.smoothingTimeConstant = 0.4
            // Connect to analyser only; NEVER to audioCtx.destination to prevent feedback whistling
            source.connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const update = () => {
                if (!analyser) return
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                const avg = sum / dataArray.length
                setLevel(Math.min(100, Math.round((avg / 128) * 100)))
                animId = requestAnimationFrame(update)
            }
            update()
        } catch (err) {
            // AudioContext not allowed or unsupported
        }

        return () => {
            if (animId !== null) cancelAnimationFrame(animId)
            if (analyser) {
                try { analyser.disconnect() } catch {}
            }
            if (source) {
                try { source.disconnect() } catch {}
            }
            if (audioCtx) {
                audioCtx.close().catch(() => { })
            }
        }
    }, [stream, testing])

    return (
        <div style={{ width: '100%', height: 8, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{
                width: `${level}%`, height: '100%',
                background: 'linear-gradient(to right, var(--color-success) 0%, var(--color-warning) 70%, var(--color-danger) 100%)',
                borderRadius: 4, transition: 'width 0.1s ease-out'
            }} />
        </div>
    )
}
