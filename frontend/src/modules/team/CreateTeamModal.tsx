import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CreateTeamPayload } from './team.types'
import {
    IconUsers,
    IconAlertTriangle,
    IconX,
    IconCheck,
    IconLock,
    IconGlobe,
    IconHash,
    IconPlus,
    IconShield,
    IconZap,
    IconBuilding
} from '../../components/common/Icons'

interface CreateTeamModalProps {
    open: boolean
    onClose: () => void
    onCreate: (payload: CreateTeamPayload) => Promise<void>
}

interface TeamTemplate {
    id: string
    title: string
    category: string
    icon: string
    color: string
    description: string
    defaultChannels: string[]
}

const TEAM_TEMPLATES: TeamTemplate[] = [
    {
        id: 'standard',
        title: 'Custom Blank Team',
        category: 'General',
        icon: '👥',
        color: '#5b5fc7',
        description: 'Build your team from scratch with a clean slate and default general channel.',
        defaultChannels: ['general']
    },
    {
        id: 'department',
        title: 'Department / Business Unit',
        category: 'Enterprise',
        icon: '🏢',
        color: '#6366f1',
        description: 'Ideal for Engineering, Sales, Marketing, HR, Finance, and Operations departments.',
        defaultChannels: ['general', 'announcements', 'strategy-planning', 'resources']
    },
    {
        id: 'project',
        title: 'Project & Sprint Team',
        category: 'Project Management',
        icon: '🚀',
        color: '#0ea5e9',
        description: 'Track milestones, deliverables, standups, and cross-functional tasks.',
        defaultChannels: ['general', 'timeline-milestones', 'sprint-deliverables', 'bug-tracking']
    },
    {
        id: 'class',
        title: 'Class / Education Cohort',
        category: 'Education & Training',
        icon: '🎓',
        color: '#10b981',
        description: 'For student lectures, course material distribution, assignments, and study rooms.',
        defaultChannels: ['general', 'lectures-recordings', 'assignments-notes', 'study-group']
    },
    {
        id: 'event',
        title: 'Event & Product Launch',
        category: 'Marketing & Events',
        icon: '🎉',
        color: '#f59e0b',
        description: 'Coordinate conferences, webinars, hackathons, and corporate summit releases.',
        defaultChannels: ['general', 'keynotes-speakers', 'logistics-sponsors', 'social-media']
    }
]

const COLOR_PRESETS = [
    '#5b5fc7', // Teams Purple
    '#6366f1', // Royal Indigo
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber Orange
    '#f43f5e', // Rose Red
    '#8b5cf6', // Violet
    '#ec4899'  // Pink
]

export function CreateTeamModal({ open, onClose, onCreate }: CreateTeamModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<TeamTemplate>(TEAM_TEMPLATES[0])
    const [step, setStep] = useState<'template' | 'details'>('template')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState('#5b5fc7')
    const [emoji, setEmoji] = useState('👥')
    const [visibility, setVisibility] = useState<'public' | 'private'>('private')
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['general'])
    const [customChannelInput, setCustomChannelInput] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setSelectedTemplate(TEAM_TEMPLATES[0])
            setStep('template')
            setName('')
            setDescription('')
            setColor('#5b5fc7')
            setEmoji('👥')
            setVisibility('private')
            setSelectedChannels(['general'])
            setCustomChannelInput('')
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

    const handleSelectTemplate = (tpl: TeamTemplate) => {
        setSelectedTemplate(tpl)
        setColor(tpl.color)
        setEmoji(tpl.icon)
        setSelectedChannels([...tpl.defaultChannels])
        if (!name || TEAM_TEMPLATES.some(t => t.title === name)) {
            setName(tpl.id === 'standard' ? '' : tpl.title)
        }
        if (!description || TEAM_TEMPLATES.some(t => t.description === description)) {
            setDescription(tpl.description)
        }
        setStep('details')
    }

    const toggleChannel = (ch: string) => {
        if (ch === 'general') return // general channel is mandatory
        if (selectedChannels.includes(ch)) {
            setSelectedChannels(selectedChannels.filter(c => c !== ch))
        } else {
            setSelectedChannels([...selectedChannels, ch])
        }
    }

    const handleAddCustomChannel = (e: React.FormEvent) => {
        e.preventDefault()
        const clean = customChannelInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
        if (clean && !selectedChannels.includes(clean)) {
            setSelectedChannels([...selectedChannels, clean])
            setCustomChannelInput('')
        }
    }

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
                icon: emoji,
                visibility,
                teamType: selectedTemplate.id,
                starterChannels: selectedChannels
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

    const teamInitials = (name.trim() || 'TM')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

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
                    maxWidth: step === 'template' ? 640 : 580,
                    background: '#13141f',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: 16,
                    boxShadow: '0 28px 70px -10px rgba(0, 0, 0, 0.95), 0 0 40px rgba(91, 95, 199, 0.25)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'min(90vh, 720px)',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* MS Teams Header */}
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
                                background: `linear-gradient(135deg, ${color} 0%, #312e81 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                boxShadow: `0 4px 14px ${color}40`,
                                color: '#fff',
                                flexShrink: 0
                            }}
                        >
                            {emoji || '👥'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff', lineHeight: 1.2 }}>
                                    {step === 'template' ? 'Choose Team Template' : 'Create New Team'}
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
                                {step === 'template'
                                    ? 'Select a pre-configured workspace template or start from scratch'
                                    : `Configuring: ${selectedTemplate.title}`}
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

                {/* STEP 1: TEMPLATE PICKER */}
                {step === 'template' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                            Select how you want to structure this team:
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                            {TEAM_TEMPLATES.map((tpl) => {
                                const isSelected = selectedTemplate.id === tpl.id
                                return (
                                    <div
                                        key={tpl.id}
                                        onClick={() => handleSelectTemplate(tpl)}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: 12,
                                            border: isSelected
                                                ? `1.5px solid ${tpl.color}`
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: isSelected
                                                ? `linear-gradient(135deg, ${tpl.color}20 0%, rgba(20, 20, 32, 0.8) 100%)`
                                                : 'rgba(255, 255, 255, 0.02)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 14,
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                            e.currentTarget.style.borderColor = tpl.color
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            if (!isSelected) {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    background: `${tpl.color}25`,
                                                    border: `1px solid ${tpl.color}50`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.4rem',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {tpl.icon}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <h3 style={{ fontSize: '0.925rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                                        {tpl.title}
                                                    </h3>
                                                    <span style={{ fontSize: '0.65rem', color: tpl.color, fontWeight: 700, background: `${tpl.color}18`, padding: '1px 6px', borderRadius: 4 }}>
                                                        {tpl.category}
                                                    </span>
                                                </div>
                                                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                                    {tpl.description}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>Starter Channels:</span>
                                                    {tpl.defaultChannels.map(ch => (
                                                        <span key={ch} style={{ fontSize: '0.675rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: '#c5c7d8' }}>
                                                            #{ch}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: 6,
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background: `linear-gradient(135deg, ${tpl.color} 0%, #4338ca 100%)`,
                                                border: 'none',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            Select &rarr;
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 2: TEAM DETAILS & POLICIES */}
                {step === 'details' && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '18px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16
                            }}
                        >
                            {/* Live Preview Badge */}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 10,
                                            background: `linear-gradient(135deg, ${color} 0%, #312e81 100%)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.25rem',
                                            color: '#fff',
                                            fontWeight: 800,
                                            boxShadow: `0 4px 12px ${color}35`
                                        }}
                                    >
                                        {emoji}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#fff' }}>
                                            {name.trim() || 'Your Team Name'}
                                        </div>
                                        <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                                            {selectedChannels.length} initial channels • {visibility === 'public' ? 'Public (Org-Wide)' : 'Private (Invite Only)'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep('template')}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#a1a4c9',
                                        fontSize: '0.725rem',
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Change Template
                                </button>
                            </div>

                            {/* Team Name */}
                            <div>
                                <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                    Team Name <span style={{ color: '#f87171' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Engineering Core, Marketing Dept, Grade 10 Math"
                                    required
                                    autoFocus
                                    style={inputStyle}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                    Team Purpose / Description <span style={{ color: '#7e8299', fontWeight: 400 }}>(Optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe the responsibilities and goals of this team..."
                                    rows={2}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>

                            {/* Visibility / Privacy Radio Cards (Teams Style) */}
                            <div>
                                <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                    Privacy & Access Level
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div
                                        onClick={() => setVisibility('private')}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 10,
                                            border: visibility === 'private' ? '1.5px solid #6366F1' : '1px solid rgba(255,255,255,0.08)',
                                            background: visibility === 'private' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>
                                            <IconLock size={14} color={visibility === 'private' ? '#818cf8' : 'var(--color-text-muted)'} />
                                            <span>Private Team</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                            Only team owners and approved members can access.
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setVisibility('public')}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 10,
                                            border: visibility === 'public' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                            background: visibility === 'public' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>
                                            <IconGlobe size={14} color={visibility === 'public' ? '#4ade80' : 'var(--color-text-muted)'} />
                                            <span>Public Team</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                            Anyone in your organization can view and join.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Color Theme & Emoji Icon */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                        Team Color Theme
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {COLOR_PRESETS.map((c) => (
                                            <div
                                                key={c}
                                                onClick={() => setColor(c)}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 6,
                                                    background: c,
                                                    cursor: 'pointer',
                                                    border: color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                                    boxShadow: color === c ? `0 0 10px ${c}` : 'none',
                                                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                        Team Avatar Emoji
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {['👥', '🏢', '🚀', '🎓', '💡', '🛡️', '⚡', '📊'].map((em) => (
                                            <button
                                                key={em}
                                                type="button"
                                                onClick={() => setEmoji(em)}
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    background: emoji === em ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.04)',
                                                    border: emoji === em ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.08)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: 0
                                                }}
                                            >
                                                {em}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Starter Channels Setup */}
                            <div>
                                <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#e2e4f0', display: 'block', marginBottom: 6 }}>
                                    Starter Channels ({selectedChannels.length})
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                    {selectedChannels.map(ch => {
                                        const isGeneral = ch === 'general'
                                        return (
                                            <span
                                                key={ch}
                                                onClick={() => toggleChannel(ch)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: isGeneral ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                    border: isGeneral ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: isGeneral ? '#a5b4fc' : '#e4e4e7',
                                                    cursor: isGeneral ? 'default' : 'pointer'
                                                }}
                                            >
                                                <IconHash size={12} />
                                                <span>{ch}</span>
                                                {!isGeneral && <IconX size={12} color="#f87171" />}
                                            </span>
                                        )
                                    })}
                                </div>

                                {/* Add Custom Channel input */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={customChannelInput}
                                        onChange={(e) => setCustomChannelInput(e.target.value)}
                                        placeholder="Add additional starter channel name..."
                                        style={{ ...inputStyle, padding: '6px 10px', fontSize: '0.78125rem' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddCustomChannel(e)
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomChannel}
                                        style={{
                                            padding: '0 12px',
                                            borderRadius: 8,
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            color: '#fff',
                                            fontSize: '0.78125rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        + Add Channel
                                    </button>
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
                                justifyContent: 'space-between',
                                gap: 12,
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '14px 24px',
                                background: '#10111a',
                                flexShrink: 0
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setStep('template')}
                                disabled={submitting}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#a1a4c9',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                &larr; Back to Templates
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                        background: `linear-gradient(135deg, ${color} 0%, #4338ca 100%)`,
                                        border: 'none',
                                        color: '#fff',
                                        padding: '8px 22px',
                                        borderRadius: 8,
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        opacity: submitting ? 0.7 : 1,
                                        boxShadow: `0 4px 14px ${color}40`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    {submitting ? 'Creating Team...' : <span>Create Team &rarr;</span>}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
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
