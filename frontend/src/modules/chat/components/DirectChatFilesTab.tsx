import React from 'react'
import {
    IconFolder,
    IconPlus,
    IconClock,
    IconFileText,
    IconEye,
    IconDownload
} from '../../../components/common/Icons'
import { SharedFileItem } from '../chat.types'
import { formatTimestamp } from '../chat.helpers'

interface DirectChatFilesTabProps {
    sharedFiles: SharedFileItem[]
    isUploadingFile: boolean
    onTriggerFileUpload: () => void
    onPreviewFile: (file: { name: string; url: string; size: string }) => void
}

export function DirectChatFilesTab({
    sharedFiles,
    isUploadingFile,
    onTriggerFileUpload,
    onPreviewFile
}: DirectChatFilesTabProps) {
    return (
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>
                        Shared Files
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78125rem', color: 'var(--color-text-muted)' }}>
                        All documents, presentations, and files shared in this chat
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onTriggerFileUpload}
                    disabled={isUploadingFile}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 6,
                        background: '#6264a7',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.78125rem',
                        fontWeight: 700,
                        cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                        opacity: isUploadingFile ? 0.7 : 1
                    }}
                >
                    {isUploadingFile ? <IconClock size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <IconPlus size={14} />}
                    <span>{isUploadingFile ? 'Uploading File...' : 'Share a File'}</span>
                </button>
            </div>

            {sharedFiles.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <IconFolder size={40} color="#6264a7" style={{ marginBottom: 12, opacity: 0.7 }} />
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>No files shared yet</div>
                    <p style={{ fontSize: '0.78125rem', maxWidth: 360, margin: '6px auto 16px' }}>
                        Files and documents sent in this conversation will be catalogued here for fast reference.
                    </p>
                    <button
                        type="button"
                        onClick={onTriggerFileUpload}
                        disabled={isUploadingFile}
                        style={{
                            padding: '7px 16px',
                            borderRadius: 6,
                            background: 'rgba(98, 100, 167, 0.25)',
                            border: '1px solid rgba(98, 100, 167, 0.5)',
                            color: '#c7c9ff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: isUploadingFile ? 0.7 : 1
                        }}
                    >
                        {isUploadingFile && <IconClock size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                        <span>{isUploadingFile ? 'Uploading File...' : 'Upload your first file'}</span>
                    </button>
                </div>
            ) : (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 10,
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78125rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Name</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Shared By</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Size</th>
                                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sharedFiles.map(file => (
                                <tr key={file.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <td style={{ padding: '12px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 6,
                                            background: 'rgba(98, 100, 167, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#a6a8f8'
                                        }}>
                                            <IconFileText size={16} />
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{file.name}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{file.senderName}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{formatTimestamp(file.date)}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{file.size}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => onPreviewFile({ name: file.name, url: file.url, size: file.size })}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    background: 'rgba(98, 100, 167, 0.25)',
                                                    border: '1px solid rgba(98, 100, 167, 0.45)',
                                                    color: '#c7c9ff',
                                                    fontWeight: 600,
                                                    fontSize: '0.71875rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <IconEye size={12} />
                                                <span>Preview</span>
                                            </button>
                                            <a
                                                href={file.url}
                                                download={file.name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    color: '#fff',
                                                    textDecoration: 'none',
                                                    fontWeight: 600,
                                                    fontSize: '0.71875rem'
                                                }}
                                            >
                                                <IconDownload size={12} />
                                                <span>Download</span>
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
