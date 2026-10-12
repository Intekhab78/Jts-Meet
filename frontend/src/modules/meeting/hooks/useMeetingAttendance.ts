import { useState, useEffect, useRef } from 'react'
import {
    exportAttendanceCSV as exportAttendanceCSVUtil,
    downloadICSFile as downloadICSFileUtil,
    generateMoMContent as generateMoMContentUtil,
    AttendanceRecordItem
} from '../utils/meetingExports'

interface UseMeetingAttendanceProps {
    joined: boolean
    myDisplayName: string
    meetingId: string
    meetingInput?: string
    meetingInfo?: any
    participants: string[]
    coHostIds: string[]
    renamedUsers: Record<string, string>
    getUserDisplayName: (userId: string) => string
    fetchMeetingParticipants?: (meetingId: string) => void
    messages: any[]
    timerStr: string
    addToast: (message: string, type?: 'info' | 'success' | 'warning' | any) => void
}

export const useMeetingAttendance = ({
    joined,
    myDisplayName,
    meetingId,
    meetingInput = '',
    meetingInfo,
    participants,
    coHostIds,
    renamedUsers,
    getUserDisplayName,
    fetchMeetingParticipants,
    messages,
    timerStr,
    addToast
}: UseMeetingAttendanceProps) => {
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecordItem>>({})
    const attendanceRecordsRef = useRef<Record<string, AttendanceRecordItem>>({})
    const joinTimeMapRef = useRef<Record<string, number>>({})
    const [showAttendanceModal, setShowAttendanceModal] = useState(false)
    const prevParticipantsRef = useRef<string[]>([])

    // Attendance tracking: Record local user on join
    useEffect(() => {
        if (!joined) return
        const localId = 'me'
        const now = Date.now()
        joinTimeMapRef.current[localId] = now
        attendanceRecordsRef.current[localId] = {
            userId: localId,
            name: `${myDisplayName} (You)`,
            role: 'Host / Participant',
            joinTime: new Date(now).toLocaleTimeString(),
            durationSeconds: 0,
            status: 'Active'
        }
        setAttendanceRecords({ ...attendanceRecordsRef.current })
    }, [joined, myDisplayName])

    // Dynamic join/leave announcements using toasts & attendance audit logger
    useEffect(() => {
        const prev = prevParticipantsRef.current
        if (joined) {
            const now = Date.now()
            if (meetingId && fetchMeetingParticipants) {
                fetchMeetingParticipants(meetingId)
            }
            if (participants.length > prev.length) {
                const joinedUser = participants.find(p => !prev.includes(p))
                if (joinedUser) {
                    const cleanName = getUserDisplayName(joinedUser)
                    addToast(`${cleanName} joined the meeting`, 'success')

                    // Record attendance entry
                    joinTimeMapRef.current[joinedUser] = now
                    attendanceRecordsRef.current[joinedUser] = {
                        userId: joinedUser,
                        name: cleanName,
                        role: coHostIds.includes(joinedUser) ? 'Co-Host' : (joinedUser.startsWith('guest_') ? 'Guest' : 'Participant'),
                        joinTime: new Date(now).toLocaleTimeString(),
                        durationSeconds: 0,
                        status: 'Active'
                    }
                    setAttendanceRecords({ ...attendanceRecordsRef.current })
                }
            } else if (participants.length < prev.length) {
                const leftUser = prev.find(p => !participants.includes(p))
                if (leftUser) {
                    const cleanName = getUserDisplayName(leftUser)
                    addToast(`${cleanName} left the meeting`, 'info')

                    // Record attendance exit & duration
                    if (attendanceRecordsRef.current[leftUser]) {
                        const joinTs = joinTimeMapRef.current[leftUser] || now
                        const durationSec = Math.max(1, Math.round((now - joinTs) / 1000))
                        attendanceRecordsRef.current[leftUser].status = 'Left'
                        attendanceRecordsRef.current[leftUser].leaveTime = new Date(now).toLocaleTimeString()
                        attendanceRecordsRef.current[leftUser].durationSeconds = durationSec
                        setAttendanceRecords({ ...attendanceRecordsRef.current })
                    }
                }
            }
        }
        prevParticipantsRef.current = participants
    }, [participants, joined, meetingId, renamedUsers, coHostIds, getUserDisplayName, fetchMeetingParticipants, addToast])

    // 1-Click Attendance CSV Exporter
    const exportAttendanceCSV = () => {
        exportAttendanceCSVUtil({
            records: Object.values(attendanceRecordsRef.current),
            joinTimeMap: joinTimeMapRef.current,
            meetingId: meetingInfo?.customId || meetingInfo?.id || meetingId || 'report',
            addToast
        })
    }

    // 1-Click iCalendar (.ics) Download
    const downloadICSFile = () => {
        downloadICSFileUtil({
            meetingId: meetingInfo?.customId || meetingInfo?.id || meetingId || meetingInput || 'session',
            meetingTitle: meetingInfo?.title,
            addToast
        })
    }

    // AI Minutes of Meeting (MoM) synthesis
    const generateMoMContent = () => {
        return generateMoMContentUtil({
            meetingInfo,
            meetingId,
            myDisplayName,
            attendanceRecords: attendanceRecordsRef.current,
            participants,
            getUserDisplayName,
            messages,
            timerStr
        })
    }

    return {
        attendanceRecords,
        attendanceRecordsRef,
        joinTimeMapRef,
        showAttendanceModal,
        setShowAttendanceModal,
        exportAttendanceCSV,
        downloadICSFile,
        generateMoMContent
    }
}
