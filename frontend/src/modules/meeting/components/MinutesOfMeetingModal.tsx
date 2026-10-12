import React, { useState } from 'react'
import { copyToClipboard } from '../../../utils/clipboard'
import { IconFileText, IconX, IconCheck, IconCopy } from '../../../components/common/Icons'

export interface MinutesOfMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    timerStr: string
    attendeeCount: number
    messageCount: number
    actionItemCount?: number
    content: string
    meetingId: string
    addToast: (msg: string, type?: 'info' | 'success' | 'warning') => void
}

export function MinutesOfMeetingModal({
    isOpen,
    onClose,
    timerStr,
    attendeeCount,
    messageCount,
    actionItemCount = 3,
    content,
    meetingId,
    addToast
}: MinutesOfMeetingModalProps) {
    const [momCopied, setMomCopied] = useState(false)

    if (!isOpen) return null

    const handleCopy = async () => {
        await copyToClipboard(content)
        setMomCopied(true)
        addToast('MoM copied to clipboard!', 'success')
        setTimeout(() => setMomCopied(false), 2500)
    }

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `jts-minutes-of-meeting-${meetingId || 'session'}.md`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        addToast('Minutes (.md) downloaded successfully!', 'success')
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10005,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-xl)',
                    width: '100%',
                    maxWidth: '720px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IconFileText size={22} color="#818cf8" />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>
                                AI Minutes of Meeting (MoM) & Action Items
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Auto-synthesized meeting notes, attendance summary & deliverable task tracking
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        <IconX />
                    </button>
                </div>

                {/* Body - Formatted MoM */}
                <div style={{
                    padding: '20px 24px',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    {/* Key Stats Pill Bar */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 10
                    }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Call Duration</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{timerStr}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Attendees Logged</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{attendeeCount}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Chat Messages</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{messageCount}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Action Items</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: 2 }}>{actionItemCount} Active</div>
                        </div>
                    </div>

                    {/* Markdown text preview container */}
                    <div style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.8125rem',
                        color: '#e2e8f0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: '1.6',
                        overflowY: 'auto',
                        maxHeight: '380px'
                    }}>
                        {content}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)',
                    gap: 12
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Auto-generated by JTS-Meet Intelligence
                    </span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={momCopied ? "btn btn-success" : "btn btn-secondary"}
                            style={{
                                padding: '8px 14px',
                                fontSize: '0.8125rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: momCopied ? '#16a34a' : undefined,
                                borderColor: momCopied ? '#16a34a' : undefined,
                                color: '#fff',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {momCopied ? (
                                <>
                                    <IconCheck size={14} color="#fff" /> Copied!
                                </>
                            ) : (
                                <>
                                    <IconCopy size={14} /> Copy Text
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="btn btn-primary"
                            style={{ padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                        >
                            <span>⬇️</span> Download (.md)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
