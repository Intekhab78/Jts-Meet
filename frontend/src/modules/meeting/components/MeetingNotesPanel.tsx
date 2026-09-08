import React, { useState, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'

interface MeetingNotesPanelProps {
    meetingId: string
    socket: Socket | null
    onClose: () => void
    authorName: string
}

export const MeetingNotesPanel: React.FC<MeetingNotesPanelProps> = ({
    meetingId,
    socket,
    onClose,
    authorName
}) => {
    const [notes, setNotes] = useState<string>(() => {
        return localStorage.getItem(`jts_notes_${meetingId}`) || `# Meeting Notes - ${new Date().toLocaleDateString()}\n\n- Key Discussion Points:\n  - \n\n- Action Items:\n  - [ ] `
    })
    const [lastUpdatedBy, setLastUpdatedBy] = useState<string>('')
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Listen to real-time notes updates from other participants
    useEffect(() => {
        if (!socket) return

        const handleNotesUpdate = (data: { content: string; updatedBy?: string; updatedAt?: string }) => {
            if (typeof data.content === 'string') {
                setNotes(data.content)
                localStorage.setItem(`jts_notes_${meetingId}`, data.content)
                if (data.updatedBy) setLastUpdatedBy(data.updatedBy)
                if (data.updatedAt) setLastUpdatedAt(new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
            }
        }

        socket.on('meeting:notes:update', handleNotesUpdate)
        return () => {
            socket.off('meeting:notes:update', handleNotesUpdate)
        }
    }, [socket, meetingId])

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setNotes(val)
        localStorage.setItem(`jts_notes_${meetingId}`, val)

        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current)
        updateTimeoutRef.current = setTimeout(() => {
            socket?.emit('meeting:notes:update', {
                meetingId,
                content: val
            })
        }, 500)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(notes).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    const handleDownload = () => {
        const blob = new Blob([notes], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Meeting-Notes-${meetingId}-${new Date().toISOString().slice(0, 10)}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div 
            className="side-panel anim-slide-left"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: 340,
                background: 'var(--color-surface-2)',
                borderLeft: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xl)',
                position: 'relative',
                zIndex: 30
            }}
        >
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>📝</span>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Meeting Notes
                        </h4>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                            {lastUpdatedBy ? `Last edit by ${lastUpdatedBy} at ${lastUpdatedAt}` : 'Real-time sync with all peers'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: 4,
                        borderRadius: 'var(--radius-sm)'
                    }}
                    title="Close Notes"
                >
                    ✕
                </button>
            </div>

            {/* Quick Action Toolbar */}
            <div style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.01)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <button
                    onClick={handleCopy}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}
                >
                    {copied ? '✓ Copied' : '📋 Copy Text'}
                </button>

                <button
                    onClick={handleDownload}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}
                >
                    ⬇ Export (.md)
                </button>
            </div>

            {/* Editor Area */}
            <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column' }}>
                <textarea
                    value={notes}
                    onChange={handleTextChange}
                    placeholder="Write meeting notes, key discussion points, or tasks here..."
                    style={{
                        width: '100%',
                        flex: 1,
                        background: 'rgba(10, 11, 15, 0.4)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 12,
                        color: 'var(--color-text-primary)',
                        fontFamily: 'monospace, sans-serif',
                        fontSize: '0.8125rem',
                        lineHeight: 1.6,
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </div>
        </div>
    )
}
