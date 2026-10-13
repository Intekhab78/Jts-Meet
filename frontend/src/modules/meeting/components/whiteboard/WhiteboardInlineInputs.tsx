import React from 'react'

interface WhiteboardInlineInputsProps {
    activeTextInput: { x: number; y: number } | null
    textValue: string
    color: string
    size: number
    zoom: number
    pan: { x: number; y: number }
    textInputRef: React.RefObject<HTMLInputElement | null>
    onChangeTextValue: (val: string) => void
    onCommitText: () => void
    onCancelText: () => void

    activeStickyInput: { x: number; y: number } | null
    stickyValue: string
    stickyColor: string
    stickyInputRef: React.RefObject<HTMLTextAreaElement | null>
    onChangeStickyValue: (val: string) => void
    onCommitSticky: () => void
    onCancelSticky: () => void
}

export function WhiteboardInlineInputs({
    activeTextInput,
    textValue,
    color,
    size,
    zoom,
    pan,
    textInputRef,
    onChangeTextValue,
    onCommitText,
    onCancelText,
    activeStickyInput,
    stickyValue,
    stickyColor,
    stickyInputRef,
    onChangeStickyValue,
    onCommitSticky,
    onCancelSticky
}: WhiteboardInlineInputsProps) {
    return (
        <>
            {/* Inline Text Input */}
            {activeTextInput && (
                <div style={{
                    position: 'absolute',
                    left: activeTextInput.x * zoom + pan.x,
                    top: activeTextInput.y * zoom + pan.y,
                    zIndex: 40,
                    transform: 'translate(-2px, -2px)'
                }}>
                    <input
                        ref={textInputRef}
                        type="text"
                        value={textValue}
                        placeholder="Type here... (Enter to finish)"
                        onChange={(e) => onChangeTextValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                onCommitText()
                            } else if (e.key === 'Escape') {
                                onCancelText()
                            }
                        }}
                        onBlur={onCommitText}
                        autoFocus
                        style={{
                            font: `600 ${Math.max(16, size * 4) * zoom}px Inter, -apple-system, sans-serif`,
                            color: color,
                            background: '#ffffff',
                            border: '2px solid #6366f1',
                            borderRadius: 6,
                            padding: '4px 10px',
                            outline: 'none',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
                            minWidth: 160
                        }}
                    />
                </div>
            )}

            {/* Sticky Note Creator */}
            {activeStickyInput && (
                <div style={{
                    position: 'absolute',
                    left: activeStickyInput.x * zoom + pan.x,
                    top: activeStickyInput.y * zoom + pan.y,
                    width: 180 * zoom,
                    minHeight: 140 * zoom,
                    background: stickyColor,
                    borderRadius: 8,
                    boxShadow: '0 12px 28px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    zIndex: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: 24 * zoom,
                        background: 'rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        fontSize: `${0.6875 * zoom}rem`,
                        fontWeight: 700,
                        color: '#334155'
                    }}>
                        <span>📝 Sticky Note</span>
                        <button
                            onClick={onCancelSticky}
                            style={{
                                border: 'none', background: 'transparent',
                                cursor: 'pointer', fontSize: 14 * zoom, color: '#64748b', lineHeight: 1
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <textarea
                        ref={stickyInputRef}
                        value={stickyValue}
                        placeholder="Type note... (Ctrl+Enter to post)"
                        onChange={(e) => onChangeStickyValue(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault()
                                onCommitSticky()
                            } else if (e.key === 'Escape') {
                                onCancelSticky()
                            }
                        }}
                        autoFocus
                        style={{
                            flex: 1,
                            width: '100%',
                            minHeight: 75 * zoom,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            padding: 8,
                            fontSize: `${0.8125 * zoom}rem`,
                            fontFamily: 'Inter, sans-serif',
                            resize: 'none',
                            color: '#0f172a'
                        }}
                    />
                    <div style={{
                        padding: '4px 8px',
                        background: 'rgba(0,0,0,0.04)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 6
                    }}>
                        <button
                            onClick={onCommitSticky}
                            style={{
                                border: 'none',
                                background: '#0f172a',
                                color: '#fff',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                borderRadius: 4,
                                padding: '3px 10px',
                                cursor: 'pointer'
                            }}
                        >
                            Post
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
