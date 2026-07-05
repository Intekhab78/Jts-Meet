import React, { useState } from 'react'
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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!userId.trim()) {
            setError('User ID is required')
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

    console.log('InviteChannelMemberDialog rendered. open =', open)
    if (!open) {
        return null
    }

    console.log('InviteChannelMemberDialog rendering portal to body...');
    return createPortal(
        <div className="anim-fade-in" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            <div className="anim-scale-in" style={{
                width: '100%',
                maxWidth: '440px',
                background: 'rgba(15, 17, 24, 0.98)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                boxShadow: 'var(--shadow-xl)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '16px'
                }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>Invite Channel Member</h2>
                    <button type="button" onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background 0.15s'
                    }} className="hover:bg-white/10">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">User ID</label>
                        <input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="input"
                            placeholder="Enter member's User ID"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">Assign Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Exclude<ChannelRole, 'owner'>)}
                            className="input py-2"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: '#fff', outline: 'none' }}
                        >
                            <option value="moderator">Moderator</option>
                            <option value="member">Member</option>
                            <option value="guest">Guest</option>
                        </select>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: '0.75rem',
                            borderRadius: 'var(--radius-sm)'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '20px',
                        marginTop: '8px'
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 20px' }}>
                            {submitting ? 'Inviting...' : 'Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

