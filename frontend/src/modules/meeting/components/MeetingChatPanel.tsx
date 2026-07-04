import React, { useState, useRef, useEffect } from 'react'
import type { MeetingChatMessage } from '../hooks/useMeetingChat'

interface MeetingChatPanelProps {
    messages: MeetingChatMessage[]
    typingUsers: string[]
    onSendMessage: (message: string) => void
    onTyping: () => void
    onStopTyping: () => void
    disabled?: boolean
}

const IconSend = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
)

const IconSearch = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

const IconSmile = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

function getInitials(userId: string): string {
    const parts = userId.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/)
    return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : userId.slice(0, 2).toUpperCase()
}

function getAvatarGradient(name: string) {
    const colors = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
        'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        'linear-gradient(135deg, #10b981 0%, #84cc16 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
}

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
        return ''
    }
}

export function MeetingChatPanel({
    messages, typingUsers, onSendMessage, onTyping, onStopTyping, disabled,
}: MeetingChatPanelProps) {
    const [message, setMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showEmojis, setShowEmojis] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const quickEmojis = ['👍', '❤️', '👏', '😂', '😮', '🎉', '🔥', '🚀']

    /* Auto-scroll to bottom when new messages arrive */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, typingUsers])

    const handleChange = (value: string) => {
        if (value.length > 1000) return // Max character limit
        setMessage(value)
        onTyping()
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            onStopTyping()
        }, 2000)
    }

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = message.trim()
        if (!trimmed) return
        onSendMessage(trimmed)
        setMessage('')
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        onStopTyping()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const handleEmojiClick = (emoji: string) => {
        setMessage(prev => prev + emoji)
        setShowEmojis(false)
    }

    const filteredMessages = messages.filter(msg => 
        msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.senderId.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--color-surface)',
        }}>
            {/* Search Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.01)'
            }}>
                <div style={{
                    position: 'relative',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <span style={{ position: 'absolute', left: 10, color: 'var(--color-text-muted)', display: 'flex' }}>
                        <IconSearch />
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search messages..."
                        style={{
                            width: '100%',
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 12px 6px 30px',
                            fontSize: '0.8125rem',
                            color: 'var(--color-text-primary)',
                            outline: 'none',
                            transition: 'border-color 150ms'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                </div>
            </div>

            {/* Messages list */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    overscrollBehavior: 'contain',
                }}
            >
                {filteredMessages.length === 0 ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        padding: '40px 16px',
                        color: 'var(--color-text-muted)',
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p style={{ fontSize: '0.875rem', textAlign: 'center', margin: 0, fontWeight: 500 }}>
                            {searchQuery ? 'No matching messages' : 'No messages yet'}
                        </p>
                        <span style={{ fontSize: '0.8125rem', opacity: 0.7, textAlign: 'center' }}>
                            {searchQuery ? 'Try a different search query' : 'Type a message to start conversation'}
                        </span>
                    </div>
                ) : (
                    filteredMessages.map((msg, i) => {
                        const isMe = msg.senderId === 'me'
                        const avatarBg = getAvatarGradient(msg.senderId)

                        return (
                            <div
                                key={msg._id ?? `msg-${i}`}
                                className="anim-slide-up"
                                style={{
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'flex-start',
                                }}
                            >
                                {/* Left Avatar */}
                                <div
                                    className="avatar"
                                    style={{
                                        flexShrink: 0,
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: avatarBg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        color: '#fff',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                >
                                    {getInitials(msg.senderId)}
                                </div>

                                {/* Right Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: 'var(--color-text-primary)'
                                        }}>
                                            {isMe ? 'You' : msg.senderId}
                                        </span>
                                        {msg.createdAt && (
                                            <span style={{
                                                fontSize: '0.6875rem',
                                                color: 'var(--color-text-muted)',
                                            }}>
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--settings-chat-font-size, 0.875rem)',
                                        lineHeight: 1.5,
                                        color: 'var(--color-text-secondary)',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div
                        className="anim-fade-in"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', marginLeft: 48 }}
                    >
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span className="typing-dot" style={{ background: 'var(--color-accent)' }} />
                            <span className="typing-dot" style={{ background: 'var(--color-accent)', animationDelay: '0.15s' }} />
                            <span className="typing-dot" style={{ background: 'var(--color-accent)', animationDelay: '0.3s' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {typingUsers.length === 1
                                ? `${typingUsers[0]} is typing`
                                : `${typingUsers.length} people are typing`}
                        </span>
                    </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={{
                borderTop: '1px solid var(--color-border)',
                padding: '16px',
                background: 'var(--color-surface)',
                flexShrink: 0,
                position: 'relative'
            }}>
                {disabled && (
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        textAlign: 'center',
                        marginBottom: 8,
                    }}>
                        Join the meeting to chat
                    </div>
                )}

                {/* Emoji drawer picker */}
                {showEmojis && !disabled && (
                    <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% - 4px)',
                        left: 16,
                        right: 16,
                        background: 'rgba(15,17,23,0.95)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        zIndex: 200,
                        boxShadow: 'var(--shadow-xl)',
                        animation: 'jts-slide-up 200ms ease-out'
                    }}>
                        {quickEmojis.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleEmojiClick(emoji)}
                                style={{
                                    fontSize: '1.25rem',
                                    padding: '6px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background 150ms'
                                }}
                                className="btn-icon"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', padding: '6px 8px' }}>
                        
                        {/* Emoji Button */}
                        <button
                            type="button"
                            onClick={() => setShowEmojis(!showEmojis)}
                            disabled={disabled}
                            style={{
                                padding: 6,
                                background: 'none',
                                border: 'none',
                                color: showEmojis ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexShrink: 0
                            }}
                            title="Emoji Reactions"
                        >
                            <IconSmile />
                        </button>

                        <textarea
                            value={message}
                            onChange={(e) => handleChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={disabled}
                            placeholder={disabled ? 'Join meeting to chat…' : 'Type message…'}
                            rows={1}
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                padding: '6px 4px',
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.875rem',
                                color: 'var(--color-text-primary)',
                                outline: 'none',
                                resize: 'none',
                                lineHeight: 1.5,
                                maxHeight: 90,
                                overflowY: 'auto',
                            }}
                        />

                        {/* Send button */}
                        <button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={disabled || !message.trim()}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            className="btn btn-primary"
                            aria-label="Send message"
                        >
                            <IconSend />
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>
                            {message.length} / 1000 characters
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>
                            Press Enter to Send
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
