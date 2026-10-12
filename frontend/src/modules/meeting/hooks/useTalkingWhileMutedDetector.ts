import { useState, useEffect } from 'react'

interface UseTalkingWhileMutedDetectorProps {
    isMuted: boolean
    localStream: MediaStream | null
}

export const useTalkingWhileMutedDetector = ({
    isMuted,
    localStream
}: UseTalkingWhileMutedDetectorProps) => {
    const [showTalkingWhileMuted, setShowTalkingWhileMuted] = useState(false)

    // Auto-hide "Talking while muted" pill after exactly 2 seconds
    useEffect(() => {
        if (!showTalkingWhileMuted) return
        const t = setTimeout(() => {
            setShowTalkingWhileMuted(false)
        }, 2000)
        return () => clearTimeout(t)
    }, [showTalkingWhileMuted])

    // Talking While Muted Voice Activity Detector
    useEffect(() => {
        if (!isMuted || !localStream) {
            setShowTalkingWhileMuted(false)
            return
        }

        const audioTracks = localStream.getAudioTracks()
        if (audioTracks.length === 0) return

        let audioCtx: AudioContext | null = null
        let animFrameId: number | null = null
        let monitorTrack: MediaStreamTrack | null = null
        let consecutiveSpeechCount = 0
        let cooldownUntil = 0

        try {
            // Clone track to monitor raw mic input without streaming audio to peers
            monitorTrack = audioTracks[0].clone()
            monitorTrack.enabled = true
            const monitorStream = new MediaStream([monitorTrack])

            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtxClass) return
            audioCtx = new AudioCtxClass()
            const source = audioCtx.createMediaStreamSource(monitorStream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.4
            source.connect(analyser)

            const buffer = new Uint8Array(analyser.frequencyBinCount)

            const checkSpeech = () => {
                if (!audioCtx || audioCtx.state === 'closed') return
                analyser.getByteFrequencyData(buffer)

                // Human speech formant frequency range: bins 2 to 24 (approx 375Hz to 4500Hz)
                // Filters out low-frequency laptop fan noise / ambient AC hum in bins 0-1
                let voiceSum = 0
                let voiceCount = 0
                for (let i = 2; i <= 24; i++) {
                    voiceSum += buffer[i]
                    voiceCount++
                }
                const voiceVolume = voiceCount > 0 ? (voiceSum / voiceCount) : 0

                const now = Date.now()
                // Clear, intentional voice speech threshold (voiceVolume > 38)
                if (voiceVolume > 38 && now >= cooldownUntil) {
                    consecutiveSpeechCount++
                    if (consecutiveSpeechCount >= 5) {
                        setShowTalkingWhileMuted(true)
                        cooldownUntil = now + 6000 // 6 second cooldown before alerting again
                        consecutiveSpeechCount = 0
                    }
                } else {
                    consecutiveSpeechCount = Math.max(0, consecutiveSpeechCount - 1)
                }

                animFrameId = requestAnimationFrame(checkSpeech)
            }

            animFrameId = requestAnimationFrame(checkSpeech)
        } catch (err) {
            console.warn('[TalkingWhileMuted] Detector error:', err)
        }

        return () => {
            if (animFrameId) cancelAnimationFrame(animFrameId)
            if (monitorTrack) monitorTrack.stop()
            if (audioCtx && audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {})
            }
        }
    }, [isMuted, localStream])

    return {
        showTalkingWhileMuted,
        setShowTalkingWhileMuted
    }
}
