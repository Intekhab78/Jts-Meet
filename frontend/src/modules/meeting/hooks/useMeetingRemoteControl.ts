import { useState, useEffect } from 'react'
import { soundEffects } from '../../../utils/soundEffects'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingRemoteControlProps {
    socket: any
    meetingId: string
    meetingInput?: string
    meetingInfo?: any
    initialMeetingId?: string
    screenSharingUserId: string | null
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
    token,
    myDisplayName,
    addToast
}: UseMeetingRemoteControlProps) => {
    const [activeControllerId, setActiveControllerId] = useState<string | null>(null)
    const [activeControllerName, setActiveControllerName] = useState<string | null>(null)
    const [incomingControlRequest, setIncomingControlRequest] = useState<{ requesterId: string; requesterName: string } | null>(null)
    const [isRequestingControl, setIsRequestingControl] = useState(false)

    const getCurrentMeetingId = () => {
        return meetingInfo?.customId || meetingInfo?.id || meetingId || initialMeetingId || meetingInput
    }

    // Remote Control Socket Listeners
    useEffect(() => {
        if (!socket) return

        const handleControlRequest = (data: { meetingId: string; requesterId: string; requesterName: string; targetUserId: string }) => {
            if (screenSharingUserId === 'me') {
                soundEffects.playMessageNotificationChime()
                setIncomingControlRequest({
                    requesterId: data.requesterId,
                    requesterName: data.requesterName || 'Participant'
                })
                addToast(`${data.requesterName || 'A participant'} has requested remote control of your screen.`, 'info')
            }
        }

        const handleControlResponse = (data: { meetingId: string; requesterId: string; granted: boolean; presenterId: string; presenterName?: string }) => {
            const myId = parseJwt(token || '')?.userId || 'me'
            if (data.requesterId === myId || data.requesterId === 'me') {
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
            setActiveControllerId(null)
            setActiveControllerName(null)
            setIsRequestingControl(false)
            addToast(`Remote control session ended.`, 'info')
        }

        socket.on('remote-control:request', handleControlRequest)
        socket.on('remote-control:response', handleControlResponse)
        socket.on('remote-control:revoke', handleControlRevoke)

        return () => {
            socket.off('remote-control:request', handleControlRequest)
            socket.off('remote-control:response', handleControlResponse)
            socket.off('remote-control:revoke', handleControlRevoke)
        }
    }, [socket, screenSharingUserId, token, myDisplayName, addToast])

    const handleRequestRemoteControl = () => {
        if (!socket || !screenSharingUserId || isRequestingControl) return
        setIsRequestingControl(true)
        const myId = parseJwt(token || '')?.userId || 'me'
        const currentMeetingId = getCurrentMeetingId()
        socket.emit('remote-control:request', {
            meetingId: currentMeetingId,
            requesterId: myId,
            requesterName: myDisplayName,
            targetUserId: screenSharingUserId
        })
        addToast(`Sent remote control request to presenter...`, 'info')
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
        const myId = parseJwt(token || '')?.userId || 'me'
        setActiveControllerId(null)
        setActiveControllerName(null)
        socket.emit('remote-control:revoke', {
            meetingId: currentMeetingId,
            controllerId: myId,
            presenterId: screenSharingUserId
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
