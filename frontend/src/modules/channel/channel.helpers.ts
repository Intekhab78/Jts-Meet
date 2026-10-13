/**
 * Channel Utility & Helper Functions
 */

/**
 * Format timestamp into conversational date dividers: Today, Yesterday, or formatted date.
 */
export function formatMessageDateDivider(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
        return 'Today'
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    }
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
}

/**
 * Format seconds into mm:ss duration.
 */
export function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
}

/**
 * Convert rich contenteditable HTML into clean, standard Markdown for storage.
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
