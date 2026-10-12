import React from 'react'
import { API_BASE } from '../../../config'
import { SocketEvents } from '../services/socket.service'

export interface UseMeetingModerationProps {
    socket: any
    meetingId: string
    meetingInput: string
    token: string
    isGuest: boolean
    isLocalHost: boolean
    canManageParticipants: boolean
    isLocked: boolean
    setIsLocked: React.Dispatch<React.SetStateAction<boolean>>
    isWatermarkEnabled: boolean
    setIsWatermarkEnabled: React.Dispatch<React.SetStateAction<boolean>>
    setScreenSharePolicy: React.Dispatch<React.SetStateAction<'everyone' | 'host_only'>>
    waitingGuests: any[]
    setWaitingGuests: React.Dispatch<React.SetStateAction<any[]>>
    setIsWaitingRoomActive: React.Dispatch<React.SetStateAction<boolean>>
    setMeetingInfo: (info: any) => void
    setRecordingAllowedUserIds: React.Dispatch<React.SetStateAction<string[]>>
    setWhiteboardAllowedUserIds: React.Dispatch<React.SetStateAction<string[]>>
    setBackstageUserIds: React.Dispatch<React.SetStateAction<string[]>>
    addToast: (msg: string, type?: any) => void
}

export function useMeetingModeration({
    socket,
    meetingId,
    meetingInput,
    token,
    isGuest,
    isLocalHost,
    canManageParticipants,
    isLocked,
    setIsLocked,
    isWatermarkEnabled,
    setIsWatermarkEnabled,
    setScreenSharePolicy,
    waitingGuests,
    setWaitingGuests,
    setIsWaitingRoomActive,
    setMeetingInfo,
    setRecordingAllowedUserIds,
    setWhiteboardAllowedUserIds,
    setBackstageUserIds,
    addToast
}: UseMeetingModerationProps) {
    const handlePromoteCoHost = (targetUserId: string, isPromoting: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        if (isPromoting) {
            socket?.emit(SocketEvents.MEETING_COHOST_PROMOTE, { meetingId: activeRoom, targetUserId })
        } else {
            socket?.emit(SocketEvents.MEETING_COHOST_DEMOTE, { meetingId: activeRoom, targetUserId })
        }
    }

    const handleTogglePermission = (targetUserId: string, permission: 'recording' | 'whiteboard', enabled: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        if (permission === 'recording') {
            setRecordingAllowedUserIds(prev => enabled ? [...new Set([...prev, targetUserId])] : prev.filter(id => id !== targetUserId))
        } else if (permission === 'whiteboard') {
            setWhiteboardAllowedUserIds(prev => enabled ? [...new Set([...prev, targetUserId])] : prev.filter(id => id !== targetUserId))
        }
        socket?.emit('meeting:permission-update', { meetingId: activeRoom, targetUserId, permission, enabled })
    }

    const handleStageStatusChange = (targetUserId: string, isBackstage: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        socket?.emit(SocketEvents.STAGE_STATUS_CHANGE, {
            meetingId: activeRoom,
            targetUserId,
            isBackstage
        })
        setBackstageUserIds(prev => isBackstage ? [...new Set([...prev, targetUserId])] : prev.filter(id => id !== targetUserId))
        addToast(isBackstage ? 'Moved participant to backstage green room' : 'Brought participant to main stage', 'info')
    }

    // Host Controls: Mute All & Lock Meeting
    const handleMuteAll = () => {
        if (!isLocalHost && !canManageParticipants) return
        socket?.emit('meeting:mute-all', { meetingId: meetingId || meetingInput.trim() })
        addToast('Muted all participants', 'success')
    }

    const handleToggleLock = () => {
        if (!isLocalHost && !canManageParticipants) return
        const nextState = !isLocked
        socket?.emit('meeting:lock-toggle', {
            meetingId: meetingId || meetingInput.trim(),
            isLocked: nextState
        })
    }

    const handleToggleWatermark = () => {
        if (!isLocalHost && !canManageParticipants) return
        const nextState = !isWatermarkEnabled
        setIsWatermarkEnabled(nextState)
        socket?.emit(SocketEvents.MEETING_WATERMARK_TOGGLE, {
            meetingId: meetingId || meetingInput.trim(),
            enabled: nextState
        })
        addToast(`Watermark ${nextState ? 'enabled' : 'disabled'} for all participants`, 'success')
    }

    const handleToggleScreenSharePolicy = async (newPolicy: 'everyone' | 'host_only') => {
        if (!isLocalHost && !canManageParticipants) return
        setScreenSharePolicy(newPolicy)
        const activeRoom = meetingId || meetingInput.trim()
        socket?.emit('meeting:set-screen-share-permission', { meetingId: activeRoom, policy: newPolicy })
        try {
            await fetch(`${API_BASE}/api/meeting/screen-share-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ meetingId: activeRoom, policy: newPolicy })
            })
        } catch (e) {
            console.error('Failed to persist screen share permission', e)
        }
        addToast(`Screen sharing restricted to ${newPolicy === 'host_only' ? 'Host only' : 'Everyone'}`, 'success')
    }

    // Guest Waiting Room Admission Handlers
    const handleApproveGuest = (socketId: string) => {
        if (!socket) return
        const activeRoom = meetingId || meetingInput.trim()
        const guest = waitingGuests.find(g => g.socketId === socketId)
        socket.emit('guest:approve', { meetingId: activeRoom, socketId, guestSocketId: socketId })
        setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        addToast(`Admitted ${guest?.guestName || 'participant'} to the meeting`, 'success')
    }

    const handleDenyGuest = (socketId: string) => {
        if (!socket) return
        const activeRoom = meetingId || meetingInput.trim()
        const guest = waitingGuests.find(g => g.socketId === socketId)
        socket.emit('guest:deny', { meetingId: activeRoom, socketId, guestSocketId: socketId })
        setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        addToast(`Denied admission for ${guest?.guestName || 'participant'}`, 'info')
    }

    const handleApproveAllGuests = () => {
        if (!socket || waitingGuests.length === 0) return
        const activeRoom = meetingId || meetingInput.trim()
        socket.emit('guest:approve-all', { meetingId: activeRoom })
        const count = waitingGuests.length
        setWaitingGuests([])
        addToast(`Admitted all ${count} waiting participant(s)`, 'success')
    }

    const handleToggleWaitingRoom = async (enabled: boolean) => {
        const activeRoom = meetingId || meetingInput.trim()
        setIsWaitingRoomActive(enabled)
        socket?.emit('meeting:waiting-room-toggle', { meetingId: activeRoom, enabled })

        if (token && !isGuest) {
            try {
                const response = await fetch(`${API_BASE}/api/meeting/waiting-room/toggle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ meetingId: activeRoom, enabled })
                })
                const data = await response.json()
                if (response.ok && data?.success) {
                    setMeetingInfo(data.data)
                }
            } catch (e) { }
        }
        addToast(
            enabled
                ? 'Waiting Room enabled (Host approval required for invitees)'
                : 'Open Access enabled (Everyone can join without approval)',
            'success'
        )
    }

    return {
        handlePromoteCoHost,
        handleTogglePermission,
        handleStageStatusChange,
        handleMuteAll,
        handleToggleLock,
        handleToggleWatermark,
        handleToggleScreenSharePolicy,
        handleApproveGuest,
        handleDenyGuest,
        handleApproveAllGuests,
        handleToggleWaitingRoom
    }
}
