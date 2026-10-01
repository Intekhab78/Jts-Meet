import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../../../config'
import {
    IconPlus,
    IconCheck,
    IconX,
    IconRefresh,
    IconZap,
    IconMessage,
    IconFolder,
    IconPlay,
    IconPause,
    IconTrash,
    IconRocket,
    IconFlag,
    IconVideo,
    IconUser,
    IconCalendar,
    IconMail,
    IconCopy,
    IconShieldCheck,
    IconLock,
    IconEye,
    IconSearch,
    IconFilter,
    IconClock,
    IconExternalLink,
    IconSparkles
} from '../../../components/common/Icons'

interface IntegrationsTabProps {
    token: string
    currentOrgId?: string
    planTier?: string
}

type SupportedConnector = 'slack' | 'teams' | 'discord' | 'calendar' | 'googledrive' | 'email' | 'zapier' | 'webhook'

const SAMPLE_PAYLOADS: Record<string, any> = {
    'meeting.started': {
        event: 'meeting.started',
        timestamp: new Date().toISOString(),
        meeting: {
            id: 'room-exec-briefing',
            title: 'Q3 Enterprise Product Review & Strategy',
            host: {
                id: 'usr_admin99',
                name: 'Chief Admin',
                email: 'admin@jtsmeet.com'
            },
            joinUrl: 'https://meet.jtsmiddleeast.com/#room=room-exec-briefing',
            scheduledStartTime: new Date().toISOString(),
            roomType: 'conference_hall',
            features: {
                e2ee: true,
                aiTranscriberActive: true,
                cloudRecordingActive: true
            }
        }
    },
    'meeting.ended': {
        event: 'meeting.ended',
        timestamp: new Date().toISOString(),
        meeting: {
            id: 'room-exec-briefing',
            title: 'Q3 Enterprise Product Review & Strategy',
            durationMinutes: 47,
            totalParticipants: 14,
            endedBy: 'Chief Admin'
        }
    },
    'recording.ready': {
        event: 'recording.ready',
        timestamp: new Date().toISOString(),
        recording: {
            meetingId: 'room-exec-briefing',
            title: 'Q3 Enterprise Product Review & Strategy',
            downloadUrl: 'https://meet.jtsmiddleeast.com/recordings/vault/rec_98241a.mp4',
            fileSizeBytes: 142857140,
            durationSeconds: 2820,
            format: 'video/mp4',
            resolution: '1080p-60fps'
        }
    },
    'participant.joined': {
        event: 'participant.joined',
        timestamp: new Date().toISOString(),
        meetingId: 'room-exec-briefing',
        participant: {
            id: 'usr_sarah_lead',
            name: 'Sarah Jenkins',
            email: 'sarah.j@enterprise.com',
            role: 'co-host',
            ipAddress: '194.32.10.88'
        }
    },
    'ai.summary.completed': {
        event: 'ai.summary.completed',
        timestamp: new Date().toISOString(),
        meetingId: 'room-exec-briefing',
        aiReport: {
            sentimentScore: 'Highly Positive (92%)',
            actionItemsCount: 6,
            keyDecisions: [
                'Approved migration of legacy microservices to Kubernetes cluster.',
                'Greenlit Q4 APAC video relay server deployment.'
            ],
            transcriptionWordCount: 8412
        }
    }
}

export function IntegrationsTab({ token, currentOrgId, planTier }: IntegrationsTabProps) {
    const [integrations, setIntegrations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
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
    const [simCustomUrl, setSimCustomUrl] = useState('')
    const [simulating, setSimulating] = useState(false)
    const [simResult, setSimResult] = useState<any>(null)
    const [simCopied, setSimCopied] = useState(false)

    // HMAC Security Guide Modal
    const [showHmacModal, setShowHmacModal] = useState(false)
    const [hmacTab, setHmacTab] = useState<'nodejs' | 'python' | 'curl'>('nodejs')
    const [copiedSnippet, setCopiedSnippet] = useState(false)

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
        if (!simTargetId && !simCustomUrl) {
            alert('Please select an active target endpoint or enter a custom URL')
            return
        }

        setSimulating(true)
        setSimResult(null)
        const start = Date.now()

        try {
            if (simTargetId) {
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

    // -------------------------------------------------------------
    // STATS & METRICS COMPUTATION
    // -------------------------------------------------------------
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

    // Connector Catalog List
    const connectorsList: Array<{
        type: SupportedConnector
        title: string
        desc: string
        bg: string
        badgeColor: string
        iconNode: React.ReactNode
    }> = [
        {
            type: 'slack',
            title: 'Slack Incoming Webhook',
            desc: 'Post meeting start alerts, cloud recording links, and room invites directly to any Slack channel.',
            bg: '#4A154B',
            badgeColor: '#e879f9',
            iconNode: <IconMessage size={22} color="#fff" />
        },
        {
            type: 'teams',
            title: 'Microsoft Teams Webhook',
            desc: 'Post conference cards, automated bot alerts, and recording notifications directly into MS Teams.',
            bg: 'linear-gradient(135deg, #4f52b2 0%, #6264A7 100%)',
            badgeColor: '#c4b5fd',
            iconNode: <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>T</span>
        },
        {
            type: 'discord',
            title: 'Discord Webhook',
            desc: 'Broadcast live conference sessions, join links, and rich embeds with role mentions to Discord servers.',
            bg: '#5865F2',
            badgeColor: '#a5b4fc',
            iconNode: <IconMessage size={22} color="#fff" />
        },
        {
            type: 'calendar',
            title: 'Google Calendar & Outlook Sync',
            desc: 'Automatically sync scheduled conferences, participant invites, and cancelation notices to corporate calendars.',
            bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            badgeColor: '#38bdf8',
            iconNode: <IconCalendar size={22} color="#fff" />
        },
        {
            type: 'googledrive',
            title: 'Google Drive Cloud Vault',
            desc: 'Automatically archive recorded MP4 conferences and AI transcript summaries directly to Google Drive folders.',
            bg: '#10b981',
            badgeColor: '#6ee7b7',
            iconNode: <IconFolder size={22} color="#fff" />
        },
        {
            type: 'email',
            title: 'Enterprise Email Alerts',
            desc: 'Deliver automated SMTP alerts, participant joins, and recording notifications directly to enterprise inboxes.',
            bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            badgeColor: '#fcd34d',
            iconNode: <IconMail size={22} color="#fff" />
        },
        {
            type: 'zapier',
            title: 'Zapier & Make Automation',
            desc: 'Automate business workflows with 5,000+ cloud apps including Notion, Salesforce, HubSpot, and Asana.',
            bg: 'linear-gradient(135deg, #FF4A00 0%, #EA580C 100%)',
            badgeColor: '#fdba74',
            iconNode: <IconZap size={22} color="#fff" />
        },
        {
            type: 'webhook',
            title: 'Custom REST Webhook',
            desc: 'Send JSON payloads with HMAC-SHA256 signatures (x-jts-signature) to your custom API servers.',
            bg: '#6366f1',
            badgeColor: '#818cf8',
            iconNode: <IconZap size={22} color="#fff" />
        }
    ]

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

            {/* KPI Metric Cards (Improvement #5) */}
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

            {/* Available Connectors & Services Grid (Improvements #1 & #6) */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>
                            Available Connectors & Services
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            Pre-built zero-config connectors with automatic JSON formatting for enterprise chat & collaboration tools.
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                    gap: 16
                }}>
                    {connectorsList.map(connector => {
                        const configuredItems = integrations.filter(i => i.type === connector.type)
                        const configuredCount = configuredItems.length
                        const isConfigured = configuredCount > 0

                        return (
                            <div
                                key={connector.type}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: isConfigured 
                                        ? '1px solid rgba(99, 102, 241, 0.35)' 
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 16,
                                    padding: 20,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 16,
                                    transition: 'border-color 0.2s, transform 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {isConfigured && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 3,
                                        background: 'linear-gradient(90deg, #6366f1, #10b981)'
                                    }} />
                                )}

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: connector.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                                    }}>
                                        {connector.iconNode}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff', fontWeight: 700 }}>
                                                {connector.title}
                                            </h4>
                                            {isConfigured ? (
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: 10,
                                                    background: 'rgba(34, 197, 94, 0.15)',
                                                    border: '1px solid rgba(34, 197, 94, 0.35)',
                                                    color: '#4ade80',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                                                    {configuredCount} Active
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 600,
                                                    padding: '2px 7px',
                                                    borderRadius: 10,
                                                    background: 'rgba(148, 163, 184, 0.1)',
                                                    color: '#94a3b8'
                                                }}>
                                                    Ready
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45 }}>
                                            {connector.desc}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                    <button
                                        onClick={() => openAddModalForType(connector.type)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: isConfigured ? 'rgba(255, 255, 255, 0.06)' : 'rgba(99, 102, 241, 0.15)',
                                            border: isConfigured ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(99, 102, 241, 0.35)',
                                            borderRadius: 8,
                                            color: isConfigured ? '#e2e8f0' : '#a5b4fc',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <IconPlus size={13} />
                                        <span>{isConfigured ? 'Add Another' : `Connect ${connector.title.split(' ')[0]}`}</span>
                                    </button>

                                    {isConfigured && (
                                        <button
                                            onClick={() => {
                                                const firstItem = configuredItems[0]
                                                if (firstItem) handleTest(firstItem._id || firstItem.id)
                                            }}
                                            disabled={testingId !== null}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'rgba(99, 102, 241, 0.15)',
                                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                                borderRadius: 8,
                                                color: '#a5b4fc',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}
                                            title="Send a quick test ping to this service"
                                        >
                                            <IconZap size={13} color="#a5b4fc" />
                                            <span>Ping</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Webhook Sandbox & Event Payload Simulator (Improvement #2) */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconSparkles size={18} color="#818cf8" />
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                                Live Webhook Simulator & Payload Inspector
                            </h3>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            Preview and simulate real-time JSON event payloads dispatched to Slack, Teams, or your custom endpoints before going live.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowSimulator(!showSimulator)}
                        style={{
                            padding: '6px 14px',
                            background: showSimulator ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: 8,
                            color: showSimulator ? '#a5b4fc' : '#94a3b8',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {showSimulator ? 'Collapse Simulator ▲' : 'Open Simulator ▼'}
                    </button>
                </div>

                {showSimulator && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                            {/* Event Type Select */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                                    Event Type
                                </label>
                                <select
                                    value={simEventType}
                                    onChange={(e) => setSimEventType(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#fff',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <option value="meeting.started">meeting.started (Conference Initiated)</option>
                                    <option value="meeting.ended">meeting.ended (Session Concluded)</option>
                                    <option value="recording.ready">recording.ready (Cloud MP4 Video Ready)</option>
                                    <option value="participant.joined">participant.joined (Member Joined Room)</option>
                                    <option value="ai.summary.completed">ai.summary.completed (AI Executive Recap)</option>
                                </select>
                            </div>

                            {/* Target Endpoint Select */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                                    Target Endpoint Destination
                                </label>
                                <select
                                    value={simTargetId}
                                    onChange={(e) => setSimTargetId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#fff',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {integrations.length === 0 ? (
                                        <option value="">No configured endpoints (Please add one)</option>
                                    ) : (
                                        integrations.map(i => (
                                            <option key={i._id || i.id} value={i._id || i.id}>
                                                {i.name} ({i.type.toUpperCase()}) — {i.url.slice(0, 42)}...
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Payload Preview */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    Live Dispatched Payload (JSON)
                                </span>
                                <button
                                    onClick={() => {
                                        copyToClipboard(JSON.stringify(SAMPLE_PAYLOADS[simEventType], null, 2))
                                        setSimCopied(true)
                                        setTimeout(() => setSimCopied(false), 2000)
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: simCopied ? '#4ade80' : '#818cf8',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}
                                >
                                    {simCopied ? <IconCheck size={13} color="#4ade80" /> : <IconCopy size={13} color="#818cf8" />}
                                    <span>{simCopied ? 'Copied!' : 'Copy JSON'}</span>
                                </button>
                            </div>

                            <pre style={{
                                margin: 0,
                                padding: '14px 18px',
                                borderRadius: 10,
                                background: '#0a0f1d',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#38bdf8',
                                fontSize: '0.82rem',
                                fontFamily: 'Consolas, monospace',
                                overflowX: 'auto',
                                maxHeight: 220,
                                lineHeight: 1.45
                            }}>
                                {JSON.stringify(SAMPLE_PAYLOADS[simEventType], null, 2)}
                            </pre>
                        </div>

                        {/* Dispatch Button & Result */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                            <button
                                onClick={handleRunSimulation}
                                disabled={simulating || integrations.length === 0}
                                style={{
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    borderRadius: 10,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    cursor: simulating || integrations.length === 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                                }}
                            >
                                <IconZap size={15} color="#fff" />
                                <span>{simulating ? 'Simulating Dispatch...' : 'Dispatch Mock Event Now'}</span>
                            </button>

                            {simResult && (
                                <div style={{
                                    flex: 1,
                                    padding: '8px 14px',
                                    borderRadius: 8,
                                    background: simResult.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    border: `1px solid ${simResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.82rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {simResult.success ? <IconCheck size={16} color="#4ade80" /> : <IconX size={16} color="#f87171" />}
                                        <span style={{ color: simResult.success ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                                            HTTP {simResult.statusCode} {simResult.success ? 'Delivered' : 'Delivery Failed'}
                                        </span>
                                        <span style={{ color: '#94a3b8' }}>• {simResult.durationMs}ms</span>
                                    </div>
                                    <span style={{ color: '#cbd5e1', fontSize: '0.78rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Response: <code>{simResult.responseBody}</code>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Configured Endpoints List (Improvements #1 & #3) */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 18,
                padding: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0' }}>
                            Configured Webhook Endpoints ({integrations.length})
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            Live endpoints receiving cryptographic webhooks with HMAC authentication signatures.
                        </p>
                    </div>

                    <button
                        onClick={fetchIntegrations}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconRefresh size={13} />
                        <span>Refresh</span>
                    </button>
                </div>

                {loading && integrations.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '20px 0' }}>Loading integrations...</p>
                ) : integrations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '42px 20px', color: '#94a3b8' }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 14px'
                        }}>
                            <IconZap size={26} color="#818cf8" />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>No webhook endpoints configured yet.</p>
                        <p style={{ margin: '6px 0 16px', fontSize: '0.82rem', color: '#64748b' }}>
                            Connect Slack, Teams, Discord, Google Calendar, or a custom webhook endpoint above.
                        </p>
                        <button
                            onClick={() => openAddModalForType('slack')}
                            style={{
                                padding: '8px 18px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                border: 'none',
                                borderRadius: 8,
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                            }}
                        >
                            + Connect First Service
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {integrations.map((item) => {
                            const itemId = item._id || item.id
                            const isTestingThis = testingId === itemId
                            const thisTestResult = testResult?.id === itemId ? testResult : null
                            const isSecretRevealed = !!revealedSecrets[itemId]

                            return (
                                <div
                                    key={itemId}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: 14,
                                        padding: '18px 20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 14,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                background: item.type === 'slack' ? '#4A154B' 
                                                    : item.type === 'teams' ? '#4f52b2'
                                                    : item.type === 'discord' ? '#5865F2'
                                                    : item.type === 'calendar' ? '#0284c7'
                                                    : item.type === 'googledrive' ? '#10b981'
                                                    : item.type === 'email' ? '#d97706'
                                                    : item.type === 'zapier' ? '#EA580C'
                                                    : '#6366f1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800,
                                                color: '#fff',
                                                fontSize: '0.9rem',
                                                flexShrink: 0
                                            }}>
                                                {item.type === 'teams' ? 'T' 
                                                    : item.type === 'calendar' ? <IconCalendar size={18} color="#fff" />
                                                    : item.type === 'email' ? <IconMail size={18} color="#fff" />
                                                    : item.type === 'googledrive' ? <IconFolder size={18} color="#fff" />
                                                    : item.type === 'webhook' || item.type === 'zapier' ? <IconZap size={18} color="#fff" />
                                                    : <IconMessage size={18} color="#fff" />}
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{item.name}</span>
                                                    <span style={{
                                                        fontSize: '0.68rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        padding: '2px 7px',
                                                        borderRadius: 4,
                                                        background: item.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        color: item.status === 'active' ? '#4ade80' : '#f87171'
                                                    }}>
                                                        ● {item.status}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                        color: '#94a3b8',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {item.type}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4, wordBreak: 'break-all' }}>
                                                    URL: <code style={{ color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>{item.url}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                onClick={() => handleTest(itemId)}
                                                disabled={isTestingThis}
                                                style={{
                                                    padding: '7px 14px',
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.35)',
                                                    borderRadius: 8,
                                                    color: '#a5b4fc',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    cursor: isTestingThis ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                <IconZap size={13} color="#a5b4fc" />
                                                <span>{isTestingThis ? 'Testing...' : 'Send Test Ping'}</span>
                                            </button>

                                            <button
                                                onClick={() => handleToggle(itemId, item.status)}
                                                style={{
                                                    padding: '7px 12px',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: 8,
                                                    color: '#cbd5e1',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}
                                            >
                                                {item.status === 'active' ? (
                                                    <>
                                                        <IconPause size={13} color="#cbd5e1" />
                                                        <span>Pause</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconPlay size={13} color="#4ade80" />
                                                        <span>Resume</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => handleDelete(itemId, item.name)}
                                                style={{
                                                    padding: '7px 10px',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    borderRadius: 8,
                                                    color: '#f87171',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Delete webhook"
                                            >
                                                <IconTrash size={14} color="#f87171" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Security & Signing Secret Bar (Improvement #3) */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 10,
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        background: 'rgba(0, 0, 0, 0.25)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        fontSize: '0.78rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <IconShieldCheck size={14} color="#818cf8" />
                                            <span style={{ color: '#94a3b8' }}>Signing Secret:</span>
                                            <code style={{ color: '#e2e8f0', letterSpacing: isSecretRevealed ? 'normal' : '0.15em' }}>
                                                {item.secret ? (isSecretRevealed ? item.secret : '••••••••••••••••••••••••') : 'Auto-generated on dispatch'}
                                            </code>
                                            {item.secret && (
                                                <button
                                                    onClick={() => setRevealedSecrets(prev => ({ ...prev, [itemId]: !prev[itemId] }))}
                                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    title={isSecretRevealed ? 'Hide secret' : 'Reveal secret'}
                                                >
                                                    <IconEye size={13} color="#94a3b8" />
                                                </button>
                                            )}
                                        </div>

                                        {item.secret && (
                                            <button
                                                onClick={() => copyToClipboard(item.secret, itemId)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: copiedSecretId === itemId ? '#4ade80' : '#818cf8',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    fontSize: '0.76rem',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {copiedSecretId === itemId ? <IconCheck size={12} color="#4ade80" /> : <IconCopy size={12} color="#818cf8" />}
                                                <span>{copiedSecretId === itemId ? 'Copied Secret!' : 'Copy Secret'}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Event Badges & Activity */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Triggers:</span>
                                        {(item.events || []).map((ev: string) => (
                                            <span
                                                key={ev}
                                                style={{
                                                    fontSize: '0.72rem',
                                                    padding: '2px 8px',
                                                    borderRadius: 5,
                                                    background: 'rgba(255, 255, 255, 0.06)',
                                                    color: '#94a3b8'
                                                }}
                                            >
                                                {ev}
                                            </span>
                                        ))}
                                        {item.lastDeliveredAt && (
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <IconClock size={12} color="#64748b" />
                                                Last Active: {new Date(item.lastDeliveredAt).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Test Result Bar */}
                                    {thisTestResult && (
                                        <div style={{
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            background: thisTestResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${thisTestResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            fontSize: '0.8rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: thisTestResult.success ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {thisTestResult.success ? <IconCheck size={14} color="#4ade80" /> : <IconX size={14} color="#f87171" />}
                                                <span>{thisTestResult.success ? 'Payload delivered successfully' : 'Delivery test failed'} (HTTP {thisTestResult.statusCode} • {thisTestResult.durationMs}ms)</span>
                                            </span>
                                            <button
                                                onClick={() => setTestResult(null)}
                                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                <IconX size={13} color="#94a3b8" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Advanced Delivery Logs with Inspect & Retry (Improvement #4) */}
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
                                                    onClick={() => setInspectedLog(log)}
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
                                                    onClick={() => handleTest(log.integrationId)}
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

            {/* Inspect Payload & Response Modal */}
            {inspectedLog && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.78)',
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
                        maxWidth: 640,
                        color: '#fff',
                        padding: 24,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                                    Dispatch Inspection: {inspectedLog.eventType}
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                    Target: {inspectedLog.integrationName} • {new Date(inspectedLog.timestamp).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setInspectedLog(null)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <IconX size={18} color="#94a3b8" />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>HTTP STATUS</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: inspectedLog.success ? '#4ade80' : '#f87171' }}>
                                        {inspectedLog.statusCode} ({inspectedLog.success ? 'Success' : 'Error'})
                                    </span>
                                </div>
                                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>LATENCY</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                                        {inspectedLog.durationMs}ms
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                    Receiver Response Body:
                                </span>
                                <pre style={{
                                    margin: 0,
                                    padding: '12px',
                                    borderRadius: 8,
                                    background: '#0a0f1d',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: inspectedLog.success ? '#4ade80' : '#f87171',
                                    fontSize: '0.8rem',
                                    fontFamily: 'Consolas, monospace',
                                    maxHeight: 140,
                                    overflowY: 'auto'
                                }}>
                                    {inspectedLog.responseBody || '(Empty response or 200 OK)'}
                                </pre>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                                <button
                                    onClick={() => {
                                        handleTest(inspectedLog.integrationId)
                                        setInspectedLog(null)
                                    }}
                                    style={{
                                        padding: '10px 18px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        borderRadius: 8,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <IconRefresh size={13} />
                                    <span>Retry Delivery Now</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HMAC Verification Guide Modal (Improvement #3) */}
            {showHmacModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.78)',
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
                        maxWidth: 680,
                        color: '#fff',
                        padding: 26,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                                    🛡️ Webhook HMAC SHA-256 Verification Guide
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                                    Every webhook sent from JTS Meet includes the <code style={{ color: '#a5b4fc' }}>x-jts-signature</code> HTTP header.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHmacModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <IconX size={18} color="#94a3b8" />
                            </button>
                        </div>

                        {/* Code Language Tabs */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                            {[
                                { id: 'nodejs', label: 'Node.js (Express)' },
                                { id: 'python', label: 'Python (Flask / FastAPI)' },
                                { id: 'curl', label: 'cURL Signature Test' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setHmacTab(tab.id as any)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: hmacTab === tab.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                                        color: hmacTab === tab.id ? '#a5b4fc' : '#94a3b8',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ position: 'relative' }}>
                            <pre style={{
                                margin: 0,
                                padding: '16px',
                                borderRadius: 10,
                                background: '#0a0f1d',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#38bdf8',
                                fontSize: '0.82rem',
                                fontFamily: 'Consolas, monospace',
                                overflowX: 'auto',
                                maxHeight: 260,
                                lineHeight: 1.45
                            }}>
                                {hmacTab === 'nodejs' ? (
`const crypto = require('crypto');

// Express Middleware to verify JTS Meet webhooks
function verifyJtsWebhook(req, res, next) {
    const signature = req.headers['x-jts-signature'];
    const secret = process.env.JTS_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(401).json({ error: 'Missing x-jts-signature header' });
    }

    // Compute expected HMAC SHA-256 hash using raw request body
    const expected = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return next(); // Webhook is authentic!
    }

    return res.status(403).json({ error: 'Invalid webhook signature' });
}`
                                ) : hmacTab === 'python' ? (
`import hmac
import hashlib
from fastapi import Request, HTTPException

async def verify_jts_signature(request: Request, secret: str):
    signature = request.headers.get("x-jts-signature")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature header")

    body_bytes = await request.body()
    expected = hmac.new(
        secret.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=403, detail="Signature mismatch")
    return True`
                                ) : (
`# Test payload validation via cURL
curl -X POST https://yourcompany.com/api/webhooks \\
  -H "Content-Type: application/json" \\
  -H "x-jts-signature: 8f9b23a10e82c7..." \\
  -d '{"event":"meeting.started","id":"evt_9812"}'`
                                )}
                            </pre>

                            <button
                                onClick={() => {
                                    const snippet = hmacTab === 'nodejs' 
                                        ? "const crypto = require('crypto');\nfunction verifyJtsWebhook(req, res, next) {\n  const signature = req.headers['x-jts-signature'];\n  const expected = crypto.createHmac('sha256', process.env.JTS_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');\n  if (signature === expected) return next();\n  return res.status(403).json({ error: 'Invalid signature' });\n}"
                                        : "import hmac, hashlib\n# verify x-jts-signature header"
                                    copyToClipboard(snippet)
                                    setCopiedSnippet(true)
                                    setTimeout(() => setCopiedSnippet(false), 2000)
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    color: copiedSnippet ? '#4ade80' : '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                {copiedSnippet ? <IconCheck size={12} color="#4ade80" /> : <IconCopy size={12} color="#fff" />}
                                <span>{copiedSnippet ? 'Copied Snippet' : 'Copy'}</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button
                                onClick={() => setShowHmacModal(false)}
                                style={{
                                    padding: '8px 18px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: 8,
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close Guide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Webhook Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.78)',
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
                        maxWidth: 540,
                        color: '#fff',
                        padding: 26,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                                Configure {
                                    modalType === 'slack' ? 'Slack Incoming Webhook' :
                                    modalType === 'teams' ? 'Microsoft Teams Webhook' :
                                    modalType === 'discord' ? 'Discord Webhook' :
                                    modalType === 'calendar' ? 'Google Calendar & Outlook Sync' :
                                    modalType === 'googledrive' ? 'Google Drive Cloud Sync' :
                                    modalType === 'email' ? 'Enterprise Email Alerts' :
                                    modalType === 'zapier' ? 'Zapier / Make Automation' :
                                    'Custom REST Webhook'
                                }
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <IconX size={18} color="#94a3b8" />
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
                                    placeholder="https://..."
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
                                    HMAC Secret Key (Optional for SHA256 Signature Verification):
                                </label>
                                <input
                                    type="text"
                                    value={formSecret}
                                    onChange={(e) => setFormSecret(e.target.value)}
                                    placeholder="Leave empty to auto-generate a secure 32-character key"
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
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                                    Trigger Events:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {[
                                        { id: 'meeting.started', label: 'Meeting Started', Icon: IconRocket, color: '#818cf8' },
                                        { id: 'meeting.ended', label: 'Meeting Ended', Icon: IconFlag, color: '#f87171' },
                                        { id: 'recording.ready', label: 'Recording Ready', Icon: IconVideo, color: '#fbbf24' },
                                        { id: 'participant.joined', label: 'Participant Joined', Icon: IconUser, color: '#34d399' }
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
                                                    padding: '8px 10px',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255, 255, 255, 0.06)'
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
                                                <item.Icon size={14} color={item.color} />
                                                <span>{item.label}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
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
                                    Save & Activate Endpoint
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
