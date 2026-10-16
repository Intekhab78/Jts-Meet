import { useState, useEffect, useRef } from 'react'

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
    const audioContextRef = useRef<AudioContext | null>(null)
    const analysersRef = useRef<{ [key: string]: { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; streamId: string } }>({})

    // Ensure AudioContext is initialized once and resumed on user gesture
    useEffect(() => {
        const getOrCreateAudioContext = () => {
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
                if (AudioContextClass) {
                    audioContextRef.current = new AudioContextClass()
                }
            }
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(() => {})
            }
            return audioContextRef.current
        }

        const handleUserGesture = () => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(() => {})
            }
        }

        window.addEventListener('click', handleUserGesture)
        window.addEventListener('keydown', handleUserGesture)
        window.addEventListener('touchstart', handleUserGesture)

        return () => {
            window.removeEventListener('click', handleUserGesture)
            window.removeEventListener('keydown', handleUserGesture)
            window.removeEventListener('touchstart', handleUserGesture)
        }
    }, [])

    // Active speaker volume level detector using persistent AudioContext
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContextClass()
        }
        const audioContext = audioContextRef.current

        let silenceTimer: any = null

        const interval = setInterval(() => {
            if (!audioContext || audioContext.state === 'closed') return
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {})
                return
            }

            let maxVal = 0
            let loudestUser: string | null = null

            // Check local mic volume
            if (localStream && !isMuted) {
                const tracks = localStream.getAudioTracks()
                if (tracks.length > 0 && tracks[0].enabled) {
                    const currentEntry = analysersRef.current['me']
                    if (!currentEntry || currentEntry.streamId !== localStream.id) {
                        try {
                            if (currentEntry) currentEntry.source.disconnect()
                            const source = audioContext.createMediaStreamSource(localStream)
                            const analyser = audioContext.createAnalyser()
                            source.connect(analyser)
                            analysersRef.current['me'] = { analyser, source, streamId: localStream.id }
                        } catch (e) { }
                    }
                    const data = new Uint8Array(16)
                    analysersRef.current['me']?.analyser.getByteFrequencyData(data)
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
                    const currentEntry = analysersRef.current[userId]
                    if (!currentEntry || currentEntry.streamId !== stream.id) {
                        try {
                            if (currentEntry) currentEntry.source.disconnect()
                            const source = audioContext.createMediaStreamSource(stream)
                            const analyser = audioContext.createAnalyser()
                            source.connect(analyser)
                            analysersRef.current[userId] = { analyser, source, streamId: stream.id }
                        } catch (e) { }
                    }
                    const data = new Uint8Array(16)
                    analysersRef.current[userId]?.analyser.getByteFrequencyData(data)
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
        }
    }, [localStream, remoteStreams, isMuted])

    // Clean up analyser and audio source nodes for participants who left
    useEffect(() => {
        Object.keys(analysersRef.current).forEach((id) => {
            if (id !== 'me' && !remoteStreams[id]) {
                try {
                    analysersRef.current[id].source.disconnect()
                } catch (e) {}
                delete analysersRef.current[id]
            }
        })
    }, [remoteStreams])

    // Cleanup AudioContext and audio nodes on unmount only
    useEffect(() => {
        return () => {
            Object.values(analysersRef.current).forEach(a => {
                try {
                    a.source.disconnect()
                } catch (e) { }
            })
            analysersRef.current = {}
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {})
                audioContextRef.current = null
            }
        }
    }, [])

    return {
        activeSpeaker,
        setActiveSpeaker
    }
}
