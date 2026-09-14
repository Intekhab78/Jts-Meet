import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE } from '../../config'
import { IconSparkles, IconX, IconCheck, IconLock, IconZap, IconFileText } from '../../components/common/Icons'

interface AgendaItem {
    title: string
    durationMin: number
    description: string
    owner?: string
}

interface MeetingAgendaResult {
    agendaItems: AgendaItem[]
    preReadMaterials: string[]
    meetingGoal: string
    tipsForHost: string[]
}

export interface AiAgendaGeneratorModalProps {
    isOpen: boolean
    onClose: () => void
    token: string
    userPlan?: string
    initialTitle?: string
    initialDuration?: number
    onAgendaApply?: (agenda: MeetingAgendaResult) => void
}

export function AiAgendaGeneratorModal({
    isOpen,
    onClose,
    token,
    userPlan = 'free',
    initialTitle = '',
    initialDuration = 60,
    onAgendaApply
}: AiAgendaGeneratorModalProps) {
    const [title, setTitle] = useState(initialTitle)
    const [durationMinutes, setDurationMinutes] = useState(initialDuration)
    const [context, setContext] = useState('')
    const [loading, setLoading] = useState(false)
    const [agenda, setAgenda] = useState<MeetingAgendaResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
    const [copiedAll, setCopiedAll] = useState(false)

    const isFreePlan = (userPlan || 'free').toLowerCase() === 'free'

    if (!isOpen) return null

    const handleGenerate = async () => {
        if (!title.trim()) { setError('Please enter a meeting title first.'); return }
        setError(null); setLoading(true); setAgenda(null); setShowUpgradePrompt(false)
        try {
            const res = await fetch(`${API_BASE}/api/ai/agenda-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ title: title.trim(), durationMinutes, context: context.trim(), userPlan })
            })
            const data = await res.json()
            if (res.status === 403 && data.code === 'UPGRADE_REQUIRED') { setShowUpgradePrompt(true); return }
            if (!res.ok || !data.success) { setError(data.message || 'Failed to generate agenda.'); return }
            setAgenda(data.data)
        } catch { setError('Network error — please check your connection.') }
        finally { setLoading(false) }
    }

    const handleCopyAll = () => {
        if (!agenda) return
        const text = [`MEETING AGENDA: ${title}`, `Goal: ${agenda.meetingGoal}`, '', 'AGENDA ITEMS:',
            ...agenda.agendaItems.map((item, i) => `${i + 1}. [${item.durationMin} min] ${item.title}${item.owner ? ` (${item.owner})` : ''}\n   ${item.description}`),
            '', 'PRE-READ:', ...agenda.preReadMaterials.map(m => `- ${m}`),
            '', 'HOST TIPS:', ...agenda.tipsForHost.map(t => `- ${t}`)
        ].join('\n')
        navigator.clipboard.writeText(text).then(() => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2500) })
    }

    const totalAgendaTime = agenda?.agendaItems.reduce((sum, item) => sum + item.durationMin, 0) || 0

    const overlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999999, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto', boxSizing: 'border-box' }
    const modal: React.CSSProperties = { background: 'linear-gradient(135deg,#0f1117 0%,#161b2e 100%)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 20, width: '100%', maxWidth: 660, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.7)', marginBottom: 24 }

    return createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={overlay}>
            <div style={modal}>
                {/* Header */}
                <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconSparkles />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>AI Meeting Agenda Generator</h2>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)' }}>Powered by Gemini AI · Pro & Enterprise feature</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa' }}><IconX /></button>
                </div>

                <div style={{ padding: '20px 24px' }}>
                    {/* Upgrade wall */}
                    {(isFreePlan || showUpgradePrompt) && (
                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 14, padding: '16px 18px', marginBottom: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔒</span>
                            <div>
                                <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fbbf24', fontSize: '0.88rem' }}>Pro / Enterprise Feature</p>
                                <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                    AI Agenda Generator is available on <strong style={{ color: '#f59e0b' }}>Pro</strong> and <strong style={{ color: '#a78bfa' }}>Enterprise</strong> plans. Upgrade to generate smart agendas, pre-reads, and expert host tips.
                                </p>
                                <button style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <IconZap /> Upgrade to Pro
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Meeting Title *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q4 Product Roadmap Planning, Engineering Sprint Review" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.875rem', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Duration</label>
                                <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}>
                                    {[15,30,45,60,90,120].map(m => <option key={m} value={m} style={{ background: '#1a1f2e' }}>{m} minutes</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Context / Goals (optional)</label>
                                <input value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. Focus on Q4 priorities, budget review needed" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.875rem', outline: 'none' }} />
                            </div>
                        </div>
                    </div>

                    {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: '0.8rem' }}>{error}</div>}

                    {/* Generate Button */}
                    <button onClick={handleGenerate} disabled={loading || isFreePlan} style={{ width: '100%', padding: '12px 20px', background: loading || isFreePlan ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: loading || isFreePlan ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
                        {loading ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'agy-spin 0.8s linear infinite' }} />Generating Agenda with AI...</> : <><IconSparkles /> ✨ Generate Agenda with AI</>}
                    </button>

                    {/* Agenda Result */}
                    {agenda && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Goal */}
                            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.28)', borderRadius: 12, padding: '14px 16px' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎯 Meeting Goal</p>
                                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.875rem', lineHeight: 1.5 }}>{agenda.meetingGoal}</p>
                            </div>

                            {/* Agenda Items */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>⏱ Agenda Items</p>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: totalAgendaTime <= durationMinutes ? '#34d399' : '#f87171', background: totalAgendaTime <= durationMinutes ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 6 }}>{totalAgendaTime} / {durationMinutes} min</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {agenda.agendaItems.map((item, idx) => (
                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '11px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                            <div style={{ minWidth: 44, height: 26, borderRadius: 6, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', flexShrink: 0 }}>{item.durationMin}m</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.85rem' }}>{item.title}</span>
                                                    {item.owner && <span style={{ fontSize: '0.66rem', fontWeight: 600, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', padding: '1px 7px', borderRadius: 4 }}>{item.owner}</span>}
                                                </div>
                                                <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }}>{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pre-read */}
                            {agenda.preReadMaterials.length > 0 && (
                                <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📚 Pre-Read Materials</p>
                                    {agenda.preReadMaterials.map((mat, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginBottom: 5 }}>
                                            <span style={{ color: '#34d399', marginTop: 2, flexShrink: 0 }}><IconCheck /></span>{mat}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Host Tips */}
                            {agenda.tipsForHost.length > 0 && (
                                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Tips for Host</p>
                                    {agenda.tipsForHost.map((tip, idx) => <p key={idx} style={{ margin: '0 0 4px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>· {tip}</p>)}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={handleCopyAll} style={{ flex: 1, padding: '9px 14px', background: copiedAll ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copiedAll ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: copiedAll ? '#34d399' : '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    {copiedAll ? <><IconCheck /> Copied!</> : <><IconFileText /> Copy Agenda</>}
                                </button>
                                {onAgendaApply && (
                                    <button onClick={() => { onAgendaApply(agenda); onClose() }} style={{ flex: 1, padding: '9px 14px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <IconCheck /> Apply to Meeting
                                    </button>
                                )}
                                <button onClick={() => { setAgenda(null); setError(null) }} style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <style>{`@keyframes agy-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>,
        document.body
    )
}
