import { useEffect, useRef } from 'react'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingReconnectionProps {
    connected: boolean
    joined: boolean
    meetingId: string
    token: string | null
    initialToken?: string
    connectToMeetingRef: React.MutableRefObject<(id: string, name: string) => void>
}

export const useMeetingReconnection = ({
    connected,
    joined,
    meetingId,
    token,
    initialToken,
    connectToMeetingRef
}: UseMeetingReconnectionProps) => {
    // Auto-rejoin meeting room ONLY if socket was disconnected and re-established while joined
    const wasConnectedRef = useRef(connected)

    useEffect(() => {
        if (!wasConnectedRef.current && connected && joined && meetingId) {
            let myName = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
            try {
                const decoded = parseJwt(token || initialToken || '')
                if (decoded) {
                    myName = decoded.guestName || decoded.fullName || myName
                }
            } catch (e) { }
            connectToMeetingRef.current(meetingId, myName || 'Participant')
        }
        wasConnectedRef.current = connected
    }, [connected, joined, meetingId, token, initialToken, connectToMeetingRef])
}
