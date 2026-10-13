import React from 'react'
import {
    IconFolder,
    IconPlus,
    IconEye,
    IconDownload,
    IconSparkles,
    IconFileText
} from '../../../components/common/Icons'
import { API_BASE } from '../../../config'
import { formatFileSize } from './FileCard'

interface ChannelFilesTabProps {
    files: any[]
    fileSearchQuery: string
    setFileSearchQuery: (query: string) => void
    uploadingFile: boolean
    channelName: string
    onUploadClick: () => void
    onPreviewFile: (preview: { name: string; url: string; size?: number }) => void
}

export const ChannelFilesTab: React.FC<ChannelFilesTabProps> = ({
    files,
    fileSearchQuery,
    setFileSearchQuery,
    uploadingFile,
    channelName,
    onUploadClick,
    onPreviewFile
}) => {
    const filteredFiles = files.filter(f => {
        if (!fileSearchQuery.trim()) return true
        const q = fileSearchQuery.toLowerCase()
        return (f.originalName || f.fileName || '').toLowerCase().includes(q) ||
            (f.uploadedBy?.fullName || '').toLowerCase().includes(q)
    })

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Channel Files & Shared Documents</span>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            {files.length} Files
                        </span>
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        All attachments, documents, and media shared in #{channelName}.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {files.length > 0 && (
                        <input
                            type="text"
                            placeholder="Filter files..."
                            value={fileSearchQuery}
                            onChange={(e) => setFileSearchQuery(e.target.value)}
                            className="input"
                            style={{
                                height: 32,
                                padding: '0 12px',
                                fontSize: '0.75rem',
                                borderRadius: 8,
                                width: 180,
                                background: 'rgba(255, 255, 255, 0.04)'
                            }}
                        />
                    )}

                    <button
                        type="button"
                        onClick={onUploadClick}
                        disabled={uploadingFile}
                        className="btn btn-primary"
                        style={{
                            height: 32,
                            padding: '0 14px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <IconPlus size={13} />
                        <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                    </button>
                </div>
            </div>

            {files.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconFolder size={36} color="#818cf8" style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                        No files uploaded yet
                    </div>
                    <p style={{ fontSize: '0.75rem', margin: '0 0 16px', maxWidth: 360, marginInline: 'auto' }}>
                        Drag & drop documents, PDFs, or design assets in the chat or click upload so your team can access them anytime.
                    </p>
                    <button
                        type="button"
                        onClick={onUploadClick}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: 8, cursor: 'pointer' }}
                    >
                        Upload Document Now
                    </button>
                </div>
            ) : filteredFiles.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No files match "{fileSearchQuery}".
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
                    <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>File Name</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Size</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Shared By</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFiles.map((file) => {
                                const uploader = file.uploadedBy?.fullName || 'Colleague'
                                const dateStr = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Recent'
                                const fileName = file.originalName || file.fileName || 'document'
                                const fileUrl = file.url || `${API_BASE}/api/file/${file._id}/download`

                                return (
                                    <tr
                                        key={file._id}
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                                        className="hover:bg-white/5"
                                        onClick={() => onPreviewFile({ name: fileName, url: fileUrl, size: file.size })}
                                    >
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {file.mimeType?.startsWith('image/') ? <IconSparkles size={16} color="#38bdf8" /> : fileName.endsWith('.pdf') ? <IconFileText size={16} color="#f87171" /> : <IconFileText size={16} color="#94a3b8" />}
                                                <span style={{ fontWeight: 600, color: '#fff' }}>{fileName}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                            {formatFileSize(file.size)}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#e4e4e7' }}>
                                            {uploader}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                            {dateStr}
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onPreviewFile({ name: fileName, url: fileUrl, size: file.size })
                                                    }}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        background: 'rgba(99, 102, 241, 0.15)',
                                                        border: '1px solid rgba(99, 102, 241, 0.35)',
                                                        color: '#c7c9ff',
                                                        fontWeight: 600,
                                                        fontSize: '0.72rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    title="Preview document"
                                                >
                                                    <IconEye size={13} />
                                                    <span>Preview</span>
                                                </button>

                                                <a
                                                    href={fileUrl}
                                                    download={fileName}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        color: '#e2e8f0',
                                                        textDecoration: 'none',
                                                        fontWeight: 600,
                                                        fontSize: '0.72rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    title="Download file"
                                                >
                                                    <IconDownload size={13} />
                                                    <span>Download</span>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
