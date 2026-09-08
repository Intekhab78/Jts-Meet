import React, { useState } from 'react'

interface RichChatContentProps {
    content: string
}

export function RichChatContent({ content }: RichChatContentProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    if (!content) return null

    // Check for code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g
    const parts: React.ReactNode[] = []
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIdx) {
            parts.push(renderInlineMarkdown(content.slice(lastIdx, match.index), (imgUrl) => setPreviewImage(imgUrl)))
        }

        const lang = match[1] || 'code'
        const codeText = match[2].trim()

        parts.push(
            <div
                key={match.index}
                style={{
                    margin: '8px 0',
                    background: '#0d1117',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'monospace'
                }}>
                    <span>{lang}</span>
                    <button
                        onClick={() => navigator.clipboard.writeText(codeText)}
                        className="btn-ghost text-xs"
                        style={{ border: 'none', background: 'transparent', color: 'var(--color-accent)', cursor: 'pointer', padding: 0 }}
                    >
                        Copy
                    </button>
                </div>
                <pre style={{
                    margin: 0,
                    padding: 12,
                    fontSize: '0.8125rem',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    color: '#e6edf3',
                    overflowX: 'auto',
                    whiteSpace: 'pre'
                }}>
                    {codeText}
                </pre>
            </div>
        )

        lastIdx = codeBlockRegex.lastIndex
    }

    if (lastIdx < content.length) {
        parts.push(renderInlineMarkdown(content.slice(lastIdx), (imgUrl) => setPreviewImage(imgUrl)))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {parts}

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    onClick={() => setPreviewImage(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 11000,
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out'
                    }}
                >
                    <img
                        src={previewImage}
                        alt="Enlarged preview"
                        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}
                    />
                </div>
            )}
        </div>
    )
}

function renderInlineMarkdown(text: string, onImageClick: (url: string) => void): React.ReactNode {
    // Regex for image links or data URLs: http...png|jpg|jpeg|gif|webp or [img](url)
    const urlOrImgRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp)|data:image\/[a-zA-Z]+;base64,[^\s]+)|(https?:\/\/[^\s]+)|(@[a-zA-Z0-9_\-]+)|(`[^`]+`)|(\*\*[^*]+\*\*)/gi

    const segments: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = urlOrImgRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push(text.substring(lastIndex, match.index))
        }

        const [full, imgUrl, linkUrl, mention, inlineCode, bold] = match

        if (imgUrl) {
            segments.push(
                <div key={match.index} style={{ margin: '6px 0' }}>
                    <img
                        src={imgUrl}
                        alt="Attached image"
                        onClick={() => onImageClick(imgUrl)}
                        style={{
                            maxWidth: 220, maxHeight: 180, borderRadius: 6,
                            border: '1px solid var(--color-border)', cursor: 'zoom-in',
                            objectFit: 'cover', display: 'block'
                        }}
                    />
                </div>
            )
        } else if (linkUrl) {
            segments.push(
                <a
                    key={match.index}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-accent)', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                    {linkUrl}
                </a>
            )
        } else if (mention) {
            segments.push(
                <span
                    key={match.index}
                    style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--color-accent)',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontWeight: 700
                    }}
                >
                    {mention}
                </span>
            )
        } else if (inlineCode) {
            segments.push(
                <code
                    key={match.index}
                    style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#f43f5e',
                        padding: '2px 5px',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem'
                    }}
                >
                    {inlineCode.slice(1, -1)}
                </code>
            )
        } else if (bold) {
            segments.push(
                <strong key={match.index} style={{ color: '#fff', fontWeight: 700 }}>
                    {bold.slice(2, -2)}
                </strong>
            )
        }

        lastIndex = urlOrImgRegex.lastIndex
    }

    if (lastIndex < text.length) {
        segments.push(text.substring(lastIndex))
    }

    return <React.Fragment key={text}>{segments}</React.Fragment>
}
