import React, { useState } from 'react'
import { copyToClipboard } from '../../../utils/clipboard'
import {
    IconX,
    IconCopy,
    IconCalendar,
    IconDownload,
    IconMessage
} from '../../../components/common/Icons'

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
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [invitePhone, setInvitePhone] = useState('')
    const [sendingInvite, setSendingInvite] = useState(false)

    if (!isOpen) return null

    const meetLink = `${window.location.origin}/meet/${meetingId}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(meetLink)}`
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=JTS-Meet%20Session&details=Join%20the%20video%20call:%20${encodeURIComponent(meetLink)}`
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=JTS-Meet%20Session&body=Join%20the%20video%20call:%20${encodeURIComponent(meetLink)}`

    const handleCopy = async () => {
        await copyToClipboard(meetLink)
        setInviteLinkCopied(true)
        addToast('Meeting link copied to clipboard!', 'success')
        setTimeout(() => setInviteLinkCopied(false), 2500)
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
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    meetingId: meetingId,
                    toEmail: inviteEmail.trim()
                })
            })
            if (response.ok) {
                addToast(`Invite email sent to ${inviteEmail.trim()}`, 'success')
                setInviteEmail('')
            } else {
                addToast('Failed to send email invite', 'warning')
            }
        } catch (err) {
            addToast('Network error sending invite', 'warning')
        } finally {
            setSendingInvite(false)
        }
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="glass-card anim-scale-in" style={{ width: '100%', maxWidth: 540, background: 'rgba(15, 17, 23, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90dvh' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Invite Participants</h3>
                    <button
                        onClick={onClose}
                        className="btn-icon"
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
                    >
                        <IconX />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Link Copy Section */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                            Meeting Invite Link
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                readOnly
                                value={meetLink}
                                onFocus={(e) => e.target.select()}
                                style={{
                                    flex: 1,
                                    background: 'var(--color-surface-2)',
                                    border: inviteLinkCopied ? '1px solid #22c55e' : '1px solid var(--color-border)',
                                    boxShadow: inviteLinkCopied ? '0 0 10px rgba(34, 197, 94, 0.25)' : 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '10px 12px',
                                    color: inviteLinkCopied ? '#86efac' : '#a5b4fc',
                                    fontFamily: 'monospace',
                                    fontSize: '0.8125rem',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className={inviteLinkCopied ? "btn btn-success" : "btn btn-secondary"}
                                style={{
                                    padding: '0 16px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    background: inviteLinkCopied ? '#16a34a' : undefined,
                                    borderColor: inviteLinkCopied ? '#16a34a' : undefined,
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {inviteLinkCopied ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                        <span>Copy Link</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Email Invite Section */}
                    <form onSubmit={handleSendEmailInvite}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                            Email Invitation
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="email"
                                required
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Enter recipient email address"
                                style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                            />
                            <button
                                type="submit"
                                disabled={sendingInvite || !inviteEmail}
                                className="btn btn-primary"
                                style={{ padding: '0 16px', fontSize: '0.8125rem', fontWeight: 700 }}
                            >
                                {sendingInvite ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </form>

                    {/* SMS Invite Section */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                            SMS Invite <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>(Future-ready Demo)</span>
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="tel"
                                value={invitePhone}
                                onChange={(e) => setInvitePhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    addToast('SMS Gateway Integration configured (future-ready mock trigger).', 'info');
                                    setInvitePhone('');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0 16px', fontSize: '0.8125rem', fontWeight: 600 }}
                            >
                                Send SMS
                            </button>
                        </div>
                    </div>

                    {/* QR Code & Quick Shares */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center', marginTop: 8 }}>
                        {/* QR Code graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <img
                                src={qrUrl}
                                alt="Meeting Invite QR Code"
                                style={{ width: 120, height: 120, borderRadius: 'var(--radius-sm)', background: '#fff', padding: 6 }}
                            />
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Scan QR to Join Session</span>
                        </div>

                        {/* WhatsApp & Calendars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <a
                                href={`https://api.whatsapp.com/send?text=Join%20my%20JTS-Meet%20session:%20${encodeURIComponent(meetLink)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{ background: '#25d366', color: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none' }}
                            >
                                <IconMessage size={14} color="#fff" /> Share on WhatsApp
                            </a>

                            <a
                                href={gCalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                                <IconCalendar size={14} /> Google Calendar
                            </a>

                            <a
                                href={outlookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                                <IconCalendar size={14} /> Outlook Calendar
                            </a>

                            <button
                                type="button"
                                onClick={downloadICSFile}
                                className="btn btn-secondary"
                                style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <IconDownload size={14} /> Download iCal (.ics)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
