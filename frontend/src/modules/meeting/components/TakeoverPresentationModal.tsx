import React from 'react'
import { createPortal } from 'react-dom'
import { IconMonitor } from '../../../components/common/Icons'

export interface TakeoverPresentationModalProps {
    isOpen: boolean
    presenterName: string
    onClose: () => void
    onTakeover: () => void
}

export function TakeoverPresentationModal({
    isOpen,
    presenterName,
    onClose,
    onTakeover
}: TakeoverPresentationModalProps) {
    if (!isOpen) return null

    return createPortal(
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999999, padding: 16, boxSizing: 'border-box'
            }}
        >
            <div className="glass-card anim-scale-in" style={{
                maxWidth: 440, width: '100%', padding: 26, borderRadius: 18,
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex', flexDirection: 'column', gap: 18
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(99, 102, 241, 0.3)', flexShrink: 0
                    }}>
                        <IconMonitor size={22} color="#818cf8" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                            Someone is already presenting
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                            Multi-screen presentation
                        </p>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.875rem',
                    color: '#e2e8f0',
                    lineHeight: 1.5
                }}>
                    <strong style={{ color: '#818cf8' }}>{presenterName || 'Another participant'}</strong> is currently sharing their screen.
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        Starting your screen share will keep both presentations live, and attendees can switch between screens using the top Presenter Switcher bar.
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onTakeover}
                        className="btn btn-primary"
                        style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            padding: '8px 20px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconMonitor size={15} />
                        <span>Share Screen Anyway</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
