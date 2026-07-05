import React, { useState } from 'react'
import type { TeamRole } from './team.types'

interface InviteTeamMemberModalProps {
    open: boolean
    onClose: () => void
    onInvite: (userId: string, role: Exclude<TeamRole, 'owner'>) => Promise<void>
}

export function InviteTeamMemberModal({ open, onClose, onInvite }: InviteTeamMemberModalProps) {
    const [userId, setUserId] = useState('')
    const [role, setRole] = useState<Exclude<TeamRole, 'owner'>>('member')
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

    if (!open) {
        return null
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: 400,
                padding: 24,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(30, 30, 35, 0.85)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingBottom: 12
                }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Invite Team Member</h2>
                    <button type="button" onClick={onClose} className="btn-icon" style={{
                        padding: 6,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label className="label" style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>User ID</label>
                        <input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="input"
                            placeholder="Enter member's User ID"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label className="label" style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Assign Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Exclude<TeamRole, 'owner'>)}
                            className="input"
                            style={{ width: '100%', padding: '8px 12px' }}
                        >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="guest">Guest</option>
                        </select>
                    </div>

                    {error && (
                        <div style={{
                            padding: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            fontSize: '0.75rem',
                            borderRadius: 8
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingTop: 16,
                        marginTop: 12
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary text-xs">
                            {submitting ? 'Inviting...' : 'Invite Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

