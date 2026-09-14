import React from 'react'

export type PresenceStatus = 'online' | 'busy' | 'away' | 'dnd' | 'in_meeting' | 'offline'

interface UserPresenceBadgeProps {
    status?: PresenceStatus | string
    customStatus?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    showLabel?: boolean
    interactive?: boolean
    onStatusChange?: (newStatus: PresenceStatus) => void
    style?: React.CSSProperties
}

export const PRESENCE_CONFIG: Record<PresenceStatus, {
    label: string
    color: string
    bg: string
    border: string
    iconChar?: string
}> = {
    online: {
        label: 'Available',
        color: '#22c55e',
        bg: '#22c55e',
        border: '#15803d'
    },
    busy: {
        label: 'Busy',
        color: '#ef4444',
        bg: '#ef4444',
        border: '#b91c1c'
    },
    in_meeting: {
        label: 'In a Meeting',
        color: '#c084fc',
        bg: '#a855f7',
        border: '#7e22ce'
    },
    away: {
        label: 'Away',
        color: '#eab308',
        bg: '#eab308',
        border: '#a16207'
    },
    dnd: {
        label: 'Do Not Disturb',
        color: '#f87171',
        bg: '#ef4444',
        border: '#991b1b',
        iconChar: '–'
    },
    offline: {
        label: 'Offline',
        color: '#94a3b8',
        bg: '#64748b',
        border: '#475569'
    }
}

export function UserPresenceBadge({
    status = 'offline',
    customStatus = '',
    size = 'sm',
    showLabel = false,
    style
}: UserPresenceBadgeProps) {
    const validStatus: PresenceStatus = (status && PRESENCE_CONFIG[status as PresenceStatus]) 
        ? (status as PresenceStatus) 
        : 'offline'
    const config = PRESENCE_CONFIG[validStatus]

    const dimensionMap = {
        xs: 7,
        sm: 9,
        md: 11,
        lg: 14
    }

    const dotSize = dimensionMap[size] || 9
    const isPulse = validStatus === 'in_meeting' || validStatus === 'online'

    const tooltipText = customStatus ? `${config.label} • "${customStatus}"` : config.label

    return (
        <span
            title={tooltipText}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                lineHeight: 1,
                userSelect: 'none',
                ...style
            }}
        >
            <span
                style={{
                    position: 'relative',
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    background: config.bg,
                    border: `1.5px solid var(--color-bg-base, #0a0b0f)`,
                    boxShadow: isPulse ? `0 0 6px ${config.color}88` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}
            >
                {config.iconChar && (
                    <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 900, lineHeight: 1 }}>
                        {config.iconChar}
                    </span>
                )}
            </span>
            {showLabel && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: config.color }}>
                    {config.label}
                    {customStatus ? ` - ${customStatus}` : ''}
                </span>
            )}
        </span>
    )
}
