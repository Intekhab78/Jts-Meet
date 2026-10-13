import React from 'react'
import type { StrokeData } from '../../whiteboard.types'
import { getStrokeBounds } from '../../utils/whiteboard.drawing'
import { IconTrash } from '../../../../components/common/Icons'

interface WhiteboardSelectedActionsProps {
    stroke: StrokeData
    zoom: number
    pan: { x: number; y: number }
    fillMode: 'none' | 'tint' | 'solid'
    onDuplicate: () => void
    onDelete: () => void
    onChangeFillMode: (mode: 'none' | 'tint' | 'solid') => void
    onDeselect: () => void
}

export function WhiteboardSelectedActions({
    stroke,
    zoom,
    pan,
    fillMode,
    onDuplicate,
    onDelete,
    onChangeFillMode,
    onDeselect
}: WhiteboardSelectedActionsProps) {
    const b = getStrokeBounds(stroke)
    const screenX = (b.minX + b.width / 2) * zoom + pan.x
    const screenY = b.minY * zoom + pan.y - 12

    return (
        <div style={{
            position: 'absolute',
            left: screenX,
            top: Math.max(12, screenY),
            transform: 'translate(-50%, -100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            zIndex: 45,
            pointerEvents: 'auto',
            userSelect: 'none'
        }}>
            {/* Move label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: '0.6875rem', fontWeight: 600 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
                    <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
                    <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
                </svg>
                <span>Move</span>
            </div>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />

            {/* Duplicate */}
            <button
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
                title="Duplicate (Ctrl+D)"
                style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    border: 'none', background: 'rgba(99,102,241,0.22)',
                    color: '#a5b4fc', borderRadius: 5, padding: '3px 8px',
                    fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.45)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; e.currentTarget.style.color = '#a5b4fc' }}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Duplicate</span>
            </button>

            {/* Fill mode for rect/circle */}
            {(stroke.tool === 'rect' || stroke.tool === 'circle') && (
                <>
                    <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
                    {(['none', 'tint', 'solid'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={(e) => { e.stopPropagation(); onChangeFillMode(mode) }}
                            title={`Fill: ${mode}`}
                            style={{
                                border: fillMode === mode ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.12)',
                                background: fillMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                                color: fillMode === mode ? '#a5b4fc' : '#64748b',
                                borderRadius: 5, padding: '2px 6px',
                                fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                                textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}
                        >
                            {mode}
                        </button>
                    ))}
                </>
            )}

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />

            {/* Delete */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                title="Delete (Del / Backspace)"
                style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    border: 'none', background: 'rgba(239, 68, 68, 0.22)',
                    color: '#f87171', borderRadius: 5, padding: '3px 8px',
                    fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.45)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'; e.currentTarget.style.color = '#f87171' }}
            >
                <IconTrash size={12} />
                <span>Delete</span>
            </button>

            {/* Deselect X */}
            <button
                onClick={(e) => { e.stopPropagation(); onDeselect() }}
                title="Deselect (Esc)"
                style={{
                    border: 'none', background: 'transparent', color: '#64748b',
                    cursor: 'pointer', fontSize: '0.8125rem', padding: '2px 4px', lineHeight: 1
                }}
            >
                ✕
            </button>
        </div>
    )
}
