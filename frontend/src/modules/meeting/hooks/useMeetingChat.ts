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

    useEffect(() => {
        if (!socket) {
            return
        }

        const handleReceive = (chat: MeetingChatMessage) => {
            setMessages((prev) => [...prev, chat])
        }

        const handleTyping = (payload: { userId: string }) => {
            setTypingUsers((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]))
        }

        const handleStopTyping = (payload: { userId: string }) => {
            setTypingUsers((prev) => prev.filter((id) => id !== payload.userId))
        }

        socket.on(SocketEvents.MEETING_CHAT_RECEIVE, handleReceive)
        socket.on(SocketEvents.MEETING_CHAT_TYPING, handleTyping)
        socket.on(SocketEvents.MEETING_CHAT_STOP_TYPING, handleStopTyping)

        return () => {
            socket.off(SocketEvents.MEETING_CHAT_RECEIVE, handleReceive)
            socket.off(SocketEvents.MEETING_CHAT_TYPING, handleTyping)
            socket.off(SocketEvents.MEETING_CHAT_STOP_TYPING, handleStopTyping)
        }
    }, [socket])

    return {
        messages,
        typingUsers,
        sendMessage,
        emitTyping,
        emitStopTyping
    }
}
