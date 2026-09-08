import React, { useMemo, useState } from 'react'
import type { TeamRole } from './team.types'

export interface OrganizationMemberOption {
    userId: string
    fullName: string
    email: string
    profileImage?: string
    role?: string
}

interface InviteTeamMemberModalProps {
    open: boolean
    onClose: () => void
    onInvite: (userId: string, role: Exclude<TeamRole, 'owner'>) => Promise<void>
    availableOrgMembers?: OrganizationMemberOption[]
    currentTeamMemberIds?: string[]
    teamName?: string
}

export function InviteTeamMemberModal({
    open,
    onClose,
    onInvite,
    availableOrgMembers = [],
    currentTeamMemberIds = [],
    teamName = 'Team'
}: InviteTeamMemberModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('')
    const [manualInput, setManualInput] = useState('')
    const [mode, setMode] = useState<'org' | 'manual'>('org')
    const [searchQuery, setSearchQuery] = useState('')
    const [role, setRole] = useState<Exclude<TeamRole, 'owner'>>('member')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Filter available org members who are NOT already in this team
    const eligibleMembers = useMemo(() => {
        const teamSet = new Set(currentTeamMemberIds)
        return availableOrgMembers.filter(m => !teamSet.has(m.userId))
    }, [availableOrgMembers, currentTeamMemberIds])

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return eligibleMembers
        const q = searchQuery.toLowerCase().trim()
        return eligibleMembers.filter(m =>
            m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        )
    }, [eligibleMembers, searchQuery])

    // If no eligible org members, fallback to manual input mode
    React.useEffect(() => {
        if (open) {
            setError('')
            setSearchQuery('')
            setSelectedUserId('')
            setManualInput('')
            setRole('member')
            if (eligibleMembers.length === 0) {
                setMode('manual')
            } else {
                setMode('org')
            }
        }
    }, [open, eligibleMembers.length])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const target = mode === 'org' ? selectedUserId : manualInput.trim()

        if (!target) {
            setError(mode === 'org' ? 'Please select a member to invite' : 'Please enter an email address or User ID')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            await onInvite(target, role)
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div
                className="glass-card anim-scale-in"
                style={{
                    width: '100%',
                    maxWidth: 500,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: 16,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: '#12131a',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 22px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                            Invite to {teamName}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                            Add members to collaborate and join meetings in this team
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: 6,
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: 8,
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>

                        {/* Mode Switcher Tabs */}
                        {eligibleMembers.length > 0 && (
                            <div style={{
                                display: 'flex',
                                background: 'rgba(255,255,255,0.04)',
                                padding: 3,
                                borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => { setMode('org'); setError('') }}
                                    style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        background: mode === 'org' ? 'var(--color-primary)' : 'transparent',
                                        color: mode === 'org' ? '#fff' : 'var(--color-text-muted)',
                                        transition: 'all 150ms ease'
                                    }}
                                >
                                    🏢 From Organization ({eligibleMembers.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('manual'); setError('') }}
                                    style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        background: mode === 'manual' ? 'var(--color-primary)' : 'transparent',
                                        color: mode === 'manual' ? '#fff' : 'var(--color-text-muted)',
                                        transition: 'all 150ms ease'
                                    }}
                                >
                                    ✉️ By Email / ID
                                </button>
                            </div>
                        )}

                        {/* MODE: Select From Organization */}
                        {mode === 'org' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                    Select Colleague from Organization
                                </label>

                                {eligibleMembers.length > 3 && (
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input"
                                        style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 8 }}
                                    />
                                )}

                                <div style={{
                                    maxHeight: 200,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 10,
                                    padding: 6,
                                    background: 'rgba(0,0,0,0.2)'
                                }}>
                                    {filteredMembers.length === 0 ? (
                                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                                            No matching organization members found.
                                        </div>
                                    ) : (
                                        filteredMembers.map((member) => {
                                            const isSelected = selectedUserId === member.userId
                                            return (
                                                <div
                                                    key={member.userId}
                                                    onClick={() => {
                                                        setSelectedUserId(member.userId)
                                                        setError('')
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                        background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                                                        border: isSelected ? '1px solid #6366f1' : '1px solid transparent',
                                                        transition: 'all 120ms ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                        <div style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            color: '#fff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            flexShrink: 0
                                                        }}>
                                                            {member.fullName ? member.fullName.slice(0, 2).toUpperCase() : 'ME'}
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {member.fullName}
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {member.email}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {member.role && (
                                                            <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                                                                {member.role}
                                                            </span>
                                                        )}
                                                        {isSelected && (
                                                            <span style={{ color: '#818cf8', fontSize: '0.9rem', fontWeight: 700 }}>✓</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* MODE: Manual Email / ID input */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                    Member Email Address or User ID
                                </label>
                                <input
                                    type="text"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    className="input"
                                    placeholder="e.g. colleague@jtsmiddleeast.com"
                                    style={{ width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}
                                    autoFocus
                                />
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                    Enter the registered email of the person you want to invite to this team.
                                </span>
                            </div>
                        )}

                        {/* Role Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                Assign Team Role
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {(['member', 'admin', 'guest'] as const).map((r) => (
                                    <div
                                        key={r}
                                        onClick={() => setRole(r)}
                                        style={{
                                            border: role === r ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                            background: role === r ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                            borderRadius: 8,
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 120ms ease'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: role === r ? '#fff' : 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                            {r}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            {r === 'admin' ? 'Manage team' : r === 'member' ? 'Full access' : 'View only'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#f87171',
                                fontSize: '0.75rem',
                                borderRadius: 8
                            }}>
                                ⚠️ {error}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 10,
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '14px 22px',
                        background: 'rgba(255, 255, 255, 0.01)'
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn-primary"
                            style={{ padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                            {submitting ? 'Adding...' : 'Add to Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
