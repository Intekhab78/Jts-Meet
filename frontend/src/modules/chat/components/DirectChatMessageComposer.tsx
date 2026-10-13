import React from 'react'
import { IconClock, IconSend } from '../../../components/common/Icons'
import { ChatContact, ActiveFormats } from '../chat.types'
import {
    POPULAR_EMOJIS,
    formattingBtnStyle,
    composerActionIconBtn
} from '../chat.helpers'

interface DirectChatMessageComposerProps {
    activeContact: ChatContact
    composerEditorRef: React.RefObject<HTMLDivElement | null>
    isFormatBarOpen: boolean
    setIsFormatBarOpen: React.Dispatch<React.SetStateAction<boolean>>
    activeFormats: ActiveFormats
    toggleBold: () => void
    toggleItalic: () => void
    toggleInlineCode: () => void
    toggleList: () => void
    toggleQuote: () => void
    isUrgentMessage: boolean
    setIsUrgentMessage: React.Dispatch<React.SetStateAction<boolean>>
    isEditorEmpty: boolean
    showEmojiPicker: boolean
    setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>
    handleInsertEmoji: (emoji: string) => void
    onTriggerFileUpload: () => void
    isUploadingFile: boolean
    onOpenClipModal: () => void
    sendingMessage: boolean
    handleSendMessage: () => void
    handleEditorInput: () => void
    handleEditorKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
    updateActiveFormats: () => void
}

export function DirectChatMessageComposer({
    activeContact,
    composerEditorRef,
    isFormatBarOpen,
    setIsFormatBarOpen,
    activeFormats,
    toggleBold,
    toggleItalic,
    toggleInlineCode,
    toggleList,
    toggleQuote,
    isUrgentMessage,
    setIsUrgentMessage,
    isEditorEmpty,
    showEmojiPicker,
    setShowEmojiPicker,
    handleInsertEmoji,
    onTriggerFileUpload,
    isUploadingFile,
    onOpenClipModal,
    sendingMessage,
    handleSendMessage,
    handleEditorInput,
    handleEditorKeyDown,
    updateActiveFormats
}: DirectChatMessageComposerProps) {
    return (
        <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 17, 23, 0.98)',
            padding: '10px 16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
        }}>
            {/* Format Toolbar (when toggled on) */}
            {isFormatBarOpen && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 6,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={toggleBold}
                        title="Bold"
                        style={{
                            ...formattingBtnStyle,
                            background: activeFormats.bold ? 'rgba(98, 100, 167, 0.4)' : 'transparent',
                            color: activeFormats.bold ? '#fff' : '#c7c9ff',
                            border: activeFormats.bold ? '1px solid rgba(98, 100, 167, 0.6)' : '1px solid transparent'
                        }}
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={toggleItalic}
                        title="Italic"
                        style={{
                            ...formattingBtnStyle,
                            background: activeFormats.italic ? 'rgba(98, 100, 167, 0.4)' : 'transparent',
                            color: activeFormats.italic ? '#fff' : '#c7c9ff',
                            border: activeFormats.italic ? '1px solid rgba(98, 100, 167, 0.6)' : '1px solid transparent'
                        }}
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={toggleInlineCode}
                        title="Code"
                        style={{
                            ...formattingBtnStyle,
                            background: activeFormats.code ? 'rgba(98, 100, 167, 0.4)' : 'transparent',
                            color: activeFormats.code ? '#fff' : '#c7c9ff',
                            border: activeFormats.code ? '1px solid rgba(98, 100, 167, 0.6)' : '1px solid transparent'
                        }}
                    >
                        &lt;/&gt;
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={toggleList}
                        title="Bulleted list"
                        style={{
                            ...formattingBtnStyle,
                            background: activeFormats.list ? 'rgba(98, 100, 167, 0.4)' : 'transparent',
                            color: activeFormats.list ? '#fff' : '#c7c9ff',
                            border: activeFormats.list ? '1px solid rgba(98, 100, 167, 0.6)' : '1px solid transparent'
                        }}
                    >
                        • List
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={toggleQuote}
                        title="Quote"
                        style={{
                            ...formattingBtnStyle,
                            background: activeFormats.quote ? 'rgba(98, 100, 167, 0.4)' : 'transparent',
                            color: activeFormats.quote ? '#fff' : '#c7c9ff',
                            border: activeFormats.quote ? '1px solid rgba(98, 100, 167, 0.6)' : '1px solid transparent'
                        }}
                    >
                        &ldquo; Quote
                    </button>
                </div>
            )}

            {/* Urgent Flag Notification Ribbon */}
            {isUrgentMessage && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 700
                }}>
                    <span>🚨 Marked as URGENT (Recipient will receive high priority indicator)</span>
                    <button
                        type="button"
                        onClick={() => setIsUrgentMessage(false)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Main Input WYSIWYG Container */}
            <div style={{ position: 'relative', width: '100%', minHeight: isFormatBarOpen ? 80 : 42, display: 'flex' }}>
                {isEditorEmpty && (
                    <div style={{
                        position: 'absolute',
                        left: 14,
                        top: 10,
                        color: '#64748b',
                        fontSize: '0.8125rem',
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}>
                        Type a message to {activeContact.fullName} (Enter to send, Shift+Enter for new line)...
                    </div>
                )}
                <div
                    ref={composerEditorRef}
                    contentEditable
                    role="textbox"
                    aria-multiline="true"
                    onInput={handleEditorInput}
                    onKeyDown={handleEditorKeyDown}
                    onKeyUp={updateActiveFormats}
                    onMouseUp={updateActiveFormats}
                    style={{
                        width: '100%',
                        minHeight: isFormatBarOpen ? 80 : 42,
                        maxHeight: 180,
                        overflowY: 'auto',
                        padding: '10px 14px',
                        fontSize: '0.8125rem',
                        lineHeight: 1.4,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: isUrgentMessage ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}
                />
            </div>

            {/* Bottom Action Bar (Teams Style) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {/* Format toggle button */}
                    <button
                        type="button"
                        onClick={() => setIsFormatBarOpen(!isFormatBarOpen)}
                        title="Format message"
                        style={{
                            ...composerActionIconBtn,
                            background: isFormatBarOpen ? 'rgba(98, 100, 167, 0.3)' : 'transparent',
                            color: isFormatBarOpen ? '#c7c9ff' : 'var(--color-text-muted)'
                        }}
                    >
                        <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>A</span>
                    </button>

                    {/* File Attachment Button */}
                    <button
                        type="button"
                        onClick={onTriggerFileUpload}
                        disabled={isUploadingFile}
                        title="Attach file (PDF, Doc, Image, Zip)"
                        style={composerActionIconBtn}
                    >
                        {isUploadingFile ? (
                            <IconClock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                        )}
                    </button>

                    {/* Emoji Picker toggle button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            title="Add emoji"
                            style={{
                                ...composerActionIconBtn,
                                background: showEmojiPicker ? 'rgba(98, 100, 167, 0.3)' : 'transparent'
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>😊</span>
                        </button>

                        {/* Quick Emoji Popover */}
                        {showEmojiPicker && (
                            <div style={{
                                position: 'absolute',
                                bottom: 40,
                                left: 0,
                                background: '#1a1d28',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 10,
                                padding: 8,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: 4,
                                zIndex: 50,
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                            }}>
                                {POPULAR_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleInsertEmoji(emoji)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '1.25rem',
                                            cursor: 'pointer',
                                            padding: 4,
                                            borderRadius: 6
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)' }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Zoom Clips / Video Message Button */}
                    <button
                        type="button"
                        onClick={onOpenClipModal}
                        title="Record Video Clip (Zoom Clips / Loom)"
                        style={{
                            ...composerActionIconBtn,
                            color: '#c084fc'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    </button>

                    {/* Urgent Delivery Priority Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsUrgentMessage(!isUrgentMessage)}
                        title={isUrgentMessage ? 'Urgent flag active' : 'Set priority: Urgent'}
                        style={{
                            ...composerActionIconBtn,
                            color: isUrgentMessage ? '#ef4444' : 'var(--color-text-muted)',
                            background: isUrgentMessage ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                            fontWeight: 800
                        }}
                    >
                        !
                    </button>
                </div>

                {/* Send Button */}
                <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isEditorEmpty || sendingMessage}
                    style={{
                        height: 34,
                        padding: '0 16px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        fontSize: '0.78125rem',
                        border: 'none',
                        background: !isEditorEmpty ? '#6264a7' : 'rgba(255, 255, 255, 0.08)',
                        color: !isEditorEmpty ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                        cursor: !isEditorEmpty ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                        boxShadow: !isEditorEmpty ? '0 2px 8px rgba(98, 100, 167, 0.4)' : 'none'
                    }}
                >
                    <IconSend size={13} />
                    <span>Send</span>
                </button>
            </div>
        </div>
    )
}
