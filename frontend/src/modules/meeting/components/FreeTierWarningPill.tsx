import React from 'react'
import { IconZap, IconX } from '../../../components/common/Icons'

interface FreeTierWarningPillProps {
    isWebinarAttendee: boolean
    isLowTimeWarning: boolean
    isWarningDismissed: boolean
    isWebinarMode: boolean
    isNetworkOffline: boolean
    networkStatus: string
    isReconnecting: boolean
    showRestoredNotice: boolean
    freeTimeRemaining: number
    formatRemainingTime: (sec: number) => string
    onUpgradePlanRequest?: () => void
    onDismiss: () => void
}

export const FreeTierWarningPill: React.FC<FreeTierWarningPillProps> = ({
    isWebinarAttendee,
    isLowTimeWarning,
    isWarningDismissed,
    isWebinarMode,
    isNetworkOffline,
    networkStatus,
    isReconnecting,
    showRestoredNotice,
    freeTimeRemaining,
    formatRemainingTime,
    onUpgradePlanRequest,
    onDismiss
}) => {
    if (isWebinarAttendee || !isLowTimeWarning || isWarningDismissed) return null

    const isNetBannerVisible = isNetworkOffline || networkStatus === 'offline' || networkStatus === 'reconnecting' || isReconnecting || showRestoredNotice
    const topPos = isWebinarMode ? (isNetBannerVisible ? 150 : 102) : (isNetBannerVisible ? 112 : 64)

    return (
        <div style={{
            position: 'absolute',
            top: topPos,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9990,
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: 9999,
            color: '#fff',
            padding: '4px 10px 4px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 14px rgba(220, 38, 38, 0.35)',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap'
        }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 1.2s infinite', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
                Meeting ends in <strong>{formatRemainingTime(freeTimeRemaining)}</strong>
            </span>
            <button
                type="button"
                onClick={() => {
                    if (onUpgradePlanRequest) {
                        onUpgradePlanRequest()
                    } else {
                        window.location.hash = '#organization'
                    }
                }}
                style={{
                    background: '#fff',
                    color: '#b91c1c',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '2px 9px',
                    fontWeight: 800,
                    fontSize: '0.6875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    flexShrink: 0
                }}
            >
                <IconZap size={11} color="#b91c1c" />
                <span>Upgrade</span>
            </button>
            <button
                type="button"
                onClick={onDismiss}
                style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                    marginLeft: 2
                }}
                title="Dismiss notification"
            >
                <IconX size={11} />
            </button>
        </div>
    )
}
