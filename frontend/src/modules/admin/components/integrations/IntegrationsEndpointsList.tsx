import React from 'react'
import { SupportedConnector } from '../../integrations.types'
import {
    IconRefresh,
    IconZap,
    IconCalendar,
    IconMail,
    IconFolder,
    IconMessage,
    IconPause,
    IconPlay,
    IconTrash,
    IconShieldCheck,
    IconEye,
    IconCheck,
    IconCopy,
    IconClock,
    IconX
} from '../../../../components/common/Icons'

interface IntegrationsEndpointsListProps {
    integrations: any[]
    loading: boolean
    fetchIntegrations: () => Promise<void>
    openAddModalForType: (type: SupportedConnector) => void
    handleTest: (id: string) => Promise<void>
    handleToggle: (id: string, currentStatus: string) => Promise<void>
    handleDelete: (id: string, name: string) => Promise<void>
    testingId: string | null
    testResult: any
    setTestResult: (res: any) => void
    revealedSecrets: Record<string, boolean>
    setRevealedSecrets: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    copiedSecretId: string | null
    copyToClipboard: (text: string, id?: string) => void
}

export const IntegrationsEndpointsList: React.FC<IntegrationsEndpointsListProps> = ({
    integrations,
    loading,
    fetchIntegrations,
    openAddModalForType,
    handleTest,
    handleToggle,
    handleDelete,
    testingId,
    testResult,
    setTestResult,
    revealedSecrets,
    setRevealedSecrets,
    copiedSecretId,
    copyToClipboard
}) => {
    return (
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

                                {/* Security & Signing Secret Bar */}
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
    )
}
