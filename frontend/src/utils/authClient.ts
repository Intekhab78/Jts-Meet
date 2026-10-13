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

export function isUserInActiveMeeting(): boolean {
    if (typeof window === 'undefined') return false
    try {
        const hasMeetingHash = window.location.hash.startsWith('#meeting') || window.location.hash.includes('meeting')
        const hasMeetingPath = window.location.pathname.startsWith('/meet') || window.location.pathname.startsWith('/join')
        const hasMeetingJoined = sessionStorage.getItem('jts_meeting_joined') === 'true'
        const hasActiveMeetingId = !!sessionStorage.getItem('jts_active_meeting_id')
        const hasQueryId = window.location.search.includes('id=room-') || window.location.hash.includes('id=room-')
        return hasMeetingHash || hasMeetingPath || hasMeetingJoined || hasActiveMeetingId || hasQueryId
    } catch (_) {
        return false
    }
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
            const localRefreshToken = localStorage.getItem('jts_refresh_token') || ''
            const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
                },
                body: JSON.stringify({
                    refreshToken: localRefreshToken
                }),
                credentials: 'include'
            })

            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.success) {
                // If user is currently in a meeting, NEVER log out or remove tokens mid-meeting!
                if (isUserInActiveMeeting()) {
                    console.warn('[AuthClient] Token refresh failed but user is currently in an active meeting. Deferring logout until meeting finishes.')
                    try {
                        sessionStorage.setItem('jts_pending_logout', 'true')
                    } catch (_) {}
                    return null
                }

                // If token was revoked, missing (400), or refresh expired (401), broadcast logout
                if (res.status === 401 || res.status === 400) {
                    localStorage.removeItem('jts_token')
                    localStorage.removeItem('jts_refresh_token')
                    logoutListeners.forEach(listener => listener())
                }
                return null
            }

            const newToken = data.data?.accessToken || data.data?.token
            const newRefreshToken = data.data?.refreshToken
            if (newToken) {
                localStorage.setItem('jts_token', newToken)
                if (newRefreshToken) {
                    localStorage.setItem('jts_refresh_token', newRefreshToken)
                }
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
