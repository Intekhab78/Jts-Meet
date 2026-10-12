import React, { useState } from 'react'
import {
    IconX,
    IconBuilding,
    IconMail,
    IconMicOff,
    IconSparkles,
    IconCrown,
    IconVideo,
    IconEdit
} from '../../../components/common/Icons'
import { getAvatarGradient, getInitials } from '../utils/meetingHelpers'

export interface ParticipantsPanelProps {
    participants: string[]
    onClose: () => void
    spotlightUserId: string | null
    setSpotlightUserId: (userId: string | null) => void
    coHostIds: string[]
    setCoHostIds: (ids: string[]) => void
    renamedUsers: { [key: string]: string }
    setRenamedUsers: (users: { [key: string]: string }) => void
    addToast: (msg: string, type?: 'info' | 'success' | 'warning') => void
    hostId: string | null
    isLocalHost: boolean
    isLocked?: boolean
    onToggleLock?: () => void
    onMuteAll?: () => void
    isWatermarkEnabled?: boolean
    onToggleWatermark?: () => void
    onExportAttendance?: () => void
    onOpenAttendance?: () => void
    recordingAllowedUserIds?: string[]
    whiteboardAllowedUserIds?: string[]
    onTogglePermission?: (targetUserId: string, permission: 'recording' | 'whiteboard', enabled: boolean) => void
    onPromoteCoHost?: (userId: string, isPromoting: boolean) => void
    waitingGuests?: any[]
    onApproveGuest?: (socketId: string) => void
    onDenyGuest?: (socketId: string) => void
    onApproveAllGuests?: () => void
    isWaitingRoomActive?: boolean
    onToggleWaitingRoom?: (enabled: boolean) => void
    // Virtual Green Room props
    backstageUserIds?: string[]
    canUseBackstage?: boolean
    onStageStatusChange?: (targetUserId: string, isBackstage: boolean) => void
    onUpgradeRequired?: (feature: string) => void
}

export function ParticipantsPanel({
    participants, onClose, spotlightUserId, setSpotlightUserId,
    coHostIds, setCoHostIds, renamedUsers, setRenamedUsers, addToast,
    hostId, isLocalHost, isLocked, onToggleLock, onMuteAll,
    isWatermarkEnabled, onToggleWatermark, onExportAttendance, onOpenAttendance,
    recordingAllowedUserIds = [], whiteboardAllowedUserIds = [],
    onTogglePermission, onPromoteCoHost,
    waitingGuests = [], onApproveGuest, onDenyGuest, onApproveAllGuests,
    isWaitingRoomActive = true, onToggleWaitingRoom,
    backstageUserIds = [], canUseBackstage = false,
    onStageStatusChange, onUpgradeRequired
}: ParticipantsPanelProps) {
    const [search, setSearch] = useState('')
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const [isRenaming, setIsRenaming] = useState<string | null>(null)
    const [newName, setNewName] = useState('')

    const getParticipantName = (id: string) => {
        if (renamedUsers[id]) return renamedUsers[id]
        if (id.toLowerCase().startsWith('guest_')) return 'Guest'
        return id
    }

    const filtered = participants.filter(p => {
        const displayName = getParticipantName(p)
        return displayName.toLowerCase().includes(search.toLowerCase())
    })

    const handlePromote = (userId: string) => {
        const isCurrentlyCoHost = coHostIds.includes(userId)
        if (isCurrentlyCoHost) {
            setCoHostIds(coHostIds.filter(id => id !== userId))
            onPromoteCoHost?.(userId, false)
            addToast(`Removed Co-Host role from ${getParticipantName(userId)}`, 'info')
        } else {
            setCoHostIds([...coHostIds, userId])
            onPromoteCoHost?.(userId, true)
            addToast(`Promoted ${getParticipantName(userId)} to Co-Host`, 'success')
        }
        setActiveMenu(null)
    }

    const handleToggleRecordingPerm = (userId: string) => {
        const hasPerm = recordingAllowedUserIds.includes(userId)
        onTogglePermission?.(userId, 'recording', !hasPerm)
        addToast(
            !hasPerm
                ? `Granted recording permission to ${getParticipantName(userId)}`
                : `Revoked recording permission from ${getParticipantName(userId)}`,
            !hasPerm ? 'success' : 'info'
        )
        setActiveMenu(null)
    }

    const handleToggleWhiteboardPerm = (userId: string) => {
        const hasPerm = whiteboardAllowedUserIds.includes(userId)
        onTogglePermission?.(userId, 'whiteboard', !hasPerm)
        addToast(
            !hasPerm
                ? `Granted whiteboard access to ${getParticipantName(userId)}`
                : `Revoked whiteboard access from ${getParticipantName(userId)}`,
            !hasPerm ? 'success' : 'info'
        )
        setActiveMenu(null)
    }

    const handleSpotlight = (userId: string) => {
        if (spotlightUserId === userId) {
            setSpotlightUserId(null)
            addToast(`Removed Spotlight from ${getParticipantName(userId)}`, 'info')
        } else {
            setSpotlightUserId(userId)
            addToast(`Spotlighted ${getParticipantName(userId)}`, 'success')
        }
        setActiveMenu(null)
    }

    const handleRenameSubmit = (userId: string) => {
        if (newName.trim()) {
            setRenamedUsers({ ...renamedUsers, [userId]: newName.trim() })
            addToast(`Renamed participant to ${newName.trim()}`, 'success')
            setIsRenaming(null)
            setNewName('')
        }
    }

    const handleMute = (userId: string) => {
        addToast(`Requested ${getParticipantName(userId)} to mute`, 'warning')
        setActiveMenu(null)
    }

    return (
        <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0 } as React.CSSProperties}>
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title">Participants</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {participants.length + 1}
                    </span>
                    {onOpenAttendance && (
                        <button
                            onClick={onOpenAttendance}
                            title="View & Export Attendance Report"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                color: '#a5b4fc',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            <span>Report</span>
                        </button>
                    )}
                    <button className="btn-icon" onClick={onClose} aria-label="Close panel" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconX />
                    </button>
                </div>
            </div>

            {/* Search filter input */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)',
                            pointerEvents: 'none',
                            opacity: 0.75
                        }}
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search participants..."
                        style={{
                            width: '100%',
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px 8px 34px',
                            fontSize: '0.8125rem',
                            color: 'var(--color-text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* Host Quick-Action Toolbar */}
            {isLocalHost && (
                <div style={{
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: 4,
                    flexShrink: 0
                }}>
                    <button
                        onClick={onMuteAll}
                        style={{
                            padding: '6px 2px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fca5a5',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                        }}
                        title="Mute all participants' microphones"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Mute All</span>
                    </button>
                    <button
                        onClick={onToggleLock}
                        style={{
                            padding: '6px 2px',
                            background: isLocked ? 'rgba(245, 158, 11, 0.18)' : 'rgba(99, 102, 241, 0.12)',
                            border: isLocked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            color: isLocked ? '#fcd34d' : '#a5b4fc',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                        }}
                        title={isLocked ? "Unlock meeting to allow new participants" : "Lock meeting to reject new participants"}
                    >
                        {isLocked ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isLocked ? 'Unlock' : 'Lock'}</span>
                    </button>
                    <button
                        onClick={onToggleWatermark}
                        style={{
                            padding: '6px 2px',
                            background: isWatermarkEnabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                            border: isWatermarkEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: isWatermarkEnabled ? '#34d399' : '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                        }}
                        title={isWatermarkEnabled ? "Confidential Watermark is ON. Click to disable." : "Confidential Watermark is OFF. Click to enable."}
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isWatermarkEnabled ? 'Mark: ON' : 'Mark: OFF'}</span>
                    </button>
                    {onToggleWaitingRoom && (
                        <button
                            onClick={() => onToggleWaitingRoom(!isWaitingRoomActive)}
                            style={{
                                padding: '6px 2px',
                                background: isWaitingRoomActive ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                                border: isWaitingRoomActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 'var(--radius-sm)',
                                color: isWaitingRoomActive ? '#34d399' : '#fcd34d',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                transition: 'all 0.15s ease'
                            }}
                            title={isWaitingRoomActive ? "Waiting Room is ACTIVE: Host must approve attendees. Click to allow everyone without permission." : "Waiting Room is OFF: Anyone can join without approval. Click to require host approval."}
                        >
                            {isWaitingRoomActive ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            ) : (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                </svg>
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isWaitingRoomActive ? 'Wait: ON' : 'Open'}</span>
                        </button>
                    )}
                </div>
            )}

            <div className="side-panel-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px' }}>
                {/* Waiting Room Queue Section */}
                {isLocalHost && waitingGuests && waitingGuests.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <span>Waiting to Join ({waitingGuests.length})</span>
                            </span>
                            {waitingGuests.length > 1 && onApproveAllGuests && (
                                <button
                                    onClick={onApproveAllGuests}
                                    style={{
                                        padding: '4px 10px',
                                        background: 'var(--color-accent)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: '#fff',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Admit All
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {waitingGuests.map((g) => (
                                <div key={g.socketId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {g.guestName}
                                        </div>
                                        {(g.company || g.email) && (
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {g.company ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <IconBuilding size={11} /> {g.company}
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <IconMail size={11} /> {g.email}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button
                                            onClick={() => onDenyGuest?.(g.socketId)}
                                            style={{ padding: '4px 8px', fontSize: '0.6875rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            Deny
                                        </button>
                                        <button
                                            onClick={() => onApproveGuest?.(g.socketId)}
                                            style={{ padding: '4px 10px', fontSize: '0.6875rem', fontWeight: 600, color: '#fff', background: 'var(--color-accent)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            Admit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Local User card */}
                    <li className="glass-card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                        <div className="avatar avatar-md" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', fontWeight: 700 }}>ME</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>You</span>
                            {isLocalHost && (
                                <span className="badge badge-accent" style={{ marginLeft: 6, fontSize: '0.625rem', padding: '1px 5px' }}>Host</span>
                            )}
                        </div>
                        <span className="badge-dot success" style={{ width: 8, height: 8 }} />
                    </li>

                    {/* Remote User cards */}
                    {filtered.length === 0 && search && (
                        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '20px 0' }}>No participants match your search.</p>
                    )}

                    {filtered.map((p, i) => {
                        const displayName = getParticipantName(p)
                        const isCoHost = coHostIds.includes(p)
                        const isSpotlighted = spotlightUserId === p
                        const avatarBg = getAvatarGradient(displayName)

                        return (
                            <li
                                key={p}
                                className="anim-slide-up glass-card-sm"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    animationDelay: `${i * 40}ms`,
                                    position: 'relative',
                                    zIndex: activeMenu === p ? 60 : 1
                                }}
                            >
                                <div className="avatar avatar-md" style={{ background: avatarBg, color: '#fff', fontWeight: 700 }}>
                                    {getInitials(displayName)}
                                </div>

                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {isRenaming === p ? (
                                            <input
                                                type="text"
                                                defaultValue={displayName}
                                                onBlur={(e) => {
                                                    setNewName(e.target.value)
                                                    handleRenameSubmit(p)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setNewName(e.currentTarget.value)
                                                        handleRenameSubmit(p)
                                                    }
                                                }}
                                                autoFocus
                                                style={{
                                                    fontSize: '0.8125rem',
                                                    background: 'var(--color-surface-2)',
                                                    border: '1px solid var(--color-accent)',
                                                    color: '#fff',
                                                    padding: '2px 4px',
                                                    borderRadius: 4,
                                                    width: '100%'
                                                }}
                                            />
                                        ) : (
                                            <span style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: 'var(--color-text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {displayName}
                                            </span>
                                        )}
                                        {hostId && p === hostId && (
                                            <span className="badge badge-accent" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Host</span>
                                        )}
                                        {isCoHost && (
                                            <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Co-Host</span>
                                        )}
                                        {recordingAllowedUserIds.includes(p) && (
                                            <span className="badge" style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>Record</span>
                                        )}
                                        {whiteboardAllowedUserIds.includes(p) && (
                                            <span className="badge" style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.4)' }}>Board</span>
                                        )}
                                        {isSpotlighted && (
                                            <span className="badge badge-accent" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Spotlight</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Participant</span>
                                </div>

                                {/* Menu trigger */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => setActiveMenu(activeMenu === p ? null : p)}
                                        style={{ width: 28, height: 28, color: 'var(--color-text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                                        aria-label="Actions menu"
                                    >
                                        ⋮
                                    </button>
                                </div>

                                {/* Contextual Host Options Dropdown */}
                                {activeMenu === p && (
                                    <>
                                        {/* Invisible backdrop overlay to dismiss dropdown on click outside */}
                                        <div
                                            onClick={() => setActiveMenu(null)}
                                            style={{
                                                position: 'fixed',
                                                inset: 0,
                                                zIndex: 99,
                                                cursor: 'default'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', right: 14, top: 44,
                                            background: '#11131a', border: '1px solid rgba(255, 255, 255, 0.16)',
                                            borderRadius: 'var(--radius-md)', padding: 6, zIndex: 100,
                                            width: 185, backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            boxShadow: '0 14px 40px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.06)',
                                            display: 'flex', flexDirection: 'column', gap: 4,
                                            animation: 'jts-slide-up 150ms ease-out'
                                        }}>
                                        <button
                                            onClick={() => handleMute(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            <IconMicOff size={14} color="#f87171" />
                                            <span>Mute Participant</span>
                                        </button>
                                        <button
                                            onClick={() => handleSpotlight(p)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            <IconSparkles size={14} color="#fbbf24" />
                                            <span>{isSpotlighted ? 'Unspotlight' : 'Spotlight'}</span>
                                        </button>
                                        {isLocalHost && (
                                            <>
                                                <button
                                                    onClick={() => handlePromote(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                >
                                                    <IconCrown size={14} color="#f59e0b" />
                                                    <span>{isCoHost ? 'Demote to Attendee' : 'Make Co-Host'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleRecordingPerm(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                >
                                                    <IconVideo size={14} color="#ef4444" />
                                                    <span>{recordingAllowedUserIds.includes(p) ? 'Revoke Recording' : 'Allow Recording'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleWhiteboardPerm(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                >
                                                    <IconEdit size={14} color="#818cf8" />
                                                    <span>{whiteboardAllowedUserIds.includes(p) ? 'Revoke Whiteboard' : 'Allow Whiteboard'}</span>
                                                </button>
                                                {/* Virtual Green Room — Move to Backstage / Bring to Stage */}
                                                <button
                                                    onClick={() => {
                                                        if (!canUseBackstage) {
                                                            onUpgradeRequired?.('Virtual Green Room')
                                                            setActiveMenu(null)
                                                            return
                                                        }
                                                        const isCurrentlyBackstage = backstageUserIds.includes(p)
                                                        onStageStatusChange?.(p, !isCurrentlyBackstage)
                                                        setActiveMenu(null)
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: backstageUserIds.includes(p) ? 'rgba(52,211,153,0.08)' : 'rgba(34,197,94,0.06)', color: backstageUserIds.includes(p) ? '#34d399' : '#86efac', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                                    className="btn-secondary"
                                                    title={canUseBackstage ? '' : 'Enterprise plan required'}
                                                >
                                                    <span style={{ fontSize: '0.85rem' }}>{backstageUserIds.includes(p) ? '🎬' : '🎭'}</span>
                                                    <span>{backstageUserIds.includes(p) ? 'Bring to Stage' : 'Move to Backstage'}</span>
                                                    {!canUseBackstage && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '1px 5px', borderRadius: 4 }}>Enterprise</span>}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsRenaming(p)
                                                setActiveMenu(null)
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', width: '100%', fontSize: '0.75rem', border: 'none', background: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}
                                            className="btn-secondary"
                                        >
                                            <IconEdit size={14} />
                                            <span>Rename</span>
                                        </button>
                                    </div>
                                </>
                            )}
                            </li>
                        )
                    })}
                </ul>
            </div>

            {/* Attendance Audit Export Footer (Host / Co-Host Only) */}
            {isLocalHost && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.02)', flexShrink: 0, display: 'flex', gap: 8 }}>
                    {onOpenAttendance && (
                        <button
                            type="button"
                            onClick={onOpenAttendance}
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                            title="Open full interactive attendance & participation report"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                <path d="M9 14l2 2 4-4" />
                            </svg>
                            <span>Attendance Report</span>
                        </button>
                    )}
                    {onExportAttendance && (
                        <button
                            type="button"
                            onClick={onExportAttendance}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', fontSize: '0.78rem', fontWeight: 600 }}
                            title="Export full attendance audit report as CSV"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>CSV</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
