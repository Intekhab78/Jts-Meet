import React, { useState, useEffect } from 'react'
import type { Channel, UpdateChannelPayload } from './channel.types'

interface EditChannelDialogProps {
    open: boolean
    channel?: Channel | null
    onClose: () => void
    onSave: (payload: UpdateChannelPayload) => Promise<void>
}

export function EditChannelDialog({ open, channel, onClose, onSave }: EditChannelDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'public' | 'private'>('private')
    const [status, setStatus] = useState<'active' | 'inactive'>('active')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (channel) {
            setName(channel.name)
            setDescription(channel.description || '')
            setType(channel.type)
            setStatus(channel.status)
        }
    }, [channel])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!channel) {
            return
        }

        if (!name.trim()) {
            setError('Channel name is required')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onSave({ name: name.trim(), description: description.trim(), type, status })
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to save channel')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open || !channel) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="w-full max-w-lg glass-card p-6 shadow-xl text-white anim-scale-in">
                <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                    <h2 className="text-lg font-bold">Edit Channel</h2>
                    <button type="button" onClick={onClose} className="btn-icon" style={{ padding: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Type</label>
                            <select value={type} onChange={(e) => setType(e.target.value as 'public' | 'private')} className="input py-2">
                                <option value="private">Private</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')} className="input py-2">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="anim-fade-in p-3 bg-red-950/40 border border-red-800 text-red-400 text-xs rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-white/5 pt-4 mt-5">
                        <button type="button" onClick={onClose} className="btn btn-secondary text-xs">Cancel</button>
                        <button type="submit" disabled={submitting} className="btn btn-primary text-xs">
                            {submitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

