/**
 * Meeting export and documentation utilities:
 * - Attendance CSV Exporter
 * - iCalendar (.ics) Downloader
 * - AI Minutes of Meeting (MoM) Content Generator
 */

export interface AttendanceRecordItem {
    name: string
    userId: string
    role: string
    status: string
    joinTime: string
    leaveTime?: string
    durationSeconds: number
}

export function exportAttendanceCSV({
    records,
    joinTimeMap,
    meetingId,
    addToast
}: {
    records: AttendanceRecordItem[]
    joinTimeMap: Record<string, number>
    meetingId: string
    addToast: (msg: string, type?: any) => void
}) {
    if (records.length === 0) {
        addToast('No attendance records logged yet for this session.', 'info')
        return
    }

    const now = Date.now()
    const rows = records.map(r => {
        const durationSec = r.status === 'Active' && joinTimeMap[r.userId]
            ? Math.round((now - joinTimeMap[r.userId]) / 1000)
            : r.durationSeconds
        const minutes = Math.floor(durationSec / 60)
        const seconds = durationSec % 60
        const durationFormatted = `${minutes}m ${seconds}s`

        return [
            `"${r.name.replace(/"/g, '""')}"`,
            `"${r.userId}"`,
            `"${r.role}"`,
            `"${r.status}"`,
            `"${r.joinTime}"`,
            `"${r.leaveTime || 'Still In Meeting'}"`,
            `"${durationFormatted}"`
        ].join(',')
    })

    const header = ['Participant Name', 'User ID', 'Role', 'Status', 'Join Time', 'Leave Time', 'Duration'].join(',')
    const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `jts-attendance-${meetingId || 'report'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    addToast('Attendance audit CSV exported successfully!', 'success')
}

export function downloadICSFile({
    meetingId,
    meetingTitle,
    addToast
}: {
    meetingId: string
    meetingTitle?: string
    addToast: (msg: string, type?: any) => void
}) {
    const currentMeetingId = meetingId || 'session'
    const meetLink = `${window.location.origin}/join/${currentMeetingId}`
    const now = new Date()
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const start = formatDate(now)
    const end = formatDate(new Date(now.getTime() + 60 * 60 * 1000))
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JTS Meet//Meeting Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${currentMeetingId}-${Date.now()}@jts-meet.com`,
        `DTSTAMP:${start}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:JTS-Meet: ${meetingTitle || 'Team Video Meeting'}`,
        `DESCRIPTION:Join your JTS-Meet session at: ${meetLink}\\nMeeting ID: ${currentMeetingId}`,
        `LOCATION:${meetLink}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `jts-meeting-${currentMeetingId}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    addToast('iCalendar (.ics) downloaded!', 'success')
}

export function generateMoMContent({
    meetingInfo,
    meetingId,
    myDisplayName,
    attendanceRecords,
    participants,
    getUserDisplayName,
    messages,
    timerStr
}: {
    meetingInfo: any
    meetingId: string
    myDisplayName: string
    attendanceRecords: Record<string, AttendanceRecordItem>
    participants: string[]
    getUserDisplayName: (userId: string) => string
    messages: any[]
    timerStr: string
}) {
    const title = meetingInfo?.title || 'JTS-Meet Session'
    const currentMeetingId = meetingInfo?.customId || meetingInfo?.id || meetingId || 'meeting'
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = new Date().toLocaleTimeString()
    const hostName = (meetingInfo?.host && typeof meetingInfo.host === 'object' ? meetingInfo.host.fullName || meetingInfo.host.name || meetingInfo.host.email : null) || 'Host'

    const attendeeList = Object.values(attendanceRecords).length > 0
        ? Object.values(attendanceRecords).map(a => `- **${a.name}** (${a.role}) — Joined: ${a.joinTime}${a.leaveTime ? `, Left: ${a.leaveTime}` : ' (Active)'}`).join('\n')
        : (participants.length > 0
            ? [`- **${myDisplayName}** (Host / You)`].concat(participants.map(p => `- **${getUserDisplayName(p)}** (Participant)`)).join('\n')
            : `- **${myDisplayName}** (Host / Active)`)

    const chatNotes = messages.map(m => `> **${m.senderName || 'Participant'}:** ${m.message}`).slice(-12).join('\n')

    return `# Minutes of Meeting (MoM)
**Meeting Title:** ${title}
**Meeting ID:** ${currentMeetingId}
**Date:** ${dateStr} at ${timeStr}
**Total Duration:** ${timerStr}
**Host:** ${hostName}

---

## Attendees (${Object.keys(attendanceRecords).length || participants.length + 1})
${attendeeList}

---

## Executive Summary
- The team convened for **${title}** via JTS-Meet secure enterprise video conference.
- Key operational updates, architectural milestones, and active decisions were aligned.
- Discussion notes and structured action items were recorded for team accountability.

---

## Discussion Highlights & Chat Notes
${chatNotes || '_No public chat notes recorded during this session._'}

---

## Action Items & Task Ownership
| # | Action Item / Deliverable | Owner | Priority | Status |
|---|---|---|---|---|
| 1 | Review meeting summary and distribute action items | ${myDisplayName} | High | In Progress |
| 2 | Finalize technical deliverables discussed in call | Core Team | Urgent | Pending |
| 3 | Follow-up review and progress validation | Stakeholders | Medium | Scheduled |
| 4 | Security and permission policy sign-off | Platform Admin | Normal | Completed |

---
*Auto-generated with JTS-Meet AI Assistant on ${dateStr} at ${timeStr}*
`
}
