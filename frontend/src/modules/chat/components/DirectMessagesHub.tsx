import React, { useState, useEffect, useRef, useMemo } from 'react'
import io, { Socket } from 'socket.io-client'
import { API_BASE, SOCKET_URL, normalizeMediaUrl } from '../../../config'
import {
    IconMessage,
    IconSearch,
    IconSend,
    IconPhone,
    IconVideo,
    IconSparkles,
    IconCheck,
    IconClock,
    IconUser,
    IconUserPlus,
    IconPlus,
    IconX,
    IconPin,
    IconLock,
    IconFileText,
    IconDownload,
    IconMonitor,
    IconFolder,
    IconFlag,
    IconInfo
} from '../../../components/common/Icons'
import { UserPresenceBadge, PresenceStatus } from '../../../components/common/UserPresenceBadge'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { AsyncClipRecorderModal } from './AsyncClipRecorderModal'

export interface ChatContact {
    _id: string
    fullName: string
    email: string
    profileImage?: string
    status?: PresenceStatus | string
    customStatus?: string
    lastSeen?: Date | string
}

export interface ChatMessage {
    _id: string
    sender: string | { _id: string; fullName: string; profileImage?: string }
    receiver: string | { _id: string; fullName: string; profileImage?: string }
    message: string
    isDelivered?: boolean
    isSeen?: boolean
    reactions?: { userId: string; emoji: string; createdAt?: Date }[]
    createdAt: string
    parentMessageId?: string | null
    threadCount?: number
}

export interface RecentChat {
    conversationWith: string
    latestMessage: ChatMessage
    user?: ChatContact
}

export interface DirectMessagesHubProps {
    token: string
    currentUserId: string
    currentUserName?: string
    userPlan?: string
    onStartCall?: (targetUserId: string, targetName: string, callType?: 'video' | 'audio' | 'screenshare', targetAvatar?: string, screenStream?: MediaStream) => void
    onStartMeeting?: (roomId: string) => void
}

const POPULAR_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '🔥', '👏', '🙌', '👀', '💯', '🤔', '🙏']
const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😆', '😮', '😢', '👏']

export function DirectMessagesHub({
    token,
    currentUserId,
    currentUserName = 'You',
    userPlan = 'free',
    onStartCall,
    onStartMeeting
}: DirectMessagesHubProps) {
    const [recentChats, setRecentChats] = useState<RecentChat[]>([])
    const [contacts, setContacts] = useState<ChatContact[]>([])
    const [activeContact, setActiveContact] = useState<ChatContact | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [messageInput, setMessageInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [loadingChats, setLoadingChats] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sendingMessage, setSendingMessage] = useState(false)
    const [sidebarTab, setSidebarTab] = useState<'recent' | 'contacts'>('recent')
    const [presences, setPresences] = useState<Record<string, { status: PresenceStatus; customStatus?: string }>>({})

    // Teams Top Header Tab: 'chat' | 'files' | 'about'
    const [headerTab, setHeaderTab] = useState<'chat' | 'files' | 'about'>('chat')

    // Teams Formatting & Features
    const [isFormatBarOpen, setIsFormatBarOpen] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isUrgentMessage, setIsUrgentMessage] = useState(false)
    const [isUploadingFile, setIsUploadingFile] = useState(false)
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

    // New Chat Modal state
    const [showNewChatModal, setShowNewChatModal] = useState(false)
    const [newChatSearch, setNewChatSearch] = useState('')

    // In-chat Search
    const [showChatSearch, setShowChatSearch] = useState(false)
    const [chatSearchQuery, setChatSearchQuery] = useState('')

    // Pinned chats
    const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('jts_pinned_chats')
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    // Typing Indicators: map of userId -> boolean
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
    const typingTimeoutRef = useRef<any>(null)

    // Zoom Clips & Thread State
    const [showClipModal, setShowClipModal] = useState(false)
    const [activeThreadParent, setActiveThreadParent] = useState<ChatMessage | null>(null)
    const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([])
    const [threadInput, setThreadInput] = useState('')
    const [loadingThread, setLoadingThread] = useState(false)
    const [sendingThreadReply, setSendingThreadReply] = useState(false)

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const socketRef = useRef<Socket | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatFeedRef = useRef<HTMLDivElement>(null)
    const threadEndRef = useRef<HTMLDivElement>(null)
    const contactsRef = useRef<ChatContact[]>(contacts)
    contactsRef.current = contacts

    // Save pinned chats to localStorage
    const togglePinChat = (contactId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setPinnedIds(prev => {
            const next = prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
            try {
                localStorage.setItem('jts_pinned_chats', JSON.stringify(next))
            } catch {}
            return next
        })
    }

    // Setup Socket connection
    useEffect(() => {
        if (!token) return

        const socket = io(SOCKET_URL || 'http://localhost:4000', {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })
        socketRef.current = socket

        socket.on('connect', () => {
            // Connected
        })

        // Live Presence events
        socket.on('presence:sync', (allPresences: Record<string, any>) => {
            setPresences(prev => ({ ...prev, ...allPresences }))
        })

        socket.on('presence:update', (data: { userId: string; status: PresenceStatus; customStatus?: string }) => {
            setPresences(prev => ({
                ...prev,
                [data.userId]: { status: data.status, customStatus: data.customStatus }
            }))
        })

        // Real-time Chat message received
        socket.on('chat:receive', (msg: ChatMessage) => {
            const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender
            const receiverId = typeof msg.receiver === 'object' ? msg.receiver._id : msg.receiver
            const otherPartyId = senderId === currentUserId ? receiverId : senderId

            setActiveContact(currentActive => {
                if (currentActive && (currentActive._id === senderId || currentActive._id === receiverId)) {
                    setMessages(prev => {
                        if (prev.some(m => m._id === msg._id)) return prev
                        return [...prev, msg]
                    })

                    // Stop typing status if sender was active contact
                    setTypingUsers(prev => {
                        const next = { ...prev }
                        delete next[senderId]
                        return next
                    })

                    // If received from active contact, mark seen immediately
                    if (senderId === currentActive._id) {
                        fetch(`${API_BASE}/api/chat/seen`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ senderId: currentActive._id })
                        }).catch(() => {})
                    }
                }
                return currentActive
            })

            // Update Recent Chats optimistically
            setRecentChats(prev => {
                const otherIdStr = String(otherPartyId)
                const existingIdx = prev.findIndex(c => String(c.conversationWith) === otherIdStr)
                const senderObj = typeof msg.sender === 'object' ? msg.sender : undefined
                const contactObj = contactsRef.current.find(c => String(c._id) === otherIdStr) || (senderObj ? {
                    _id: senderObj._id,
                    fullName: senderObj.fullName,
                    email: '',
                    profileImage: senderObj.profileImage
                } : undefined)

                const updatedItem: RecentChat = {
                    conversationWith: otherPartyId,
                    latestMessage: msg,
                    user: contactObj
                }

                if (existingIdx >= 0) {
                    const next = [...prev]
                    next.splice(existingIdx, 1)
                    return [updatedItem, ...next]
                }
                return [updatedItem, ...prev]
            })

            // Refresh recent chats list from backend
            loadRecentChats()
        })

        // Read receipt update
        socket.on('chat:seen', (data: { senderId: string; receiverId: string }) => {
            setMessages(prev => prev.map(m => {
                const sId = typeof m.sender === 'object' ? m.sender._id : m.sender
                if (sId === data.senderId) {
                    return { ...m, isSeen: true, isDelivered: true }
                }
                return m
            }))
        })

        // Reaction added / removed
        socket.on('chat:reaction', (data: { senderId: string; messageId: string; emoji: string }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    const currentReactions = m.reactions || []
                    const existingIdx = currentReactions.findIndex(r => r.userId === data.senderId && r.emoji === data.emoji)
                    let updated
                    if (existingIdx >= 0) {
                        updated = currentReactions.filter((_, idx) => idx !== existingIdx)
                    } else {
                        updated = [...currentReactions, { userId: data.senderId, emoji: data.emoji, createdAt: new Date() }]
                    }
                    return { ...m, reactions: updated }
                }
                return m
            }))
        })

        socket.on('reaction:add', (data: { messageId: string; userId: string; emoji: string }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    const current = m.reactions || []
                    if (!current.some(r => r.userId === data.userId && r.emoji === data.emoji)) {
                        return { ...m, reactions: [...current, { userId: data.userId, emoji: data.emoji, createdAt: new Date() }] }
                    }
                }
                return m
            }))
        })

        socket.on('reaction:remove', (data: { messageId: string; userId: string; emoji: string }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    const current = m.reactions || []
                    return { ...m, reactions: current.filter(r => !(r.userId === data.userId && r.emoji === data.emoji)) }
                }
                return m
            }))
        })

        // Typing indicator events
        socket.on('typing:start', (data: { senderId: string }) => {
            setTypingUsers(prev => ({ ...prev, [data.senderId]: true }))
        })

        socket.on('typing:stop', (data: { senderId: string }) => {
            setTypingUsers(prev => {
                const next = { ...prev }
                delete next[data.senderId]
                return next
            })
        })

        // Dedicated Thread Reply socket events
        socket.on('thread:created', (reply: ChatMessage) => {
            setActiveThreadParent(parent => {
                if (parent && reply.parentMessageId === parent._id) {
                    setThreadReplies(prev => {
                        if (prev.some(r => r._id === reply._id)) return prev
                        return [...prev, reply]
                    })
                }
                return parent
            })
            setMessages(prev => prev.map(m => {
                if (m._id === reply.parentMessageId) {
                    return { ...m, threadCount: (m.threadCount || 0) + 1 }
                }
                return m
            }))
        })

        return () => {
            socket.off()
            socket.disconnect()
        }
    }, [token])

    // Load recent chats with guaranteed unique conversationWith keys
    const loadRecentChats = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/recent`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                const chatsList = Array.isArray(json.data?.chats)
                    ? json.data.chats
                    : Array.isArray(json.data)
                        ? json.data
                        : Array.isArray(json)
                            ? json
                            : []
                const uniqueMap = new Map<string, RecentChat>()
                for (const item of chatsList) {
                    if (!item) continue
                    const id = String(item.conversationWith || item.user?._id || '')
                    if (id && !uniqueMap.has(id)) {
                        uniqueMap.set(id, { ...item, conversationWith: id })
                    }
                }
                setRecentChats(Array.from(uniqueMap.values()))
            }
        } catch (err) {
            console.warn('[DM Hub] Failed to load recent chats:', err)
        } finally {
            setLoadingChats(false)
        }
    }

    // Load contacts list with guaranteed unique _id keys
    const loadContacts = async (query = '') => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/contacts?search=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                const data = json.data?.contacts || json.data || json
                if (Array.isArray(data)) {
                    const uniqueMap = new Map<string, ChatContact>()
                    for (const c of data) {
                        if (c && c._id && !uniqueMap.has(String(c._id))) {
                            uniqueMap.set(String(c._id), { ...c, _id: String(c._id) })
                        }
                    }
                    setContacts(Array.from(uniqueMap.values()))
                }
            }
        } catch (err) {
            console.warn('[DM Hub] Failed to load contacts:', err)
        }
    }

    useEffect(() => {
        loadRecentChats()
        loadContacts()
    }, [token])

    // Filter contacts based on search query
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                loadContacts(searchQuery.trim())
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Load conversation when active contact changes
    useEffect(() => {
        if (!activeContact) {
            setMessages([])
            setHeaderTab('chat')
            return
        }

        let isMounted = true
        setLoadingMessages(true)

        fetch(`${API_BASE}/api/chat/conversation?userId=${activeContact._id}&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                if (!isMounted) return
                const data = json.data?.messages || json.data || json
                if (Array.isArray(data)) {
                    const rev = [...data].reverse()
                    const uniqueMap = new Map<string, ChatMessage>()
                    for (const m of rev) {
                        if (m && m._id && !uniqueMap.has(m._id)) {
                            uniqueMap.set(m._id, m)
                        }
                    }
                    const uniqueMsgs = Array.from(uniqueMap.values())
                    setMessages(uniqueMsgs)
                    if (uniqueMsgs.length > 0) {
                        const lastMsg = uniqueMsgs[uniqueMsgs.length - 1]
                        setRecentChats(prev => {
                            const targetId = String(activeContact._id)
                            const exists = prev.some(c => String(c.conversationWith) === targetId)
                            if (exists) return prev
                            return [{
                                conversationWith: targetId,
                                latestMessage: lastMsg,
                                user: activeContact
                            }, ...prev]
                        })
                    }
                }
                // Mark messages as seen
                fetch(`${API_BASE}/api/chat/seen`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ senderId: activeContact._id })
                }).catch(() => {})
            })
            .catch(err => {
                console.warn('[DM Hub] Failed to fetch conversation:', err)
            })
            .finally(() => {
                if (isMounted) setLoadingMessages(false)
            })

        return () => {
            isMounted = false
        }
    }, [activeContact, token])

    // Scroll chat to bottom
    useEffect(() => {
        if (messagesEndRef.current && headerTab === 'chat') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, headerTab])

    // Typing debounce
    const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value)

        if (!activeContact || !socketRef.current) return
        socketRef.current.emit('typing:start', { receiverId: activeContact._id })

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('typing:stop', { receiverId: activeContact._id })
        }, 2000)
    }

    // Send Message
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!activeContact || !messageInput.trim() || sendingMessage) return

        let rawContent = messageInput.trim()
        if (isUrgentMessage) {
            rawContent = `[IMPORTANT] ${rawContent}`
        }

        setMessageInput('')
        setIsUrgentMessage(false)
        setShowEmojiPicker(false)
        setSendingMessage(true)

        // Stop typing immediately
        if (socketRef.current && activeContact) {
            socketRef.current.emit('typing:stop', { receiverId: activeContact._id })
        }

        // Optimistic message object
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

        // Immediately reflect in Recent Chats list
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
            // Persist via REST endpoint (backend automatically broadcasts to recipient socket)
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

    // Add / Toggle Reaction
    const handleToggleReaction = async (messageId: string, emoji: string) => {
        if (!activeContact) return

        // Optimistically update message reaction in local state
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

        // Emit via socket
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('chat:reaction', {
                receiverId: activeContact._id,
                messageId,
                emoji
            })
        }

        // Persist via REST
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

    // File Upload Handler (Attachment)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeContact) return

        setIsUploadingFile(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('contextType', 'chat')
        formData.append('contextId', activeContact._id)

        try {
            const res = await fetch(`${API_BASE}/api/file/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (res.ok) {
                const json = await res.json()
                const data = json.data || json
                const originalName = data.originalName || file.name
                const secureUrl = normalizeMediaUrl(data.secureUrl || `${API_BASE}/uploads/${data.fileName || file.name}`)
                const fileSizeFormatted = formatBytes(data.size || file.size)
                const fileMessage = `[File: ${originalName} | ${secureUrl} | ${fileSizeFormatted}]`

                // Send into chat
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
                       // Immediately reflect in Recent Chats list
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
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Insert formatting tag into composer textarea
    const insertFormatting = (syntax: string) => {
        if (!textareaRef.current) return
        const textarea = textareaRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selected = messageInput.substring(start, end)

        let replacement = ''
        if (syntax === 'bold') replacement = `**${selected || 'bold text'}**`
        else if (syntax === 'italic') replacement = `*${selected || 'italic text'}*`
        else if (syntax === 'code') replacement = `\`${selected || 'code'}\``
        else if (syntax === 'bullet') replacement = `\n• ${selected || 'list item'}`
        else if (syntax === 'quote') replacement = `\n> ${selected || 'quoted text'}`

        const updated = messageInput.substring(0, start) + replacement + messageInput.substring(end)
        setMessageInput(updated)
        textarea.focus()
    }

    // Scroll thread to bottom
    useEffect(() => {
        if (threadEndRef.current) {
            threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [threadReplies])

    // Load thread replies when activeThreadParent changes
    useEffect(() => {
        if (!activeThreadParent) {
            setThreadReplies([])
            return
        }

        let isMounted = true
        setLoadingThread(true)

        fetch(`${API_BASE}/api/chat/thread/${activeThreadParent._id}?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                if (!isMounted) return
                const data = json.data?.messages || json.data || json
                if (Array.isArray(data)) {
                    setThreadReplies(data)
                }
            })
            .catch(err => {
                console.error('[DM Hub] Failed to load thread replies:', err)
            })
            .finally(() => {
                if (isMounted) setLoadingThread(false)
            })

        return () => {
            isMounted = false
        }
    }, [activeThreadParent?._id, token])

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

        // Reflect in Recent Chats
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

    // 1-Click Instant Video Meeting (Direct Ringing Call like Microsoft Teams)
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

    // Voice Call (Direct Ringing Call like Microsoft Teams)
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

    // Screen Share Call (Direct Desktop Sharing like Microsoft Teams)
    const handleStartScreenShareCall = async () => {
        if (!activeContact) return
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' } as any,
                audio: true
            })
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

    // Format bytes helper
    function formatBytes(bytes: number, decimals = 1) {
        if (!+bytes) return '0 B'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    // Helper to format timestamps cleanly
    const formatTimestamp = (dateStr?: string | Date) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()
        if (isToday) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    // Helper for date separator comparison
    const formatDateSeparator = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)

        if (d.toDateString() === now.toDateString()) return 'Today'
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
        return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }

    // Helper to get resolved live presence for user
    const getResolvedPresence = (userId: string, defaultStatus?: string, defaultCustom?: string) => {
        if (presences[userId]) {
            return {
                status: presences[userId].status,
                customStatus: presences[userId].customStatus || ''
            }
        }
        return {
            status: (defaultStatus as PresenceStatus) || 'offline',
            customStatus: defaultCustom || ''
        }
    }

    // Parse files from messages for the "Files" tab
    const sharedFiles = useMemo(() => {
        const list: {
            id: string
            name: string
            url: string
            size: string
            senderName: string
            isMe: boolean
            date: string
        }[] = []

        const fileRegex = /\[File:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/g
        messages.forEach(msg => {
            let match
            while ((match = fileRegex.exec(msg.message)) !== null) {
                const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender
                const isMe = senderId === currentUserId
                list.push({
                    id: msg._id + '_' + match[1],
                    name: match[1],
                    url: normalizeMediaUrl(match[2]),
                    size: match[3],
                    senderName: isMe ? 'You' : (activeContact?.fullName || 'Colleague'),
                    isMe,
                    date: msg.createdAt
                })
            }
        })
        return list
    }, [messages, currentUserId, activeContact])

    // Filter messages for inline search
    const filteredMessages = useMemo(() => {
        if (!chatSearchQuery.trim()) return messages
        const q = chatSearchQuery.toLowerCase()
        return messages.filter(m => m.message.toLowerCase().includes(q))
    }, [messages, chatSearchQuery])

    // Filter contacts for New Chat modal
    const filteredNewChatContacts = useMemo(() => {
        if (!newChatSearch.trim()) return contacts
        const q = newChatSearch.toLowerCase()
        return contacts.filter(c => c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    }, [contacts, newChatSearch])

    // Partition recent chats into pinned vs unpinned
    const pinnedChats = recentChats.filter(c => pinnedIds.includes(c.conversationWith))
    const regularChats = recentChats.filter(c => !pinnedIds.includes(c.conversationWith))

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', background: '#0a0b10', overflow: 'hidden', fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)' }}>
            {/* LEFT SIDEBAR: MS Teams Style */}
            <div style={{
                width: 320,
                minWidth: 280,
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 17, 23, 0.96)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
            }}>
                {/* Header & New Chat Button */}
                <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #6264a7, #464775)', // MS Teams signature purple
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                boxShadow: '0 2px 8px rgba(98, 100, 167, 0.4)'
                            }}>
                                <IconMessage size={15} />
                            </div>
                            <div>
                                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                                    Chat
                                </span>
                            </div>
                        </div>

                        {/* Teams "+ New Chat" Button (Opens Dedicated User Picker Modal) */}
                        <button
                            type="button"
                            onClick={() => {
                                setNewChatSearch('')
                                setShowNewChatModal(true)
                            }}
                            title="Start new chat"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 11px',
                                borderRadius: 6,
                                background: '#6264a7',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 8px rgba(98, 100, 167, 0.35)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#7375b8' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#6264a7' }}
                        >
                            <IconPlus size={13} />
                            <span>New Chat</span>
                        </button>
                    </div>

                    {/* Switcher tabs (Recent vs Directory) */}
                    <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 2, marginBottom: 10 }}>
                        <button
                            type="button"
                            onClick={() => setSidebarTab('recent')}
                            style={{
                                flex: 1,
                                border: 'none',
                                padding: '5px 0',
                                borderRadius: 6,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: sidebarTab === 'recent' ? '#6264a7' : 'transparent',
                                color: sidebarTab === 'recent' ? '#fff' : 'var(--color-text-muted)',
                                transition: 'all 0.15s'
                            }}
                        >
                            Recent Chats {recentChats.length > 0 && `(${recentChats.length})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSidebarTab('contacts')}
                            style={{
                                flex: 1,
                                border: 'none',
                                padding: '5px 0',
                                borderRadius: 6,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: sidebarTab === 'contacts' ? '#6264a7' : 'transparent',
                                color: sidebarTab === 'contacts' ? '#fff' : 'var(--color-text-muted)',
                                transition: 'all 0.15s'
                            }}
                        >
                            Directory {contacts.length > 0 && `(${contacts.length})`}
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative' }}>
                        <IconSearch size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by name or message..."
                            className="input"
                            style={{
                                width: '100%',
                                paddingLeft: 30,
                                paddingRight: 24,
                                height: 32,
                                fontSize: '0.78125rem',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 8,
                                color: '#fff'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                            >
                                <IconX size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sidebar List Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
                    {sidebarTab === 'recent' ? (
                        recentChats.length === 0 ? (
                            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78125rem' }}>
                                <IconMessage size={32} color="#6264a7" style={{ marginBottom: 8, opacity: 0.6 }} />
                                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>No recent chats yet</div>
                                <div style={{ fontSize: '0.71875rem', marginTop: 4 }}>Select a colleague to start chatting</div>
                                <button
                                    type="button"
                                    onClick={() => setShowNewChatModal(true)}
                                    style={{ marginTop: 12, background: '#6264a7', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', padding: '6px 14px', borderRadius: 6 }}
                                >
                                    Start New Chat &rarr;
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* PINNED SECTION (If any pinned) */}
                                {pinnedChats.length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{
                                            padding: '4px 10px',
                                            fontSize: '0.65625rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.05em',
                                            color: '#94a3b8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}>
                                            <IconPin size={11} color="#6264a7" />
                                            <span>PINNED</span>
                                        </div>
                                        {pinnedChats.map((chat, idx) => renderChatItem(chat, true, idx))}
                                    </div>
                                )}

                                {/* RECENT SECTION */}
                                <div>
                                    {pinnedChats.length > 0 && (
                                        <div style={{
                                            padding: '4px 10px',
                                            fontSize: '0.65625rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.05em',
                                            color: '#94a3b8',
                                            marginBottom: 2
                                        }}>
                                            RECENT
                                        </div>
                                    )}
                                    {regularChats.map((chat, idx) => renderChatItem(chat, false, idx))}
                                </div>
                            </>
                        )
                    ) : (
                        /* Directory List */
                        contacts.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78125rem' }}>
                                No colleagues found.
                            </div>
                        ) : (
                            contacts.map((c, idx) => {
                                const isSelected = activeContact?._id === c._id
                                const presence = getResolvedPresence(c._id, c.status, c.customStatus)
                                return (
                                    <div
                                        key={`dir_user_${c._id}_${idx}`}
                                        onClick={() => {
                                            setActiveContact(c)
                                            setSidebarTab('recent')
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            marginBottom: 2,
                                            background: isSelected ? 'rgba(98, 100, 167, 0.2)' : 'transparent',
                                            border: isSelected ? '1px solid rgba(98, 100, 167, 0.4)' : '1px solid transparent',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent'
                                        }}
                                    >
                                        <UserAvatar
                                            src={c.profileImage}
                                            name={c.fullName}
                                            size={34}
                                            presence={presence.status}
                                            customPresenceStatus={presence.customStatus}
                                        />

                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.fullName}
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {presence.customStatus || c.email}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )
                    )}
                </div>
            </div>

            {/* MAIN STAGE: MS TEAMS CONVERSATION / FILES / ABOUT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0b10', minWidth: 0 }}>
                {activeContact ? (
                    <>
                        {/* MS TEAMS TOP HEADER */}
                        <div style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(18, 20, 29, 0.95)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            flexDirection: 'column',
                            flexShrink: 0
                        }}>
                            {/* Upper Header Row: Contact Info & Action Buttons */}
                            <div style={{
                                padding: '10px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    <UserAvatar
                                        src={activeContact.profileImage}
                                        name={activeContact.fullName}
                                        size={38}
                                        presence={getResolvedPresence(activeContact._id, activeContact.status).status}
                                        customPresenceStatus={getResolvedPresence(activeContact._id, activeContact.status).customStatus}
                                    />

                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {activeContact.fullName}
                                            </h3>
                                            <UserPresenceBadge status={getResolvedPresence(activeContact._id, activeContact.status).status} size="xs" showLabel />
                                        </div>
                                        {getResolvedPresence(activeContact._id, activeContact.status, activeContact.customStatus).customStatus && (
                                            <div style={{ fontSize: '0.71875rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                                "{getResolvedPresence(activeContact._id, activeContact.status, activeContact.customStatus).customStatus}"
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Teams Action Toolbar (Audio, Video, Screen Share, Search, Add) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    {/* Audio Call */}
                                    <button
                                        type="button"
                                        onClick={handleStartVoiceCall}
                                        title="Audio call"
                                        style={teamsHeaderActionBtnStyle}
                                    >
                                        <IconPhone size={16} />
                                    </button>

                                    {/* Video / Meet Now Icon Button (Fixed: Clean Icon matching Teams toolbar) */}
                                    <button
                                        type="button"
                                        onClick={handleStartInstantCall}
                                        title="Meet Now (Instant video call)"
                                        style={{
                                            ...teamsHeaderActionBtnStyle,
                                            background: '#6264a7',
                                            color: '#fff'
                                        }}
                                    >
                                        <IconVideo size={16} />
                                    </button>

                                    {/* Screen Share Call */}
                                    <button
                                        type="button"
                                        onClick={handleStartScreenShareCall}
                                        title="Screen share"
                                        style={teamsHeaderActionBtnStyle}
                                    >
                                        <IconMonitor size={16} />
                                    </button>

                                    <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

                                    {/* Inline Chat Search */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowChatSearch(!showChatSearch)
                                            if (showChatSearch) setChatSearchQuery('')
                                        }}
                                        title="Search in this chat"
                                        style={{
                                            ...teamsHeaderActionBtnStyle,
                                            background: showChatSearch ? 'rgba(98, 100, 167, 0.3)' : 'transparent',
                                            color: showChatSearch ? '#c7c9ff' : 'var(--color-text-secondary)'
                                        }}
                                    >
                                        <IconSearch size={16} />
                                    </button>

                                    {/* Add People indicator */}
                                    <button
                                        type="button"
                                        onClick={() => setShowNewChatModal(true)}
                                        title="Add people to create group"
                                        style={teamsHeaderActionBtnStyle}
                                    >
                                        <IconUserPlus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Lower Header Row: MS Teams Tabs [Chat] [Files] [About] */}
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24 }}>
                                <button
                                    type="button"
                                    onClick={() => setHeaderTab('chat')}
                                    style={getTeamsTabStyle(headerTab === 'chat')}
                                >
                                    Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHeaderTab('files')}
                                    style={getTeamsTabStyle(headerTab === 'files')}
                                >
                                    Files {sharedFiles.length > 0 && `(${sharedFiles.length})`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHeaderTab('about')}
                                    style={getTeamsTabStyle(headerTab === 'about')}
                                >
                                    About
                                </button>
                            </div>

                            {/* In-Chat Search Bar Drawer */}
                            {showChatSearch && (
                                <div style={{
                                    padding: '8px 20px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10
                                }}>
                                    <IconSearch size={14} color="#94a3b8" />
                                    <input
                                        type="text"
                                        autoFocus
                                        value={chatSearchQuery}
                                        onChange={e => setChatSearchQuery(e.target.value)}
                                        placeholder="Find in conversation..."
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '0.8125rem',
                                            outline: 'none'
                                        }}
                                    />
                                    {chatSearchQuery && (
                                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                                            {filteredMessages.length} match{filteredMessages.length !== 1 ? 'es' : ''}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setChatSearchQuery('')
                                            setShowChatSearch(false)
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                    >
                                        <IconX size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* TAB VIEW 1: CHAT FEED + COMPOSER */}
                        {headerTab === 'chat' && (
                            <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
                                {/* Feed & Composer Column */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                    {/* Messages Feed */}
                                    <div
                                        ref={chatFeedRef}
                                        style={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            padding: '16px 20px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8
                                        }}
                                    >
                                        {loadingMessages ? (
                                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                                                <IconClock size={20} style={{ animation: 'spin 1.5s linear infinite', marginBottom: 6 }} />
                                                <div>Loading conversation...</div>
                                            </div>
                                        ) : filteredMessages.length === 0 ? (
                                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: 360 }}>
                                                <div style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: '50%',
                                                    background: 'rgba(98, 100, 167, 0.15)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto 12px auto',
                                                    color: '#a6a8f8'
                                                }}>
                                                    <IconSparkles size={24} />
                                                </div>
                                                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                                                    Conversation with {activeContact.fullName}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5 }}>
                                                    Send messages, share files, react with emojis, or click the video icon to start an instant meeting.
                                                </p>
                                            </div>
                                        ) : (
                                            filteredMessages.map((msg, idx) => {
                                                const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender
                                                const isMe = senderId === currentUserId
                                                const senderName = isMe ? 'You' : activeContact.fullName
                                                const senderPhoto = isMe ? undefined : activeContact.profileImage

                                                // Date separator check
                                                const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null
                                                const showDateSeparator = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()

                                                return (
                                                    <React.Fragment key={msg._id ? `feed_msg_${msg._id}_${idx}` : `feed_temp_${idx}`}>
                                                        {showDateSeparator && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                margin: '16px 0 10px',
                                                                gap: 12
                                                            }}>
                                                                <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                                                <span style={{
                                                                    fontSize: '0.6875rem',
                                                                    fontWeight: 700,
                                                                    color: '#94a3b8',
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    padding: '2px 10px',
                                                                    borderRadius: 12
                                                                }}>
                                                                    {formatDateSeparator(msg.createdAt)}
                                                                </span>
                                                                <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                                            </div>
                                                        )}

                                                        {renderTeamsMessageRow(msg, isMe, senderName, senderPhoto)}
                                                    </React.Fragment>
                                                )
                                            })
                                        )}

                                        {/* Typing Indicator in Feed */}
                                        {typingUsers[activeContact._id] && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', color: '#a6a8f8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <span style={{ width: 5, height: 5, background: '#a6a8f8', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                                    <span style={{ width: 5, height: 5, background: '#a6a8f8', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                                                    <span style={{ width: 5, height: 5, background: '#a6a8f8', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                                                </div>
                                                <span>{activeContact.fullName} is typing...</span>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* MS TEAMS RICH FORMATTING COMPOSER */}
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
                                                    onClick={() => insertFormatting('bold')}
                                                    title="Bold (**text**)"
                                                    style={formattingBtnStyle}
                                                >
                                                    <strong>B</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertFormatting('italic')}
                                                    title="Italic (*text*)"
                                                    style={formattingBtnStyle}
                                                >
                                                    <em>I</em>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertFormatting('code')}
                                                    title="Code (`code`)"
                                                    style={formattingBtnStyle}
                                                >
                                                    &lt;/&gt;
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertFormatting('bullet')}
                                                    title="Bulleted list"
                                                    style={formattingBtnStyle}
                                                >
                                                    • List
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertFormatting('quote')}
                                                    title="Quote"
                                                    style={formattingBtnStyle}
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

                                        {/* Main Input Textarea */}
                                        <div style={{ position: 'relative' }}>
                                            <textarea
                                                ref={textareaRef}
                                                value={messageInput}
                                                onChange={handleMessageInputChange}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault()
                                                        handleSendMessage()
                                                    }
                                                }}
                                                placeholder={`Type a message to ${activeContact.fullName} (Enter to send, Shift+Enter for new line)...`}
                                                rows={isFormatBarOpen ? 3 : 1}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    fontSize: '0.8125rem',
                                                    lineHeight: 1.4,
                                                    borderRadius: 8,
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: isUrgentMessage ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                                                    color: '#fff',
                                                    resize: 'none',
                                                    outline: 'none',
                                                    fontFamily: 'inherit',
                                                    boxSizing: 'border-box'
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
                                                    onClick={() => fileInputRef.current?.click()}
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
                                                                    onClick={() => {
                                                                        setMessageInput(prev => prev + emoji)
                                                                        setShowEmojiPicker(false)
                                                                        textareaRef.current?.focus()
                                                                    }}
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
                                                    onClick={() => setShowClipModal(true)}
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
                                                onClick={() => handleSendMessage()}
                                                disabled={!messageInput.trim() || sendingMessage}
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
                                                    background: messageInput.trim() ? '#6264a7' : 'rgba(255, 255, 255, 0.08)',
                                                    color: messageInput.trim() ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                                                    cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.15s ease',
                                                    boxShadow: messageInput.trim() ? '0 2px 8px rgba(98, 100, 167, 0.4)' : 'none'
                                                }}
                                            >
                                                <IconSend size={13} />
                                                <span>Send</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* DEDICATED THREAD SLIDE-IN PANEL (Feature 2) */}
                                {activeThreadParent && (
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
                                                onClick={() => setActiveThreadParent(null)}
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
                                                {activeThreadParent.message}
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
                                                            <div style={{
                                                                padding: '8px 12px',
                                                                borderRadius: isMyReply ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                                                                background: isMyReply ? '#6264a7' : 'rgba(255, 255, 255, 0.06)',
                                                                border: isMyReply ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                                                                color: '#fff',
                                                                fontSize: '0.75rem',
                                                                maxWidth: '85%',
                                                                wordBreak: 'break-word'
                                                            }}>
                                                                {reply.message}
                                                                <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 3 }}>
                                                                    {formatTimestamp(reply.createdAt)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                            <div ref={threadEndRef} />
                                        </div>

                                        {/* Thread Composer */}
                                        <form onSubmit={handleSendThreadReply} style={{
                                            padding: '10px 14px',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                            background: 'rgba(15, 17, 23, 0.95)',
                                            display: 'flex',
                                            gap: 8
                                        }}>
                                            <input
                                                type="text"
                                                value={threadInput}
                                                onChange={e => setThreadInput(e.target.value)}
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
                                )}
                            </div>
                        )}

                        {/* TAB VIEW 2: SHARED FILES REPOSITORY (MS TEAMS STYLE) */}
                        {headerTab === 'files' && (
                            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>
                                            Shared Files
                                        </h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.78125rem', color: 'var(--color-text-muted)' }}>
                                            All documents, presentations, and files shared in this chat
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingFile}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 16px',
                                            borderRadius: 6,
                                            background: '#6264a7',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '0.78125rem',
                                            fontWeight: 700,
                                            cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                                            opacity: isUploadingFile ? 0.7 : 1
                                        }}
                                    >
                                        {isUploadingFile ? <IconClock size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <IconPlus size={14} />}
                                        <span>{isUploadingFile ? 'Uploading File...' : 'Share a File'}</span>
                                    </button>
                                </div>

                                {sharedFiles.length === 0 ? (
                                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        <IconFolder size={40} color="#6264a7" style={{ marginBottom: 12, opacity: 0.7 }} />
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>No files shared yet</div>
                                        <p style={{ fontSize: '0.78125rem', maxWidth: 360, margin: '6px auto 16px' }}>
                                            Files and documents sent in this conversation will be catalogued here for fast reference.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingFile}
                                            style={{
                                                padding: '7px 16px',
                                                borderRadius: 6,
                                                background: 'rgba(98, 100, 167, 0.25)',
                                                border: '1px solid rgba(98, 100, 167, 0.5)',
                                                color: '#c7c9ff',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                opacity: isUploadingFile ? 0.7 : 1
                                            }}
                                        >
                                            {isUploadingFile && <IconClock size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                                            <span>{isUploadingFile ? 'Uploading File...' : 'Upload your first file'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: 10,
                                        overflow: 'hidden'
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78125rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.02)' }}>
                                                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Name</th>
                                                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Shared By</th>
                                                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date</th>
                                                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Size</th>
                                                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sharedFiles.map(file => (
                                                    <tr key={file.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                        <td style={{ padding: '12px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 30,
                                                                height: 30,
                                                                borderRadius: 6,
                                                                background: 'rgba(98, 100, 167, 0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#a6a8f8'
                                                            }}>
                                                                <IconFileText size={16} />
                                                            </div>
                                                            <span style={{ fontWeight: 600 }}>{file.name}</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{file.senderName}</td>
                                                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{formatTimestamp(file.date)}</td>
                                                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{file.size}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                            <a
                                                                href={file.url}
                                                                download
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    padding: '4px 10px',
                                                                    borderRadius: 6,
                                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                                    color: '#fff',
                                                                    textDecoration: 'none',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.71875rem'
                                                                }}
                                                            >
                                                                <IconDownload size={12} />
                                                                <span>Download</span>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB VIEW 3: ABOUT / PROFILE CARD */}
                        {headerTab === 'about' && (
                            <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
                                <div style={{
                                    maxWidth: 520,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 14,
                                    padding: 24
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                        <UserAvatar
                                            src={activeContact.profileImage}
                                            name={activeContact.fullName}
                                            size={64}
                                            fontSize="1.5rem"
                                            presence={getResolvedPresence(activeContact._id, activeContact.status).status}
                                            customPresenceStatus={getResolvedPresence(activeContact._id, activeContact.status).customStatus}
                                        />
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                                                {activeContact.fullName}
                                            </h3>
                                            <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                                {activeContact.email}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                                <UserPresenceBadge status={getResolvedPresence(activeContact._id, activeContact.status).status} size="xs" showLabel />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                        <button
                                            type="button"
                                            onClick={() => setHeaderTab('chat')}
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                background: '#6264a7',
                                                border: 'none',
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.78125rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <IconMessage size={14} />
                                            <span>Send Message</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleStartInstantCall}
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: 'none',
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.78125rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <IconVideo size={14} />
                                            <span>Start Video Call</span>
                                        </button>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                            Colleague Information
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: '0.8125rem' }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Status Message:</span>
                                            <span style={{ color: '#fff' }}>{getResolvedPresence(activeContact._id, activeContact.status, activeContact.customStatus).customStatus || 'Available'}</span>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Organization:</span>
                                            <span style={{ color: '#fff' }}>JTS Enterprise Workspace</span>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Communication:</span>
                                            <span style={{ color: '#fff' }}>Direct Messages & Audio/Video Meeting</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty State: No active conversation selected */
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: 400, padding: 24 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(98, 100, 167, 0.15)',
                            border: '1px solid rgba(98, 100, 167, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            color: '#a6a8f8'
                        }}>
                            <IconMessage size={30} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
                            Microsoft Teams Chat
                        </h3>
                        <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                            Select an existing chat from the left or click below to start a new chat with any team member.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowNewChatModal(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 18px',
                                borderRadius: 8,
                                background: '#6264a7',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(98, 100, 167, 0.4)'
                            }}
                        >
                            <IconPlus size={14} />
                            <span>Start New Chat</span>
                        </button>
                    </div>
                )}
            </div>

            {/* POPUP MODAL: NEW CHAT / USER PICKER (MS TEAMS STYLE) */}
            {showNewChatModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: 460,
                        background: '#161922',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '14px 18px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 6,
                                    background: '#6264a7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    <IconMessage size={14} />
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#fff' }}>New Chat</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNewChatModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                            >
                                <IconX size={16} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ position: 'relative' }}>
                                <IconSearch size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
                                <input
                                    type="text"
                                    autoFocus
                                    value={newChatSearch}
                                    onChange={e => setNewChatSearch(e.target.value)}
                                    placeholder="Type a colleague's name or email..."
                                    style={{
                                        width: '100%',
                                        paddingLeft: 34,
                                        paddingRight: 12,
                                        height: 36,
                                        borderRadius: 8,
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#fff',
                                        fontSize: '0.8125rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Colleagues List */}
                        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 12px' }}>
                            {filteredNewChatContacts.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                    No colleagues found matching "{newChatSearch}"
                                </div>
                            ) : (
                                filteredNewChatContacts.map((c, idx) => {
                                    const presence = getResolvedPresence(c._id, c.status, c.customStatus)
                                    return (
                                        <div
                                            key={`modal_user_${c._id}_${idx}`}
                                            onClick={() => {
                                                setActiveContact(c)
                                                setShowNewChatModal(false)
                                                setSidebarTab('recent')
                                                setTimeout(() => textareaRef.current?.focus(), 100)
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                marginBottom: 2,
                                                transition: 'background 0.15s ease'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(98, 100, 167, 0.2)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                        >
                                            <UserAvatar
                                                src={c.profileImage}
                                                name={c.fullName}
                                                size={36}
                                                presence={presence.status}
                                                customPresenceStatus={presence.customStatus}
                                            />

                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                                    {c.fullName}
                                                </div>
                                                <div style={{ fontSize: '0.71875rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {presence.customStatus || c.email}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    border: 'none',
                                                    color: '#c7c9ff',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Chat
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Global hidden File Input: Always mounted so both Chat composer and Files tab can upload */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            {/* Zoom Clips Async Video Recorder Modal */}
            <AsyncClipRecorderModal
                isOpen={showClipModal}
                onClose={() => setShowClipModal(false)}
                token={token}
                userPlan={userPlan}
                recipientId={activeContact?._id}
                onClipUploaded={handleClipUploaded}
            />
        </div>
    )

    // Render helper for recent/pinned chat item in left sidebar
    function renderChatItem(chat: RecentChat, isPinned: boolean, idx: number = 0) {
        const contact = chat.user || {
            _id: chat.conversationWith,
            fullName: 'Colleague',
            email: ''
        }
        const isSelected = activeContact?._id === contact._id
        const presence = getResolvedPresence(contact._id, contact.status, contact.customStatus)
        const isLastSentByMe = typeof chat.latestMessage.sender === 'object'
            ? chat.latestMessage.sender._id === currentUserId
            : chat.latestMessage.sender === currentUserId

        return (
            <div
                key={`chat_row_${String(chat.conversationWith)}_${isPinned ? 'pinned' : 'reg'}_${idx}`}
                onClick={() => setActiveContact(contact)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 2,
                    background: isSelected ? 'rgba(98, 100, 167, 0.25)' : 'transparent',
                    border: isSelected ? '1px solid rgba(98, 100, 167, 0.45)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                }}
                className="teams-sidebar-chat-row"
                onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                    const pinBtn = e.currentTarget.querySelector('.pin-action-btn') as HTMLElement
                    if (pinBtn) pinBtn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                    const pinBtn = e.currentTarget.querySelector('.pin-action-btn') as HTMLElement
                    if (pinBtn) pinBtn.style.opacity = isPinned ? '1' : '0'
                }}
            >
                {/* Avatar with Presence Badge */}
                <UserAvatar
                    src={contact.profileImage}
                    name={contact.fullName}
                    size={36}
                    presence={presence.status}
                    customPresenceStatus={presence.customStatus}
                />

                {/* Name & Snippet */}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {contact.fullName}
                        </span>
                        <span style={{ fontSize: '0.65625rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                            {formatTimestamp(chat.latestMessage.createdAt)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{
                            fontSize: '0.71875rem',
                            color: isSelected ? '#c7c9ff' : 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 160
                        }}>
                            {isLastSentByMe ? 'You: ' : ''}{chat.latestMessage.message.replace(/\[File:\s*(.*?)\s*\|.*?\]/, '📎 $1')}
                        </span>
                        {isLastSentByMe && (
                            <span style={{ color: chat.latestMessage.isSeen ? '#38bdf8' : '#94a3b8', fontSize: '0.625rem', marginLeft: 4 }}>
                                {chat.latestMessage.isSeen ? '✓✓' : '✓'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Pin/Unpin action button on hover */}
                <button
                    type="button"
                    className="pin-action-btn"
                    onClick={(e) => togglePinChat(contact._id, e)}
                    title={isPinned ? 'Unpin chat' : 'Pin chat'}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: isPinned ? '#6264a7' : '#94a3b8',
                        cursor: 'pointer',
                        padding: 2,
                        opacity: isPinned ? 1 : 0,
                        transition: 'opacity 0.15s ease'
                    }}
                >
                    <IconPin size={13} />
                </button>
            </div>
        )
    }

    // Render individual message in Teams format with hover reactions bar
    function renderTeamsMessageRow(msg: ChatMessage, isMe: boolean, senderName: string, senderPhoto?: string) {
        const isHovered = hoveredMessageId === msg._id
        const isClip = msg.message.includes('/uploads/clips/') || msg.message.startsWith('[Video Clip]')
        const isFile = msg.message.includes('[File:')
        const isUrgent = msg.message.startsWith('[IMPORTANT]')

        // Extract reactions grouping: emoji -> count and array of userIds
        const reactionGroups: Record<string, { count: number; hasReacted: boolean }> = {}
        if (msg.reactions && msg.reactions.length > 0) {
            msg.reactions.forEach(r => {
                if (!reactionGroups[r.emoji]) {
                    reactionGroups[r.emoji] = { count: 0, hasReacted: false }
                }
                reactionGroups[r.emoji].count += 1
                if (r.userId === currentUserId) {
                    reactionGroups[r.emoji].hasReacted = true
                }
            })
        }

        return (
            <div
                key={msg._id}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    position: 'relative',
                    padding: '2px 0'
                }}
            >
                {/* Floating Teams Reaction & Action Bar on Hover */}
                {isHovered && (
                    <div style={{
                        position: 'absolute',
                        top: -14,
                        [isMe ? 'right' : 'left']: isMe ? 0 : 38,
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: '#1e2130',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 20,
                        padding: '2px 6px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                        animation: 'fadeIn 0.15s ease'
                    }}>
                        {/* Quick Reaction Emojis (Thumbs up, Heart, Laugh, Wow, Sad, Clap) */}
                        {QUICK_REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg._id, emoji)}
                                title={`React with ${emoji}`}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: 4,
                                    lineHeight: 1
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)' }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                            >
                                {emoji}
                            </button>
                        ))}

                        <div style={{ width: 1, height: 14, background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

                        {/* Reply in thread */}
                        <button
                            type="button"
                            onClick={() => setActiveThreadParent(msg)}
                            title="Reply in thread"
                            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px 4px', display: 'flex' }}
                        >
                            <IconMessage size={13} />
                        </button>

                        {/* Copy text */}
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(msg.message)
                            }}
                            title="Copy message"
                            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px 4px', display: 'flex' }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Message Header (Sender name + timestamp) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 3,
                    fontSize: '0.6875rem',
                    color: '#94a3b8',
                    padding: isMe ? '0 4px 0 0' : '0 0 0 4px'
                }}>
                    <span style={{ fontWeight: 700, color: isMe ? '#c7c9ff' : '#fff' }}>{senderName}</span>
                    <span>&bull;</span>
                    <span>{formatTimestamp(msg.createdAt)}</span>
                    {isUrgent && (
                        <span style={{
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em'
                        }}>
                            URGENT
                        </span>
                    )}
                </div>

                {/* Bubble Container */}
                <div
                    style={{
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isUrgent
                            ? 'rgba(239, 68, 68, 0.15)'
                            : isMe
                                ? '#6264a7' // MS Teams purple
                                : 'rgba(255, 255, 255, 0.05)',
                        border: isUrgent
                            ? '1px solid #ef4444'
                            : isMe
                                ? 'none'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 2px 8px rgba(98, 100, 167, 0.3)' : 'none',
                        position: 'relative'
                    }}
                >
                    {/* Content Rendering: File card, Video Clip, or Text */}
                    {isFile ? (
                        renderFileCard(msg.message)
                    ) : isClip ? (
                        <div style={{ marginTop: 2 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                marginBottom: 6, fontSize: '0.75rem', fontWeight: 700,
                                color: isMe ? '#e0e7ff' : '#c084fc'
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <polygon points="23 7 16 12 23 17 23 7" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                                <span>Zoom Clip &bull; Video Message</span>
                            </div>
                            <video
                                src={(() => {
                                    const match = msg.message.match(/(\/uploads\/clips\/[^\s\)]+)/)
                                    if (match) return `${API_BASE}${match[1]}`
                                    return msg.message
                                })()}
                                controls
                                playsInline
                                style={{
                                    width: '100%',
                                    maxHeight: 220,
                                    borderRadius: 8,
                                    background: '#000',
                                    display: 'block'
                                }}
                            />
                            {msg.message.split('\n')[0] && !msg.message.split('\n')[0].startsWith('/uploads') && (
                                <div style={{ marginTop: 6, fontSize: '0.75rem', color: isMe ? '#e0e7ff' : 'var(--color-text-secondary)' }}>
                                    {msg.message.split('\n')[0].replace('[Video Clip] ', '')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                            {msg.message.replace(/^\[IMPORTANT\]\s*/, '')}
                        </div>
                    )}

                    {/* Thread reply counter if exists */}
                    {msg.threadCount && msg.threadCount > 0 ? (
                        <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <button
                                type="button"
                                onClick={() => setActiveThreadParent(msg)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: isMe ? '#c7c9ff' : '#a6a8f8',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: 0
                                }}
                            >
                                <IconMessage size={12} />
                                <span>{msg.threadCount} {msg.threadCount === 1 ? 'reply' : 'replies'}</span>
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Reactions counter pills below bubble */}
                {Object.keys(reactionGroups).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {Object.entries(reactionGroups).map(([emoji, data]) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg._id, emoji)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 6px',
                                    borderRadius: 12,
                                    background: data.hasReacted ? 'rgba(98, 100, 167, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                                    border: data.hasReacted ? '1px solid #6264a7' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    fontSize: '0.6875rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>{emoji}</span>
                                <span>{data.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Helper to render MS Teams File Attachment Card
    function renderFileCard(msgContent: string) {
        const match = msgContent.match(/\[File:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/)
        if (!match) return <div style={{ whiteSpace: 'pre-wrap' }}>{msgContent}</div>

        const [, fileName, rawFileUrl, fileSize] = match
        const fileUrl = normalizeMediaUrl(rawFileUrl)
        const fileExt = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() || 'FILE' : 'FILE'

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: '10px 14px',
                minWidth: 240
            }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: '#6264a7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                }}>
                    <IconFileText size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
                        {fileExt} &bull; {fileSize}
                    </div>
                </div>
                <a
                    href={fileUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download file"
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        textDecoration: 'none',
                        flexShrink: 0
                    }}
                >
                    <IconDownload size={14} />
                </a>
            </div>
        )
    }
}

// Helpers for Teams style tabs and action buttons
function getTeamsTabStyle(isActive: boolean): React.CSSProperties {
    return {
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? '3px solid #6264a7' : '3px solid transparent',
        color: isActive ? '#fff' : 'var(--color-text-secondary)',
        padding: '8px 4px',
        fontSize: '0.8125rem',
        fontWeight: isActive ? 800 : 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease'
    }
}

const teamsHeaderActionBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    width: 32,
    height: 32,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
}

const composerActionIconBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
}

const formattingBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: '0.75rem',
    padding: '3px 6px',
    borderRadius: 4,
    cursor: 'pointer'
}
