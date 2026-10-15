import { useEffect } from 'react'
import { SocketEvents } from '../services/socket.service'

interface UseMeetingGlobalSocketEventsProps {
    socket: any
    isLocalHost: boolean
    localUserId?: string | null
    meetingId?: string
    localStream: MediaStream | null
    setIsMuted: (muted: boolean) => void
    setIsLocked: (locked: boolean) => void
    setMeetingInput: (val: string) => void
    handleExitMeeting: (isPermanentEnd?: boolean) => void
    isGuest: boolean
    token: string | null
    setIsWatermarkEnabled: (enabled: boolean) => void
    spawnReaction: (emoji: string, senderName?: string) => void
    setBackstageUserIds: (ids: string[] | ((prev: string[]) => string[])) => void
    addToast: (msg: string, type?: any) => void
}

export const useMeetingGlobalSocketEvents = ({
    socket,
    isLocalHost,
    localUserId,
    meetingId,
    localStream,
    setIsMuted,
    setIsLocked,
    setMeetingInput,
    handleExitMeeting,
    isGuest,
    token,
    setIsWatermarkEnabled,
    spawnReaction,
    setBackstageUserIds,
    addToast
}: UseMeetingGlobalSocketEventsProps) => {
    // Room-wide socket events: Mute All, Lock Meeting, End for All, Watermark, Real-time Reactions, Stage Status, Mute User, Remove User
    useEffect(() => {
        if (!socket) return

        const onMuteAllEvent = () => {
            if (!isLocalHost) {
                if (localStream) {
                    localStream.getAudioTracks().forEach(t => { t.enabled = false })
                    setIsMuted(true)
                    addToast('The host has muted all participants', 'warning')
                    if (socket && meetingId) {
                        socket.emit('meeting:mic-toggle', {
                            meetingId,
                            isMuted: true
                        })
                    }
                }
            }
        }

        const onMuteUserEvent = (data: { targetUserId: string; meetingId?: string }) => {
            const isTargetMe = data?.targetUserId === localUserId || data?.targetUserId === 'me'
            if (isTargetMe) {
                if (localStream) {
                    localStream.getAudioTracks().forEach(t => { t.enabled = false })
                }
                setIsMuted(true)
                addToast('The host has muted your microphone', 'warning')
                if (socket) {
                    socket.emit('meeting:mic-toggle', {
                        meetingId: data.meetingId || meetingId,
                        isMuted: true
                    })
                }
            }
        }

        const onRemoveUserEvent = (data: { targetUserId: string; meetingId?: string; kicked?: boolean }) => {
            const isTargetMe = data?.targetUserId === localUserId || data?.targetUserId === 'me'
            if (isTargetMe) {
                addToast('You have been removed from the meeting by the host', 'error')
                try {
                    sessionStorage.removeItem('jts_active_meeting_id')
                    sessionStorage.removeItem('jts_meeting_joined')
                    localStorage.removeItem('jts_last_meeting_id')
                    localStorage.removeItem('jts_guest_token')
                } catch (e) {}
                handleExitMeeting(true)
                if (isGuest || !token) {
                    window.location.hash = ''
                    window.location.href = '/'
                }
            }
        }

        const onLockToggleEvent = (data: { isLocked: boolean }) => {
            setIsLocked(!!data.isLocked)
            addToast(data.isLocked ? 'Meeting has been locked by the host' : 'Meeting has been unlocked', 'info')
        }

        const onEndAllEvent = () => {
            setMeetingInput('')
            addToast('The host has ended this meeting for everyone', 'warning')
            try {
                sessionStorage.removeItem('jts_active_meeting_id')
                sessionStorage.removeItem('jts_meeting_joined')
                localStorage.removeItem('jts_last_meeting_id')
                localStorage.removeItem('jts_guest_token')
            } catch (e) {}
            handleExitMeeting(true)
            if (isGuest || !token) {
                window.location.hash = ''
                window.location.href = '/'
            }
        }

        const onWatermarkToggleEvent = (data: { enabled: boolean }) => {
            setIsWatermarkEnabled(!!data.enabled)
            addToast(data.enabled ? 'Confidential Watermark enabled by host' : 'Confidential Watermark disabled', 'info')
        }

        const onReactionEvent = (data: { emoji: string; senderName?: string }) => {
            if (data?.emoji) {
                spawnReaction(data.emoji, data.senderName)
            }
        }

        socket.on('meeting:mute-all', onMuteAllEvent)
        socket.on('meeting:lock-toggle', onLockToggleEvent)
        socket.on('meeting:end-all', onEndAllEvent)
        socket.on('meeting:end', onEndAllEvent)
        socket.on(SocketEvents.MEETING_END, onEndAllEvent)
        socket.on(SocketEvents.MEETING_END_ALL, onEndAllEvent)
        socket.on(SocketEvents.MEETING_WATERMARK_TOGGLE, onWatermarkToggleEvent)
        socket.on(SocketEvents.MEETING_REACTION, onReactionEvent)
        socket.on('meeting:mute-user', onMuteUserEvent)
        socket.on(SocketEvents.MEETING_MUTE_USER, onMuteUserEvent)
        socket.on('meeting:remove-user', onRemoveUserEvent)
        socket.on(SocketEvents.MEETING_REMOVE_USER, onRemoveUserEvent)

        // Virtual Green Room — Stage Status Change
        const onStageStatusChange = (data: { targetUserId: string; isBackstage: boolean; backstageUsers: string[] }) => {
            setBackstageUserIds(data.backstageUsers || [])
        }
        const onStageStateSync = (data: { backstageUsers: string[] }) => {
            if (Array.isArray(data?.backstageUsers)) {
                setBackstageUserIds(data.backstageUsers)
            }
        }
        socket.on(SocketEvents.STAGE_STATUS_CHANGE, onStageStatusChange)
        socket.on(SocketEvents.STAGE_STATE_SYNC, onStageStateSync)

        return () => {
            socket.off('meeting:mute-all', onMuteAllEvent)
            socket.off('meeting:lock-toggle', onLockToggleEvent)
            socket.off('meeting:end-all', onEndAllEvent)
            socket.off('meeting:end', onEndAllEvent)
            socket.off(SocketEvents.MEETING_END, onEndAllEvent)
            socket.off(SocketEvents.MEETING_END_ALL, onEndAllEvent)
            socket.off(SocketEvents.MEETING_WATERMARK_TOGGLE, onWatermarkToggleEvent)
            socket.off(SocketEvents.MEETING_REACTION, onReactionEvent)
            socket.off('meeting:mute-user', onMuteUserEvent)
            socket.off(SocketEvents.MEETING_MUTE_USER, onMuteUserEvent)
            socket.off('meeting:remove-user', onRemoveUserEvent)
            socket.off(SocketEvents.MEETING_REMOVE_USER, onRemoveUserEvent)
            socket.off(SocketEvents.STAGE_STATUS_CHANGE, onStageStatusChange)
            socket.off(SocketEvents.STAGE_STATE_SYNC, onStageStateSync)
        }
    }, [socket, isLocalHost, localUserId, meetingId, localStream, setIsMuted, setIsLocked, setMeetingInput, handleExitMeeting, isGuest, token, setIsWatermarkEnabled, spawnReaction, setBackstageUserIds, addToast])
}
