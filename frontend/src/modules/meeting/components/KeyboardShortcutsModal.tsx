import React from 'react'

interface KeyboardShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    if (!isOpen) return null

    const shortcuts = [
        { key: 'Space (Hold)', desc: 'Push to talk (temporary un-mute)' },
        { key: 'Ctrl / Cmd + D', desc: 'Toggle Microphone on/off' },
        { key: 'Ctrl / Cmd + E', desc: 'Toggle Camera on/off' },
        { key: 'Ctrl / Cmd + Shift + S', desc: 'Toggle Screen Sharing' },
        { key: 'Ctrl / Cmd + Shift + C', desc: 'Toggle Live Closed Captions' },
        { key: 'Ctrl / Cmd + Shift + W', desc: 'Toggle Collaborative Whiteboard' },
        { key: 'Ctrl / Cmd + Shift + M', desc: 'Host: Mute all participants' },
        { key: 'Esc', desc: 'Close dialogs, whiteboard, or side panels' }
    ]

    return (
        <div className="modal-overlay">
            <div className="modal-container anim-scale-in" style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.25rem' }}>⌨️</span>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#fff' }}>Keyboard Shortcuts</h3>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {shortcuts.map((sc, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{sc.desc}</span>
                            <kbd style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 4,
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--color-accent)',
                                fontFamily: 'monospace'
                            }}>
                                {sc.key}
                            </kbd>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px' }}>
                        Got it
                    </button>
                </div>
            </div>
        </div>
    )
}
