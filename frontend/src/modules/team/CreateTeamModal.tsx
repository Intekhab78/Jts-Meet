import React, { useState } from 'react'
import type { CreateTeamPayload } from './team.types'

interface CreateTeamModalProps {
    open: boolean
    onClose: () => void
    onCreate: (payload: CreateTeamPayload) => Promise<void>
}

export function CreateTeamModal({ open, onClose, onCreate }: CreateTeamModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState('#3366FF')
    const [visibility, setVisibility] = useState<'public' | 'private'>('private')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!name.trim()) {
            setError('Team name is required')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onCreate({
                organizationId: '',
                name: name.trim(),
                description: description.trim(),
                color,
                visibility
            })
            setName('')
            setDescription('')
            setColor('#3366FF')
            setVisibility('private')
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to create team')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open) {
        return null
    }

    return (
        <div className="anim-fade-in" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            <div className="anim-scale-in" style={{
                width: '100%',
                maxWidth: '480px',
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
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '16px'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Create New Team</h2>
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

                {/* Form Body */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">Team Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="Enter team name"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input"
                            placeholder="Describe your team purpose (optional)"
                            rows={3}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="label">Color Accent</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        background: 'transparent',
                                        padding: 0,
                                        cursor: 'pointer'
                                    }}
                                />
                                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>{color}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="label">Visibility</label>
                            <select
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                                className="input py-2"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: '#fff', outline: 'none' }}
                            >
                                <option value="private">Private</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
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

                    {/* Actions Footer */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '20px',
                        marginTop: '8px'
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 20px' }}>
                            {submitting ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
