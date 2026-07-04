import type { FileMetadata } from '../file.types'

interface UploadedFileCardProps {
    file: FileMetadata
    token?: string
    onDelete?: (fileId: string) => Promise<void>
}

const FILE_TYPE_COLORS: Record<string, string> = {
    'application/pdf': '#ef4444',
    'application/msword': '#3b82f6',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#3b82f6',
    'application/vnd.ms-excel': '#22c55e',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#22c55e',
    'application/vnd.ms-powerpoint': '#f97316',
    'application/zip': '#a78bfa',
    'video/mp4': '#06b6d4',
    'audio/mpeg': '#ec4899',
}

function getMimeColor(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '#818cf8'
    return FILE_TYPE_COLORS[mimeType] ?? '#94a3b8'
}

function getExtFromMime(mimeType: string, filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase()
    return ext ?? mimeType.split('/')[1]?.toUpperCase().slice(0, 4) ?? 'FILE'
}

function formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${Math.round(bytes / 1024)} KB`
}

const IconExternalLink = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
)

const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
)

export function UploadedFileCard({ file, token, onDelete }: UploadedFileCardProps) {
    const handleDelete = async () => {
        if (!onDelete) return
        await onDelete(file._id)
    }

    const color = getMimeColor(file.mimeType)
    const ext = getExtFromMime(file.mimeType, file.originalName)

    return (
        <div
            className="glass-card-sm anim-slide-up"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                transition: 'border-color 150ms, background 150ms',
            }}
            onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.14)'
            }}
            onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)'
            }}
        >
            {/* File type icon */}
            <div style={{
                width: 40, height: 40,
                borderRadius: 'var(--radius-sm)',
                background: `${color}18`,
                border: `1px solid ${color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color, letterSpacing: '0.04em' }}>
                    {ext.slice(0, 4)}
                </span>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {file.originalName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>{formatSize(file.size)}</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span style={{ color }}>{ext}</span>
                    {file.contextType && (
                        <>
                            <span style={{ opacity: 0.5 }}>•</span>
                            <span>{file.contextType}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <a
                    href={file.secureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon"
                    style={{
                        padding: 7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                    }}
                    title="View file"
                    aria-label={`View ${file.originalName}`}
                >
                    <IconExternalLink />
                </a>
                {onDelete && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="btn-icon"
                        style={{ padding: 7, color: 'var(--color-text-muted)' }}
                        title="Delete file"
                        aria-label={`Delete ${file.originalName}`}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    >
                        <IconTrash />
                    </button>
                )}
            </div>
        </div>
    )
}
