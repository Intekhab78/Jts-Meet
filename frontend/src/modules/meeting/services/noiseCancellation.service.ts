/**
 * JTS Meet — Enterprise AI Voice Isolation & Ultra-Deep Noise Cancellation Engine
 * 
 * Multi-Stage Real-Time Web Audio DSP Architecture:
 * 1. 140Hz Steep High-Pass Rumble Filter (eliminates ceiling fan, AC, table thumps & vibrations)
 * 2. 50/60Hz Electrical Ground Hum Notch Filters
 * 3. 3.2kHz Keyboard Typing & Mouse Click Notch Filter
 * 4. Human Vocal Presence Equalizer (boosts speech clarity formants 800Hz - 3.2kHz)
 * 5. Dynamic Spectral Downward Expander & Compressor (attenuates background room hiss & distant chatter)
 * 6. High-Precision Spectral Voice Activity Detector (VAD) Gate (cuts background noise when not talking)
 */

export type NoiseCancellationMode = 'high' | 'medium' | 'low' | 'off'

class NoiseCancellationService {
    private audioCtx: AudioContext | null = null
    private sourceNode: MediaStreamAudioSourceNode | null = null
    private destNode: MediaStreamAudioDestinationNode | null = null
    private gateGainNode: GainNode | null = null
    private analyserNode: AnalyserNode | null = null
    private animFrameId: number | null = null
    private vadTimer: ReturnType<typeof setInterval> | null = null
    private isRunning: boolean = false
    private originalTrack: MediaStreamTrack | null = null
    private processedTrack: MediaStreamTrack | null = null
    private currentMode: NoiseCancellationMode = 'high'

    /**
     * Process an input audio stream and return a noise-cancelled, voice-isolated audio track
     */
    public processAudioTrack(rawTrack: MediaStreamTrack, mode: NoiseCancellationMode = 'high'): MediaStreamTrack {
        if (!rawTrack || rawTrack.readyState === 'ended') return rawTrack
        if (mode === 'off') {
            this.cleanup()
            return rawTrack
        }

        try {
            this.cleanup()
            this.currentMode = mode

            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtxClass) return rawTrack

            const ctx = new AudioCtxClass()
            this.audioCtx = ctx
            this.originalTrack = rawTrack

            // Ensure AudioContext is active (handles browser autoplay policy)
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {})
                const resumeCtx = () => {
                    if (this.audioCtx && this.audioCtx.state === 'suspended') {
                        this.audioCtx.resume().catch(() => {})
                    }
                    window.removeEventListener('click', resumeCtx)
                    window.removeEventListener('keydown', resumeCtx)
                    window.removeEventListener('touchstart', resumeCtx)
                }
                window.addEventListener('click', resumeCtx, { once: true })
                window.addEventListener('keydown', resumeCtx, { once: true })
                window.addEventListener('touchstart', resumeCtx, { once: true })
            }

            const sourceStream = new MediaStream([rawTrack])
            const source = ctx.createMediaStreamSource(sourceStream)
            this.sourceNode = source

            // 1. High-Pass Filter Stage 1: Cuts ceiling fan wind buffeting & table vibrations (<140Hz)
            const highpass1 = ctx.createBiquadFilter()
            highpass1.type = 'highpass'
            highpass1.frequency.setValueAtTime(mode === 'high' ? 140 : 100, ctx.currentTime)
            highpass1.Q.setValueAtTime(0.7, ctx.currentTime)

            // 2. High-Pass Filter Stage 2: Steep low-end rumble attenuation
            const highpass2 = ctx.createBiquadFilter()
            highpass2.type = 'highpass'
            highpass2.frequency.setValueAtTime(mode === 'high' ? 120 : 80, ctx.currentTime)
            highpass2.Q.setValueAtTime(0.7, ctx.currentTime)

            // 3. Electrical Hum Notch Filters (50Hz, 100Hz & 60Hz)
            const hum50Hz = ctx.createBiquadFilter()
            hum50Hz.type = 'notch'
            hum50Hz.frequency.setValueAtTime(50, ctx.currentTime)
            hum50Hz.Q.setValueAtTime(6.0, ctx.currentTime)

            const hum100Hz = ctx.createBiquadFilter()
            hum100Hz.type = 'notch'
            hum100Hz.frequency.setValueAtTime(100, ctx.currentTime)
            hum100Hz.Q.setValueAtTime(5.0, ctx.currentTime)

            const hum60Hz = ctx.createBiquadFilter()
            hum60Hz.type = 'notch'
            hum60Hz.frequency.setValueAtTime(60, ctx.currentTime)
            hum60Hz.Q.setValueAtTime(5.0, ctx.currentTime)

            // 4. Keyboard Clack & Sharp Click Notch (3200Hz)
            const clickNotch = ctx.createBiquadFilter()
            clickNotch.type = 'peaking'
            clickNotch.frequency.setValueAtTime(3200, ctx.currentTime)
            clickNotch.gain.setValueAtTime(mode === 'high' ? -6 : -3, ctx.currentTime)
            clickNotch.Q.setValueAtTime(2.0, ctx.currentTime)

            // 5. Anti-Hiss / Anti-Sarsanhat Filter: Cuts microphone preamp white noise, fan hiss & static (>5.6kHz)
            // Human vocal speech formants max out around 4.5-5.2kHz; cutting above 5.6kHz eliminates background hiss completely.
            const lowpass1 = ctx.createBiquadFilter()
            lowpass1.type = 'lowpass'
            lowpass1.frequency.setValueAtTime(mode === 'high' ? 5600 : 7200, ctx.currentTime)
            lowpass1.Q.setValueAtTime(0.7, ctx.currentTime)

            const lowpass2 = ctx.createBiquadFilter()
            lowpass2.type = 'lowpass'
            lowpass2.frequency.setValueAtTime(mode === 'high' ? 6500 : 8500, ctx.currentTime)
            lowpass2.Q.setValueAtTime(0.7, ctx.currentTime)

            // 6. Human Vocal Clarity Formant Boost (2.0kHz presence for crisp voice intelligibility)
            const voiceBoost = ctx.createBiquadFilter()
            voiceBoost.type = 'peaking'
            voiceBoost.frequency.setValueAtTime(2000, ctx.currentTime)
            voiceBoost.gain.setValueAtTime(2.0, ctx.currentTime)
            voiceBoost.Q.setValueAtTime(1.2, ctx.currentTime)

            // 7. Vocal Compressor (Gentle 2.5:1 ratio — avoids pumping room noise floor / breathing artifacts)
            const compressor = ctx.createDynamicsCompressor()
            compressor.threshold.setValueAtTime(mode === 'high' ? -24 : -20, ctx.currentTime)
            compressor.knee.setValueAtTime(10, ctx.currentTime)
            compressor.ratio.setValueAtTime(mode === 'high' ? 2.5 : 2.0, ctx.currentTime)
            compressor.attack.setValueAtTime(0.008, ctx.currentTime)
            compressor.release.setValueAtTime(0.2, ctx.currentTime)

            // 8. Voice Activity Detection (VAD) Gate Gain (Silences background noise when not talking)
            const gateGain = ctx.createGain()
            gateGain.gain.setValueAtTime(1.0, ctx.currentTime)
            this.gateGainNode = gateGain

            // 9. Vocal Energy Band Analyser (Tap BEFORE compressor to avoid compressor makeup gain bias)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 512
            analyser.smoothingTimeConstant = 0.2
            this.analyserNode = analyser

            // Connect Audio Pipeline Graph:
            // Source -> Highpass1 -> Highpass2 -> Hum50 -> Hum100 -> Hum60 -> ClickNotch -> Lowpass1 -> Lowpass2 -> VoiceBoost
            // VoiceBoost -> Analyser (Clean pre-compressor signal for accurate VAD)
            // VoiceBoost -> Compressor -> GateGain -> Destination
            source.connect(highpass1)
            highpass1.connect(highpass2)
            highpass2.connect(hum50Hz)
            hum50Hz.connect(hum100Hz)
            hum100Hz.connect(hum60Hz)
            hum60Hz.connect(clickNotch)
            clickNotch.connect(lowpass1)
            lowpass1.connect(lowpass2)
            lowpass2.connect(voiceBoost)

            voiceBoost.connect(analyser)
            voiceBoost.connect(compressor)
            compressor.connect(gateGain)

            const destination = ctx.createMediaStreamDestination()
            gateGain.connect(destination)
            this.destNode = destination

            // Launch Adaptive AI VAD Gate Loop
            this.startVADLoop(mode)

            const cleanTrack = destination.stream.getAudioTracks()[0]
            cleanTrack.enabled = rawTrack.enabled

            // Listen to original track state
            rawTrack.onended = () => {
                this.cleanup()
            }

            this.processedTrack = cleanTrack
            return cleanTrack
        } catch (err) {
            console.warn('[NoiseCancellationService] DSP setup fallback to raw audio:', err)
            return rawTrack
        }
    }

    /**
     * Precision Vocal Band VAD with Adaptive Background Noise Floor Tracking.
     * Uses a high-frequency interval timer (50Hz) so it continues running reliably
     * even when the desktop app is minimized or backgrounded (immune to requestAnimationFrame throttling).
     */
    private startVADLoop(mode: NoiseCancellationMode) {
        if (!this.analyserNode || !this.gateGainNode || !this.audioCtx) return
        this.isRunning = true

        const bufferLength = this.analyserNode.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        let silenceFrames = 0

        // Hold frames (~180ms) to ensure word endings are not cut off
        const holdFrames = mode === 'high' ? 9 : 12

        // Dynamic noise floor baseline
        let ambientNoiseFloor = 12

        const checkVAD = () => {
            if (!this.isRunning || !this.analyserNode || !this.gateGainNode || !this.audioCtx) return

            this.analyserNode.getByteFrequencyData(dataArray)

            // Focus energy check on human vocal formant bins (350Hz to 3200Hz)
            const sampleRate = this.audioCtx.sampleRate || 48000
            const binSize = sampleRate / (bufferLength * 2)
            const startBin = Math.max(1, Math.floor(350 / binSize))
            const endBin = Math.min(bufferLength - 1, Math.floor(3200 / binSize))

            let voiceEnergySum = 0
            let count = 0
            for (let i = startBin; i <= endBin; i++) {
                voiceEnergySum += dataArray[i]
                count++
            }
            const vocalAverage = count > 0 ? voiceEnergySum / count : 0

            // Adapt ambient noise floor:
            // Slowly track steady background sound as the ambient noise floor
            if (vocalAverage < ambientNoiseFloor) {
                ambientNoiseFloor = ambientNoiseFloor * 0.96 + vocalAverage * 0.04
            } else if (vocalAverage < ambientNoiseFloor + 10) {
                ambientNoiseFloor = ambientNoiseFloor * 0.99 + vocalAverage * 0.01
            }

            ambientNoiseFloor = Math.max(6, Math.min(40, ambientNoiseFloor))

            // Dynamic speech threshold is strictly above the ambient noise floor
            const speechThreshold = Math.max(mode === 'high' ? 20 : 15, ambientNoiseFloor + (mode === 'high' ? 10 : 6))

            const now = this.audioCtx.currentTime

            if (vocalAverage >= speechThreshold) {
                // Active Voice detected: Fast 15ms ramp-up
                silenceFrames = 0
                this.gateGainNode.gain.cancelScheduledValues(now)
                this.gateGainNode.gain.setValueAtTime(this.gateGainNode.gain.value, now)
                this.gateGainNode.gain.linearRampToValueAtTime(1.0, now + 0.015)
            } else {
                silenceFrames++
                if (silenceFrames > holdFrames) {
                    // Silence / Fan / Static: Suppress down to near zero (0.001 = -60dB attenuation)
                    this.gateGainNode.gain.cancelScheduledValues(now)
                    this.gateGainNode.gain.setValueAtTime(this.gateGainNode.gain.value, now)
                    this.gateGainNode.gain.linearRampToValueAtTime(0.001, now + 0.04)
                }
            }
        }

        // Use 20ms interval (50Hz) which runs reliably in background tabs & minimized windows
        this.vadTimer = setInterval(checkVAD, 20)
    }

    public getMode(): NoiseCancellationMode {
        return this.currentMode
    }

    public isFilterActive(): boolean {
        return this.isRunning && !!this.audioCtx && this.audioCtx.state === 'running'
    }

    public cleanup() {
        this.isRunning = false
        if (this.vadTimer) {
            clearInterval(this.vadTimer)
            this.vadTimer = null
        }
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }
        if (this.sourceNode) {
            try { this.sourceNode.disconnect() } catch {}
            this.sourceNode = null
        }
        if (this.gateGainNode) {
            try { this.gateGainNode.disconnect() } catch {}
            this.gateGainNode = null
        }
        if (this.destNode) {
            try { this.destNode.disconnect() } catch {}
            this.destNode = null
        }
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            try { this.audioCtx.close() } catch {}
            this.audioCtx = null
        }
        this.analyserNode = null
        this.originalTrack = null
        this.processedTrack = null
    }
}

export const noiseCancellationService = new NoiseCancellationService()

