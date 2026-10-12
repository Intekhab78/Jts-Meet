import { useState, useEffect } from 'react'
import { soundEffects } from '../../../utils/soundEffects'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingBreakoutRoomsProps {
    socket: any
    token: string | null
    meetingId: string
    meetingInput?: string
    localUserId?: string
    myDisplayName: string
    connectToMeeting: (roomId: string, displayName: string, isSubRoom?: boolean) => void
    addToast: (message: string, type?: 'info' | 'success' | 'warning' | any) => void
}

export interface BreakoutSession {
    isActive: boolean
    rooms: Array<{ id: string; name: string; participantIds: string[] }>
    endsAt: number | null
}

export const useMeetingBreakoutRooms = ({
    socket,
    token,
    meetingId,
    meetingInput = '',
    localUserId,
    myDisplayName,
    connectToMeeting,
    addToast
}: UseMeetingBreakoutRoomsProps) => {
    const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false)
    const [activeBreakoutSession, setActiveBreakoutSession] = useState<BreakoutSession | null>(null)
    const [currentBreakoutSubRoomId, setCurrentBreakoutSubRoomId] = useState<string | null>(null)

    // Socket listeners for Breakout Rooms
    useEffect(() => {
        if (!socket) return

        const handleBreakoutStarted = (payload: any) => {
            setActiveBreakoutSession({
                isActive: true,
                rooms: payload.rooms || [],
                endsAt: payload.endsAt || null
            })
            const myId = parseJwt(token || '')?.userId || 'me'
            const myRoom = payload.rooms?.find((r: any) =>
                r.participantIds?.includes(myId) ||
                r.participantIds?.includes(socket.id) ||
                (localUserId && r.participantIds?.includes(localUserId))
            )
            const activeMain = meetingId || meetingInput.trim()
            if (myRoom) {
                setCurrentBreakoutSubRoomId(myRoom.id)
                addToast(`Moving to ${myRoom.name}...`, 'info')
                const subRoomId = `${activeMain}__sub_${myRoom.id}`
                connectToMeeting(subRoomId, myDisplayName, true)
            } else {
                setCurrentBreakoutSubRoomId(null)
                addToast('Breakout rooms started. You remain in the main room.', 'info')
            }
        }

        const handleBreakoutAnnouncement = (payload: any) => {
            addToast(`Host Announcement: ${payload.message}`, 'warning')
            soundEffects.playKnockChime()
        }

        const handleBreakoutEnded = () => {
            setActiveBreakoutSession(null)
            setCurrentBreakoutSubRoomId(null)
            const activeMain = meetingId || meetingInput.trim()
            addToast('Breakout session ended. Returning to main room...', 'info')
            connectToMeeting(activeMain, myDisplayName, false)
        }

        socket.on('breakout:started', handleBreakoutStarted)
        socket.on('breakout:announcement', handleBreakoutAnnouncement)
        socket.on('breakout:ended', handleBreakoutEnded)

        return () => {
            socket.off('breakout:started', handleBreakoutStarted)
            socket.off('breakout:announcement', handleBreakoutAnnouncement)
            socket.off('breakout:ended', handleBreakoutEnded)
        }
    }, [socket, token, meetingId, meetingInput, localUserId, myDisplayName, connectToMeeting, addToast])

    return {
        isBreakoutModalOpen,
        setIsBreakoutModalOpen,
        activeBreakoutSession,
        setActiveBreakoutSession,
        currentBreakoutSubRoomId,
        setCurrentBreakoutSubRoomId
    }
}
