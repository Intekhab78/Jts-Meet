import { useState, useEffect } from 'react'

interface UseMeetingActiveSpeakerProps {
    localStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    isMuted: boolean
}

export const useMeetingActiveSpeaker = ({
    localStream,
    remoteStreams,
    isMuted
}: UseMeetingActiveSpeakerProps) => {
    const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)

    // Active speaker volume level detector
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        const audioContext = new AudioContextClass()
        const analysers: { [key: string]: { analyser: AnalyserNode, source: MediaStreamAudioSourceNode } } = {}
        let silenceTimer: any = null

        const interval = setInterval(() => {
            let maxVal = 0
            let loudestUser: string | null = null

            // Check local mic volume
            if (localStream && !isMuted) {
                const tracks = localStream.getAudioTracks()
                if (tracks.length > 0 && tracks[0].enabled) {
                    if (!analysers['me']) {
                        try {
                            const source = audioContext.createMediaStreamSource(localStream)
                            const analyser = audioContext.createAnalyser()
                            source.connect(analyser)
                            analysers['me'] = { analyser, source }
                        } catch (e) { }
                    }
                    const data = new Uint8Array(16)
                    analysers['me']?.analyser.getByteFrequencyData(data)
                    const avg = data.reduce((a, b) => a + b, 0) / data.length
                    if (avg > 30 && avg > maxVal) {
                        maxVal = avg
                        loudestUser = 'me'
                    }
                }
            }

            // Check remote streams volume
            Object.entries(remoteStreams).forEach(([userId, stream]) => {
                const tracks = stream.getAudioTracks()
                if (tracks.length > 0 && tracks[0].enabled) {
                    if (!analysers[userId]) {
                        try {
                            const source = audioContext.createMediaStreamSource(stream)
                            const analyser = audioContext.createAnalyser()
                            source.connect(analyser)
                            analysers[userId] = { analyser, source }
                        } catch (e) { }
                    }
                    const data = new Uint8Array(16)
                    analysers[userId]?.analyser.getByteFrequencyData(data)
                    const avg = data.reduce((a, b) => a + b, 0) / data.length
                    if (avg > 30 && avg > maxVal) {
                        maxVal = avg
                        loudestUser = userId
                    }
                }
            })

            if (loudestUser) {
                if (silenceTimer) clearTimeout(silenceTimer)
                setActiveSpeaker(prev => (prev === loudestUser ? prev : loudestUser))
                silenceTimer = setTimeout(() => {
                    setActiveSpeaker(null)
                }, 1500)
            }
        }, 400)

        return () => {
            clearInterval(interval)
            if (silenceTimer) clearTimeout(silenceTimer)
            Object.values(analysers).forEach(a => {
                try {
                    a.source.disconnect()
                } catch (e) { }
            })
            audioContext.close().catch(() => { })
        }
    }, [localStream, remoteStreams, isMuted])

    return {
        activeSpeaker,
        setActiveSpeaker
    }
}
