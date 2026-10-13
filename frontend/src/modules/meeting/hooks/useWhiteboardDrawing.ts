import { useRef, useState } from 'react'
import type { StrokeData, StrokePoint, ToolType, StrokeBounds } from '../whiteboard.types'
import { generateStrokeId } from '../whiteboard.types'
import {
    getStrokeBounds,
    getResizeHandleAtPoint,
    isPointInStroke,
    drawStroke
} from '../utils/whiteboard.drawing'

interface UseWhiteboardDrawingProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>
    imageFileInputRef: React.RefObject<HTMLInputElement | null>
    tool: ToolType
    color: string
    size: number
    fillMode: 'none' | 'tint' | 'solid'
    pan: { x: number; y: number }
    setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
    zoom: number
    selectedStrokeId: string | null
    setSelectedStrokeId: (id: string | null) => void
    selectedStrokeIdRef: React.MutableRefObject<string | null>
    strokesHistoryRef: React.MutableRefObject<StrokeData[]>
    redoStackRef: React.MutableRefObject<StrokeData[]>
    currentPageIndex: number
    myName: string
    myColor: string
    redrawAll: (ctx?: CanvasRenderingContext2D) => void
    updateUndoRedoStates: () => void
    emitDraw: (stroke: StrokeData, pageIndex: number) => void
    syncPage: (strokes: StrokeData[], pageIndex: number) => void
    emitCursor: (x: number, y: number, name: string, color: string) => void
    emitLaser: (x: number, y: number) => void
    addLaserPoint: (x: number, y: number) => void
    onStartText: (pt: StrokePoint) => void
    onStartSticky: (pt: StrokePoint) => void
}

export function useWhiteboardDrawing({
    canvasRef,
    imageFileInputRef,
    tool,
    color,
    size,
    fillMode,
    pan,
    setPan,
    zoom,
    setSelectedStrokeId,
    selectedStrokeIdRef,
    strokesHistoryRef,
    redoStackRef,
    currentPageIndex,
    myName,
    myColor,
    redrawAll,
    updateUndoRedoStates,
    emitDraw,
    syncPage,
    emitCursor,
    emitLaser,
    addLaserPoint,
    onStartText,
    onStartSticky
}: UseWhiteboardDrawingProps) {
    const isPanningRef = useRef(false)
    const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

    const [isDrawing, setIsDrawing] = useState(false)
    const currentPointsRef = useRef<StrokePoint[]>([])

    const isDraggingObjectRef = useRef(false)
    const dragStartRef = useRef<StrokePoint>({ x: 0, y: 0 })
    const initialStrokePointsRef = useRef<StrokePoint[]>([])
    const hasMovedRef = useRef(false)
    const [isHoveringObject, setIsHoveringObject] = useState(false)
    const [activeHandleCursor, setActiveHandleCursor] = useState<string | null>(null)

    const isResizingRef = useRef(false)
    const activeHandleRef = useRef<'tl' | 'tr' | 'bl' | 'br' | null>(null)
    const resizeStartBoundsRef = useRef<StrokeBounds>({
        minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0
    })
    const resizeOriginPtRef = useRef<StrokePoint>({ x: 0, y: 0 })
    const lastCursorEmitRef = useRef<number>(0)

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): StrokePoint => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (tool === 'pan') {
            isPanningRef.current = true
            panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
            return
        }

        const pt = getCanvasCoordinates(e)

        if (tool === 'select') {
            // Check if clicking a resize handle of the currently selected stroke
            if (selectedStrokeIdRef.current) {
                const curSel = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
                if (curSel) {
                    const bounds = getStrokeBounds(curSel)
                    const handle = getResizeHandleAtPoint(pt, bounds, zoom)
                    if (handle) {
                        isResizingRef.current = true
                        activeHandleRef.current = handle
                        resizeStartBoundsRef.current = { ...bounds }
                        resizeOriginPtRef.current = { x: pt.x, y: pt.y }
                        hasMovedRef.current = false
                        return
                    }
                }
            }

            const strokes = strokesHistoryRef.current
            let foundStroke: StrokeData | null = null

            // If an object is already selected, check if we clicked on it
            if (selectedStrokeIdRef.current) {
                const curSel = strokes.find(s => s.id === selectedStrokeIdRef.current)
                if (curSel && isPointInStroke(pt, curSel)) {
                    foundStroke = curSel
                }
            }

            // Otherwise, search topmost to bottom
            if (!foundStroke) {
                for (let i = strokes.length - 1; i >= 0; i--) {
                    if (isPointInStroke(pt, strokes[i])) {
                        foundStroke = strokes[i]
                        break
                    }
                }
            }

            if (foundStroke) {
                if (!foundStroke.id) foundStroke.id = generateStrokeId()
                setSelectedStrokeId(foundStroke.id)
                selectedStrokeIdRef.current = foundStroke.id

                isDraggingObjectRef.current = true
                dragStartRef.current = { x: pt.x, y: pt.y }
                initialStrokePointsRef.current = foundStroke.points.map(p => ({ x: p.x, y: p.y }))
                hasMovedRef.current = false
            } else {
                setSelectedStrokeId(null)
                selectedStrokeIdRef.current = null
            }
            redrawAll()
            return
        }

        if (tool === 'image') {
            imageFileInputRef.current?.click()
            return
        }

        if (tool === 'text') {
            onStartText(pt)
            return
        }

        if (tool === 'sticky') {
            onStartSticky(pt)
            return
        }

        if (tool === 'laser') {
            addLaserPoint(pt.x, pt.y)
            emitLaser(pt.x, pt.y)
            return
        }

        setIsDrawing(true)
        currentPointsRef.current = [pt]
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (tool === 'pan' && isPanningRef.current) {
            setPan({
                x: e.clientX - panStartRef.current.x,
                y: e.clientY - panStartRef.current.y
            })
            return
        }

        const pt = getCanvasCoordinates(e)

        // Throttle broadcast cursor position to meeting participants
        const now = Date.now()
        if (now - lastCursorEmitRef.current > 35) {
            lastCursorEmitRef.current = now
            emitCursor(pt.x, pt.y, myName, myColor)
        }

        if (tool === 'select') {
            // 1. Resizing active handle
            if (isResizingRef.current && activeHandleRef.current && selectedStrokeIdRef.current) {
                const targetStroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
                if (targetStroke) {
                    const orig = resizeStartBoundsRef.current
                    const dx = pt.x - resizeOriginPtRef.current.x
                    const dy = pt.y - resizeOriginPtRef.current.y
                    const h = activeHandleRef.current
                    hasMovedRef.current = true

                    if (targetStroke.tool === 'rect') {
                        let newMinX = orig.minX
                        let newMinY = orig.minY
                        let newMaxX = orig.maxX
                        let newMaxY = orig.maxY

                        if (h === 'br') {
                            newMaxX = Math.max(orig.minX + 15, orig.maxX + dx)
                            newMaxY = Math.max(orig.minY + 15, orig.maxY + dy)
                        } else if (h === 'tl') {
                            newMinX = Math.min(orig.maxX - 15, orig.minX + dx)
                            newMinY = Math.min(orig.maxY - 15, orig.minY + dy)
                        } else if (h === 'tr') {
                            newMaxX = Math.max(orig.minX + 15, orig.maxX + dx)
                            newMinY = Math.min(orig.maxY - 15, orig.minY + dy)
                        } else if (h === 'bl') {
                            newMinX = Math.min(orig.maxX - 15, orig.minX + dx)
                            newMaxY = Math.max(orig.minY + 15, orig.maxY + dy)
                        }
                        targetStroke.points = [
                            { x: newMinX, y: newMinY },
                            { x: newMaxX, y: newMaxY }
                        ]
                    } else if (targetStroke.tool === 'circle') {
                        const center = { x: (orig.minX + orig.maxX) / 2, y: (orig.minY + orig.maxY) / 2 }
                        const newRadius = Math.max(10, Math.hypot(pt.x - center.x, pt.y - center.y))
                        targetStroke.points = [
                            center,
                            { x: center.x + newRadius, y: center.y }
                        ]
                    } else if (targetStroke.tool === 'image' || targetStroke.tool === 'sticky') {
                        let newMinX = orig.minX
                        let newMinY = orig.minY
                        let newW = orig.width || 180
                        let newH = orig.height || 140

                        if (h === 'br') {
                            newW = Math.max(30, orig.width + dx)
                            newH = Math.max(30, orig.height + dy)
                        } else if (h === 'tl') {
                            newMinX = Math.min(orig.minX + orig.width - 30, orig.minX + dx)
                            newMinY = Math.min(orig.minY + orig.height - 30, orig.minY + dy)
                            newW = Math.max(30, orig.maxX - newMinX)
                            newH = Math.max(30, orig.maxY - newMinY)
                        } else if (h === 'tr') {
                            newMinY = Math.min(orig.minY + orig.height - 30, orig.minY + dy)
                            newW = Math.max(30, orig.width + dx)
                            newH = Math.max(30, orig.maxY - newMinY)
                        } else if (h === 'bl') {
                            newMinX = Math.min(orig.minX + orig.width - 30, orig.minX + dx)
                            newW = Math.max(30, orig.maxX - newMinX)
                            newH = Math.max(30, orig.height + dy)
                        }
                        targetStroke.points = [{ x: newMinX, y: newMinY }]
                        targetStroke.width = newW
                        targetStroke.height = newH
                    }
                    redrawAll()
                }
                return
            }

            // 2. Dragging object
            if (isDraggingObjectRef.current && selectedStrokeIdRef.current) {
                const dx = pt.x - dragStartRef.current.x
                const dy = pt.y - dragStartRef.current.y
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    hasMovedRef.current = true
                }

                const targetStroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
                if (targetStroke && initialStrokePointsRef.current.length > 0) {
                    targetStroke.points = initialStrokePointsRef.current.map(p => ({
                        x: p.x + dx,
                        y: p.y + dy
                    }))
                    redrawAll()
                }
                return
            }

            // 3. Hovering check for resize handles or shapes
            if (selectedStrokeIdRef.current) {
                const sel = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
                if (sel) {
                    const bounds = getStrokeBounds(sel)
                    const handle = getResizeHandleAtPoint(pt, bounds, zoom)
                    if (handle === 'tl' || handle === 'br') {
                        setActiveHandleCursor('nwse-resize')
                        return
                    } else if (handle === 'tr' || handle === 'bl') {
                        setActiveHandleCursor('nesw-resize')
                        return
                    }
                }
            }
            setActiveHandleCursor(null)

            let hoverHit = false
            const strokes = strokesHistoryRef.current
            for (let i = strokes.length - 1; i >= 0; i--) {
                if (isPointInStroke(pt, strokes[i])) {
                    hoverHit = true
                    break
                }
            }
            setIsHoveringObject(hoverHit)
            return
        }

        if (tool === 'laser') {
            addLaserPoint(pt.x, pt.y)
            emitLaser(pt.x, pt.y)
            return
        }

        if (!isDrawing) return
        currentPointsRef.current.push(pt)

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            const lastTwo = currentPointsRef.current.slice(-2)
            ctx.save()
            const dpr = window.devicePixelRatio || 1
            ctx.scale(dpr, dpr)
            ctx.translate(pan.x, pan.y)
            ctx.scale(zoom, zoom)
            drawStroke(ctx, { tool, color, size, points: lastTwo }, () => redrawAll())
            ctx.restore()
        } else {
            redrawAll(ctx)
            ctx.save()
            const dpr = window.devicePixelRatio || 1
            ctx.scale(dpr, dpr)
            ctx.translate(pan.x, pan.y)
            ctx.scale(zoom, zoom)
            drawStroke(ctx, { tool, color, size, points: currentPointsRef.current }, () => redrawAll())
            ctx.restore()
        }
    }

    const stopDrawing = () => {
        if (tool === 'pan') {
            isPanningRef.current = false
            return
        }

        if (tool === 'select') {
            if (isResizingRef.current) {
                isResizingRef.current = false
                activeHandleRef.current = null
                if (hasMovedRef.current && selectedStrokeIdRef.current) {
                    redoStackRef.current = []
                    updateUndoRedoStates()
                    syncPage(strokesHistoryRef.current, currentPageIndex)
                }
            }
            if (isDraggingObjectRef.current) {
                isDraggingObjectRef.current = false
                if (hasMovedRef.current && selectedStrokeIdRef.current) {
                    redoStackRef.current = []
                    updateUndoRedoStates()
                    syncPage(strokesHistoryRef.current, currentPageIndex)
                }
            }
            return
        }

        if (!isDrawing) return
        setIsDrawing(false)

        if (currentPointsRef.current.length > 1) {
            let actualFillColor: string | undefined = undefined
            if (tool === 'rect' || tool === 'circle') {
                if (fillMode === 'solid') {
                    actualFillColor = color
                } else if (fillMode === 'tint') {
                    actualFillColor = color.startsWith('#')
                        ? `${color}33`
                        : color
                }
            }

            const newStroke: StrokeData = {
                id: generateStrokeId(),
                tool,
                color,
                fillColor: actualFillColor,
                size,
                points: [...currentPointsRef.current]
            }
            strokesHistoryRef.current.push(newStroke)
            redoStackRef.current = []
            updateUndoRedoStates()

            emitDraw(newStroke, currentPageIndex)
        }
        currentPointsRef.current = []
    }

    return {
        isDrawing,
        isPanningRef,
        isDraggingObjectRef,
        isHoveringObject,
        activeHandleCursor,
        getCanvasCoordinates,
        startDrawing,
        draw,
        stopDrawing
    }
}
