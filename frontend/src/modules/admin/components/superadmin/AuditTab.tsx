import React from 'react'
import {
    IconLock,
    IconRefresh
} from '../../../../components/common/Icons'
import { AuditLogItem } from '../../superAdmin.types'

interface AuditTabProps {
    auditLogs: AuditLogItem[]
    auditLoading: boolean
    auditTotal: number
    auditFilter: string
    setAuditFilter: (val: string) => void
    setAuditPage: React.Dispatch<React.SetStateAction<number>>
    handleExportAuditLogs: (format: 'csv' | 'json') => void
    exportingAudit: boolean
    fetchAuditLogs: () => void
}

export const AuditTab: React.FC<AuditTabProps> = ({
    auditLogs,
    auditLoading,
    auditTotal,
    auditFilter,
    setAuditFilter,
    setAuditPage,
    handleExportAuditLogs,
    exportingAudit,
    fetchAuditLogs
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter & Action Bar */}
            <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconLock size={18} color="#a78bfa" />
                        <span>Platform Security Audit & Compliance Trail ({auditTotal} events)</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                        Immutable chronological log of administrative interventions, status changes, quota updates, and terminations.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <select
                        value={auditFilter}
                        onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(1) }}
                        className="input"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--color-surface-2)', color: '#fff' }}
                    >
                        <option value="all">All Action Categories</option>
                        <option value="TENANT_STATUS_CHANGE">Tenant Status Changes</option>
                        <option value="TENANT_QUOTA_UPDATE">Tenant Quota Updates</option>
                        <option value="TENANT_IMPERSONATION">Support Impersonations</option>
                        <option value="MEETING_TERMINATED">Meeting Terminations</option>
                        <option value="PLATFORM_BROADCAST">Global Broadcasts</option>
                        <option value="PLATFORM_POLICY_UPDATE">Meeting Policies Updates</option>
                        <option value="STORAGE_PURGE">Storage Purges</option>
                        <option value="SMTP_TEST">SMTP Gateway Tests</option>
                        <option value="COMPLIANCE_EXPORT">Compliance Exports</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => handleExportAuditLogs('csv')}
                        disabled={exportingAudit}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        title="Export immutable audit trail for GDPR / HIPAA compliance in CSV format"
                    >
                        <span>{exportingAudit ? 'Exporting...' : '📥 Export Trail (CSV)'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExportAuditLogs('json')}
                        disabled={exportingAudit}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        title="Export full audit records in JSON format"
                    >
                        <span>📄 Export (JSON)</span>
                    </button>

                    <button
                        type="button"
                        onClick={fetchAuditLogs}
                        disabled={auditLoading}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                        <IconRefresh size={13} />
                        <span>{auditLoading ? 'Loading...' : 'Refresh Logs'}</span>
                    </button>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="glass-card" style={{ padding: 0, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px 18px' }}>Timestamp</th>
                                <th style={{ padding: '12px 18px' }}>Admin Operator</th>
                                <th style={{ padding: '12px 18px' }}>Action Type</th>
                                <th style={{ padding: '12px 18px' }}>Event Details</th>
                                <th style={{ padding: '12px 18px' }}>IP / Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLoading && auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        Loading platform compliance trail...
                                    </td>
                                </tr>
                            ) : auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No audit events recorded for the selected filter.
                                    </td>
                                </tr>
                            ) : (
                                auditLogs.map((log: any) => {
                                    const isTerminated = log.action === 'MEETING_TERMINATED'
                                    const isQuota = log.action === 'TENANT_QUOTA_UPDATE'
                                    const isBroadcast = log.action === 'PLATFORM_BROADCAST'
                                    const isStatus = log.action === 'TENANT_STATUS_CHANGE'

                                    return (
                                        <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '12px 18px', whiteSpace: 'nowrap', color: '#a1a1aa' }}>
                                                {new Date(log.createdAt).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td style={{ padding: '12px 18px' }}>
                                                <div style={{ fontWeight: 600, color: '#fff' }}>
                                                    {log.userId?.fullName || 'Super Administrator'}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                    {log.userId?.email || 'System'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 18px' }}>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '3px 8px',
                                                    borderRadius: 4,
                                                    background: isTerminated
                                                        ? 'rgba(239, 68, 68, 0.15)'
                                                        : isQuota
                                                            ? 'rgba(59, 130, 246, 0.15)'
                                                            : isBroadcast
                                                                ? 'rgba(245, 158, 11, 0.15)'
                                                                : isStatus
                                                                    ? 'rgba(168, 85, 247, 0.15)'
                                                                    : 'rgba(255, 255, 255, 0.08)',
                                                    color: isTerminated
                                                        ? '#f87171'
                                                        : isQuota
                                                            ? '#60a5fa'
                                                            : isBroadcast
                                                                ? '#fbbf24'
                                                                : isStatus
                                                                    ? '#c084fc'
                                                                    : '#e4e4e7',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 18px', color: '#e4e4e7' }}>
                                                {log.details}
                                            </td>
                                            <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a1a1aa' }}>
                                                {log.ipAddress || '127.0.0.1'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
