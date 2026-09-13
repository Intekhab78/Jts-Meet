import React, { useState, useEffect } from 'react'
import { API_BASE } from '../../../config'

interface IntegrationsTabProps {
    token: string
    currentOrgId?: string
}

export function IntegrationsTab({ token, currentOrgId }: IntegrationsTabProps) {
    const [integrations, setIntegrations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false)
    const [modalType, setModalType] = useState<'slack' | 'discord' | 'webhook' | 'googledrive'>('slack')
    const [formName, setFormName] = useState('')
    const [formUrl, setFormUrl] = useState('')
    const [formSecret, setFormSecret] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>([
        'meeting.started',
        'meeting.ended',
        'recording.ready'
    ])
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<any>(null)

    const fetchIntegrations = async () => {
        setLoading(true)
        setError('')
        try {
            const url = currentOrgId 
                ? `${API_BASE}/api/integrations?orgId=${currentOrgId}`
                : `${API_BASE}/api/integrations`
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const json = await res.json()
            if (json.success) {
                setIntegrations(json.data || [])
            } else {
                setError(json.message || 'Failed to load integrations')
            }
        } catch (err: any) {
            setError('Could not connect to integrations service')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIntegrations()
    }, [currentOrgId, token])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formName || !formUrl) {
            alert('Name and Webhook URL are required')
            return
        }

        try {
            const res = await fetch(`${API_BASE}/api/integrations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    organizationId: currentOrgId,
                    name: formName,
                    type: modalType,
                    url: formUrl,
                    secret: formSecret,
                    events: selectedEvents
                })
            })
            const json = await res.json()
            if (json.success) {
                setSuccessMsg(`Configured ${formName} successfully!`)
                setTimeout(() => setSuccessMsg(''), 3000)
                setShowAddModal(false)
                setFormName('')
                setFormUrl('')
                setFormSecret('')
                fetchIntegrations()
            } else {
                alert(json.message || 'Failed to create integration')
            }
        } catch (err) {
            alert('Error configuring integration endpoint')
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove ${name}?`)) return
        try {
            const res = await fetch(`${API_BASE}/api/integrations/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const json = await res.json()
            if (json.success) {
                setIntegrations(prev => prev.filter(i => (i._id || i.id) !== id))
                setSuccessMsg('Integration removed')
                setTimeout(() => setSuccessMsg(''), 2500)
            }
        } catch (_) {}
    }

    const handleToggle = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'active' ? 'paused' : 'active'
        try {
            const res = await fetch(`${API_BASE}/api/integrations/${id}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus })
            })
            const json = await res.json()
            if (json.success) {
                fetchIntegrations()
            }
        } catch (_) {}
    }

    const handleTest = async (id: string) => {
        setTestingId(id)
        setTestResult(null)
        try {
            const res = await fetch(`${API_BASE}/api/integrations/${id}/test`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            const json = await res.json()
            if (json.success) {
                setTestResult({ id, ...json.data })
                fetchIntegrations()
            } else {
                setTestResult({ id, success: false, statusCode: 500, responseBody: json.message })
            }
        } catch (err: any) {
            setTestResult({ id, success: false, statusCode: 502, responseBody: 'Network connection error' })
        } finally {
            setTestingId(null)
        }
    }

    const openAddModalForType = (type: 'slack' | 'discord' | 'webhook' | 'googledrive') => {
        setModalType(type)
        if (type === 'slack') {
            setFormName('Slack Team Alerts')
            setFormUrl('https://hooks.slack.com/services/...')
        } else if (type === 'discord') {
            setFormName('Discord Announcements')
            setFormUrl('https://discord.com/api/webhooks/...')
        } else if (type === 'googledrive') {
            setFormName('Google Drive Cloud Sync')
            setFormUrl('https://script.google.com/macros/s/...')
        } else {
            setFormName('Custom Enterprise Webhook')
            setFormUrl('https://api.yourcompany.com/webhooks/jts-meet')
        }
        setShowAddModal(true)
    }

    const allDeliveryLogs = integrations.flatMap(i => 
        (i.deliveryLogs || []).map((log: any) => ({ ...log, integrationName: i.name, integrationType: i.type }))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header & Stats */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 16,
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                        🔌 Enterprise Integrations & Webhooks
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
                        Connect JTS Meet to Slack, Discord, Google Drive, or your internal APIs with real-time webhooks & HMAC signatures.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => openAddModalForType('webhook')}
                        style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            borderRadius: 10,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        <span>➕</span>
                        <span>Add Webhook</span>
                    </button>
                </div>
            </div>

            {successMsg && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#4ade80',
                    fontSize: '0.88rem',
                    fontWeight: 600
                }}>
                    ✓ {successMsg}
                </div>
            )}

            {/* Ready-to-Connect Apps Grid */}
            <div>
                <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0' }}>
                    Available Connectors & Services
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    {/* Slack */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 14,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#4A154B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem'
                            }}>
                                💬
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>Slack Incoming Webhook</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                    Post meeting start alerts and cloud recording links directly to any Slack channel.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openAddModalForType('slack')}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: 8,
                                color: '#a5b4fc',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Connect Slack
                        </button>
                    </div>

                    {/* Discord */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 14,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#5865F2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem'
                            }}>
                                🎮
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>Discord Webhook</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                    Broadcast live conference sessions and rich embeds to Discord servers.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openAddModalForType('discord')}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(88, 101, 242, 0.15)',
                                border: '1px solid rgba(88, 101, 242, 0.3)',
                                borderRadius: 8,
                                color: '#c7d2fe',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Connect Discord
                        </button>
                    </div>

                    {/* Google Drive */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 14,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem'
                            }}>
                                📁
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>Google Drive Sync</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                    Automatically archive recorded conferences and AI transcript summaries to Google Drive.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openAddModalForType('googledrive')}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 8,
                                color: '#6ee7b7',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Connect Drive
                        </button>
                    </div>

                    {/* Custom REST Webhook */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 14,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem'
                            }}>
                                ⚡
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>Custom REST Webhook</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                    Send JSON payloads with HMAC-SHA256 signatures to Zapier, Make, or custom servers.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openAddModalForType('webhook')}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: 8,
                                color: '#fff',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Custom Webhook
                        </button>
                    </div>
                </div>
            </div>

            {/* Configured Endpoints List */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: 20
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Configured Webhook Endpoints ({integrations.length})
                    </h3>
                    <button
                        onClick={fetchIntegrations}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 6,
                            padding: '4px 10px',
                            color: '#94a3b8',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Refresh
                    </button>
                </div>

                {loading && integrations.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '20px 0' }}>Loading integrations...</p>
                ) : integrations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔌</div>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>No webhook endpoints configured yet.</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Connect Slack, Discord, or a custom webhook endpoint above.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {integrations.map((item) => {
                            const itemId = item._id || item.id
                            const isTestingThis = testingId === itemId
                            const thisTestResult = testResult?.id === itemId ? testResult : null

                            return (
                                <div
                                    key={itemId}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: 12,
                                        padding: '16px 18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '1.3rem' }}>
                                                {item.type === 'slack' ? '💬' : item.type === 'discord' ? '🎮' : item.type === 'googledrive' ? '📁' : '⚡'}
                                            </span>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{item.name}</span>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        background: item.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        color: item.status === 'active' ? '#4ade80' : '#f87171'
                                                    }}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2, wordBreak: 'break-all' }}>
                                                    URL: <code style={{ color: '#cbd5e1' }}>{item.url}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                onClick={() => handleTest(itemId)}
                                                disabled={isTestingThis}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    borderRadius: 8,
                                                    color: '#a5b4fc',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    cursor: isTestingThis ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                {isTestingThis ? '⏳ Testing...' : '⚡ Send Test Ping'}
                                            </button>

                                            <button
                                                onClick={() => handleToggle(itemId, item.status)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: 8,
                                                    color: '#cbd5e1',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {item.status === 'active' ? '⏸️ Pause' : '▶️ Resume'}
                                            </button>

                                            <button
                                                onClick={() => handleDelete(itemId, item.name)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    borderRadius: 8,
                                                    color: '#f87171',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {/* Event Badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Events:</span>
                                        {(item.events || []).map((ev: string) => (
                                            <span
                                                key={ev}
                                                style={{
                                                    fontSize: '0.72rem',
                                                    padding: '2px 7px',
                                                    borderRadius: 5,
                                                    background: 'rgba(255, 255, 255, 0.06)',
                                                    color: '#94a3b8'
                                                }}
                                            >
                                                {ev}
                                            </span>
                                        ))}
                                        {item.lastDeliveredAt && (
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 'auto' }}>
                                                Last active: {new Date(item.lastDeliveredAt).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Test Result Bar */}
                                    {thisTestResult && (
                                        <div style={{
                                            marginTop: 4,
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            background: thisTestResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${thisTestResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            fontSize: '0.78rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: thisTestResult.success ? '#4ade80' : '#f87171' }}>
                                                {thisTestResult.success ? '✓ Payload delivered successfully' : '✕ Delivery test failed'} (HTTP {thisTestResult.statusCode} • {thisTestResult.durationMs}ms)
                                            </span>
                                            <button
                                                onClick={() => setTestResult(null)}
                                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Delivery Logs Table */}
            {allDeliveryLogs.length > 0 && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    padding: 20
                }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Recent Webhook Dispatches
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                                    <th style={{ padding: '8px 12px' }}>Event</th>
                                    <th style={{ padding: '8px 12px' }}>Endpoint</th>
                                    <th style={{ padding: '8px 12px' }}>Time</th>
                                    <th style={{ padding: '8px 12px' }}>Status</th>
                                    <th style={{ padding: '8px 12px' }}>Latency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allDeliveryLogs.map((log, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                        <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>{log.eventType}</td>
                                        <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>{log.integrationName}</td>
                                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                background: log.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: log.success ? '#4ade80' : '#f87171'
                                            }}>
                                                HTTP {log.statusCode}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{log.durationMs}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Webhook Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 20,
                        width: '100%',
                        maxWidth: 520,
                        color: '#fff',
                        padding: 24,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                                Configure {modalType === 'slack' ? 'Slack' : modalType === 'discord' ? 'Discord' : modalType === 'googledrive' ? 'Google Drive' : 'Custom Webhook'}
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                    Endpoint Name:
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. #engineering-alerts"
                                    required
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#fff',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                    Webhook URL Endpoint:
                                </label>
                                <input
                                    type="url"
                                    value={formUrl}
                                    onChange={(e) => setFormUrl(e.target.value)}
                                    placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                                    required
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#fff',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>

                            {modalType === 'webhook' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                        HMAC Secret Key (Optional for SHA256 Signature):
                                    </label>
                                    <input
                                        type="text"
                                        value={formSecret}
                                        onChange={(e) => setFormSecret(e.target.value)}
                                        placeholder="Secret for x-jts-signature validation"
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: '#fff',
                                            fontSize: '0.88rem'
                                        }}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                                    Trigger Events:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {[
                                        { id: 'meeting.started', label: '🚀 Meeting Started' },
                                        { id: 'meeting.ended', label: '🏁 Meeting Ended' },
                                        { id: 'recording.ready', label: '📹 Recording Ready' },
                                        { id: 'participant.joined', label: '👤 Participant Joined' }
                                    ].map(item => {
                                        const isChecked = selectedEvents.includes(item.id)
                                        return (
                                            <label
                                                key={item.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    fontSize: '0.82rem',
                                                    color: '#cbd5e1',
                                                    cursor: 'pointer',
                                                    padding: '6px 8px',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: 6
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedEvents([...selectedEvents, item.id])
                                                        } else {
                                                            setSelectedEvents(selectedEvents.filter(x => x !== item.id))
                                                        }
                                                    }}
                                                    style={{ accentColor: '#6366f1' }}
                                                />
                                                <span>{item.label}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 10,
                                        color: '#cbd5e1',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 2,
                                        padding: '12px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        borderRadius: 10,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                                    }}
                                >
                                    Save & Activate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
