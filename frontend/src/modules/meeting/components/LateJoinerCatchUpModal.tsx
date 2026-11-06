import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API_BASE } from '../../../config'
import {
    IconSparkles,
    IconX,
    IconCheck,
    IconCopy,
    IconClock,
    IconRefresh
} from '../../../components/common/Icons'

export interface LateJoinerCatchUpModalProps {
    meetingTitle: string
    meetingId: string
    token?: string
    joinedMinutesLate?: number
    transcripts?: Array<{ speaker: string; text: string }>
    chatMessages?: Array<{ sender: string; text: string }>
    onClose: () => void
}

export function LateJoinerCatchUpModal({
    meetingTitle,
    meetingId,
    token,
    joinedMinutesLate = 5,
    transcripts = [],
    chatMessages = [],
    onClose
}: LateJoinerCatchUpModalProps) {
    const [loading, setLoading] = useState(true)
    const [bullets, setBullets] = useState<string[]>([])
    const [keyTakeaway, setKeyTakeaway] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const [lastAnalyzedCount, setLastAnalyzedCount] = useState<number>(0)

    const propsRef = useRef({
        meetingTitle,
        meetingId,
        token,
        transcripts,
        chatMessages
    })

    // Keep propsRef updated on every render
    propsRef.current = {
        meetingTitle,
        meetingId,
        token,
        transcripts,
        chatMessages
    }

    const fetchCatchUp = useCallback(async () => {
        setLoading(true)
        const { meetingTitle: title, transcripts: curTranscripts, chatMessages: curChat, token: propToken } = propsRef.current
        const activeToken = propToken || localStorage.getItem('token') || localStorage.getItem('jts_token') || sessionStorage.getItem('token') || sessionStorage.getItem('jts_token') || ''

        const curCount = (curChat?.length || 0) + (curTranscripts?.length || 0)
        setLastAnalyzedCount(curCount)

        // Dynamic fallback directly from real room data if network fails
        const lastChat = (curChat || []).slice(-1)[0]
        const lastTranscript = (curTranscripts || []).slice(-1)[0]
        const fallbackBullets = curChat && curChat.length > 0
            ? [
                `Recent message from ${lastChat?.sender || 'Participant'}: "${lastChat?.text || ''}"`,
                `Total ${curChat.length} message(s) shared in this meeting so far.`,
                `Session "${title || 'Meeting'}" discussion is actively progressing.`
            ]
            : [
                `Session "${title || 'Meeting'}" is live and ready for participation.`,
                'Audio, video, and collaboration channels are active.',
                'No previous conversation has been missed — you are in sync from the start.'
            ]
        const fallbackTakeaway = curChat && curChat.length > 0
            ? `Catch up with the ongoing discussion from ${lastChat?.sender || 'participants'}.`
            : `You are up to date! Unmute or type in chat to collaborate in "${title || 'Meeting'}".`

        try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 12000)

            const targetUrl = `${API_BASE || ''}/api/ai/catch-up`
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
                },
                body: JSON.stringify({
                    title: title || 'Meeting Session',
                    transcripts: curTranscripts || [],
                    chatMessages: curChat || []
                }),
                signal: controller.signal
            })

            clearTimeout(timer)

            if (res.ok) {
                const data = await res.json()
                if (data.data) {
                    setBullets(data.data.bullets && data.data.bullets.length > 0 ? data.data.bullets : fallbackBullets)
                    setKeyTakeaway(data.data.keyTakeaway || fallbackTakeaway)
                    return
                }
            }

            setBullets(fallbackBullets)
            setKeyTakeaway(fallbackTakeaway)
        } catch (err: any) {
            console.warn('[Catch Me Up] Fallback used:', err)
            setBullets(fallbackBullets)
            setKeyTakeaway(fallbackTakeaway)
        } finally {
            setLoading(false)
        }
    }, [])

    // Initial fetch on mount
    useEffect(() => {
        fetchCatchUp()
    }, [fetchCatchUp])

    const handleCopy = () => {
        const textToCopy = `Catch Me Up Recap — ${meetingTitle}\n\nKey Highlights:\n${bullets.map(b => `• ${b}`).join('\n')}\n\nTakeaway: ${keyTakeaway}`
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }).catch(() => {})
    }

    const totalCurrentCount = (chatMessages?.length || 0) + (transcripts?.length || 0)
    const hasNewContent = totalCurrentCount > lastAnalyzedCount

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(5, 7, 12, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflowY: 'auto',
                padding: '24px 16px',
                boxSizing: 'border-box'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 580,
                    margin: 'auto',
                    marginBottom: 24,
                    background: 'var(--color-surface-1, #12131a)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    borderRadius: 'var(--radius-xl, 18px)',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(168, 85, 247, 0.2)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '18px 22px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
                        }}>
                            <IconSparkles size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                Catch Me Up
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                                    AI COPILOT
                                </span>
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <IconClock size={12} /> Joined ~{joinedMinutesLate}m in • Real-time AI briefing of what was discussed so far
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={fetchCatchUp}
                            disabled={loading}
                            title="Refresh AI recap with latest dialogue & chat"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: 'rgba(168, 85, 247, 0.15)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                color: '#d8b4fe',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                                <IconRefresh size={13} />
                            </span>
                            <span>{loading ? 'Analyzing...' : 'Refresh'}</span>
                        </button>

                        <button
                            onClick={onClose}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <IconX size={15} />
                        </button>
                    </div>
                </div>

                {/* New Messages Alert Pill */}
                {hasNewContent && !loading && (
                    <div style={{
                        padding: '8px 16px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: '#c7d2fe'
                    }}>
                        <span>✨ New chat messages or speech detected in room!</span>
                        <button
                            onClick={fetchCatchUp}
                            style={{
                                background: '#6366f1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '3px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Update Recap
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
                            <div className="skeleton" style={{ height: 20, width: '70%', borderRadius: 6 }} />
                            <div className="skeleton" style={{ height: 16, width: '90%', borderRadius: 6 }} />
                            <div className="skeleton" style={{ height: 16, width: '85%', borderRadius: 6 }} />
                            <div className="skeleton" style={{ height: 16, width: '80%', borderRadius: 6 }} />
                            <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8125rem', color: '#c084fc', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <IconSparkles size={14} />
                                <span>Gemini AI is analyzing live dialogue & chat history...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                                    What you missed before joining:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {bullets.map((bullet, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 10,
                                                padding: '10px 14px',
                                                borderRadius: 10,
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)'
                                            }}
                                        >
                                            <span style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 6,
                                                background: 'rgba(168, 85, 247, 0.2)',
                                                color: '#c084fc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                flexShrink: 0,
                                                marginTop: 1
                                            }}>
                                                {idx + 1}
                                            </span>
                                            <span style={{ fontSize: '0.875rem', color: '#f1f5f9', lineHeight: 1.45 }}>
                                                {bullet}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {keyTakeaway && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: 12,
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4
                                }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Key Takeaway for You
                                    </div>
                                    <div style={{ fontSize: '0.84rem', color: '#e0f2fe', lineHeight: 1.45 }}>
                                        {keyTakeaway}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div style={{
                    padding: '14px 22px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={handleCopy}
                            disabled={loading || bullets.length === 0}
                            className="btn btn-secondary"
                            style={{
                                height: 36,
                                padding: '0 14px',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            {copied ? <IconCheck size={14} color="#4ade80" /> : <IconCopy size={14} />}
                            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                        </button>

                        <button
                            onClick={fetchCatchUp}
                            disabled={loading}
                            className="btn btn-secondary"
                            style={{
                                height: 36,
                                padding: '0 14px',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'rgba(255, 255, 255, 0.04)'
                            }}
                        >
                            <IconRefresh size={14} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{
                            height: 36,
                            padding: '0 20px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
                        }}
                    >
                        Jump into Meeting
                    </button>
                </div>
            </div>
        </div>
    )
}
