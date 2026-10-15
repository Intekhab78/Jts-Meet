import { useState, useRef, useEffect, useCallback } from 'react'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingLifecycleProps {
    meetingInput: string
    setMeetingInput: (id: string) => void
    meetingId: string
    setMeetingId: (id: string) => void
    socket: any
    token: string
    initialToken?: string
    initialMeetingId?: string
    autoJoin?: boolean
    connected: boolean
    joined: boolean
    setJoined: (joined: boolean) => void
    isVideoOff: boolean
    setIsVideoOff: (off: boolean) => void
    mediaLoading: boolean
    connectToMeeting: (id: string, name: string) => void
    leaveMeeting: () => void
    stopMedia?: () => void
    onLeave?: () => void
    isGuest: boolean
    timerStr: string
    talkTimeMap: Record<string, number>
    meetingNotes: string
    meetingInfo: any
    setPostMeetingCapsule: (capsule: any) => void
    startScreenShare: (stream: MediaStream) => Promise<any>
    connectSocket: (token: string) => void
}

export const useMeetingLifecycle = ({
    meetingInput,
    setMeetingInput,
    meetingId,
    setMeetingId,
    socket,
    token,
    initialToken,
    initialMeetingId,
    autoJoin,
    connected,
    joined,
    setJoined,
    isVideoOff,
    setIsVideoOff,
    mediaLoading,
    connectToMeeting,
    leaveMeeting,
    stopMedia,
    onLeave,
    isGuest,
    timerStr,
    talkTimeMap,
    meetingNotes,
    meetingInfo,
    setPostMeetingCapsule,
    startScreenShare,
    connectSocket
}: UseMeetingLifecycleProps) => {
    const hasLeftRef = useRef(false)
    const hasAutoJoinedRef = useRef(false)
    const autoRejoinAttemptedRef = useRef(false)
    const [hasLeft, setHasLeft] = useState(false)

    // Auto-connect if initialToken is provided
    useEffect(() => {
        if (initialToken && !connected) {
            connectSocket(initialToken)
        }
    }, [initialToken, connected, connectSocket])

    const handleConnect = () => {
        if (token.trim()) {
            connectSocket(token)
        }
    }

    const handleJoinMeeting = useCallback((customId?: string, isCameraOffParam?: boolean) => {
        const id = (typeof customId === 'string' ? customId : meetingInput).trim()
        if (!socket || !id) return
        setMeetingId(id)

        const initialOff = isCameraOffParam !== undefined ? isCameraOffParam : isVideoOff
        setIsVideoOff(initialOff)
        try {
            if (initialOff) {
                sessionStorage.setItem('jts_initial_camera_off', 'true')
            } else {
                sessionStorage.removeItem('jts_initial_camera_off')
            }
        } catch {}

        let myName = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
        try {
            const decoded = parseJwt(token || initialToken || '')
            if (decoded) {
                myName = decoded.guestName || decoded.fullName || myName
            }
        } catch (e) { }

        sessionStorage.setItem('jts_active_meeting_id', id)
        sessionStorage.setItem('jts_meeting_joined', 'true')
        localStorage.setItem('jts_last_meeting_id', id)
        window.history.replaceState(null, '', `/#meeting?id=${encodeURIComponent(id)}`)

        hasLeftRef.current = false
        hasAutoJoinedRef.current = false
        setHasLeft(false)
        connectToMeeting(id, myName || 'Participant')
        setJoined(true)
    }, [socket, meetingInput, setMeetingId, isVideoOff, setIsVideoOff, token, initialToken, connectToMeeting, setJoined])

    useEffect(() => {
        autoRejoinAttemptedRef.current = false
        hasLeftRef.current = false
        hasAutoJoinedRef.current = false
        setHasLeft(false)
    }, [initialMeetingId])

    const handleExitMeeting = useCallback((isPermanentEnd: boolean = false) => {
        hasLeftRef.current = true
        hasAutoJoinedRef.current = true
        setHasLeft(true)
        const currentMid = (meetingId || meetingInput || sessionStorage.getItem('jts_active_meeting_id') || '').trim()
        try {
            sessionStorage.removeItem('jts_active_meeting_id')
            sessionStorage.removeItem('jts_meeting_joined')
            if (isPermanentEnd) {
                localStorage.removeItem('jts_last_meeting_id')
            } else if (currentMid) {
                localStorage.setItem('jts_last_meeting_id', currentMid)
            }
            if (isGuest || !token) {
                localStorage.removeItem('jts_guest_token')
            }
        } catch (e) { }
        leaveMeeting()
        if (stopMedia) {
            try {
                stopMedia()
            } catch (e) {
                console.warn('Error stopping media on exit:', e)
            }
        }
        try {
            window.history.replaceState(null, '', '/#meeting')
        } catch (_) {}

        // If user just left (not ended), preserve meetingInput so it is immediately ready for rejoin
        if (!isPermanentEnd && currentMid) {
            setMeetingInput(currentMid)
        }

        // Guest users: Never expose internal Meeting Capsule with notes & action items.
        // Cleanly exit to home page or trigger onLeave callback.
        if (isGuest || !token) {
            setPostMeetingCapsule(null)
            if (onLeave) onLeave()
            else {
                window.location.hash = ''
                window.location.href = '/'
            }
            return
        }

        // Authenticated Host / Team members: Show post-meeting capsule if meeting had elapsed
        if (timerStr && timerStr !== '00:00') {
            const currentMid = (meetingId || meetingInput || '').trim()
            let panelNotes = ''
            try {
                panelNotes = localStorage.getItem(`jts_notes_${currentMid}`) || ''
                // Ignore default placeholder if user didn't write anything
                if (panelNotes.includes('- Key Discussion Points:\n  - \n\n- Action Items:\n  - [ ]') && panelNotes.length < 110) {
                    panelNotes = ''
                }
            } catch (_) {}

            const finalNotes = [meetingNotes.trim(), panelNotes.trim()].filter(Boolean).join('\n\n')

            setPostMeetingCapsule({
                duration: timerStr,
                talkTime: talkTimeMap,
                notes: finalNotes,
                title: meetingInfo?.title || `Meeting ${meetingId || meetingInput}`
            })
        } else {
            if (onLeave) onLeave()
            else window.location.hash = '#dashboard'
        }
    }, [leaveMeeting, onLeave, timerStr, talkTimeMap, meetingNotes, meetingInfo, meetingId, meetingInput, isGuest, token, setMeetingInput, setPostMeetingCapsule])

    // Direct autoJoin trigger: Only auto-joins ONCE upon entry, never if user has left!
    useEffect(() => {
        if (autoJoin && connected && !joined && !hasLeftRef.current && !hasAutoJoinedRef.current) {
            const target = (initialMeetingId || meetingInput || sessionStorage.getItem('jts_active_meeting_id') || '').trim()
            if (target) {
                hasAutoJoinedRef.current = true
                autoRejoinAttemptedRef.current = true
                handleJoinMeeting(target)
            }
        }
    }, [autoJoin, connected, joined, initialMeetingId, meetingInput, handleJoinMeeting])

    useEffect(() => {
        // If user has left or auto-rejoin was already handled, never auto-join!
        if (hasLeftRef.current || hasAutoJoinedRef.current || autoRejoinAttemptedRef.current) return
        if (!connected || joined || mediaLoading) return

        const decoded = parseJwt(initialToken || token || '')
        if (decoded?.isGuest && decoded?.meetingId) {
            autoRejoinAttemptedRef.current = true
            hasAutoJoinedRef.current = true
            handleJoinMeeting(decoded.meetingId)
            return
        }

        // If autoJoin is false, stay in SetupScreen (Lobby) so user can see Rejoin Room card & preview camera
        if (!autoJoin) return

        let urlMeetingId = initialMeetingId || ''
        if (!urlMeetingId) {
            try {
                const match = window.location.pathname.match(/^\/meet\/([a-zA-Z0-9\-_]+)/)
                if (match) urlMeetingId = match[1]

                if (!urlMeetingId) {
                    const hashParts = window.location.hash.split('?')
                    if (hashParts.length > 1) {
                        const params = new URLSearchParams(hashParts[1])
                        urlMeetingId = params.get('id') || params.get('meetingId') || params.get('room') || ''
                    }
                }
                if (!urlMeetingId) {
                    const searchParams = new URLSearchParams(window.location.search)
                    urlMeetingId = searchParams.get('id') || searchParams.get('meetingId') || searchParams.get('room') || ''
                }
            } catch (e) { }
        }

        const isAudioOnlyParam = Boolean(
            sessionStorage.getItem('jts_initial_camera_off') === 'true' ||
            (typeof window !== 'undefined' && (
                new URLSearchParams(window.location.hash.split('?')[1] || '').get('audio') === 'true' ||
                new URLSearchParams(window.location.search).get('audio') === 'true'
            ))
        )

        const activeSessionId = sessionStorage.getItem('jts_active_meeting_id')
        const targetId = urlMeetingId || activeSessionId || (autoJoin ? meetingInput : '')

        if (targetId && targetId.trim()) {
            autoRejoinAttemptedRef.current = true
            hasAutoJoinedRef.current = true
            handleJoinMeeting(targetId.trim(), isAudioOnlyParam ? true : undefined)
        }
    }, [connected, joined, initialToken, token, mediaLoading, initialMeetingId, autoJoin, meetingInput, handleJoinMeeting])

    // Auto-start pending pre-captured screen share from 1-on-1 Teams-style direct screen call
    useEffect(() => {
        if (!joined) return
        const pendingStream = (window as any).__jts_pending_screenshare_stream as MediaStream | undefined
        if (pendingStream) {
            delete (window as any).__jts_pending_screenshare_stream
            const t = setTimeout(() => {
                startScreenShare(pendingStream).catch(err => {
                    console.warn('[MeetingRoom] Auto-start pending screen share failed:', err)
                })
            }, 300)
            return () => clearTimeout(t)
        }
    }, [joined, startScreenShare])

    return {
        handleJoinMeeting,
        handleExitMeeting,
        handleConnect,
        hasLeft
    }
}
