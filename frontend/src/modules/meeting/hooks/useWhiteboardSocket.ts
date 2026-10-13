import { useEffect, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'
import type { StrokeData } from '../whiteboard.types'
import { generateStrokeId } from '../whiteboard.types'
import type { RemoteCursor } from './useWhiteboardLaser'

interface UseWhiteboardSocketProps {
    socket: Socket | null
    isOpen: boolean
    meetingId: string
    currentPageIndexRef: React.MutableRefObject<number>
    strokesHistoryRef: React.MutableRefObject<StrokeData[]>
    redoStackRef: React.MutableRefObject<StrokeData[]>
    selectedStrokeIdRef: React.MutableRefObject<string | null>
    remoteCursorsRef: React.MutableRefObject<Map<string, RemoteCursor>>
    setPages: React.Dispatch<React.SetStateAction<StrokeData[][]>>
    setSelectedStrokeId: (id: string | null) => void
    setCurrentPageIndex: (idx: number) => void
    updateUndoRedoStates: () => void
    redrawAll: () => void
    addLaserPoint: (x: number, y: number) => void
    triggerRenderOverlay: () => void
}

export function useWhiteboardSocket({
    socket,
    isOpen,
    meetingId,
    currentPageIndexRef,
    strokesHistoryRef,
    redoStackRef,
    selectedStrokeIdRef,
    remoteCursorsRef,
    setPages,
    setSelectedStrokeId,
    setCurrentPageIndex,
    updateUndoRedoStates,
    redrawAll,
    addLaserPoint,
    triggerRenderOverlay
}: UseWhiteboardSocketProps) {
    useEffect(() => {
        if (!socket || !isOpen) return

        const handleRemoteDraw = (payload: { stroke: StrokeData; pageIndex?: number }) => {
            if (!payload?.stroke) return
            if (!payload.stroke.id) payload.stroke.id = generateStrokeId()
            const strokePage = typeof payload.pageIndex === 'number' ? payload.pageIndex : 0

            if (strokePage === currentPageIndexRef.current) {
                strokesHistoryRef.current.push(payload.stroke)
                updateUndoRedoStates()
                redrawAll()
            }
            setPages(prev => {
                const next = [...prev]
                while (next.length <= strokePage) next.push([])
                next[strokePage] = [...next[strokePage], payload.stroke]
                return next
            })
        }

        const handleRemoteClear = (payload?: { pageIndex?: number }) => {
            const pageToClear = typeof payload?.pageIndex === 'number' ? payload.pageIndex : currentPageIndexRef.current
            if (pageToClear === currentPageIndexRef.current) {
                strokesHistoryRef.current = []
                redoStackRef.current = []
                setSelectedStrokeId(null)
                selectedStrokeIdRef.current = null
                updateUndoRedoStates()
                redrawAll()
            }
            setPages(prev => {
                const next = [...prev]
                if (next[pageToClear]) next[pageToClear] = []
                return next
            })
        }

        const handleRemoteLaser = (payload: { x: number; y: number }) => {
            if (typeof payload?.x === 'number' && typeof payload?.y === 'number') {
                addLaserPoint(payload.x, payload.y)
            }
        }

        const handlePageAdded = (payload?: { totalPages?: number }) => {
            setPages(prev => {
                const next = [...prev]
                const total = payload?.totalPages || (next.length + 1)
                while (next.length < total) next.push([])
                return next
            })
        }

        const handlePageDeleted = (payload?: { pageIndex?: number; totalPages?: number }) => {
            const delIdx = payload?.pageIndex ?? -1
            setPages(prev => {
                if (prev.length <= 1) return prev
                const next = prev.filter((_, idx) => idx !== delIdx)
                return next.length > 0 ? next : [[]]
            })
            if (currentPageIndexRef.current >= (payload?.totalPages || 1)) {
                const newIdx = Math.max(0, (payload?.totalPages || 1) - 1)
                setCurrentPageIndex(newIdx)
                currentPageIndexRef.current = newIdx
            }
        }

        const handlePageSynced = (payload: { strokes: StrokeData[]; pageIndex?: number }) => {
            if (!Array.isArray(payload?.strokes)) return
            const strokePage = typeof payload.pageIndex === 'number' ? payload.pageIndex : 0
            payload.strokes.forEach(s => { if (!s.id) s.id = generateStrokeId() })

            if (strokePage === currentPageIndexRef.current) {
                strokesHistoryRef.current = payload.strokes
                if (selectedStrokeIdRef.current && !payload.strokes.some(s => s.id === selectedStrokeIdRef.current)) {
                    setSelectedStrokeId(null)
                    selectedStrokeIdRef.current = null
                }
                updateUndoRedoStates()
                redrawAll()
            }
            setPages(prev => {
                const next = [...prev]
                while (next.length <= strokePage) next.push([])
                next[strokePage] = payload.strokes
                return next
            })
        }

        const handleInitState = (payload: { strokes?: StrokeData[]; pages?: StrokeData[][] }) => {
            if (Array.isArray(payload?.pages) && payload.pages.length > 0) {
                payload.pages.forEach(pg => pg.forEach(s => { if (!s.id) s.id = generateStrokeId() }))
                setPages(payload.pages)
                strokesHistoryRef.current = payload.pages[0] || []
            } else if (Array.isArray(payload?.strokes)) {
                payload.strokes.forEach(s => { if (!s.id) s.id = generateStrokeId() })
                strokesHistoryRef.current = payload.strokes
                setPages([payload.strokes])
            }
            redoStackRef.current = []
            updateUndoRedoStates()
            redrawAll()
        }

        const handleRemoteCursor = (payload: { userId: string; name?: string; color?: string; x: number; y: number }) => {
            if (!payload?.userId || typeof payload.x !== 'number' || typeof payload.y !== 'number') return
            remoteCursorsRef.current.set(payload.userId, {
                userId: payload.userId,
                name: payload.name || 'Participant',
                color: payload.color || '#6366f1',
                x: payload.x,
                y: payload.y,
                timestamp: Date.now()
            })
            triggerRenderOverlay()
        }

        socket.on('whiteboard:init_state', handleInitState)
        socket.on(SocketEvents.WHITEBOARD_DRAW, handleRemoteDraw)
        socket.on(SocketEvents.WHITEBOARD_CLEAR, handleRemoteClear)
        socket.on('whiteboard:laser', handleRemoteLaser)
        socket.on('whiteboard:page_added', handlePageAdded)
        socket.on('whiteboard:page_deleted', handlePageDeleted)
        socket.on('whiteboard:page_synced', handlePageSynced)
        socket.on('whiteboard:remote_cursor', handleRemoteCursor)

        socket.emit('whiteboard:get_state', { meetingId })

        return () => {
            socket.off('whiteboard:init_state', handleInitState)
            socket.off(SocketEvents.WHITEBOARD_DRAW, handleRemoteDraw)
            socket.off(SocketEvents.WHITEBOARD_CLEAR, handleRemoteClear)
            socket.off('whiteboard:laser', handleRemoteLaser)
            socket.off('whiteboard:page_added', handlePageAdded)
            socket.off('whiteboard:page_deleted', handlePageDeleted)
            socket.off('whiteboard:page_synced', handlePageSynced)
            socket.off('whiteboard:remote_cursor', handleRemoteCursor)
        }
    }, [
        socket,
        isOpen,
        meetingId,
        currentPageIndexRef,
        strokesHistoryRef,
        redoStackRef,
        selectedStrokeIdRef,
        remoteCursorsRef,
        setPages,
        setSelectedStrokeId,
        setCurrentPageIndex,
        updateUndoRedoStates,
        redrawAll,
        addLaserPoint,
        triggerRenderOverlay
    ])

    const syncPage = useCallback((strokes: StrokeData[], pageIndex: number) => {
        socket?.emit('whiteboard:sync_page', {
            meetingId,
            pageIndex,
            strokes
        })
    }, [socket, meetingId])

    const emitDraw = useCallback((stroke: StrokeData, pageIndex: number) => {
        socket?.emit(SocketEvents.WHITEBOARD_DRAW, {
            meetingId,
            stroke,
            pageIndex
        })
    }, [socket, meetingId])

    const emitClear = useCallback((pageIndex: number) => {
        socket?.emit(SocketEvents.WHITEBOARD_CLEAR, { meetingId, pageIndex })
    }, [socket, meetingId])

    const emitLaser = useCallback((x: number, y: number) => {
        socket?.emit('whiteboard:laser', { meetingId, x, y })
    }, [socket, meetingId])

    const emitCursor = useCallback((x: number, y: number, name: string, color: string) => {
        socket?.emit('whiteboard:cursor', {
            meetingId,
            x,
            y,
            name,
            color
        })
    }, [socket, meetingId])

    const emitPageAdd = useCallback(() => {
        socket?.emit('whiteboard:page_add', { meetingId })
    }, [socket, meetingId])

    const emitPageDelete = useCallback((pageIndex: number) => {
        socket?.emit('whiteboard:page_delete', { meetingId, pageIndex })
    }, [socket, meetingId])

    return {
        syncPage,
        emitDraw,
        emitClear,
        emitLaser,
        emitCursor,
        emitPageAdd,
        emitPageDelete
    }
}
