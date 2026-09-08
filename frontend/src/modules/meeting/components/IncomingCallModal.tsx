import React, { useEffect } from 'react'
import { startRingtone, stopRingtone } from '../services/chime.service'

export interface IncomingCallData {
    meetingId: string
    callerId: string
    callerName: string
    callerAvatar?: string
    callType?: 'video' | 'audio'
}

interface IncomingCallModalProps {
    call: IncomingCallData | null
    onAccept: (call: IncomingCallData) => void
    onDecline: (call: IncomingCallData) => void
}

export function IncomingCallModal({ call, onAccept, onDecline }: IncomingCallModalProps) {
    useEffect(() => {
        if (call) {
            startRingtone()
        } else {
            stopRingtone()
        }
        return () => {
            stopRingtone()
        }
    }, [call])

    if (!call) return null

    const handleAccept = () => {
        stopRingtone()
        onAccept(call)
    }

    const handleDecline = () => {
        stopRingtone()
        onDecline(call)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-container anim-scale-in" style={{
                maxWidth: 380, padding: 'clamp(20px, 4vw, 28px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', gap: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(99,102,241,0.3)'
            }}>
                {/* Caller Avatar with Pulsing Halo */}
                <div style={{ position: 'relative', width: 88, height: 88 }}>
                    <div style={{
                        position: 'absolute', inset: -8, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0) 70%)',
                        animation: 'pulse 1.8s infinite'
                    }} />
                    {call.callerAvatar ? (
                        <img
                            src={call.callerAvatar}
                            alt={call.callerName}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-accent)' }}
                        />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', fontWeight: 800, color: '#fff', border: '3px solid var(--color-accent)'
                        }}>
                            {call.callerName ? call.callerName.charAt(0).toUpperCase() : 'C'}
                        </div>
                    )}
                </div>

                {/* Caller Info */}
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
                        {call.callerName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 600 }}>
                        <span>{call.callType === 'audio' ? '📞' : '📹'}</span>
                        <span>Incoming {call.callType === 'audio' ? 'Audio' : 'Video'} Call...</span>
                    </div>
                </div>

                {/* Call Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8 }}>
                    {/* Decline */}
                    <button
                        onClick={handleDecline}
                        title="Decline"
                        style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: '#ef4444', border: 'none', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'transform 0.15s ease',
                            boxShadow: '0 8px 20px rgba(239,68,68,0.4)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Accept */}
                    <button
                        onClick={handleAccept}
                        title="Accept Call"
                        style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: '#22c55e', border: 'none', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'transform 0.15s ease',
                            boxShadow: '0 8px 25px rgba(34,197,94,0.4)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
