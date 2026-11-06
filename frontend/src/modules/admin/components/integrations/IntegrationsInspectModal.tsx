import React from 'react'
import {
    IconX,
    IconRefresh
} from '../../../../components/common/Icons'

interface IntegrationsInspectModalProps {
    inspectedLog: any
    onClose: () => void
    onRetry: (integrationId: string) => void
}

export const IntegrationsInspectModal: React.FC<IntegrationsInspectModalProps> = ({
    inspectedLog,
    onClose,
    onRetry
}) => {
    if (!inspectedLog) return null

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: '57px',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '1px 16px 20px 16px',
                overflowY: 'auto'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 640,
                    maxHeight: 'calc(100vh - 57px - 24px)',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    margin: '1px auto 20px auto',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Fixed Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                            Dispatch Inspection: {inspectedLog.eventType}
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                            Target: {inspectedLog.integrationName} • {new Date(inspectedLog.timestamp).toLocaleString()}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            width: 32,
                            height: 32,
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <IconX size={16} color="#94a3b8" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div style={{
                    padding: '20px 24px 24px 24px',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                }}>
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
                                onRetry(inspectedLog.integrationId)
                                onClose()
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
    )
}
