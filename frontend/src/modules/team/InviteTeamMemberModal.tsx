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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="w-full max-w-md glass-card p-6 shadow-xl text-white anim-scale-in">
                <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                    <h2 className="text-lg font-bold">Invite Team Member</h2>
                    <button type="button" onClick={onClose} className="btn-icon" style={{ padding: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">User ID</label>
                        <input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="input"
                            placeholder="Enter member's User ID"
                        />
                    </div>

                    <div>
                        <label className="label">Assign Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as Exclude<TeamRole, 'owner'>)} className="input py-2">
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="guest">Guest</option>
                        </select>
                    </div>

                    {error && (
                        <div className="anim-fade-in p-3 bg-red-950/40 border border-red-800 text-red-400 text-xs rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-white/5 pt-4 mt-5">
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

