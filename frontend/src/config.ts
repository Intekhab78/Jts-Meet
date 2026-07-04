const LOCAL_URL = 'http://localhost:4000'
const ONLINE_URL = 'https://meetapi.jtsonline.shop'

const envUrl = import.meta.env.VITE_API_URL

let detectedUrl = envUrl || LOCAL_URL

if (!envUrl) {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 200) // 200ms quick ping check
        const response = await fetch(`${LOCAL_URL}/api/auth/me`, { method: 'HEAD', signal: controller.signal })
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

