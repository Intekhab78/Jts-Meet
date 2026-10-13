import React from 'react'
import { PresenceStatus } from '../../components/common/UserPresenceBadge'

export const POPULAR_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '🔥', '👏', '🙌', '👀', '💯', '🤔', '🙏']
export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😆', '😮', '😢', '👏']

export function formatBytes(bytes: number, decimals = 1): string {
    if (!+bytes) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatTimestamp(dateStr?: string | Date): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatDateSeparator(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function getResolvedPresence(
    presences: Record<string, { status: PresenceStatus; customStatus?: string }>,
    userId: string,
    defaultStatus?: string,
    defaultCustom?: string
): { status: PresenceStatus; customStatus: string } {
    if (presences[userId]) {
        return {
            status: presences[userId].status,
            customStatus: presences[userId].customStatus || ''
        }
    }
    return {
        status: (defaultStatus as PresenceStatus) || 'offline',
        customStatus: defaultCustom || ''
    }
}

export function getTeamsTabStyle(isActive: boolean): React.CSSProperties {
    return {
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? '3px solid #6264a7' : '3px solid transparent',
        color: isActive ? '#fff' : 'var(--color-text-secondary)',
        padding: '8px 4px',
        fontSize: '0.8125rem',
        fontWeight: isActive ? 800 : 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease'
    }
}

export const teamsHeaderActionBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    width: 32,
    height: 32,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
}

export const composerActionIconBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
}

export const formattingBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: '0.75rem',
    padding: '3px 6px',
    borderRadius: 4,
    cursor: 'pointer'
}
