import React, { useState } from 'react'
import {
    IconFileText, IconPackage, IconMonitor, IconSparkles,
    IconSearch, IconDownload, IconEye
} from '../../../components/common/Icons'
import { DocumentPreviewModal } from '../../../components/common/DocumentPreviewModal'
import type { ChannelAttachment } from '../channel.types'
import { normalizeMediaUrl } from '../../../config'

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
    icon: React.ReactNode
    color: string
    bg: string
    borderColor: string
    label: string
    isImage: boolean
} {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || type === 'image') {
        return {
            icon: <IconSparkles size={20} color="#38bdf8" />,
            color: '#38bdf8',
            bg: 'rgba(56, 189, 248, 0.1)',
            borderColor: 'rgba(56, 189, 248, 0.25)',
            label: 'IMAGE',
            isImage: true
        }
    }
    if (['pdf'].includes(ext) || type === 'pdf') {
        return {
            icon: <IconFileText size={20} color="#f87171" />,
            color: '#f87171',
            bg: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            label: 'PDF',
            isImage: false
        }
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || type === 'sheet') {
        return {
            icon: <IconFileText size={20} color="#4ade80" />,
            color: '#4ade80',
            bg: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 0.25)',
            label: 'EXCEL',
            isImage: false
        }
    }
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext) || type === 'doc') {
        return {
            icon: <IconFileText size={20} color="#60a5fa" />,
            color: '#60a5fa',
            bg: 'rgba(96, 165, 250, 0.1)',
            borderColor: 'rgba(96, 165, 250, 0.25)',
            label: 'DOCUMENT',
            isImage: false
        }
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type === 'archive') {
        return {
            icon: <IconPackage size={20} color="#fbbf24" />,
            color: '#fbbf24',
            bg: 'rgba(251, 191, 36, 0.1)',
            borderColor: 'rgba(251, 191, 36, 0.25)',
            label: 'ARCHIVE',
            isImage: false
        }
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'sql', 'sh', 'env', 'yml', 'yaml', 'xml'].includes(ext) || type === 'code') {
        return {
            icon: <IconMonitor size={20} color="#c084fc" />,
            color: '#c084fc',
            bg: 'rgba(192, 132, 252, 0.1)',
            borderColor: 'rgba(192, 132, 252, 0.25)',
            label: 'CODE',
            isImage: false
        }
    }
    return {
        icon: <IconFileText size={20} color="#94a3b8" />,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.1)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        label: 'FILE',
        isImage: false
    }
}

export function FileCard({ attachment }: FileCardProps) {
    const [showPreview, setShowPreview] = useState(false)
    const category = getFileCategory(attachment.name, attachment.fileType)
    const normalizedUrl = normalizeMediaUrl(attachment.url)

    return (
        <>
            <div
                onClick={() => setShowPreview(true)}
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
                    transition: 'all 0.18s ease',
                    cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = category.color
                    e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = category.borderColor
                    e.currentTarget.style.transform = 'translateY(0)'
                }}
                title="Click to preview document"
            >
                {/* Image preview banner if image */}
                {category.isImage && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowPreview(true)
                        }}
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
                            src={normalizedUrl}
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
                            <IconSearch size={12} color="#fff" /> Click to zoom
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

                    {/* Actions: Icon-only Preview & Download buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowPreview(true)
                            }}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 7,
                                background: 'rgba(99, 102, 241, 0.18)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                color: '#c7c9ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)'
                            }}
                            title="Preview document"
                        >
                            <IconEye size={15} />
                        </button>

                        <a
                            href={normalizedUrl}
                            download={attachment.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 7,
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                            }}
                            title="Download file"
                        >
                            <IconDownload size={14} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                file={{
                    name: attachment.name,
                    url: normalizedUrl,
                    size: attachment.size
                }}
            />
        </>
    )
}
