import React from 'react'
import {
    IconSearch,
    IconEye,
    IconRefresh
} from '../../../../components/common/Icons'

interface IntegrationsDeliveryLogsTableProps {
    filteredLogs: any[]
    logStatusFilter: 'all' | 'success' | 'failed'
    setLogStatusFilter: (val: 'all' | 'success' | 'failed') => void
    logSearchQuery: string
    setLogSearchQuery: (val: string) => void
    onInspectLog: (log: any) => void
    onRetryDelivery: (integrationId: string) => void
}

export const IntegrationsDeliveryLogsTable: React.FC<IntegrationsDeliveryLogsTableProps> = ({
    filteredLogs,
    logStatusFilter,
    setLogStatusFilter,
    logSearchQuery,
    setLogSearchQuery,
    onInspectLog,
    onRetryDelivery
}) => {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 18,
            padding: 24
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Recent Webhook Dispatches ({filteredLogs.length})
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        Audit trail of outbound webhook requests, response codes, and roundtrip delivery latency.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Status Filter */}
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, padding: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <button
                            onClick={() => setLogStatusFilter('all')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: logStatusFilter === 'all' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                color: logStatusFilter === 'all' ? '#fff' : '#94a3b8',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setLogStatusFilter('success')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: logStatusFilter === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'transparent',
                                color: logStatusFilter === 'success' ? '#4ade80' : '#94a3b8',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Success (2xx)
                        </button>
                        <button
                            onClick={() => setLogStatusFilter('failed')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: logStatusFilter === 'failed' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                                color: logStatusFilter === 'failed' ? '#f87171' : '#94a3b8',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Failed (4xx/5xx)
                        </button>
                    </div>

                    {/* Search Input */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={logSearchQuery}
                            onChange={(e) => setLogSearchQuery(e.target.value)}
                            placeholder="Search by event..."
                            style={{
                                padding: '6px 12px 6px 30px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 8,
                                color: '#fff',
                                fontSize: '0.78rem',
                                outline: 'none',
                                width: 160
                            }}
                        />
                        <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <IconSearch size={13} color="#64748b" />
                        </div>
                    </div>
                </div>
            </div>

            {filteredLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem' }}>No webhook dispatches found matching filters.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                                <th style={{ padding: '10px 12px' }}>Event</th>
                                <th style={{ padding: '10px 12px' }}>Endpoint Destination</th>
                                <th style={{ padding: '10px 12px' }}>Time</th>
                                <th style={{ padding: '10px 12px' }}>HTTP Status</th>
                                <th style={{ padding: '10px 12px' }}>Latency</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.slice(0, 15).map((log, idx) => (
                                <tr
                                    key={idx}
                                    style={{
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                        background: 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: 5,
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            color: '#a5b4fc',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}>
                                            {log.eventType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', color: '#cbd5e1' }}>
                                        <div style={{ fontWeight: 600 }}>{log.integrationName}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.targetUrl}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: 4,
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: log.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: log.success ? '#4ade80' : '#f87171'
                                        }}>
                                            HTTP {log.statusCode}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', color: '#94a3b8' }}>
                                        {log.durationMs}ms
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                            <button
                                                onClick={() => onInspectLog(log)}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                                    borderRadius: 6,
                                                    color: '#cbd5e1',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                <IconEye size={12} />
                                                <span>Inspect</span>
                                            </button>

                                            <button
                                                onClick={() => onRetryDelivery(log.integrationId)}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(99, 102, 241, 0.12)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    borderRadius: 6,
                                                    color: '#a5b4fc',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                                title="Retry delivery immediately"
                                            >
                                                <IconRefresh size={11} />
                                                <span>Retry</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
