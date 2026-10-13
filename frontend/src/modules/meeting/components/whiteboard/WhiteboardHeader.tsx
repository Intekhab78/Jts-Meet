import React from 'react'
import type { GridPattern } from '../../whiteboard.types'
import {
    IconTrash,
    IconDownload,
    IconUndo,
    IconRedo,
    IconFileText,
    IconChevronLeft,
    IconChevronRight,
    IconGrid
} from '../../../../components/common/Icons'

interface WhiteboardHeaderProps {
    currentPageIndex: number
    totalPages: number
    canUndo: boolean
    canRedo: boolean
    gridPattern: GridPattern
    showPatternMenu: boolean
    showExportMenu: boolean
    onSwitchPage: (pageIndex: number) => void
    onAddPage: () => void
    onDeletePage: () => void
    onUndo: () => void
    onRedo: () => void
    onTogglePatternMenu: () => void
    onSelectPattern: (pattern: GridPattern) => void
    onToggleExportMenu: () => void
    onExportPNG: () => void
    onExportPDF: () => void
    onClear: () => void
    onClose: () => void
}

export function WhiteboardHeader({
    currentPageIndex,
    totalPages,
    canUndo,
    canRedo,
    gridPattern,
    showPatternMenu,
    showExportMenu,
    onSwitchPage,
    onAddPage,
    onDeletePage,
    onUndo,
    onRedo,
    onTogglePatternMenu,
    onSelectPattern,
    onToggleExportMenu,
    onExportPNG,
    onExportPDF,
    onClear,
    onClose
}: WhiteboardHeaderProps) {
    return (
        <div style={{
            height: 52, padding: '0 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(17, 19, 27, 0.94)',
            backdropFilter: 'blur(12px)',
            zIndex: 30
        }}>
            {/* Left: Branding & Multi-Page Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                    }}>
                        <span style={{ fontSize: 13, fontWeight: 900 }}>W</span>
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                        Whiteboard
                    </span>
                    {/* Live Sync Indicator */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '2px 8px', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, color: '#34d399'
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        Live Sync
                    </div>
                </div>

                <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Page Navigation Strip */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '3px 8px', borderRadius: 8
                }}>
                    <button
                        onClick={() => onSwitchPage(currentPageIndex - 1)}
                        disabled={currentPageIndex === 0}
                        title="Previous Slide"
                        style={{
                            border: 'none', background: 'transparent',
                            color: currentPageIndex === 0 ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                            cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                            padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4
                        }}
                    >
                        <IconChevronLeft size={14} />
                    </button>

                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9', minWidth: 64, textAlign: 'center' }}>
                        Slide {Math.min(currentPageIndex + 1, Math.max(1, totalPages))} / {Math.max(1, totalPages)}
                    </span>

                    <button
                        onClick={() => onSwitchPage(currentPageIndex + 1)}
                        disabled={currentPageIndex >= totalPages - 1}
                        title="Next Slide"
                        style={{
                            border: 'none', background: 'transparent',
                            color: currentPageIndex >= totalPages - 1 ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                            cursor: currentPageIndex >= totalPages - 1 ? 'not-allowed' : 'pointer',
                            padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4
                        }}
                    >
                        <IconChevronRight size={14} />
                    </button>

                    <button
                        onClick={onAddPage}
                        title="Add New Slide"
                        style={{
                            border: 'none', background: 'rgba(99, 102, 241, 0.22)',
                            color: '#a5b4fc', cursor: 'pointer', borderRadius: 5,
                            padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: '0.6875rem', fontWeight: 700, marginLeft: 4,
                            transition: 'background 0.15s ease'
                        }}
                    >
                        + New Slide
                    </button>

                    {totalPages > 1 && (
                        <button
                            onClick={onDeletePage}
                            title="Delete Current Slide"
                            style={{
                                border: 'none', background: 'rgba(239, 68, 68, 0.14)',
                                color: '#f87171', cursor: 'pointer', borderRadius: 5,
                                padding: '3px 6px', display: 'flex', alignItems: 'center', marginLeft: 2
                            }}
                        >
                            <IconTrash size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Right: History, Pattern, Export & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Undo / Redo */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8, padding: '2px 4px'
                }}>
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                        style={{
                            border: 'none', background: 'transparent',
                            color: canUndo ? '#e2e8f0' : 'rgba(255,255,255,0.2)',
                            cursor: canUndo ? 'pointer' : 'not-allowed',
                            padding: '5px 7px', borderRadius: 5, display: 'flex'
                        }}
                    >
                        <IconUndo size={14} />
                    </button>
                    <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Y)"
                        style={{
                            border: 'none', background: 'transparent',
                            color: canRedo ? '#e2e8f0' : 'rgba(255,255,255,0.2)',
                            cursor: canRedo ? 'pointer' : 'not-allowed',
                            padding: '5px 7px', borderRadius: 5, display: 'flex'
                        }}
                    >
                        <IconRedo size={14} />
                    </button>
                </div>

                {/* Canvas Background Pattern */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={onTogglePatternMenu}
                        title="Change Canvas Grid"
                        style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#e2e8f0', borderRadius: 8, padding: '5px 10px',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <IconGrid size={13} color="#94a3b8" />
                        <span style={{ textTransform: 'capitalize' }}>{gridPattern}</span>
                    </button>

                    {showPatternMenu && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: 6,
                            background: 'rgba(18, 20, 29, 0.98)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 10, padding: 6, zIndex: 60, minWidth: 125,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 2
                        }}>
                            {(['dots', 'grid', 'lines', 'blank'] as GridPattern[]).map((pat) => (
                                <button
                                    key={pat}
                                    onClick={() => onSelectPattern(pat)}
                                    style={{
                                        border: 'none',
                                        background: gridPattern === pat ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                                        color: gridPattern === pat ? '#fff' : '#cbd5e1',
                                        textAlign: 'left', padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize'
                                    }}
                                >
                                    {pat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Export Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={onToggleExportMenu}
                        title="Export Whiteboard"
                        style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#e2e8f0', borderRadius: 8, padding: '5px 12px',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <IconDownload size={13} color="#a5b4fc" />
                        <span>Export</span>
                    </button>

                    {showExportMenu && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: 6,
                            background: 'rgba(18, 20, 29, 0.98)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 10, padding: 6, zIndex: 60, minWidth: 160,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 4
                        }}>
                            <button
                                onClick={onExportPNG}
                                style={{
                                    border: 'none', background: 'transparent', color: '#f1f5f9',
                                    textAlign: 'left', padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                                    fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                <IconDownload size={13} color="#818cf8" />
                                <span>Export PNG (Slide {currentPageIndex + 1})</span>
                            </button>
                            <button
                                onClick={onExportPDF}
                                style={{
                                    border: 'none', background: 'transparent', color: '#f1f5f9',
                                    textAlign: 'left', padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                                    fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                <IconFileText size={13} color="#f43f5e" />
                                <span>Export PDF ({totalPages} Slides)</span>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClear}
                    title="Clear Slide"
                    style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#94a3b8', borderRadius: 8, padding: '5px 8px',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                    }}
                >
                    <IconTrash size={14} />
                </button>

                <button
                    onClick={onClose}
                    title="Close Whiteboard"
                    style={{
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#fff', borderRadius: 8, padding: '5px 14px',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )
}
