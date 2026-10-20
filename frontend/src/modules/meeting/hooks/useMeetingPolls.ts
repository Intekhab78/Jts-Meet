import { useState, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'
import { soundEffects } from '../../../utils/soundEffects'

export interface PollOption {
    id: string
    text: string
    votes: string[]
}

export interface Poll {
    id: string
    meetingId: string
    creatorId: string
    question: string
    options: PollOption[]
    active: boolean
    createdAt: Date
}

export function useMeetingPolls({
    socket,
    meetingId,
    localUserId,
    addToast
}: {
    socket: Socket | null
    meetingId: string
    localUserId: string
    addToast: (msg: string, type?: any) => void
}) {
    const [polls, setPolls] = useState<Poll[]>([])
    const [activeNotificationPoll, setActiveNotificationPoll] = useState<Poll | null>(null)
    const knownPollIdsRef = useRef<Set<string>>(new Set())
    const initialSyncDoneRef = useRef(false)
    const localUserIdRef = useRef(localUserId)

    useEffect(() => {
        localUserIdRef.current = localUserId
    }, [localUserId])

    useEffect(() => {
        if (!socket || !meetingId) return

        const handlePollUpdate = (payload: { meetingId: string; polls: Poll[] }) => {
            if (payload?.meetingId === meetingId && Array.isArray(payload?.polls)) {
                setPolls(payload.polls)

                // Detect new active polls created during the meeting
                if (initialSyncDoneRef.current) {
                    const newActivePoll = payload.polls.find(
                        p => p.active && !knownPollIdsRef.current.has(p.id)
                    )

                    if (newActivePoll) {
                        // Play gentle chime
                        try {
                            soundEffects.playMessageNotificationChime()
                        } catch (_) {}

                        // Add toast notification
                        addToast(`📊 New Poll: ${newActivePoll.question}`, 'info')

                        // Trigger floating notification card for participants (or co-hosts)
                        setActiveNotificationPoll(newActivePoll)
                    }
                }

                // Update known poll IDs
                payload.polls.forEach(p => knownPollIdsRef.current.add(p.id))
                initialSyncDoneRef.current = true
            }
        }

        socket.on(SocketEvents.POLL_UPDATE, handlePollUpdate)

        // Request initial polls on join for state sync
        socket.emit('poll:get_all', { meetingId })

        return () => {
            socket.off(SocketEvents.POLL_UPDATE, handlePollUpdate)
        }
    }, [socket, meetingId, addToast])

    // Checks if there are active polls where current user has not cast a vote yet
    const hasActiveUnvotedPoll = polls.some(p => {
        if (!p.active) return false
        const hasVoted = p.options.some(opt => 
            opt.votes.includes(localUserIdRef.current) || (socket?.id && opt.votes.includes(socket.id))
        )
        return !hasVoted
    })

    const dismissNotification = () => {
        setActiveNotificationPoll(null)
    }

    return {
        polls,
        activeNotificationPoll,
        dismissNotification,
        hasActiveUnvotedPoll
    }
}
