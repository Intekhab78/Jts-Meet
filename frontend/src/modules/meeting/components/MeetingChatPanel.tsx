import React, { useState, useRef, useEffect } from 'react'
import type { MeetingChatMessage } from '../hooks/useMeetingChat'

interface MeetingChatPanelProps {
    messages: MeetingChatMessage[]
    typingUsers: string[]
    onSendMessage: (message: string) => void
    onTyping: () => void
    onStopTyping: () => void
    disabled?: boolean
    onToggleChatReaction?: (messageId: string, emoji: string, userId: string) => void
    currentUserId?: string
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
    messages, typingUsers, onSendMessage, onTyping, onStopTyping, disabled, onToggleChatReaction, currentUserId,
}: MeetingChatPanelProps) {
    const [message, setMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showEmojis, setShowEmojis] = useState(false)
    const [activeThreadParentId, setActiveThreadParentId] = useState<string | null>(null)
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const quickEmojis = ['👍', '❤️', '👏', '😂', '😮', '🎉', '🔥', '🚀']
    const supportedEmojis = ['👍', '❤️', '😂', '😮', '👏', '🔥']

    const renderStatusCheckmarks = (msg: any) => {
        if (msg.senderId !== 'me') return null
        const status = msg.status || 'read'
        if (status === 'sent') {
            return (
                <span 
                    style={{ marginLeft: 6, color: 'var(--color-text-muted)', fontSize: '0.6875rem' }} 
                    title="Sent"
                >
                    ✓
                </span>
            )
        }
        if (status === 'delivered') {
            return (
                <span 
                    style={{ marginLeft: 6, color: 'var(--color-text-muted)', fontSize: '0.6875rem' }} 
                    title="Delivered"
                >
                    ✓✓
                </span>
            )
        }
        if (status === 'read') {
            return (
                <span 
                    style={{ marginLeft: 6, color: 'var(--color-accent)', fontSize: '0.6875rem', fontWeight: 'bold' }} 
                    title="Read"
                >
                    ✓✓
                </span>
            )
        }
        return null
    }

    // Parse messages to build thread relationships
    const processedMessages = messages.map((msg, idx) => {
        const uniqueId = msg._id || `msg-${idx}`
        const match = msg.message.match(/^\[thread:([a-fA-F0-9a-zA-Z_-]+)\]\s*(.*)/s)
        if (match) {
            return {
                ...msg,
                _id: uniqueId,
                parentMessageId: match[1] as string | undefined,
                displayMessage: match[2]
            }
        }
        return {
            ...msg,
            _id: uniqueId,
            parentMessageId: undefined as string | undefined,
            displayMessage: msg.message
        }
    })

    const parentMessages = processedMessages.filter(msg => !msg.parentMessageId)
    const replyMessages = processedMessages.filter(msg => msg.parentMessageId)

    const getReplyCount = (msgId: string) => {
        return replyMessages.filter(m => m.parentMessageId === msgId).length
    }

    const getReplies = (msgId: string) => {
        return replyMessages.filter(m => m.parentMessageId === msgId)
    }

    const getParentMessage = (msgId: string) => {
        return parentMessages.find(m => m._id === msgId)
    }

    /* Auto-scroll to bottom when new messages arrive or thread changes */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, typingUsers, activeThreadParentId])

    const handleChange = (value: string) => {
        if (value.length > 1000) return // Max character limit
        setMessage(value)
        onTyping()
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            onStopTyping()
        }, 3000)
    }

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = message.trim()
        if (!trimmed) return

        if (activeThreadParentId) {
            onSendMessage(`[thread:${activeThreadParentId}] ${trimmed}`)
        } else {
            onSendMessage(trimmed)
        }
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

    const filteredParentMessages = parentMessages.filter(msg => 
        msg.displayMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.senderId.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const renderMessageItem = (msg: any, isParentInThreadView = false) => {
        const isMe = msg.senderId === 'me'
        const avatarBg = getAvatarGradient(msg.senderId)
        const replyCount = getReplyCount(msg._id)

        // Group reactions
        const msgReactions = msg.reactions || []
        const grouped = msgReactions.reduce((acc: Record<string, string[]>, r: any) => {
            if (!acc[r.emoji]) acc[r.emoji] = []
            acc[r.emoji].push(r.userId)
            return acc
        }, {})

        return (
            <div
                key={msg._id}
                className="anim-slide-up"
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    padding: isParentInThreadView ? '12px' : '4px 0',
                    background: isParentInThreadView ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderRadius: isParentInThreadView ? 'var(--radius-md)' : '0',
                    border: isParentInThreadView ? '1px solid var(--color-border)' : 'none',
                    position: 'relative'
                }}
            >
                {/* Hover Reactions picker bar */}
                {hoveredMessageId === msg._id && !isParentInThreadView && !disabled && (
                    <div style={{
                        position: 'absolute',
                        top: -16,
                        right: 12,
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: '20px',
                        padding: '2px 8px',
                        display: 'flex',
                        gap: 6,
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 10
                    }}>
                        {supportedEmojis.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => onToggleChatReaction?.(msg._id, emoji, currentUserId || 'me')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: '50%',
                                    transition: 'transform 100ms'
                                }}
                                className="reaction-pick-btn"
                                title={`React with ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

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
                                {renderStatusCheckmarks(msg)}
                            </span>
                        )}
                        {!isParentInThreadView && !msg.parentMessageId && (
                            <button
                                onClick={() => setActiveThreadParentId(msg._id)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-accent)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                }}
                                title="Reply to message thread"
                            >
                                💬 Reply
                            </button>
                        )}
                    </div>
                    <div style={{
                        fontSize: 'var(--settings-chat-font-size, 0.875rem)',
                        lineHeight: 1.5,
                        color: 'var(--color-text-secondary)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {msg.displayMessage}
                    </div>

                    {/* Reactions List */}
                    {Object.keys(grouped).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {Object.entries(grouped).map(([emoji, userIds]: any) => {
                                const hasReacted = userIds.includes(currentUserId || 'me')
                                return (
                                    <div
                                        key={emoji}
                                        className="reaction-badge-container"
                                        style={{ position: 'relative', display: 'inline-block' }}
                                    >
                                        <button
                                            onClick={() => onToggleChatReaction?.(msg._id, emoji, currentUserId || 'me')}
                                            style={{
                                                background: hasReacted ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                                border: hasReacted ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--color-border)',
                                                borderRadius: '12px',
                                                padding: '2px 6px',
                                                fontSize: '0.75rem',
                                                color: 'var(--color-text-primary)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            <span>{emoji}</span>
                                            <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>{userIds.length}</span>
                                        </button>

                                        {/* Tooltip on Hover displaying names/IDs of users who reacted */}
                                        <div
                                            className="reaction-tooltip"
                                            style={{
                                                visibility: 'hidden',
                                                width: 'max-content',
                                                maxWidth: '200px',
                                                background: 'rgba(15,17,23,0.95)',
                                                color: '#fff',
                                                textAlign: 'center',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                position: 'absolute',
                                                zIndex: 100,
                                                bottom: '125%',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                                fontSize: '0.6875rem',
                                                pointerEvents: 'none',
                                                boxShadow: 'var(--shadow-lg)',
                                                border: '1px solid var(--color-border-strong)'
                                            }}
                                        >
                                            {userIds.map((uid: string) => uid === (currentUserId || 'me') ? 'You' : (uid === msg.senderId ? (msg.senderId === 'me' ? 'You' : msg.senderId) : uid)).join(', ')}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {!isParentInThreadView && replyCount > 0 && (
                        <div style={{ marginTop: 6 }}>
                            <button
                                onClick={() => setActiveThreadParentId(msg._id)}
                                style={{
                                    background: 'rgba(99,102,241,0.08)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    color: 'var(--color-accent)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span>💬 {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--color-surface)',
        }}>
            <style>{`
                .reaction-badge-container {
                    position: relative;
                }
                .reaction-badge-container:hover .reaction-tooltip {
                    visibility: visible !important;
                    opacity: 1 !important;
                }
            `}</style>
            {/* Header (Search or Thread info) */}
            {activeThreadParentId ? (
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <button
                        onClick={() => setActiveThreadParentId(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>← Back to chat</span>
                    </button>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                        Thread Replies
                    </span>
                </div>
            ) : (
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
            )}

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
                {activeThreadParentId ? (
                    (() => {
                        const parent = getParentMessage(activeThreadParentId)
                        const replies = getReplies(activeThreadParentId)
                        return (
                            <>
                                {parent && renderMessageItem(parent, true)}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                    </span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                                </div>
                                {replies.length === 0 ? (
                                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                                        No replies yet. Be the first to reply to this thread!
                                    </div>
                                ) : (
                                    replies.map(reply => renderMessageItem(reply))
                                )}
                            </>
                        )
                    })()
                ) : (
                    filteredParentMessages.length === 0 ? (
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
                        filteredParentMessages.map(msg => renderMessageItem(msg))
                    )
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && !activeThreadParentId && (
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
                            {(() => {
                                if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`
                                if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                                return `${typingUsers.slice(0, 2).join(', ')} and ${typingUsers.length - 2} others are typing...`
                            })()}
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
                            placeholder={disabled ? 'Join meeting to chat…' : (activeThreadParentId ? 'Reply to thread…' : 'Type message…')}
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
