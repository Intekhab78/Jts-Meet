import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import type { Channel } from '../channel.types'
import { SOCKET_URL } from '../../../config'
import { soundEffects } from '../../../utils/soundEffects'

export interface ChannelNotificationPayload {
    id: string
    senderName: string
    senderAvatar?: string
    channelName: string
    channelId: string
    content: string
    time: string
}

interface UseChannelSocketParams {
    selectedChannel: Channel | null
    token: string
    currentUserId?: string
    resolvedUserId: string
    resolvedUserIdRef: React.MutableRefObject<string>
    sentByCurrentTabIds: React.MutableRefObject<Set<string>>
    activeThreadParent: any | null
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
    setThreadMessages: React.Dispatch<React.SetStateAction<any[]>>
    setPinnedMessages: React.Dispatch<React.SetStateAction<any[]>>
}

export function useChannelSocket({
    selectedChannel,
    token,
    currentUserId,
    resolvedUserId,
    resolvedUserIdRef,
    sentByCurrentTabIds,
    activeThreadParent,
    setMessages,
    setThreadMessages,
    setPinnedMessages
}: UseChannelSocketParams) {
    const [socketInstance, setSocketInstance] = useState<any | null>(null)
    const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; username: string; timestamp: number }>>([])
    const [unreadChannelCounts, setUnreadChannelCounts] = useState<Record<string, number>>({})
    const [incomingNotificationToast, setIncomingNotificationToast] = useState<ChannelNotificationPayload | null>(null)

    // Request desktop push notification permission on mount
    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            Notification.requestPermission().catch(() => { })
        }
    }, [])

    // Notification toast auto-dismiss timer
    useEffect(() => {
        if (!incomingNotificationToast) return
        const timer = setTimeout(() => {
            setIncomingNotificationToast(null)
        }, 6000)
        return () => clearTimeout(timer)
    }, [incomingNotificationToast])

    // Cleanup expired typing indicator users
    useEffect(() => {
        const timer = setInterval(() => {
            setTypingUsers(prev => {
                const now = Date.now()
                const active = prev.filter(u => now - u.timestamp < 3500)
                return active.length !== prev.length ? active : prev
            })
        }, 1500)
        return () => clearInterval(timer)
    }, [])

    // Channel socket connection and realtime stream listeners
    useEffect(() => {
        if (!selectedChannel || !token) {
            return
        }

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling']
        })

        const joinChannelRoom = () => {
            if (selectedChannel?._id) {
                socket.emit('channel:join', { channelId: selectedChannel._id })
            }
        }

        socket.on('connect', joinChannelRoom)
        if (socket.connected) {
            joinChannelRoom()
        }

        socket.on('channel:message:receive', (msg: any) => {
            const msgId = (msg._id || msg.id)?.toString()
            const targetCId = (msg.channelId?._id || msg.channelId)?.toString()

            // Accurately resolve current user's identity
            const myUserId = (currentUserId || (() => {
                try {
                    const u = localStorage.getItem('user')
                    if (!u) return ''
                    const parsed = JSON.parse(u)
                    return (parsed._id || parsed.id || '').toString()
                } catch (_) {
                    return ''
                }
            })() || (() => {
                try {
                    if (!token) return ''
                    const payload = JSON.parse(atob(token.split('.')[1]))
                    return (payload._id || payload.id || payload.userId || payload.sub || '').toString()
                } catch (_) {
                    return ''
                }
            })()).toString()

            const myUserEmail = (() => {
                try {
                    const u = localStorage.getItem('user')
                    return u ? (JSON.parse(u).email || '').toLowerCase() : ''
                } catch (_) {
                    return ''
                }
            })()

            const senderIdStr = (typeof msg.senderId === 'object' && msg.senderId !== null
                ? (msg.senderId._id || msg.senderId.id || '')
                : (msg.senderId || '')).toString()

            const senderEmailStr = (typeof msg.senderId === 'object' && msg.senderId !== null && msg.senderId.email
                ? msg.senderId.email
                : '').toLowerCase()

            const isSentByMe = Boolean(
                (myUserId && senderIdStr && myUserId === senderIdStr) ||
                (myUserEmail && senderEmailStr && myUserEmail === senderEmailStr) ||
                (msgId && sentByCurrentTabIds.current.has(msgId))
            )

            // NEVER notify or show toast/chime for messages sent by ME
            if (!isSentByMe) {
                // 1. Update unread count if message belongs to another channel
                const isDifferentChannel = targetCId && selectedChannel && targetCId !== selectedChannel._id.toString()
                if (isDifferentChannel) {
                    setUnreadChannelCounts(prev => ({
                        ...prev,
                        [targetCId]: (prev[targetCId] || 0) + 1
                    }))
                }

                // Check if channel is muted by user
                const isMuted = selectedChannel && localStorage.getItem(`jts_channel_muted_${selectedChannel._id}`) === 'true'
                if (!isMuted) {
                    try {
                        soundEffects.playMessageNotificationChime()
                    } catch (e) {
                        console.error('Sound chime error:', e)
                    }
                }

                const isAppFocused = typeof document !== 'undefined' && !document.hidden && document.hasFocus()

                if (isAppFocused) {
                    if (isDifferentChannel) {
                        setIncomingNotificationToast({
                            id: msgId || String(Date.now()),
                            senderName: msg.senderId?.fullName || 'Colleague',
                            senderAvatar: msg.senderId?.profileImage,
                            channelName: msg.channelId?.name || selectedChannel?.name || 'Channel',
                            channelId: targetCId || selectedChannel?._id || '',
                            content: msg.content || (msg.attachments?.length ? '📎 Sent an attachment' : 'Shared a message'),
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        })
                    }
                } else {
                    if (typeof Notification !== 'undefined') {
                        if (Notification.permission === 'granted') {
                            try {
                                const senderName = msg.senderId?.fullName || 'Colleague'
                                const chName = msg.channelId?.name || selectedChannel?.name || 'General'
                                const n = new Notification(`💬 ${senderName} in #${chName}`, {
                                    body: msg.content || (msg.attachments?.length ? '📎 Sent an attachment' : 'Shared a message'),
                                    icon: msg.senderId?.profileImage || '/icon.svg',
                                    tag: `channel-msg-${msgId || Date.now()}`,
                                    silent: true
                                })
                                n.onclick = () => {
                                    window.focus()
                                    n.close()
                                }
                            } catch (_) { }
                        } else if (Notification.permission === 'default') {
                            Notification.requestPermission().catch(() => { })
                        }
                    }
                }
            }

            if (msg.replyTo) {
                if (activeThreadParent && activeThreadParent._id === msg.replyTo) {
                    setThreadMessages(prev => {
                        if (prev.some(m => m._id === msg._id)) return prev.map(m => m._id === msg._id ? msg : m)
                        return [...prev, msg]
                    })
                }
                setMessages(prev => prev.map(m => {
                    if (m._id === msg.replyTo) {
                        return { ...m, replyCount: (m.replyCount || 0) + 1 }
                    }
                    return m
                }))
            } else {
                setMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev.map(m => m._id === msg._id ? msg : m)
                    return [...prev, msg]
                })
            }
        })

        socket.on('channel:message:delete', ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
            setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
            setPinnedMessages(prev => prev.filter(m => m._id !== messageId))
        })

        socket.on('channel:message:undo', ({ message }: { message: any }) => {
            if (!message) return
            setMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message, deleted: false } : m))
            setThreadMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message, deleted: false } : m))
        })

        socket.on('channel:message:reaction', ({ messageId, reactions }: any) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
            setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
        })

        socket.on('channel:message:pin', ({ messageId, pinned, pinnedBy, pinnedAt, message }: any) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned, pinnedBy, pinnedAt } : m))
            setPinnedMessages(prev => {
                if (pinned) {
                    if (prev.some(m => m._id === messageId)) {
                        return prev.map(m => m._id === messageId ? (message || { ...m, pinned, pinnedBy, pinnedAt }) : m)
                    }
                    return [message || { _id: messageId, pinned, pinnedBy, pinnedAt }, ...prev]
                } else {
                    return prev.filter(m => m._id !== messageId)
                }
            })
        })

        socket.on('channel:typing', (payload: { channelId: string; userId: string; username: string; typing: boolean }) => {
            if (payload?.channelId === selectedChannel?._id && payload?.userId !== resolvedUserIdRef.current) {
                if (payload.typing) {
                    setTypingUsers(prev => {
                        const filtered = prev.filter(u => u.userId !== payload.userId)
                        return [...filtered, { userId: payload.userId, username: payload.username || 'Colleague', timestamp: Date.now() }]
                    })
                } else {
                    setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId))
                }
            }
        })

        setSocketInstance(socket)

        return () => {
            socket.emit('channel:leave', { channelId: selectedChannel._id })
            socket.disconnect()
        }
    }, [selectedChannel?._id, token, activeThreadParent?._id])

    return {
        socketInstance,
        typingUsers,
        unreadChannelCounts,
        setUnreadChannelCounts,
        incomingNotificationToast,
        setIncomingNotificationToast
    }
}
