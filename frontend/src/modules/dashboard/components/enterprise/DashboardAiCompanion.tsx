import React from 'react'
import { AiResponseRenderer } from '../AiResponseRenderer'
import {
    IconSparkles,
    IconClock,
    IconZap,
    IconFileText,
    IconCalendar,
    IconEdit,
    IconPhone
} from '../../../../components/common/Icons'

interface DashboardAiCompanionProps {
    aiSummary: {
        summary: string
        highlights: string[]
        actionItems: string[]
        sentiment: string
    }
    isGeneratingAi: boolean
    handleGenerateAiRecap: () => Promise<void>
    completedActionItems: Record<number, boolean>
    setCompletedActionItems: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
    aiQuestion: string
    setAiQuestion: (val: string) => void
    handleAskAiCompanion: (e?: React.FormEvent, customQuestion?: string) => Promise<void>
    isAskingAi: boolean
    aiAnswer: string
    setAiAnswer: (val: string) => void
}

export const DashboardAiCompanion: React.FC<DashboardAiCompanionProps> = ({
    aiSummary,
    isGeneratingAi,
    handleGenerateAiRecap,
    completedActionItems,
    setCompletedActionItems,
    aiQuestion,
    setAiQuestion,
    handleAskAiCompanion,
    isAskingAi,
    aiAnswer,
    setAiAnswer
}) => {
    return (
        <div className="glass-card" style={{
            padding: 22,
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                    }}>
                        <IconSparkles size={18} color="#fff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                JTS AI Companion
                            </h3>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#c084fc', background: 'rgba(168, 85, 247, 0.2)', padding: '1px 8px', borderRadius: 9999 }}>
                                Powered by Gemini 3.6 Flash
                            </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                            Automated executive recaps, action items, and intelligent Q&A
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleGenerateAiRecap}
                    disabled={isGeneratingAi}
                    className="btn btn-secondary text-xs"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    {isGeneratingAi ? <IconClock size={13} /> : <IconZap size={13} />}
                    <span>{isGeneratingAi ? 'Analyzing Meeting...' : 'Regenerate Recap'}</span>
                </button>
            </div>

            {/* Executive Summary Box */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Executive Meeting Summary
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                        {aiSummary.sentiment}
                    </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#e4e4e7', margin: 0, lineHeight: 1.5 }}>
                    {aiSummary.summary}
                </p>
            </div>

            {/* Key Decisions Highlights */}
            <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <IconZap size={13} color="#818cf8" /> Key Decisions & Highlights
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aiSummary.highlights.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', color: '#d4d4d8' }}>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>•</span>
                            <span>{h}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Follow-Up Action Items */}
            <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <IconFileText size={13} color="#818cf8" /> Follow-Up Action Items
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aiSummary.actionItems.map((item, i) => {
                        const isDone = !!completedActionItems[i]
                        return (
                            <label
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: '0.78rem',
                                    color: isDone ? 'var(--color-text-muted)' : '#fff',
                                    textDecoration: isDone ? 'line-through' : 'none',
                                    cursor: 'pointer',
                                    background: isDone ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.03)',
                                    padding: '6px 10px',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isDone}
                                    onChange={(e) => setCompletedActionItems(prev => ({ ...prev, [i]: e.target.checked }))}
                                    style={{ accentColor: '#22c55e', cursor: 'pointer' }}
                                />
                                <span>{item}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* Quick Prompt Suggestions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                    { text: 'How can I create a meeting?', icon: <IconCalendar size={12} color="#a5b4fc" /> },
                    { text: 'What is my Personal Meeting Room (PMI)?', icon: <IconZap size={12} color="#a5b4fc" /> },
                    { text: 'Summarize pending action items', icon: <IconEdit size={12} color="#a5b4fc" /> },
                    { text: 'How to test audio and mic?', icon: <IconPhone size={12} color="#a5b4fc" /> }
                ].map((item, pIdx) => (
                    <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleAskAiCompanion(undefined, item.text)}
                        disabled={isAskingAi}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#c4b5fd',
                            fontSize: '0.7rem',
                            padding: '4px 10px',
                            borderRadius: 20,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                    >
                        {item.icon}
                        <span>{item.text}</span>
                    </button>
                ))}
            </div>

            {/* Ask AI Companion Input */}
            <form onSubmit={(e) => handleAskAiCompanion(e)} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask Gemini AI about meetings, schedules, features..."
                    style={{
                        flex: 1,
                        background: 'rgba(10, 11, 15, 0.8)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '0.78rem',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={isAskingAi}
                    style={{
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    {isAskingAi ? (
                        <>
                            <span style={{
                                width: 12,
                                height: 12,
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff',
                                borderRadius: '50%',
                                display: 'inline-block',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <span>Thinking...</span>
                        </>
                    ) : (
                        <>
                            <IconSparkles size={14} color="#fff" />
                            <span>Ask AI</span>
                        </>
                    )}
                </button>
            </form>

            {aiAnswer && (
                <AiResponseRenderer
                    content={aiAnswer}
                    onClear={() => setAiAnswer('')}
                />
            )}
        </div>
    )
}
