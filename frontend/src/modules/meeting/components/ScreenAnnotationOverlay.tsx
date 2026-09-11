import React, { useRef, useEffect, useState, useCallback } from 'react'

export type AnnotationTool = 'laser' | 'pen' | 'highlighter' | 'eraser'

export interface Point {
    x: number // normalized 0..1
    y: number // normalized 0..1
}

export interface Stroke {
    id: string
    tool: 'pen' | 'highlighter' | 'eraser'
    color: string
    size: number
    points: Point[]
}

export interface LaserPoint {
    x: number // normalized 0..1
    y: number // normalized 0..1
    alpha: number
}

export interface ScreenAnnotationOverlayProps {
    isActive: boolean
    isPresenter?: boolean
    socket?: any
    meetingId?: string
    onClose?: () => void
}

const COLORS = [
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#FFFFFF'  // White
]

export const ScreenAnnotationOverlay: React.FC<ScreenAnnotationOverlayProps> = ({
    isActive,
    isPresenter = false,
    socket,
    meetingId,
    onClose
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [tool, setTool] = useState<AnnotationTool>('laser')
    const [color, setColor] = useState<string>('#EF4444')
    const [size] = useState<number>(3)
    const [strokes, setStrokes] = useState<Stroke[]>([])
    const isDrawing = useRef(false)
    const currentStroke = useRef<Stroke | null>(null)
    const laserTrail = useRef<LaserPoint[]>([])
    const animFrameRef = useRef<number | null>(null)

    // Redraw strokes onto canvas with current canvas width & height
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const w = canvas.width
        const h = canvas.height
        if (w === 0 || h === 0) return

        ctx.clearRect(0, 0, w, h)

        strokes.forEach(stroke => {
            if (stroke.points.length === 0) return

            if (stroke.tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out'
                ctx.lineWidth = stroke.size * 6
                ctx.strokeStyle = 'rgba(0,0,0,1)'
                ctx.fillStyle = 'rgba(0,0,0,1)'
            } else if (stroke.tool === 'highlighter') {
                ctx.globalCompositeOperation = 'source-over'
                ctx.globalAlpha = 0.35
                ctx.strokeStyle = stroke.color
                ctx.fillStyle = stroke.color
                ctx.lineWidth = 18
                ctx.lineCap = 'square'
                ctx.lineJoin = 'bevel'
            } else {
                ctx.globalCompositeOperation = 'source-over'
                ctx.globalAlpha = 1.0
                ctx.strokeStyle = stroke.color
                ctx.fillStyle = stroke.color
                ctx.lineWidth = stroke.size
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
            }

            if (stroke.points.length === 1) {
                // Single tap dot
                const p = stroke.points[0]
                ctx.beginPath()
                ctx.arc(p.x * w, p.y * h, (ctx.lineWidth || 3) / 2, 0, Math.PI * 2)
                ctx.fill()
            } else {
                ctx.beginPath()
                ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h)

                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h)
                }
                ctx.stroke()
            }

            ctx.globalAlpha = 1.0
            ctx.globalCompositeOperation = 'source-over'
        })
    }, [strokes])

    // Resize canvas to match container parent dimensions
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const parent = canvas.parentElement
        if (!parent) return

        const rect = parent.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0 && (canvas.width !== rect.width || canvas.height !== rect.height)) {
            canvas.width = rect.width
            canvas.height = rect.height
            redrawCanvas()
        }
    }, [redrawCanvas])

    useEffect(() => {
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)
        return () => window.removeEventListener('resize', resizeCanvas)
    }, [resizeCanvas])

    useEffect(() => {
        redrawCanvas()
    }, [redrawCanvas])

    // Socket.io listeners for Remote Viewer / Guest to receive live annotations in real time
    useEffect(() => {
        if (!socket) return

        const handleRemoteStrokeStart = (data: { meetingId: string; stroke: Stroke }) => {
            if (!data?.stroke) return
            setStrokes(prev => {
                const exists = prev.some(s => s.id === data.stroke.id)
                if (exists) return prev
                return [...prev, data.stroke]
            })
        }

        const handleRemoteStrokePoint = (data: { meetingId: string; strokeId: string; point: Point }) => {
            if (!data?.strokeId || !data?.point) return
            setStrokes(prev => {
                const idx = prev.findIndex(s => s.id === data.strokeId)
                if (idx === -1) {
                    return [...prev, {
                        id: data.strokeId,
                        tool: 'pen',
                        color: '#EF4444',
                        size: 3,
                        points: [data.point]
                    }]
                }
                const updated = [...prev]
                updated[idx] = {
                    ...updated[idx],
                    points: [...updated[idx].points, data.point]
                }
                return updated
            })
        }

        const handleRemoteLaser = (data: { meetingId: string; point: Point }) => {
            if (!data?.point) return
            laserTrail.current.push({ ...data.point, alpha: 1.0 })
            if (laserTrail.current.length > 35) {
                laserTrail.current.shift()
            }
        }

        const handleRemoteClear = () => {
            setStrokes([])
            laserTrail.current = []
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')
                ctx?.clearRect(0, 0, canvas.width, canvas.height)
            }
        }

        socket.on('screen:annotation:stroke-start', handleRemoteStrokeStart)
        socket.on('screen:annotation:stroke-point', handleRemoteStrokePoint)
        socket.on('screen:annotation:laser', handleRemoteLaser)
        socket.on('screen:annotation:clear', handleRemoteClear)

        return () => {
            socket.off('screen:annotation:stroke-start', handleRemoteStrokeStart)
            socket.off('screen:annotation:stroke-point', handleRemoteStrokePoint)
            socket.off('screen:annotation:laser', handleRemoteLaser)
            socket.off('screen:annotation:clear', handleRemoteClear)
        }
    }, [socket])

    // Animation loop for fading Laser Pointer trail (both presenter & viewers)
    useEffect(() => {
        const renderLoop = () => {
            const canvas = canvasRef.current
            if (canvas && laserTrail.current.length > 0) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    redrawCanvas()

                    const w = canvas.width
                    const h = canvas.height

                    // Draw laser glowing points
                    for (let i = 0; i < laserTrail.current.length; i++) {
                        const lp = laserTrail.current[i]
                        lp.alpha -= 0.035 // decay speed

                        if (lp.alpha > 0) {
                            ctx.beginPath()
                            ctx.arc(lp.x * w, lp.y * h, 7 * lp.alpha, 0, Math.PI * 2)
                            ctx.fillStyle = `rgba(239, 68, 68, ${lp.alpha})`
                            ctx.shadowColor = '#EF4444'
                            ctx.shadowBlur = 14
                            ctx.fill()
                            ctx.shadowBlur = 0
                        }
                    }

                    // Remove faded points
                    laserTrail.current = laserTrail.current.filter(p => p.alpha > 0)
                }
            }
            animFrameRef.current = requestAnimationFrame(renderLoop)
        }

        animFrameRef.current = requestAnimationFrame(renderLoop)
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        }
    }, [redrawCanvas])

    // Normalized coordinate calculation (0.0 to 1.0)
    const getNormalizedPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        const rawX = e.clientX - rect.left
        const rawY = e.clientY - rect.top
        return {
            x: Math.max(0, Math.min(1, rect.width > 0 ? rawX / rect.width : 0)),
            y: Math.max(0, Math.min(1, rect.height > 0 ? rawY / rect.height : 0))
        }
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPresenter || !isActive) return
        const pos = getNormalizedPos(e)

        if (tool === 'laser') {
            laserTrail.current.push({ ...pos, alpha: 1.0 })
            if (socket && meetingId) {
                socket.emit('screen:annotation:laser', { meetingId, point: pos })
            }
            return
        }

        isDrawing.current = true
        const strokeId = 'str_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
        const newStroke: Stroke = {
            id: strokeId,
            tool,
            color,
            size,
            points: [pos]
        }
        currentStroke.current = newStroke
        setStrokes(prev => [...prev, newStroke])

        if (socket && meetingId) {
            socket.emit('screen:annotation:stroke-start', { meetingId, stroke: newStroke })
        }
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPresenter || !isActive) return
        const pos = getNormalizedPos(e)

        if (tool === 'laser') {
            laserTrail.current.push({ ...pos, alpha: 1.0 })
            if (laserTrail.current.length > 35) {
                laserTrail.current.shift()
            }
            if (socket && meetingId) {
                socket.emit('screen:annotation:laser', { meetingId, point: pos })
            }
            return
        }

        if (!isDrawing.current || !currentStroke.current) return

        currentStroke.current.points.push(pos)

        // Trigger local re-render of current stroke
        setStrokes(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...currentStroke.current! }
            return copy
        })

        // Broadcast point to remote guests
        if (socket && meetingId) {
            socket.emit('screen:annotation:stroke-point', {
                meetingId,
                strokeId: currentStroke.current.id,
                point: pos
            })
        }
    }

    const handlePointerUp = () => {
        if (!isPresenter) return
        if (isDrawing.current && currentStroke.current && socket && meetingId) {
            socket.emit('screen:annotation:stroke-end', {
                meetingId,
                strokeId: currentStroke.current.id
            })
        }
        isDrawing.current = false
        currentStroke.current = null
    }

    const handleClear = () => {
        setStrokes([])
        laserTrail.current = []
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            ctx?.clearRect(0, 0, canvas.width, canvas.height)
        }
        if (socket && meetingId) {
            socket.emit('screen:annotation:clear', { meetingId })
        }
    }

    useEffect(() => {
        if (isActive) {
            const timer = setTimeout(() => {
                resizeCanvas()
            }, 60)
            return () => clearTimeout(timer)
        }
    }, [isActive, resizeCanvas])

    // If presenter has deactivated drawing and viewer has no active strokes/laser, don't block
    if (isPresenter && !isActive) return null

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 40,
            pointerEvents: isPresenter && isActive ? 'auto' : 'none',
            userSelect: 'none',
            overflow: 'hidden'
        }}>
            {/* Canvas Overlay for live strokes & laser trail */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    cursor: (isPresenter && isActive) ? (tool === 'laser' ? 'pointer' : 'crosshair') : 'default',
                    touchAction: 'none'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />

            {/* Floating Annotation Toolbar Pill (ONLY rendered for Presenter when active) */}
            {isPresenter && isActive && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '9999px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(99, 102, 241, 0.25)',
                    zIndex: 100,
                    color: '#ffffff'
                }}>
                    {/* Laser Pointer */}
                    <button
                        type="button"
                        onClick={() => setTool('laser')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: tool === 'laser' ? '1px solid #ef4444' : '1px solid transparent',
                            background: tool === 'laser' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: tool === 'laser' ? '#f87171' : '#e2e8f0',
                            boxShadow: tool === 'laser' ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                        }}
                        title="Laser Pointer (Temporary Glowing Trail)"
                    >
                        <span>🔴</span>
                        <span>Laser</span>
                    </button>

                    {/* Pen */}
                    <button
                        type="button"
                        onClick={() => setTool('pen')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: tool === 'pen' ? '1px solid #3b82f6' : '1px solid transparent',
                            background: tool === 'pen' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: tool === 'pen' ? '#60a5fa' : '#e2e8f0',
                            boxShadow: tool === 'pen' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none'
                        }}
                        title="Freehand Pen"
                    >
                        <span>🖊️</span>
                        <span>Pen</span>
                    </button>

                    {/* Highlighter */}
                    <button
                        type="button"
                        onClick={() => setTool('highlighter')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: tool === 'highlighter' ? '1px solid #eab308' : '1px solid transparent',
                            background: tool === 'highlighter' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: tool === 'highlighter' ? '#facc15' : '#e2e8f0',
                            boxShadow: tool === 'highlighter' ? '0 0 10px rgba(234, 179, 8, 0.4)' : 'none'
                        }}
                        title="Highlighter"
                    >
                        <span>🖍️</span>
                        <span>Highlight</span>
                    </button>

                    {/* Eraser */}
                    <button
                        type="button"
                        onClick={() => setTool('eraser')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: tool === 'eraser' ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                            background: tool === 'eraser' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                            color: '#ffffff'
                        }}
                        title="Eraser"
                    >
                        <span>🧹</span>
                        <span>Eraser</span>
                    </button>

                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

                    {/* Color Picker Palette */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: color === c ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.5)',
                                    backgroundColor: c,
                                    cursor: 'pointer',
                                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                                    boxShadow: color === c ? `0 0 8px ${c}` : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

                    {/* Clear All */}
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '6px 8px',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
                        title="Clear All Annotations"
                    >
                        🗑️
                    </button>

                    {/* Close Annotation Mode */}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                padding: '6px 8px',
                                borderRadius: '9999px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
                            title="Close Annotations"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
