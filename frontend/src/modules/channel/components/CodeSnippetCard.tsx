import React, { useState } from 'react'
import type { CodeSnippet } from '../channel.types'

interface CodeSnippetCardProps {
    snippet: CodeSnippet
}

export function CodeSnippetCard({ snippet }: CodeSnippetCardProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(snippet.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy code:', err)
        }
    }

    return (
        <div
            style={{
                marginTop: 6,
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                background: '#0d0d11',
                overflow: 'hidden',
                maxWidth: 620,
                width: '100%',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)'
            }}
        >
            {/* Header bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span
                        style={{
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        {snippet.language || 'CODE'}
                    </span>
                    {snippet.title && (
                        <span
                            style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: '#e4e4e7',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {snippet.title}
                        </span>
                    )}
                </div>

                <button
                    onClick={handleCopy}
                    style={{
                        background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid ' + (copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'),
                        color: copied ? '#4ade80' : '#d4d4d8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease'
                    }}
                >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
            </div>

            {/* Code Body */}
            <div
                style={{
                    padding: '12px 16px',
                    overflowX: 'auto',
                    maxHeight: 320,
                    overflowY: 'auto'
                }}
            >
                <pre
                    style={{
                        margin: 0,
                        fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
                        fontSize: '0.8125rem',
                        lineHeight: '1.5',
                        color: '#7dd3fc',
                        whiteSpace: 'pre',
                        tabSize: 4
                    }}
                >
                    <code>{snippet.code}</code>
                </pre>
            </div>
        </div>
    )
}
