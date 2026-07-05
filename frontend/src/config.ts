const LOCAL_URL = 'http://localhost:4000'
const ONLINE_URL = 'https://meetapi.jtsonline.shop'

const envUrl = import.meta.env.VITE_API_URL

let detectedUrl = envUrl || LOCAL_URL

if (!envUrl) {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 200) // 200ms quick ping check
        const response = await fetch(`${LOCAL_URL}/api/health`, { method: 'HEAD', signal: controller.signal })
            .catch(() => null)
        clearTimeout(timeoutId)
        
        if (!response) {
            // Local backend is not running, fallback to online backend
            detectedUrl = ONLINE_URL
        }
    } catch (err) {
        detectedUrl = ONLINE_URL
    }
}

export const API_BASE = detectedUrl
export const SOCKET_URL = detectedUrl

export const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || ''
export const AZURE_TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || 'common'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '891554409880-taebmj4jos83ab7d4sbbvrkuh5lg2j7j.apps.googleusercontent.com'

