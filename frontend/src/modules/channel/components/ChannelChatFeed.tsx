import React from 'react'
import type { Channel, ChannelAttachment } from '../channel.types'
import {
    IconDownload, IconPin, IconHand, IconTrash, IconUndo, IconMessage
} from '../../../components/common/Icons'
import { VoiceMessageCard } from './VoiceMessageCard'
import { FileCard } from './FileCard'
import { CodeSnippetCard } from './CodeSnippetCard'
import { renderFormattedMessage } from '../../../utils/formatMessage'
import { normalizeMediaUrl } from '../../../config'
import { formatMessageDateDivider } from '../channel.helpers'

interface ChannelChatFeedProps {
    selectedChannel: Channel
    displayedMessages: any[]
    resolvedUserId: string
    hoveredMessageId: string | null
    setHoveredMessageId: (id: string | null) => void
    chatFeedRef: React.RefObject<HTMLDivElement | null>
    mainChatEndRef: React.RefObject<HTMLDivElement | null>
    isDraggingOver: boolean
    inChannelSearchQuery: string
    setInChannelSearchQuery: (query: string) => void
    pinnedMessages: any[]
    showPinnedDrawer: boolean
    setShowPinnedDrawer: (show: boolean | ((prev: boolean) => boolean)) => void
    handleTogglePin: (messageId: string) => void
    handleReaction: (messageId: string, emoji: string) => void
    handleDeleteChannelMessage: (messageId: string) => void
    handleUndoDeleteChannelMessage: (messageId: string) => void
    setActiveThreadParent: (msg: any) => void
    handleDragEnter: (e: React.DragEvent) => void
    handleDragLeave: (e: React.DragEvent) => void
    handleDragOver: (e: React.DragEvent) => void
    handleDrop: (e: React.DragEvent) => void
}

export const ChannelChatFeed: React.FC<ChannelChatFeedProps> = ({
    selectedChannel,
    displayedMessages,
    resolvedUserId,
    hoveredMessageId,
    setHoveredMessageId,
    chatFeedRef,
    mainChatEndRef,
    isDraggingOver,
    inChannelSearchQuery,
    setInChannelSearchQuery,
    pinnedMessages,
    showPinnedDrawer,
    setShowPinnedDrawer,
    handleTogglePin,
    handleReaction,
    handleDeleteChannelMessage,
    handleUndoDeleteChannelMessage,
    setActiveThreadParent,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
}) => {
    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}
        >
            {/* Drag and drop full dropzone overlay */}
            {isDraggingOver && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 50,
                        background: 'rgba(17, 19, 31, 0.94)',
                        backdropFilter: 'blur(10px)',
                        border: '2px dashed #6366f1',
                        borderRadius: 12,
                        margin: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        pointerEvents: 'none',
                        boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)'
                    }}
                >
                    <IconDownload size={44} color="#818cf8" style={{ animation: 'bounce 1s infinite' }} />
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', textAlign: 'center' }}>
                        Drop files to share in #{selectedChannel.name}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0, textAlign: 'center', maxWidth: 400 }}>
                        PDFs, Images, Excel sheets, Word documents, Code files & Archives
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '4px 12px', borderRadius: 8, fontWeight: 600 }}>
                        Release to upload instantly
                    </span>
                </div>
            )}

            {/* PINNED ANNOUNCEMENT DRAWER (Slack / Teams style) */}
            {pinnedMessages.length > 0 && (
                <>
                    <div
                        onClick={() => setShowPinnedDrawer(prev => !prev)}
                        style={{
                            padding: '7px 14px',
                            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
                            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            <div style={{
                                width: 20, height: 20, borderRadius: 5,
                                background: 'rgba(245, 158, 11, 0.25)',
                                color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <IconPin size={12} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fef3c7', flexShrink: 0 }}>
                                {pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>•</span>
                            <span style={{ fontSize: '0.72rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pinnedMessages[0]?.content || 'Pinned item'}
                            </span>
                        </div>
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#f59e0b',
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: 'rgba(245, 158, 11, 0.15)',
                            flexShrink: 0
                        }}>
                            {showPinnedDrawer ? 'Hide' : 'View'}
                        </span>
                    </div>

                    {/* Expanded Pinned Items Drawer */}
                    {showPinnedDrawer && (
                        <div style={{
                            maxHeight: 180,
                            overflowY: 'auto',
                            background: 'rgba(15, 17, 26, 0.96)',
                            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
                            padding: '8px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            flexShrink: 0
                        }}>
                            {pinnedMessages.map((pm: any) => (
                                <div key={pm._id} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: 6,
                                    padding: '6px 10px',
                                    border: '1px solid rgba(255, 255, 255, 0.06)'
                                }}>
                                    <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc' }}>
                                                {pm.senderId?.fullName || 'Member'}
                                            </span>
                                            <span style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                                                {new Date(pm.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                                            {pm.content}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                const el = document.getElementById(`msg-${pm._id}`)
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                    el.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'
                                                    setTimeout(() => { el.style.backgroundColor = '' }, 2000)
                                                }
                                            }}
                                            style={{
                                                background: 'rgba(99, 102, 241, 0.2)',
                                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                fontSize: '0.6875rem',
                                                fontWeight: 600
                                            }}
                                            title="Jump to message"
                                        >
                                            Jump
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleTogglePin(pm._id); }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 600
                                            }}
                                            title="Unpin from channel"
                                        >
                                            Unpin
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Messages Feed */}
            <div ref={chatFeedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                {displayedMessages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <IconHand size={28} color="#f59e0b" style={{ marginBottom: 6 }} />
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                            {inChannelSearchQuery ? 'No matching messages found' : `Welcome to #${selectedChannel.name}!`}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5 }}>
                            {inChannelSearchQuery
                                ? `No messages matched "${inChannelSearchQuery}". Try another keyword or clear search.`
                                : `This is the start of the #${selectedChannel.name} channel. Post an announcement, drag & drop documents, share code snippets, or click Meet Now to start a video call.`}
                        </p>
                        {inChannelSearchQuery && (
                            <button
                                type="button"
                                onClick={() => setInChannelSearchQuery('')}
                                style={{
                                    marginTop: 10,
                                    padding: '4px 12px',
                                    borderRadius: 6,
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    color: '#c7c9ff',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    displayedMessages.map((msg, index) => {
                        const msgSenderId = typeof msg.senderId === 'object' && msg.senderId !== null
                            ? (msg.senderId._id || msg.senderId.id || '').toString()
                            : (msg.senderId || '').toString()
                        const isMe = Boolean(resolvedUserId && msgSenderId && (msgSenderId === resolvedUserId))
                        const senderName = isMe ? 'You' : (msg.senderId?.fullName || 'Colleague')
                        const isHovered = hoveredMessageId === msg._id
                        const isChannelAdmin = selectedChannel?.members?.some((m: any) =>
                            (m.userId === resolvedUserId || m.userId?._id === resolvedUserId) &&
                            (m.role === 'owner' || m.role === 'moderator')
                        ) || false
                        const canDelete = isMe || isChannelAdmin

                        const msgDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : ''
                        const prevMsg = index > 0 ? displayedMessages[index - 1] : null
                        const prevMsgDate = prevMsg?.createdAt ? new Date(prevMsg.createdAt).toDateString() : ''
                        const showDateDivider = msgDate && msgDate !== prevMsgDate

                        return (
                            <React.Fragment key={msg._id}>
                                {showDateDivider && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        margin: '14px 0 8px 0',
                                        gap: 12
                                    }}>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                        <span style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            color: '#94a3b8',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            padding: '2px 10px',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            letterSpacing: '0.02em',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                                        }}>
                                            {formatMessageDateDivider(msg.createdAt)}
                                        </span>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                    </div>
                                )}
                                <div
                                    id={`msg-${msg._id}`}
                                    onMouseEnter={() => setHoveredMessageId(msg._id)}
                                    onMouseLeave={() => setHoveredMessageId(null)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: isMe ? 'row-reverse' : 'row',
                                        gap: 10,
                                        padding: '6px 8px',
                                        borderRadius: 8,
                                        position: 'relative',
                                        transition: 'background 0.2s',
                                        background: isHovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {/* User Avatar */}
                                    {msg.senderId?.profileImage ? (
                                        <img
                                            src={normalizeMediaUrl(msg.senderId.profileImage)}
                                            alt={senderName}
                                            style={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 30, height: 30, minWidth: 30, borderRadius: '50%',
                                            background: isMe ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                            color: '#fff', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontWeight: 700, fontSize: '0.725rem'
                                        }}>
                                            {senderName.charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                        gap: 3,
                                        minWidth: 0
                                    }}>
                                        {/* Sender Header */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexDirection: isMe ? 'row-reverse' : 'row',
                                            gap: 6
                                        }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: isMe ? '#c7c9ff' : '#fff' }}>
                                                {senderName}
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {msg.edited && !msg.deleted && (
                                                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                    (edited)
                                                </span>
                                            )}
                                        </div>

                                        {/* Pinned Announcement Tag */}
                                        {msg.pinned && !msg.deleted && (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                color: '#fbbf24',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                width: 'fit-content',
                                                marginBottom: 2
                                            }}>
                                                <IconPin size={10} />
                                                <span>Pinned Announcement</span>
                                            </div>
                                        )}

                                        {/* Deleted Message Tombstone (MS Teams Style) */}
                                        {msg.deleted ? (
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px dashed rgba(255, 255, 255, 0.18)',
                                                    color: '#94a3b8',
                                                    fontSize: '0.8125rem',
                                                    fontStyle: 'italic',
                                                    userSelect: 'none',
                                                    marginTop: 2,
                                                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                }}
                                            >
                                                <IconTrash size={13} color="#94a3b8" />
                                                <span>This message was deleted.</span>
                                                {isMe && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUndoDeleteChannelMessage(msg._id)}
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
                                            <>
                                                {/* Accompanying note, text or Zoom Clip */}
                                                {msg.content && (!msg.attachments?.length || msg.messageType !== 'file') && (!msg.codeSnippet || msg.messageType !== 'code') && msg.messageType !== 'audio' && (
                                                    msg.content.includes('/uploads/clips/') ? (
                                                        <div style={{
                                                            marginTop: 4,
                                                            borderRadius: 8,
                                                            overflow: 'hidden',
                                                            maxWidth: 380,
                                                            background: '#000',
                                                            alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '0.6875rem', fontWeight: 700, color: '#c084fc',
                                                                padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6,
                                                                background: 'rgba(168, 85, 247, 0.15)', borderBottom: '1px solid rgba(168, 85, 247, 0.2)'
                                                            }}>
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                                    <polygon points="23 7 16 12 23 17 23 7" />
                                                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                                                </svg>
                                                                <span>Zoom Clip &bull; Video Message</span>
                                                            </div>
                                                            <video
                                                                src={(() => {
                                                                    const match = msg.content.match(/(\/uploads\/clips\/[^\s\)]+)/)
                                                                    return normalizeMediaUrl(match ? match[1] : msg.content)
                                                                })()}
                                                                controls
                                                                playsInline
                                                                style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                                                            />
                                                            {msg.content.split('\n')[0] && !msg.content.split('\n')[0].startsWith('/uploads') && (
                                                                <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: '#e2e8f0' }}>
                                                                    {msg.content.split('\n')[0].replace('[Video Clip] ', '')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            fontSize: '0.8125rem',
                                                            color: isMe ? '#fff' : '#e5e7eb',
                                                            lineHeight: 1.45,
                                                            wordBreak: 'break-word',
                                                            whiteSpace: 'pre-wrap',
                                                            background: isMe
                                                                ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)'
                                                                : 'rgba(255, 255, 255, 0.05)',
                                                            border: isMe
                                                                ? '1px solid rgba(129, 140, 248, 0.4)'
                                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                                            padding: '7px 12px',
                                                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                                            maxWidth: '75%',
                                                            boxShadow: isMe ? '0 2px 8px rgba(98, 100, 167, 0.25)' : 'none',
                                                            textAlign: 'left'
                                                        }}>
                                                            {renderFormattedMessage(msg.content)}
                                                        </div>
                                                    )
                                                )}

                                                {/* If code snippet has caption */}
                                                {msg.codeSnippet && msg.content && msg.content !== `Shared a ${msg.codeSnippet.language || ''} code snippet` && (
                                                    <div style={{
                                                        fontSize: '0.8125rem',
                                                        color: '#e5e7eb',
                                                        lineHeight: 1.45,
                                                        marginBottom: 2,
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                    }}>
                                                        {renderFormattedMessage(msg.content)}
                                                    </div>
                                                )}

                                                {/* Code Snippet Card */}
                                                {msg.codeSnippet && (
                                                    <div style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                        <CodeSnippetCard snippet={msg.codeSnippet} />
                                                    </div>
                                                )}

                                                {/* Attachments (PDF, Excel, Images, Docs, Voice Notes) */}
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                        marginTop: 4,
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                    }}>
                                                        {msg.attachments.map((att: ChannelAttachment, idx: number) => {
                                                            const isAudio = att.fileType === 'audio' || (att.mimeType && att.mimeType.startsWith('audio/')) || (att.url && (att.url.endsWith('.webm') || att.url.endsWith('.mp3') || att.url.endsWith('.wav') || att.url.endsWith('.ogg')))
                                                            if (isAudio) {
                                                                return <VoiceMessageCard key={idx} url={att.url} name={att.name} />
                                                            }
                                                            return <FileCard key={idx} attachment={att} />
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Emoji reactions row with toggle action */}
                                        {!msg.deleted && msg.reactions && msg.reactions.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                gap: 4,
                                                marginTop: 4,
                                                flexWrap: 'wrap',
                                                justifyContent: isMe ? 'flex-end' : 'flex-start'
                                            }}>
                                                {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                                    const count = msg.reactions.filter((r: any) => r.emoji === emoji).length
                                                    const userReacted = msg.reactions.some((r: any) => (r.userId?._id || r.userId)?.toString() === resolvedUserId && r.emoji === emoji)
                                                    return (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() => handleReaction(msg._id, emoji)}
                                                            style={{
                                                                background: userReacted ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.1)',
                                                                border: userReacted ? '1px solid #818cf8' : '1px solid rgba(99, 102, 241, 0.25)',
                                                                borderRadius: 12,
                                                                padding: '1px 7px',
                                                                fontSize: '0.725rem',
                                                                color: '#fff',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                                cursor: 'pointer',
                                                                boxShadow: userReacted ? '0 0 8px rgba(99, 102, 241, 0.3)' : 'none',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            title={userReacted ? `You reacted with ${emoji} (click to toggle)` : `React with ${emoji}`}
                                                        >
                                                            <span>{emoji}</span>
                                                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: userReacted ? '#fff' : '#818cf8' }}>{count}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Thread Reply Link */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            marginTop: 2,
                                            flexDirection: isMe ? 'row-reverse' : 'row'
                                        }}>
                                            {!msg.deleted && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveThreadParent(msg)}
                                                    style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.6875rem', cursor: 'pointer', padding: 0, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                    className="hover:underline"
                                                >
                                                    <IconMessage size={12} /> Reply in thread
                                                </button>
                                            )}
                                            {msg.replyCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveThreadParent(msg)}
                                                    style={{ background: 'transparent', border: 'none', fontSize: '0.6875rem', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
                                                    className="hover:underline"
                                                >
                                                    {msg.deleted ? '' : '• '}{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Reaction Bar on Hover (MS Teams Style) */}
                                    {isHovered && !msg.deleted && (
                                        <div style={{
                                            position: 'absolute',
                                            [isMe ? 'left' : 'right']: 8,
                                            top: -12,
                                            background: '#1e1f29',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: 18,
                                            padding: '2px 6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                            zIndex: 10
                                        }}>
                                            {['👍', '❤️', '🎉', '😂', '😮', '🚀'].map((em) => (
                                                <button
                                                    key={em}
                                                    type="button"
                                                    onClick={() => handleReaction(msg._id, em)}
                                                    style={{ background: 'transparent', border: 'none', fontSize: '0.85rem', cursor: 'pointer', padding: '1px 3px', borderRadius: 4 }}
                                                    title={`React with ${em}`}
                                                >
                                                    {em}
                                                </button>
                                            ))}
                                            <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />
                                            <button
                                                type="button"
                                                onClick={() => handleTogglePin(msg._id)}
                                                style={{
                                                    background: msg.pinned ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                                    border: 'none',
                                                    color: msg.pinned ? '#f59e0b' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    padding: '2px 4px',
                                                    borderRadius: 4,
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                title={msg.pinned ? 'Unpin message' : 'Pin message to channel'}
                                            >
                                                <IconPin size={13} />
                                            </button>
                                            {canDelete && (
                                                <>
                                                    <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteChannelMessage(msg._id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#f87171',
                                                            cursor: 'pointer',
                                                            padding: '2px 4px',
                                                            borderRadius: 4,
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Delete message"
                                                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                                                        onMouseLeave={e => { e.currentTarget.style.color = '#f87171' }}
                                                    >
                                                        <IconTrash size={13} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        )
                    })
                )}
                <div ref={mainChatEndRef} />
            </div>
        </div>
    )
}
