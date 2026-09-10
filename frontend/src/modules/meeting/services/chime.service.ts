// Web Audio API based Synthesized Chimes (Zero external audio asset dependencies)

let audioCtx: AudioContext | null = null
let ringtoneInterval: any = null

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioCtx = new AudioContextClass()
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume()
    }
    return audioCtx
}

export function playJoinChime() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(523.25, now) // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1) // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2) // G5

        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.5)
    } catch (e) {
        // AudioContext restricted before gesture
    }
}

export function playLeaveChime() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(659.25, now) // E5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.2) // C5

        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.45)
    } catch (e) {}
}

export function startRingtone() {
    stopRingtone()

    const playPulse = () => {
        try {
            const ctx = getAudioContext()
            const now = ctx.currentTime

            const tones = [587.33, 739.99, 880.00] // D5, F#5, A5
            tones.forEach((freq, idx) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()

                osc.type = 'triangle'
                osc.frequency.setValueAtTime(freq, now + idx * 0.1)

                gain.gain.setValueAtTime(0.001, now + idx * 0.1)
                gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.04)
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35)

                osc.connect(gain)
                gain.connect(ctx.destination)

                osc.start(now + idx * 0.1)
                osc.stop(now + idx * 0.1 + 0.4)
            })
        } catch (e) {}
    }

    playPulse()
    ringtoneInterval = setInterval(playPulse, 2400)
}

export function stopRingtone() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval)
        ringtoneInterval = null
    }
}

export function playKnockChime() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, now) // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
        
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.22, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.4)
    } catch (e) {}
}

export function playSpeakerTestSound(onComplete?: () => void) {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime
        const notes = [
            { freq: 440.0, time: 0 },       // A4
            { freq: 554.37, time: 0.15 },   // C#5
            { freq: 659.25, time: 0.3 },    // E5
            { freq: 880.0, time: 0.45 },    // A5
        ]

        notes.forEach(({ freq, time }) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, now + time)

            gain.gain.setValueAtTime(0.001, now + time)
            gain.gain.exponentialRampToValueAtTime(0.2, now + time + 0.04)
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.35)

            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + time)
            osc.stop(now + time + 0.36)
        })

        if (onComplete) {
            setTimeout(onComplete, 900)
        }
    } catch {
        if (onComplete) onComplete()
    }
}
