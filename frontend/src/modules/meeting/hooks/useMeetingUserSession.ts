import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { getUserIdFromToken, parseJwt } from '../utils/meetingHelpers'

export interface ToastItem {
    id: string
    message: string
    type: 'info' | 'success' | 'warning'
}

export interface UseMeetingUserSessionProps {
    initialToken?: string
    initialMeetingId?: string
    rawParticipants: string[]
    socket: any
}

export function useMeetingUserSession({
    initialToken = '',
    initialMeetingId = '',
    rawParticipants,
    socket
}: UseMeetingUserSessionProps) {
    const [token, setToken] = useState(initialToken)

    // User identity & guest state
    const localUserId = getUserIdFromToken(token)
    const isGuest = useMemo(() => {
        try {
            const decoded = parseJwt(token || initialToken)
            return !!decoded?.isGuest || localUserId?.startsWith('guest_') || false
        } catch (e) {
            return false
        }
    }, [token, initialToken, localUserId])

    const [meetingInfo, setMeetingInfo] = useState<any>(null)
    const [screenSharePolicy, setScreenSharePolicy] = useState<'everyone' | 'host_only'>('everyone')
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const lastToastRef = useRef<{ message: string, time: number }>({ message: '', time: 0 })

    const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
        const now = Date.now()
        // Deduplicate identical toasts called within 1000ms (prevents double invocations in React StrictMode & rapid clicks)
        if (lastToastRef.current.message === message && (now - lastToastRef.current.time) < 1000) {
            return
        }
        lastToastRef.current = { message, time: now }

        const id = String(now) + '_' + String(Math.random())
        setToasts(prev => {
            if (prev.some(t => t.message === message)) {
                return prev
            }
            return [...prev, { id, message, type }]
        })
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    useEffect(() => {
        if (meetingInfo?.screenSharePolicy) {
            setScreenSharePolicy(meetingInfo.screenSharePolicy)
        }
    }, [meetingInfo?.screenSharePolicy])

    useEffect(() => {
        if (initialToken && initialToken !== token) {
            setToken(initialToken)
        }
    }, [initialToken])

    const [meetingInput, setMeetingInput] = useState(() => {
        if (initialMeetingId) return initialMeetingId
        try {
            const pathnameMatch = window.location.pathname.match(/^\/meet\/([a-zA-Z0-9\-_]+)/)
            if (pathnameMatch) return pathnameMatch[1]

            const hashParts = window.location.hash.split('?')
            if (hashParts.length > 1) {
                const params = new URLSearchParams(hashParts[1])
                const urlId = params.get('id') || params.get('meetingId')
                if (urlId) return urlId
            }
            const searchParams = new URLSearchParams(window.location.search)
            const qId = searchParams.get('id') || searchParams.get('meetingId')
            if (qId) return qId
        } catch (e) { }
        return sessionStorage.getItem('jts_active_meeting_id') || localStorage.getItem('jts_last_meeting_id') || ''
    })

    useEffect(() => {
        if (initialMeetingId && initialMeetingId !== meetingInput) {
            setMeetingInput(initialMeetingId)
        }
    }, [initialMeetingId])

    const myDisplayName = useMemo(() => {
        let name = localStorage.getItem('jts_guest_name') || localStorage.getItem('jts_user_name') || ''
        try {
            const decoded = parseJwt(token || initialToken)
            if (decoded) {
                name = decoded.guestName || decoded.fullName || decoded.email || name
            }
        } catch (e) { }
        return name || 'Participant'
    }, [token, initialToken])

    const [isRemoteRecording, setIsRemoteRecording] = useState(false)
    const canManageRef = useRef(false)

    const myUserId = useMemo(() => {
        try {
            const decoded = parseJwt(token || initialToken)
            return decoded?.userId || decoded?.id || decoded?.sub || ''
        } catch (_) {
            return ''
        }
    }, [token, initialToken])

    const participants = useMemo(() => {
        return rawParticipants.filter(p => p && p !== 'me' && (!myUserId || p !== myUserId) && (!socket?.id || p !== socket.id))
    }, [rawParticipants, myUserId, socket?.id])

    return {
        token,
        setToken,
        localUserId,
        isGuest,
        meetingInfo,
        setMeetingInfo,
        screenSharePolicy,
        setScreenSharePolicy,
        toasts,
        setToasts,
        addToast,
        meetingInput,
        setMeetingInput,
        myDisplayName,
        myUserId,
        participants,
        isRemoteRecording,
        setIsRemoteRecording,
        canManageRef
    }
}
