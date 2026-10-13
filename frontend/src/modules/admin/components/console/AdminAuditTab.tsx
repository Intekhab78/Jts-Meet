import React from 'react'
import type { AuditLog, AttendanceRecord } from '../../adminConsole.types'
import {
    IconHistory,
    IconUsers,
    IconDownload,
    IconCheck
} from '../../../../components/common/Icons'

interface AdminAuditTabProps {
    auditSubTab: 'logs' | 'attendance'
    setAuditSubTab: (tab: 'logs' | 'attendance') => void
    auditSearch: string
    setAuditSearch: (s: string) => void
    auditActionFilter: string
    setAuditActionFilter: (f: string) => void
    auditLoading: boolean
    auditLogs: AuditLog[]
    attendanceLoading: boolean
    attendanceList: AttendanceRecord[]
    onExportAttendanceCsv: () => void
}

export function AdminAuditTab({
    auditSubTab,
    setAuditSubTab,
    auditSearch,
    setAuditSearch,
    auditActionFilter,
    setAuditActionFilter,
    auditLoading,
    auditLogs,
    attendanceLoading,
    attendanceList,
    onExportAttendanceCsv
}: AdminAuditTabProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sub Tab Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, background: 'rgba(255, 255, 255, 0.04)', padding: 4, borderRadius: 8 }}>
                    <button
                        type="button"
                        onClick={() => setAuditSubTab('logs')}
                        style={{
                            background: auditSubTab === 'logs' ? '#6366f1' : 'transparent',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconHistory size={13} color="#fff" />
                        <span>Activity Audit Trail</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAuditSubTab('attendance')}
                        style={{
                            background: auditSubTab === 'attendance' ? '#6366f1' : 'transparent',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconUsers size={13} color="#fff" />
                        <span>Meeting Attendance Records</span>
                    </button>
                </div>

                {auditSubTab === 'attendance' && (
                    <button
                        type="button"
                        onClick={onExportAttendanceCsv}
                        style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#4ade80',
                            padding: '6px 14px',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconDownload size={13} color="#4ade80" />
                        <span>Export Compliance CSV</span>
                    </button>
                )}
            </div>

            {/* SUBTAB 1: LOGS */}
            {auditSubTab === 'logs' && (
                <>
                    {/* Filter Bar */}
                    <div className="glass-card" style={{ padding: '10px 14px', borderRadius: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                            <input
                                type="text"
                                value={auditSearch}
                                onChange={(e) => setAuditSearch(e.target.value)}
                                placeholder="Search audit details or IP address..."
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 6,
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#fff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <select
                            value={auditActionFilter}
                            onChange={(e) => setAuditActionFilter(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 6,
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                color: '#c4b5fd',
                                outline: 'none'
                            }}
                        >
                            <option value="ALL" style={{ background: '#111827' }}>All Audit Actions</option>
                            <option value="ROLE_CHANGE" style={{ background: '#111827' }}>Role Changes</option>
                            <option value="STATUS_CHANGE" style={{ background: '#111827' }}>Status Changes</option>
                            <option value="PASSWORD_RESET" style={{ background: '#111827' }}>Password Resets</option>
                            <option value="USER_INVITE" style={{ background: '#111827' }}>User Invites</option>
                            <option value="STORAGE_POLICY_CHANGE" style={{ background: '#111827' }}>Storage Policy</option>
                            <option value="RECORDING_DELETE" style={{ background: '#111827' }}>Recordings Purged</option>
                        </select>
                    </div>

                    {/* Logs Table */}
                    <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Timestamp</th>
                                        <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Actor / User</th>
                                        <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Event Action</th>
                                        <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>IP & Region</th>
                                        <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Audit Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLoading ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                Loading audit trail...
                                            </td>
                                        </tr>
                                    ) : auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No audit logs recorded for this criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => {
                                            const actor = log.userId || {}
                                            return (
                                                <tr key={log._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                    <td style={{ padding: '10px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>
                                                        {actor.fullName || 'System Admin'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            color: '#a5b4fc',
                                                            padding: '2px 6px',
                                                            borderRadius: 4
                                                        }}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#60a5fa', fontFamily: 'monospace' }}>
                                                        {log.ipAddress || '127.0.0.1 (DXB)'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>
                                                        {log.details}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* SUBTAB 2: ATTENDANCE RECORDS */}
            {auditSubTab === 'attendance' && (
                <div className="glass-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Meeting ID</th>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Conference Topic</th>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Host</th>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Date</th>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Duration</th>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>Attendees</th>
                                    <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Compliance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceLoading ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            Loading attendance records...
                                        </td>
                                    </tr>
                                ) : attendanceList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            No meeting attendance records found.
                                        </td>
                                    </tr>
                                ) : (
                                    attendanceList.map((rec) => (
                                        <tr key={rec.meetingId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#c4b5fd' }}>
                                                {rec.meetingId}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>
                                                {rec.title}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#d1d5db' }}>
                                                {rec.hostName}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                                {new Date(rec.date).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#4ade80' }}>
                                                {rec.duration}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    color: '#a5b4fc',
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}>
                                                    <IconUsers size={12} color="#a5b4fc" />
                                                    <span>{rec.totalAttendees} participants</span>
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                <span style={{
                                                    color: '#4ade80',
                                                    fontSize: '0.72rem',
                                                    background: 'rgba(34, 197, 94, 0.12)',
                                                    padding: '2px 8px',
                                                    borderRadius: 10,
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <IconCheck size={11} color="#4ade80" />
                                                    <span>Verified</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
