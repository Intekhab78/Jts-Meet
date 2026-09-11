import React, { useState } from 'react'
import type { ChannelAttachment } from '../channel.types'

interface FileCardProps {
    attachment: ChannelAttachment
}

export function formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getFileCategory(name: string, type?: string): {
    icon: string
    color: string
    bg: string
    borderColor: string
    label: string
    isImage: boolean
} {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || type === 'image') {
        return {
            icon: '🖼️',
            color: '#38bdf8',
            bg: 'rgba(56, 189, 248, 0.1)',
            borderColor: 'rgba(56, 189, 248, 0.25)',
            label: 'IMAGE',
            isImage: true
        }
    }
    if (['pdf'].includes(ext) || type === 'pdf') {
        return {
            icon: '📕',
            color: '#f87171',
            bg: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            label: 'PDF',
            isImage: false
        }
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || type === 'sheet') {
        return {
            icon: '📗',
            color: '#4ade80',
            bg: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 0.25)',
            label: 'EXCEL',
            isImage: false
        }
    }
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext) || type === 'doc') {
        return {
            icon: '📘',
            color: '#60a5fa',
            bg: 'rgba(96, 165, 250, 0.1)',
            borderColor: 'rgba(96, 165, 250, 0.25)',
            label: 'DOCUMENT',
            isImage: false
        }
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type === 'archive') {
        return {
            icon: '📦',
            color: '#fbbf24',
            bg: 'rgba(251, 191, 36, 0.1)',
            borderColor: 'rgba(251, 191, 36, 0.25)',
            label: 'ARCHIVE',
            isImage: false
        }
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'sql', 'sh'].includes(ext) || type === 'code') {
        return {
            icon: '💻',
            color: '#c084fc',
            bg: 'rgba(192, 132, 252, 0.1)',
            borderColor: 'rgba(192, 132, 252, 0.25)',
            label: 'CODE',
            isImage: false
        }
    }
    return {
        icon: '📄',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.1)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        label: 'FILE',
        isImage: false
    }
}

export function FileCard({ attachment }: FileCardProps) {
    const [showLightbox, setShowLightbox] = useState(false)
    const category = getFileCategory(attachment.name, attachment.fileType)

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    border: `1px solid ${category.borderColor}`,
                    background: 'rgba(24, 24, 27, 0.75)',
                    backdropFilter: 'blur(12px)',
                    overflow: 'hidden',
                    maxWidth: 360,
                    width: '100%',
                    marginTop: 6,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                    transition: 'transform 0.18s ease, border-color 0.18s ease'
                }}
            >
                {/* Image preview banner if image */}
                {category.isImage && (
                    <div
                        onClick={() => setShowLightbox(true)}
                        style={{
                            width: '100%',
                            maxHeight: 180,
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer',
                            background: '#09090b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <img
                            src={attachment.url}
                            alt={attachment.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.25s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                            onError={(e) => {
                                // Fallback if image fails to load
                                (e.currentTarget as HTMLElement).style.display = 'none'
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                background: 'rgba(0, 0, 0, 0.65)',
                                backdropFilter: 'blur(6px)',
                                color: '#fff',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.6875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <span>🔍</span> Click to zoom
                        </div>
                    </div>
                )}

                {/* File Details bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        gap: 12
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <div
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: '8px',
                                background: category.bg,
                                border: `1px solid ${category.borderColor}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                flexShrink: 0
                            }}
                        >
                            {category.icon}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                                title={attachment.name}
                                style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {attachment.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span
                                    style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.5px',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: category.bg,
                                        color: category.color
                                    }}
                                >
                                    {category.label}
                                </span>
                                {attachment.size ? (
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                        {formatFileSize(attachment.size)}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Download button */}
                    <a
                        href={attachment.url}
                        download={attachment.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)'
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                        }}
                    >
                        <span>⬇️</span> Download
                    </a>
                </div>
            </div>

            {/* Fullscreen Lightbox Modal for Images */}
            {showLightbox && (
                <div
                    onClick={() => setShowLightbox(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        background: 'rgba(0, 0, 0, 0.88)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        cursor: 'zoom-out'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'default'
                        }}
                    >
                        <button
                            onClick={() => setShowLightbox(false)}
                            style={{
                                position: 'absolute',
                                top: -40,
                                right: 0,
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: 'none',
                                color: '#fff',
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                        <img
                            src={attachment.url}
                            alt={attachment.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)'
                            }}
                        />
                        <div
                            style={{
                                marginTop: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                color: '#fff',
                                fontSize: '0.875rem'
                            }}
                        >
                            <span style={{ fontWeight: 600 }}>{attachment.name}</span>
                            <a
                                href={attachment.url}
                                download={attachment.name}
                                style={{
                                    color: '#818cf8',
                                    textDecoration: 'underline',
                                    fontWeight: 600
                                }}
                            >
                                Download Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
