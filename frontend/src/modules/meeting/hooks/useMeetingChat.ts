import { useCallback, useEffect, useState } from 'react'
import { useMeetingContext } from '../context/MeetingContext'
import { useSocketContext } from '../context/SocketContext'
import { SocketEvents } from '../services/socket.service'

export interface MeetingChatMessage {
    _id?: string
    meetingId: string
    senderId: string
    message: string
    messageType: 'text'
    reactions?: { userId: string; emoji: string; createdAt: string }[]
    status?: 'sent' | 'delivered' | 'read'
    createdAt: string
    updatedAt: string
}

export function useMeetingChat() {
    const { meetingId } = useMeetingContext()
    const { socket } = useSocketContext()
    const [messages, setMessages] = useState<MeetingChatMessage[]>([])
    const [typingUsers, setTypingUsers] = useState<string[]>([])

    const sendMessage = useCallback(
        (message: string) => {
            if (!socket || !meetingId || !message.trim()) {
                return
            }
            const tempId = `temp-${Date.now()}`
            const localMsg: MeetingChatMessage = {
                _id: tempId,
                meetingId,
                senderId: 'me',
                message: message.trim(),
                messageType: 'text',
                status: 'sent',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
            setMessages((prev) => [...prev, localMsg])
            socket.emit(SocketEvents.MEETING_CHAT_SEND, { meetingId, message: message.trim() })
        },
        [meetingId, socket]
    )

    const emitTyping = useCallback(() => {
        if (!socket || !meetingId) {
            return
        }
        socket.emit(SocketEvents.MEETING_CHAT_TYPING, { meetingId })
    }, [meetingId, socket])

    const emitStopTyping = useCallback(() => {
        if (!socket || !meetingId) {
            return
        }
        socket.emit(SocketEvents.MEETING_CHAT_STOP_TYPING, { meetingId })
    }, [meetingId, socket])

    const toggleChatReaction = useCallback(
        (messageId: string, emoji: string, userId: string) => {
            if (!socket || !meetingId) {
                return
            }
            const targetMessage = messages.find(m => m._id === messageId)
            const alreadyReacted = targetMessage?.reactions?.some(
                r => r.userId === userId && r.emoji === emoji
            )

            if (alreadyReacted) {
                socket.emit(SocketEvents.MEETING_CHAT_REACTION_REMOVE, { meetingId, messageId, emoji })
            } else {
                socket.emit(SocketEvents.MEETING_CHAT_REACTION_ADD, { meetingId, messageId, emoji })
            }
        },
        [meetingId, socket, messages]
    )

    useEffect(() => {
        if (!socket) {
            return
        }

        const handleReceive = (chat: MeetingChatMessage) => {
            setMessages((prev) => {
                const tempMsgIdx = prev.findIndex(m => m.status === 'sent' && m.message === chat.message)
                if (tempMsgIdx !== -1) {
                    const updated = [...prev]
                    updated[tempMsgIdx] = {
                        ...chat,
                        senderId: 'me',
                        status: 'read'
                    }
                    return updated
                }
                return [...prev, { ...chat, status: 'read' }]
            })
        }

        const handleTyping = (payload: { userId: string }) => {
            setTypingUsers((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]))
        }

        const handleStopTyping = (payload: { userId: string }) => {
            setTypingUsers((prev) => prev.filter((id) => id !== payload.userId))
        }

        const handleReactionAdd = (payload: { messageId: string; userId: string; emoji: string; createdAt: string }) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg._id === payload.messageId) {
                        const reactions = msg.reactions || []
                        if (reactions.some((r) => r.userId === payload.userId && r.emoji === payload.emoji)) {
                            return msg
                        }
                        return {
                            ...msg,
                            reactions: [...reactions, { userId: payload.userId, emoji: payload.emoji, createdAt: payload.createdAt }]
                        }
                    }
                    return msg
                })
            )
        }

        const handleReactionRemove = (payload: { messageId: string; userId: string; emoji: string }) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg._id === payload.messageId) {
                        const reactions = msg.reactions || []
                        return {
                            ...msg,
                            reactions: reactions.filter((r) => !(r.userId === payload.userId && r.emoji === payload.emoji))
                        }
                    }
                    return msg
                })
            )
        }

        socket.on(SocketEvents.MEETING_CHAT_RECEIVE, handleReceive)
        socket.on(SocketEvents.MEETING_CHAT_TYPING, handleTyping)
        socket.on(SocketEvents.MEETING_CHAT_STOP_TYPING, handleStopTyping)
        socket.on(SocketEvents.MEETING_CHAT_REACTION_ADD, handleReactionAdd)
        socket.on(SocketEvents.MEETING_CHAT_REACTION_REMOVE, handleReactionRemove)

        return () => {
            socket.off(SocketEvents.MEETING_CHAT_RECEIVE, handleReceive)
            socket.off(SocketEvents.MEETING_CHAT_TYPING, handleTyping)
            socket.off(SocketEvents.MEETING_CHAT_STOP_TYPING, handleStopTyping)
            socket.off(SocketEvents.MEETING_CHAT_REACTION_ADD, handleReactionAdd)
            socket.off(SocketEvents.MEETING_CHAT_REACTION_REMOVE, handleReactionRemove)
        }
    }, [socket])

    return {
        messages,
        typingUsers,
        sendMessage,
        emitTyping,
        emitStopTyping,
        toggleChatReaction
    }
}
