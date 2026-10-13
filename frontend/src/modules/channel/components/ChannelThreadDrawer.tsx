import React from 'react'
import type { Channel } from '../channel.types'
import { IconX, IconMessage, IconTrash, IconUndo } from '../../../components/common/Icons'
import { renderFormattedMessage } from '../../../utils/formatMessage'

interface ChannelThreadDrawerProps {
    activeThreadParent: any | null
    onClose: () => void
    threadMessages: any[]
    threadFeedRef: React.RefObject<HTMLDivElement | null>
    threadChatEndRef: React.RefObject<HTMLDivElement | null>
    resolvedUserId: string
    selectedChannel: Channel
    handleDeleteChannelMessage: (messageId: string) => void
    handleUndoDeleteChannelMessage: (messageId: string) => void
    threadInput: string
    setThreadInput: (val: string) => void
    handleSendThreadMessage: (e: React.FormEvent) => void
}

export const ChannelThreadDrawer: React.FC<ChannelThreadDrawerProps> = ({
    activeThreadParent,
    onClose,
    threadMessages,
    threadFeedRef,
    threadChatEndRef,
    resolvedUserId,
    selectedChannel,
    handleDeleteChannelMessage,
    handleUndoDeleteChannelMessage,
    threadInput,
    setThreadInput,
    handleSendThreadMessage
}) => {
    if (!activeThreadParent) return null

    return (
        <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 320,
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            background: '#111218',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.5)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#fff' }}>Thread Conversation</span>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                    <IconX size={14} />
                </button>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>
                    {activeThreadParent.senderId?.fullName ? activeThreadParent.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{activeThreadParent.senderId?.fullName || 'User'}</div>
                    {activeThreadParent.deleted ? (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>This message was deleted.</div>
                    ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            {renderFormattedMessage(activeThreadParent.content)}
                        </div>
                    )}
                </div>
            </div>

            <div ref={threadFeedRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                {threadMessages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <IconMessage size={14} /> No replies in this thread yet. Be the first to respond!
                    </div>
                ) : (
                    threadMessages.map((reply) => {
                        const rSenderId = typeof reply.senderId === 'object' && reply.senderId !== null
                            ? (reply.senderId._id || reply.senderId.id || '').toString()
                            : (reply.senderId || '').toString()
                        const isMeReply = Boolean(resolvedUserId && rSenderId && (rSenderId === resolvedUserId))
                        const rSenderName = isMeReply ? 'You' : (reply.senderId?.fullName || 'User')
                        const isChannelAdminMember = selectedChannel?.members?.some((m: any) =>
                            (m.userId === resolvedUserId || m.userId?._id === resolvedUserId) &&
                            (m.role === 'owner' || m.role === 'moderator')
                        ) || false
                        const canDeleteReply = isMeReply || isChannelAdminMember

                        return (
                            <div key={reply._id} style={{ display: 'flex', flexDirection: isMeReply ? 'row-reverse' : 'row', gap: 8, padding: '4px 0' }}>
                                <div style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: isMeReply ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)' : 'rgba(99, 102, 241, 0.2)',
                                    color: isMeReply ? '#fff' : '#818cf8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.65rem'
                                }}>
                                    {rSenderName.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: isMeReply ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexDirection: isMeReply ? 'row-reverse' : 'row', gap: 6 }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.725rem', color: isMeReply ? '#c7c9ff' : '#fff' }}>{rSenderName}</span>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {canDeleteReply && !reply.deleted && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteChannelMessage(reply._id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#f87171',
                                                    cursor: 'pointer',
                                                    padding: '0 2px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    opacity: 0.75
                                                }}
                                                title="Delete reply"
                                                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                                                onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.color = '#f87171' }}
                                            >
                                                <IconTrash size={11} />
                                            </button>
                                        )}
                                    </div>
                                    {reply.deleted ? (
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
                                            {isMeReply && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUndoDeleteChannelMessage(reply._id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#818cf8',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        textDecoration: 'underline',
                                                        padding: '0 2px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 2
                                                    }}
                                                >
                                                    <IconUndo size={10} />
                                                    <span>Undo</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: isMeReply ? '#fff' : '#d1d5db',
                                            marginTop: 2,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                            background: isMeReply ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)' : 'rgba(255, 255, 255, 0.05)',
                                            padding: '4px 8px',
                                            borderRadius: isMeReply ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                                            maxWidth: '85%'
                                        }}>
                                            {renderFormattedMessage(reply.content)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={threadChatEndRef} />
            </div>

            <form onSubmit={handleSendThreadMessage} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 8, display: 'flex', gap: 6, background: '#0e0f14' }}>
                <input
                    value={threadInput}
                    onChange={(e) => setThreadInput(e.target.value)}
                    className="input"
                    placeholder="Reply in thread..."
                    style={{ flex: 1, borderRadius: 6, height: 30, fontSize: '0.75rem' }}
                    disabled={selectedChannel.archived}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 10px', borderRadius: 6, height: 30, fontSize: '0.75rem' }} disabled={selectedChannel.archived || !threadInput.trim()}>
                    Reply
                </button>
            </form>
        </div>
    )
}
