/**
 * Shared meeting helper functions and utilities
 */

export const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]))
    } catch (e) {
        return null
    }
}

export function createDummyVideoTrack(): MediaStreamTrack {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
        ctx.fillStyle = '#0a0b0f'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    const stream = (canvas as any).captureStream(1)
    const track = stream.getVideoTracks()[0]
    if (track) {
        ; (track as any).isDummy = true
    }
    return track
}

export function getInitials(name: string): string {
    if (!name) return '?'
    const clean = name.replace(/\s*\((Host|Guest|You|Participant|Co-Host|Direct Message)\)\s*/gi, '').trim()
    if (clean.toLowerCase().startsWith('guest_')) {
        return 'G'
    }
    const parts = clean.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)
    if (parts.length === 0 || !parts[0]) return '?'
    if (parts.length === 1) {
        return parts[0].slice(0, 1).toUpperCase()
    }
    const first = parts[0].slice(0, 1).toUpperCase()
    const last = parts[parts.length - 1].slice(0, 1).toUpperCase()
    return first + last
}

export function getUserIdFromToken(token: string): string {
    if (!token) return ''
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.id || payload.userId || payload._id || ''
    } catch (e) {
        return ''
    }
}

export function getAvatarGradient(name: string): string {
    if (!name) return 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)'

    // Hash function to get a consistent number
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Curated list of premium gradients
    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Purple
        'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink to Rose
        'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', // Sky to Blue
        'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald to Green
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber to Orange
        'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Violet to Deep Violet
        'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan to Dark Cyan
        'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'  // Rose to Dark Rose
    ]

    const index = Math.abs(hash) % gradients.length
    return gradients[index]
}

export function getFirstName(label: string): string {
    if (!label) return 'User'
    const clean = label.replace(/\s*\((Host|Guest|You|Participant|Co-Host|Direct Message)\)\s*/gi, '').trim()
    if (!clean || clean.toLowerCase() === 'me' || clean.toLowerCase() === 'you') return 'You'
    if (clean.toLowerCase().startsWith('guest_')) return 'Guest'
    const parts = clean.split(/\s+/)
    return parts[0] || clean
}
