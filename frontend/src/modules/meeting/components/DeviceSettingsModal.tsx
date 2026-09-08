import React, { useEffect, useState, useRef } from 'react'

interface DeviceSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    localStream: MediaStream | null
    onDeviceChange?: (kind: 'video' | 'audio', deviceId: string) => Promise<void>
    isBlurEnabled?: boolean
    onToggleBlur?: (enabled: boolean) => void
    isNoiseSuppressionEnabled?: boolean
    onToggleNoiseSuppression?: (enabled: boolean) => void
}

export function DeviceSettingsModal({
    isOpen,
    onClose,
    localStream,
    onDeviceChange,
    isBlurEnabled = false,
    onToggleBlur,
    isNoiseSuppressionEnabled = true,
    onToggleNoiseSuppression
}: DeviceSettingsModalProps) {
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
    const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])
    const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])

    const [selectedAudioInput, setSelectedAudioInput] = useState<string>('')
    const [selectedVideoInput, setSelectedVideoInput] = useState<string>('')
    const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('')

    const [micVolume, setMicVolume] = useState<number>(0)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animFrameRef = useRef<number | null>(null)

    // Enumerate connected devices
    useEffect(() => {
        if (!isOpen) return

        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const mics = devices.filter((d) => d.kind === 'audioinput')
                const cams = devices.filter((d) => d.kind === 'videoinput')
                const speakers = devices.filter((d) => d.kind === 'audiooutput')

                setAudioInputs(mics)
                setVideoInputs(cams)
                setAudioOutputs(speakers)

                if (mics.length > 0 && !selectedAudioInput) {
                    setSelectedAudioInput(mics[0].deviceId)
                }
                if (cams.length > 0 && !selectedVideoInput) {
                    setSelectedVideoInput(cams[0].deviceId)
                }
                if (speakers.length > 0 && !selectedAudioOutput) {
                    setSelectedAudioOutput(speakers[0].deviceId)
                }
            } catch (err) {
                console.warn('Unable to enumerate media devices:', err)
            }
        }

        getDevices()
        navigator.mediaDevices.addEventListener('devicechange', getDevices)
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', getDevices)
        }
    }, [isOpen])

    // Live Mic Volume Meter
    useEffect(() => {
        if (!isOpen || !localStream) {
            setMicVolume(0)
            return
        }

        const audioTrack = localStream.getAudioTracks()[0]
        if (!audioTrack) return

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
            const ctx = new AudioContextClass()
            audioContextRef.current = ctx

            const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]))
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 64
            source.connect(analyser)
            analyserRef.current = analyser

            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const updateMeter = () => {
                if (!analyserRef.current) return
                analyserRef.current.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                const avg = sum / dataArray.length
                setMicVolume(Math.min(100, Math.round((avg / 128) * 100)))
                animFrameRef.current = requestAnimationFrame(updateMeter)
            }

            updateMeter()
        } catch (e) {
            // Web Audio not permitted or failed
        }

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close()
            }
        }
    }, [isOpen, localStream])

    const handleTestSpeaker = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
            const ctx = new AudioContextClass()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = 'sine'
            osc.frequency.setValueAtTime(440, ctx.currentTime)
            gain.gain.setValueAtTime(0.1, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start()
            osc.stop(ctx.currentTime + 0.5)
        } catch (e) {}
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-container anim-scale-in" style={{ maxWidth: 540 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.25rem' }}>⚙️</span>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#fff' }}>Audio & Video Settings</h3>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>
                        ✕
                    </button>
                </div>

                {/* Video Camera Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📹 Camera
                    </label>
                    <select
                        value={selectedVideoInput}
                        onChange={(e) => {
                            setSelectedVideoInput(e.target.value)
                            onDeviceChange?.('video', e.target.value)
                        }}
                        className="input py-2 px-3 text-sm"
                        style={{ background: 'var(--color-surface-2)', color: '#fff' }}
                    >
                        {videoInputs.length === 0 ? (
                            <option value="">Default Camera</option>
                        ) : (
                            videoInputs.map((d, i) => (
                                <option key={d.deviceId || i} value={d.deviceId}>
                                    {d.label || `Camera ${i + 1}`}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                {/* Microphone Selection & Meter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🎙️ Microphone
                    </label>
                    <select
                        value={selectedAudioInput}
                        onChange={(e) => {
                            setSelectedAudioInput(e.target.value)
                            onDeviceChange?.('audio', e.target.value)
                        }}
                        className="input py-2 px-3 text-sm"
                        style={{ background: 'var(--color-surface-2)', color: '#fff' }}
                    >
                        {audioInputs.length === 0 ? (
                            <option value="">Default Microphone</option>
                        ) : (
                            audioInputs.map((d, i) => (
                                <option key={d.deviceId || i} value={d.deviceId}>
                                    {d.label || `Microphone ${i + 1}`}
                                </option>
                            ))
                        )}
                    </select>

                    {/* Volume Visualizer Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Input Level:</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                                width: `${micVolume}%`,
                                height: '100%',
                                background: micVolume > 75 ? '#ef4444' : micVolume > 40 ? '#f59e0b' : '#22c55e',
                                transition: 'width 0.08s ease'
                            }} />
                        </div>
                    </div>
                </div>

                {/* Speaker Output Selection */}
                {audioOutputs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                🔊 Speaker / Output
                            </label>
                            <button onClick={handleTestSpeaker} className="btn btn-secondary text-xs" style={{ padding: '3px 8px' }}>
                                Test Output
                            </button>
                        </div>
                        <select
                            value={selectedAudioOutput}
                            onChange={(e) => setSelectedAudioOutput(e.target.value)}
                            className="input py-2 px-3 text-sm"
                            style={{ background: 'var(--color-surface-2)', color: '#fff' }}
                        >
                            {audioOutputs.map((d, i) => (
                                <option key={d.deviceId || i} value={d.deviceId}>
                                    {d.label || `Speaker ${i + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Visual & Audio Processing Effects */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: 0 }}>
                        Smart Processing & Effects
                    </h4>

                    {/* Virtual Background Blur */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Camera Background Blur</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Soft focus background privacy filter</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={isBlurEnabled}
                            onChange={(e) => onToggleBlur?.(e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                        />
                    </div>

                    {/* Noise Suppression */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Noise Suppression</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Suppress background fan and typing noise</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={isNoiseSuppressionEnabled}
                            onChange={(e) => onToggleNoiseSuppression?.(e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
