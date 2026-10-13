import React from 'react'
import { IconMessage, IconX, IconTrash } from '../../../components/common/Icons'
import { renderFormattedMessage } from '../../../utils/formatMessage'
import { ChatMessage } from '../chat.types'
import { formatTimestamp } from '../chat.helpers'

interface DirectChatThreadDrawerProps {
    activeThreadParent: ChatMessage
    threadReplies: ChatMessage[]
    threadInput: string
    loadingThread: boolean
    sendingThreadReply: boolean
    currentUserId: string
    threadEndRef: React.RefObject<HTMLDivElement | null>
    onClose: () => void
    onChangeThreadInput: (val: string) => void
    onSendThreadReply: (e: React.FormEvent) => void
    onDeleteMessage: (messageId: string) => void
    onUndoDeleteMessage: (messageId: string) => void
}

export function DirectChatThreadDrawer({
    activeThreadParent,
    threadReplies,
    threadInput,
    loadingThread,
    sendingThreadReply,
    currentUserId,
    threadEndRef,
    onClose,
    onChangeThreadInput,
    onSendThreadReply,
    onDeleteMessage,
    onUndoDeleteMessage
}: DirectChatThreadDrawerProps) {
    return (
        <div style={{
            width: 330,
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#0d0e14',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
        }}>
            {/* Thread Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconMessage size={16} color="#a6a8f8" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Thread Reply</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                    <IconX size={16} />
                </button>
            </div>

            {/* Parent Message Card */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(98, 100, 167, 0.08)'
            }}>
                <div style={{ fontSize: '0.6875rem', color: '#a6a8f8', fontWeight: 600, marginBottom: 4 }}>
                    Original Message &bull; {formatTimestamp(activeThreadParent.createdAt)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {renderFormattedMessage(activeThreadParent.message)}
                </div>
            </div>

            {/* Replies List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loadingThread ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 'auto' }}>
                        Loading replies...
                    </div>
                ) : threadReplies.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 'auto' }}>
                        No replies in this thread yet. Send a response below.
                    </div>
                ) : (
                    threadReplies.map((reply, rIdx) => {
                        const rSenderId = typeof reply.sender === 'object' ? reply.sender._id : reply.sender
                        const isMyReply = rSenderId === currentUserId
                        return (
                            <div key={reply._id || rIdx} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMyReply ? 'flex-end' : 'flex-start'
                            }}>
                                {reply.isDeleted ? (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 10px',
                                        borderRadius: 6,
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px dashed rgba(255, 255, 255, 0.15)',
                                        color: '#94a3b8',
                                        fontSize: '0.75rem',
                                        fontStyle: 'italic',
                                        margin: '2px 0'
                                    }}>
                                        <IconTrash size={11} color="#94a3b8" />
                                        <span>This message was deleted.</span>
                                        {isMyReply && (
                                            <button
                                                type="button"
                                                onClick={() => onUndoDeleteMessage(reply._id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#818cf8',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    textDecoration: 'underline',
                                                    padding: '0 2px'
                                                }}
                                            >
                                                Undo
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: isMyReply ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                                        background: isMyReply ? '#6264a7' : 'rgba(255, 255, 255, 0.06)',
                                        border: isMyReply ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#fff',
                                        fontSize: '0.75rem',
                                        maxWidth: '85%',
                                        wordBreak: 'break-word',
                                        position: 'relative'
                                    }}>
                                        {renderFormattedMessage(reply.message)}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
                                            {isMyReply && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteMessage(reply._id)}
                                                    title="Delete reply"
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'rgba(255,255,255,0.4)',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                                                >
                                                    <IconTrash size={11} />
                                                </button>
                                            )}
                                            <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>
                                                {formatTimestamp(reply.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
                <div ref={threadEndRef} />
            </div>

            {/* Thread Composer */}
            <form onSubmit={onSendThreadReply} style={{
                padding: '10px 14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 17, 23, 0.95)',
                display: 'flex',
                gap: 8
            }}>
                <input
                    type="text"
                    value={threadInput}
                    onChange={e => onChangeThreadInput(e.target.value)}
                    placeholder="Reply in thread..."
                    style={{
                        flex: 1,
                        height: 36,
                        fontSize: '0.75rem',
                        borderRadius: 6,
                        padding: '0 10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff'
                    }}
                />
                <button
                    type="submit"
                    disabled={!threadInput.trim() || sendingThreadReply}
                    style={{
                        height: 36,
                        padding: '0 12px',
                        borderRadius: 6,
                        background: '#6264a7',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: threadInput.trim() ? 'pointer' : 'not-allowed',
                        opacity: threadInput.trim() ? 1 : 0.6
                    }}
                >
                    Reply
                </button>
            </form>
        </div>
    )
}
