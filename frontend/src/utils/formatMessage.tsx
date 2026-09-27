import React from 'react'

/**
 * Parses and renders rich formatted text:
 * - Markdown links [Label](url)
 * - Standalone URLs (https://...)
 * - Multiline code blocks (```code```)
 * - Bold (**bold**)
 * - Italic (*italic*)
 * - Strikethrough (~~strike~~)
 * - Inline code (`code`)
 * - Mentions (@username)
 */
export function renderFormattedMessage(content: string): React.ReactNode {
    if (!content) return null

    // Split on multiline code blocks first
    const codeBlockRegex = /```(?:([a-zA-Z0-9_\-#+]+)\n)?([\s\S]*?)```/g
    const blocks: React.ReactNode[] = []
    let lastIdx = 0
    let blockMatch: RegExpExecArray | null

    while ((blockMatch = codeBlockRegex.exec(content)) !== null) {
        if (blockMatch.index > lastIdx) {
            blocks.push(renderInlineFormatting(content.slice(lastIdx, blockMatch.index), `text-${lastIdx}`))
        }
        const lang = blockMatch[1] || 'code'
        const codeText = blockMatch[2]
        const blockKey = `code-${blockMatch.index}`

        blocks.push(
            <div
                key={blockKey}
                style={{
                    margin: '6px 0',
                    background: '#0d1117',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '3px 10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.6875rem',
                    color: '#94a3b8',
                    fontFamily: 'monospace'
                }}>
                    <span>{lang}</span>
                    <button
                        type="button"
                        onClick={() => {
                            try {
                                navigator.clipboard.writeText(codeText)
                            } catch (_) {}
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#818cf8', cursor: 'pointer', padding: '2px 4px', fontSize: '0.6875rem' }}
                    >
                        Copy
                    </button>
                </div>
                <pre style={{
                    margin: 0,
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    color: '#e2e8f0',
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
        blocks.push(renderInlineFormatting(content.slice(lastIdx), `text-${lastIdx}`))
    }

    return <>{blocks}</>
}

function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode {
    // Regex matching priority:
    // 1. Markdown link: \[([^\]]+)\]\(((?:https?:\/\/|#)[^\s\)]+)\)
    // 2. Raw URL: (https?:\/\/[^\s<)\]]+)
    // 3. Bold: (\*\*[^*]+?\*\*)
    // 4. Strikethrough: (~~[^~]+?~~)
    // 5. Italic: (\*[^*]+?\*)
    // 6. Inline code: (`[^`]+?`)
    // 7. Mention: (@[a-zA-Z0-9_\-]+)
    const tokenRegex = /(\[([^\]]+)\]\(((?:https?:\/\/|#)[^\s\)]+)\))|(https?:\/\/[^\s<)\]]+)|(\*\*[^*]+?\*\*)|(~~[^~]+?~~)|(\*[^*]+?\*)|(`[^`]+?`)|(@[a-zA-Z0-9_\-]+)/g

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index))
        }

        const [
            full,
            mdLink, mdLabel, mdUrl,
            rawUrl,
            bold,
            strike,
            italic,
            inlineCode,
            mention
        ] = match

        const k = `${keyPrefix}-${match.index}`

        if (mdLink && mdUrl) {
            parts.push(
                <a
                    key={k}
                    href={mdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                        if (mdUrl.startsWith('#')) {
                            e.preventDefault()
                            window.location.hash = mdUrl
                        }
                    }}
                    style={{
                        color: '#93c5fd',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        wordBreak: 'break-all',
                        cursor: 'pointer'
                    }}
                >
                    {mdLabel || mdUrl}
                </a>
            )
        } else if (rawUrl) {
            parts.push(
                <a
                    key={k}
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#93c5fd',
                        textDecoration: 'underline',
                        wordBreak: 'break-all',
                        cursor: 'pointer'
                    }}
                >
                    {rawUrl}
                </a>
            )
        } else if (bold) {
            parts.push(
                <strong key={k} style={{ color: '#fff', fontWeight: 800 }}>
                    {bold.slice(2, -2)}
                </strong>
            )
        } else if (strike) {
            parts.push(
                <del key={k} style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                    {strike.slice(2, -2)}
                </del>
            )
        } else if (italic) {
            parts.push(
                <em key={k} style={{ color: '#e2e8f0', fontStyle: 'italic' }}>
                    {italic.slice(1, -1)}
                </em>
            )
        } else if (inlineCode) {
            parts.push(
                <code
                    key={k}
                    style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#f43f5e',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '0.8rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    {inlineCode.slice(1, -1)}
                </code>
            )
        } else if (mention) {
            parts.push(
                <span
                    key={k}
                    style={{
                        background: 'rgba(99, 102, 241, 0.18)',
                        color: '#a5b4fc',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: '0.75rem'
                    }}
                >
                    {mention}
                </span>
            )
        }

        lastIndex = tokenRegex.lastIndex
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
    }

    return <React.Fragment key={keyPrefix}>{parts}</React.Fragment>
}

/**
 * Convert rich contenteditable HTML into clean, standard Markdown for storage
 */
export function htmlToMarkdown(html: string): string {
    if (!html || !html.trim()) return ''
    const temp = document.createElement('div')
    temp.innerHTML = html

    // Replace <b> and <strong> with **...**
    temp.querySelectorAll('b, strong').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `**${text}**` : ''))
    })
    // Replace <i> and <em> with *...*
    temp.querySelectorAll('i, em').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `*${text}*` : ''))
    })
    // Replace <strike>, <s>, <del> with ~~...~~
    temp.querySelectorAll('strike, s, del').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `~~${text}~~` : ''))
    })
    // Replace <code> with `...`
    temp.querySelectorAll('code').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `\`${text}\`` : ''))
    })
    // Replace <blockquote> with > ...
    temp.querySelectorAll('blockquote').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `\n> ${text}\n` : ''))
    })
    // Replace <li> with • ...
    temp.querySelectorAll('li').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `\n• ${text}` : ''))
    })
    // Replace <br> with \n
    temp.querySelectorAll('br').forEach(el => {
        el.replaceWith(document.createTextNode('\n'))
    })
    // Replace <div> and <p> with \n
    temp.querySelectorAll('div, p').forEach(el => {
        el.prepend(document.createTextNode('\n'))
    })

    return temp.textContent?.trim() || ''
}
