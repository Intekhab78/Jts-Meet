import React, { useEffect, useState } from 'react'
import { startOutgoingRingback, stopOutgoingRingback } from '../services/chime.service'
import { IconPhone, IconPhoneOff, IconVideo, IconMonitor } from '../../../components/common/Icons'

export interface OutgoingCallData {
    meetingId: string
    targetUserId: string
    targetName: string
    targetAvatar?: string
    callType?: 'video' | 'audio' | 'screenshare'
    status?: 'calling' | 'ringing' | 'declined' | 'no_answer' | 'offline'
}

interface OutgoingCallModalProps {
    call: OutgoingCallData | null
    onCancel: () => void
}

export function OutgoingCallModal({ call, onCancel }: OutgoingCallModalProps) {
    const [secondsElapsed, setSecondsElapsed] = useState(0)

    useEffect(() => {
        if (!call) {
            stopOutgoingRingback()
            setSecondsElapsed(0)
            return
        }

        if (call.status === 'calling' || call.status === 'ringing') {
            startOutgoingRingback()
        } else {
            stopOutgoingRingback()
        }

        const timer = setInterval(() => {
            setSecondsElapsed(prev => prev + 1)
        }, 1000)

        return () => {
            clearInterval(timer)
            stopOutgoingRingback()
        }
    }, [call?.status, call?.meetingId])

    if (!call) return null

    const isTerminated = call.status === 'declined' || call.status === 'no_answer'

    const getStatusText = () => {
        switch (call.status) {
            case 'declined':
                return 'Call declined'
            case 'no_answer':
                return 'Unavailable (No answer)'
            case 'offline':
                return 'User is offline. Ringing...'
            case 'calling':
                return 'Connecting...'
            case 'ringing':
            default:
                return 'Ringing...'
        }
    }

    const formatSeconds = (sec: number) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 10000, backdropFilter: 'blur(10px)', background: 'rgba(5, 6, 10, 0.8)' }}>
            <div
                className="modal-container anim-scale-in"
                style={{
                    maxWidth: 380,
                    width: '90%',
                    padding: 'clamp(24px, 5vw, 36px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 20,
                    background: 'rgba(18, 20, 29, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 20,
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(98, 100, 167, 0.25)'
                }}
            >
                {/* Pulsing Outer Rings for Outgoing Call */}
                <div style={{ position: 'relative', width: 96, height: 96, marginTop: 8 }}>
                    {!isTerminated && (
                        <>
                            <div style={{
                                position: 'absolute',
                                inset: -14,
                                borderRadius: '50%',
                                border: '2px solid rgba(98, 100, 167, 0.4)',
                                animation: 'pulse 2s infinite ease-out'
                            }} />
                            <div style={{
                                position: 'absolute',
                                inset: -28,
                                borderRadius: '50%',
                                border: '1px solid rgba(98, 100, 167, 0.2)',
                                animation: 'pulse 2s 0.6s infinite ease-out'
                            }} />
                        </>
                    )}

                    {call.targetAvatar ? (
                        <img
                            src={call.targetAvatar}
                            alt={call.targetName}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isTerminated ? '3px solid #ef4444' : '3px solid #6264a7',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: isTerminated
                                ? 'linear-gradient(135deg, #ef4444, #991b1b)'
                                : 'linear-gradient(135deg, #6264a7, #464775)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.2rem',
                            fontWeight: 800,
                            color: '#fff',
                            border: isTerminated ? '3px solid #ef4444' : '3px solid #6264a7',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}>
                            {call.targetName ? call.targetName.charAt(0).toUpperCase() : 'C'}
                        </div>
                    )}
                </div>

                {/* Callee Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                        {call.targetName}
                    </h3>
                    
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: isTerminated ? '#f87171' : '#a5b4fc',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        {call.callType === 'audio' ? (
                            <IconPhone size={14} />
                        ) : call.callType === 'screenshare' ? (
                            <IconMonitor size={14} />
                        ) : (
                            <IconVideo size={14} />
                        )}
                        <span>{getStatusText()}</span>
                        {!isTerminated && (
                            <span style={{ opacity: 0.6, fontSize: '0.8125rem', marginLeft: 4 }}>
                                ({formatSeconds(secondsElapsed)})
                            </span>
                        )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                        JTS Meet {call.callType === 'audio' ? 'HD Audio Call' : call.callType === 'screenshare' ? 'Direct Screen Share' : 'HD Video Call'}
                    </div>
                </div>

                {/* Action Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                    {/* End / Cancel Call Button */}
                    <button
                        type="button"
                        onClick={onCancel}
                        title={isTerminated ? 'Close' : 'End Call'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '12px 28px',
                            borderRadius: 30,
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.9375rem',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <IconPhoneOff size={18} />
                        <span>{isTerminated ? 'Dismiss' : 'End Call'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
