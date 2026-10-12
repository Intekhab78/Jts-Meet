import { useState, useEffect, useCallback } from 'react'

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

    // Socket remote hand raise listener
    useEffect(() => {
        if (!socket) return
        const handleRemoteRaiseHand = (payload: { userId: string; raised: boolean }) => {
            setHandsRaisedMap(prev => ({ ...prev, [payload.userId]: payload.raised }))
        }
        socket.on('meeting:raise-hand', handleRemoteRaiseHand)
        return () => {
            socket.off('meeting:raise-hand', handleRemoteRaiseHand)
        }
    }, [socket])

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
