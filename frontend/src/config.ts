const ONLINE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://meet.jtsmiddleeast.com'

const envUrl = import.meta.env.VITE_API_URL

// Check if we are running in the browser on localhost or a local private IP
const isLocalHostname = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]' ||
        /^10\./.test(window.location.hostname) ||
        /^192\.168\./.test(window.location.hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname))

// Construct default local URL dynamically based on the current hostname (e.g. http://10.127.173.94:4000)
const dynamicLocalUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000'

let detectedUrl = ONLINE_URL

if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local machine development: prioritize local server
        detectedUrl = (envUrl && !envUrl.includes('jtsonline.shop') && !envUrl.includes('jtsmiddleeast.com')) ? envUrl : 'http://localhost:4000'
    } else if (isLocalHostname) {
        // LAN IP testing (e.g. testing from mobile device on local Wi-Fi)
        detectedUrl = dynamicLocalUrl
    } else {
        // Online production (e.g. https://meet.jtsmiddleeast.com, vercel, etc.)
        // Never allow a localhost URL in online environment
        detectedUrl = (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1'))
            ? envUrl
            : window.location.origin
    }
} else {
    detectedUrl = import.meta.env.PROD ? ONLINE_URL : (envUrl || 'http://localhost:4000')
}

export const API_BASE = detectedUrl
export const SOCKET_URL = detectedUrl

export const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || ''
export const AZURE_TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || 'common'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export function normalizeMediaUrl(url: string | undefined | null): string {
    if (!url) return ''
    let cleaned = url.trim()

    if (cleaned.startsWith('data:') || cleaned.startsWith('blob:')) {
        return cleaned
    }

    if (typeof window !== 'undefined') {
        const isHttpsPage = window.location.protocol === 'https:'

        // 1. Replace http://localhost:4000 or http://127.0.0.1:4000 with API_BASE
        if (/^http:\/\/(localhost|127\.0\.0\.1):(4000|3000)/i.test(cleaned)) {
            cleaned = cleaned.replace(/^http:\/\/(localhost|127\.0\.0\.1):(4000|3000)/i, API_BASE)
        }

        // 2. If page is HTTPS and URL is HTTP, upgrade to HTTPS
        if (isHttpsPage && cleaned.startsWith('http://') && !cleaned.includes('localhost') && !cleaned.includes('127.0.0.1')) {
            cleaned = cleaned.replace(/^http:\/\//i, 'https://')
        }
    } else if (/^http:\/\/(localhost|127\.0\.0\.1):(4000|3000)/i.test(cleaned)) {
        cleaned = cleaned.replace(/^http:\/\/(localhost|127\.0\.0\.1):(4000|3000)/i, API_BASE)
    }

    // 3. If relative URL like /uploads/... or /api/..., prefix with API_BASE
    if (cleaned.startsWith('/uploads/') || cleaned.startsWith('/api/')) {
        cleaned = `${API_BASE}${cleaned}`
    } else if (cleaned.startsWith('uploads/')) {
        cleaned = `${API_BASE}/${cleaned}`
    }

    return cleaned
}


