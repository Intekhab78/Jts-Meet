import React, { useState, useEffect } from 'react'
import { normalizeMediaUrl } from '../../config'
import { UserPresenceBadge, PresenceStatus } from './UserPresenceBadge'

interface UserAvatarProps {
    src?: string | null
    name?: string | null
    size?: number
    presence?: PresenceStatus | string
    customPresenceStatus?: string
    shape?: 'circle' | 'rounded'
    style?: React.CSSProperties
    className?: string
    fontSize?: string | number
    border?: string
}

// Preset modern vibrant gradient pairings for initials avatar
const GRADIENT_PALETTES = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo -> Purple
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', // Blue -> Teal
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink -> Rose
    'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', // Violet -> Fuchsia
    'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', // Sky -> Blue
    'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald -> Green
    'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', // Amber -> Orange
    'linear-gradient(135deg, #6264a7 0%, #464775 100%)', // MS Teams Purple/Navy
]

function getGradientForName(name?: string | null): string {
    if (!name) return GRADIENT_PALETTES[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % GRADIENT_PALETTES.length
    return GRADIENT_PALETTES[index]
}

function getInitials(name?: string | null): string {
    if (!name || !name.trim()) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.trim().slice(0, 2).toUpperCase()
}

export function UserAvatar({
    src,
    name,
    size = 36,
    presence,
    customPresenceStatus,
    shape = 'circle',
    style,
    className,
    fontSize,
    border
}: UserAvatarProps) {
    const [imgFailed, setImgFailed] = useState(false)
    const normalizedSrc = src ? normalizeMediaUrl(src) : ''

    useEffect(() => {
        setImgFailed(false)
    }, [src])

    const borderRadius = shape === 'circle' ? '50%' : '8px'
    const calculatedFontSize = fontSize || `${Math.max(10, Math.round(size * 0.38))}px`
    const initials = getInitials(name)
    const backgroundGradient = getGradientForName(name)

    const badgeSizeMap: Record<number, 'xs' | 'sm' | 'md' | 'lg'> = {
        24: 'xs',
        32: 'xs',
        36: 'xs',
        38: 'sm',
        40: 'sm',
        48: 'md',
        64: 'lg',
        72: 'lg'
    }
    const badgeSize = (badgeSizeMap[size] || (size < 36 ? 'xs' : size < 52 ? 'sm' : 'md'))

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
                borderRadius,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style
            }}
        >
            {normalizedSrc && !imgFailed ? (
                <img
                    src={normalizedSrc}
                    alt={name || 'User avatar'}
                    onError={() => setImgFailed(true)}
                    style={{
                        width: size,
                        height: size,
                        borderRadius,
                        objectFit: 'cover',
                        border: border || 'none',
                        display: 'block'
                    }}
                />
            ) : (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius,
                        background: backgroundGradient,
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: calculatedFontSize,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: border || 'none',
                        userSelect: 'none',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                >
                    {initials}
                </div>
            )}

            {presence && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        zIndex: 2
                    }}
                >
                    <UserPresenceBadge
                        status={presence}
                        customStatus={customPresenceStatus}
                        size={badgeSize}
                    />
                </div>
            )}
        </div>
    )
}
