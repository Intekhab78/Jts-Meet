import { API_BASE } from '../config'

// Events for token state sync
type TokenRefreshedListener = (newToken: string) => void
type LogoutListener = () => void

const refreshListeners = new Set<TokenRefreshedListener>()
const logoutListeners = new Set<LogoutListener>()

export function onTokenRefreshed(listener: TokenRefreshedListener) {
    refreshListeners.add(listener)
    return () => refreshListeners.delete(listener)
}

export function onAuthLogout(listener: LogoutListener) {
    logoutListeners.add(listener)
    return () => logoutListeners.delete(listener)
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Silently refresh the access token via secure HTTP-Only cookie rotation
 */
export async function refreshAccessToken(): Promise<string | null> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise
    }

    isRefreshing = true
    refreshPromise = (async () => {
        try {
            const currentToken = localStorage.getItem('jts_token') || ''
            const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
                },
                credentials: 'include'
            })

            const data = await res.json()
            if (!res.ok || !data?.success) {
                // If token was revoked or refresh expired, broadcast logout
                if (res.status === 401) {
                    logoutListeners.forEach(listener => listener())
                }
                return null
            }

            const newToken = data.data?.accessToken || data.data?.token
            if (newToken) {
                localStorage.setItem('jts_token', newToken)
                refreshListeners.forEach(listener => listener(newToken))
                return newToken
            }
            return null
        } catch (err) {
            console.warn('[AuthClient] Silent token refresh failed:', err)
            return null
        } finally {
            isRefreshing = false
            refreshPromise = null
        }
    })()

    return refreshPromise
}

/**
 * Fetch wrapper that automatically injects Bearer token and
 * silently refreshes the token on 401 Unauthorized responses.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem('jts_token')
    const headers = new Headers(init?.headers || {})

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    const options: RequestInit = {
        ...init,
        headers,
        credentials: init?.credentials || 'include'
    }

    let response = await fetch(input, options)

    // If 401 Unauthorized, attempt a single silent refresh and replay
    if (response.status === 401) {
        const refreshedToken = await refreshAccessToken()
        if (refreshedToken) {
            headers.set('Authorization', `Bearer ${refreshedToken}`)
            response = await fetch(input, {
                ...options,
                headers
            })
        }
    }

    return response
}

/**
 * Parse JWT expiration time
 */
export function getJwtExpiryMs(token: string): number | null {
    try {
        const parts = token.split('.')
        if (parts.length < 2) return null
        const payload = JSON.parse(atob(parts[1]))
        if (payload && typeof payload.exp === 'number') {
            return payload.exp * 1000
        }
    } catch (_) {}
    return null
}
