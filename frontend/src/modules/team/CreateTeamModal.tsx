import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CreateTeamPayload } from './team.types'

interface CreateTeamModalProps {
    open: boolean
    onClose: () => void
    onCreate: (payload: CreateTeamPayload) => Promise<void>
}

export function CreateTeamModal({ open, onClose, onCreate }: CreateTeamModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState('#5b5fc7')
    const [visibility, setVisibility] = useState<'public' | 'private'>('private')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setName('')
            setDescription('')
            setColor('#5b5fc7')
            setVisibility('private')
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
                    maxWidth: 520,
                    background: '#161722',
                    border: '1px solid rgba(91, 95, 199, 0.4)',
                    borderRadius: 16,
                    boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.9), 0 0 35px rgba(91, 95, 199, 0.25)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'min(88vh, 650px)',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* MS Teams Style Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, rgba(91, 95, 199, 0.18) 0%, rgba(22, 23, 34, 0) 100%)',
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
                            👥
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff', lineHeight: 1.2 }}>
                                Create New Team
                            </h2>
                            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#a1a4c9', lineHeight: 1.2 }}>
                                Create a department or class channel group
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
                        padding: '18px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Team Name <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Computer Science Dept, Marketing Team"
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
                                Description <span style={{ color: '#7e8299', fontWeight: 400 }}>(Optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is the purpose of this team?"
                                rows={2}
                                style={{
                                    width: '100%',
                                    background: '#101118',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    resize: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                    Color Accent
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            background: 'transparent',
                                            padding: 0,
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', textTransform: 'uppercase', color: '#a1a4c9' }}>{color}</span>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                    Visibility
                                </label>
                                <select
                                    value={visibility}
                                    onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                                    style={{
                                        width: '100%',
                                        background: '#101118',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="private">Private (Invite only)</option>
                                    <option value="public">Public (Anyone in Org)</option>
                                </select>
                            </div>
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
                        padding: '14px 24px',
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
                            {submitting ? 'Creating...' : 'Create Team ➔'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
