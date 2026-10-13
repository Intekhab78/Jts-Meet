import React from 'react'
import {
    ToolType,
    TOOL_GROUPS,
    PRESET_COLORS,
    STICKY_COLORS
} from '../../whiteboard.types'

interface WhiteboardToolbarProps {
    tool: ToolType
    color: string
    fillMode: 'none' | 'tint' | 'solid'
    size: number
    stickyColor: string
    showColorPalette: boolean
    showStickyPalette: boolean
    showFillMode: boolean
    onSelectTool: (tool: ToolType) => void
    onChangeColor: (color: string) => void
    onChangeStickyColor: (color: string) => void
    onChangeFillMode: (mode: 'none' | 'tint' | 'solid') => void
    onChangeSize: (size: number) => void
}

export function WhiteboardToolbar({
    tool,
    color,
    fillMode,
    size,
    stickyColor,
    showColorPalette,
    showStickyPalette,
    showFillMode,
    onSelectTool,
    onChangeColor,
    onChangeStickyColor,
    onChangeFillMode,
    onChangeSize
}: WhiteboardToolbarProps) {
    return (
        <div style={{
            position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            zIndex: 40
        }}>
            {/* Floating Contextual Inspector (Color swatches, Fill Mode & Stroke slider) */}
            {(showColorPalette || showStickyPalette || showFillMode) && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '6px 14px',
                    background: 'rgba(18, 20, 29, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 9999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.15s ease'
                }}>
                    {/* Sticky Color Swatches */}
                    {showStickyPalette ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>Sticky:</span>
                            {STICKY_COLORS.map((sc) => (
                                <button
                                    key={sc.color}
                                    onClick={() => onChangeStickyColor(sc.color)}
                                    title={sc.name}
                                    style={{
                                        width: 18, height: 18, borderRadius: 4,
                                        background: sc.color,
                                        border: stickyColor === sc.color ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.15)',
                                        cursor: 'pointer',
                                        transform: stickyColor === sc.color ? 'scale(1.2)' : 'scale(1)',
                                        boxShadow: stickyColor === sc.color ? '0 0 8px rgba(99, 102, 241, 0.7)' : 'none',
                                        transition: 'all 0.12s ease'
                                    }}
                                />
                            ))}
                        </div>
                    ) : showColorPalette ? (
                        /* Standard Color Swatches */
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => onChangeColor(c)}
                                    title={c}
                                    style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: c,
                                        border: color === c
                                            ? '2px solid #6366f1'
                                            : (c === '#ffffff' ? '1px solid #94a3b8' : '1px solid rgba(255,255,255,0.2)'),
                                        cursor: 'pointer',
                                        transform: color === c ? 'scale(1.25)' : 'scale(1)',
                                        boxShadow: color === c ? '0 0 10px rgba(99, 102, 241, 0.8)' : 'none',
                                        transition: 'all 0.12s ease'
                                    }}
                                />
                            ))}
                        </div>
                    ) : null}

                    {/* Fill Mode selector (for rect/circle or selected rect/circle) */}
                    {showFillMode && (
                        <>
                            {showColorPalette && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fill</span>
                                {(['none', 'tint', 'solid'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => onChangeFillMode(mode)}
                                        style={{
                                            border: fillMode === mode ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.12)',
                                            background: fillMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                                            color: fillMode === mode ? '#a5b4fc' : '#64748b',
                                            borderRadius: 5, padding: '2px 7px',
                                            fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                                            textTransform: 'uppercase', letterSpacing: '0.04em'
                                        }}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {showColorPalette && (
                        <>
                            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />

                            {/* Size Slider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: Math.min(14, Math.max(4, size)),
                                    height: Math.min(14, Math.max(4, size)),
                                    borderRadius: '50%', background: color === '#ffffff' ? '#94a3b8' : color,
                                    boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                                }} />
                                <input
                                    type="range"
                                    min="2"
                                    max="24"
                                    value={size}
                                    onChange={(e) => onChangeSize(Number(e.target.value))}
                                    style={{ width: 70, cursor: 'pointer', accentColor: '#6366f1' }}
                                />
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#f1f5f9', width: 14 }}>
                                    {size}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* The Primary Island Dock */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 10px',
                background: 'rgba(18, 20, 29, 0.94)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 9999,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 1px 3px rgba(255,255,255,0.08)'
            }}>
                {TOOL_GROUPS.map((group, groupIdx) => (
                    <React.Fragment key={group.id}>
                        {groupIdx > 0 && (
                            <div style={{ width: 1, height: 22, background: 'rgba(255, 255, 255, 0.1)', margin: '0 3px' }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {group.tools.map((t) => {
                                const isActive = tool === t.id
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onSelectTool(t.id)}
                                        title={`${t.label} (${t.shortcut})`}
                                        style={{
                                            width: 36, height: 36,
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: isActive
                                                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                                : 'transparent',
                                            color: isActive ? '#ffffff' : '#94a3b8',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.45)' : 'none',
                                            transform: isActive ? 'scale(1.08)' : 'scale(1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = '#fff'
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = '#94a3b8'
                                                e.currentTarget.style.background = 'transparent'
                                            }
                                        }}
                                    >
                                        {t.icon}
                                    </button>
                                )
                            })}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}
