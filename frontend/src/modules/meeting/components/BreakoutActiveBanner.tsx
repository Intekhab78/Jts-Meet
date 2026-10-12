import React from 'react'

export interface BreakoutActiveBannerProps {
    activeBreakoutSession: {
        isActive: boolean
        rooms: Array<{
            id: string
            name: string
            participantIds?: string[]
        }>
    } | null
    currentBreakoutSubRoomId: string | null
    canManage: boolean
    myUserId: string
    socketId?: string
    localUserId?: string
    onReturnToMain: () => void
    onJoinAssignedRoom: (room: { id: string; name: string }) => void
    onManageBreakout: () => void
}

export function BreakoutActiveBanner({
    activeBreakoutSession,
    currentBreakoutSubRoomId,
    canManage,
    myUserId,
    socketId,
    localUserId,
    onReturnToMain,
    onJoinAssignedRoom,
    onManageBreakout
}: BreakoutActiveBannerProps) {
    if (!activeBreakoutSession?.isActive) return null

    const currentSubRoom = activeBreakoutSession.rooms.find(r => r.id === currentBreakoutSubRoomId)

    const assignedRoom = !currentBreakoutSubRoomId ? activeBreakoutSession.rooms.find((r: any) =>
        r.participantIds?.includes(myUserId) ||
        (socketId && r.participantIds?.includes(socketId)) ||
        (localUserId && r.participantIds?.includes(localUserId))
    ) : null

    return (
        <div style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10002,
            background: 'rgba(88, 28, 135, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(192, 132, 252, 0.4)',
            borderRadius: 30,
            padding: '6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#fff',
            fontSize: '0.8125rem',
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(88, 28, 135, 0.5)'
        }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a855f7', animation: 'jts-pulse 1.5s infinite' }} />
            <span>
                {currentBreakoutSubRoomId
                    ? `In Breakout: ${currentSubRoom?.name || 'Sub-Room'}`
                    : `Main Session (${activeBreakoutSession.rooms.length} Breakout Rooms Active)`
                }
            </span>

            {currentBreakoutSubRoomId ? (
                <button
                    onClick={onReturnToMain}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff',
                        borderRadius: 20,
                        padding: '3px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                    title="Leave breakout room and return to main room"
                >
                    Return to Main
                </button>
            ) : (
                assignedRoom && (
                    <button
                        onClick={() => onJoinAssignedRoom(assignedRoom)}
                        style={{
                            background: '#c084fc',
                            border: 'none',
                            color: '#3b0764',
                            borderRadius: 20,
                            padding: '3px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                        title={`Join your assigned room: ${assignedRoom.name}`}
                    >
                        Join {assignedRoom.name}
                    </button>
                )
            )}

            {canManage && (
                <button
                    onClick={onManageBreakout}
                    style={{
                        background: '#c084fc',
                        border: 'none',
                        color: '#3b0764',
                        borderRadius: 20,
                        padding: '3px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    Manage
                </button>
            )}
        </div>
    )
}
