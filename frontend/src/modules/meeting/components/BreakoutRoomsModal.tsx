import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'

export interface BreakoutRoomItem {
    name: string
    participantIds: string[]
}

interface ParticipantInfo {
    id: string
    name: string
}

interface BreakoutRoomsModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    socket: Socket | null
    participants: ParticipantInfo[]
    isHost: boolean
    activeBreakoutSession?: {
        isActive: boolean
        rooms: Array<{ id: string; name: string; participantIds: string[] }>
        endsAt: number | null
    } | null
}

const getInitials = (name: string): string => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const BreakoutRoomsModal: React.FC<BreakoutRoomsModalProps> = ({
    isOpen,
    onClose,
    meetingId,
    socket,
    participants,
    activeBreakoutSession
}) => {
    const [roomCount, setRoomCount] = useState<number>(2)
    const [timerMinutes, setTimerMinutes] = useState<number>(10)
    const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto')
    const [rooms, setRooms] = useState<BreakoutRoomItem[]>([])
    const [broadcastMsg, setBroadcastMsg] = useState('')

    // Initialize & distribute participants across rooms
    useEffect(() => {
        if (!isOpen) return

        const newRooms: BreakoutRoomItem[] = Array.from({ length: roomCount }, (_, i) => ({
            name: `Breakout Room ${i + 1}`,
            participantIds: []
        }))

        // Always distribute participants initially so rooms aren't empty
        if (participants && participants.length > 0) {
            participants.forEach((p, idx) => {
                const targetRoom = idx % roomCount
                newRooms[targetRoom].participantIds.push(p.id)
            })
        }

        setRooms(newRooms)
    }, [isOpen, roomCount, allocationMode, participants])

    if (!isOpen) return null

    const handleStartBreakout = () => {
        if (!socket || !meetingId) return

        socket.emit('breakout:create', {
            meetingId,
            rooms,
            timerMinutes: timerMinutes > 0 ? timerMinutes : undefined
        })
        onClose()
    }

    const handleCloseBreakout = () => {
        if (!socket || !meetingId) return
        socket.emit('breakout:close', { meetingId })
        onClose()
    }

    const handleSendBroadcast = (e: React.FormEvent) => {
        e.preventDefault()
        if (!socket || !meetingId || !broadcastMsg.trim()) return

        socket.emit('breakout:broadcast', {
            meetingId,
            message: broadcastMsg.trim()
        })
        setBroadcastMsg('')
    }

    const moveParticipant = (participantId: string, toRoomIdx: number) => {
        setRooms(prev => {
            const next = prev.map(r => ({
                ...r,
                participantIds: r.participantIds.filter(id => id !== participantId)
            }))
            if (next[toRoomIdx]) {
                next[toRoomIdx].participantIds.push(participantId)
            }
            return next
        })
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10005,
                background: 'rgba(5, 7, 12, 0.82)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 620,
                    maxHeight: '90vh',
                    background: 'rgba(16, 20, 29, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '24px',
                    boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'jts-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#ffffff'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: '20px 26px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(21, 26, 38, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
                                border: '1px solid rgba(168, 85, 247, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem'
                            }}
                        >
                            👥
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                                Breakout Rooms
                            </h3>
                            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                                Split meeting participants into smaller focused discussion groups
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#9ca3af',
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                            e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.color = '#9ca3af'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content Body */}
                <div style={{ padding: '22px 26px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {activeBreakoutSession?.isActive ? (
                        /* Active Breakout Management View */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div
                                style={{
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    background: 'rgba(168, 85, 247, 0.12)',
                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 16
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'jts-pulse 1.5s infinite' }} />
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#d8b4fe' }}>
                                            Breakout Rooms in Progress
                                        </h4>
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#e2e8f0' }}>
                                        {activeBreakoutSession.rooms.length} rooms active &bull; Ends at: {activeBreakoutSession.endsAt ? new Date(activeBreakoutSession.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'When Host Stops'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseBreakout}
                                    style={{
                                        background: '#ef4444',
                                        border: 'none',
                                        color: '#ffffff',
                                        borderRadius: '12px',
                                        padding: '9px 18px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                                >
                                    <span>🚪</span>
                                    <span>End Session</span>
                                </button>
                            </div>

                            {/* Broadcast message form */}
                            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>📢</span> Broadcast Announcement to All Rooms
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={broadcastMsg}
                                        onChange={(e) => setBroadcastMsg(e.target.value)}
                                        placeholder="e.g. 2 minutes remaining! Wrap up discussions."
                                        style={{
                                            flex: 1,
                                            background: '#202534',
                                            border: '1px solid rgba(255,255,255,0.14)',
                                            borderRadius: '12px',
                                            padding: '10px 14px',
                                            color: '#ffffff',
                                            fontSize: '0.8125rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!broadcastMsg.trim()}
                                        style={{
                                            background: '#9333ea',
                                            border: 'none',
                                            color: '#ffffff',
                                            borderRadius: '12px',
                                            padding: '0 20px',
                                            fontSize: '0.8125rem',
                                            fontWeight: 700,
                                            cursor: broadcastMsg.trim() ? 'pointer' : 'not-allowed',
                                            opacity: broadcastMsg.trim() ? 1 : 0.5,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        Send
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* Configuration Mode (Before Starting) */
                        <>
                            {/* Room Count & Timer controls */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                                {/* Room Count selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Number of Rooms
                                    </label>
                                    <div style={{ display: 'flex', gap: 6, background: '#111520', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {[2, 3, 4, 5].map((n) => {
                                            const isSelected = roomCount === n
                                            return (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    onClick={() => setRoomCount(n)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 0',
                                                        borderRadius: 10,
                                                        border: isSelected ? '1px solid rgba(168, 85, 247, 0.6)' : 'none',
                                                        background: isSelected ? 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)' : 'transparent',
                                                        color: isSelected ? '#ffffff' : '#9ca3af',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        boxShadow: isSelected ? '0 2px 10px rgba(147, 51, 234, 0.45)' : 'none'
                                                    }}
                                                >
                                                    {n}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Timer selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>⏰</span> Timer Duration
                                    </label>
                                    <div style={{ display: 'flex', gap: 6, background: '#111520', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {[5, 10, 15, 30].map((m) => {
                                            const isSelected = timerMinutes === m
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setTimerMinutes(m)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 0',
                                                        borderRadius: 10,
                                                        border: isSelected ? '1px solid rgba(168, 85, 247, 0.6)' : 'none',
                                                        background: isSelected ? 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)' : 'transparent',
                                                        color: isSelected ? '#ffffff' : '#9ca3af',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        boxShadow: isSelected ? '0 2px 10px rgba(147, 51, 234, 0.45)' : 'none'
                                                    }}
                                                >
                                                    {m}m
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Allocation Mode: Auto vs Manual */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Participant Assignment Mode
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {/* Auto option */}
                                    <button
                                        type="button"
                                        onClick={() => setAllocationMode('auto')}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 16,
                                            border: allocationMode === 'auto' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                                            background: allocationMode === 'auto' ? 'rgba(147, 51, 234, 0.18)' : 'rgba(255,255,255,0.03)',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.15s ease',
                                            boxShadow: allocationMode === 'auto' ? '0 4px 16px rgba(147,51,234,0.25)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '1.1rem' }}>✨</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: allocationMode === 'auto' ? '#c084fc' : '#ffffff' }}>
                                                Automatically
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#9ca3af' }}>
                                            Evenly split participants across {roomCount} rooms
                                        </p>
                                    </button>

                                    {/* Manual option */}
                                    <button
                                        type="button"
                                        onClick={() => setAllocationMode('manual')}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 16,
                                            border: allocationMode === 'manual' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                                            background: allocationMode === 'manual' ? 'rgba(147, 51, 234, 0.18)' : 'rgba(255,255,255,0.03)',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.15s ease',
                                            boxShadow: allocationMode === 'manual' ? '0 4px 16px rgba(147,51,234,0.25)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '1.1rem' }}>🎯</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: allocationMode === 'manual' ? '#c084fc' : '#ffffff' }}>
                                                Manually
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#9ca3af' }}>
                                            Customise and move members between rooms
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Room Preview & Assignment Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Room Distribution ({participants.length} Participants)
                                    </label>
                                    <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 600 }}>
                                        {participants.length > 0 ? `~${Math.ceil(participants.length / roomCount)} per room` : 'No attendees'}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                                    {rooms.map((r, rIdx) => (
                                        <div
                                            key={rIdx}
                                            style={{
                                                background: '#191f2e',
                                                border: '1px solid rgba(255,255,255,0.09)',
                                                borderRadius: '16px',
                                                padding: '14px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#a855f7' }}>📍</span>
                                                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff' }}>{r.name}</span>
                                                </div>
                                                <span style={{ fontSize: '0.7rem', background: 'rgba(168,85,247,0.22)', color: '#d8b4fe', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                                                    {r.participantIds.length} members
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                                                {r.participantIds.map(pId => {
                                                    const pInfo = participants.find(p => p.id === pId)
                                                    const displayName = pInfo?.name || pId
                                                    const initials = getInitials(displayName)
                                                    return (
                                                        <div
                                                            key={pId}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                background: 'rgba(255,255,255,0.04)',
                                                                borderRadius: 10,
                                                                padding: '6px 10px',
                                                                fontSize: '0.75rem',
                                                                color: '#e5e7eb',
                                                                border: '1px solid rgba(255,255,255,0.05)'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                                <div
                                                                    style={{
                                                                        width: 24,
                                                                        height: 24,
                                                                        borderRadius: '50%',
                                                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '0.625rem',
                                                                        fontWeight: 700,
                                                                        color: '#ffffff',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    {initials}
                                                                </div>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                                                                    {displayName}
                                                                </span>
                                                            </div>

                                                            {/* Room switch dropdown */}
                                                            {rooms.length > 1 && (
                                                                <select
                                                                    value={rIdx}
                                                                    onChange={(e) => moveParticipant(pId, Number(e.target.value))}
                                                                    style={{
                                                                        background: '#23293a',
                                                                        color: '#d8b4fe',
                                                                        border: '1px solid rgba(168,85,247,0.35)',
                                                                        borderRadius: 8,
                                                                        padding: '2px 8px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        outline: 'none'
                                                                    }}
                                                                >
                                                                    {rooms.map((_, idx) => (
                                                                        <option key={idx} value={idx}>
                                                                            Room {idx + 1}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                                {r.participantIds.length === 0 && (
                                                    <span style={{ fontSize: '0.725rem', color: '#6b7280', fontStyle: 'italic', padding: '6px 0' }}>
                                                        No participants in this room
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {!activeBreakoutSession?.isActive && (
                    <div
                        style={{
                            padding: '18px 26px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(21, 26, 38, 0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 12
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: '#9ca3af',
                                borderRadius: 14,
                                padding: '10px 20px',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ffffff'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#9ca3af'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleStartBreakout}
                            style={{
                                background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: 14,
                                padding: '10px 24px',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 4px 20px rgba(147, 51, 234, 0.45)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 6px 24px rgba(147, 51, 234, 0.65)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(147, 51, 234, 0.45)'
                            }}
                        >
                            <span>Start Breakout Rooms</span>
                            <span>&rarr;</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
