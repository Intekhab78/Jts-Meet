import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../../../config'
import {
    SupportedConnector,
    IntegrationsTabProps,
    SAMPLE_PAYLOADS
} from '../integrations.types'
import { IntegrationsConnectorsCatalog } from './integrations/IntegrationsConnectorsCatalog'
import { IntegrationsSimulator } from './integrations/IntegrationsSimulator'
import { IntegrationsEndpointsList } from './integrations/IntegrationsEndpointsList'
import { IntegrationsDeliveryLogsTable } from './integrations/IntegrationsDeliveryLogsTable'
import { IntegrationsInspectModal } from './integrations/IntegrationsInspectModal'
import { IntegrationsHmacModal } from './integrations/IntegrationsHmacModal'
import { IntegrationsAddModal } from './integrations/IntegrationsAddModal'
import {
    IconPlus,
    IconCheck,
    IconShieldCheck,
    IconLock,
    IconSparkles
} from '../../../components/common/Icons'

export function IntegrationsTab({ token, currentOrgId, planTier }: IntegrationsTabProps) {
    const [integrations, setIntegrations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [_error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Plan & Quota Tracking
    const resolvedTier = (planTier || 'enterprise').toLowerCase()
    const maxAllowedQuota = resolvedTier === 'enterprise' ? 999999 : resolvedTier === 'starter' ? 10 : 2
    const maxAllowedLabel = resolvedTier === 'enterprise' ? 'Unlimited' : `${maxAllowedQuota} Endpoints`
    const isAtQuota = integrations.length >= maxAllowedQuota

    // Add Modal State
    const [showAddModal, setShowAddModal] = useState(false)
    const [modalType, setModalType] = useState<SupportedConnector>('slack')
    const [formName, setFormName] = useState('')
    const [formUrl, setFormUrl] = useState('')
    const [formSecret, setFormSecret] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>([
        'meeting.started',
        'meeting.ended',
        'recording.ready'
    ])

    // Simulator State
    const [showSimulator, setShowSimulator] = useState(false)
    const [simEventType, setSimEventType] = useState('meeting.started')
    const [simTargetId, setSimTargetId] = useState<string>('')
    const [simulating, setSimulating] = useState(false)
    const [simResult, setSimResult] = useState<any>(null)

    // HMAC Security Guide Modal
    const [showHmacModal, setShowHmacModal] = useState(false)

    // Inspect Log Modal State
    const [inspectedLog, setInspectedLog] = useState<any | null>(null)

    // Delivery Logs Filter & Search
    const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
    const [logSearchQuery, setLogSearchQuery] = useState('')

    // Secret Visibility Map & Copy feedback
    const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})
    const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null)

    // Inline Testing State
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

    // Set first integration as default simulation target once loaded
    useEffect(() => {
        if (integrations.length > 0 && !simTargetId) {
            setSimTargetId(integrations[0]._id || integrations[0].id)
        }
    }, [integrations, simTargetId])

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
                setTimeout(() => setSuccessMsg(''), 3500)
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
                setTestResult({ id, success: false, statusCode: 500, responseBody: json.message || 'Test failed' })
            }
        } catch (err: any) {
            setTestResult({ id, success: false, statusCode: 502, responseBody: 'Network connection error' })
        } finally {
            setTestingId(null)
        }
    }

    const handleRunSimulation = async () => {
        if (!simTargetId) {
            alert('Please select an active target endpoint')
            return
        }

        setSimulating(true)
        setSimResult(null)
        const start = Date.now()

        try {
            const res = await fetch(`${API_BASE}/api/integrations/${simTargetId}/test`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            const json = await res.json()
            const duration = Date.now() - start
            if (json.success) {
                setSimResult({
                    success: json.data?.success ?? true,
                    statusCode: json.data?.statusCode ?? 200,
                    durationMs: json.data?.durationMs ?? duration,
                    responseBody: json.data?.responseBody || '{"ok": true, "status": "delivered"}',
                    payloadDispatched: SAMPLE_PAYLOADS[simEventType]
                })
                fetchIntegrations()
            } else {
                setSimResult({
                    success: false,
                    statusCode: 500,
                    durationMs: duration,
                    responseBody: json.message || 'Simulation test rejected',
                    payloadDispatched: SAMPLE_PAYLOADS[simEventType]
                })
            }
        } catch (err: any) {
            setSimResult({
                success: false,
                statusCode: 502,
                durationMs: Date.now() - start,
                responseBody: err.message || 'Network error executing simulation',
                payloadDispatched: SAMPLE_PAYLOADS[simEventType]
            })
        } finally {
            setSimulating(false)
        }
    }

    const openAddModalForType = (type: SupportedConnector) => {
        setModalType(type)
        if (type === 'slack') {
            setFormName('Slack Team Alerts')
            setFormUrl('https://hooks.slack.com/services/T00/B00/XXXX')
        } else if (type === 'teams') {
            setFormName('Microsoft Teams Channel Bot')
            setFormUrl('https://outlook.office.com/webhook/XXXX')
        } else if (type === 'discord') {
            setFormName('Discord Announcements Channel')
            setFormUrl('https://discord.com/api/webhooks/XXXX')
        } else if (type === 'calendar') {
            setFormName('Google Calendar & Outlook Sync')
            setFormUrl('https://calendar-sync.enterprise.com/api/v1/jts-events')
        } else if (type === 'googledrive') {
            setFormName('Google Drive Cloud Vault')
            setFormUrl('https://script.google.com/macros/s/XXXX/exec')
        } else if (type === 'email') {
            setFormName('Enterprise Email Alert Gateway')
            setFormUrl('https://api.smtp-gateway.internal/events/jts-meet')
        } else if (type === 'zapier') {
            setFormName('Zapier / Make Automation Pipeline')
            setFormUrl('https://hooks.zapier.com/hooks/catch/XXXX')
        } else {
            setFormName('Custom Enterprise REST Webhook')
            setFormUrl('https://api.yourcompany.com/webhooks/jts-meet')
        }
        setShowAddModal(true)
    }

    const copyToClipboard = (text: string, id?: string) => {
        navigator.clipboard.writeText(text)
        if (id) {
            setCopiedSecretId(id)
            setTimeout(() => setCopiedSecretId(null), 2000)
        }
    }

    // STATS & METRICS COMPUTATION
    const activeIntegrationsCount = integrations.filter(i => i.status === 'active').length
    
    const allDeliveryLogs = useMemo(() => {
        return integrations.flatMap(i => 
            (i.deliveryLogs || []).map((log: any) => ({
                ...log,
                integrationId: i._id || i.id,
                integrationName: i.name,
                integrationType: i.type,
                targetUrl: i.url
            }))
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }, [integrations])

    const totalDispatches = allDeliveryLogs.length
    const successfulDispatches = allDeliveryLogs.filter(l => l.success).length
    const successRate = totalDispatches > 0 ? ((successfulDispatches / totalDispatches) * 100).toFixed(1) : '100.0'
    const avgLatency = totalDispatches > 0 
        ? Math.round(allDeliveryLogs.reduce((acc, l) => acc + (l.durationMs || 0), 0) / totalDispatches) 
        : 64

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return allDeliveryLogs.filter(log => {
            const matchesStatus = logStatusFilter === 'all' 
                ? true 
                : logStatusFilter === 'success' 
                ? log.success 
                : !log.success
            const matchesQuery = !logSearchQuery 
                || (log.eventType || '').toLowerCase().includes(logSearchQuery.toLowerCase())
                || (log.integrationName || '').toLowerCase().includes(logSearchQuery.toLowerCase())
            return matchesStatus && matchesQuery
        })
    }, [allDeliveryLogs, logStatusFilter, logSearchQuery])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top Enterprise Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                borderRadius: 18,
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: '1.5rem' }}>🔌</span>
                        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                            Enterprise Integrations & Webhooks
                        </h2>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            color: '#a5b4fc',
                            textTransform: 'uppercase'
                        }}>
                            HMAC SHA-256 SIGNED
                        </span>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#94a3b8', maxWidth: 680, lineHeight: 1.5 }}>
                        Connect JTS Meet to Slack, Microsoft Teams, Discord, Google Calendar, or internal microservices. Broadcast live events, cloud recording drops, and AI meeting summaries with real-time webhooks.
                    </p>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5px 12px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                    }}>
                        <IconShieldCheck size={14} color="#818cf8" />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>WORKSPACE PLAN:</span>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: resolvedTier === 'enterprise' ? '#c084fc' : resolvedTier === 'starter' ? '#38bdf8' : '#fbbf24'
                        }}>
                            {resolvedTier} TIER
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            ({integrations.length} of {maxAllowedLabel} Used)
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowHmacModal(true)}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: 10,
                            color: '#cbd5e1',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.2s'
                        }}
                    >
                        <IconLock size={15} color="#cbd5e1" />
                        <span>HMAC Security Guide</span>
                    </button>

                    <button
                        onClick={() => setShowSimulator(true)}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            borderRadius: 10,
                            color: '#a5b4fc',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <IconSparkles size={15} color="#818cf8" />
                        <span>Test Simulator</span>
                    </button>

                    <button
                        onClick={() => {
                            if (isAtQuota) {
                                alert(`Workspace quota reached for ${resolvedTier.toUpperCase()} tier (${integrations.length}/${maxAllowedQuota} endpoints). Please upgrade to Growth Pro or Enterprise for additional webhook capacity.`)
                                return
                            }
                            openAddModalForType('webhook')
                        }}
                        style={{
                            padding: '10px 20px',
                            background: isAtQuota ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            borderRadius: 10,
                            color: isAtQuota ? '#94a3b8' : '#fff',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: isAtQuota ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.45)'
                        }}
                    >
                        <IconPlus size={16} color={isAtQuota ? '#94a3b8' : '#fff'} />
                        <span>{isAtQuota ? 'Plan Quota Reached' : 'Add Webhook'}</span>
                    </button>
                </div>
            </div>

            {/* Success Alert Banner */}
            {successMsg && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: 12,
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#4ade80',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                }}>
                    <IconCheck size={16} color="#4ade80" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* KPI Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Configured Endpoints
                        </span>
                        <span style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: activeIntegrationsCount > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: activeIntegrationsCount > 0 ? '#4ade80' : '#94a3b8'
                        }}>
                            {activeIntegrationsCount} ACTIVE
                        </span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                        {integrations.length} <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#64748b' }}>total</span>
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Across all enabled channels</span>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Events Dispatched
                        </span>
                        <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                            REAL-TIME
                        </span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8' }}>
                        {totalDispatches} <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#64748b' }}>events</span>
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Socket & webhook executions</span>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Delivery Health
                        </span>
                        <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                            SLA 99.9%
                        </span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80' }}>
                        {successRate}%
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Successful HTTP 2xx transmissions</span>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Average Latency
                        </span>
                        <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                            ROUNDTRIP
                        </span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>
                        {avgLatency} <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#64748b' }}>ms</span>
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>SSL handshake & response time</span>
                </div>
            </div>

            {/* Available Connectors & Services Catalog */}
            <IntegrationsConnectorsCatalog
                integrations={integrations}
                openAddModalForType={openAddModalForType}
                handleTest={handleTest}
                testingId={testingId}
            />

            {/* Webhook Sandbox & Event Payload Simulator */}
            <IntegrationsSimulator
                showSimulator={showSimulator}
                setShowSimulator={setShowSimulator}
                simEventType={simEventType}
                setSimEventType={setSimEventType}
                simTargetId={simTargetId}
                setSimTargetId={setSimTargetId}
                integrations={integrations}
                handleRunSimulation={handleRunSimulation}
                simulating={simulating}
                simResult={simResult}
                copyToClipboard={copyToClipboard}
            />

            {/* Configured Endpoints List */}
            <IntegrationsEndpointsList
                integrations={integrations}
                loading={loading}
                fetchIntegrations={fetchIntegrations}
                openAddModalForType={openAddModalForType}
                handleTest={handleTest}
                handleToggle={handleToggle}
                handleDelete={handleDelete}
                testingId={testingId}
                testResult={testResult}
                setTestResult={setTestResult}
                revealedSecrets={revealedSecrets}
                setRevealedSecrets={setRevealedSecrets}
                copiedSecretId={copiedSecretId}
                copyToClipboard={copyToClipboard}
            />

            {/* Advanced Delivery Logs with Inspect & Retry */}
            <IntegrationsDeliveryLogsTable
                filteredLogs={filteredLogs}
                logStatusFilter={logStatusFilter}
                setLogStatusFilter={setLogStatusFilter}
                logSearchQuery={logSearchQuery}
                setLogSearchQuery={setLogSearchQuery}
                onInspectLog={(log) => setInspectedLog(log)}
                onRetryDelivery={(integrationId) => handleTest(integrationId)}
            />

            {/* Inspect Payload & Response Modal */}
            <IntegrationsInspectModal
                inspectedLog={inspectedLog}
                onClose={() => setInspectedLog(null)}
                onRetry={(integrationId) => handleTest(integrationId)}
            />

            {/* HMAC Verification Guide Modal */}
            <IntegrationsHmacModal
                showHmacModal={showHmacModal}
                onClose={() => setShowHmacModal(false)}
                copyToClipboard={copyToClipboard}
            />

            {/* Add Webhook Modal */}
            <IntegrationsAddModal
                showAddModal={showAddModal}
                onClose={() => setShowAddModal(false)}
                modalType={modalType}
                formName={formName}
                setFormName={setFormName}
                formUrl={formUrl}
                setFormUrl={setFormUrl}
                formSecret={formSecret}
                setFormSecret={setFormSecret}
                selectedEvents={selectedEvents}
                setSelectedEvents={setSelectedEvents}
                handleCreate={handleCreate}
            />
        </div>
    )
}
