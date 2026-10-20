import React, { useState, useMemo } from 'react'
import {
    IconClock,
    IconUsers,
    IconUser,
    IconHistory,
    IconDashboard,
    IconStickyNote,
    IconArrowRight,
    IconZap
} from '../../../components/common/Icons'

export interface PostMeetingCapsuleAttendee {
    id: string
    name: string
    talkTimeSeconds?: number
    isHost?: boolean
}

export interface PostMeetingCapsuleChatMessage {
    senderName: string
    message: string
    timestamp?: string | number | Date
}

export interface PostMeetingCapsuleActionItem {
    id: string
    text: string
    done?: boolean
    speaker?: string
}

export interface PostMeetingCapsuleData {
    meetingId?: string
    title: string
    duration: string
    durationSeconds?: number
    endTime?: Date | string
    hostName?: string
    attendees?: PostMeetingCapsuleAttendee[]
    talkTime?: Record<string, number>
    notes?: string
    actionItems?: PostMeetingCapsuleActionItem[]
    messages?: PostMeetingCapsuleChatMessage[]
    transcripts?: Array<{ speaker: string; text: string; timestamp?: any }>
    isCloudRecording?: boolean
}

export interface PostMeetingCapsuleModalProps {
    capsule: PostMeetingCapsuleData | null
    isOpen: boolean
    onClose: () => void
    onRejoin?: () => void
}

type CapsuleTab = 'summary' | 'attendees' | 'chat'

export function PostMeetingCapsuleModal({
    capsule,
    isOpen,
    onClose,
    onRejoin
}: PostMeetingCapsuleModalProps) {
    if (!isOpen || !capsule) return null

    const [activeTab, setActiveTab] = useState<CapsuleTab>('summary')
    const [copiedRoomId, setCopiedRoomId] = useState(false)
    const [copiedSummary, setCopiedSummary] = useState(false)
    const [actionItems, setActionItems] = useState<PostMeetingCapsuleActionItem[]>(() => {
        if (capsule.actionItems && capsule.actionItems.length > 0) {
            return capsule.actionItems
        }
        return []
    })
    const [newActionText, setNewActionText] = useState('')

    // Format meeting end time
    const formattedEndTime = useMemo(() => {
        const d = capsule.endTime ? new Date(capsule.endTime) : new Date()
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }, [capsule.endTime])

    // Compile attendees and calculate talk time totals
    const attendeesList = useMemo(() => {
        if (capsule.attendees && capsule.attendees.length > 0) {
            return capsule.attendees
        }
        return [
            {
                id: 'me',
                name: capsule.hostName || 'Host',
                talkTimeSeconds: capsule.talkTime?.['me'] || 0,
                isHost: true
            }
        ]
    }, [capsule.attendees, capsule.hostName, capsule.talkTime])

    const totalTalkSeconds = useMemo(() => {
        return attendeesList.reduce((acc, a) => acc + (a.talkTimeSeconds || 0), 0) || 1
    }, [attendeesList])

    const formatSeconds = (sec: number = 0) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        if (m === 0) return `${s}s`
        return `${m}m ${s.toString().padStart(2, '0')}s`
    }

    const handleCopyRoomId = () => {
        if (!capsule.meetingId) return
        navigator.clipboard.writeText(capsule.meetingId).then(() => {
            setCopiedRoomId(true)
            setTimeout(() => setCopiedRoomId(false), 2000)
        }).catch(() => {})
    }

    const toggleActionItem = (id: string) => {
        setActionItems(prev => prev.map(item =>
            item.id === id ? { ...item, done: !item.done } : item
        ))
    }

    const handleAddActionItem = (e: React.FormEvent) => {
        e.preventDefault()
        const text = newActionText.trim()
        if (!text) return
        setActionItems(prev => [
            ...prev,
            { id: `action_${Date.now()}`, text, done: false }
        ])
        setNewActionText('')
    }

    // Generate comprehensive markdown document
    const generateMarkdownReport = () => {
        const parts: string[] = []
        parts.push(`# ${capsule.title}`)
        parts.push(`**Date & Time:** ${formattedEndTime}`)
        parts.push(`**Duration:** ${capsule.duration}`)
        if (capsule.meetingId) parts.push(`**Meeting Room ID:** \`${capsule.meetingId}\``)
        if (capsule.hostName) parts.push(`**Host:** ${capsule.hostName}`)
        parts.push('')

        parts.push(`## 👥 Attendees (${attendeesList.length})`)
        attendeesList.forEach(a => {
            const timeStr = a.talkTimeSeconds ? ` — ${formatSeconds(a.talkTimeSeconds)} spoken` : ''
            parts.push(`- **${a.name}**${a.isHost ? ' *(Host)*' : ''}${timeStr}`)
        })
        parts.push('')

        parts.push('## 📋 Session Notes & Discussion')
        if (capsule.notes && capsule.notes.trim()) {
            parts.push(capsule.notes.trim())
        } else {
            parts.push(`Session completed normally across ${capsule.duration} duration. All audio and presentation feeds concluded cleanly.`)
        }
        parts.push('')

        if (actionItems.length > 0) {
            parts.push(`## ✅ Action Items (${actionItems.length})`)
            actionItems.forEach(item => {
                parts.push(`- [${item.done ? 'x' : ' '}] ${item.text}`)
            })
            parts.push('')
        }

        if (capsule.messages && capsule.messages.length > 0) {
            parts.push(`## 💬 In-Meeting Chat Log (${capsule.messages.length})`)
            capsule.messages.forEach(m => {
                parts.push(`- **${m.senderName}:** ${m.message}`)
            })
            parts.push('')
        }

        parts.push('---')
        parts.push('*Generated by JTS Meet Enterprise Conference Suite*')
        return parts.join('\n')
    }

    const handleDownloadReport = () => {
        const content = generateMarkdownReport()
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const cleanName = (capsule.title || 'Meeting').replace(/[^a-zA-Z0-9_-]/g, '_')
        a.download = `${cleanName}_Capsule_${Date.now()}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleCopySummary = () => {
        const content = generateMarkdownReport()
        navigator.clipboard.writeText(content).then(() => {
            setCopiedSummary(true)
            setTimeout(() => setCopiedSummary(false), 2500)
        }).catch(() => {})
    }

    // Distinct background colors for avatar badges
    const getAvatarGradient = (idx: number) => {
        const gradients = [
            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
        ]
        return gradients[idx % gradients.length]
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(5, 8, 16, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                background: 'linear-gradient(180deg, #131929 0%, #0d121f 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 24,
                width: '100%',
                maxWidth: 680,
                maxHeight: '92vh',
                boxShadow: '0 30px 70px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(99, 102, 241, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* ── Top Header ── */}
                <div style={{
                    padding: '24px 28px 18px 28px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        {/* Branded pill */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: '#a5b4fc',
                            textTransform: 'uppercase'
                        }}>
                            <span style={{ fontSize: '0.75rem' }}>📦</span>
                            <span>Executive Meeting Capsule</span>
                        </div>

                        {/* Top Right Quick Rejoin & Close */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {onRejoin && (
                                <button
                                    type="button"
                                    onClick={onRejoin}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 12px',
                                        borderRadius: 8,
                                        background: 'rgba(56, 189, 248, 0.12)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        color: '#38bdf8',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>🔄 Rejoin</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Title and Room ID */}
                    <h2 style={{
                        margin: '0 0 6px 0',
                        fontSize: '1.45rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2
                    }}>
                        {capsule.title}
                    </h2>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: '0.8rem',
                        color: '#94a3b8'
                    }}>
                        {capsule.meetingId && (
                            <button
                                type="button"
                                onClick={handleCopyRoomId}
                                title="Click to copy Room Code"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: copiedRoomId ? '#4ade80' : '#cbd5e1',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <span>🏷️ {capsule.meetingId}</span>
                                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>{copiedRoomId ? '✓ Copied' : '📋'}</span>
                            </button>
                        )}
                        <span>•</span>
                        <span>{formattedEndTime}</span>
                        {capsule.hostName && (
                            <>
                                <span>•</span>
                                <span style={{ color: '#cbd5e1' }}>Host: <strong>{capsule.hostName}</strong></span>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Key Metric Stat Grid (4 Cards) ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                    padding: '16px 28px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    {/* Stat 1: Duration */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        padding: '10px 14px'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconClock size={13} color="#38bdf8" />
                            <span>DURATION</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                            {capsule.duration}
                        </div>
                    </div>

                    {/* Stat 2: Attendees */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        padding: '10px 14px'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconUsers size={13} color="#a5b4fc" />
                            <span>ATTENDEES</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                            {attendeesList.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>present</span>
                        </div>
                    </div>

                    {/* Stat 3: Discussion Volume */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        padding: '10px 14px'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconStickyNote size={13} color="#34d399" />
                            <span>MESSAGES</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                            {capsule.messages?.length || 0} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>logged</span>
                        </div>
                    </div>

                    {/* Stat 4: Action Items */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        padding: '10px 14px'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconZap size={13} color="#fbbf24" />
                            <span>ACTION ITEMS</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                            {actionItems.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>items</span>
                        </div>
                    </div>
                </div>

                {/* ── Tab Bar Navigation ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 28px 0 28px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    gap: 16
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('summary')}
                        style={{
                            padding: '10px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'summary' ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === 'summary' ? '#ffffff' : '#94a3b8',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>📋</span>
                        <span>Summary & Action Items</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('attendees')}
                        style={{
                            padding: '10px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'attendees' ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === 'attendees' ? '#ffffff' : '#94a3b8',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>👥</span>
                        <span>Attendees & Speaking Stats</span>
                        <span style={{
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.08)',
                            fontSize: '0.7rem'
                        }}>
                            {attendeesList.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        style={{
                            padding: '10px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'chat' ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === 'chat' ? '#ffffff' : '#94a3b8',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>💬</span>
                        <span>Chat & Dialogue</span>
                        {capsule.messages && capsule.messages.length > 0 && (
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: 10,
                                background: 'rgba(99, 102, 241, 0.25)',
                                color: '#a5b4fc',
                                fontSize: '0.7rem'
                            }}>
                                {capsule.messages.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Scrollable Tab Content ── */}
                <div style={{
                    padding: '20px 28px',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 260,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    {/* TAB 1: Summary & Action Items */}
                    {activeTab === 'summary' && (
                        <>
                            {/* Executive Brief Box */}
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.06)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: 14,
                                padding: '16px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    ✨ Executive Session Briefing
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.55 }}>
                                    {capsule.notes && capsule.notes.trim() ? (
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{capsule.notes}</div>
                                    ) : (
                                        <div>
                                            The conference session <strong style={{ color: '#fff' }}>"{capsule.title}"</strong> concluded normally after <strong style={{ color: '#38bdf8' }}>{capsule.duration}</strong> with <strong style={{ color: '#fff' }}>{attendeesList.length} participant(s)</strong>.
                                            {attendeesList.length === 1
                                                ? ' Single presenter broadcast completed with hardware feeds closed normally.'
                                                : ` Active group discussion took place with speaking metrics tracked below.`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Items Interactive Checklist */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 14,
                                padding: '16px 18px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 12
                                }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                        🎯 Follow-up Action Items
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        {actionItems.filter(i => i.done).length} of {actionItems.length} completed
                                    </span>
                                </div>

                                {/* Items list */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {actionItems.length === 0 ? (
                                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                                            No action items logged yet. You can add one below for your post-meeting notes.
                                        </div>
                                    ) : (
                                        actionItems.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleActionItem(item.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 10,
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    background: item.done ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                    border: item.done ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.done}
                                                    onChange={() => {}}
                                                    style={{ marginTop: 2, cursor: 'pointer', accentColor: '#22c55e' }}
                                                />
                                                <span style={{
                                                    fontSize: '0.8125rem',
                                                    color: item.done ? '#94a3b8' : '#e2e8f0',
                                                    textDecoration: item.done ? 'line-through' : 'none',
                                                    lineHeight: 1.4
                                                }}>
                                                    {item.text}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Quick inline add action item */}
                                <form onSubmit={handleAddActionItem} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <input
                                        type="text"
                                        placeholder="Add quick follow-up task or note..."
                                        value={newActionText}
                                        onChange={e => setNewActionText(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(0, 0, 0, 0.35)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            color: '#ffffff',
                                            fontSize: '0.8125rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newActionText.trim()}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 8,
                                            background: newActionText.trim() ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                            border: 'none',
                                            color: '#ffffff',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            cursor: newActionText.trim() ? 'pointer' : 'default',
                                            opacity: newActionText.trim() ? 1 : 0.5
                                        }}
                                    >
                                        + Add Task
                                    </button>
                                </form>
                            </div>
                        </>
                    )}

                    {/* TAB 2: Attendees & Speaking Stats */}
                    {activeTab === 'attendees' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                👥 Attendee Roster & Speaking Activity
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {attendeesList.map((attendee, idx) => {
                                    const talkSec = attendee.talkTimeSeconds || 0
                                    const percent = Math.round((talkSec / totalTalkSeconds) * 100) || 0
                                    return (
                                        <div
                                            key={attendee.id || idx}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                                borderRadius: 12,
                                                padding: '12px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        background: getAvatarGradient(idx),
                                                        color: '#ffffff',
                                                        fontWeight: 700,
                                                        fontSize: '0.85rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                                    }}>
                                                        {(attendee.name || 'U').slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                                                            {attendee.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                            {attendee.isHost ? '👑 Session Host' : '👤 Participant'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                                                        {formatSeconds(talkSec)}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                        {percent}% speaking time
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Speaking time visual bar */}
                                            <div style={{
                                                width: '100%',
                                                height: 5,
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                borderRadius: 3,
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${Math.min(100, Math.max(talkSec > 0 ? 5 : 0, percent))}%`,
                                                    height: '100%',
                                                    background: getAvatarGradient(idx),
                                                    borderRadius: 3,
                                                    transition: 'width 0.4s ease'
                                                }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Chat Log & Dialogue */}
                    {activeTab === 'chat' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                💬 In-Meeting Chat Archive
                            </div>

                            {(!capsule.messages || capsule.messages.length === 0) ? (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                                    borderRadius: 14,
                                    padding: '36px 20px',
                                    textAlign: 'center',
                                    color: '#94a3b8'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#cbd5e1' }}>
                                        No Chat Messages Exchanged
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                                        During this session, participants used voice and video communication exclusively.
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    maxHeight: 280,
                                    overflowY: 'auto'
                                }}>
                                    {capsule.messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                                borderRadius: 10,
                                                padding: '10px 14px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc' }}>
                                                    {msg.senderName}
                                                </span>
                                                {msg.timestamp && (
                                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Sticky Bottom Action Bar ── */}
                <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    {/* Left: Copy & Download buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            type="button"
                            onClick={handleCopySummary}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 14px',
                                borderRadius: 10,
                                background: copiedSummary ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                border: copiedSummary ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: copiedSummary ? '#4ade80' : '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span>{copiedSummary ? '✓' : '📋'}</span>
                            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadReport}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 14px',
                                borderRadius: 10,
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                cursor: 'pointer'
                            }}
                        >
                            <span>💾</span>
                            <span>Download (.md)</span>
                        </button>
                    </div>

                    {/* Right: Done / Exit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            type="button"
                            onClick={() => {
                                onClose()
                                window.location.hash = '#history'
                            }}
                            style={{
                                padding: '9px 14px',
                                borderRadius: 10,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            View History
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '9px 20px',
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
