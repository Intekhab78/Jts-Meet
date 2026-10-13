import React from 'react'
import {
    IconClock,
    IconSparkles,
    IconMessage,
    IconTrash,
    IconUndo,
    IconFileText,
    IconEye,
    IconDownload
} from '../../../components/common/Icons'
import { renderFormattedMessage } from '../../../utils/formatMessage'
import { normalizeMediaUrl, API_BASE } from '../../../config'
import { ChatContact, ChatMessage } from '../chat.types'
import {
    formatTimestamp,
    formatDateSeparator,
    QUICK_REACTION_EMOJIS
} from '../chat.helpers'

interface DirectChatMessageFeedProps {
    messages: ChatMessage[]
    loadingMessages: boolean
    currentUserId: string
    activeContact: ChatContact
    typingUsers: Record<string, boolean>
    hoveredMessageId: string | null
    setHoveredMessageId: (id: string | null) => void
    chatFeedRef: React.RefObject<HTMLDivElement | null>
    messagesEndRef: React.RefObject<HTMLDivElement | null>
    onToggleReaction: (messageId: string, emoji: string) => void
    onReplyInThread: (msg: ChatMessage) => void
    onDeleteMessage: (messageId: string) => void
    onUndoDeleteMessage: (messageId: string) => void
    onPreviewFile: (file: { name: string; url: string; size: string }) => void
}

export function DirectChatMessageFeed({
    messages,
    loadingMessages,
    currentUserId,
    activeContact,
    typingUsers,
    hoveredMessageId,
    setHoveredMessageId,
    chatFeedRef,
    messagesEndRef,
    onToggleReaction,
    onReplyInThread,
    onDeleteMessage,
    onUndoDeleteMessage,
    onPreviewFile
}: DirectChatMessageFeedProps) {

    function renderFileCard(msgContent: string) {
        const match = msgContent.match(/\[File:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/)
        if (!match) return <div style={{ whiteSpace: 'pre-wrap' }}>{msgContent}</div>

        const [, fileName, rawFileUrl, fileSize] = match
        const fileUrl = normalizeMediaUrl(rawFileUrl)
        const fileExt = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() || 'FILE' : 'FILE'

        return (
            <div
                onClick={() => onPreviewFile({ name: fileName, url: fileUrl, size: fileSize })}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'rgba(0, 0, 0, 0.28)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    minWidth: 250,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6264a7'
                    e.currentTarget.style.background = 'rgba(98, 100, 167, 0.15)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.28)'
                }}
                title="Click to preview document"
            >
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: '#6264a7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                }}>
                    <IconFileText size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
                        {fileExt} &bull; {fileSize}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onPreviewFile({ name: fileName, url: fileUrl, size: fileSize })
                        }}
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'rgba(98, 100, 167, 0.25)',
                            border: '1px solid rgba(98, 100, 167, 0.45)',
                            color: '#c7c9ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(98, 100, 167, 0.45)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(98, 100, 167, 0.25)'
                        }}
                        title="Preview document"
                    >
                        <IconEye size={14} />
                    </button>
                    <a
                        href={fileUrl}
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Download file"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            textDecoration: 'none',
                            flexShrink: 0
                        }}
                    >
                        <IconDownload size={13} />
                    </a>
                </div>
            </div>
        )
    }

    function renderTeamsMessageRow(msg: ChatMessage, isMe: boolean, senderName: string) {
        const isHovered = hoveredMessageId === msg._id
        const isClip = msg.message.includes('/uploads/clips/') || msg.message.startsWith('[Video Clip]')
        const isFile = msg.message.includes('[File:')
        const isUrgent = msg.message.startsWith('[IMPORTANT]')

        const reactionGroups: Record<string, { count: number; hasReacted: boolean }> = {}
        if (msg.reactions && msg.reactions.length > 0) {
            msg.reactions.forEach(r => {
                if (!reactionGroups[r.emoji]) {
                    reactionGroups[r.emoji] = { count: 0, hasReacted: false }
                }
                reactionGroups[r.emoji].count += 1
                if (r.userId === currentUserId) {
                    reactionGroups[r.emoji].hasReacted = true
                }
            })
        }

        return (
            <div
                key={msg._id}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    position: 'relative',
                    padding: '2px 0'
                }}
            >
                {/* Floating Teams Reaction & Action Bar on Hover */}
                {isHovered && !msg.isDeleted && (
                    <div style={{
                        position: 'absolute',
                        top: -14,
                        [isMe ? 'right' : 'left']: isMe ? 0 : 38,
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: '#1e2130',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 20,
                        padding: '2px 6px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                        animation: 'fadeIn 0.15s ease'
                    }}>
                        {QUICK_REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onToggleReaction(msg._id, emoji)}
                                title={`React with ${emoji}`}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: 4,
                                    lineHeight: 1
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)' }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                            >
                                {emoji}
                            </button>
                        ))}

                        <div style={{ width: 1, height: 14, background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

                        {/* Reply in thread */}
                        <button
                            type="button"
                            onClick={() => onReplyInThread(msg)}
                            title="Reply in thread"
                            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px 4px', display: 'flex' }}
                        >
                            <IconMessage size={13} />
                        </button>

                        {/* Copy text */}
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(msg.message)
                            }}
                            title="Copy message"
                            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px 4px', display: 'flex' }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </button>

                        {/* Teams Delete / Unsend message button (only for sender) */}
                        {isMe && (
                            <>
                                <div style={{ width: 1, height: 14, background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />
                                <button
                                    type="button"
                                    onClick={() => onDeleteMessage(msg._id)}
                                    title="Delete (Unsend) message"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#f87171' }}
                                >
                                    <IconTrash size={13} />
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Message Header (Sender name + timestamp) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 3,
                    fontSize: '0.6875rem',
                    color: '#94a3b8',
                    padding: isMe ? '0 4px 0 0' : '0 0 0 4px'
                }}>
                    <span style={{ fontWeight: 700, color: isMe ? '#c7c9ff' : '#fff' }}>{senderName}</span>
                    <span>&bull;</span>
                    <span>{formatTimestamp(msg.createdAt)}</span>
                    {isUrgent && (
                        <span style={{
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em'
                        }}>
                            URGENT
                        </span>
                    )}
                </div>

                {/* Bubble Container or Teams-style Deleted Tombstone */}
                {msg.isDeleted ? (
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px dashed rgba(255, 255, 255, 0.18)',
                            color: '#94a3b8',
                            fontSize: '0.8125rem',
                            fontStyle: 'italic',
                            userSelect: 'none',
                            marginTop: 2
                        }}
                    >
                        <IconTrash size={13} color="#94a3b8" />
                        <span>This message was deleted.</span>
                        {isMe && (
                            <button
                                type="button"
                                onClick={() => onUndoDeleteMessage(msg._id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#818cf8',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    marginLeft: 6,
                                    textDecoration: 'underline',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}
                                title="Undo deletion"
                            >
                                <IconUndo size={12} />
                                <span>Undo</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            background: isUrgent
                                ? 'rgba(239, 68, 68, 0.15)'
                                : isMe
                                    ? '#6264a7'
                                    : 'rgba(255, 255, 255, 0.05)',
                            border: isUrgent
                                ? '1px solid #ef4444'
                                : isMe
                                    ? 'none'
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            fontSize: '0.8125rem',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            boxShadow: isMe ? '0 2px 8px rgba(98, 100, 167, 0.3)' : 'none',
                            position: 'relative'
                        }}
                    >
                        {isFile ? (
                            renderFileCard(msg.message)
                        ) : isClip ? (
                            <div style={{ marginTop: 2 }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    marginBottom: 6, fontSize: '0.75rem', fontWeight: 700,
                                    color: isMe ? '#e0e7ff' : '#c084fc'
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <polygon points="23 7 16 12 23 17 23 7" />
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                    </svg>
                                    <span>Zoom Clip &bull; Video Message</span>
                                </div>
                                <video
                                    src={(() => {
                                        const match = msg.message.match(/(\/uploads\/clips\/[^\s\)]+)/)
                                        if (match) return `${API_BASE}${match[1]}`
                                        return msg.message
                                    })()}
                                    controls
                                    playsInline
                                    style={{
                                        width: '100%',
                                        maxHeight: 220,
                                        borderRadius: 8,
                                        background: '#000',
                                        display: 'block'
                                    }}
                                />
                                {msg.message.split('\n')[0] && !msg.message.split('\n')[0].startsWith('/uploads') && (
                                    <div style={{ marginTop: 6, fontSize: '0.75rem', color: isMe ? '#e0e7ff' : 'var(--color-text-secondary)' }}>
                                        {msg.message.split('\n')[0].replace('[Video Clip] ', '')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {renderFormattedMessage(msg.message.replace(/^\[IMPORTANT\]\s*/, ''))}
                            </div>
                        )}

                        {/* Thread reply counter if exists */}
                        {msg.threadCount && msg.threadCount > 0 ? (
                            <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <button
                                    type="button"
                                    onClick={() => onReplyInThread(msg)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: isMe ? '#c7c9ff' : '#a6a8f8',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: 0
                                    }}
                                >
                                    <IconMessage size={12} />
                                    <span>{msg.threadCount} {msg.threadCount === 1 ? 'reply' : 'replies'}</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Reactions counter pills below bubble */}
                {!msg.isDeleted && Object.keys(reactionGroups).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {Object.entries(reactionGroups).map(([emoji, data]) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onToggleReaction(msg._id, emoji)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 6px',
                                    borderRadius: 12,
                                    background: data.hasReacted ? 'rgba(98, 100, 167, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                                    border: data.hasReacted ? '1px solid #6264a7' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    fontSize: '0.6875rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>{emoji}</span>
                                <span>{data.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            ref={chatFeedRef}
            style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
            }}
        >
            {loadingMessages ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    <IconClock size={20} style={{ animation: 'spin 1.5s linear infinite', marginBottom: 6 }} />
                    <div>Loading conversation...</div>
                </div>
            ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: 360 }}>
                    <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'rgba(98, 100, 167, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        color: '#a6a8f8'
                    }}>
                        <IconSparkles size={24} />
                    </div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                        Conversation with {activeContact.fullName}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5 }}>
                        Send messages, share files, react with emojis, or click the video icon to start an instant meeting.
                    </p>
                </div>
            ) : (
                messages.map((msg, idx) => {
                    const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender
                    const isMe = senderId === currentUserId
                    const senderName = isMe ? 'You' : activeContact.fullName

                    const prevMsg = idx > 0 ? messages[idx - 1] : null
                    const showDateSeparator = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()

                    return (
                        <React.Fragment key={msg._id ? `feed_msg_${msg._id}_${idx}` : `feed_temp_${idx}`}>
                            {showDateSeparator && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    margin: '16px 0 10px',
                                    gap: 12
                                }}>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                    <span style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        padding: '2px 10px',
                                        borderRadius: 12
                                    }}>
                                        {formatDateSeparator(msg.createdAt)}
                                    </span>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                </div>
                            )}

                            {renderTeamsMessageRow(msg, isMe, senderName)}
                        </React.Fragment>
                    )
                })
            )}

            {/* Typing Indicator in Feed */}
            {typingUsers[activeContact._id] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', color: '#a6a8f8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                        <span style={{ width: 5, height: 5, background: '#a6a8f8', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                        <span style={{ width: 5, height: 5, background: '#a6a8f8', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                        <span style={{ width: 5, height: 5, background: '#a6a8f8', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                    </div>
                    <span>{activeContact.fullName} is typing...</span>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    )
}
