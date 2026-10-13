import React from 'react'
import { IconZoomIn, IconZoomOut } from '../../../../components/common/Icons'

interface WhiteboardZoomControlsProps {
    zoom: number
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoomAndPan: () => void
}

export function WhiteboardZoomControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onResetZoomAndPan
}: WhiteboardZoomControlsProps) {
    return (
        <div style={{
            position: 'absolute', bottom: 26, right: 24,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px',
            background: 'rgba(18, 20, 29, 0.94)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 9999,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 30
        }}>
            <button
                onClick={onZoomOut}
                title="Zoom Out (-)"
                style={{
                    border: 'none', background: 'transparent',
                    color: '#94a3b8', cursor: 'pointer', padding: 4,
                    display: 'flex', borderRadius: 4
                }}
            >
                <IconZoomOut size={14} />
            </button>

            <button
                onClick={onResetZoomAndPan}
                title="Reset to 100% (0)"
                style={{
                    border: 'none', background: 'transparent',
                    color: '#a5b4fc', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 700, minWidth: 44, textAlign: 'center'
                }}
            >
                {Math.round(zoom * 100)}%
            </button>

            <button
                onClick={onZoomIn}
                title="Zoom In (+)"
                style={{
                    border: 'none', background: 'transparent',
                    color: '#94a3b8', cursor: 'pointer', padding: 4,
                    display: 'flex', borderRadius: 4
                }}
            >
                <IconZoomIn size={14} />
            </button>
        </div>
    )
}
