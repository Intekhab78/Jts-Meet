import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FileUploader } from '../../file/components/FileUploader'
import { listContextFiles, getFileDownloadUrl } from '../../file/file.service'
import type { FileMetadata } from '../../file/file.types'
import { normalizeMediaUrl } from '../../../config'

export interface FilesPanelProps {
    token: string
    meetingId: string
    socket?: any
    myDisplayName?: string
    onClose: () => void
}

const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const IconFolder = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
)

const IconDownload = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

const IconExternalLink = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
)

const IconSearch = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

const IconRefresh = ({ spinning }: { spinning?: boolean }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
            transition: 'transform 0.4s ease',
            animation: spinning ? 'spin 1s linear infinite' : 'none'
        }}
    >
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
)

const IconPlus = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileBadgeInfo(filename: string, mimeType?: string): { color: string; bg: string; label: string } {
    const ext = filename.split('.').pop()?.toUpperCase() || ''
    const mime = (mimeType || '').toLowerCase()

    if (ext === 'PDF' || mime.includes('pdf')) {
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'PDF' }
    }
    if (['DOC', 'DOCX'].includes(ext) || mime.includes('word')) {
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: 'DOC' }
    }
    if (['XLS', 'XLSX', 'CSV'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet')) {
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', label: ext || 'XLS' }
    }
    if (['PPT', 'PPTX'].includes(ext) || mime.includes('powerpoint') || mime.includes('presentation')) {
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'PPT' }
    }
    if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'].includes(ext) || mime.startsWith('image/')) {
        return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', label: ext || 'IMG' }
    }
    if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(ext) || mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) {
        return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', label: 'ZIP' }
    }
    if (['JS', 'TS', 'TSX', 'JSX', 'PY', 'HTML', 'CSS', 'JSON', 'SQL', 'C', 'CPP', 'JAVA', 'GO', 'RS'].includes(ext)) {
        return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', label: ext }
    }
    return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', label: ext || 'FILE' }
}

function formatUploadTime(dateStr?: string | Date): string {
    if (!dateStr) return ''
    try {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
        return ''
    }
}

export function FilesPanel({ token, meetingId, socket, myDisplayName, onClose }: FilesPanelProps) {
    const [files, setFiles] = useState<FileMetadata[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [refreshing, setRefreshing] = useState<boolean>(false)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [showUploader, setShowUploader] = useState<boolean>(false)
    const [notification, setNotification] = useState<string | null>(null)

    const fetchFiles = useCallback(async (isRefresh = false) => {
        if (!meetingId) return
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const list = await listContextFiles('meetingChat', meetingId, token)
            setFiles(list)
        } catch (err) {
            console.error('[FilesPanel] Failed to fetch shared files:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [meetingId, token])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    // Real-time listener for incoming files shared by any participant
    useEffect(() => {
        if (!socket) return

        const handleFileShared = (payload: { meetingId: string; file: any; senderName?: string }) => {
            if (payload.meetingId !== meetingId) return
            if (payload.file) {
                setFiles((prev) => {
                    const newId = payload.file._id || payload.file.id
                    if (prev.some(f => (f._id || (f as any).id) === newId)) return prev
                    return [payload.file, ...prev]
                })
                const sender = payload.senderName || 'A participant'
                setNotification(`📁 ${sender} shared "${payload.file.originalName || 'a file'}"`)
                setTimeout(() => setNotification(null), 4500)
            }
        }

        socket.on('meeting:file:shared', handleFileShared)
        return () => {
            socket.off('meeting:file:shared', handleFileShared)
        }
    }, [socket, meetingId])

    const handleUploadComplete = useCallback((newFiles: any[]) => {
        if (!newFiles || newFiles.length === 0) return

        setFiles((prev) => {
            const existingIds = new Set(prev.map(f => f._id || (f as any).id))
            const fresh = newFiles.filter(f => !existingIds.has(f._id || (f as any).id))
            return [...fresh, ...prev]
        })

        // Broadcast to all participants in this meeting room
        newFiles.forEach((file) => {
            socket?.emit('meeting:file:share', {
                meetingId,
                file,
                senderName: myDisplayName || 'A participant'
            })
        })

        setShowUploader(false)
        setNotification(`✅ ${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded & shared with all participants!`)
        setTimeout(() => setNotification(null), 4000)
    }, [meetingId, socket, myDisplayName])

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) return files
        const query = searchQuery.toLowerCase().trim()
        return files.filter(f => {
            const name = (f.originalName || '').toLowerCase()
            const uploader = (f.uploaderName || (f.uploadedBy as any)?.fullName || '').toLowerCase()
            return name.includes(query) || uploader.includes(query)
        })
    }, [files, searchQuery])

    return (
        <div
            className="side-panel"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxHeight: '100%',
                minHeight: 0,
                background: 'var(--color-surface, #0e121b)',
                color: '#fff',
                borderLeft: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                position: 'relative'
            } as React.CSSProperties}
        >
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* Notification Banner */}
            {notification && (
                <div
                    className="anim-fade-in"
                    style={{
                        position: 'absolute',
                        top: 54,
                        left: 12,
                        right: 12,
                        zIndex: 20,
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(99, 102, 241, 0.95))',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notification}
                    </span>
                    <button
                        onClick={() => setNotification(null)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 2,
                            marginLeft: 8
                        }}
                    >
                        <IconX />
                    </button>
                </div>
            )}

            {/* Panel Header */}
            <div
                className="side-panel-header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                    flexShrink: 0
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <IconFolder size={18} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                                Shared Files
                            </span>
                            <span style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                background: 'rgba(255,255,255,0.08)',
                                padding: '1px 7px',
                                borderRadius: 10,
                                color: '#94a3b8'
                            }}>
                                {files.length}
                            </span>
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                            Visible to all meeting participants
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        onClick={() => fetchFiles(true)}
                        disabled={refreshing}
                        className="btn-icon"
                        title="Refresh shared files"
                        aria-label="Refresh shared files"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.06)',
                            color: refreshing ? '#38bdf8' : '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <IconRefresh spinning={refreshing} />
                    </button>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        aria-label="Close panel"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <IconX />
                    </button>
                </div>
            </div>

            {/* Action Bar */}
            <div
                style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: 'rgba(255,255,255,0.015)',
                    flexShrink: 0
                }}
            >
                <button
                    onClick={() => setShowUploader(!showUploader)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '9px 14px',
                        borderRadius: '10px',
                        background: showUploader
                            ? 'rgba(255,255,255,0.08)'
                            : 'linear-gradient(135deg, #0284c7, #2563eb)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: showUploader ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.35)'
                    }}
                >
                    {showUploader ? (
                        <>
                            <IconX />
                            <span>Cancel Upload</span>
                        </>
                    ) : (
                        <>
                            <IconPlus />
                            <span>Share New File</span>
                        </>
                    )}
                </button>

                {/* Collapsible Uploader Zone */}
                {showUploader && (
                    <div
                        className="anim-slide-up"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '14px',
                            marginTop: 4
                        }}
                    >
                        <FileUploader
                            token={token}
                            contextType="meetingChat"
                            contextId={meetingId}
                            onUploadComplete={handleUploadComplete}
                        />
                    </div>
                )}

                {/* Search Bar (visible if 2 or more files exist) */}
                {files.length >= 2 && !showUploader && (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: 10, color: 'var(--color-text-muted, #94a3b8)', display: 'flex', pointerEvents: 'none' }}>
                            <IconSearch />
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search shared files…"
                            style={{
                                width: '100%',
                                padding: '7px 12px 7px 32px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.75rem',
                                outline: 'none'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: 2,
                                    display: 'flex'
                                }}
                            >
                                <IconX />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Files List Feed */}
            <div
                className="side-panel-body"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                }}
            >
                {loading ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '180px',
                        gap: 12,
                        color: 'var(--color-text-muted, #94a3b8)'
                    }}>
                        <IconRefresh spinning={true} />
                        <span style={{ fontSize: '0.8125rem' }}>Loading shared files…</span>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 16px',
                        textAlign: 'center',
                        color: 'var(--color-text-muted, #94a3b8)',
                        gap: 14
                    }}>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1px dashed rgba(56, 189, 248, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#38bdf8'
                        }}>
                            <IconFolder size={28} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                                {searchQuery ? 'No matching files found' : 'No files shared yet'}
                            </div>
                            <p style={{ fontSize: '0.75rem', lineHeight: 1.5, margin: 0, maxWidth: 260 }}>
                                {searchQuery
                                    ? `No files match "${searchQuery}". Try a different keyword.`
                                    : 'Files shared here are automatically accessible to everyone currently in this meeting.'}
                            </p>
                        </div>
                        {!showUploader && (
                            <button
                                onClick={() => setShowUploader(true)}
                                style={{
                                    marginTop: 6,
                                    padding: '7px 16px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    color: '#38bdf8',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                + Share First File
                            </button>
                        )}
                    </div>
                ) : (
                    filteredFiles.map((file) => {
                        const fileId = file._id || (file as any).id
                        const badge = getFileBadgeInfo(file.originalName, file.mimeType)
                        const rawUrl = file.secureUrl || getFileDownloadUrl(fileId)
                        const downloadUrl = normalizeMediaUrl(getFileDownloadUrl(fileId))
                        const viewUrl = normalizeMediaUrl(rawUrl)
                        const uploaderName = file.uploaderName || (file.uploadedBy as any)?.fullName || 'Participant'

                        return (
                            <div
                                key={fileId}
                                className="anim-slide-up"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    padding: '12px 14px',
                                    background: 'rgba(255,255,255,0.035)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    transition: 'all 0.18s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)'
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.055)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.035)'
                                }}
                            >
                                {/* Top: Icon + Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* File Type Badge */}
                                    <div
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: '8px',
                                            background: badge.bg,
                                            border: `1px solid ${badge.color}40`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '0.625rem', fontWeight: 800, color: badge.color, letterSpacing: '0.04em' }}>
                                            {badge.label.slice(0, 4)}
                                        </span>
                                    </div>

                                    {/* File Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: '0.8125rem',
                                                fontWeight: 600,
                                                color: '#f8fafc',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={file.originalName}
                                        >
                                            {file.originalName}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: '0.6875rem',
                                            color: 'var(--color-text-muted, #94a3b8)',
                                            marginTop: 3
                                        }}>
                                            <span style={{ fontWeight: 500 }}>{formatFileSize(file.size)}</span>
                                            <span style={{ opacity: 0.4 }}>•</span>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                Shared by <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{uploaderName}</strong>
                                            </span>
                                            {file.uploadedAt && (
                                                <>
                                                    <span style={{ opacity: 0.4 }}>•</span>
                                                    <span>{formatUploadTime(file.uploadedAt)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom: Action Buttons */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    paddingTop: 8,
                                    borderTop: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <a
                                        href={downloadUrl}
                                        download={file.originalName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            background: 'rgba(56, 189, 248, 0.12)',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            borderRadius: '7px',
                                            color: '#38bdf8',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease'
                                        }}
                                        title={`Download ${file.originalName}`}
                                    >
                                        <IconDownload />
                                        <span>Download</span>
                                    </a>

                                    <a
                                        href={viewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '7px',
                                            color: '#cbd5e1',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease'
                                        }}
                                        title={`Open preview of ${file.originalName}`}
                                    >
                                        <IconExternalLink />
                                        <span>Preview</span>
                                    </a>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
