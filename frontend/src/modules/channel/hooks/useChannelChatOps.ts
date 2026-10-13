import React from 'react'
import type { Channel, CodeSnippet } from '../channel.types'
import {
    deleteChannelMessage,
    undoDeleteChannelMessage,
    addChannelMessageReaction
} from '../channel.service'
import { API_BASE } from '../../../config'
import { htmlToMarkdown } from '../channel.helpers'

interface UseChannelChatOpsParams {
    selectedChannel: Channel | null
    token: string
    socketInstance: any
    sentByCurrentTabIds: React.MutableRefObject<Set<string>>
    composerEditorRef: React.RefObject<HTMLDivElement | null>
    chatInput: string
    resetEditor: () => void
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
    activeThreadParent: any | null
    threadInput: string
    setThreadInput: React.Dispatch<React.SetStateAction<string>>
    setThreadMessages: React.Dispatch<React.SetStateAction<any[]>>
    setPinnedMessages: React.Dispatch<React.SetStateAction<any[]>>
}

export function useChannelChatOps({
    selectedChannel,
    token,
    socketInstance,
    sentByCurrentTabIds,
    composerEditorRef,
    chatInput,
    resetEditor,
    setMessages,
    activeThreadParent,
    threadInput,
    setThreadInput,
    setThreadMessages,
    setPinnedMessages
}: UseChannelChatOpsParams) {

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!selectedChannel) return

        let content = ''
        if (composerEditorRef.current) {
            content = htmlToMarkdown(composerEditorRef.current.innerHTML)
        } else if (chatInput) {
            content = chatInput.trim()
        }

        if (!content.trim()) return
        resetEditor()

        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            })
            const data = await res.json()
            if (data.success) {
                if (data.data?._id) {
                    sentByCurrentTabIds.current.add(data.data._id.toString())
                }
                if (socketInstance) {
                    socketInstance.emit('channel:message:send', data.data)
                }
                setMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to send message:', err)
        }
    }

    const handleSendThreadMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!threadInput.trim() || !selectedChannel || !activeThreadParent) return

        const content = threadInput.trim()
        setThreadInput('')

        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, replyTo: activeThreadParent._id })
            })
            const data = await res.json()
            if (data.success) {
                if (data.data?._id) {
                    sentByCurrentTabIds.current.add(data.data._id.toString())
                }
                if (socketInstance) {
                    socketInstance.emit('channel:message:send', data.data)
                }
                setThreadMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to send thread reply:', err)
        }
    }

    const handleTogglePin = async (messageId: string) => {
        if (!selectedChannel) return
        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat/${messageId}/pin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                const updated = data.data
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned: updated.pinned, pinnedBy: updated.pinnedBy, pinnedAt: updated.pinnedAt } : m))
                setPinnedMessages(prev => {
                    if (updated.pinned) {
                        return [updated, ...prev.filter(m => m._id !== messageId)]
                    } else {
                        return prev.filter(m => m._id !== messageId)
                    }
                })
            }
        } catch (err) {
            console.error('[handleTogglePin] error:', err)
        }
    }

    const handleDeleteChannelMessage = async (messageId: string) => {
        if (!selectedChannel) return
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
        setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
        setPinnedMessages(prev => prev.filter(m => m._id !== messageId))

        try {
            await deleteChannelMessage(selectedChannel._id, messageId, token)
        } catch (err: any) {
            console.error('Failed to delete channel message:', err)
        }
    }

    const handleUndoDeleteChannelMessage = async (messageId: string) => {
        if (!selectedChannel) return
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: false } : m))
        setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: false } : m))

        try {
            const res = await undoDeleteChannelMessage(selectedChannel._id, messageId, token)
            if (res && res.data) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...res.data, deleted: false } : m))
                setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...res.data, deleted: false } : m))
            }
        } catch (err: any) {
            console.error('Failed to undo delete channel message:', err)
        }
    }

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!selectedChannel) return
        try {
            const updated = await addChannelMessageReaction(selectedChannel._id, messageId, emoji, token)
            if (updated) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: updated.reactions } : m))
                if (socketInstance) {
                    socketInstance.emit('channel:message:reaction:send', { channelId: selectedChannel._id, messageId, reactions: updated.reactions })
                }
            }
        } catch (err) {
            console.error('Failed to react:', err)
        }
    }

    const handlePostCodeSnippet = async (snippet: CodeSnippet, caption?: string) => {
        if (!selectedChannel) return
        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: caption || `Shared a ${snippet.language || ''} code snippet`,
                    messageType: 'code',
                    codeSnippet: snippet
                })
            })
            const data = await res.json()
            if (data.success && socketInstance) {
                if (data.data?._id) {
                    sentByCurrentTabIds.current.add(data.data._id.toString())
                }
                socketInstance.emit('channel:message:send', data.data)
                setMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to post code snippet:', err)
        }
    }

    const handleClipUploaded = async (clip: { _id: string; title: string; videoUrl: string; duration: number }) => {
        if (!selectedChannel) return
        const clipUrl = `${API_BASE}${clip.videoUrl}`
        const clipContent = `[Video Clip] ${clip.title} (${Math.round(clip.duration)}s)\n${clipUrl}`
        try {
            await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: clipContent, messageType: 'text' })
            })
        } catch (e) {
            console.error('Failed to post clip in channel:', e)
        }
    }

    return {
        handleSendMessage,
        handleSendThreadMessage,
        handleTogglePin,
        handleDeleteChannelMessage,
        handleUndoDeleteChannelMessage,
        handleReaction,
        handlePostCodeSnippet,
        handleClipUploaded
    }
}
