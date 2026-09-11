import React, { useState } from 'react'
import type { CodeSnippet } from '../channel.types'

interface CodeSnippetModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (snippet: CodeSnippet, caption?: string) => void
    channelName?: string
}

const SUPPORTED_LANGUAGES = [
    { id: 'javascript', label: 'JavaScript (JS)' },
    { id: 'typescript', label: 'TypeScript (TS)' },
    { id: 'python', label: 'Python (PY)' },
    { id: 'html', label: 'HTML / XML' },
    { id: 'css', label: 'CSS / SCSS' },
    { id: 'json', label: 'JSON' },
    { id: 'sql', label: 'SQL' },
    { id: 'bash', label: 'Bash / Shell' },
    { id: 'cpp', label: 'C / C++' },
    { id: 'java', label: 'Java' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
    { id: 'plaintext', label: 'Plain Text' }
]

export function CodeSnippetModal({
    isOpen,
    onClose,
    onSubmit,
    channelName
}: CodeSnippetModalProps) {
    const [language, setLanguage] = useState('javascript')
    const [title, setTitle] = useState('')
    const [code, setCode] = useState('')
    const [caption, setCaption] = useState('')

    if (!isOpen) return null

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) return

        onSubmit(
            {
                language,
                code: code.trim(),
                title: title.trim() || undefined
            },
            caption.trim() || undefined
        )

        setTitle('')
        setCode('')
        setCaption('')
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Allow Tab key to indent inside code editor
        if (e.key === 'Tab') {
            e.preventDefault()
            const target = e.currentTarget
            const start = target.selectionStart
            const end = target.selectionEnd
            const newCode = code.substring(0, start) + '    ' + code.substring(end)
            setCode(newCode)
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 4
            }, 0)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16
            }}
        >
            <div
                style={{
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: 720,
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 800
                            }}
                        >
                            {'</>'}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                                Share Code Snippet
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {channelName ? `Post into #${channelName}` : 'Format code with syntax styling'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleFormSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 14 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 6 }}>
                                Snippet Title (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. authMiddleware.ts or Database migration query"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    color: '#fff',
                                    fontSize: '0.8125rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 6 }}>
                                Language Syntax
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: '#18181b',
                                    color: '#fff',
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {SUPPORTED_LANGUAGES.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e4e4e7' }}>
                                Code Body <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                Press Tab to indent
                            </span>
                        </div>
                        <textarea
                            required
                            rows={12}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="// Paste your code snippet here...&#10;function helloWorld() {&#10;    console.log('Hello from JTS-Meet!');&#10;}"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                background: '#0a0a0c',
                                color: '#38bdf8',
                                fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
                                fontSize: '0.8125rem',
                                lineHeight: '1.5',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 6 }}>
                            Accompanying Note / Message (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Please review this endpoint before deploying"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                background: 'rgba(255, 255, 255, 0.04)',
                                color: '#fff',
                                fontSize: '0.8125rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Footer buttons */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 12,
                            marginTop: 8,
                            paddingTop: 16,
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!code.trim()}
                            style={{
                                padding: '8px 20px',
                                background: code.trim() ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                color: code.trim() ? '#fff' : 'var(--color-text-muted)',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                cursor: code.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: code.trim() ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none'
                            }}
                        >
                            <span>🚀</span> Post Snippet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
