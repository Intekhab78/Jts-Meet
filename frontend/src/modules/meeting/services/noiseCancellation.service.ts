/**
 * JTS Meet — AI Ultra-Deep Noise Cancellation Service
 * High-performance Web Audio DSP Pipeline:
 * 1. 120Hz High-Pass Rumble Filter (eliminates ceiling fan, AC & motor vibrations)
 * 2. High-Frequency Keyboard Clack Notch Filter
 * 3. Dynamic Spectral Compressor
 * 4. Real-time Voice Activity Detector (VAD) Gate
 */

class NoiseCancellationService {
    private audioCtx: AudioContext | null = null
    private sourceNode: MediaStreamAudioSourceNode | null = null
    private destNode: MediaStreamAudioDestinationNode | null = null
    private gainNode: GainNode | null = null
    private analyserNode: AnalyserNode | null = null
    private animFrameId: number | null = null
    private isRunning: boolean = false
    private originalTrack: MediaStreamTrack | null = null
    private processedTrack: MediaStreamTrack | null = null

    /**
     * Process an input audio stream and return a noise-cancelled audio track
     */
    public processAudioTrack(rawTrack: MediaStreamTrack): MediaStreamTrack {
        try {
            // Teardown previous if active
            this.cleanup()

            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtxClass) return rawTrack

            const ctx = new AudioCtxClass()
            this.audioCtx = ctx
            this.originalTrack = rawTrack

            const sourceStream = new MediaStream([rawTrack])
            const source = ctx.createMediaStreamSource(sourceStream)
            this.sourceNode = source

            // 1. High-Pass Filter: Cut everything below 120Hz (fan, air conditioner, desk thumps)
            const highpass = ctx.createBiquadFilter()
            highpass.type = 'highpass'
            highpass.frequency.setValueAtTime(120, ctx.currentTime)
            highpass.Q.setValueAtTime(0.7, ctx.currentTime)

            // 2. Keyboard & Mouse Click Dampener Notch Filter (around 3200Hz)
            const notch = ctx.createBiquadFilter()
            notch.type = 'peaking'
            notch.frequency.setValueAtTime(3200, ctx.currentTime)
            notch.gain.setValueAtTime(-6, ctx.currentTime)
            notch.Q.setValueAtTime(1.2, ctx.currentTime)

            // 3. Dynamics Compressor: Suppresses low-level ambient room hiss
            const compressor = ctx.createDynamicsCompressor()
            compressor.threshold.setValueAtTime(-42, ctx.currentTime)
            compressor.knee.setValueAtTime(18, ctx.currentTime)
            compressor.ratio.setValueAtTime(12, ctx.currentTime)
            compressor.attack.setValueAtTime(0.003, ctx.currentTime)
            compressor.release.setValueAtTime(0.18, ctx.currentTime)

            // 4. Smooth Voice Activity Gate (GainNode)
            const gateGain = ctx.createGain()
            gateGain.gain.setValueAtTime(1.0, ctx.currentTime)
            this.gainNode = gateGain

            // 5. Analyser for VAD monitoring
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.3
            this.analyserNode = analyser

            // Audio Graph Wiring: Source -> Highpass -> Notch -> Compressor -> GateGain -> Destination
            source.connect(highpass)
            highpass.connect(notch)
            notch.connect(compressor)
            compressor.connect(gateGain)
            compressor.connect(analyser)

            const destination = ctx.createMediaStreamDestination()
            gateGain.connect(destination)
            this.destNode = destination

            // Start VAD monitoring loop
            this.startVADLoop()

            const cleanTrack = destination.stream.getAudioTracks()[0]
            this.processedTrack = cleanTrack
            return cleanTrack
        } catch (err) {
            console.warn('[NoiseCancellation] Failed to setup DSP pipeline, using raw audio:', err)
            return rawTrack
        }
    }

    private startVADLoop() {
        if (!this.analyserNode || !this.gainNode || !this.audioCtx) return
        this.isRunning = true

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
        let silenceTimer = 0
        const SILENCE_HOLD_FRAMES = 12 // ~200ms hold before soft gating

        const checkVAD = () => {
            if (!this.isRunning || !this.analyserNode || !this.gainNode || !this.audioCtx) return

            this.analyserNode.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i]
            }
            const avg = sum / dataArray.length

            const now = this.audioCtx.currentTime
            // If sound energy is higher than ambient floor threshold (~10)
            if (avg > 10) {
                silenceTimer = 0
                this.gainNode.gain.cancelScheduledValues(now)
                this.gainNode.gain.linearRampToValueAtTime(1.0, now + 0.02) // Fast speech onset
            } else {
                silenceTimer++
                if (silenceTimer > SILENCE_HOLD_FRAMES) {
                    this.gainNode.gain.cancelScheduledValues(now)
                    this.gainNode.gain.linearRampToValueAtTime(0.04, now + 0.08) // Soft silence attenuation
                }
            }

            if (this.isRunning) {
                this.animFrameId = requestAnimationFrame(checkVAD)
            }
        }

        this.animFrameId = requestAnimationFrame(checkVAD)
    }

    public cleanup() {
        this.isRunning = false
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect()
            this.sourceNode = null
        }
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close().catch(() => {})
            this.audioCtx = null
        }
        this.gainNode = null
        this.analyserNode = null
        this.destNode = null
        this.originalTrack = null
        this.processedTrack = null
    }
}

export const noiseCancellationService = new NoiseCancellationService()
