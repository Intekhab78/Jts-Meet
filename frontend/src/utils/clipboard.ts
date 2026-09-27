/**
 * Universal safe copy-to-clipboard utility.
 * Handles Electron native clipboard, modern navigator.clipboard with error handling,
 * and textarea execCommand fallback so it NEVER throws unhandled DOMExceptions.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false

    // 1. Electron Native Clipboard (100% reliable in desktop app)
    try {
        if (typeof window !== 'undefined' && window.electronAPI?.writeClipboardText) {
            window.electronAPI.writeClipboardText(text)
            return true
        }
    } catch {}

    // 2. Modern navigator.clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // Permission denied or blocked in iframe/unfocused window, fall through to fallback
        }
    }

    // 3. Fallback using temporary textarea + document.execCommand('copy')
    try {
        if (typeof document !== 'undefined') {
            const textarea = document.createElement('textarea')
            textarea.value = text
            textarea.style.position = 'fixed'
            textarea.style.left = '-9999px'
            textarea.style.top = '-9999px'
            textarea.style.opacity = '0'
            textarea.setAttribute('readonly', '')
            document.body.appendChild(textarea)
            textarea.focus()
            textarea.select()
            const successful = document.execCommand('copy')
            document.body.removeChild(textarea)
            return !!successful
        }
    } catch {}

    return false
}
