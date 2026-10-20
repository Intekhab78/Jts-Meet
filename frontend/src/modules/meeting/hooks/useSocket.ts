import { useCallback, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from '../services/socket.service'

interface UseSocketResult {
    socket: Socket | null
    connected: boolean
    connectSocket: (token: string) => void
    disconnectSocket: () => void
}

export function useSocket(): UseSocketResult {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [connected, setConnected] = useState(false)

    const connectSocket = useCallback((token: string) => {
        if (socket) {
            return
        }

        const client = io(SOCKET_URL, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        })

        client.on('connect', () => setConnected(true))
        client.on('disconnect', () => setConnected(false))
        client.on('connect_error', () => setConnected(false))

        setSocket(client)
    }, [socket])

    const disconnectSocket = useCallback(() => {
        if (!socket) {
            return
        }

        socket.disconnect()
        setSocket(null)
        setConnected(false)
    }, [socket])

    // Immediately trigger socket reconnect when laptop connects to phone hotspot or network restores
    useEffect(() => {
        const handleOnline = () => {
            if (socket && !socket.connected) {
                console.log('[Socket] Network connection restored (online). Immediate socket reconnect...')
                socket.connect()
            }
        }
        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('online', handleOnline)
        }
    }, [socket])

    useEffect(() => {
        return () => {
            socket?.disconnect()
        }
    }, [socket])

    return { socket, connected, connectSocket, disconnectSocket }
}
