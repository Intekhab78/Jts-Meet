import React from 'react'
import { IconInfo, IconCheck, IconZap } from '../../../components/common/Icons'

export interface NetworkStatusBannersProps {
    isNetworkOffline: boolean
    networkStatus: 'online' | 'offline' | 'reconnecting' | string
    isReconnecting: boolean
    showRestoredNotice: boolean
    lowBandwidthMode: boolean
    onRetryConnection: () => void
}

export function NetworkStatusBanners({
    isNetworkOffline,
    networkStatus,
    isReconnecting,
    showRestoredNotice,
    lowBandwidthMode,
    onRetryConnection
}: NetworkStatusBannersProps) {
    const isOfflineOrReconnecting = isNetworkOffline || networkStatus === 'offline' || networkStatus === 'reconnecting' || isReconnecting

    return (
        <>
            {/* Network Offline / Reconnection Banner (Unified Single Source of Truth) */}
            {isOfflineOrReconnecting && (
                <div style={{
                    position: 'fixed',
                    top: 66,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10002,
                    background: 'rgba(239, 68, 68, 0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    color: '#fff',
                    padding: '6px 18px',
                    borderRadius: 30,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.45)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    whiteSpace: 'nowrap'
                }}>
                    <span className="spinner-sm" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconInfo size={15} color="#fff" />
                        <span>
                            {isNetworkOffline || networkStatus === 'offline'
                                ? 'Network offline. Re-establishing connection…'
                                : 'Connection interrupted. Auto-reconnecting call…'}
                        </span>
                    </span>
                    <button
                        onClick={onRetryConnection}
                        style={{
                            background: '#fff',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: 20,
                            padding: '3px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease'
                        }}
                    >
                        Retry Now
                    </button>
                </div>
            )}

            {/* Connection Restored Success Banner */}
            {showRestoredNotice && !isOfflineOrReconnecting && (
                <div style={{
                    position: 'fixed',
                    top: 66,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10002,
                    background: 'rgba(34, 197, 94, 0.95)',
                    backdropFilter: 'blur(16px)',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: 30,
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconCheck size={14} color="#34d399" /> Connection restored
                    </span>
                </div>
            )}

            {/* Low-Bandwidth Mode Active HUD */}
            {lowBandwidthMode && (
                <div style={{
                    position: 'fixed',
                    top: 18,
                    left: 20,
                    zIndex: 9998,
                    background: 'rgba(16, 185, 129, 0.92)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <IconZap size={14} color="#ffffff" />
                    <span>Data Saver: Active (Incoming video paused)</span>
                </div>
            )}
        </>
    )
}
