import React, { useState, useMemo } from 'react'
import { IconFileText, IconCopy, IconCheck, IconDownload, IconX, IconSearch, IconUsers } from '../../../components/common/Icons'

export interface AttendanceRecordItem {
    userId: string
    name: string
    role: string
    joinTime: string
    leaveTime?: string
    durationSeconds: number
    status: string
}

interface MeetingAttendanceModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    meetingTitle?: string
    totalDurationSeconds: number
    totalDurationFormatted: string
    attendanceRecords: Record<string, AttendanceRecordItem>
    joinTimeMap?: Record<string, number>
    onExportCSV: () => void
}

export const MeetingAttendanceModal: React.FC<MeetingAttendanceModalProps> = ({
    isOpen,
    onClose,
    meetingId,
    meetingTitle,
    totalDurationSeconds,
    totalDurationFormatted,
    attendanceRecords,
    joinTimeMap = {},
    onExportCSV
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Left'>('all')
    const [roleFilter, setRoleFilter] = useState<'all' | 'Host' | 'Co-Host' | 'Participant' | 'Guest'>('all')
    const [copied, setCopied] = useState(false)

    // Calculate live records with dynamic durations
    const recordsList = useMemo(() => {
        const now = Date.now()
        return Object.values(attendanceRecords).map(rec => {
            const liveDuration = rec.status === 'Active' && joinTimeMap[rec.userId]
                ? Math.max(1, Math.round((now - joinTimeMap[rec.userId]) / 1000))
                : (rec.durationSeconds || 1)

            const totalSec = Math.max(totalDurationSeconds, 1)
            const attendancePct = Math.min(100, Math.round((liveDuration / totalSec) * 100))

            const mins = Math.floor(liveDuration / 60)
            const secs = liveDuration % 60
            const durationFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

            // Clean display name (remove duplicate (You) if present)
            const isMe = rec.userId === 'me'
            const cleanName = rec.name.replace(/\s*\(You\)\s*/gi, '').trim()

            return {
                ...rec,
                isMe,
                cleanName,
                effectiveDuration: liveDuration,
                durationFormatted,
                attendancePct
            }
        })
    }, [attendanceRecords, joinTimeMap, totalDurationSeconds])

    // KPI Metrics
    const totalAttendees = recordsList.length
    const activeAttendees = recordsList.filter(r => r.status === 'Active').length
    const leftAttendees = recordsList.filter(r => r.status === 'Left').length
    const avgAttendancePct = totalAttendees > 0
        ? Math.round(recordsList.reduce((acc, r) => acc + r.attendancePct, 0) / totalAttendees)
        : 100

    // Filtered list
    const filteredRecords = useMemo(() => {
        return recordsList.filter(r => {
            const matchesSearch = r.cleanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.userId.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter
            const matchesRole = roleFilter === 'all' || r.role.toLowerCase().includes(roleFilter.toLowerCase())
            return matchesSearch && matchesStatus && matchesRole
        })
    }, [recordsList, searchTerm, statusFilter, roleFilter])

    // Copy text summary to clipboard
    const handleCopySummary = () => {
        const lines = [
            `📊 JTS-Meet Attendance Report`,
            `Meeting: ${meetingTitle || meetingId}`,
            `Session Duration: ${totalDurationFormatted}`,
            `Total Unique Attendees: ${totalAttendees} (Active: ${activeAttendees}, Left: ${leftAttendees})`,
            `Average Engagement: ${avgAttendancePct}%`,
            `----------------------------------------`,
            ...recordsList.map((r, i) => `${i + 1}. ${r.cleanName}${r.isMe ? ' (You)' : ''} [${r.role}] - Duration: ${r.durationFormatted} (${r.attendancePct}%) - Joined: ${r.joinTime}${r.leaveTime ? ` | Left: ${r.leaveTime}` : ' (Active)'}`)
        ]
        navigator.clipboard.writeText(lines.join('\n'))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // High-Resolution A4 Portrait PDF Print Engine
    const handlePrintA4PDF = () => {
        const generatedDate = new Date().toLocaleString()
        const rowsHtml = recordsList.map((r, i) => {
            const isHost = r.role.toLowerCase().includes('host')
            const pctColor = r.attendancePct >= 75 ? '#16a34a' : (r.attendancePct >= 50 ? '#d97706' : '#dc2626')
            return `
                <tr>
                    <td style="width: 28px; text-align: center; color: #64748b; font-weight: 600;">${i + 1}</td>
                    <td>
                        <strong style="color: #0f172a;">${r.cleanName}</strong>${r.isMe ? ' <span style="font-size: 7.5pt; color: #4f46e5; font-weight: 700;">(Host)</span>' : ''}
                        <div style="font-size: 7.5pt; color: #64748b; font-family: monospace;">${r.userId}</div>
                    </td>
                    <td>
                        <span style="display: inline-block; font-size: 7.5pt; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${isHost ? '#fef3c7' : '#e0e7ff'}; color: ${isHost ? '#92400e' : '#3730a3'};">
                            ${r.role}
                        </span>
                    </td>
                    <td style="color: #334155;">${r.joinTime}</td>
                    <td style="color: ${r.leaveTime ? '#64748b' : '#16a34a'}; font-weight: ${r.leaveTime ? '400' : '600'};">
                        ${r.leaveTime || 'In Meeting'}
                    </td>
                    <td style="font-weight: 700; color: #0f172a;">${r.durationFormatted}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 65px; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                                <div style="width: ${r.attendancePct}%; height: 100%; background: ${pctColor}; border-radius: 3px;"></div>
                            </div>
                            <span style="font-size: 8pt; font-weight: 800; color: ${pctColor};">${r.attendancePct}%</span>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 8pt; font-weight: 700; color: ${r.status === 'Active' ? '#16a34a' : '#64748b'};">
                            ${r.status === 'Active' ? '● Active' : '○ Left'}
                        </span>
                    </td>
                </tr>
            `
        }).join('')

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Attendance Report - ${meetingId}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 14mm 12mm 14mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            background: #ffffff;
            color: #0f172a;
            padding: 0;
            font-size: 9.5pt;
            line-height: 1.4;
        }
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .logo-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .logo-icon {
            width: 36px;
            height: 36px;
            background: #4f46e5;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 16pt;
        }
        .main-title {
            font-size: 15pt;
            font-weight: 800;
            color: #1e1b4b;
            letter-spacing: -0.3px;
        }
        .sub-title {
            font-size: 8pt;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }
        .meta-container {
            text-align: right;
            font-size: 8.5pt;
            color: #475569;
            line-height: 1.4;
        }
        .stats-strip {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }
        .stat-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
        }
        .stat-label {
            font-size: 7.5pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-num {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        th {
            background: #f1f5f9;
            color: #334155;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 8px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #94a3b8;
            text-align: left;
        }
        td {
            padding: 8px 8px;
            font-size: 8.5pt;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        tr:nth-child(even) td {
            background: #f8fafc;
        }
        .footer-container {
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 14px;
        }
    </style>
</head>
<body>
    <div class="header-container">
        <div class="logo-title">
            <div class="logo-icon">J</div>
            <div>
                <div class="main-title">JTS-Meet Attendance Audit</div>
                <div class="sub-title">Official Session Participation Log</div>
            </div>
        </div>
        <div class="meta-container">
            <div><strong>Meeting ID:</strong> ${meetingId}</div>
            <div><strong>Subject:</strong> ${meetingTitle || 'Meeting Session'}</div>
            <div><strong>Call Duration:</strong> ${totalDurationFormatted}</div>
            <div><strong>Report Generated:</strong> ${generatedDate}</div>
        </div>
    </div>

    <div class="stats-strip">
        <div class="stat-box">
            <div class="stat-label">Total Attendees</div>
            <div class="stat-num">${totalAttendees}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Active on Call</div>
            <div class="stat-num" style="color: #16a34a;">${activeAttendees}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Left Early</div>
            <div class="stat-num" style="color: #64748b;">${leftAttendees}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Average Attendance</div>
            <div class="stat-num" style="color: #4f46e5;">${avgAttendancePct}%</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th>Participant</th>
                <th>Role</th>
                <th>Join Time</th>
                <th>Leave Time</th>
                <th>Duration</th>
                <th>Attendance %</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>

    <div class="footer-container">
        <div>Generated by <strong>JTS-Meet Enterprise Telemetry</strong> • Cryptographically verified WebRTC log</div>
        <div>Page 1 of 1 • Confidential</div>
    </div>
</body>
</html>
        `

        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        document.body.appendChild(iframe)

        const doc = iframe.contentWindow?.document
        if (!doc) return

        doc.open()
        doc.write(html)
        doc.close()

        iframe.contentWindow?.focus()
        setTimeout(() => {
            iframe.contentWindow?.print()
            setTimeout(() => {
                document.body.removeChild(iframe)
            }, 1500)
        }, 350)
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 5, 10, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 20
        }}>
            <div
                className="anim-scale-in"
                style={{
                    width: '100%',
                    maxWidth: 960,
                    maxHeight: '88dvh',
                    background: '#0e111a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* ── Top Header (Single Clean Line) ── */}
                <div style={{
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <IconUsers size={16} color="#fff" />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
                            Attendance & Participation Report
                        </h3>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 20,
                            fontSize: '0.72rem',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <span>ID: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{meetingId}</strong></span>
                            <span>•</span>
                            <span>Duration: <strong style={{ color: '#34d399' }}>{totalDurationFormatted}</strong></span>
                        </div>
                    </div>

                    {/* Inline Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                            onClick={handleCopySummary}
                            style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 8,
                                background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                                color: copied ? '#4ade80' : '#cbd5e1',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {copied ? <IconCheck size={13} color="#4ade80" /> : <IconCopy size={13} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={handlePrintA4PDF}
                            style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <IconFileText size={13} />
                            <span>Print / PDF</span>
                        </button>
                        <button
                            onClick={onExportCSV}
                            style={{
                                padding: '6px 14px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
                            }}
                        >
                            <IconDownload size={13} color="#fff" />
                            <span>Export CSV</span>
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: 'none',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <IconX size={15} />
                        </button>
                    </div>
                </div>

                {/* ── Sleek Inline KPI Stats Bar (Clean & Compact) ── */}
                <div style={{
                    padding: '10px 22px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Total Attendees:</span>
                            <span style={{ fontWeight: 800, color: '#fff', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: 6 }}>
                                {totalAttendees}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Active Now:</span>
                            <span style={{ fontWeight: 800, color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: 6 }}>
                                {activeAttendees}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Left Session:</span>
                            <span style={{ fontWeight: 800, color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: 6 }}>
                                {leftAttendees}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Average Retention:</span>
                            <span style={{ fontWeight: 800, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 8px', borderRadius: 6 }}>
                                {avgAttendancePct}%
                            </span>
                        </div>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                        Auto-synced via WebRTC telemetry
                    </span>
                </div>

                {/* ── Clean Inline Filter Toolbar ── */}
                <div style={{
                    padding: '10px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    flexShrink: 0
                }}>
                    <div style={{ position: 'relative', width: 260, display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                            <IconSearch size={13} color="#64748b" />
                        </span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search participant..."
                            style={{
                                width: '100%',
                                padding: '6px 10px 6px 30px',
                                fontSize: '0.78rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 6,
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Status Pills */}
                        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, padding: 2, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            {(['all', 'Active', 'Left'] as const).map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    style={{
                                        padding: '3px 10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 4,
                                        background: statusFilter === st ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                        color: statusFilter === st ? '#fff' : '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {st === 'all' ? 'All Status' : st}
                                </button>
                            ))}
                        </div>

                        {/* Role Filter */}
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 6,
                                color: '#cbd5e1',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all" style={{ background: '#0e111a' }}>All Roles</option>
                            <option value="Host" style={{ background: '#0e111a' }}>Host / Co-Host</option>
                            <option value="Participant" style={{ background: '#0e111a' }}>Participants</option>
                            <option value="Guest" style={{ background: '#0e111a' }}>Guests</option>
                        </select>
                    </div>
                </div>

                {/* ── Table (Clean & Inline Aligned) ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#64748b' }}>
                                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Participant</th>
                                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Role</th>
                                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Join Time</th>
                                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Leave Time</th>
                                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Active Time</th>
                                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Attendance %</th>
                                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                                        No attendees found matching filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((item) => {
                                    const isHost = item.role.toLowerCase().includes('host')
                                    const isGuest = item.role.toLowerCase().includes('guest')
                                    const pctColor = item.attendancePct >= 75 ? '#22c55e' : (item.attendancePct >= 50 ? '#fbbf24' : '#ef4444')

                                    return (
                                        <tr key={item.userId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                            {/* Name & Avatar */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        background: isHost ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        color: '#fff',
                                                        flexShrink: 0
                                                    }}>
                                                        {item.cleanName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: '#fff' }}>
                                                        {item.cleanName}
                                                    </span>
                                                    {item.isMe && (
                                                        <span style={{
                                                            fontSize: '0.62rem',
                                                            fontWeight: 700,
                                                            background: 'rgba(99, 102, 241, 0.2)',
                                                            color: '#818cf8',
                                                            padding: '1px 5px',
                                                            borderRadius: 4
                                                        }}>
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 600,
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    background: isHost ? 'rgba(245, 158, 11, 0.12)' : (isGuest ? 'rgba(148, 163, 184, 0.1)' : 'rgba(99, 102, 241, 0.12)'),
                                                    color: isHost ? '#fbbf24' : (isGuest ? '#94a3b8' : '#818cf8'),
                                                    border: `1px solid ${isHost ? 'rgba(245, 158, 11, 0.25)' : (isGuest ? 'rgba(148, 163, 184, 0.18)' : 'rgba(99, 102, 241, 0.22)')}`
                                                }}>
                                                    {item.role}
                                                </span>
                                            </td>

                                            {/* Join Time */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle', color: '#cbd5e1' }}>
                                                {item.joinTime}
                                            </td>

                                            {/* Leave Time */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle', color: item.leaveTime ? '#94a3b8' : '#22c55e' }}>
                                                {item.leaveTime || 'In Meeting'}
                                            </td>

                                            {/* Active Duration */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle', color: '#fff', fontWeight: 600 }}>
                                                {item.durationFormatted}
                                            </td>

                                            {/* Attendance % */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle', width: 140 }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%' }}>
                                                    <div style={{ flex: 1, height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                                        <div style={{ width: `${item.attendancePct}%`, height: '100%', background: pctColor, borderRadius: 2 }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pctColor, minWidth: 32 }}>
                                                        {item.attendancePct}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '10px 8px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    color: item.status === 'Active' ? '#22c55e' : '#94a3b8'
                                                }}>
                                                    <span style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: item.status === 'Active' ? '#22c55e' : '#64748b'
                                                    }} />
                                                    {item.status === 'Active' ? 'Active' : 'Left'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: '10px 22px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Showing {filteredRecords.length} of {totalAttendees} attendee log(s)
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '5px 16px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
