import { useState, useEffect } from 'react'
import { playKnockChime } from '../services/chime.service'

interface UseMeetingWaitingRoomProps {
    socket: any
    meetingId: string
    meetingInput?: string
    meetingInfo?: any
    joined: boolean
    addToast: (message: string, type?: any) => void
}

export const useMeetingWaitingRoom = ({
    socket,
    meetingId,
    meetingInput = '',
    meetingInfo,
    joined,
    addToast
}: UseMeetingWaitingRoomProps) => {
    const [waitingGuests, setWaitingGuests] = useState<any[]>([])
    const [isWaitingRoomActive, setIsWaitingRoomActive] = useState(true)

    useEffect(() => {
        if (meetingInfo && meetingInfo.isWaitingRoomEnabled !== undefined) {
            setIsWaitingRoomActive(meetingInfo.isWaitingRoomEnabled !== false)
        }
    }, [meetingInfo])

    // Socket guest admission waiting room listeners
    useEffect(() => {
        if (!socket) return

        const handleNewWaiting = (guest: any) => {
            setWaitingGuests(prev => {
                if (prev.some(g => g.socketId === guest.socketId)) return prev
                return [...prev, guest]
            })
            playKnockChime()
            addToast(`⏳ ${guest.guestName || 'A participant'} is waiting in the lobby`, 'info')
        }

        const handleLeftWaiting = ({ socketId }: { socketId: string }) => {
            setWaitingGuests(prev => prev.filter(g => g.socketId !== socketId))
        }

        // Accept both raw-array and { waitingList: [...] } object forms from backend
        const handleWaitingList = (payload: any) => {
            if (Array.isArray(payload)) {
                setWaitingGuests(payload)
            } else if (payload && Array.isArray(payload.waitingList)) {
                setWaitingGuests(payload.waitingList)
            }
        }

        // Backend emits { meetingId, enabled } — NOT { isWaitingRoomEnabled }
        const handleWaitingRoomToggle = (data: any) => {
            const isEnabled = data?.enabled ?? data?.isWaitingRoomEnabled ?? true
            setIsWaitingRoomActive(isEnabled)
            addToast(`Waiting Room has been turned ${isEnabled ? 'ON' : 'OFF'} by Host`, 'info')
            if (!isEnabled) {
                setWaitingGuests([])
            }
        }

        socket.on('guest:new-waiting', handleNewWaiting)
        socket.on('guest:left-waiting', handleLeftWaiting)
        socket.on('guest:waiting-list', handleWaitingList)
        socket.on('meeting:waiting-room-toggle', handleWaitingRoomToggle)

        return () => {
            socket.off('guest:new-waiting', handleNewWaiting)
            socket.off('guest:left-waiting', handleLeftWaiting)
            socket.off('guest:waiting-list', handleWaitingList)
            socket.off('meeting:waiting-room-toggle', handleWaitingRoomToggle)
        }
    }, [socket, addToast])

    // Effect B — emit 'guest:get-waiting' whenever the active room or join state changes.
    useEffect(() => {
        if (!socket) return
        const activeRoom = meetingId || meetingInput.trim()
        if (activeRoom) {
            socket.emit('guest:get-waiting', { meetingId: activeRoom })
        }
    }, [socket, meetingId, meetingInput, joined])

    return {
        waitingGuests,
        setWaitingGuests,
        isWaitingRoomActive,
        setIsWaitingRoomActive
    }
}
