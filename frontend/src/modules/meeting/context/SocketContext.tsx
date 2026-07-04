import React, { createContext, useContext } from 'react'
import { useSocket } from '../hooks/useSocket'
import type { Socket } from 'socket.io-client'

interface SocketContextValue {
    socket: Socket | null
    connected: boolean
    connectSocket: (token: string) => void
    disconnectSocket: () => void
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

export const SocketProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { socket, connected, connectSocket, disconnectSocket } = useSocket()

    return (
        <SocketContext.Provider value={{ socket, connected, connectSocket, disconnectSocket }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocketContext() {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error('useSocketContext must be used within SocketProvider')
    }
    return context
}
