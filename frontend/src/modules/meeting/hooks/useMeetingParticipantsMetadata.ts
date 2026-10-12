import { useState, useCallback } from 'react'
import { API_BASE } from '../../../config'
import { getUserIdFromToken } from '../utils/meetingHelpers'

interface UseMeetingParticipantsMetadataProps {
    token: string | null
    initialToken?: string
    myDisplayName: string
    setMeetingInfo: (info: any) => void
}

export const useMeetingParticipantsMetadata = ({
    token,
    initialToken,
    myDisplayName,
    setMeetingInfo
}: UseMeetingParticipantsMetadataProps) => {
    const [renamedUsers, setRenamedUsers] = useState<{ [key: string]: string }>({})

    const getUserDisplayName = useCallback((uid: string): string => {
        if (!uid) return 'Guest'
        if (uid === 'me') return 'You'
        if (renamedUsers[uid]) return renamedUsers[uid]
        const currentUid = getUserIdFromToken(token || initialToken || '')
        if (currentUid && uid === currentUid) return myDisplayName ? `${myDisplayName} (You)` : 'You'
        if (uid.toLowerCase().startsWith('guest_')) {
            return 'Guest'
        }
        return uid
    }, [renamedUsers, token, initialToken, myDisplayName])

    const fetchMeetingParticipants = useCallback(async (meetId: string) => {
        if (!meetId) return
        try {
            const response = await fetch(`${API_BASE}/api/meeting/${meetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok && data?.data) {
                const meetingInfoData = data.data
                setMeetingInfo(meetingInfoData)
                const newRenames = { ...renamedUsers }
                let modified = false

                if (meetingInfoData.host && newRenames[meetingInfoData.host._id] !== meetingInfoData.host.fullName) {
                    newRenames[meetingInfoData.host._id] = meetingInfoData.host.fullName
                    modified = true
                }

                if (meetingInfoData.participants && Array.isArray(meetingInfoData.participants)) {
                    meetingInfoData.participants.forEach((p: any) => {
                        if (p && p._id && p.fullName && newRenames[p._id] !== p.fullName) {
                            newRenames[p._id] = p.fullName
                            modified = true
                        }
                    })
                }

                if (modified) {
                    setRenamedUsers(newRenames)
                }
            }
        } catch (err) {
            console.error("Failed to fetch meeting participants names:", err)
        }
    }, [token, renamedUsers, setMeetingInfo])

    return {
        renamedUsers,
        setRenamedUsers,
        getUserDisplayName,
        fetchMeetingParticipants
    }
}
