import { useState, useCallback, useRef } from 'react'
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
    const meetingInfoRef = useRef<any>(null)

    const getUserDisplayName = useCallback((uid: string): string => {
        if (!uid) return 'Guest'
        if (uid === 'me') return 'You'
        
        const targetId = uid.trim()
        const targetLower = targetId.toLowerCase()

        // 1. Direct or case-insensitive match in renamedUsers
        const directMatch = renamedUsers[targetId] || 
            renamedUsers[targetLower] || 
            Object.entries(renamedUsers).find(([k]) => k.trim().toLowerCase() === targetLower)?.[1]
        if (directMatch && directMatch.trim()) return directMatch.trim()

        // 2. Current user check
        const currentUid = getUserIdFromToken(token || initialToken || '')
        if (currentUid && targetLower === currentUid.trim().toLowerCase()) {
            return myDisplayName ? `${myDisplayName} (You)` : 'You'
        }

        // 3. Fallback to localStorage / sessionStorage if cached from WebRTC signaling
        try {
            const cached = sessionStorage.getItem(`jts_peer_name_${targetLower}`) || localStorage.getItem(`jts_peer_name_${targetLower}`)
            if (cached && cached.trim()) return cached.trim()
        } catch {}

        // 4. Fallback to meetingInfo host/participants if populated
        if (meetingInfoRef.current) {
            const info = meetingInfoRef.current
            const hostId = info.host?._id || info.host
            if (hostId && String(hostId).toLowerCase() === targetLower && info.host?.fullName) {
                return info.host.fullName
            }
            if (Array.isArray(info.participants)) {
                const found = info.participants.find((p: any) => p && p._id && String(p._id).toLowerCase() === targetLower)
                if (found?.fullName) return found.fullName
            }
        }

        // 5. If it's an unmapped guest ID, return 'Guest'
        if (targetLower.startsWith('guest_')) {
            return 'Guest'
        }

        return targetId
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
                meetingInfoRef.current = meetingInfoData
                setMeetingInfo(meetingInfoData)

                // Functional state update: MERGE into prev so existing guest names and socket-delivered display names
                // are NEVER overwritten or wiped out!
                setRenamedUsers(prev => {
                    const next = { ...prev }
                    let modified = false

                    if (meetingInfoData.host && meetingInfoData.host.fullName) {
                        const hostId = String(meetingInfoData.host._id || meetingInfoData.host)
                        if (next[hostId] !== meetingInfoData.host.fullName) {
                            next[hostId] = meetingInfoData.host.fullName
                            next[hostId.toLowerCase()] = meetingInfoData.host.fullName
                            modified = true
                        }
                    }

                    if (meetingInfoData.participants && Array.isArray(meetingInfoData.participants)) {
                        meetingInfoData.participants.forEach((p: any) => {
                            if (p && p._id && p.fullName) {
                                const pId = String(p._id)
                                if (next[pId] !== p.fullName) {
                                    next[pId] = p.fullName
                                    next[pId.toLowerCase()] = p.fullName
                                    modified = true
                                }
                            }
                        })
                    }

                    return modified ? next : prev
                })
            }
        } catch (err) {
            console.error("Failed to fetch meeting participants names:", err)
        }
    }, [token, setMeetingInfo])

    return {
        renamedUsers,
        setRenamedUsers,
        getUserDisplayName,
        fetchMeetingParticipants
    }
}
