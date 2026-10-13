import { useState, useEffect, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { API_BASE, SOCKET_URL } from '../../../config'
import { PresenceStatus } from '../../../components/common/UserPresenceBadge'
import { ChatContact, ChatMessage, RecentChat } from '../chat.types'

interface UseDirectChatSocketProps {
    token: string
    currentUserId: string
    activeContact: ChatContact | null
    setActiveContact: React.Dispatch<React.SetStateAction<ChatContact | null>>
    contactsRef: React.MutableRefObject<ChatContact[]>
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    setRecentChats: React.Dispatch<React.SetStateAction<RecentChat[]>>
    setThreadReplies: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    setActiveThreadParent: React.Dispatch<React.SetStateAction<ChatMessage | null>>
    loadRecentChats: () => void
}

export function useDirectChatSocket({
    token,
    currentUserId,
    activeContact,
    setActiveContact,
    contactsRef,
    setMessages,
    setRecentChats,
    setThreadReplies,
    setActiveThreadParent,
    loadRecentChats
}: UseDirectChatSocketProps) {
    const socketRef = useRef<Socket | null>(null)
    const [presences, setPresences] = useState<Record<string, { status: PresenceStatus; customStatus?: string }>>({})
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
    const typingTimeoutRef = useRef<any>(null)

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

        // Teams-style message delete / unsend
        socket.on('chat:message:delete', (data: { messageId: string; isDeleted: boolean; deletedAt?: string }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    return { ...m, isDeleted: true }
                }
                return m
            }))
            setThreadReplies(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    return { ...m, isDeleted: true }
                }
                return m
            }))
            setRecentChats(prev => prev.map(c => {
                if (c.latestMessage?._id === data.messageId) {
                    return {
                        ...c,
                        latestMessage: { ...c.latestMessage, isDeleted: true }
                    }
                }
                return c
            }))
        })

        // Teams-style message undo delete / restore
        socket.on('chat:message:undo', (data: { messageId: string; message: ChatMessage }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    return { ...m, ...data.message, isDeleted: false }
                }
                return m
            }))
            setThreadReplies(prev => prev.map(m => {
                if (m._id === data.messageId) {
                    return { ...m, ...data.message, isDeleted: false }
                }
                return m
            }))
            setRecentChats(prev => prev.map(c => {
                if (c.latestMessage?._id === data.messageId) {
                    return {
                        ...c,
                        latestMessage: { ...c.latestMessage, ...data.message, isDeleted: false }
                    }
                }
                return c
            }))
        })

        return () => {
            socket.off()
            socket.disconnect()
        }
    }, [token, currentUserId])

    const emitTypingStart = () => {
        if (!activeContact || !socketRef.current) return
        socketRef.current.emit('typing:start', { receiverId: activeContact._id })

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('typing:stop', { receiverId: activeContact._id })
        }, 2000)
    }

    const emitTypingStop = () => {
        if (!activeContact || !socketRef.current) return
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        socketRef.current.emit('typing:stop', { receiverId: activeContact._id })
    }

    return {
        socketRef,
        presences,
        typingUsers,
        emitTypingStart,
        emitTypingStop
    }
}
