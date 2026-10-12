import { useState, useEffect } from 'react'
import { getUserIdFromToken } from '../utils/meetingHelpers'

interface UseMeetingRoleAndPermissionsProps {
    socket: any
    token: string | null
    renamedUsers: Record<string, string>
    setIsLiveStreaming: (streaming: boolean) => void
    addToast: (message: string, type?: any) => void
}

export const useMeetingRoleAndPermissions = ({
    socket,
    token,
    renamedUsers,
    setIsLiveStreaming,
    addToast
}: UseMeetingRoleAndPermissionsProps) => {
    const [coHostIds, setCoHostIds] = useState<string[]>([])
    const [recordingAllowedUserIds, setRecordingAllowedUserIds] = useState<string[]>([])
    const [whiteboardAllowedUserIds, setWhiteboardAllowedUserIds] = useState<string[]>([])
    const [remoteLiveStatus, setRemoteLiveStatus] = useState<{ isStreaming: boolean; platform: string; broadcastTitle?: string } | null>(null)

    // Socket co-host promotion and granular permission listeners
    useEffect(() => {
        if (!socket) return

        const handleCoHostPromote = (payload: { targetUserId: string }) => {
            setCoHostIds(prev => prev.includes(payload.targetUserId) ? prev : [...prev, payload.targetUserId])
            const myId = getUserIdFromToken(token || '')
            if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                addToast('You have been promoted to Co-Host! Full meeting controls unlocked.', 'success')
            } else {
                const name = renamedUsers[payload.targetUserId] || payload.targetUserId
                addToast(`${name} has been promoted to Co-Host`, 'info')
            }
        }

        const handleCoHostDemote = (payload: { targetUserId: string }) => {
            setCoHostIds(prev => prev.filter(id => id !== payload.targetUserId))
            const myId = getUserIdFromToken(token || '')
            if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                addToast('Co-Host privileges were updated by the Host.', 'info')
            }
        }

        const handlePermissionUpdate = (payload: { targetUserId: string; permission: 'recording' | 'whiteboard' | 'screen-share'; enabled: boolean }) => {
            const myId = getUserIdFromToken(token || '')
            if (payload.permission === 'recording') {
                setRecordingAllowedUserIds(prev => payload.enabled ? [...new Set([...prev, payload.targetUserId])] : prev.filter(id => id !== payload.targetUserId))
                if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                    addToast(payload.enabled ? 'Host has granted you permission to Record this meeting!' : 'Host has revoked recording permission.', payload.enabled ? 'success' : 'info')
                }
            } else if (payload.permission === 'whiteboard') {
                setWhiteboardAllowedUserIds(prev => payload.enabled ? [...new Set([...prev, payload.targetUserId])] : prev.filter(id => id !== payload.targetUserId))
                if (payload.targetUserId === myId || payload.targetUserId === 'me') {
                    addToast(payload.enabled ? 'Host has granted you permission to use Whiteboard!' : 'Host has closed whiteboard access.', payload.enabled ? 'success' : 'info')
                }
            }
        }

        const handleLiveStreamStatus = (payload: { isStreaming: boolean; platform: string; broadcastTitle?: string }) => {
            if (payload.isStreaming) {
                setRemoteLiveStatus({ isStreaming: true, platform: payload.platform, broadcastTitle: payload.broadcastTitle })
                addToast(`Conference is now LIVE streaming on ${payload.platform?.toUpperCase() || 'RTMP'}!`, 'info')
            } else {
                setRemoteLiveStatus(null)
                setIsLiveStreaming(false)
                addToast('Live stream broadcast ended.', 'info')
            }
        }

        socket.on('meeting:cohost-promote', handleCoHostPromote)
        socket.on('meeting:cohost-demote', handleCoHostDemote)
        socket.on('meeting:permission-update', handlePermissionUpdate)
        socket.on('meeting:livestream-status', handleLiveStreamStatus)

        return () => {
            socket.off('meeting:cohost-promote', handleCoHostPromote)
            socket.off('meeting:cohost-demote', handleCoHostDemote)
            socket.off('meeting:permission-update', handlePermissionUpdate)
            socket.off('meeting:livestream-status', handleLiveStreamStatus)
        }
    }, [socket, token, renamedUsers, setIsLiveStreaming, addToast])

    return {
        coHostIds,
        setCoHostIds,
        recordingAllowedUserIds,
        setRecordingAllowedUserIds,
        whiteboardAllowedUserIds,
        setWhiteboardAllowedUserIds,
        remoteLiveStatus,
        setRemoteLiveStatus
    }
}
