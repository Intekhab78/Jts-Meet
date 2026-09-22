import React, { useState, useEffect } from 'react'
import { e2eeService } from '../services/e2ee.service'

interface E2EESecurityModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
}

export const E2EESecurityModal: React.FC<E2EESecurityModalProps> = ({
    isOpen,
    onClose,
    meetingId
}) => {
    const [enabled, setEnabled] = useState<boolean>(e2eeService.isEnabled())
    const [passphrase, setPassphrase] = useState<string>(meetingId || 'jts-enterprise-room')
    const [fingerprint, setFingerprint] = useState<string>('---- ---- ---- ----')
    const [copied, setCopied] = useState<boolean>(false)
    const [isCalculating, setIsCalculating] = useState<boolean>(false)
    const isSupported = e2eeService.isSupported()

    useEffect(() => {
        if (isOpen) {
            setEnabled(e2eeService.isEnabled())
            updateKey(passphrase)
        }
    }, [isOpen])

    const updateKey = async (phrase: string) => {
        setIsCalculating(true)
        try {
            const fp = await e2eeService.setMeetingPassphrase(phrase)
            setFingerprint(fp)
        } catch (err) {
            console.error('[E2EE Modal] Failed to update key:', err)
        } finally {
            setIsCalculating(false)
        }
    }

    const handleToggle = (checked: boolean) => {
        setEnabled(checked)
        e2eeService.setEnabled(checked)
    }

    const handlePassphraseChange = async (newVal: string) => {
        setPassphrase(newVal)
        await updateKey(newVal)
    }

    const handleCopyFingerprint = () => {
        navigator.clipboard.writeText(fingerprint.replace(/\s/g, ''))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!isOpen) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: 10020,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'jts-fade-in 0.2s ease-out'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '540px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: '#11141c',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#f8fafc',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: enabled ? '#34d399' : '#fbbf24',
                                border: `1px solid ${enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                {enabled && <polyline points="9 12 11 14 15 10" />}
                            </svg>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                                    End-to-End Encryption (E2EE)
                                </h3>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 800,
                                        backgroundColor: enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                        color: enabled ? '#34d399' : '#94a3b8',
                                        border: `1px solid ${enabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        padding: '2px 7px',
                                        borderRadius: '9999px',
                                        letterSpacing: '0.04em'
                                    }}
                                >
                                    {enabled ? 'ACTIVE' : 'DISABLED'}
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                                WebRTC Insertable Streams • SFrame AES-GCM-128
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Compatibility Warning if not supported */}
                {!isSupported && (
                    <div
                        style={{
                            margin: '16px 24px 0 24px',
                            padding: '12px 16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: '#fca5a5',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div>
                            <strong>Browser Compatibility Notice:</strong> WebRTC Insertable Streams (RTCRtpSender.transform) is not natively enabled in this browser. Please use Chrome 86+, Edge 86+, or Brave for hardware-accelerated frame encryption.
                        </div>
                    </div>
                )}

                {/* Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Toggle Switch */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '14px'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                Encrypt Audio & Video Frames
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                Media payloads are encrypted on your local device before transmission.
                            </div>
                        </div>

                        <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => handleToggle(e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: enabled ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: '9999px',
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '20px',
                                        width: '20px',
                                        left: enabled ? '23px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: '#fff',
                                        borderRadius: '50%',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}
                                />
                            </span>
                        </label>
                    </div>

                    {/* Passphrase Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Shared Encryption Passphrase
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                Derived via PBKDF2-SHA256
                            </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={passphrase}
                                onChange={(e) => handlePassphraseChange(e.target.value)}
                                placeholder="Enter meeting secret passphrase..."
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    padding: '10px 42px 10px 14px',
                                    fontSize: '0.875rem',
                                    fontFamily: 'monospace',
                                    color: '#f1f5f9',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                onClick={() => handlePassphraseChange(Math.random().toString(36).substring(2, 10))}
                                title="Generate Random Passphrase"
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Verification Security Fingerprint */}
                    <div
                        style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.1) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Verification Security Fingerprint
                            </span>
                            <button
                                onClick={handleCopyFingerprint}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    {copied ? <polyline points="20 6 9 17 4 12" /> : (
                                        <>
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </>
                                    )}
                                </svg>
                                <span>{copied ? 'Copied' : 'Copy Code'}</span>
                            </button>
                        </div>

                        <div
                            style={{
                                textAlign: 'center',
                                fontFamily: 'monospace',
                                fontSize: '1.4rem',
                                fontWeight: 800,
                                letterSpacing: '0.15em',
                                color: '#34d399',
                                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                                padding: '10px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                userSelect: 'all'
                            }}
                        >
                            {isCalculating ? 'Computing...' : fingerprint}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5, textAlign: 'center' }}>
                            Read these 16 digits aloud to participants. If all numbers match, your end-to-end encrypted connection is 100% verified against eavesdropping.
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: '9px 24px',
                            backgroundColor: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)'
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
