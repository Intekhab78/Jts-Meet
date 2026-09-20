import React, { createContext, useState, useContext, useCallback } from 'react'

interface MeetingContextValue {
    meetingId: string
    setMeetingId: (meetingId: string) => void
    joined: boolean
    setJoined: (value: boolean) => void
    participants: string[]
    addParticipant: (userId: string) => void
    removeParticipant: (userId: string) => void
}

const MeetingContext = createContext<MeetingContextValue | undefined>(undefined)

export const MeetingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [meetingId, setMeetingId] = useState('')
    const [joined, setJoined] = useState(false)
    const [participants, setParticipants] = useState<string[]>([])

    const addParticipant = useCallback((userId: string) => {
        if (!userId || userId === 'me') return

        let currentUserId = ''
        try {
            const token = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
            if (token) {
                const parts = token.split('.')
                if (parts.length === 3) {
                    const decoded = JSON.parse(atob(parts[1]))
                    currentUserId = decoded.userId || decoded.id || decoded.sub || ''
                }
            }
        } catch (_) {}

        if (currentUserId && userId === currentUserId) return

        setParticipants((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
    }, [])

    const removeParticipant = useCallback((userId: string) => {
        setParticipants((prev) => prev.filter((id) => id !== userId))
    }, [])

    return (
        <MeetingContext.Provider
            value={{ meetingId, setMeetingId, joined, setJoined, participants, addParticipant, removeParticipant }}
        >
            {children}
        </MeetingContext.Provider>
    )
}

export function useMeetingContext() {
    const context = useContext(MeetingContext)
    if (!context) {
        throw new Error('useMeetingContext must be used within MeetingProvider')
    }
    return context
}
