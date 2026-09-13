import React, { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'

interface MeetingWhiteboardProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    socket: Socket | null
}

type ToolType = 'pen' | 'highlighter' | 'rect' | 'circle' | 'line' | 'eraser'

interface StrokePoint {
    x: number
    y: number
}

interface StrokeData {
    tool: ToolType
    color: string
    size: number
    points: StrokePoint[]
}

const PRESET_COLORS = [
    '#ffffff',
    '#6366f1',
    '#3b82f6',
    '#22c55e',
    '#eab308',
    '#f97316',
    '#ef4444',
    '#ec4899',
    '#000000'
]

export function MeetingWhiteboard({ isOpen, onClose, meetingId, socket }: MeetingWhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [tool, setTool] = useState<ToolType>('pen')
    const [color, setColor] = useState<string>('#6366f1')
    const [size, setSize] = useState<number>(4)
    const [isDrawing, setIsDrawing] = useState(false)
    const currentPointsRef = useRef<StrokePoint[]>([])
    const strokesHistoryRef = useRef<StrokeData[]>([])

    // Resize canvas to match display size
    const resizeCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.scale(dpr, dpr)
            redrawAll(ctx)
        }
    }

    const redrawAll = (ctx: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current
        if (!canvas) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        strokesHistoryRef.current.forEach((stroke) => drawStroke(ctx, stroke))
    }

    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeData) => {
        if (stroke.points.length < 2) return

        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.lineWidth = stroke.size * 2
        } else if (stroke.tool === 'highlighter') {
            ctx.globalAlpha = 0.35
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.size * 3
        } else {
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.size
        }

        if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === 'eraser') {
            ctx.beginPath()
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
            }
            ctx.stroke()
        } else if (stroke.tool === 'line') {
            const start = stroke.points[0]
            const end = stroke.points[stroke.points.length - 1]
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()
        } else if (stroke.tool === 'rect') {
            const start = stroke.points[0]
            const end = stroke.points[stroke.points.length - 1]
            ctx.beginPath()
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
        } else if (stroke.tool === 'circle') {
            const start = stroke.points[0]
            const end = stroke.points[stroke.points.length - 1]
            const radius = Math.hypot(end.x - start.x, end.y - start.y)
            ctx.beginPath()
            ctx.arc(start.x, start.y, radius, 0, Math.PI * 2)
            ctx.stroke()
        }

        ctx.restore()
    }

    useEffect(() => {
        if (isOpen) {
            setTimeout(resizeCanvas, 50)
            window.addEventListener('resize', resizeCanvas)
            return () => window.removeEventListener('resize', resizeCanvas)
        }
    }, [isOpen])

    // Real-time socket sync
    useEffect(() => {
        if (!socket || !isOpen) return

        const handleRemoteDraw = (payload: { stroke: StrokeData }) => {
            if (!payload?.stroke) return
            strokesHistoryRef.current.push(payload.stroke)
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) drawStroke(ctx, payload.stroke)
            }
        }

        const handleRemoteClear = () => {
            strokesHistoryRef.current = []
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
            }
        }

        const handleInitState = (payload: { strokes: StrokeData[] }) => {
            if (Array.isArray(payload?.strokes)) {
                strokesHistoryRef.current = payload.strokes
                const canvas = canvasRef.current
                if (canvas) {
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        payload.strokes.forEach(s => drawStroke(ctx, s))
                    }
                }
            }
        }

        socket.on('whiteboard:init_state', handleInitState)
        socket.on(SocketEvents.WHITEBOARD_DRAW, handleRemoteDraw)
        socket.on(SocketEvents.WHITEBOARD_CLEAR, handleRemoteClear)

        // Request current whiteboard state from server for late-joiner sync
        socket.emit('whiteboard:get_state', { meetingId })

        return () => {
            socket.off('whiteboard:init_state', handleInitState)
            socket.off(SocketEvents.WHITEBOARD_DRAW, handleRemoteDraw)
            socket.off(SocketEvents.WHITEBOARD_CLEAR, handleRemoteClear)
        }
    }, [socket, isOpen, meetingId])

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): StrokePoint => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true)
        const pt = getCanvasCoordinates(e)
        currentPointsRef.current = [pt]
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return
        const pt = getCanvasCoordinates(e)
        currentPointsRef.current.push(pt)

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            const lastTwo = currentPointsRef.current.slice(-2)
            drawStroke(ctx, { tool, color, size, points: lastTwo })
        } else {
            // For shapes, redraw canvas to preview shape dynamically
            redrawAll(ctx)
            drawStroke(ctx, { tool, color, size, points: currentPointsRef.current })
        }
    }

    const stopDrawing = () => {
        if (!isDrawing) return
        setIsDrawing(false)

        if (currentPointsRef.current.length > 1) {
            const newStroke: StrokeData = {
                tool,
                color,
                size,
                points: [...currentPointsRef.current]
            }
            strokesHistoryRef.current.push(newStroke)

            socket?.emit(SocketEvents.WHITEBOARD_DRAW, {
                meetingId,
                stroke: newStroke
            })
        }
        currentPointsRef.current = []
    }

    const handleClear = () => {
        strokesHistoryRef.current = []
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        socket?.emit(SocketEvents.WHITEBOARD_CLEAR, { meetingId })
    }

    const handleUndo = () => {
        strokesHistoryRef.current.pop()
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) redrawAll(ctx)
        }
    }

    const handleExport = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const link = document.createElement('a')
        link.download = `whiteboard_${meetingId}_${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9900,
            display: 'flex', flexDirection: 'column',
            background: 'rgba(10, 11, 15, 0.96)', backdropFilter: 'blur(12px)'
        }}>
            {/* Top Toolbar */}
            <div style={{
                minHeight: 56, padding: '0 clamp(10px, 2vw, 20px)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border)', background: 'rgba(18, 20, 29, 0.95)',
                overflowX: 'auto', scrollbarWidth: 'none', gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '1.25rem' }}>🎨</span>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>Whiteboard</h3>
                </div>

                {/* Center tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-2)', padding: '4px 8px', borderRadius: 'var(--radius-lg)' }}>
                    {[
                        { id: 'pen', label: '✏️ Pen' },
                        { id: 'highlighter', label: '🖍️ Highlighter' },
                        { id: 'line', label: '📏 Line' },
                        { id: 'rect', label: '⬜ Rect' },
                        { id: 'circle', label: '⭕ Circle' },
                        { id: 'eraser', label: '🧹 Eraser' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTool(t.id as ToolType)}
                            style={{
                                border: 'none', background: tool === t.id ? 'var(--color-accent)' : 'transparent',
                                color: tool === t.id ? '#fff' : 'var(--color-text-secondary)',
                                padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
                                fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Actions & Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={handleUndo} className="btn btn-secondary text-xs" style={{ padding: '6px 12px' }}>
                        ↩️ Undo
                    </button>
                    <button onClick={handleClear} className="btn btn-secondary text-xs" style={{ padding: '6px 12px' }}>
                        🗑️ Clear
                    </button>
                    <button onClick={handleExport} className="btn btn-secondary text-xs" style={{ padding: '6px 12px' }}>
                        💾 Export PNG
                    </button>
                    <button onClick={onClose} className="btn btn-primary text-xs" style={{ padding: '6px 16px' }}>
                        Close
                    </button>
                </div>
            </div>

            {/* Canvas Area with floating color picker bar */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: tool === 'eraser' ? 'crosshair' : 'default' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />

                {/* Floating Palette & Stroke Width */}
                <div style={{
                    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '8px 18px', background: 'rgba(18, 20, 29, 0.95)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
                }}>
                    {/* Color swatches */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: c, border: color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                    cursor: 'pointer', transform: color === c ? 'scale(1.2)' : 'scale(1)',
                                    transition: 'transform 0.1s ease'
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

                    {/* Stroke Width Slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Thickness:</span>
                        <input
                            type="range"
                            min="2"
                            max="24"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            style={{ width: 80, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', width: 16 }}>{size}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
