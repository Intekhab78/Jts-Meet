import React, { useState } from 'react'

interface AiResponseRendererProps {
    content: string
    onClear?: () => void
}

export const AiResponseRenderer: React.FC<AiResponseRendererProps> = ({ content, onClear }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (!content) return
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Helper to render inline formatting: **bold**, *italic*, `code`
    const renderInline = (text: string): React.ReactNode => {
        // Regex to split by bold (**...**), italic (*...*), or code (`...`)
        const parts: React.ReactNode[] = []
        let remaining = text

        // Replace bold and code markers cleanly
        const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g
        let lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = regex.exec(text)) !== null) {
            // Push preceding plain text
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index))
            }

            if (match[2]) {
                // **bold**
                parts.push(
                    <strong key={match.index} style={{ color: '#fff', fontWeight: 600 }}>
                        {match[2]}
                    </strong>
                )
            } else if (match[3]) {
                // `code`
                parts.push(
                    <code
                        key={match.index}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: '0.85em',
                            color: '#a5b4fc',
                            fontFamily: 'monospace'
                        }}
                    >
                        {match[3]}
                    </code>
                )
            } else if (match[4]) {
                // *italic*
                parts.push(
                    <em key={match.index} style={{ color: '#c7d2fe', fontStyle: 'italic' }}>
                        {match[4]}
                    </em>
                )
            }

            lastIndex = regex.lastIndex
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex))
        }

        return parts.length > 0 ? parts : text
    }

    // Parse blocks: split text by lines / double line breaks
    // Also handle cases where Gemini returns inline "### **1." or "---" without linebreaks
    const normalizeContent = (raw: string) => {
        // Insert clean linebreaks around headers and dividers if model generated inline
        let norm = raw
            .replace(/(###\s+)/g, '\n\n$1')
            .replace(/(\n?---\n?)/g, '\n\n---\n\n')
            .replace(/(\*\s*\*\*)/g, '\n* **')
            .replace(/(\s)(\d+\.\s+\*\*)/g, '\n$2')
            .replace(/(\*Tip:)/gi, '\n\n*Tip:')
        return norm
    }

    const lines = normalizeContent(content).split('\n').map(l => l.trim()).filter(Boolean)

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '14px 18px',
            fontSize: '0.8125rem',
            color: '#e2e8f0',
            lineHeight: 1.6,
            backdropFilter: 'blur(16px)',
            position: 'relative'
        }}>
            {/* Header bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 10,
                marginBottom: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: '#fff',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)'
                    }}>
                        ✨
                    </div>
                    <div>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', letterSpacing: '0.02em' }}>
                            JTS AI Companion
                        </span>
                        <span style={{
                            marginLeft: 8,
                            fontSize: '0.65rem',
                            background: 'rgba(99, 102, 241, 0.2)',
                            color: '#a5b4fc',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600
                        }}>
                            Gemini 3.6 Flash
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        type="button"
                        onClick={handleCopy}
                        style={{
                            background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                            border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                            color: copied ? '#4ade80' : '#d1d5db',
                            fontSize: '0.7rem',
                            padding: '4px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span>{copied ? '✓' : '📋'}</span>
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            title="Clear conversation"
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#9ca3af',
                                fontSize: '0.75rem',
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map((line, idx) => {
                    // Divider
                    if (line === '---' || line === '***') {
                        return (
                            <div
                                key={idx}
                                style={{
                                    height: 1,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    margin: '6px 0'
                                }}
                            />
                        )
                    }

                    // Headers: ### or ## or #
                    if (line.startsWith('#')) {
                        const cleanHeader = line.replace(/^#+\s*/, '')
                        return (
                            <div
                                key={idx}
                                style={{
                                    fontSize: '0.88rem',
                                    fontWeight: 700,
                                    color: '#c4b5fd',
                                    marginTop: idx > 0 ? 8 : 0,
                                    marginBottom: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span style={{ color: '#8b5cf6' }}>✦</span>
                                <span>{renderInline(cleanHeader)}</span>
                            </div>
                        )
                    }

                    // Tip callout
                    if (line.toLowerCase().startsWith('*tip:') || line.toLowerCase().startsWith('tip:')) {
                        const tipText = line.replace(/^[\*]?tip:\s*/i, '').replace(/\*$/, '')
                        return (
                            <div
                                key={idx}
                                style={{
                                    background: 'rgba(139, 92, 246, 0.12)',
                                    borderLeft: '3px solid #8b5cf6',
                                    borderRadius: '0 6px 6px 0',
                                    padding: '8px 12px',
                                    marginTop: 6,
                                    fontSize: '0.78rem',
                                    color: '#ddd6fe',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8
                                }}
                            >
                                <span style={{ fontSize: '0.9rem' }}>💡</span>
                                <div>
                                    <strong style={{ color: '#fff', marginRight: 4 }}>Pro Tip:</strong>
                                    {renderInline(tipText)}
                                </div>
                            </div>
                        )
                    }

                    // Bulleted item: * or -
                    if (line.startsWith('* ') || line.startsWith('- ')) {
                        const itemText = line.substring(2)
                        return (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    paddingLeft: 4,
                                    fontSize: '0.8rem'
                                }}
                            >
                                <span style={{ color: '#818cf8', fontWeight: 700, marginTop: 1 }}>•</span>
                                <div style={{ flex: 1 }}>{renderInline(itemText)}</div>
                            </div>
                        )
                    }

                    // Numbered steps: e.g. "1. Open your..." or "2. Click..."
                    const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
                    if (numMatch) {
                        const num = numMatch[1]
                        const stepText = numMatch[2]
                        return (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    paddingLeft: 2,
                                    fontSize: '0.8rem',
                                    background: 'rgba(255, 255, 255, 0.015)',
                                    padding: '6px 8px',
                                    borderRadius: 6
                                }}
                            >
                                <span style={{
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    color: '#a5b4fc',
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    lineHeight: '18px',
                                    minWidth: 20,
                                    textAlign: 'center'
                                }}>
                                    {num}
                                </span>
                                <div style={{ flex: 1 }}>{renderInline(stepText)}</div>
                            </div>
                        )
                    }

                    // Regular paragraph text
                    return (
                        <p
                            key={idx}
                            style={{
                                margin: 0,
                                fontSize: '0.8rem',
                                color: '#e2e8f0'
                            }}
                        >
                            {renderInline(line)}
                        </p>
                    )
                })}
            </div>
        </div>
    )
}
