import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ChannelRole } from './channel.types'

interface InviteChannelMemberDialogProps {
    open: boolean
    onClose: () => void
    onInvite: (userId: string, role: Exclude<ChannelRole, 'owner'>) => Promise<void>
}

export function InviteChannelMemberDialog({ open, onClose, onInvite }: InviteChannelMemberDialogProps) {
    const [userId, setUserId] = useState('')
    const [role, setRole] = useState<Exclude<ChannelRole, 'owner'>>('member')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setUserId('')
            setRole('member')
            setError('')
            setSubmitting(false)
        }
    }, [open])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open && !submitting) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, submitting, onClose])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!userId.trim()) {
            setError('Please enter user email or User ID')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onInvite(userId.trim(), role)
            setUserId('')
            setRole('member')
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open) {
        return null
    }

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999999,
                backgroundColor: 'rgba(5, 7, 14, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
                boxSizing: 'border-box'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) {
                    onClose()
                }
            }}
        >
            <div
                className="anim-scale-in"
                style={{
                    width: '100%',
                    maxWidth: 480,
                    background: '#161722',
                    border: '1px solid rgba(91, 95, 199, 0.4)',
                    borderRadius: 16,
                    boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.9), 0 0 35px rgba(91, 95, 199, 0.25)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'min(88vh, 600px)',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* MS Teams Style Header */}
                <div style={{
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, rgba(91, 95, 199, 0.15) 0%, rgba(22, 23, 34, 0) 100%)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #5b5fc7 0%, #444791 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(91, 95, 199, 0.35)',
                            color: '#fff',
                            flexShrink: 0
                        }}>
                            💬
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff', lineHeight: 1.2 }}>
                                Add Channel Member
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#a1a4c9', lineHeight: 1.2 }}>
                                Grant access to this channel discussion
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#c5c7d8',
                            cursor: 'pointer',
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '18px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                User Email or User ID <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="e.g. aniket@jtsmiddleeast.com or user_id"
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    background: '#101118',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    color: '#fff',
                                    fontSize: '0.88rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Channel Permission Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as Exclude<ChannelRole, 'owner'>)}
                                style={{
                                    width: '100%',
                                    background: '#101118',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    padding: '9px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="member">Member (Can chat & join channel meetings)</option>
                                <option value="moderator">Moderator (Can manage messages & members)</option>
                                <option value="guest">Guest (Read & listen only)</option>
                            </select>
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#fca5a5',
                                fontSize: '0.8rem',
                                borderRadius: 8
                            }}>
                                ⚠️ {error}
                            </div>
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 12,
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '14px 22px',
                        background: '#13141e',
                        flexShrink: 0
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#d1d3e2',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                background: 'linear-gradient(135deg, #5b5fc7 0%, #444791 100%)',
                                border: 'none',
                                color: '#fff',
                                padding: '8px 22px',
                                borderRadius: 8,
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(91, 95, 199, 0.4)'
                            }}
                        >
                            {submitting ? 'Adding...' : 'Add Member ➔'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
