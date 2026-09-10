import React from 'react'

export type MeetingLayoutMode = 'auto' | 'tiled' | 'spotlight' | 'sidebar'

interface LayoutSwitcherModalProps {
    isOpen: boolean
    onClose: () => void
    currentLayout: MeetingLayoutMode
    onSelectLayout: (mode: MeetingLayoutMode) => void
    maxTiles?: number
    onMaxTilesChange?: (tiles: number) => void
}

export function LayoutSwitcherModal({
    isOpen,
    onClose,
    currentLayout,
    onSelectLayout,
    maxTiles = 16,
    onMaxTilesChange
}: LayoutSwitcherModalProps) {
    if (!isOpen) return null

    const layoutOptions: Array<{
        id: MeetingLayoutMode
        title: string
        desc: string
        icon: React.ReactNode
    }> = [
        {
            id: 'auto',
            title: 'Auto',
            desc: 'Allows JTS-Meet to choose the best layout for you automatically.',
            icon: (
                <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
                    <rect x="1" y="1" width="46" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                    <rect x="5" y="5" width="24" height="24" rx="2" fill="currentColor" fillOpacity="0.4" />
                    <rect x="31" y="5" width="12" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" />
                    <rect x="31" y="14" width="12" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" />
                    <rect x="31" y="23" width="12" height="6" rx="1.5" fill="currentColor" fillOpacity="0.25" />
                </svg>
            )
        },
        {
            id: 'tiled',
            title: 'Tiled',
            desc: 'Shows everyone in equal tiles. Ideal for group discussions and team standups.',
            icon: (
                <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
                    <rect x="1" y="1" width="46" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="4" y="4" width="12" height="11" rx="1.5" fill="currentColor" fillOpacity="0.3" />
                    <rect x="18" y="4" width="12" height="11" rx="1.5" fill="currentColor" fillOpacity="0.3" />
                    <rect x="32" y="4" width="12" height="11" rx="1.5" fill="currentColor" fillOpacity="0.3" />
                    <rect x="4" y="18" width="12" height="11" rx="1.5" fill="currentColor" fillOpacity="0.3" />
                    <rect x="18" y="18" width="12" height="11" rx="1.5" fill="currentColor" fillOpacity="0.3" />
                    <rect x="32" y="18" width="12" height="11" rx="1.5" fill="currentColor" fillOpacity="0.3" />
                </svg>
            )
        },
        {
            id: 'spotlight',
            title: 'Spotlight',
            desc: 'The active speaker or pinned presentation fills the entire meeting window.',
            icon: (
                <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
                    <rect x="1" y="1" width="46" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="5" y="5" width="38" height="24" rx="2.5" fill="currentColor" fillOpacity="0.45" />
                </svg>
            )
        },
        {
            id: 'sidebar',
            title: 'Sidebar',
            desc: 'Main presentation or speaker is centered, with other attendees lined up on the right.',
            icon: (
                <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
                    <rect x="1" y="1" width="46" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="4" y="4" width="28" height="26" rx="2" fill="currentColor" fillOpacity="0.45" />
                    <rect x="34" y="4" width="10" height="7.5" rx="1.5" fill="currentColor" fillOpacity="0.25" />
                    <rect x="34" y="13.5" width="10" height="7.5" rx="1.5" fill="currentColor" fillOpacity="0.25" />
                    <rect x="34" y="23" width="10" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" />
                </svg>
            )
        }
    ]

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div 
                className="modal-container anim-scale-in" 
                style={{ 
                    maxWidth: 580, 
                    background: 'rgba(24, 28, 38, 0.98)', 
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.25rem' }}>📐</span>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>
                            Change Layout
                        </h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="btn-ghost" 
                        style={{ border: 'none', background: 'transparent', color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.25rem', cursor: 'pointer', padding: 4 }}
                    >
                        ✕
                    </button>
                </div>

                {/* Layout Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
                    {layoutOptions.map((opt) => {
                        const isSelected = currentLayout === opt.id
                        return (
                            <div
                                key={opt.id}
                                onClick={() => onSelectLayout(opt.id)}
                                role="button"
                                tabIndex={0}
                                style={{
                                    border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 12,
                                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                    padding: '16px 14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    transition: 'all 0.18s ease',
                                    boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.25)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: isSelected ? '#60a5fa' : '#fff' }}>
                                        {opt.title}
                                    </span>
                                    <div 
                                        style={{ 
                                            width: 18, 
                                            height: 18, 
                                            borderRadius: '50%', 
                                            border: isSelected ? '5px solid #3b82f6' : '2px solid rgba(255,255,255,0.3)',
                                            background: '#fff',
                                            boxSizing: 'border-box'
                                        }} 
                                    />
                                </div>
                                <div style={{ color: isSelected ? '#93c5fd' : 'rgba(255, 255, 255, 0.5)', display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                                    {opt.icon}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.35 }}>
                                    {opt.desc}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Tiled Mode Slider (Google Meet standard) */}
                {currentLayout === 'tiled' && onMaxTilesChange && (
                    <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                                Maximum tiles to display
                            </span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(59,130,246,0.15)', padding: '2px 8px', borderRadius: 6 }}>
                                {maxTiles} tiles
                            </span>
                        </div>
                        <input
                            type="range"
                            min={6}
                            max={49}
                            step={1}
                            value={maxTiles}
                            onChange={(e) => onMaxTilesChange(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                            <span>6 tiles</span>
                            <span>16 tiles</span>
                            <span>49 tiles</span>
                        </div>
                    </div>
                )}

                {/* Footer button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                    <button 
                        onClick={onClose} 
                        className="btn btn-primary" 
                        style={{ padding: '8px 24px', fontWeight: 600, borderRadius: 8 }}
                    >
                        Apply Layout
                    </button>
                </div>
            </div>
        </div>
    )
}
