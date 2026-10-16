import { useState, useEffect, useRef } from 'react'
import { soundEffects } from '../../../utils/soundEffects'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingRemoteControlProps {
    socket: any
    meetingId: string
    meetingInput?: string
    meetingInfo?: any
    initialMeetingId?: string
    screenSharingUserId: string | null
    screenSharingUserIds?: string[]
    token: string | null
    myDisplayName: string
    addToast: (message: string, type?: 'info' | 'success' | 'warning' | any) => void
}

export const useMeetingRemoteControl = ({
    socket,
    meetingId,
    meetingInput = '',
    meetingInfo,
    initialMeetingId,
    screenSharingUserId,
    screenSharingUserIds = [],
    token,
    myDisplayName,
    addToast
}: UseMeetingRemoteControlProps) => {
    const [activeControllerId, setActiveControllerId] = useState<string | null>(null)
    const [activeControllerName, setActiveControllerName] = useState<string | null>(null)
    const [incomingControlRequest, setIncomingControlRequest] = useState<{ requesterId: string; requesterName: string } | null>(null)
    const [isRequestingControl, setIsRequestingControl] = useState(false)
    const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const getCurrentMeetingId = () => {
        return (
            meetingId ||
            initialMeetingId ||
            meetingInput ||
            (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.split('?')[1]).get('id') : '') ||
            sessionStorage.getItem('jts_active_meeting_id') ||
            meetingInfo?.meetingId ||
            meetingInfo?.customId ||
            meetingInfo?.id ||
            ''
        )
    }

    // Remote Control Socket Listeners
    useEffect(() => {
        if (!socket) return

        const handleControlRequest = (data: { meetingId: string; requesterId: string; requesterName: string; targetUserId: string }) => {
            const myId = parseJwt(token || '')?.userId || ''
            const isMePresenter =
                screenSharingUserId === 'me' ||
                (screenSharingUserIds && screenSharingUserIds.includes('me')) ||
                data.targetUserId === 'me' ||
                (data.targetUserId && (data.targetUserId === myId || data.targetUserId === socket?.id))

            if (isMePresenter) {
                soundEffects.playMessageNotificationChime()
                setIncomingControlRequest({
                    requesterId: data.requesterId,
                    requesterName: data.requesterName || 'Participant'
                })
                addToast(`${data.requesterName || 'A participant'} has requested remote control of your screen.`, 'info')
            }
        }

        const handleControlResponse = (data: { meetingId: string; requesterId: string; granted: boolean; presenterId: string; presenterName?: string }) => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current)
                requestTimeoutRef.current = null
            }
            const myId = parseJwt(token || '')?.userId || socket?.id || 'me'
            if (data.requesterId === myId || data.requesterId === 'me' || data.requesterId === socket?.id) {
                setIsRequestingControl(false)
                if (data.granted) {
                    setActiveControllerId(myId)
                    setActiveControllerName(myDisplayName)
                    soundEffects.playMessageNotificationChime()
                    addToast(`Remote control granted! You can now interact with the screen.`, 'success')
                } else {
                    addToast(`Remote control request was declined by presenter.`, 'warning')
                }
            } else if (data.granted) {
                setActiveControllerId(data.requesterId)
                setActiveControllerName(data.requesterId)
            }
        }

        const handleControlRevoke = () => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current)
                requestTimeoutRef.current = null
            }
            setActiveControllerId(null)
            setActiveControllerName(null)
            setIsRequestingControl(false)
            addToast(`Remote control session ended.`, 'info')
        }

        socket.on('remote-control:request', handleControlRequest)
        socket.on('remote-control:response', handleControlResponse)
        socket.on('remote-control:revoke', handleControlRevoke)

        return () => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current)
                requestTimeoutRef.current = null
            }
            socket.off('remote-control:request', handleControlRequest)
            socket.off('remote-control:response', handleControlResponse)
            socket.off('remote-control:revoke', handleControlRevoke)
        }
    }, [socket, screenSharingUserId, screenSharingUserIds, token, myDisplayName, addToast])

    const handleRequestRemoteControl = () => {
        const currentMeetingId = getCurrentMeetingId()
        if (!socket || !screenSharingUserId || isRequestingControl || !currentMeetingId) return
        setIsRequestingControl(true)
        const myId = parseJwt(token || '')?.userId || socket?.id || 'me'
        socket.emit('remote-control:request', {
            meetingId: currentMeetingId,
            requesterId: myId,
            requesterName: myDisplayName || 'Participant',
            targetUserId: screenSharingUserId
        })
        addToast(`Sent remote control request to presenter...`, 'info')

        if (requestTimeoutRef.current) clearTimeout(requestTimeoutRef.current)
        requestTimeoutRef.current = setTimeout(() => {
            setIsRequestingControl(prev => {
                if (prev) {
                    addToast('Remote control request timed out (presenter did not respond).', 'warning')
                    return false
                }
                return false
            })
        }, 25000)
    }

    const handleAcceptControlRequest = () => {
        if (!incomingControlRequest || !socket) return
        const currentMeetingId = getCurrentMeetingId()
        setActiveControllerId(incomingControlRequest.requesterId)
        setActiveControllerName(incomingControlRequest.requesterName)
        socket.emit('remote-control:response', {
            meetingId: currentMeetingId,
            requesterId: incomingControlRequest.requesterId,
            granted: true,
            presenterId: 'me',
            presenterName: myDisplayName
        })
        setIncomingControlRequest(null)
        addToast(`Granted remote control to ${incomingControlRequest.requesterName}`, 'success')
    }

    const handleDenyControlRequest = () => {
        if (!incomingControlRequest || !socket) return
        const currentMeetingId = getCurrentMeetingId()
        socket.emit('remote-control:response', {
            meetingId: currentMeetingId,
            requesterId: incomingControlRequest.requesterId,
            granted: false,
            presenterId: 'me',
            presenterName: myDisplayName
        })
        setIncomingControlRequest(null)
    }

    const handleRevokeRemoteControl = () => {
        if (!socket) return
        const currentMeetingId = getCurrentMeetingId()
        setActiveControllerId(null)
        setActiveControllerName(null)
        socket.emit('remote-control:revoke', {
            meetingId: currentMeetingId,
            presenterId: 'me'
        })
        addToast(`Remote control revoked`, 'info')
    }

    const handleReleaseRemoteControl = () => {
        if (!socket) return
        const currentMeetingId = getCurrentMeetingId()
        const myId = parseJwt(token || '')?.userId || socket?.id || 'me'
        setActiveControllerId(null)
        setActiveControllerName(null)
        socket.emit('remote-control:revoke', {
            meetingId: currentMeetingId,
            controllerId: myId,
            presenterId: screenSharingUserId || 'me'
        })
        addToast(`Released remote control`, 'info')
    }

    return {
        activeControllerId,
        setActiveControllerId,
        activeControllerName,
        setActiveControllerName,
        incomingControlRequest,
        isRequestingControl,
        handleRequestRemoteControl,
        handleAcceptControlRequest,
        handleDenyControlRequest,
        handleRevokeRemoteControl,
        handleReleaseRemoteControl
    }
}
