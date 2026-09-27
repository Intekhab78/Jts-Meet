import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    IconFileText, IconPackage, IconMonitor, IconSparkles,
    IconDownload, IconX, IconCopy, IconCheck, IconEye
} from './Icons'

export interface PreviewDocument {
    name: string
    url: string
    size?: string | number
}

interface DocumentPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    file: PreviewDocument | null
}

function formatFileSizeStr(size?: string | number): string {
    if (!size) return ''
    if (typeof size === 'string') return size
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return `${parseFloat((size / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function DocumentPreviewModal({ isOpen, onClose, file }: DocumentPreviewModalProps) {
    const [textContent, setTextContent] = useState<string | null>(null)
    const [loadingText, setLoadingText] = useState(false)
    const [copied, setCopied] = useState(false)
    const [htmlViewMode, setHtmlViewMode] = useState<'code' | 'rendered'>('code')

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const ext = file?.name?.split('.').pop()?.toLowerCase() || ''
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
    const isPdf = ext === 'pdf'
    const isHtml = ['html', 'htm'].includes(ext)
    const isText = ['txt', 'md', 'json', 'csv', 'log', 'js', 'ts', 'jsx', 'tsx', 'py', 'css', 'scss', 'sql', 'sh', 'xml', 'yml', 'yaml', 'env'].includes(ext) || isHtml
    const isVideo = ['mp4', 'webm', 'mov', 'ogg'].includes(ext)
    const isAudio = ['mp3', 'wav', 'aac', 'm4a'].includes(ext)

    useEffect(() => {
        if (isOpen && file && isText) {
            setLoadingText(true)
            setTextContent(null)
            fetch(file.url)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load text')
                    return res.text()
                })
                .then(text => {
                    setTextContent(text)
                    setLoadingText(false)
                })
                .catch(err => {
                    console.error('Error fetching document text:', err)
                    setTextContent('Unable to preview content directly. Please download the file to view.')
                    setLoadingText(false)
                })
        } else {
            setTextContent(null)
        }
    }, [isOpen, file?.url, isText])

    if (!isOpen || !file || typeof document === 'undefined') return null

    const handleCopy = () => {
        if (!textContent) return
        navigator.clipboard.writeText(textContent).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }).catch(() => {})
    }

    const formattedSize = formatFileSizeStr(file.size)

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 999999,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                boxSizing: 'border-box'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#12131c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 14,
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
                    width: '100%',
                    maxWidth: isText || isPdf ? 920 : (isImage ? 960 : 640),
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'scaleIn 0.2s ease'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: isImage ? 'rgba(56, 189, 248, 0.15)' : (isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
                            border: `1px solid ${isImage ? '#38bdf8' : (isPdf ? '#ef4444' : '#818cf8')}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {isImage ? <IconSparkles size={18} color="#38bdf8" /> : (isPdf ? <IconFileText size={18} color="#f87171" /> : <IconFileText size={18} color="#a5b4fc" />)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {file.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: '#cbd5e1',
                                    textTransform: 'uppercase'
                                }}>
                                    {ext || 'FILE'}
                                </span>
                                {formattedSize && (
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                        {formattedSize}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* HTML View Switcher */}
                        {isHtml && textContent && (
                            <div style={{
                                display: 'flex',
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: 6,
                                padding: 2,
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setHtmlViewMode('code')}
                                    style={{
                                        background: htmlViewMode === 'code' ? '#6366F1' : 'transparent',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '3px 8px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Code
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHtmlViewMode('rendered')}
                                    style={{
                                        background: htmlViewMode === 'rendered' ? '#6366F1' : 'transparent',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '3px 8px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Live Preview
                                </button>
                            </div>
                        )}

                        {isText && textContent !== null && (
                            <button
                                type="button"
                                onClick={handleCopy}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    border: copied ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.12)',
                                    color: copied ? '#4ade80' : '#fff',
                                    borderRadius: 6,
                                    padding: '5px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                title="Copy text content"
                            >
                                {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                                <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                        )}

                        <a
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                background: 'rgba(99, 102, 241, 0.25)',
                                border: '1px solid rgba(99, 102, 241, 0.45)',
                                color: '#fff',
                                borderRadius: 6,
                                padding: '5px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <IconDownload size={13} /> Download
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: '#94a3b8',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                            title="Close"
                        >
                            <IconX size={15} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#090a10',
                    minHeight: 260,
                    maxHeight: '75vh'
                }}>
                    {isImage ? (
                        <img
                            src={file.url}
                            alt={file.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '72vh',
                                objectFit: 'contain',
                                borderRadius: 8
                            }}
                        />
                    ) : isText ? (
                        loadingText ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: '0.8125rem' }}>
                                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                                <span>Loading document content...</span>
                            </div>
                        ) : isHtml && htmlViewMode === 'rendered' ? (
                            <iframe
                                srcDoc={textContent || ''}
                                title={file.name}
                                sandbox="allow-scripts"
                                style={{
                                    width: '100%',
                                    height: '70vh',
                                    border: 'none',
                                    borderRadius: 8,
                                    background: '#fff'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                maxHeight: '70vh',
                                overflowY: 'auto',
                                background: '#0a0d14',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 8,
                                padding: '16px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: '0.8125rem',
                                lineHeight: 1.65,
                                color: '#e2e8f0',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                textAlign: 'left',
                                boxSizing: 'border-box'
                            }}>
                                {textContent}
                            </div>
                        )
                    ) : isPdf ? (
                        <iframe
                            src={file.url}
                            title={file.name}
                            style={{
                                width: '100%',
                                height: '72vh',
                                border: 'none',
                                borderRadius: 8,
                                background: '#fff'
                            }}
                        />
                    ) : isVideo ? (
                        <video
                            src={file.url}
                            controls
                            autoPlay
                            style={{
                                maxWidth: '100%',
                                maxHeight: '68vh',
                                borderRadius: 8
                            }}
                        />
                    ) : isAudio ? (
                        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <audio src={file.url} controls autoPlay style={{ width: 360 }} />
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 16,
                            padding: 32,
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: 64,
                                height: 64,
                                borderRadius: 16,
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <IconFileText size={32} color="#818cf8" />
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{file.name}</div>
                                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: 4 }}>
                                    Direct in-browser preview is not supported for this file format.
                                </div>
                            </div>
                            <a
                                href={file.url}
                                download={file.name}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                                }}
                            >
                                <IconDownload size={14} /> Download to View
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
