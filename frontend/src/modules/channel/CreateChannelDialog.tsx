import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    IconHash,
    IconLock,
    IconGlobe,
    IconX,
    IconAlertTriangle,
    IconCheck,
    IconZap,
    IconShield
} from '../../components/common/Icons'

interface CreateChannelDialogProps {
    open: boolean
    onClose: () => void
    onCreate: (payload: {
        name: string
        description?: string
        type: 'public' | 'private'
        isAutoShow?: boolean
        isAnnouncementOnly?: boolean
    }) => Promise<void>
}

const TOPIC_PRESETS = [
    { label: 'announcements', desc: 'Official updates, milestones, and important alerts' },
    { label: 'sprint-planning', desc: 'Agile sprints, backlog grooming, and milestone tracking' },
    { label: 'bug-reports', desc: 'Issue triage, regression reports, and bug discussions' },
    { label: 'design-reviews', desc: 'UI/UX mockups, wireframes, and design system feedback' },
    { label: 'daily-standup', desc: 'Asynchronous standups, daily progress, and blockers' },
    { label: 'releases', desc: 'Changelogs, release candidates, and deployment notifications' },
    { label: 'random-chat', desc: 'Non-work conversations, memes, and team bonding' }
]

export function CreateChannelDialog({ open, onClose, onCreate }: CreateChannelDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'public' | 'private'>('public')
    const [isAutoShow, setIsAutoShow] = useState(true)
    const [isAnnouncementOnly, setIsAnnouncementOnly] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setName('')
            setDescription('')
            setType('public')
            setIsAutoShow(true)
            setIsAnnouncementOnly(false)
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

    const handleApplyPreset = (preset: { label: string; desc: string }) => {
        setName(preset.label)
        setDescription(preset.desc)
    }

    const cleanChannelName = (input: string) => {
        return input.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const normalized = cleanChannelName(name)
        if (!normalized) {
            setError('Channel name is required')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onCreate({
                name: normalized,
                description: description.trim(),
                type,
                isAutoShow,
                isAnnouncementOnly
            })
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to create channel')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open) {
        return null
    }

    const previewName = cleanChannelName(name) || 'new-channel'

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999999,
                backgroundColor: 'rgba(5, 7, 14, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
                boxSizing: 'border-box'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) {
                    onClose()
                }
            }}
        >
            <div
                className="anim-scale-in glass-card"
                style={{
                    width: '100%',
                    maxWidth: 540,
                    background: '#13141f',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: 16,
                    boxShadow: '0 28px 70px -10px rgba(0, 0, 0, 0.95), 0 0 40px rgba(91, 95, 199, 0.25)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'min(90vh, 700px)',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* MS Teams Style Header */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(180deg, rgba(91, 95, 199, 0.2) 0%, rgba(19, 20, 31, 0) 100%)',
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: type === 'public'
                                    ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                    : 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                                color: '#fff',
                                flexShrink: 0
                            }}
                        >
                            {type === 'public' ? <IconHash size={20} /> : <IconLock size={18} />}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff', lineHeight: 1.2 }}>
                                    Create a Channel
                                </h2>
                                <span
                                    style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        color: '#818cf8',
                                        border: '1px solid rgba(99, 102, 241, 0.35)'
                                    }}
                                >
                                    Teams Grade
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.2 }}>
                                Organize team conversations, shared files, and meeting spaces by topic
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
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <IconX size={16} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}
                    >
                        {/* Live Channel Sidebar Preview Banner */}
                        <div
                            style={{
                                padding: '12px 16px',
                                borderRadius: 10,
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 6,
                                        background: type === 'public' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: type === 'public' ? '#818cf8' : '#c084fc'
                                    }}
                                >
                                    {type === 'public' ? <IconHash size={16} /> : <IconLock size={14} />}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                                        #{previewName}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        {type === 'public' ? 'Public (Standard - accessible to everyone on the team)' : 'Private (Only invited members can access)'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Channel Name */}
                        <div>
                            <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Channel Name <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#818cf8',
                                        fontWeight: 800,
                                        fontSize: '1rem'
                                    }}
                                >
                                    #
                                </span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. project-planning, design-reviews, announcements"
                                    required
                                    autoFocus
                                    style={{
                                        ...inputStyle,
                                        paddingLeft: 30
                                    }}
                                />
                            </div>
                        </div>

                        {/* Quick Topic Presets */}
                        <div>
                            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                Popular Topic Suggestions:
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {TOPIC_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => handleApplyPreset(preset)}
                                        style={{
                                            padding: '4px 9px',
                                            borderRadius: 6,
                                            fontSize: '0.725rem',
                                            fontWeight: 600,
                                            background: name.toLowerCase() === preset.label ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                            border: name.toLowerCase() === preset.label ? '1px solid #6366F1' : '1px solid rgba(255, 255, 255, 0.08)',
                                            color: name.toLowerCase() === preset.label ? '#a5b4fc' : 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        #{preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Channel Purpose / Description <span style={{ color: '#7e8299', fontWeight: 400 }}>(Optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Explain what this channel is for and what should be discussed here..."
                                rows={2}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        {/* Privacy / Type Radio Cards (Teams Style) */}
                        <div>
                            <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Channel Privacy & Type
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div
                                    onClick={() => setType('public')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        border: type === 'public' ? '1.5px solid #6366F1' : '1px solid rgba(255,255,255,0.08)',
                                        background: type === 'public' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>
                                        <IconGlobe size={14} color={type === 'public' ? '#818cf8' : 'var(--color-text-muted)'} />
                                        <span>Standard (Public)</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                        Accessible to all members of this department/team.
                                    </div>
                                </div>

                                <div
                                    onClick={() => setType('private')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        border: type === 'private' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                                        background: type === 'private' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>
                                        <IconLock size={14} color={type === 'private' ? '#c084fc' : 'var(--color-text-muted)'} />
                                        <span>Private Channel</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                        Only a specific, invited group of people have access.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Teams-Grade Governance Toggles */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: '#fff' }}>
                                        Automatically show in everyone's channel list
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                        Ensures this channel is not hidden in the "more channels" dropdown.
                                    </div>
                                </div>
                                <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isAutoShow}
                                        onChange={(e) => setIsAutoShow(e.target.checked)}
                                        style={{ display: 'none' }}
                                    />
                                    <div
                                        style={{
                                            width: 40,
                                            height: 22,
                                            borderRadius: 11,
                                            background: isAutoShow ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                            position: 'relative',
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                position: 'absolute',
                                                top: 3,
                                                left: isAutoShow ? 21 : 3,
                                                transition: 'left 0.2s ease'
                                            }}
                                        />
                                    </div>
                                </label>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: '#fff' }}>
                                        Announcement Only Mode
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                        Only channel moderators and admins can post new conversations.
                                    </div>
                                </div>
                                <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isAnnouncementOnly}
                                        onChange={(e) => setIsAnnouncementOnly(e.target.checked)}
                                        style={{ display: 'none' }}
                                    />
                                    <div
                                        style={{
                                            width: 40,
                                            height: 22,
                                            borderRadius: 11,
                                            background: isAnnouncementOnly ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                            position: 'relative',
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                position: 'absolute',
                                                top: 3,
                                                left: isAnnouncementOnly ? 21 : 3,
                                                transition: 'left 0.2s ease'
                                            }}
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {error && (
                            <div
                                style={{
                                    padding: '10px 14px',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#fca5a5',
                                    fontSize: '0.8rem',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <IconAlertTriangle size={15} color="#fca5a5" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 12,
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '14px 24px',
                            background: '#10111a',
                            flexShrink: 0
                        }}
                    >
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
                                fontSize: '0.8125rem',
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
                                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                border: 'none',
                                color: '#fff',
                                padding: '8px 22px',
                                borderRadius: 8,
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            {submitting ? 'Creating Channel...' : <span>Create Channel &rarr;</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0d0e15',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease'
}
