import React, { useEffect } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../../../config'

interface WaitingRoomProps {
    meetingId: string
    guestToken: string
    guestName: string
    meetingTitle: string
    hostName: string
    onApproved: () => void
    onLeave: () => void
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ meetingId, guestToken, guestName, meetingTitle, hostName, onApproved, onLeave }) => {
    useEffect(() => {
        // Establish connection to wait for approval
        const socket = io(SOCKET_URL, {
            auth: { token: guestToken },
            transports: ['websocket']
        })

        socket.on('guest:approved', () => {
            socket.disconnect()
            onApproved()
        })

        socket.on('guest:denied', () => {
            alert('Your request to join was declined by the host.')
            socket.disconnect()
            onLeave()
        })

        return () => {
            socket.disconnect()
        }
    }, [guestToken, onApproved, onLeave])

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg-base)', color: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="glass-card" style={{ maxWidth: 460, width: '100%', padding: '40px 36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
                
                {/* Custom animated loader */}
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <div style={{
                        position: 'absolute', inset: 0, border: '4px solid rgba(79, 70, 229, 0.1)',
                        borderTopColor: '#4f46e5', borderRadius: '50%',
                        animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 12, border: '4px solid rgba(99, 102, 241, 0.1)',
                        borderBottomColor: '#6366f1', borderRadius: '50%',
                        animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse'
                    }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                        Waiting for host approval...
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        Someone in the meeting will let you in shortly.
                    </p>
                </div>

                <div style={{ width: '100%', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Meeting Name</span>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>{meetingTitle}</span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Organizer</span>
                        <span style={{ fontSize: '0.875rem', color: '#fff' }}>{hostName}</span>
                    </div>
                </div>

                <button
                    onClick={onLeave}
                    className="btn btn-ghost"
                    style={{
                        width: '100%', padding: '12px', border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
                    }}
                >
                    Cancel Request
                </button>
            </div>
        </div>
    )
}
