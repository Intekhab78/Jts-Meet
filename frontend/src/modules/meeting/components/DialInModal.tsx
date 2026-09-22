import React, { useState, useEffect } from 'react'
import { API_BASE } from '../../../config'

interface DialInNumber {
    country: string
    countryCode: string
    flag: string
    phoneNumber: string
    rawNumber: string
    isTollFree?: boolean
}

interface DialInModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    meetingTitle?: string
}

export const DialInModal: React.FC<DialInModalProps> = ({
    isOpen,
    onClose,
    meetingId,
    meetingTitle
}) => {
    const [loading, setLoading] = useState<boolean>(true)
    const [pin, setPin] = useState<string>('784 921 #')
    const [oneClickTel, setOneClickTel] = useState<string>('tel:+18885554633,,784921#')
    const [numbers, setNumbers] = useState<DialInNumber[]>([
        { country: 'United States', countryCode: 'US', flag: '🇺🇸', phoneNumber: '+1 (888) 555-4633', rawNumber: '+18885554633', isTollFree: true },
        { country: 'India', countryCode: 'IN', flag: '🇮🇳', phoneNumber: '+91 11 4080 5871', rawNumber: '+911140805871', isTollFree: false },
        { country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', phoneNumber: '+44 20 7946 0991', rawNumber: '+442079460991', isTollFree: false },
        { country: 'Singapore', countryCode: 'SG', flag: '🇸🇬', phoneNumber: '+65 6701 1892', rawNumber: '+6567011892', isTollFree: false },
        { country: 'Germany', countryCode: 'DE', flag: '🇩🇪', phoneNumber: '+49 30 2000 8912', rawNumber: '+493020008912', isTollFree: false }
    ])
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const [copiedPin, setCopiedPin] = useState<boolean>(false)

    useEffect(() => {
        if (!isOpen || !meetingId) return

        let isMounted = true
        const fetchDialIn = async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API_BASE}/api/telephony/${meetingId}/dial-in-info`)
                const json = await res.json()
                if (isMounted && json.success && json.data) {
                    setPin(json.data.formattedPin || `${json.data.pin}#`)
                    setOneClickTel(json.data.oneClickTelUri)
                    if (Array.isArray(json.data.phoneNumbers) && json.data.phoneNumbers.length > 0) {
                        setNumbers(json.data.phoneNumbers)
                    }
                }
            } catch (err) {
                console.warn('[DialInModal] Failed to fetch live dial-in info, using defaults:', err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchDialIn()
        return () => { isMounted = false }
    }, [isOpen, meetingId])

    if (!isOpen) return null

    const handleCopyNumber = (num: string, idx: number) => {
        navigator.clipboard.writeText(num)
        setCopiedIndex(idx)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const handleCopyPin = () => {
        navigator.clipboard.writeText(pin.replace(/\D/g, ''))
        setCopiedPin(true)
        setTimeout(() => setCopiedPin(false), 2000)
    }

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
                    maxWidth: '560px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: '#11141c',
                    border: '1px solid rgba(14, 165, 233, 0.35)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(14, 165, 233, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#f8fafc',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}
            >
                {/* Modal Header */}
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
                                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                                    Phone Audio Dial-In (PSTN)
                                </h3>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 800,
                                        backgroundColor: 'rgba(14, 165, 233, 0.2)',
                                        color: '#38bdf8',
                                        border: '1px solid rgba(14, 165, 233, 0.4)',
                                        padding: '2px 7px',
                                        borderRadius: '9999px',
                                        letterSpacing: '0.04em'
                                    }}
                                >
                                    ENTERPRISE
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                                Join {meetingTitle || `Meeting ${meetingId}`} by standard phone call
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

                {/* Modal Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* PIN Card with 1-Click Call */}
                    <div
                        style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%)',
                            border: '1px solid rgba(14, 165, 233, 0.35)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Conference Access PIN
                            </div>
                            <div style={{ fontSize: '1.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', marginTop: '2px' }}>
                                {loading ? 'Loading...' : pin}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                Enter on phone keypad when voice prompt asks
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleCopyPin}
                                style={{
                                    padding: '8px 14px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: '#f1f5f9',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    {copiedPin ? <polyline points="20 6 9 17 4 12" /> : (
                                        <>
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </>
                                    )}
                                </svg>
                                <span>{copiedPin ? 'Copied' : 'Copy PIN'}</span>
                            </button>

                            <a
                                href={oneClickTel}
                                style={{
                                    padding: '8px 14px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    backgroundColor: '#0284c7',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>1-Click Call</span>
                            </a>
                        </div>
                    </div>

                    {/* Global Access Numbers */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Global Dial-In Telephone Numbers
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                Toll-free & local rates apply
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                            {numbers.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '1.4rem' }}>{item.flag}</span>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {item.country}
                                                {item.isTollFree && (
                                                    <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                                                        TOLL-FREE
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                                                {item.phoneNumber}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            onClick={() => handleCopyNumber(item.rawNumber, idx)}
                                            title="Copy phone number"
                                            style={{
                                                padding: '6px 10px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: '#cbd5e1',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                {copiedIndex === idx ? <polyline points="20 6 9 17 4 12" /> : (
                                                    <>
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </>
                                                )}
                                            </svg>
                                            <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                                        </button>

                                        <a
                                            href={`tel:${item.rawNumber},,${pin.replace(/\D/g, '')}#`}
                                            title="Dial directly from phone"
                                            style={{
                                                padding: '6px 10px',
                                                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                                borderRadius: '8px',
                                                color: '#38bdf8',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                            </svg>
                                            <span>Call</span>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How It Works Explainer */}
                    <div
                        style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            lineHeight: 1.5
                        }}
                    >
                        <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>How to connect:</div>
                        <div>1. Dial any telephone number from your mobile or office desk phone.</div>
                        <div>2. When prompted, enter conference PIN <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{pin}</strong> followed by pound (<strong style={{ color: '#38bdf8' }}>#</strong>).</div>
                        <div>3. You will be instantly bridged into this room's live audio conversation.</div>
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
                            backgroundColor: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
