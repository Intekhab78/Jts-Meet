import { useState, useEffect } from 'react'

function getOrInitMeetingStartMs(): number {
    try {
        const activeId = sessionStorage.getItem('jts_active_meeting_id') || ''
        const key = activeId ? `jts_meeting_start_${activeId}` : 'jts_meeting_start_ts'
        const saved = sessionStorage.getItem(key)
        if (saved) {
            const parsed = Number(saved)
            if (!Number.isNaN(parsed) && parsed > 0 && parsed <= Date.now()) {
                return parsed
            }
        }
        const now = Date.now()
        sessionStorage.setItem(key, String(now))
        return now
    } catch {
        return Date.now()
    }
}

export function useMeetingTimer() {
    const [seconds, setSeconds] = useState(() => {
        const startMs = getOrInitMeetingStartMs()
        return Math.max(0, Math.floor((Date.now() - startMs) / 1000))
    })

    useEffect(() => {
        const interval = setInterval(() => {
            const startMs = getOrInitMeetingStartMs()
            setSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const format = () => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return [
            hrs > 0 ? String(hrs).padStart(2, '0') : null,
            String(mins).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].filter(Boolean).join(':')
    }

    return { timerStr: format(), seconds }
}
