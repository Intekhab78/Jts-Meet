import { useState } from 'react'
import { Socket } from 'socket.io-client'
import { API_BASE, normalizeMediaUrl } from '../../../config'
import { ChatContact, ChatMessage, RecentChat } from '../chat.types'
import { formatBytes } from '../chat.helpers'
import { getScreenShareStream } from '../../meeting/services/screen.service'

interface UseDirectChatOpsProps {
    token: string
    currentUserId: string
    activeContact: ChatContact | null
    messages: ChatMessage[]
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    setRecentChats: React.Dispatch<React.SetStateAction<RecentChat[]>>
    loadRecentChats: () => void
    loadConversation: (contactId?: string) => void
    socketRef: React.MutableRefObject<Socket | null>
    activeThreadParent: ChatMessage | null
    setThreadReplies: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    setActiveThreadParent: React.Dispatch<React.SetStateAction<ChatMessage | null>>
    threadInput: string
    setThreadInput: (v: string) => void
    onStartCall?: (targetUserId: string, targetName: string, callType?: 'video' | 'audio' | 'screenshare', targetAvatar?: string, screenStream?: MediaStream) => void
    onStartMeeting?: (roomId: string) => void
}

export function useDirectChatOps({
    token,
    currentUserId,
    activeContact,
    messages,
    setMessages,
    setRecentChats,
    loadRecentChats,
    loadConversation,
    socketRef,
    activeThreadParent,
    setThreadReplies,
    setActiveThreadParent,
    threadInput,
    setThreadInput,
    onStartCall,
    onStartMeeting
}: UseDirectChatOpsProps) {
    const [sendingMessage, setSendingMessage] = useState(false)
    const [isClearingChat, setIsClearingChat] = useState(false)
    const [isUploadingFile, setIsUploadingFile] = useState(false)
    const [sendingThreadReply, setSendingThreadReply] = useState(false)

    // Send Message
    const handleSendMessage = async (rawContent: string) => {
        if (!activeContact || sendingMessage || !rawContent.trim()) return

        setSendingMessage(true)

        const tempId = 'temp_' + Date.now()
        const optimisticMsg: ChatMessage = {
            _id: tempId,
            sender: currentUserId,
            receiver: activeContact._id,
            message: rawContent,
            createdAt: new Date().toISOString(),
            isDelivered: false,
            isSeen: false,
            reactions: []
        }

        setMessages(prev => [...prev, optimisticMsg])

        setRecentChats(prev => {
            const activeId = String(activeContact._id)
            const existingIdx = prev.findIndex(c => String(c.conversationWith) === activeId)
            const updatedItem: RecentChat = {
                conversationWith: activeId,
                latestMessage: optimisticMsg,
                user: activeContact
            }
            if (existingIdx >= 0) {
                const next = [...prev]
                next.splice(existingIdx, 1)
                return [updatedItem, ...next]
            }
            return [updatedItem, ...prev]
        })

        try {
            const res = await fetch(`${API_BASE}/api/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiverId: activeContact._id,
                    message: rawContent
                })
            })

            if (res.ok) {
                const json = await res.json()
                const saved = json.data || json
                setMessages(prev => prev.map(m => m._id === tempId ? saved : m))
                loadRecentChats()
            }
        } catch (err) {
            console.error('[DM Hub] Failed to send message:', err)
        } finally {
            setSendingMessage(false)
        }
    }

    // Toggle Reaction
    const handleToggleReaction = async (messageId: string, emoji: string) => {
        if (!activeContact) return

        setMessages(prev => prev.map(m => {
            if (m._id === messageId) {
                const current = m.reactions || []
                const existingIdx = current.findIndex(r => r.userId === currentUserId && r.emoji === emoji)
                let updated
                if (existingIdx >= 0) {
                    updated = current.filter((_, idx) => idx !== existingIdx)
                } else {
                    updated = [...current, { userId: currentUserId, emoji, createdAt: new Date() }]
                }
                return { ...m, reactions: updated }
            }
            return m
        }))

        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('chat:reaction', {
                receiverId: activeContact._id,
                messageId,
                emoji
            })
        }

        try {
            await fetch(`${API_BASE}/api/chat/message/${messageId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ emoji })
            })
        } catch (err) {
            console.warn('[DM Hub] Failed to persist reaction:', err)
        }
    }

    // Delete message
    const handleDeleteMessage = async (messageId: string) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m))
        setThreadReplies(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m))
        setRecentChats(prev => prev.map(c => {
            if (c.latestMessage?._id === messageId) {
                return { ...c, latestMessage: { ...c.latestMessage, isDeleted: true } }
            }
            return c
        }))

        if (socketRef.current && socketRef.current.connected && activeContact) {
            socketRef.current.emit('chat:message:delete', {
                messageId,
                receiverId: activeContact._id
            })
        }

        try {
            const res = await fetch(`${API_BASE}/api/chat/message/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                console.warn('[DM Hub] Failed to delete message on server')
            }
        } catch (err) {
            console.warn('[DM Hub] Error deleting message:', err)
        }
    }

    // Undo delete message
    const handleUndoDeleteMessage = async (messageId: string) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: false } : m))
        setThreadReplies(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: false } : m))
        setRecentChats(prev => prev.map(c => {
            if (c.latestMessage?._id === messageId) {
                return { ...c, latestMessage: { ...c.latestMessage, isDeleted: false } }
            }
            return c
        }))

        if (socketRef.current && socketRef.current.connected && activeContact) {
            socketRef.current.emit('chat:message:undo', {
                messageId,
                receiverId: activeContact._id
            })
        }

        try {
            const res = await fetch(`${API_BASE}/api/chat/message/${messageId}/undo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                console.warn('[DM Hub] Failed to restore message on server')
            }
        } catch (err) {
            console.warn('[DM Hub] Error restoring message:', err)
        }
    }

    // Clear Chat
    const handleClearChat = async () => {
        if (!activeContact) return
        setIsClearingChat(true)
        try {
            setMessages([])
            setThreadReplies([])
            setActiveThreadParent(null)
            setRecentChats(prev => prev.filter(c => c.conversationWith !== activeContact._id))

            const res = await fetch(`${API_BASE}/api/chat/conversation/${activeContact._id}/clear`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                console.warn('[DM Hub] Failed to clear chat on server')
                loadConversation(activeContact._id)
            } else {
                loadRecentChats()
            }
        } catch (err) {
            console.error('Error clearing chat:', err)
            loadConversation(activeContact._id)
        } finally {
            setIsClearingChat(false)
        }
    }

    // File Upload Handler
    const handleFileUpload = async (file: File) => {
        if (!file || !activeContact) return

        setIsUploadingFile(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('contextType', 'chat')
        formData.append('contextId', activeContact._id)

        try {
            const res = await fetch(`${API_BASE}/api/file/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (res.ok) {
                const json = await res.json()
                const data = json.data || json
                const originalName = data.originalName || file.name
                const secureUrl = normalizeMediaUrl(data.secureUrl || `${API_BASE}/uploads/${data.fileName || file.name}`)
                const fileSizeFormatted = formatBytes(data.size || file.size)
                const fileMessage = `[File: ${originalName} | ${secureUrl} | ${fileSizeFormatted}]`

                const tempId = 'temp_' + Date.now()
                const optimisticMsg: ChatMessage = {
                    _id: tempId,
                    sender: currentUserId,
                    receiver: activeContact._id,
                    message: fileMessage,
                    createdAt: new Date().toISOString(),
                    isDelivered: false,
                    isSeen: false,
                    reactions: []
                }

                setRecentChats(prev => {
                    const activeId = String(activeContact._id)
                    const existingIdx = prev.findIndex(c => String(c.conversationWith) === activeId)
                    const updatedItem: RecentChat = {
                        conversationWith: activeId,
                        latestMessage: optimisticMsg,
                        user: activeContact
                    }
                    if (existingIdx >= 0) {
                        const next = [...prev]
                        next.splice(existingIdx, 1)
                        return [updatedItem, ...next]
                    }
                    return [updatedItem, ...prev]
                })

                const postRes = await fetch(`${API_BASE}/api/chat/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        receiverId: activeContact._id,
                        message: fileMessage
                    })
                })
                if (postRes.ok) {
                    const postJson = await postRes.json()
                    const saved = postJson.data || postJson
                    setMessages(prev => prev.map(m => m._id === tempId ? saved : m))
                    loadRecentChats()
                }
            } else {
                alert('File upload failed. Please verify file format and size.')
            }
        } catch (err) {
            console.error('[DM Hub] Upload failed:', err)
            alert('Unable to upload file at this time.')
        } finally {
            setIsUploadingFile(false)
        }
    }

    // Thread Reply
    const handleSendThreadReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeThreadParent || !threadInput.trim() || sendingThreadReply) return

        const replyContent = threadInput.trim()
        setThreadInput('')
        setSendingThreadReply(true)

        try {
            const res = await fetch(`${API_BASE}/api/chat/thread/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    parentMessageId: activeThreadParent._id,
                    message: replyContent
                })
            })

            if (res.ok) {
                const json = await res.json()
                const newReply = json.data || json
                setThreadReplies(prev => [...prev, newReply])
                setMessages(prev => prev.map(m => {
                    if (m._id === activeThreadParent._id) {
                        return { ...m, threadCount: (m.threadCount || 0) + 1 }
                    }
                    return m
                }))
            }
        } catch (err) {
            console.error('[DM Hub] Failed to send thread reply:', err)
        } finally {
            setSendingThreadReply(false)
        }
    }

    // Video Clip Uploaded
    const handleClipUploaded = async (clip: { _id: string; title: string; videoUrl: string; duration: number }) => {
        if (!activeContact) return
        const clipUrl = `${API_BASE}${clip.videoUrl}`
        const clipMessage = `[Video Clip] ${clip.title} (${Math.round(clip.duration)}s)\n${clipUrl}`

        const tempId = 'temp_' + Date.now()
        const optimisticMsg: ChatMessage = {
            _id: tempId,
            sender: currentUserId,
            receiver: activeContact._id,
            message: clipMessage,
            createdAt: new Date().toISOString(),
            isDelivered: false,
            isSeen: false,
            reactions: []
        }
        setMessages(prev => [...prev, optimisticMsg])

        setRecentChats(prev => {
            const activeId = String(activeContact._id)
            const existingIdx = prev.findIndex(c => String(c.conversationWith) === activeId)
            const updatedItem: RecentChat = {
                conversationWith: activeId,
                latestMessage: optimisticMsg,
                user: activeContact
            }
            if (existingIdx >= 0) {
                const next = [...prev]
                next.splice(existingIdx, 1)
                return [updatedItem, ...next]
            }
            return [updatedItem, ...prev]
        })

        try {
            const res = await fetch(`${API_BASE}/api/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiverId: activeContact._id,
                    message: clipMessage
                })
            })
            if (res.ok) {
                const json = await res.json()
                const saved = json.data || json
                setMessages(prev => prev.map(m => m._id === tempId ? saved : m))
                loadRecentChats()
            }
        } catch (err) {
            console.error('Failed to send clip:', err)
        }
    }

    // Instant Video Call
    const handleStartInstantCall = () => {
        if (!activeContact) return
        if (onStartCall) {
            onStartCall(activeContact._id, activeContact.fullName, 'video', activeContact.profileImage)
        } else if (onStartMeeting) {
            const meetingRoomId = `dm_${currentUserId.slice(-4)}_${activeContact._id.slice(-4)}_${Math.random().toString(36).substring(2, 6)}`
            onStartMeeting(meetingRoomId)
        } else {
            const meetingRoomId = `dm_${currentUserId.slice(-4)}_${activeContact._id.slice(-4)}_${Math.random().toString(36).substring(2, 6)}`
            window.location.hash = `#meeting?room=${meetingRoomId}`
        }
    }

    // Voice Call
    const handleStartVoiceCall = () => {
        if (!activeContact) return
        if (onStartCall) {
            onStartCall(activeContact._id, activeContact.fullName, 'audio', activeContact.profileImage)
        } else if (onStartMeeting) {
            const meetingRoomId = `dm_audio_${currentUserId.slice(-4)}_${activeContact._id.slice(-4)}_${Math.random().toString(36).substring(2, 6)}`
            onStartMeeting(meetingRoomId)
        } else {
            const meetingRoomId = `dm_audio_${currentUserId.slice(-4)}_${activeContact._id.slice(-4)}_${Math.random().toString(36).substring(2, 6)}`
            window.location.hash = `#meeting?room=${meetingRoomId}&type=audio`
        }
    }

    // Screen Share Call
    const handleStartScreenShareCall = async () => {
        if (!activeContact) return
        try {
            const screenStream = await getScreenShareStream()
            if (onStartCall) {
                onStartCall(activeContact._id, activeContact.fullName, 'screenshare', activeContact.profileImage, screenStream)
            } else if (onStartMeeting) {
                const meetingRoomId = `dm_share_${currentUserId.slice(-4)}_${activeContact._id.slice(-4)}_${Math.random().toString(36).substring(2, 6)}`
                onStartMeeting(meetingRoomId)
            }
        } catch (err) {
            console.log('[DirectMessagesHub] User cancelled screen picker or denied permission:', err)
        }
    }

    return {
        sendingMessage,
        isClearingChat,
        isUploadingFile,
        sendingThreadReply,
        handleSendMessage,
        handleToggleReaction,
        handleDeleteMessage,
        handleUndoDeleteMessage,
        handleClearChat,
        handleFileUpload,
        handleSendThreadReply,
        handleClipUploaded,
        handleStartInstantCall,
        handleStartVoiceCall,
        handleStartScreenShareCall
    }
}
