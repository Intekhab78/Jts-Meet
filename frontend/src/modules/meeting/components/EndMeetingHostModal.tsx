import React from 'react'
import { EndMeetingModal } from './EndMeetingModal'
import { API_BASE } from '../../../config'

interface EndMeetingHostModalProps {
    isOpen: boolean
    onClose: () => void
    handleExitMeeting: (isPermanentEnd?: boolean) => void
    meetingId: string
    meetingInput: string
    attendanceRecordsRef: React.MutableRefObject<any>
    joinTimeMapRef: React.MutableRefObject<any>
    myDisplayName: string
    timerStr: string
    participants: string[]
    getUserDisplayName: (userId: string) => string
    coHostIds: string[]
    token: string | null
    initialToken?: string
    addToast: (msg: string, type?: any) => void
    setMeetingInput: (val: string) => void
    socket: any
    exportAttendanceCSV: () => void
}

export const EndMeetingHostModal: React.FC<EndMeetingHostModalProps> = ({
    isOpen,
    onClose,
    handleExitMeeting,
    meetingId,
    meetingInput,
    attendanceRecordsRef,
    joinTimeMapRef,
    myDisplayName,
    timerStr,
    participants,
    getUserDisplayName,
    coHostIds,
    token,
    initialToken,
    addToast,
    setMeetingInput,
    socket,
    exportAttendanceCSV
}) => {
    return (
        <EndMeetingModal
            isOpen={isOpen}
            onClose={onClose}
            onLeaveOnly={() => {
                onClose()
                handleExitMeeting(false)
            }}
            onEndForAll={(sendSummaryEmail) => {
                onClose()
                if (sendSummaryEmail) {
                    const targetMeetingId = meetingId || meetingInput.trim()
                    const records = Object.values(attendanceRecordsRef.current)
                    const now = Date.now()
                    const formattedAttendees = records.length > 0 ? records.map((r: any) => {
                        const durationSec = r.status === 'Active' && joinTimeMapRef.current[r.userId]
                            ? Math.max(1, Math.round((now - joinTimeMapRef.current[r.userId]) / 1000))
                            : (r.durationSeconds || 0)
                        const minutes = Math.floor(durationSec / 60)
                        const seconds = durationSec % 60
                        const durationFormatted = `${minutes}m ${seconds}s`
                        return {
                            name: r.name,
                            userId: r.userId,
                            role: r.role,
                            status: r.status,
                            joinTime: r.joinTime,
                            leaveTime: r.leaveTime || 'Meeting Concluded',
                            duration: durationFormatted
                        }
                    }) : [
                        {
                            name: `${myDisplayName} (Host)`,
                            role: 'Host',
                            status: 'Active',
                            joinTime: new Date(now).toLocaleTimeString(),
                            leaveTime: 'Meeting Concluded',
                            duration: timerStr
                        },
                        ...participants.map(p => ({
                            name: getUserDisplayName(p),
                            role: coHostIds.includes(p) ? 'Co-Host' : 'Participant',
                            status: 'Active',
                            joinTime: new Date(now).toLocaleTimeString(),
                            leaveTime: 'Meeting Concluded',
                            duration: timerStr
                        }))
                    ]

                    // Generate CSV Content
                    const header = ['Participant Name', 'Role', 'Status', 'Join Time', 'Leave Time', 'Duration'].join(',')
                    const rows = formattedAttendees.map(a => [
                        `"${(a.name || '').replace(/"/g, '""')}"`,
                        `"${(a.role || 'Participant').replace(/"/g, '""')}"`,
                        `"${(a.status || 'Attended').replace(/"/g, '""')}"`,
                        `"${(a.joinTime || '').replace(/"/g, '""')}"`,
                        `"${(a.leaveTime || '').replace(/"/g, '""')}"`,
                        `"${(a.duration || timerStr).replace(/"/g, '""')}"`
                    ].join(','))
                    const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')

                    fetch(`${API_BASE}/api/meeting/${targetMeetingId}/dispatch-summary-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token || initialToken}`
                        },
                        body: JSON.stringify({
                            duration: timerStr,
                            attendees: formattedAttendees,
                            csvContent
                        })
                    }).catch(e => console.error('[dispatchSummaryEmail] error:', e))
                    addToast('Attendance report with CSV file queued for dispatch!', 'success')
                }
                setMeetingInput('')
                socket?.emit('meeting:end-all', { meetingId: meetingId || meetingInput.trim() })
                handleExitMeeting(true)
            }}
            onDownloadAttendance={() => {
                exportAttendanceCSV()
            }}
        />
    )
}
