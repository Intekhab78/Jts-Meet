import React, { useState } from 'react'
import type { CreateOrganizationPayload } from './organization.types'

interface CreateOrganizationModalProps {
    open: boolean
    onClose: () => void
    onCreate: (payload: CreateOrganizationPayload) => Promise<void>
}

export function CreateOrganizationModal({ open, onClose, onCreate }: CreateOrganizationModalProps) {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [timezone, setTimezone] = useState('UTC')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!name.trim() || !slug.trim()) {
            setError('Name and slug are required')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onCreate({ name: name.trim(), slug: slug.trim().toLowerCase(), description: description.trim(), timezone })
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to create organization')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open) {
        return null
    }

    return (
        <div className="anim-fade-in modal-overlay">
            <div className="anim-scale-in modal-container">
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '16px'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Create Organization</h2>
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
                        <label className="label">Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="Organization name"
                            required
                        />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">Slug</label>
                        <input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="input"
                            placeholder="organization-slug"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input"
                            placeholder="Optional description"
                            rows={3}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="label">Timezone</label>
                        <input
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="input"
                            placeholder="UTC"
                        />
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
                            {submitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
