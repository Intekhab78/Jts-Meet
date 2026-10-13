import { useState, useRef } from 'react'
import type { Channel } from '../channel.types'

interface UseChannelEditorParams {
    selectedChannel: Channel | null
    resolvedUserId: string
    currentUserName: string
    socketInstance: any
    onSendMessage: () => void
}

export function useChannelEditor({
    selectedChannel,
    resolvedUserId,
    currentUserName,
    socketInstance,
    onSendMessage
}: UseChannelEditorParams) {
    const [chatInput, setChatInput] = useState('')
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    const [activeFormats, setActiveFormats] = useState<{ bold: boolean; italic: boolean; strike: boolean; code: boolean }>({
        bold: false,
        italic: false,
        strike: false,
        code: false
    })
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    const composerEditorRef = useRef<HTMLDivElement>(null)
    const typingDebounceRef = useRef<any>(null)

    const checkEditorState = () => {
        const text = composerEditorRef.current?.innerText || ''
        setIsEditorEmpty(!text.trim())
    }

    const updateActiveFormats = () => {
        try {
            const isBold = document.queryCommandState('bold')
            const isItalic = document.queryCommandState('italic')
            const isStrike = document.queryCommandState('strikeThrough')

            let isCode = false
            const sel = window.getSelection()
            if (sel && sel.anchorNode && composerEditorRef.current) {
                let node: Node | null = sel.anchorNode
                while (node && node !== composerEditorRef.current) {
                    if (node.nodeName === 'CODE') {
                        isCode = true
                        break
                    }
                    node = node.parentNode
                }
            }

            setActiveFormats({
                bold: isBold,
                italic: isItalic,
                strike: isStrike,
                code: isCode
            })
        } catch (_) { }
    }

    const toggleBold = () => {
        composerEditorRef.current?.focus()
        document.execCommand('bold', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleItalic = () => {
        composerEditorRef.current?.focus()
        document.execCommand('italic', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleStrike = () => {
        composerEditorRef.current?.focus()
        document.execCommand('strikeThrough', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleInlineCode = () => {
        const editor = composerEditorRef.current
        if (!editor) return
        editor.focus()
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return
        const range = sel.getRangeAt(0)

        let node: Node | null = sel.anchorNode
        let codeParent: HTMLElement | null = null
        while (node && node !== editor) {
            if (node.nodeName === 'CODE') {
                codeParent = node as HTMLElement
                break
            }
            node = node.parentNode
        }

        if (codeParent) {
            const parent = codeParent.parentNode
            while (codeParent.firstChild) {
                parent?.insertBefore(codeParent.firstChild, codeParent)
            }
            parent?.removeChild(codeParent)
        } else {
            const selectedText = range.toString() || 'code'
            const codeEl = document.createElement('code')
            codeEl.style.background = 'rgba(255, 255, 255, 0.1)'
            codeEl.style.color = '#f43f5e'
            codeEl.style.padding = '1px 5px'
            codeEl.style.borderRadius = '4px'
            codeEl.style.fontFamily = 'Consolas, Monaco, monospace'
            codeEl.style.fontSize = '0.85em'
            codeEl.textContent = selectedText
            range.deleteContents()
            range.insertNode(codeEl)

            const newRange = document.createRange()
            newRange.selectNodeContents(codeEl)
            sel.removeAllRanges()
            sel.addRange(newRange)
        }
        updateActiveFormats()
        checkEditorState()
    }

    const handleEditorInput = () => {
        checkEditorState()
        updateActiveFormats()
        const text = composerEditorRef.current?.innerText || ''
        if (socketInstance && selectedChannel) {
            socketInstance.emit('channel:typing', {
                channelId: selectedChannel._id,
                userId: resolvedUserId,
                username: currentUserName,
                typing: !!text.trim()
            })
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
            typingDebounceRef.current = setTimeout(() => {
                if (socketInstance && selectedChannel) {
                    socketInstance.emit('channel:typing', {
                        channelId: selectedChannel._id,
                        userId: resolvedUserId,
                        username: currentUserName,
                        typing: false
                    })
                }
            }, 2500)
        }
    }

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSendMessage()
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault()
            toggleInlineCode()
        }
    }

    const handleInsertEmoji = (emoji: string) => {
        const editor = composerEditorRef.current
        if (!editor) return
        editor.focus()
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0)
            range.deleteContents()
            const textNode = document.createTextNode(emoji)
            range.insertNode(textNode)
            range.setStartAfter(textNode)
            range.setEndAfter(textNode)
            sel.removeAllRanges()
            sel.addRange(range)
        } else {
            editor.innerText += emoji
        }
        checkEditorState()
        setShowEmojiPicker(false)
    }

    const handleChatInputChange = (val: string) => {
        setChatInput(val)
        if (socketInstance && selectedChannel) {
            socketInstance.emit('channel:typing', {
                channelId: selectedChannel._id,
                userId: resolvedUserId,
                username: currentUserName,
                typing: true
            })
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
            typingDebounceRef.current = setTimeout(() => {
                if (socketInstance && selectedChannel) {
                    socketInstance.emit('channel:typing', {
                        channelId: selectedChannel._id,
                        userId: resolvedUserId,
                        username: currentUserName,
                        typing: false
                    })
                }
            }, 2500)
        }
    }

    const resetEditor = () => {
        if (composerEditorRef.current) {
            composerEditorRef.current.innerHTML = ''
        }
        setChatInput('')
        setIsEditorEmpty(true)
        setShowEmojiPicker(false)
        setActiveFormats({ bold: false, italic: false, strike: false, code: false })
    }

    return {
        composerEditorRef,
        isEditorEmpty,
        activeFormats,
        showEmojiPicker,
        setShowEmojiPicker,
        chatInput,
        setChatInput,
        handleChatInputChange,
        checkEditorState,
        updateActiveFormats,
        toggleBold,
        toggleItalic,
        toggleStrike,
        toggleInlineCode,
        handleEditorInput,
        handleEditorKeyDown,
        handleInsertEmoji,
        resetEditor
    }
}
