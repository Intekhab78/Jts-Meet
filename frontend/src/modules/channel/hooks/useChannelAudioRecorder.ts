import { useState, useRef } from 'react'
import type { Channel, ChannelAttachment } from '../channel.types'
import { uploadChannelFile } from '../channel.service'
import { API_BASE } from '../../../config'
import { formatDuration } from '../channel.helpers'

interface UseChannelAudioRecorderParams {
    selectedChannel: Channel | null
    token: string
    socketInstance: any
    sentByCurrentTabIds: React.MutableRefObject<Set<string>>
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
}

export function useChannelAudioRecorder({
    selectedChannel,
    token,
    socketInstance,
    sentByCurrentTabIds,
    setMessages
}: UseChannelAudioRecorderParams) {
    const [isRecordingAudio, setIsRecordingAudio] = useState(false)
    const [audioRecordDuration, setAudioRecordDuration] = useState(0)
    const [uploadingAudio, setUploadingAudio] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioStreamRef = useRef<MediaStream | null>(null)
    const audioTimerRef = useRef<any>(null)

    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioStreamRef.current = stream
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.start(200)
            setIsRecordingAudio(true)
            setAudioRecordDuration(0)

            if (audioTimerRef.current) clearInterval(audioTimerRef.current)
            audioTimerRef.current = setInterval(() => {
                setAudioRecordDuration(prev => prev + 1)
            }, 1000)
        } catch (err: any) {
            console.error('Failed to access microphone for voice note:', err)
            alert('Could not access microphone: ' + (err?.message || 'Permission denied'))
        }
    }

    const stopAudioRecording = async (send: boolean) => {
        if (audioTimerRef.current) {
            clearInterval(audioTimerRef.current)
            audioTimerRef.current = null
        }

        const duration = audioRecordDuration

        if (!send || !mediaRecorderRef.current || !selectedChannel) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop())
                audioStreamRef.current = null
            }
            setIsRecordingAudio(false)
            setAudioRecordDuration(0)
            audioChunksRef.current = []
            return
        }

        mediaRecorderRef.current.onstop = async () => {
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop())
                audioStreamRef.current = null
            }
            setIsRecordingAudio(false)
            setAudioRecordDuration(0)

            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            audioChunksRef.current = []
            if (audioBlob.size === 0) return

            const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' })

            try {
                setUploadingAudio(true)
                const uploaded = await uploadChannelFile(selectedChannel._id, audioFile, token)
                const fileUrl = uploaded.secureUrl || `${API_BASE}/api/file/${uploaded._id}/download`

                const attachmentData: ChannelAttachment = {
                    name: audioFile.name,
                    url: fileUrl,
                    fileType: 'audio',
                    size: audioFile.size,
                    mimeType: 'audio/webm'
                }

                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: `🎙️ Voice Note (${formatDuration(duration)})`,
                        messageType: 'audio',
                        attachments: [attachmentData]
                    })
                })
                const data = await res.json()
                if (data.success && socketInstance) {
                    if (data.data?._id) {
                        sentByCurrentTabIds.current.add(data.data._id.toString())
                    }
                    socketInstance.emit('channel:message:send', data.data)
                    setMessages(prev => {
                        if (prev.some(m => m._id === data.data._id)) return prev
                        return [...prev, data.data]
                    })
                }
            } catch (err: any) {
                console.error('Failed to send voice note:', err)
                alert(err?.message || 'Failed to upload voice note')
            } finally {
                setUploadingAudio(false)
            }
        }

        if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
    }

    return {
        isRecordingAudio,
        audioRecordDuration,
        uploadingAudio,
        startAudioRecording,
        stopAudioRecording
    }
}
