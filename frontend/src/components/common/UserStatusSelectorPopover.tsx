import React, { useState, useRef, useEffect } from 'react'
import { UserPresenceBadge, PRESENCE_CONFIG, PresenceStatus } from './UserPresenceBadge'
import { IconCheck, IconEdit, IconX } from './Icons'
import { API_BASE } from '../../config'

interface UserStatusSelectorPopoverProps {
    currentStatus?: PresenceStatus | string
    currentCustomStatus?: string
    token: string
    currentUserId?: string
    userName?: string
    onStatusUpdated?: (status: PresenceStatus, customStatus: string) => void
    socket?: any
}

export function UserStatusSelectorPopover({
    currentStatus = 'online',
    currentCustomStatus = '',
    token,
    currentUserId,
    userName,
    onStatusUpdated,
    socket
}: UserStatusSelectorPopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState<PresenceStatus>((currentStatus as PresenceStatus) || 'online')
    const [customStatus, setCustomStatus] = useState(currentCustomStatus)
    const [editingCustomStatus, setEditingCustomStatus] = useState(false)
    const [customStatusInput, setCustomStatusInput] = useState(currentCustomStatus)
    const [isSaving, setIsSaving] = useState(false)
    const popoverRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (currentStatus) setStatus(currentStatus as PresenceStatus)
    }, [currentStatus])

    useEffect(() => {
        if (currentCustomStatus !== undefined) {
            setCustomStatus(currentCustomStatus)
            setCustomStatusInput(currentCustomStatus)
        }
    }, [currentCustomStatus])

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setEditingCustomStatus(false)
            }
        }
        window.addEventListener('mousedown', handleClickOutside)
        return () => window.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const handleSelectStatus = async (newStatus: PresenceStatus) => {
        setStatus(newStatus)
        setIsSaving(true)
        try {
            // Socket broadcast
            if (socket && socket.connected) {
                socket.emit('presence:status', { status: newStatus, customStatus })
            }
            // HTTP persistence
            await fetch(`${API_BASE}/api/auth/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, customStatus })
            })
            onStatusUpdated?.(newStatus, customStatus)
        } catch (err) {
            console.warn('[Presence] Failed to update status:', err)
        } finally {
            setIsSaving(false)
            setIsOpen(false)
        }
    }

    const handleSaveCustomStatus = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = customStatusInput.trim()
        setCustomStatus(trimmed)
        setEditingCustomStatus(false)
        setIsSaving(true)
        try {
            if (socket && socket.connected) {
                socket.emit('presence:status', { status, customStatus: trimmed })
            }
            await fetch(`${API_BASE}/api/auth/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, customStatus: trimmed })
            })
            onStatusUpdated?.(status, trimmed)
        } catch (err) {
            console.warn('[Presence] Failed to save custom status:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const clearCustomStatus = async () => {
        setCustomStatus('')
        setCustomStatusInput('')
        setIsSaving(true)
        try {
            if (socket && socket.connected) {
                socket.emit('presence:status', { status, customStatus: '' })
            }
            await fetch(`${API_BASE}/api/auth/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, customStatus: '' })
            })
            onStatusUpdated?.(status, '')
        } catch (err) {
            console.warn('[Presence] Failed to clear custom status:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const selectableStatuses: PresenceStatus[] = ['online', 'busy', 'away', 'dnd']

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
            {/* Status Trigger Pill */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 20,
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                }}
            >
                <UserPresenceBadge status={status} size="sm" />
                <span>{PRESENCE_CONFIG[status]?.label || 'Available'}</span>
                {customStatus && (
                    <span style={{ color: 'var(--color-text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        • {customStatus}
                    </span>
                )}
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 260,
                        background: '#12141c',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 12,
                        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
                        zIndex: 99999,
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        animation: 'fadeIn 0.15s ease-out'
                    }}
                >
                    <div style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Set Your Status
                        </span>
                    </div>

                    {/* Status Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {selectableStatuses.map((st) => {
                            const isSelected = status === st
                            const cfg = PRESENCE_CONFIG[st]
                            return (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleSelectStatus(st)}
                                    disabled={isSaving}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        color: isSelected ? '#fff' : '#cbd5e1',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.8125rem',
                                        fontWeight: isSelected ? 700 : 500,
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <UserPresenceBadge status={st} size="md" />
                                        <span>{cfg.label}</span>
                                    </div>
                                    {isSelected && <IconCheck size={14} color="#818cf8" />}
                                </button>
                            )
                        })}
                    </div>

                    {/* Custom Status Message Bar */}
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 8, paddingInline: 4 }}>
                        {editingCustomStatus ? (
                            <form onSubmit={handleSaveCustomStatus} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <input
                                    type="text"
                                    maxLength={80}
                                    value={customStatusInput}
                                    onChange={(e) => setCustomStatusInput(e.target.value)}
                                    placeholder="What's your status? (e.g. In meeting)"
                                    autoFocus
                                    className="input"
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '6px 10px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: 6
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingCustomStatus(false)}
                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div
                                    onClick={() => setEditingCustomStatus(true)}
                                    style={{
                                        cursor: 'pointer',
                                        flex: 1,
                                        fontSize: '0.75rem',
                                        color: customStatus ? '#cbd5e1' : 'var(--color-text-muted)',
                                        fontStyle: customStatus ? 'normal' : 'italic',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {customStatus ? `"${customStatus}"` : 'Add custom status message...'}
                                </div>
                                {customStatus ? (
                                    <button
                                        type="button"
                                        onClick={clearCustomStatus}
                                        title="Clear status message"
                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                                    >
                                        <IconX size={12} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEditingCustomStatus(true)}
                                        style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                                    >
                                        <IconEdit size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
