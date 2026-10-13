import React from 'react'
import { SupportedConnector } from '../../integrations.types'
import {
    IconMessage,
    IconCalendar,
    IconFolder,
    IconMail,
    IconZap,
    IconPlus
} from '../../../../components/common/Icons'

interface IntegrationsConnectorsCatalogProps {
    integrations: any[]
    openAddModalForType: (type: SupportedConnector) => void
    handleTest: (id: string) => void
    testingId: string | null
}

export const IntegrationsConnectorsCatalog: React.FC<IntegrationsConnectorsCatalogProps> = ({
    integrations,
    openAddModalForType,
    handleTest,
    testingId
}) => {
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

            <style>{`
                .integrations-connectors-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 14px;
                }
                @media (max-width: 1200px) {
                    .integrations-connectors-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                }
                @media (max-width: 640px) {
                    .integrations-connectors-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
            <div className="integrations-connectors-grid">
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
                                borderRadius: 14,
                                padding: '16px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: 12,
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

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: connector.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                                }}>
                                    {connector.iconNode}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
                                            {connector.title}
                                        </h4>
                                        {isConfigured ? (
                                            <span style={{
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                padding: '2px 6px',
                                                borderRadius: 8,
                                                background: 'rgba(34, 197, 94, 0.15)',
                                                border: '1px solid rgba(34, 197, 94, 0.35)',
                                                color: '#4ade80',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                                                {configuredCount} Active
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: '0.62rem',
                                                fontWeight: 600,
                                                padding: '2px 6px',
                                                borderRadius: 8,
                                                background: 'rgba(148, 163, 184, 0.1)',
                                                color: '#94a3b8',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Ready
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                        {connector.desc}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                                <button
                                    onClick={() => openAddModalForType(connector.type)}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        background: isConfigured ? 'rgba(255, 255, 255, 0.06)' : 'rgba(99, 102, 241, 0.15)',
                                        border: isConfigured ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(99, 102, 241, 0.35)',
                                        borderRadius: 8,
                                        color: isConfigured ? '#e2e8f0' : '#a5b4fc',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4
                                    }}
                                >
                                    <IconPlus size={12} />
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
                                            padding: '7px 10px',
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.35)',
                                            borderRadius: 8,
                                            color: '#a5b4fc',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                        title="Send a quick test ping to this service"
                                    >
                                        <IconZap size={12} color="#a5b4fc" />
                                        <span>Ping</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
