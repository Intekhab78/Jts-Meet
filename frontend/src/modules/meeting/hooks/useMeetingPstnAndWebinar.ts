import { useState, useEffect } from 'react'

interface UseMeetingPstnAndWebinarProps {
    socket: any
    localUserId?: string
    addToast: (message: string, type?: 'info' | 'success' | 'warning' | any) => void
}

export const useMeetingPstnAndWebinar = ({
    socket,
    localUserId,
    addToast
}: UseMeetingPstnAndWebinarProps) => {
    const [isWebinarMode, setIsWebinarMode] = useState<boolean>(() =>
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('webinar') === 'true'
    )
    const [isPromotedToSpeaker, setIsPromotedToSpeaker] = useState<boolean>(false)

    useEffect(() => {
        if (!socket) return

        const handlePstnJoined = (data: { meetingId: string; caller: string }) => {
            addToast(`📞 Phone caller ${data.caller} joined the audio bridge.`, 'info')
        }

        const handlePstnLeft = (data: { meetingId: string; caller: string }) => {
            addToast(`📞 Phone caller ${data.caller} disconnected from the audio bridge.`, 'info')
        }

        // Web Audio Context for playing PSTN phone caller audio stream
        let pstnAudioCtx: AudioContext | null = null
        let pstnNextPlayTime = 0

        const handlePstnAudio = (data: { payload: string }) => {
            try {
                if (!data?.payload) return
                const binaryStr = window.atob(data.payload)
                const len = binaryStr.length
                if (len === 0) return

                const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
                if (!AudioCtxClass) return
                if (!pstnAudioCtx || pstnAudioCtx.state === 'closed') {
                    pstnAudioCtx = new AudioCtxClass()
                }
                if (pstnAudioCtx.state === 'suspended') {
                    pstnAudioCtx.resume().catch(() => {})
                }

                // Decode G.711 mu-law 8kHz audio samples
                const buffer = pstnAudioCtx.createBuffer(1, len, 8000)
                const channelData = buffer.getChannelData(0)
                for (let i = 0; i < len; i++) {
                    const byte = ~binaryStr.charCodeAt(i)
                    const sign = (byte & 0x80) ? -1 : 1
                    const exponent = (byte >> 4) & 0x07
                    const mantissa = byte & 0x0F
                    let sample = ((mantissa << 3) + 0x84) << exponent
                    sample -= 0x84
                    channelData[i] = (sign * sample) / 32768
                }

                const source = pstnAudioCtx.createBufferSource()
                source.buffer = buffer
                source.connect(pstnAudioCtx.destination)

                const currentTime = pstnAudioCtx.currentTime
                const startTime = Math.max(currentTime, pstnNextPlayTime)
                source.start(startTime)
                pstnNextPlayTime = startTime + buffer.duration
            } catch (pstnErr) {
                console.warn('[PSTN] Audio decode error:', pstnErr)
            }
        }

        const handleWebinarMode = (data: { isWebinarMode: boolean }) => {
            setIsWebinarMode(data.isWebinarMode)
            addToast(data.isWebinarMode ? 'Webinar Stage Mode activated by Host.' : 'Interactive Grid Mode restored.', 'info')
        }

        const handleSpeakerPromoted = (data: { userId: string; promotedBy?: string }) => {
            const myId = localUserId
            if (data.userId === myId || data.userId === socket.id) {
                setIsPromotedToSpeaker(true)
                addToast('You have been promoted to live Stage Speaker by the Host!', 'success')
            }
        }

        const handleSpeakerDemoted = (data: { userId: string }) => {
            const myId = localUserId
            if (data.userId === myId || data.userId === socket.id) {
                setIsPromotedToSpeaker(false)
                addToast('You have returned to audience view-only mode.', 'info')
            }
        }

        const handleWebinarHandRaised = (data: { meetingId: string; userId: string; displayName?: string }) => {
            addToast(`✋ ${data.displayName || 'An attendee'} requested to speak on Stage. Open Participants to promote.`, 'info')
        }

        socket.on('meeting:pstn:joined', handlePstnJoined)
        socket.on('meeting:pstn:left', handlePstnLeft)
        socket.on('meeting:pstn:audio', handlePstnAudio)
        socket.on('webinar:mode-changed', handleWebinarMode)
        socket.on('webinar:speaker-promoted', handleSpeakerPromoted)
        socket.on('webinar:speaker-demoted', handleSpeakerDemoted)
        socket.on('webinar:hand-raised', handleWebinarHandRaised)

        return () => {
            socket.off('meeting:pstn:joined', handlePstnJoined)
            socket.off('meeting:pstn:left', handlePstnLeft)
            socket.off('meeting:pstn:audio', handlePstnAudio)
            socket.off('webinar:mode-changed', handleWebinarMode)
            socket.off('webinar:speaker-promoted', handleSpeakerPromoted)
            socket.off('webinar:speaker-demoted', handleSpeakerDemoted)
            socket.off('webinar:hand-raised', handleWebinarHandRaised)
            if (pstnAudioCtx && pstnAudioCtx.state !== 'closed') {
                try { pstnAudioCtx.close() } catch (_) {}
            }
        }
    }, [socket, localUserId, addToast])

    return {
        isWebinarMode,
        setIsWebinarMode,
        isPromotedToSpeaker,
        setIsPromotedToSpeaker
    }
}
