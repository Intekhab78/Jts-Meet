import { useState, useEffect, useCallback } from 'react'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingHandsProps {
    socket: any
    meetingId: string
    meetingInput: string
}

export const useMeetingHands = ({
    socket,
    meetingId,
    meetingInput
}: UseMeetingHandsProps) => {
    const [handRaised, setHandRaised] = useState(false)
    const [handsRaisedMap, setHandsRaisedMap] = useState<{ [key: string]: boolean }>({})

    // Socket remote hand raise listener + refresh sync
    useEffect(() => {
        if (!socket) return
        const handleRemoteRaiseHand = (payload: { userId: string; meetingId?: string; raised: boolean }) => {
            if (payload?.meetingId && meetingId && payload.meetingId !== meetingId) return
            setHandsRaisedMap(prev => ({ ...prev, [payload.userId]: payload.raised }))
        }
        const handleHandsSync = (payload: { meetingId?: string; raisedUserIds?: string[] }) => {
            if (payload?.meetingId && meetingId && payload.meetingId !== meetingId) return
            if (!Array.isArray(payload?.raisedUserIds)) return
            const syncedMap: { [key: string]: boolean } = {}
            payload.raisedUserIds.forEach(uId => {
                if (uId) syncedMap[uId] = true
            })
            setHandsRaisedMap(syncedMap)

            try {
                const token = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
                const decoded = token ? parseJwt(token) : null
                const localId = decoded?.userId || decoded?.id || decoded?.sub || ''
                if (localId && syncedMap[localId]) {
                    setHandRaised(true)
                }
            } catch {}
        }
        socket.on('meeting:raise-hand', handleRemoteRaiseHand)
        socket.on('meeting:hands-sync', handleHandsSync)
        return () => {
            socket.off('meeting:raise-hand', handleRemoteRaiseHand)
            socket.off('meeting:hands-sync', handleHandsSync)
        }
    }, [socket, meetingId])

    const handleToggleHandRaise = useCallback(() => {
        const next = !handRaised
        socket?.emit('meeting:raise-hand', {
            meetingId: meetingId || meetingInput,
            raised: next
        })
        setHandRaised(next)
    }, [socket, meetingId, meetingInput, handRaised])

    return {
        handRaised,
        setHandRaised,
        handsRaisedMap,
        setHandsRaisedMap,
        handleToggleHandRaise
    }
}
