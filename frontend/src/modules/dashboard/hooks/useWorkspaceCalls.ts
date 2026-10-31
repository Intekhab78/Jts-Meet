import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSocketContext } from '../../meeting/context/SocketContext'
import { useWebRTCContext } from '../../meeting/context/WebRTCContext'
import { useMeetingContext } from '../../meeting/context/MeetingContext'
import { IncomingCallData } from '../../meeting/components/IncomingCallModal'
import { OutgoingCallData } from '../../meeting/components/OutgoingCallModal'
import { ActiveCallData } from '../../meeting/components/ActiveAudioCallModal'
import { SocketEvents } from '../../meeting/services/socket.service'
import { pushNotificationService } from '../../../services/pushNotification.service'
import { WorkspaceTab } from '../workspace.types'

interface UseWorkspaceCallsProps {
    token: string
    profileName: string
    profileImage: string
    activeTab: WorkspaceTab
    setActiveTab: (tab: WorkspaceTab) => void
    setActiveMeetingRoomId: (id: string) => void
}

export function useWorkspaceCalls({
    token,
    profileName,
    profileImage,
    activeTab,
    setActiveTab,
    setActiveMeetingRoomId
}: UseWorkspaceCallsProps) {
    const { joined } = useMeetingContext()
    const { socket, connectSocket, connected } = useSocketContext()
    const { connectToMeeting, leaveMeeting, requestMedia, stopMedia, startScreenShare, remoteStreams } = useWebRTCContext()

    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
    const [outgoingCall, setOutgoingCall] = useState<OutgoingCallData | null>(null)
    const [activeAudioCall, setActiveAudioCall] = useState<ActiveCallData | null>(() => {
        try {
            const saved = sessionStorage.getItem('jts_active_direct_call')
            if (saved) {
                return JSON.parse(saved)
            }
        } catch (_) {}
        return null
    })

    const outgoingCallRef = useRef<OutgoingCallData | null>(null)
    outgoingCallRef.current = outgoingCall
    const outgoingCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const activeAudioCallRef = useRef<ActiveCallData | null>(null)
    activeAudioCallRef.current = activeAudioCall

    const clearOutgoingCallTimeout = () => {
        if (outgoingCallTimeoutRef.current) {
            clearTimeout(outgoingCallTimeoutRef.current)
            outgoingCallTimeoutRef.current = null
        }
    }

    const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(false)
    const pendingScreenStreamRef = useRef<MediaStream | null>(null)
    const [showDirectDialModal, setShowDirectDialModal] = useState(false)
    const [directDialTarget, setDirectDialTarget] = useState('')

    // Register Web Push Service Worker and prompt for notifications
    useEffect(() => {
        if (pushNotificationService.isSupported()) {
            pushNotificationService.registerServiceWorker()

            if (Notification.permission === 'granted') {
                pushNotificationService.subscribeUser(token).catch(() => {})
            } else if (Notification.permission === 'default') {
                const dismissed = localStorage.getItem('jts_push_prompt_dismissed') === 'true'
                if (!dismissed) {
                    const timer = setTimeout(() => setShowNotificationPrompt(true), 4000)
                    return () => clearTimeout(timer)
                }
            }
        }
    }, [token])

    // Pending call to auto-accept once socket is connected
    const [pendingPushCall, setPendingPushCall] = useState<IncomingCallData | null>(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search)
            const callMeetingId = searchParams.get('callMeetingId')
            const autoAccept = searchParams.get('autoAccept') === 'true'
            if (callMeetingId && autoAccept) {
                const callerId = searchParams.get('callerId') || ''
                const callerName = searchParams.get('callerName') || 'Colleague'
                const callerAvatar = searchParams.get('callerAvatar') || ''
                const callType = (searchParams.get('callType') as any) || 'video'
                window.history.replaceState(null, '', window.location.pathname + '#chat')
                return {
                    meetingId: callMeetingId,
                    callerId,
                    callerName,
                    callerAvatar,
                    callType
                }
            }
        } catch {}
        return null
    })

    // Sync activeAudioCall with sessionStorage for refresh restoration
    useEffect(() => {
        if (activeAudioCall) {
            try {
                sessionStorage.setItem('jts_active_direct_call', JSON.stringify(activeAudioCall))
            } catch (_) {}
        } else {
            try {
                sessionStorage.removeItem('jts_active_direct_call')
            } catch (_) {}
        }
    }, [activeAudioCall])

    // Automatically release hardware when switching away from meeting room
    useEffect(() => {
        if (activeTab !== 'meeting' && !joined && !activeAudioCall) {
            stopMedia()
        }
    }, [activeTab, joined, stopMedia, activeAudioCall])

    // Ensure socket connected for direct ringing
    useEffect(() => {
        if (token && !connected) {
            connectSocket(token)
        }
    }, [token, connected, connectSocket])

    // Auto-reconnect restored direct call after page refresh
    useEffect(() => {
        if (activeAudioCall && connected && socket && !joined) {
            console.log('[AppWorkspace] Restoring active direct call after refresh:', activeAudioCall)
            const restoreCall = async () => {
                try {
                    if (activeAudioCall.callType === 'audio') {
                        await requestMedia(true)
                    } else {
                        await requestMedia(false)
                    }
                    connectToMeeting(activeAudioCall.meetingId, profileName || 'Colleague', true)
                } catch (err) {
                    console.error('[AppWorkspace] Failed to restore active direct call media:', err)
                }
            }
            restoreCall()
        }
    }, [activeAudioCall, connected, socket, joined, requestMedia, connectToMeeting, profileName])

    // Listen to direct call socket events
    useEffect(() => {
        if (!socket) return

        const handleIncomingCall = (data: any) => {
            setIncomingCall({
                callerId: data.callerId,
                callerName: data.callerName || 'Colleague',
                callerAvatar: data.callerAvatar,
                meetingId: data.meetingId,
                callType: data.callType || 'video',
                channelName: data.channelName,
                channelId: data.channelId,
                isGroupCall: data.isGroupCall
            })

            if ((window as any).electronAPI?.notifyIncomingCall) {
                (window as any).electronAPI.notifyIncomingCall(data)
            }

            if (document.hidden) {
                pushNotificationService.showIncomingCallNotification(data)
            }
        }

        const handleCallCancelled = (data?: any) => {
            console.log('[AppWorkspace] Direct call cancelled or terminated:', data)
            if ((window as any).electronAPI?.dismissIncomingCallAlert) {
                (window as any).electronAPI.dismissIncomingCallAlert()
            }
            if (pendingScreenStreamRef.current) {
                pendingScreenStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch {} })
                pendingScreenStreamRef.current = null
            }
            setIncomingCall(null)
            setOutgoingCall(null)
            if (activeAudioCallRef.current) {
                leaveMeeting()
                stopMedia()
                setActiveAudioCall(null)
            }
        }

        const handleCallAccepted = async (data: any) => {
            console.log('[AppWorkspace] Outgoing call was accepted by peer:', data)
            clearOutgoingCallTimeout()
            const target = outgoingCallRef.current
            setOutgoingCall(null)
            const activeMeetingId = data?.meetingId || target?.meetingId
            if (!activeMeetingId) return

            const callType = target?.callType || 'audio'

            setActiveMeetingRoomId('')
            if (activeTab === 'meeting') {
                const targetTab = (target?.channelId || target?.channelName) ? 'channel' : 'chat'
                setActiveTab(targetTab)
                window.history.replaceState(null, '', `/#${targetTab}`)
            }
            try { sessionStorage.removeItem('jts_active_meeting_id') } catch {}

            setActiveAudioCall({
                meetingId: activeMeetingId,
                peerId: target?.targetUserId || data?.calleeId || '',
                peerName: target?.targetName || 'Colleague',
                peerAvatar: target?.targetAvatar,
                callType,
                channelName: target?.channelName,
                channelId: target?.channelId,
                isGroupCall: target?.isGroupCall || (target?.targetUserIds && target.targetUserIds.length > 0)
            })
            try {
                if (callType === 'audio') {
                    await requestMedia(true)
                } else {
                    await requestMedia(false)
                }
                connectToMeeting(activeMeetingId, profileName || 'Colleague', true)
                if (callType === 'screenshare' && pendingScreenStreamRef.current) {
                    const screenStream = pendingScreenStreamRef.current
                    setTimeout(() => {
                        startScreenShare(screenStream).catch(err => {
                            console.warn('[AppWorkspace] Error starting screen share:', err)
                        })
                    }, 500)
                }
            } catch (err) {
                console.error('[AppWorkspace] Failed to connect call media:', err)
            }
        }

        const handleCallRejected = (data: any) => {
            console.log('[AppWorkspace] Outgoing call was declined or timed out:', data)
            clearOutgoingCallTimeout()
            if ((window as any).electronAPI?.dismissIncomingCallAlert) {
                (window as any).electronAPI.dismissIncomingCallAlert()
            }
            const target = outgoingCallRef.current
            if (target?.targetUserIds && target.targetUserIds.length > 1) {
                const remaining = target.targetUserIds.filter(id => id !== data?.calleeId)
                if (remaining.length > 0) {
                    setOutgoingCall(prev => prev ? {
                        ...prev,
                        targetUserIds: remaining,
                        targetName: prev.channelName ? `#${prev.channelName} (${remaining.length} ringing)` : prev.targetName
                    } : null)
                    return
                }
            }
            if (pendingScreenStreamRef.current) {
                pendingScreenStreamRef.current.getTracks().forEach(t => {
                    try { t.stop() } catch {}
                })
                pendingScreenStreamRef.current = null
            }
            leaveMeeting()
            stopMedia()
            const finalStatus = data?.reason === 'no_answer' ? 'no_answer' : 'declined'
            setOutgoingCall(prev => prev ? { ...prev, status: finalStatus } : null)
            setTimeout(() => {
                setOutgoingCall(null)
            }, 3000)
        }

        const handleCallInitiated = (data: any) => {
            if (data?.meetingId) {
                setOutgoingCall(prev => prev ? { ...prev, meetingId: data.meetingId } : null)
            }
        }

        const handleDirectCallPeerLeft = (data: any) => {
            const currentCall = activeAudioCallRef.current
            if (!currentCall) return

            const isMatchingMeeting = !data?.meetingId || data.meetingId === currentCall.meetingId
            const isMatchingPeer = !data?.userId || 
                String(data.userId).toLowerCase() === String(currentCall.peerId).toLowerCase() ||
                String(data.userId).toLowerCase() === String(currentCall.peerName).toLowerCase()

            if (!currentCall.isGroupCall && (isMatchingMeeting || isMatchingPeer)) {
                console.log('[AppWorkspace] Peer left active 1-on-1 direct call:', data)
                handleCallCancelled(data)
            } else if (isMatchingMeeting && isMatchingPeer) {
                console.log('[AppWorkspace] Target peer left call:', data)
                handleCallCancelled(data)
            }
        }

        socket.on(SocketEvents.CALL_INCOMING, handleIncomingCall)
        socket.on(SocketEvents.CALL_CANCELLED, handleCallCancelled)
        socket.on('call:ended', handleCallCancelled)
        socket.on('call:hangup', handleCallCancelled)
        socket.on(SocketEvents.CALL_ACCEPTED, handleCallAccepted)
        socket.on(SocketEvents.CALL_REJECTED, handleCallRejected)
        socket.on('call:initiated', handleCallInitiated)
        socket.on(SocketEvents.WEBRTC_USER_LEFT, handleDirectCallPeerLeft)
        socket.on(SocketEvents.MEETING_LEAVE, handleDirectCallPeerLeft)
        socket.on('meeting:leave', handleDirectCallPeerLeft)
        socket.on('meeting:user-left', handleDirectCallPeerLeft)
        socket.on(SocketEvents.MEETING_END, handleCallCancelled)
        socket.on('meeting:end', handleCallCancelled)

        return () => {
            socket.off(SocketEvents.CALL_INCOMING, handleIncomingCall)
            socket.off(SocketEvents.CALL_CANCELLED, handleCallCancelled)
            socket.off('call:ended', handleCallCancelled)
            socket.off('call:hangup', handleCallCancelled)
            socket.off(SocketEvents.CALL_ACCEPTED, handleCallAccepted)
            socket.off(SocketEvents.CALL_REJECTED, handleCallRejected)
            socket.off('call:initiated', handleCallInitiated)
            socket.off(SocketEvents.WEBRTC_USER_LEFT, handleDirectCallPeerLeft)
            socket.off(SocketEvents.MEETING_LEAVE, handleDirectCallPeerLeft)
            socket.off('meeting:leave', handleDirectCallPeerLeft)
            socket.off('meeting:user-left', handleDirectCallPeerLeft)
            socket.off(SocketEvents.MEETING_END, handleCallCancelled)
            socket.off('meeting:end', handleCallCancelled)
        }
    }, [socket, profileName, connectToMeeting, leaveMeeting, requestMedia, stopMedia, startScreenShare, activeTab])

    const handleAcceptCall = useCallback(async (call: IncomingCallData) => {
        if ((window as any).electronAPI?.dismissIncomingCallAlert) {
            (window as any).electronAPI.dismissIncomingCallAlert()
        }
        if ((window as any).electronAPI?.focusApp) {
            (window as any).electronAPI.focusApp()
        }
        if (socket) {
            socket.emit(SocketEvents.CALL_ACCEPTED, {
                callerId: call.callerId,
                meetingId: call.meetingId
            })
        }
        setIncomingCall(null)

        setActiveMeetingRoomId('')
        if (activeTab === 'meeting') {
            const targetTab = (call.channelId || call.channelName) ? 'channel' : 'chat'
            setActiveTab(targetTab)
            window.history.replaceState(null, '', `/#${targetTab}`)
        }
        try { sessionStorage.removeItem('jts_active_meeting_id') } catch {}

        const callType = call.callType || 'audio'
        setActiveAudioCall({
            meetingId: call.meetingId,
            peerId: call.callerId,
            peerName: call.channelName ? `#${call.channelName}` : (call.callerName || 'Colleague'),
            peerAvatar: call.callerAvatar,
            callType,
            channelName: call.channelName,
            channelId: call.channelId,
            isGroupCall: call.isGroupCall
        })
        try {
            if (callType === 'audio') {
                await requestMedia(true)
            } else {
                await requestMedia(false)
            }
            connectToMeeting(call.meetingId, profileName || 'Colleague', true)
        } catch (err) {
            console.error('[AppWorkspace] Failed to connect call media:', err)
        }
    }, [socket, requestMedia, connectToMeeting, profileName, activeTab, setActiveMeetingRoomId, setActiveTab])

    // Listen for Service Worker postMessage
    useEffect(() => {
        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === 'JTS_PUSH_ACCEPT_CALL') {
                const callData = event.data.data
                console.log('[AppWorkspace] Received JTS_PUSH_ACCEPT_CALL from SW:', callData)
                if (callData?.meetingId) {
                    handleAcceptCall({
                        meetingId: callData.meetingId,
                        callerId: callData.callerId || '',
                        callerName: callData.callerName || 'Colleague',
                        callerAvatar: callData.callerAvatar,
                        callType: callData.callType || 'video'
                    })
                }
            }
        }
        navigator.serviceWorker?.addEventListener('message', handleSwMessage)
        return () => {
            navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
        }
    }, [handleAcceptCall])

    // Connect pending call from push notification once socket is connected
    useEffect(() => {
        if (pendingPushCall && socket && connected) {
            console.log('[AppWorkspace] Auto-accepting pending push call:', pendingPushCall)
            const call = pendingPushCall
            setPendingPushCall(null)
            handleAcceptCall(call)
        }
    }, [pendingPushCall, socket, connected, handleAcceptCall])

    const handleDeclineCall = (call: IncomingCallData) => {
        if ((window as any).electronAPI?.dismissIncomingCallAlert) {
            (window as any).electronAPI.dismissIncomingCallAlert()
        }
        if (socket) {
            socket.emit(SocketEvents.CALL_REJECTED, {
                callerId: call.callerId,
                meetingId: call.meetingId,
                reason: 'declined'
            })
        }
        setIncomingCall(null)
    }

    const handleCancelOutgoingCall = () => {
        clearOutgoingCallTimeout()
        if (pendingScreenStreamRef.current) {
            pendingScreenStreamRef.current.getTracks().forEach(t => {
                try { t.stop() } catch {}
            })
            pendingScreenStreamRef.current = null
        }
        if (outgoingCall && socket) {
            socket.emit(SocketEvents.CALL_CANCELLED, {
                targetUserId: outgoingCall.targetUserId,
                targetUserIds: outgoingCall.targetUserIds,
                meetingId: outgoingCall.meetingId
            })
        }
        leaveMeeting()
        stopMedia()
        setOutgoingCall(null)
    }

    const handleEndActiveAudioCall = () => {
        if (pendingScreenStreamRef.current) {
            pendingScreenStreamRef.current.getTracks().forEach(t => {
                try { t.stop() } catch {}
            })
            pendingScreenStreamRef.current = null
        }
        if (activeAudioCall && socket) {
            socket.emit(SocketEvents.CALL_CANCELLED, {
                targetUserId: activeAudioCall.peerId,
                meetingId: activeAudioCall.meetingId
            })
            socket.emit('call:ended', {
                targetUserId: activeAudioCall.peerId,
                meetingId: activeAudioCall.meetingId
            })
        }
        leaveMeeting()
        stopMedia()
        setActiveAudioCall(null)
    }

    // Failsafe Watchdog: Auto-terminate direct 1-on-1 call if remote peer stream drops completely
    const callConnectedAtRef = useRef<number>(0)
    useEffect(() => {
        if (activeAudioCall) {
            callConnectedAtRef.current = Date.now()
        } else {
            callConnectedAtRef.current = 0
        }
    }, [activeAudioCall?.meetingId])

    useEffect(() => {
        if (!activeAudioCall || activeAudioCall.isGroupCall) return

        const activeRemoteCount = Object.keys(remoteStreams || {}).length
        if (activeRemoteCount > 0) return

        const elapsedSinceStart = Date.now() - callConnectedAtRef.current
        if (elapsedSinceStart < 7000) {
            const initialGrace = setTimeout(() => {
                if (activeAudioCallRef.current && !activeAudioCallRef.current.isGroupCall) {
                    if (Object.keys(remoteStreams || {}).length === 0) {
                        console.log('[AppWorkspace] Direct call timeout: No remote peer joined. Auto-closing.')
                        handleEndActiveAudioCall()
                    }
                }
            }, 7000 - elapsedSinceStart)
            return () => clearTimeout(initialGrace)
        }

        const watchdogTimer = setTimeout(() => {
            if (activeAudioCallRef.current && !activeAudioCallRef.current.isGroupCall) {
                if (Object.keys(remoteStreams || {}).length === 0) {
                    console.log('[AppWorkspace] Remote peer stream disconnected for >4s. Auto-closing direct call.')
                    handleEndActiveAudioCall()
                }
            }
        }, 4000)

        return () => clearTimeout(watchdogTimer)
    }, [activeAudioCall, remoteStreams])

    const handleStartDirectCall = (
        targetId: string,
        callType: 'video' | 'audio' | 'screenshare' = 'audio',
        targetName?: string,
        targetAvatar?: string,
        screenStream?: MediaStream
    ) => {
        if (!socket || !targetId.trim()) return
        if (screenStream) {
            pendingScreenStreamRef.current = screenStream
        }
        const newMeetingId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        socket.emit(SocketEvents.CALL_INITIATE, {
            targetUserId: targetId.trim(),
            calleeId: targetId.trim(),
            callerName: profileName || 'Colleague',
            callerAvatar: profileImage,
            callType,
            meetingId: newMeetingId
        })
        setOutgoingCall({
            meetingId: newMeetingId,
            targetUserId: targetId.trim(),
            targetName: targetName || 'Colleague',
            targetAvatar,
            callType,
            status: 'ringing'
        })
        setShowDirectDialModal(false)
        setDirectDialTarget('')

        clearOutgoingCallTimeout()
        outgoingCallTimeoutRef.current = setTimeout(() => {
            const current = outgoingCallRef.current
            if (current && (current.status === 'calling' || current.status === 'ringing')) {
                console.log('[AppWorkspace] Outgoing call timed out after 60s (No answer)')
                if (socket) {
                    socket.emit(SocketEvents.CALL_CANCELLED, {
                        targetUserId: current.targetUserId,
                        targetUserIds: current.targetUserIds,
                        meetingId: current.meetingId,
                        reason: 'no_answer'
                    })
                }
                if (pendingScreenStreamRef.current) {
                    pendingScreenStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch {} })
                    pendingScreenStreamRef.current = null
                }
                leaveMeeting()
                stopMedia()
                setOutgoingCall(prev => prev ? { ...prev, status: 'no_answer' } : null)
                setTimeout(() => {
                    setOutgoingCall(null)
                }, 3000)
            }
        }, 60000)
    }

    const handleStartGroupCall = async (
        targetUserIds: string[],
        channelName: string,
        channelId: string,
        callType: 'video' | 'audio' = 'audio'
    ) => {
        if (!socket || !targetUserIds.length) return
        const newMeetingId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        socket.emit(SocketEvents.CALL_INITIATE, {
            targetUserIds,
            channelName,
            channelId,
            callerName: profileName || 'Colleague',
            callerAvatar: profileImage,
            callType,
            meetingId: newMeetingId
        })
        setOutgoingCall({
            meetingId: newMeetingId,
            targetUserIds,
            channelName,
            channelId,
            isGroupCall: true,
            targetName: `#${channelName} (${targetUserIds.length} members)`,
            callType,
            status: 'ringing'
        })
        try {
            await requestMedia(callType === 'audio')
            connectToMeeting(newMeetingId, profileName || 'Colleague', true)
        } catch (err) {
            console.warn('[AppWorkspace] Audio request error for group call:', err)
        }

        clearOutgoingCallTimeout()
        outgoingCallTimeoutRef.current = setTimeout(() => {
            const current = outgoingCallRef.current
            if (current && (current.status === 'calling' || current.status === 'ringing')) {
                console.log('[AppWorkspace] Group call timed out after 60s (No answer)')
                if (socket) {
                    socket.emit(SocketEvents.CALL_CANCELLED, {
                        targetUserIds: current.targetUserIds,
                        meetingId: current.meetingId,
                        reason: 'no_answer'
                    })
                }
                leaveMeeting()
                stopMedia()
                setOutgoingCall(prev => prev ? { ...prev, status: 'no_answer' } : null)
                setTimeout(() => {
                    setOutgoingCall(null)
                }, 3000)
            }
        }, 60000)
    }

    return {
        incomingCall,
        outgoingCall,
        activeAudioCall,
        showNotificationPrompt,
        setShowNotificationPrompt,
        showDirectDialModal,
        setShowDirectDialModal,
        directDialTarget,
        setDirectDialTarget,
        handleAcceptCall,
        handleDeclineCall,
        handleCancelOutgoingCall,
        handleEndActiveAudioCall,
        handleStartDirectCall,
        handleStartGroupCall
    }
}
