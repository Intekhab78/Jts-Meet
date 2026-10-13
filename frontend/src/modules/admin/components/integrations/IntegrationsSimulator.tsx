import React, { useState } from 'react'
import { SAMPLE_PAYLOADS } from '../../integrations.types'
import {
    IconSparkles,
    IconCheck,
    IconCopy,
    IconZap,
    IconX
} from '../../../../components/common/Icons'

interface IntegrationsSimulatorProps {
    showSimulator: boolean
    setShowSimulator: (val: boolean) => void
    simEventType: string
    setSimEventType: (val: string) => void
    simTargetId: string
    setSimTargetId: (val: string) => void
    integrations: any[]
    handleRunSimulation: () => Promise<void>
    simulating: boolean
    simResult: any
    copyToClipboard: (text: string) => void
}

export const IntegrationsSimulator: React.FC<IntegrationsSimulatorProps> = ({
    showSimulator,
    setShowSimulator,
    simEventType,
    setSimEventType,
    simTargetId,
    setSimTargetId,
    integrations,
    handleRunSimulation,
    simulating,
    simResult,
    copyToClipboard
}) => {
    const [simCopied, setSimCopied] = useState(false)

    return (
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
    )
}
