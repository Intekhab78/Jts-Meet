import { useState, useRef } from 'react'
import { ActiveFormats } from '../chat.types'

interface UseDirectChatEditorProps {
    onSendMessage: () => void
    onTypingStart?: () => void
    onTypingStop?: () => void
}

export function useDirectChatEditor({
    onSendMessage,
    onTypingStart,
    onTypingStop
}: UseDirectChatEditorProps) {
    const composerEditorRef = useRef<HTMLDivElement>(null)
    const [isFormatBarOpen, setIsFormatBarOpen] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isUrgentMessage, setIsUrgentMessage] = useState(false)
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
        bold: false,
        italic: false,
        code: false,
        list: false,
        quote: false
    })

    const checkEditorState = () => {
        const text = composerEditorRef.current?.innerText || ''
        setIsEditorEmpty(!text.trim())
    }

    const updateActiveFormats = () => {
        try {
            const isBold = document.queryCommandState('bold')
            const isItalic = document.queryCommandState('italic')
            const isList = document.queryCommandState('insertUnorderedList')

            let isCode = false
            let isQuote = false
            const sel = window.getSelection()
            if (sel && sel.anchorNode && composerEditorRef.current) {
                let node: Node | null = sel.anchorNode
                while (node && node !== composerEditorRef.current) {
                    if (node.nodeName === 'CODE') isCode = true
                    if (node.nodeName === 'BLOCKQUOTE') isQuote = true
                    node = node.parentNode
                }
            }

            setActiveFormats({
                bold: isBold,
                italic: isItalic,
                code: isCode,
                list: isList,
                quote: isQuote
            })
        } catch (_) {}
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

    const toggleList = () => {
        composerEditorRef.current?.focus()
        document.execCommand('insertUnorderedList', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleQuote = () => {
        const editor = composerEditorRef.current
        if (!editor) return
        editor.focus()
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return
        const range = sel.getRangeAt(0)

        let node: Node | null = sel.anchorNode
        let quoteParent: HTMLElement | null = null
        while (node && node !== editor) {
            if (node.nodeName === 'BLOCKQUOTE') {
                quoteParent = node as HTMLElement
                break
            }
            node = node.parentNode
        }

        if (quoteParent) {
            const parent = quoteParent.parentNode
            while (quoteParent.firstChild) {
                parent?.insertBefore(quoteParent.firstChild, quoteParent)
            }
            parent?.removeChild(quoteParent)
        } else {
            const bq = document.createElement('blockquote')
            bq.style.borderLeft = '3px solid #6264a7'
            bq.style.paddingLeft = '8px'
            bq.style.margin = '4px 0'
            bq.style.color = '#c7c9ff'
            try {
                range.surroundContents(bq)
            } catch (_) {
                document.execCommand('formatBlock', false, 'blockquote')
            }
        }
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
            const selectedText = range.toString()
            const codeEl = document.createElement('code')
            codeEl.style.background = 'rgba(255, 255, 255, 0.1)'
            codeEl.style.color = '#f43f5e'
            codeEl.style.padding = '1px 5px'
            codeEl.style.borderRadius = '4px'
            codeEl.style.fontFamily = 'Consolas, Monaco, monospace'
            codeEl.style.fontSize = '0.85em'
            codeEl.textContent = selectedText || ' '
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
        if (onTypingStart) onTypingStart()
    }

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSendMessage()
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault()
            toggleBold()
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault()
            toggleItalic()
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault()
            toggleInlineCode()
        }
    }

    const handleInsertEmoji = (emoji: string) => {
        const editor = composerEditorRef.current
        if (!editor) return
        editor.focus()
        document.execCommand('insertText', false, emoji)
        setShowEmojiPicker(false)
        checkEditorState()
    }

    const resetEditor = () => {
        if (composerEditorRef.current) {
            composerEditorRef.current.innerHTML = ''
        }
        setIsEditorEmpty(true)
        setIsUrgentMessage(false)
        setShowEmojiPicker(false)
        setActiveFormats({ bold: false, italic: false, code: false, list: false, quote: false })
    }

    return {
        composerEditorRef,
        isFormatBarOpen,
        setIsFormatBarOpen,
        showEmojiPicker,
        setShowEmojiPicker,
        isUrgentMessage,
        setIsUrgentMessage,
        isEditorEmpty,
        activeFormats,
        toggleBold,
        toggleItalic,
        toggleInlineCode,
        toggleList,
        toggleQuote,
        handleEditorInput,
        handleEditorKeyDown,
        handleInsertEmoji,
        updateActiveFormats,
        checkEditorState,
        resetEditor
    }
}
