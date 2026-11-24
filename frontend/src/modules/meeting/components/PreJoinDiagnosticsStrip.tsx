import React, { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../../../config'

export interface PreJoinDiagnosticsStripProps {
    stream: MediaStream | null
    isMicMuted: boolean
}

export const PreJoinDiagnosticsStrip: React.FC<PreJoinDiagnosticsStripProps> = ({
    stream,
    isMicMuted
}) => {
    const [micLevel, setMicLevel] = useState(0)
    const [isTestingSpeaker, setIsTestingSpeaker] = useState(false)
    const [networkPingMs, setNetworkPingMs] = useState<number | null>(null)
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
    const rafRef = useRef<number | null>(null)

    // Real-time Web Audio API mic level meter
    useEffect(() => {
        if (isMicMuted || !stream) {
            setMicLevel(0)
            return
        }
        const audioTrack = stream.getAudioTracks().find(t => t.readyState === 'live' && t.enabled)
        if (!audioTrack) {
            setMicLevel(0)
            return
        }

        let audioCtx: AudioContext | null = null
        let source: MediaStreamAudioSourceNode | null = null
        let cancelled = false

        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext
            if (!Ctx) return
            audioCtx = new Ctx()
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]))
            source.connect(analyser)
            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const tick = () => {
                if (cancelled) return
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                const avg = sum / dataArray.length
                setMicLevel(Math.min(100, Math.round((avg / 64) * 100)))
                rafRef.current = requestAnimationFrame(tick)
            }
            rafRef.current = requestAnimationFrame(tick)
        } catch {
            setMicLevel(0)
        }

        return () => {
            cancelled = true
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
            try { source?.disconnect() } catch {}
            try { audioCtx?.close() } catch {}
        }
    }, [stream, isMicMuted])

    // Network health & latency probe
    useEffect(() => {
        const updateOnline = () => setIsOnline(navigator.onLine)
        window.addEventListener('online', updateOnline)
        window.addEventListener('offline', updateOnline)

        let mounted = true
        const checkLatency = async () => {
            if (!navigator.onLine) {
                if (mounted) setNetworkPingMs(null)
                return
            }
            const start = performance.now()
            try {
                await fetch(`${API_BASE}/api/health`, { method: 'GET', cache: 'no-store' })
                if (mounted) setNetworkPingMs(Math.max(1, Math.round(performance.now() - start)))
            } catch {
                if (mounted) setNetworkPingMs(null)
            }
        }

        checkLatency()
        const timer = setInterval(checkLatency, 15000)

        return () => {
            mounted = false
            clearInterval(timer)
            window.removeEventListener('online', updateOnline)
            window.removeEventListener('offline', updateOnline)
        }
    }, [])

    const handleTestSpeaker = () => {
        if (isTestingSpeaker) return
        setIsTestingSpeaker(true)
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext
            if (!Ctx) {
                setIsTestingSpeaker(false)
                return
            }
            const ctx = new Ctx()
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sine'
                osc.frequency.setValueAtTime(freq, startTime)
                gain.gain.setValueAtTime(0.001, startTime)
                gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.03)
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start(startTime)
                osc.stop(startTime + duration)
            }
            const now = ctx.currentTime
            playTone(523.25, now, 0.22)
            playTone(659.25, now + 0.2, 0.28)
            setTimeout(() => {
                try { ctx.close() } catch {}
                setIsTestingSpeaker(false)
            }, 600)
        } catch {
            setIsTestingSpeaker(false)
        }
    }

    const netColor = !isOnline
        ? '#f87171'
        : networkPingMs === null
            ? '#94a3b8'
            : networkPingMs < 120
                ? '#34d399'
                : networkPingMs < 280
                    ? '#fbbf24'
                    : '#f87171'

    const netLabel = !isOnline
        ? 'Offline'
        : networkPingMs === null
            ? 'Checking...'
            : networkPingMs < 120
                ? `Good (${networkPingMs}ms)`
                : networkPingMs < 280
                    ? `Fair (${networkPingMs}ms)`
                    : `Slow (${networkPingMs}ms)`

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(15, 23, 42, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.75rem',
                color: '#cbd5e1'
            }}
        >
            {/* Live Mic Level Meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140, flex: '1 1 140px' }}>
                <span style={{ fontWeight: 600, color: isMicMuted ? '#f87171' : '#94a3b8', whiteSpace: 'nowrap' }}>
                    {isMicMuted ? 'Mic Muted' : 'Mic Level'}
                </span>
                <div style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    minWidth: 64
                }}>
                    <div style={{
                        width: `${isMicMuted ? 0 : Math.max(4, micLevel)}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: micLevel > 75 ? '#fbbf24' : '#34d399',
                        transition: 'width 80ms linear'
                    }} />
                </div>
            </div>

            {/* Test Speaker Button */}
            <button
                type="button"
                onClick={handleTestSpeaker}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    background: isTestingSpeaker ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)',
                    color: '#a5b4fc',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                {isTestingSpeaker ? 'Playing...' : 'Test Speaker'}
            </button>

            {/* Network Latency Indicator */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: netColor }}>
                <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: netColor,
                    boxShadow: `0 0 8px ${netColor}`
                }} />
                <span>Net: {netLabel}</span>
            </div>
        </div>
    )
}
