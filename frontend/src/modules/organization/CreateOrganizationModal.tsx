import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CreateOrganizationPayload } from './organization.types'

interface CreateOrganizationModalProps {
    open: boolean
    onClose: () => void
    onCreate: (payload: CreateOrganizationPayload) => Promise<void>
}

const TEMPLATES = [
    {
        id: 'education',
        icon: '🎓',
        title: 'Education & Institute',
        desc: 'Ideal for universities, schools, faculty departments, & student classes.'
    },
    {
        id: 'enterprise',
        icon: '🏢',
        title: 'Enterprise & Corporate',
        desc: 'Built for corporate teams, multi-department meetings, & clients.'
    },
    {
        id: 'tech',
        icon: '🚀',
        title: 'Startup & Tech Team',
        desc: 'Designed for agile dev teams, sprint channels, & quick standups.'
    }
]

const TIMEZONES = [
    { label: 'Asia/Kolkata (IST, UTC+05:30)', value: 'Asia/Kolkata' },
    { label: 'Asia/Dubai (GST, UTC+04:00)', value: 'Asia/Dubai' },
    { label: 'Europe/London (GMT, UTC+00:00)', value: 'Europe/London' },
    { label: 'America/New_York (EST, UTC-05:00)', value: 'America/New_York' },
    { label: 'America/Los_Angeles (PST, UTC-08:00)', value: 'America/Los_Angeles' },
    { label: 'Asia/Singapore (SGT, UTC+08:00)', value: 'Asia/Singapore' },
    { label: 'UTC (Coordinated Universal Time)', value: 'UTC' }
]

export function CreateOrganizationModal({ open, onClose, onCreate }: CreateOrganizationModalProps) {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState('education')
    const [description, setDescription] = useState('')
    const [timezone, setTimezone] = useState('Asia/Kolkata')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Auto-generate slug from name if user hasn't typed custom slug
    useEffect(() => {
        if (!isSlugManuallyEdited && name.trim()) {
            const autoSlug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
            setSlug(autoSlug)
        }
    }, [name, isSlugManuallyEdited])

    // Reset fields on modal open
    useEffect(() => {
        if (open) {
            setName('')
            setSlug('')
            setIsSlugManuallyEdited(false)
            setDescription('')
            setTimezone('Asia/Kolkata')
            setError('')
            setSubmitting(false)
        }
    }, [open])

    // Handle escape key
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
            setError('Please enter an organization name.')
            return
        }
        if (!slug.trim()) {
            setError('Please provide a unique workspace slug.')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onCreate({
                name: name.trim(),
                slug: slug.trim().toLowerCase(),
                description: description.trim(),
                timezone
            })
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to create organization. Please try a different name/slug.')
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
                    maxWidth: 580,
                    background: '#161722',
                    border: '1px solid rgba(91, 95, 199, 0.4)',
                    borderRadius: 16,
                    boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.9), 0 0 35px rgba(91, 95, 199, 0.25)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'min(88vh, 720px)',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* MS Teams Style Header (Always pinned top) */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, rgba(91, 95, 199, 0.18) 0%, rgba(22, 23, 34, 0) 100%)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #5b5fc7 0%, #444791 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(91, 95, 199, 0.35)',
                            color: '#fff',
                            flexShrink: 0
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                Create Organization Workspace
                            </h2>
                            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#a1a4c9', lineHeight: 1.2 }}>
                                Microsoft Teams-grade collaborative hub
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
                            transition: 'all 0.15s',
                            fontSize: '0.9rem'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Form (Inner Scrollable Content + Pinned Footer) */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {/* Scrollable Form Body */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '18px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        {/* Organization Type / Template Selection */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c5c7d8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
                                Choose Workspace Purpose
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                                {TEMPLATES.map(tmpl => {
                                    const isSelected = selectedTemplate === tmpl.id
                                    return (
                                        <div
                                            key={tmpl.id}
                                            onClick={() => setSelectedTemplate(tmpl.id)}
                                            style={{
                                                border: isSelected ? '1.5px solid #5b5fc7' : '1px solid rgba(255, 255, 255, 0.08)',
                                                background: isSelected ? 'rgba(91, 95, 199, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: 10,
                                                padding: '10px 10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 3
                                            }}
                                        >
                                            <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{tmpl.icon}</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#fff' : '#d1d3e2' }}>
                                                {tmpl.title}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#9092af', lineHeight: 1.3 }}>
                                                {tmpl.desc}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Organization Name */}
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Organization Name <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. BBD Educational Group or Acme Technologies"
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    background: '#101118',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    color: '#fff',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#5b5fc7'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#7e8299', marginTop: 4, display: 'block' }}>
                                Your team, institute, or company's formal brand name.
                            </span>
                        </div>

                        {/* Workspace Slug / Live Domain Preview */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0' }}>
                                    Workspace Slug / Domain <span style={{ color: '#f87171' }}>*</span>
                                </label>
                                <span style={{ fontSize: '0.7rem', color: '#5b5fc7', fontWeight: 600 }}>
                                    Unique Identifier
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#101118',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 8,
                                padding: '0 12px',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}>
                                <span style={{ color: '#656a8a', fontSize: '0.82rem', userSelect: 'none' }}>
                                    jtsmeet.com/org/
                                </span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => {
                                        setIsSlugManuallyEdited(true)
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                                    }}
                                    placeholder="bbd-group"
                                    required
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '10px 6px',
                                        color: '#60a5fa',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            {slug && (
                                <div style={{
                                    marginTop: 6,
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    background: 'rgba(91, 95, 199, 0.12)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: '0.72rem',
                                    color: '#a1a4c9'
                                }}>
                                    <span>🌐 Live URL:</span>
                                    <strong style={{ color: '#93c5fd' }}>https://{slug}.jtsmeet.com</strong>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Description <span style={{ color: '#7e8299', fontWeight: 400 }}>(Optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does your team or department do?"
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
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#5b5fc7'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                            />
                        </div>

                        {/* Timezone */}
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                Workspace Timezone
                            </label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
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
                                {TIMEZONES.map(tz => (
                                    <option key={tz.value} value={tz.value} style={{ background: '#181924', color: '#fff' }}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#fca5a5',
                                fontSize: '0.8rem',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions Footer (Always pinned bottom) */}
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
                                cursor: 'pointer',
                                transition: 'all 0.15s'
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 4px 14px rgba(91, 95, 199, 0.4)'
                            }}
                        >
                            {submitting ? (
                                <>
                                    <div style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#fff',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    Creating Workspace...
                                </>
                            ) : (
                                <>
                                    <span>Create Organization</span>
                                    <span>➔</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
