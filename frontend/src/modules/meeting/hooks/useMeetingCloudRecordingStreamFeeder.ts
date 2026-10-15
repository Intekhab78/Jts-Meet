import { useEffect, useRef } from 'react'

interface UseMeetingCloudRecordingStreamFeederProps {
    socket: any
    meetingId: string
    meetingInput: string
    localStream: MediaStream | null
    activeLocalStream: MediaStream | null
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    stopScreenShare: () => void
    canManageRef: React.MutableRefObject<boolean>
    setIsCloudRecording: (isRecording: boolean) => void
    setIsRemoteRecording: (isRecording: boolean) => void
    setScreenSharePolicy: (policy: 'everyone' | 'host_only') => void
    addToast: (msg: string, type?: any) => void
}

export const useMeetingCloudRecordingStreamFeeder = ({
    socket,
    meetingId,
    meetingInput,
    localStream,
    activeLocalStream,
    screenSharingUserId,
    screenSharingUserIds,
    stopScreenShare,
    canManageRef,
    setIsCloudRecording,
    setIsRemoteRecording,
    setScreenSharePolicy,
    addToast
}: UseMeetingCloudRecordingStreamFeederProps) => {
    const cloudRecordRecorderRef = useRef<MediaRecorder | null>(null)

    useEffect(() => {
        if (!socket) return

        const handleRecordToggle = (data: { userId: string; isRecording: boolean }) => {
            setIsRemoteRecording(data.isRecording)
            addToast(`Meeting recording has been ${data.isRecording ? 'started' : 'stopped'} by another participant.`, 'info')
        }

        const handleScreenSharePolicyChanged = (data: { meetingId: string; policy: 'everyone' | 'host_only' }) => {
            setScreenSharePolicy(data.policy)
            if (data.policy === 'host_only' && !canManageRef.current) {
                if (screenSharingUserId === 'me' || screenSharingUserIds.includes('me')) {
                    stopScreenShare()
                    addToast('Host has locked screen sharing to Host only. Your screen share was stopped.', 'warning')
                } else {
                    addToast('Host has restricted screen sharing to Host only.', 'info')
                }
            } else if (data.policy === 'everyone') {
                addToast('Screen sharing is now enabled for all participants.', 'info')
            }
        }

        const handleCloudRecordStatus = (data: { isCloudRecording: boolean; recordingUrl?: string; initiatedBy?: string }) => {
            setIsCloudRecording(data.isCloudRecording)
            const activeMeetingId = meetingId || meetingInput
            if (data.isCloudRecording) {
                addToast(`Headless Cloud Recording started by ${data.initiatedBy || 'Host'} on server.`, 'success')
                // CRITICAL: Only the host/organizer should feed the recording stream to avoid multi-peer file corruption
                if (!canManageRef.current) {
                    return
                }
                try {
                    const streamToRecord = localStream || activeLocalStream
                    if (streamToRecord && streamToRecord.getTracks().length > 0) {
                        let mimeType = 'video/webm;codecs=vp8,opus'
                        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = 'video/webm'
                        }
                        const rec = new MediaRecorder(streamToRecord, { mimeType })
                        rec.ondataavailable = async (e) => {
                            if (e.data && e.data.size > 0 && socket) {
                                try {
                                    const buffer = await e.data.arrayBuffer()
                                    socket.emit('meeting:cloud-recording-chunk', {
                                        meetingId: activeMeetingId,
                                        chunk: buffer
                                    })
                                } catch (_) {}
                            }
                        }
                        rec.start(2000)
                        cloudRecordRecorderRef.current = rec
                    }
                } catch (recErr) {
                    console.warn('[CloudRecording] Client stream feeder init error:', recErr)
                }
            } else {
                addToast('Headless Cloud Recording stopped and finalized on server.', 'info')
                if (cloudRecordRecorderRef.current && cloudRecordRecorderRef.current.state !== 'inactive') {
                    try { cloudRecordRecorderRef.current.stop() } catch (_) {}
                    cloudRecordRecorderRef.current = null
                }
            }
        }

        socket.on('meeting:record-toggle', handleRecordToggle)
        socket.on('meeting:screen-share-permission-changed', handleScreenSharePolicyChanged)
        socket.on('meeting:cloud-recording-status', handleCloudRecordStatus)

        return () => {
            socket.off('meeting:record-toggle', handleRecordToggle)
            socket.off('meeting:screen-share-permission-changed', handleScreenSharePolicyChanged)
            socket.off('meeting:cloud-recording-status', handleCloudRecordStatus)
            if (cloudRecordRecorderRef.current && cloudRecordRecorderRef.current.state !== 'inactive') {
                try { cloudRecordRecorderRef.current.stop() } catch (_) {}
                cloudRecordRecorderRef.current = null
            }
        }
    }, [socket, screenSharingUserId, screenSharingUserIds, stopScreenShare, addToast, meetingId, meetingInput, localStream, activeLocalStream, canManageRef, setIsCloudRecording, setIsRemoteRecording, setScreenSharePolicy])

    return {
        cloudRecordRecorderRef
    }
}
