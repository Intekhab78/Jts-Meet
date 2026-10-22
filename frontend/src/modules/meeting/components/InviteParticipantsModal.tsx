import React, { useState } from 'react'
import { copyToClipboard } from '../../../utils/clipboard'
import { API_BASE } from '../../../config'

export interface InviteParticipantsModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    token?: string
    addToast: (msg: string, type?: 'info' | 'success' | 'warning') => void
}

export function InviteParticipantsModal({
    isOpen,
    onClose,
    meetingId,
    token,
    addToast
}: InviteParticipantsModalProps) {
    const [copiedLink, setCopiedLink] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [sendingInvite, setSendingInvite] = useState(false)
    const [smsNumber, setSmsNumber] = useState('')
    const [sendingSms, setSendingSms] = useState(false)

    if (!isOpen) return null

    const authToken = token || localStorage.getItem('jts_token') || localStorage.getItem('token') || ''
    const meetLink = `${window.location.origin}/meet/${meetingId}`
    const fullJoiningInfo = `Join the JTS Meet call:\n${meetLink}\n\nMeeting Code: ${meetingId}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(meetLink)}`
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=JTS-Meet%20Session&details=Join%20the%20video%20call:%20${encodeURIComponent(meetLink)}`
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=JTS-Meet%20Session&body=Join%20the%20video%20call:%20${encodeURIComponent(meetLink)}`

    const handleCopyLink = async () => {
        await copyToClipboard(meetLink)
        setCopiedLink(true)
        addToast('Meeting link copied to clipboard!', 'success')
        setTimeout(() => setCopiedLink(false), 2500)
    }

    const handleSendEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return

        setSendingInvite(true)
        try {
            const response = await fetch(`${API_BASE}/api/meeting/invite-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    meetingId: meetingId,
                    toEmail: inviteEmail.trim()
                })
            })
            if (response.ok) {
                addToast(`Invite email successfully sent to ${inviteEmail.trim()}`, 'success')
                setInviteEmail('')
            } else {
                const data = await response.json().catch(() => null)
                addToast(data?.message || 'Failed to send email invite', 'warning')
            }
        } catch {
            addToast('Network error sending invite', 'warning')
        } finally {
            setSendingInvite(false)
        }
    }

    const handleSendSms = (e: React.FormEvent) => {
        e.preventDefault()
        if (!smsNumber.trim()) return

        setSendingSms(true)
        setTimeout(() => {
            setSendingSms(false)
            addToast(`SMS invitation queued for ${smsNumber.trim()} (Demo Mode)`, 'success')
            setSmsNumber('')
        }, 500)
    }

    const downloadICSFile = () => {
        const currentMeetingId = meetingId || 'session'
        const now = new Date()
        const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        const start = formatDate(now)
        const end = formatDate(new Date(now.getTime() + 60 * 60 * 1000))
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JTS Meet//Meeting Scheduler//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${currentMeetingId}-${Date.now()}@jts-meet.com`,
            `DTSTAMP:${start}`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            'SUMMARY:JTS-Meet Conference Session',
            `DESCRIPTION:Join the secure video session: ${meetLink}`,
            `URL:${meetLink}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n')

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `jts-meet-${currentMeetingId}.ics`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        addToast('Calendar event downloaded (.ics)', 'info')
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}
        >
            <div
                className="anim-scale-in"
                style={{
                    width: '100%',
                    maxWidth: 520,
                    background: '#0d1117',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'inherit'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#f8fafc',
                        margin: 0,
                        letterSpacing: '-0.02em'
                    }}>
                        Invite Participants
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            padding: 0
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body Content */}
                <div style={{
                    padding: '22px 24px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18
                }}>

                    {/* Section 1: MEETING INVITE LINK */}
                    <div>
                        <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 8
                        }}>
                            MEETING INVITE LINK
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center'
                        }}>
                            <div style={{
                                flex: 1,
                                minWidth: 0,
                                background: '#131722',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                color: '#94a3b8',
                                fontSize: '0.82rem',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                            title={meetLink}
                            >
                                {meetLink}
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                style={{
                                    height: 42,
                                    padding: '0 16px',
                                    background: '#1a202c',
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    borderRadius: 10,
                                    color: '#ffffff',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    whiteSpace: 'nowrap',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#222938')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#1a202c')}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Section 2: EMAIL INVITATION */}
                    <div>
                        <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 8
                        }}>
                            EMAIL INVITATION
                        </div>
                        <form onSubmit={handleSendEmailInvite} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Enter recipient email address"
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    height: 42,
                                    boxSizing: 'border-box',
                                    background: '#131722',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 10,
                                    padding: '0 14px',
                                    color: '#ffffff',
                                    fontSize: '0.84rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={sendingInvite || !inviteEmail.trim()}
                                style={{
                                    height: 42,
                                    padding: '0 18px',
                                    background: '#353c66',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: 10,
                                    color: '#ffffff',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    cursor: sendingInvite || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                                    opacity: sendingInvite || !inviteEmail.trim() ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!sendingInvite && inviteEmail.trim()) {
                                        e.currentTarget.style.background = '#40497e'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#353c66'
                                }}
                            >
                                {sendingInvite ? 'Sending...' : 'Send Email'}
                            </button>
                        </form>
                    </div>

                    {/* Section 3: SMS INVITE (FUTURE-READY DEMO) */}
                    <div>
                        <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 8
                        }}>
                            SMS INVITE (FUTURE-READY DEMO)
                        </div>
                        <form onSubmit={handleSendSms} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input
                                type="tel"
                                value={smsNumber}
                                onChange={(e) => setSmsNumber(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    height: 42,
                                    boxSizing: 'border-box',
                                    background: '#131722',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 10,
                                    padding: '0 14px',
                                    color: '#ffffff',
                                    fontSize: '0.84rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={sendingSms || !smsNumber.trim()}
                                style={{
                                    height: 42,
                                    padding: '0 18px',
                                    background: '#1a202c',
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    borderRadius: 10,
                                    color: '#ffffff',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    cursor: sendingSms || !smsNumber.trim() ? 'not-allowed' : 'pointer',
                                    opacity: sendingSms || !smsNumber.trim() ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    whiteSpace: 'nowrap',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!sendingSms && smsNumber.trim()) {
                                        e.currentTarget.style.background = '#222938'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#1a202c'
                                }}
                            >
                                {sendingSms ? 'Sending...' : 'Send SMS'}
                            </button>
                        </form>
                    </div>

                    {/* Section 4: Bottom 2-Column Split (QR Code + Actions Stack) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '180px 1fr',
                        gap: 16,
                        marginTop: 4
                    }}>
                        {/* Left Card: QR Code */}
                        <div style={{
                            background: '#131722',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 12,
                            padding: '16px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12
                        }}>
                            <div style={{
                                background: '#ffffff',
                                borderRadius: 8,
                                padding: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}>
                                <img
                                    src={qrUrl}
                                    alt="Scan QR to Join Session"
                                    style={{
                                        width: 120,
                                        height: 120,
                                        display: 'block'
                                    }}
                                />
                            </div>
                            <span style={{
                                fontSize: '0.72rem',
                                color: '#94a3b8',
                                fontWeight: 600,
                                textAlign: 'center',
                                lineHeight: 1.3
                            }}>
                                Scan QR to Join Session
                            </span>
                        </div>

                        {/* Right Stack: WhatsApp, Google Calendar, Outlook Calendar, iCal */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            justifyContent: 'space-between'
                        }}>
                            {/* WhatsApp Button */}
                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(fullJoiningInfo)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    height: 40,
                                    background: '#22c55e',
                                    borderRadius: 8,
                                    color: '#ffffff',
                                    fontSize: '0.84rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
                                    transition: 'opacity 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.92')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.22-.556-1.954-.809-3.21-2.801-3.308-2.93-.097-.13-.787-1.047-.787-1.996 0-.949.497-1.416.674-1.611.177-.195.385-.244.513-.244.128 0 .256.002.368.007.119.006.278-.045.434.33.16.386.545 1.332.593 1.43.049.099.082.215.016.345-.065.13-.098.21-.194.323-.096.113-.203.252-.29.339-.096.096-.197.2-.085.393.112.193.499.824 1.07 1.332.735.654 1.354.856 1.547.953.193.097.306.082.419-.048.113-.13.483-.563.612-.756.129-.193.257-.161.434-.096.177.065 1.125.53 1.318.627.193.097.322.145.37.226.048.081.048.47-.096.875z" />
                                </svg>
                                <span>Share on WhatsApp</span>
                            </a>

                            {/* Google Calendar */}
                            <a
                                href={gCalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    height: 38,
                                    background: '#171c26',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    color: '#ffffff',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#202633')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#171c26')}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>Google Calendar</span>
                            </a>

                            {/* Outlook Calendar */}
                            <a
                                href={outlookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    height: 38,
                                    background: '#171c26',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    color: '#ffffff',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#202633')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#171c26')}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>Outlook Calendar</span>
                            </a>

                            {/* Download iCal (.ics) */}
                            <button
                                type="button"
                                onClick={downloadICSFile}
                                style={{
                                    height: 38,
                                    background: '#171c26',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    color: '#ffffff',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#202633')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#171c26')}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span>Download iCal (.ics)</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
