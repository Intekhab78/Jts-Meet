import React from 'react'
import type { Channel } from '../channel.types'
import {
    IconPin, IconMonitor, IconMic, IconSparkles
} from '../../../components/common/Icons'
import { formatDuration } from '../channel.helpers'

interface ChannelMessageComposerProps {
    selectedChannel: Channel
    composerEditorRef: React.RefObject<HTMLDivElement | null>
    fileInputRef: React.RefObject<HTMLInputElement | null>
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    uploadingFile: boolean
    isEditorEmpty: boolean
    activeFormats: { bold: boolean; italic: boolean; strike: boolean; code: boolean }
    showEmojiPicker: boolean
    setShowEmojiPicker: (show: boolean | ((prev: boolean) => boolean)) => void
    handleInsertEmoji: (emoji: string) => void
    typingUsers: Array<{ userId: string; username: string; timestamp: number }>
    isRecordingAudio: boolean
    audioRecordDuration: number
    startAudioRecording: () => void
    stopAudioRecording: (send: boolean) => void
    handleEditorInput: () => void
    handleEditorKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
    updateActiveFormats: () => void
    toggleBold: () => void
    toggleItalic: () => void
    toggleStrike: () => void
    toggleInlineCode: () => void
    handleSendMessage: () => void
    setShowCodeModal: (show: boolean) => void
    setShowClipModal: (show: boolean) => void
}

export const ChannelMessageComposer: React.FC<ChannelMessageComposerProps> = ({
    selectedChannel,
    composerEditorRef,
    fileInputRef,
    handleFileUpload,
    uploadingFile,
    isEditorEmpty,
    activeFormats,
    showEmojiPicker,
    setShowEmojiPicker,
    handleInsertEmoji,
    typingUsers,
    isRecordingAudio,
    audioRecordDuration,
    startAudioRecording,
    stopAudioRecording,
    handleEditorInput,
    handleEditorKeyDown,
    updateActiveFormats,
    toggleBold,
    toggleItalic,
    toggleStrike,
    toggleInlineCode,
    handleSendMessage,
    setShowCodeModal,
    setShowClipModal
}) => {
    return (
        <div style={{
            background: 'rgba(15, 17, 26, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
        }}>
            {/* Formatting & Attachment Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Hidden multiple file input */}
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />

                    {/* Paperclip Attach */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile || selectedChannel.archived}
                        title="Attach / Upload files (PDF, Images, Excel, Docs)"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            color: '#d4d4d8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <IconPin size={13} />
                        <span>{uploadingFile ? 'Uploading...' : 'Attach'}</span>
                    </button>

                    {/* Code Snippet Button */}
                    <button
                        type="button"
                        onClick={() => setShowCodeModal(true)}
                        disabled={selectedChannel.archived}
                        title="Share code snippet with syntax styling"
                        style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#818cf8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <IconMonitor size={13} />
                        <span>Code Snippet</span>
                    </button>

                    {/* Zoom Clips Async Video Recorder Button */}
                    <button
                        type="button"
                        onClick={() => setShowClipModal(true)}
                        disabled={selectedChannel.archived}
                        title="Record Video Clip (Zoom Clips / Loom)"
                        style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#c084fc',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        <span>Record Clip</span>
                    </button>

                    {/* Feature 4: Quick Voice Note Button */}
                    <button
                        type="button"
                        onClick={isRecordingAudio ? () => stopAudioRecording(true) : startAudioRecording}
                        disabled={selectedChannel.archived || uploadingFile}
                        title={isRecordingAudio ? "Stop & send voice message" : "Record voice note"}
                        style={{
                            background: isRecordingAudio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 185, 129, 0.12)',
                            border: `1px solid ${isRecordingAudio ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isRecordingAudio ? '#ef4444' : '#10b981',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <IconMic size={13} />
                        <span>{isRecordingAudio ? `Recording (${formatDuration(audioRecordDuration)})` : 'Voice Note'}</span>
                    </button>

                    {/* Emoji toggle */}
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(prev => !prev)}
                        title="Insert Emoji"
                        style={{
                            background: showEmojiPicker ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${showEmojiPicker ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            color: '#d4d4d8',
                            cursor: 'pointer'
                        }}
                    >
                        <IconSparkles size={14} color="#facc15" />
                    </button>

                    {/* Divider */}
                    <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.12)', margin: '0 2px' }} />

                    {/* Professional MS Teams / Slack Formatting Toolbar */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        padding: '1px 2px',
                        gap: 2
                    }}>
                        {/* Bold Button */}
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={toggleBold}
                            title="Bold (Ctrl+B)"
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                background: activeFormats.bold ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                border: activeFormats.bold ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                color: activeFormats.bold ? '#a5b4fc' : '#e2e8f0',
                                fontSize: '0.8125rem',
                                fontWeight: 900,
                                fontFamily: 'system-ui, sans-serif',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            B
                        </button>

                        {/* Italic Button */}
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={toggleItalic}
                            title="Italic (Ctrl+I)"
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                background: activeFormats.italic ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                border: activeFormats.italic ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                color: activeFormats.italic ? '#a5b4fc' : '#e2e8f0',
                                fontSize: '0.8125rem',
                                fontStyle: 'italic',
                                fontFamily: 'Georgia, serif',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            I
                        </button>

                        {/* Strikethrough Button */}
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={toggleStrike}
                            title="Strikethrough"
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                background: activeFormats.strike ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                border: activeFormats.strike ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                color: activeFormats.strike ? '#a5b4fc' : '#94a3b8',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                textDecoration: 'line-through'
                            }}
                        >
                            S
                        </button>

                        {/* Inline Code Button */}
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={toggleInlineCode}
                            title="Inline Code (Ctrl+E)"
                            style={{
                                height: 24,
                                padding: '0 6px',
                                borderRadius: 4,
                                background: activeFormats.code ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                border: activeFormats.code ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                color: activeFormats.code ? '#a5b4fc' : '#cbd5e1',
                                fontSize: '0.725rem',
                                fontFamily: 'Consolas, Monaco, monospace',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            &lt;/&gt;
                        </button>
                    </div>
                </div>

                <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>
                    Shift + Enter for new line • Enter to send
                </span>
            </div>

            {/* Emoji Picker Row */}
            {showEmojiPicker && (
                <div style={{
                    display: 'flex',
                    gap: 6,
                    padding: '6px 10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    flexWrap: 'wrap'
                }}>
                    {['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '🚀', '👏', '💯', '✨', '🤝'].map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleInsertEmoji(emoji)}
                            style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px 4px' }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Feature 3: Live Real-Time Typing Indicator */}
            {typingUsers.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.725rem',
                    color: '#818cf8',
                    padding: '2px 4px',
                    animation: 'fadeIn 0.15s ease'
                }}>
                    <span>✍️</span>
                    <span style={{ fontWeight: 600 }}>
                        {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                </div>
            )}

            {/* Feature 4: Active Audio Recording Banner */}
            {isRecordingAudio ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 8,
                    padding: '8px 14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 8px #ef4444'
                        }} />
                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8125rem' }}>
                            Recording Voice Note... ({formatDuration(audioRecordDuration)})
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => stopAudioRecording(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                padding: '4px 8px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => stopAudioRecording(true)}
                            className="btn btn-primary"
                            style={{
                                height: 30,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: 6,
                                padding: '0 12px',
                                background: '#10b981',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Send Audio
                        </button>
                    </div>
                </div>
            ) : (
                /* Rich WYSIWYG Composer */
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', width: '100%' }}>
                    <div style={{ position: 'relative', flex: 1, minHeight: 38, display: 'flex' }}>
                        {isEditorEmpty && (
                            <div style={{
                                position: 'absolute',
                                left: 12,
                                top: 9,
                                color: '#64748b',
                                fontSize: '0.8125rem',
                                pointerEvents: 'none',
                                userSelect: 'none'
                            }}>
                                Send a message to #{selectedChannel.name}...
                            </div>
                        )}
                        <div
                            ref={composerEditorRef}
                            contentEditable={!selectedChannel.archived}
                            role="textbox"
                            aria-multiline="true"
                            onInput={handleEditorInput}
                            onKeyDown={handleEditorKeyDown}
                            onKeyUp={updateActiveFormats}
                            onMouseUp={updateActiveFormats}
                            style={{
                                flex: 1,
                                minHeight: 38,
                                maxHeight: 140,
                                overflowY: 'auto',
                                borderRadius: 8,
                                padding: '8px 12px',
                                fontSize: '0.8125rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                outline: 'none',
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSendMessage}
                        className="btn btn-primary"
                        style={{
                            height: 38,
                            padding: '0 16px',
                            borderRadius: 8,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            background: !isEditorEmpty ? '#6366F1' : 'rgba(99, 102, 241, 0.4)',
                            border: 'none',
                            color: '#fff',
                            cursor: !isEditorEmpty ? 'pointer' : 'default',
                            boxShadow: !isEditorEmpty ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                        disabled={selectedChannel.archived || isEditorEmpty}
                    >
                        Send
                    </button>
                </div>
            )}
        </div>
    )
}
