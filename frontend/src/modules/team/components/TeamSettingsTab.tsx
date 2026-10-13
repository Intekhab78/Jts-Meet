import React from 'react'

interface PresetColor {
    label: string
    color: string
}

interface TeamSettingsTabProps {
    editName: string
    setEditName: (v: string) => void
    editDesc: string
    setEditDesc: (v: string) => void
    editColor: string
    setEditColor: (v: string) => void
    editVisibility: 'public' | 'private'
    setEditVisibility: (v: 'public' | 'private') => void
    updating: boolean
    isOwnerOrAdmin: boolean
    presetColors: PresetColor[]
    onSubmit: (payload: { name: string; description: string; color: string; visibility: 'public' | 'private' }) => void
    onDeleteTeam: () => void
}

export function TeamSettingsTab({
    editName,
    setEditName,
    editDesc,
    setEditDesc,
    editColor,
    setEditColor,
    editVisibility,
    setEditVisibility,
    updating,
    isOwnerOrAdmin,
    presetColors,
    onSubmit,
    onDeleteTeam
}: TeamSettingsTabProps) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                onSubmit({
                    name: editName,
                    description: editDesc,
                    color: editColor,
                    visibility: editVisibility
                })
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 580 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Name</label>
                <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input"
                    style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                    required
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Team Description</label>
                <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="input"
                    style={{ padding: '10px 14px', fontSize: '0.825rem', height: 85, resize: 'none' }}
                    placeholder="Describe the team's mission, goals, or schedule..."
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Privacy & Visibility</label>
                    <select
                        value={editVisibility}
                        onChange={(e) => setEditVisibility(e.target.value as any)}
                        className="input"
                        style={{ padding: '9px 12px', fontSize: '0.82rem' }}
                    >
                        <option value="public">Public (Open to organization)</option>
                        <option value="private">Private (Invite-only)</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Custom Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            style={{ width: 40, height: 38, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0 }}
                        />
                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#e4e4e7', fontWeight: 600 }}>{editColor}</span>
                    </div>
                </div>
            </div>

            {/* Curated Color Swatches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Preset Color Themes</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {presetColors.map((c) => (
                        <button
                            key={c.color}
                            type="button"
                            onClick={() => setEditColor(c.color)}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: c.color,
                                border: editColor.toLowerCase() === c.color.toLowerCase() ? '2px solid #fff' : '2px solid transparent',
                                cursor: 'pointer',
                                boxShadow: editColor.toLowerCase() === c.color.toLowerCase() ? `0 0 10px ${c.color}` : 'none',
                                transition: 'all 0.12s ease'
                            }}
                            title={c.label}
                        />
                    ))}
                </div>
            </div>

            <button
                type="submit"
                disabled={updating}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 22px', fontSize: '0.85rem', fontWeight: 700, borderRadius: 8, marginTop: 10 }}
            >
                {updating ? 'Saving Changes...' : 'Save Team Configuration'}
            </button>

            {/* Danger Zone */}
            {isOwnerOrAdmin && (
                <div style={{
                    marginTop: 28,
                    padding: 18,
                    borderRadius: 12,
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16
                }}>
                    <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f87171', display: 'block' }}>Delete Team</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>
                            Permanently delete this team space, associated channels, and team membership logs.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onDeleteTeam}
                        disabled={updating}
                        style={{
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Delete Team
                    </button>
                </div>
            )}
        </form>
    )
}
