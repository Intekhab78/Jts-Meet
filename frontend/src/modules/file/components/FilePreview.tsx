interface FilePreviewProps {
    file: File
    previewUrl: string
    onRemove: () => void
}

const FILE_TYPE_COLORS: Record<string, string> = {
    pdf:  '#ef4444',
    doc:  '#3b82f6', docx: '#3b82f6',
    xls:  '#22c55e', xlsx: '#22c55e',
    ppt:  '#f97316', pptx: '#f97316',
    zip:  '#a78bfa', rar:  '#a78bfa',
    mp4:  '#06b6d4', mov:  '#06b6d4',
    mp3:  '#ec4899',
    default: '#94a3b8',
}

function getExtColor(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    return FILE_TYPE_COLORS[ext] ?? FILE_TYPE_COLORS.default
}

const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

export function FilePreview({ file, previewUrl, onRemove }: FilePreviewProps) {
    const isImage = file.type.startsWith('image/')
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
    const extColor = getExtColor(file.name)
    const sizeKb = Math.round(file.size / 1024)
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)

    return (
        <div
            className="glass-card-sm anim-slide-up"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
            }}
        >
            {/* Thumbnail or type badge */}
            <div style={{
                width: 44, height: 44,
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                flexShrink: 0,
                background: isImage ? 'transparent' : `${extColor}18`,
                border: `1px solid ${isImage ? 'var(--color-border)' : `${extColor}40`}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {isImage ? (
                    <img
                        src={previewUrl}
                        alt={file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{
                        fontSize: '0.625rem', fontWeight: 700,
                        color: extColor,
                        letterSpacing: '0.04em',
                    }}>
                        {ext.slice(0, 4)}
                    </span>
                )}
            </div>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.8125rem', fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {file.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {sizeKb > 1024 ? `${sizeMb} MB` : `${sizeKb} KB`}
                    <span style={{ margin: '0 5px', opacity: 0.5 }}>•</span>
                    <span style={{ color: extColor }}>{ext}</span>
                </div>
            </div>

            {/* Remove */}
            <button
                type="button"
                onClick={onRemove}
                className="btn-icon"
                aria-label={`Remove ${file.name}`}
                style={{ flexShrink: 0, padding: 6 }}
            >
                <IconX />
            </button>
        </div>
    )
}
