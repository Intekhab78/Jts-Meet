import React from 'react'
import { IconPhone, IconX } from '../../../components/common/Icons'
import { IncomingCallModal, type IncomingCallData } from '../../meeting/components/IncomingCallModal'
import { OutgoingCallModal, type OutgoingCallData } from '../../meeting/components/OutgoingCallModal'
import { ActiveAudioCallModal, type ActiveCallData } from '../../meeting/components/ActiveAudioCallModal'
import { BroadcastNotice } from '../workspace.types'

interface WorkspaceModalsProps {
    impersonatedOrgName: string | null
    onExitSupportMode: () => void
    activeBroadcast: BroadcastNotice | null
    dismissedBroadcast: boolean
    onDismissBroadcast: () => void
    showDirectDialModal: boolean
    onCloseDirectDial: () => void
    directDialTarget: string
    setDirectDialTarget: (target: string) => void
    onStartDirectCall: (targetId: string) => void
    outgoingCall: OutgoingCallData | null
    onCancelOutgoingCall: () => void
    incomingCall: IncomingCallData | null
    onAcceptCall: (call: IncomingCallData) => void
    onDeclineCall: (call: IncomingCallData) => void
    activeAudioCall: ActiveCallData | null
    onEndActiveAudioCall: () => void
    onUpgradeToVideo: () => void
    showNotificationPrompt: boolean
    onDismissPrompt: () => void
    onSubscribePrompt: () => void
}

export function WorkspaceModals({
    impersonatedOrgName,
    onExitSupportMode,
    activeBroadcast,
    dismissedBroadcast,
    onDismissBroadcast,
    showDirectDialModal,
    onCloseDirectDial,
    directDialTarget,
    setDirectDialTarget,
    onStartDirectCall,
    outgoingCall,
    onCancelOutgoingCall,
    incomingCall,
    onAcceptCall,
    onDeclineCall,
    activeAudioCall,
    onEndActiveAudioCall,
    onUpgradeToVideo,
    showNotificationPrompt,
    onDismissPrompt,
    onSubscribePrompt
}: WorkspaceModalsProps) {
    return (
        <>
            {/* ENTERPRISE TENANT SUPPORT IMPERSONATION BANNER */}
            {impersonatedOrgName && (
                <div style={{
                    background: 'linear-gradient(90deg, #9a3412 0%, #ea580c 50%, #9a3412 100%)',
                    color: '#ffffff',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 60,
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.2rem' }}>👁️</span>
                        <span>
                            <strong>ENTERPRISE SUPPORT SESSION:</strong> Currently acting on behalf of organization <u>{impersonatedOrgName}</u>.
                        </span>
                    </div>
                    <button
                        onClick={onExitSupportMode}
                        style={{
                            background: '#ffffff',
                            color: '#9a3412',
                            border: 'none',
                            padding: '5px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span>Exit Support Mode & Return to Platform Center</span>
                        <span>✕</span>
                    </button>
                </div>
            )}

            {/* Global Platform Broadcast Alert Banner */}
            {activeBroadcast && activeBroadcast.active && !dismissedBroadcast && (
                <div style={{
                    background: activeBroadcast.severity === 'critical'
                        ? 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)'
                        : activeBroadcast.severity === 'warning'
                        ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#fff',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    zIndex: 40,
                    position: 'relative',
                    borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <span style={{ fontSize: '1.1rem' }}>
                            {activeBroadcast.severity === 'critical' ? '🚨' : activeBroadcast.severity === 'warning' ? '⚠️' : '📢'}
                        </span>
                        <span style={{ lineHeight: 1.4 }}>{activeBroadcast.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onDismissBroadcast}
                        title="Dismiss notification"
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        <IconX size={12} />
                    </button>
                </div>
            )}

            {/* 1-on-1 Direct Dialing Modal */}
            {showDirectDialModal && (
                <div className="modal-overlay">
                    <div className="modal-container anim-scale-in" style={{ maxWidth: 440 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconPhone size={18} color="#6366f1" /> Direct Ring Colleague
                            </h3>
                            <button onClick={onCloseDirectDial} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconX size={16} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                            Enter your colleague's User ID to ring their workspace with real-time audio chime signaling.
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); onStartDirectCall(directDialTarget) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input
                                type="text"
                                required
                                value={directDialTarget}
                                onChange={(e) => setDirectDialTarget(e.target.value)}
                                placeholder="Colleague User ID (e.g. 64f1a...)"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" onClick={onCloseDirectDial} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}>Cancel</button>
                                <button type="submit" disabled={!directDialTarget.trim()} className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                                    <IconPhone size={15} color="#ffffff" /> Call Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Outgoing Call Ringing Modal (Caller Side) */}
            <OutgoingCallModal
                call={outgoingCall}
                onCancel={onCancelOutgoingCall}
            />

            {/* Global Incoming Call Ringing Modal (Callee Side) */}
            <IncomingCallModal
                call={incomingCall}
                onAccept={onAcceptCall}
                onDecline={onDeclineCall}
            />

            {/* Live 1-on-1 Teams Audio Call Modal */}
            <ActiveAudioCallModal
                call={activeAudioCall}
                onEndCall={onEndActiveAudioCall}
                onUpgradeToVideo={onUpgradeToVideo}
            />

            {/* Background Incoming Call Push Notifications Permission Toast */}
            {showNotificationPrompt && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    background: '#13151f',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    maxWidth: 420,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>Enable Call Alerts</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
                            Receive incoming video and audio call alerts even when your browser tab is closed.
                        </div>
                    </div>
                    <button
                        onClick={onSubscribePrompt}
                        style={{
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Enable
                    </button>
                    <button
                        onClick={onDismissPrompt}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <IconX size={16} />
                    </button>
                </div>
            )}
        </>
    )
}
