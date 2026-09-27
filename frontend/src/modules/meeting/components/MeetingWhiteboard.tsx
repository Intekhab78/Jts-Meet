import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { jsPDF } from 'jspdf'
import { SocketEvents } from '../services/socket.service'
import {
    IconTrash,
    IconDownload,
    IconUndo,
    IconRedo,
    IconFileText,
    IconChevronLeft,
    IconChevronRight,
    IconGrid,
    IconZoomIn,
    IconZoomOut
} from '../../../components/common/Icons'

interface MeetingWhiteboardProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    socket: Socket | null
    userName?: string
}

type ToolType = 'select' | 'pan' | 'pen' | 'highlighter' | 'eraser' | 'arrow' | 'line' | 'rect' | 'circle' | 'text' | 'sticky' | 'laser' | 'image'
type GridPattern = 'dots' | 'grid' | 'lines' | 'blank'

interface StrokePoint {
    x: number
    y: number
}

interface StrokeData {
    id?: string
    tool: ToolType
    color: string
    size: number
    points: StrokePoint[]
    text?: string
    fontSize?: number
    stickyColor?: string
    fillColor?: string
    imageUrl?: string
    width?: number
    height?: number
}

const USER_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']

const generateStrokeId = () => 'str_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36)

const imageCacheMap = new Map<string, HTMLImageElement>()
function getCachedImage(url: string, onLoaded?: () => void): HTMLImageElement {
    let img = imageCacheMap.get(url)
    if (!img) {
        img = new Image()
        img.src = url
        img.onload = () => onLoaded?.()
        imageCacheMap.set(url, img)
    }
    return img
}

function getStrokeBounds(stroke: StrokeData): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    if (!stroke.points || stroke.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
    }

    if (stroke.tool === 'image') {
        const p = stroke.points[0]
        const w = stroke.width || 240
        const h = stroke.height || 180
        return { minX: p.x, minY: p.y, maxX: p.x + w, maxY: p.y + h, width: w, height: h }
    }

    if (stroke.tool === 'sticky') {
        const p = stroke.points[0]
        const w = stroke.width || 180
        const h = stroke.height || 140
        return { minX: p.x, minY: p.y, maxX: p.x + w, maxY: p.y + h, width: w, height: h }
    }

    if (stroke.tool === 'text') {
        const p = stroke.points[0]
        const fSize = stroke.fontSize || Math.max(16, stroke.size * 4)
        const lines = (stroke.text || '').split('\n')
        const maxLen = Math.max(...lines.map(l => l.length), 1)
        const approxWidth = Math.max(60, maxLen * (fSize * 0.6))
        const approxHeight = Math.max(24, lines.length * (fSize * 1.3))
        return {
            minX: p.x,
            minY: p.y,
            maxX: p.x + approxWidth,
            maxY: p.y + approxHeight,
            width: approxWidth,
            height: approxHeight
        }
    }

    if (stroke.tool === 'circle') {
        const start = stroke.points[0]
        const end = stroke.points[stroke.points.length - 1]
        const radius = Math.hypot(end.x - start.x, end.y - start.y)
        return {
            minX: start.x - radius,
            minY: start.y - radius,
            maxX: start.x + radius,
            maxY: start.y + radius,
            width: radius * 2,
            height: radius * 2
        }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const pt of stroke.points) {
        if (pt.x < minX) minX = pt.x
        if (pt.x > maxX) maxX = pt.x
        if (pt.y < minY) minY = pt.y
        if (pt.y > maxY) maxY = pt.y
    }
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY)
    }
}

function getResizeHandleAtPoint(
    pt: StrokePoint,
    bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
    zoom: number
): 'tl' | 'tr' | 'bl' | 'br' | null {
    const pad = 6
    const bx = bounds.minX - pad
    const by = bounds.minY - pad
    const bw = bounds.width + pad * 2
    const bh = bounds.height + pad * 2
    const handleThreshold = Math.max(10, 14 / zoom)

    const corners: { id: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number }[] = [
        { id: 'tl', x: bx, y: by },
        { id: 'tr', x: bx + bw, y: by },
        { id: 'br', x: bx + bw, y: by + bh },
        { id: 'bl', x: bx, y: by + bh }
    ]

    for (const c of corners) {
        if (Math.hypot(pt.x - c.x, pt.y - c.y) <= handleThreshold) {
            return c.id
        }
    }
    return null
}

function distToSegment(p: StrokePoint, v: StrokePoint, w: StrokePoint) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y)
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)))
}

function isPointInStroke(pt: StrokePoint, stroke: StrokeData): boolean {
    if (!stroke.points || stroke.points.length === 0) return false

    const bounds = getStrokeBounds(stroke)
    const padding = Math.max(8, (stroke.size || 4) + 4)

    if (
        pt.x < bounds.minX - padding ||
        pt.x > bounds.maxX + padding ||
        pt.y < bounds.minY - padding ||
        pt.y > bounds.maxY + padding
    ) {
        return false
    }

    if (stroke.tool === 'rect' || stroke.tool === 'sticky' || stroke.tool === 'text' || stroke.tool === 'image') {
        return true
    }

    if (stroke.tool === 'circle') {
        const start = stroke.points[0]
        const end = stroke.points[stroke.points.length - 1]
        const radius = Math.hypot(end.x - start.x, end.y - start.y)
        const dist = Math.hypot(pt.x - start.x, pt.y - start.y)
        return dist <= radius + padding
    }

    const pts = stroke.points
    for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(pt, pts[i], pts[i + 1]) <= padding) return true
    }
    return false
}

const PRESET_COLORS = [
    '#0f172a', // Jet Slate
    '#2563eb', // Vivid Blue
    '#dc2626', // Bright Crimson
    '#16a34a', // Emerald
    '#d97706', // Warm Amber
    '#7c3aed', // Royal Purple
    '#db2777', // Rose Pink
    '#64748b', // Slate Gray
    '#ffffff'  // Pure White
]

const STICKY_COLORS = [
    { color: '#fef08a', name: 'Yellow' },
    { color: '#bbf7d0', name: 'Mint' },
    { color: '#bfdbfe', name: 'Sky' },
    { color: '#fbcfe8', name: 'Rose' },
    { color: '#fed7aa', name: 'Peach' }
]

// Distinct Modern Whiteboard Tool Icons
const ToolIcons = {
    select: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="m13 13 6 6" />
        </svg>
    ),
    pan: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-4 0v5" />
            <path d="M14 10V4a2 2 0 0 0-4 0v7" />
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
    ),
    pen: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    ),
    highlighter: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 11-6 6v3h3l6-6" />
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        </svg>
    ),
    eraser: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
        </svg>
    ),
    arrow: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="5" />
            <polyline points="9 5 19 5 19 15" />
        </svg>
    ),
    line: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
    ),
    rect: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2.5" />
        </svg>
    ),
    circle: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
        </svg>
    ),
    text: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
    ),
    sticky: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
            <path d="M15 3v6h6" />
        </svg>
    ),
    laser: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill="#ef4444" stroke="#ef4444" />
            <line x1="12" y1="2" x2="12" y2="6" stroke="#ef4444" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="#ef4444" />
            <line x1="2" y1="12" x2="6" y2="12" stroke="#ef4444" />
            <line x1="18" y1="12" x2="22" y2="12" stroke="#ef4444" />
        </svg>
    ),
    image: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
    )
}

export function MeetingWhiteboard({ isOpen, onClose, meetingId, socket, userName }: MeetingWhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const laserCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const imageFileInputRef = useRef<HTMLInputElement | null>(null)

    // Current Tool & Options
    const [tool, setTool] = useState<ToolType>('pen')
    const [color, setColor] = useState<string>('#0f172a')
    const [fillMode, setFillMode] = useState<'none' | 'tint' | 'solid'>('none')
    const [size, setSize] = useState<number>(4)
    const [stickyColor, setStickyColor] = useState<string>('#fef08a')
    const [gridPattern, setGridPattern] = useState<GridPattern>('dots')

    // Multi-page slides
    const [pages, setPages] = useState<StrokeData[][]>([[]])
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0)
    const currentPageIndexRef = useRef<number>(0)
    currentPageIndexRef.current = currentPageIndex

    // Zoom & Pan viewport
    const [zoom, setZoom] = useState<number>(1)
    const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
    const isPanningRef = useRef(false)
    const panStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })

    // Selection, Drag & Resize state
    const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null)
    const selectedStrokeIdRef = useRef<string | null>(null)
    selectedStrokeIdRef.current = selectedStrokeId
    const isDraggingObjectRef = useRef(false)
    const dragStartRef = useRef<StrokePoint>({ x: 0, y: 0 })
    const initialStrokePointsRef = useRef<StrokePoint[]>([])
    const hasMovedRef = useRef(false)
    const [isHoveringObject, setIsHoveringObject] = useState(false)
    const [activeHandleCursor, setActiveHandleCursor] = useState<string | null>(null)

    const isResizingRef = useRef(false)
    const activeHandleRef = useRef<'tl' | 'tr' | 'bl' | 'br' | null>(null)
    const resizeStartBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }>({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 })
    const resizeOriginPtRef = useRef<StrokePoint>({ x: 0, y: 0 })

    // Clipboard & Collaborators
    const clipboardStrokeRef = useRef<StrokeData | null>(null)
    const remoteCursorsRef = useRef<Map<string, { userId?: string; x: number; y: number; name: string; color: string; timestamp: number }>>(new Map())
    const lastCursorEmitRef = useRef<number>(0)
    const myColorRef = useRef<string>(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)])
    const myName = userName || (typeof window !== 'undefined' ? localStorage.getItem('user_name') || 'Participant' : 'Participant')

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false)
    const currentPointsRef = useRef<StrokePoint[]>([])
    const strokesHistoryRef = useRef<StrokeData[]>([])
    const redoStackRef = useRef<StrokeData[]>([])

    // Interactive inputs
    const [activeTextInput, setActiveTextInput] = useState<{ x: number, y: number } | null>(null)
    const [textValue, setTextValue] = useState('')
    const textInputRef = useRef<HTMLInputElement | null>(null)

    const [activeStickyInput, setActiveStickyInput] = useState<{ x: number, y: number } | null>(null)
    const [stickyValue, setStickyValue] = useState('')
    const stickyInputRef = useRef<HTMLTextAreaElement | null>(null)

    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [showPatternMenu, setShowPatternMenu] = useState(false)

    // Laser trail
    const laserTrailRef = useRef<{ x: number, y: number, timestamp: number }[]>([])
    const laserAnimRef = useRef<number | null>(null)

    const updateUndoRedoStates = useCallback(() => {
        setCanUndo(strokesHistoryRef.current.length > 0)
        setCanRedo(redoStackRef.current.length > 0)
    }, [])

    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeData) => {
        if (!stroke.points || stroke.points.length === 0) return

        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.lineWidth = stroke.size * 2.5
        } else if (stroke.tool === 'highlighter') {
            ctx.globalAlpha = 0.35
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.size * 3.5
        } else {
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.size
        }

        if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === 'eraser') {
            if (stroke.points.length >= 2) {
                ctx.beginPath()
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
                }
                ctx.stroke()
            }
        } else if (stroke.tool === 'line') {
            if (stroke.points.length >= 2) {
                const start = stroke.points[0]
                const end = stroke.points[stroke.points.length - 1]
                ctx.beginPath()
                ctx.moveTo(start.x, start.y)
                ctx.lineTo(end.x, end.y)
                ctx.stroke()
            }
        } else if (stroke.tool === 'arrow') {
            if (stroke.points.length >= 2) {
                const start = stroke.points[0]
                const end = stroke.points[stroke.points.length - 1]
                const angle = Math.atan2(end.y - start.y, end.x - start.x)
                const headLength = Math.max(14, stroke.size * 3.5)

                ctx.beginPath()
                ctx.moveTo(start.x, start.y)
                ctx.lineTo(end.x, end.y)
                ctx.stroke()

                // Solid Arrowhead
                ctx.beginPath()
                ctx.moveTo(end.x, end.y)
                ctx.lineTo(
                    end.x - headLength * Math.cos(angle - Math.PI / 6),
                    end.y - headLength * Math.sin(angle - Math.PI / 6)
                )
                ctx.lineTo(
                    end.x - headLength * Math.cos(angle + Math.PI / 6),
                    end.y - headLength * Math.sin(angle + Math.PI / 6)
                )
                ctx.closePath()
                ctx.fillStyle = stroke.color
                ctx.fill()
            }
        } else if (stroke.tool === 'rect') {
            if (stroke.points.length >= 2) {
                const start = stroke.points[0]
                const end = stroke.points[stroke.points.length - 1]
                const rx = Math.min(start.x, end.x)
                const ry = Math.min(start.y, end.y)
                const rw = Math.abs(end.x - start.x)
                const rh = Math.abs(end.y - start.y)

                if (stroke.fillColor && stroke.fillColor !== 'transparent') {
                    ctx.fillStyle = stroke.fillColor
                    ctx.fillRect(rx, ry, rw, rh)
                }
                ctx.beginPath()
                ctx.strokeRect(rx, ry, rw, rh)
            }
        } else if (stroke.tool === 'circle') {
            if (stroke.points.length >= 2) {
                const start = stroke.points[0]
                const end = stroke.points[stroke.points.length - 1]
                const radius = Math.hypot(end.x - start.x, end.y - start.y)
                ctx.beginPath()
                ctx.arc(start.x, start.y, radius, 0, Math.PI * 2)
                if (stroke.fillColor && stroke.fillColor !== 'transparent') {
                    ctx.fillStyle = stroke.fillColor
                    ctx.fill()
                }
                ctx.stroke()
            }
        } else if (stroke.tool === 'image' && stroke.imageUrl) {
            if (stroke.points.length > 0) {
                const start = stroke.points[0]
                const w = stroke.width || 240
                const h = stroke.height || 180
                const img = getCachedImage(stroke.imageUrl, () => redrawAll())
                if (img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, start.x, start.y, w, h)
                } else {
                    ctx.fillStyle = '#f1f5f9'
                    ctx.fillRect(start.x, start.y, w, h)
                    ctx.strokeStyle = '#94a3b8'
                    ctx.strokeRect(start.x, start.y, w, h)
                }
            }
        } else if (stroke.tool === 'text') {
            if (stroke.text && stroke.points.length > 0) {
                ctx.fillStyle = stroke.color
                const fSize = stroke.fontSize || Math.max(16, stroke.size * 4)
                ctx.font = `600 ${fSize}px Inter, -apple-system, sans-serif`
                ctx.textBaseline = 'top'
                const lines = stroke.text.split('\n')
                lines.forEach((line, idx) => {
                    ctx.fillText(line, stroke.points[0].x, stroke.points[0].y + idx * (fSize * 1.3))
                })
            }
        } else if (stroke.tool === 'sticky') {
            if (stroke.points.length > 0) {
                const x = stroke.points[0].x
                const y = stroke.points[0].y
                const w = 180
                const h = 140
                const r = 8

                // Subtle shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.14)'
                ctx.shadowBlur = 12
                ctx.shadowOffsetY = 4
                ctx.fillStyle = stroke.stickyColor || '#fef08a'
                ctx.beginPath()
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(x, y, w, h, r)
                } else {
                    ctx.rect(x, y, w, h)
                }
                ctx.fill()
                ctx.shadowColor = 'transparent'

                // Top tape accent
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
                ctx.beginPath()
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(x, y, w, 24, [r, r, 0, 0])
                } else {
                    ctx.rect(x, y, w, 24)
                }
                ctx.fill()

                if (stroke.text) {
                    ctx.fillStyle = '#1e293b'
                    ctx.font = '500 13px Inter, -apple-system, sans-serif'
                    ctx.textBaseline = 'top'

                    const words = stroke.text.split(' ')
                    let curLine = ''
                    let lineY = y + 30
                    const maxW = w - 18
                    for (let n = 0; n < words.length; n++) {
                        const testLine = curLine + words[n] + ' '
                        const metrics = ctx.measureText(testLine)
                        if (metrics.width > maxW && n > 0) {
                            ctx.fillText(curLine, x + 9, lineY)
                            curLine = words[n] + ' '
                            lineY += 17
                        } else {
                            curLine = testLine
                        }
                    }
                    ctx.fillText(curLine, x + 9, lineY)
                }
            }
        }

        ctx.restore()
    }

    const redrawAll = useCallback((ctx?: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const context = ctx || canvas.getContext('2d')
        if (!context) return

        context.save()
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        const dpr = window.devicePixelRatio || 1
        context.scale(dpr, dpr)
        context.translate(pan.x, pan.y)
        context.scale(zoom, zoom)

        strokesHistoryRef.current.forEach((stroke) => drawStroke(context, stroke))

        // Render selection highlight & bounding box
        if (selectedStrokeIdRef.current) {
            const selStroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
            if (selStroke) {
                const b = getStrokeBounds(selStroke)
                const pad = 6
                const bx = b.minX - pad
                const by = b.minY - pad
                const bw = b.width + pad * 2
                const bh = b.height + pad * 2

                context.save()
                context.strokeStyle = '#6366f1'
                context.lineWidth = Math.max(1.2, 1.8 / zoom)
                context.setLineDash([6 / zoom, 4 / zoom])
                context.strokeRect(bx, by, bw, bh)
                context.setLineDash([])

                // Corner handles
                const hSize = Math.max(6, 8 / zoom)
                const handles = [
                    { x: bx, y: by },
                    { x: bx + bw, y: by },
                    { x: bx, y: by + bh },
                    { x: bx + bw, y: by + bh }
                ]
                handles.forEach(h => {
                    context.fillStyle = '#ffffff'
                    context.fillRect(h.x - hSize / 2, h.y - hSize / 2, hSize, hSize)
                    context.strokeStyle = '#4f46e5'
                    context.lineWidth = Math.max(1.2, 1.6 / zoom)
                    context.strokeRect(h.x - hSize / 2, h.y - hSize / 2, hSize, hSize)
                })
                context.restore()
            }
        }

        context.restore()
    }, [pan, zoom])

    const deleteSelectedStroke = useCallback(() => {
        if (!selectedStrokeIdRef.current) return
        const idToDelete = selectedStrokeIdRef.current
        const strokeToDelete = strokesHistoryRef.current.find(s => s.id === idToDelete)
        if (!strokeToDelete) {
            setSelectedStrokeId(null)
            selectedStrokeIdRef.current = null
            return
        }

        redoStackRef.current.push(strokeToDelete)
        strokesHistoryRef.current = strokesHistoryRef.current.filter(s => s.id !== idToDelete)
        setSelectedStrokeId(null)
        selectedStrokeIdRef.current = null
        updateUndoRedoStates()
        redrawAll()

        socket?.emit('whiteboard:sync_page', {
            meetingId,
            pageIndex: currentPageIndex,
            strokes: strokesHistoryRef.current
        })
    }, [meetingId, currentPageIndex, socket, updateUndoRedoStates, redrawAll])

    const duplicateSelectedStroke = useCallback(() => {
        if (!selectedStrokeIdRef.current) return
        const strokeToDup = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
        if (!strokeToDup) return

        const offset = 24
        const dupId = generateStrokeId()
        const newStroke: StrokeData = {
            ...strokeToDup,
            id: dupId,
            points: strokeToDup.points.map(p => ({ x: p.x + offset, y: p.y + offset }))
        }

        strokesHistoryRef.current.push(newStroke)
        setSelectedStrokeId(dupId)
        selectedStrokeIdRef.current = dupId
        updateUndoRedoStates()
        redrawAll()

        socket?.emit('whiteboard:sync_page', {
            meetingId,
            pageIndex: currentPageIndex,
            strokes: strokesHistoryRef.current
        })
    }, [meetingId, currentPageIndex, socket, updateUndoRedoStates, redrawAll])

    const handleColorChange = useCallback((newColor: string) => {
        setColor(newColor)
        if (selectedStrokeIdRef.current) {
            const stroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
            if (stroke) {
                stroke.color = newColor
                if (stroke.fillColor) {
                    if (fillMode === 'solid') stroke.fillColor = newColor
                    else if (fillMode === 'tint') stroke.fillColor = newColor.startsWith('#') ? `${newColor}33` : newColor
                }
                redrawAll()
                socket?.emit('whiteboard:sync_page', {
                    meetingId,
                    pageIndex: currentPageIndex,
                    strokes: strokesHistoryRef.current
                })
            }
        }
    }, [fillMode, meetingId, currentPageIndex, socket, redrawAll])

    const handleSizeChange = useCallback((newSize: number) => {
        setSize(newSize)
        if (selectedStrokeIdRef.current) {
            const stroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
            if (stroke) {
                stroke.size = newSize
                redrawAll()
                socket?.emit('whiteboard:sync_page', {
                    meetingId,
                    pageIndex: currentPageIndex,
                    strokes: strokesHistoryRef.current
                })
            }
        }
    }, [meetingId, currentPageIndex, socket, redrawAll])

    const handleFillModeChange = useCallback((mode: 'none' | 'tint' | 'solid') => {
        setFillMode(mode)
        if (selectedStrokeIdRef.current) {
            const stroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
            if (stroke && (stroke.tool === 'rect' || stroke.tool === 'circle')) {
                if (mode === 'none') {
                    stroke.fillColor = undefined
                } else if (mode === 'solid') {
                    stroke.fillColor = stroke.color || color
                } else if (mode === 'tint') {
                    const base = stroke.color || color
                    stroke.fillColor = base.startsWith('#') ? `${base}33` : base
                }
                redrawAll()
                socket?.emit('whiteboard:sync_page', {
                    meetingId,
                    pageIndex: currentPageIndex,
                    strokes: strokesHistoryRef.current
                })
            }
        }
    }, [color, meetingId, currentPageIndex, socket, redrawAll])

    // Resize canvas
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current
        const laserCanvas = laserCanvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1

        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        if (laserCanvas) {
            laserCanvas.width = rect.width * dpr
            laserCanvas.height = rect.height * dpr
        }

        redrawAll()
    }, [redrawAll])

    // Laser pointer & Collaborator Cursors animation loop
    const renderLaser = useCallback(() => {
        const laserCanvas = laserCanvasRef.current
        if (!laserCanvas) return
        const ctx = laserCanvas.getContext('2d')
        if (!ctx) return

        const now = Date.now()
        laserTrailRef.current = laserTrailRef.current.filter((p) => now - p.timestamp < 800)

        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, laserCanvas.width, laserCanvas.height)

        const dpr = window.devicePixelRatio || 1
        ctx.scale(dpr, dpr)

        // 1. Laser Trail
        if (laserTrailRef.current.length > 0) {
            laserTrailRef.current.forEach((pt) => {
                const age = now - pt.timestamp
                const alpha = Math.max(0, 1 - age / 800)

                const screenX = pt.x * zoom + pan.x
                const screenY = pt.y * zoom + pan.y

                ctx.beginPath()
                ctx.arc(screenX, screenY, 9, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.35})`
                ctx.fill()

                ctx.beginPath()
                ctx.arc(screenX, screenY, 4, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`
                ctx.fill()

                ctx.beginPath()
                ctx.arc(screenX, screenY, 1.5, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
                ctx.fill()
            })
        }

        // 2. Collaborator Cursors
        if (remoteCursorsRef.current.size > 0) {
            remoteCursorsRef.current.forEach((cur, id) => {
                const age = now - cur.timestamp
                if (age > 4000) {
                    remoteCursorsRef.current.delete(id)
                    return
                }
                const alpha = Math.max(0, 1 - age / 4000)
                const screenX = cur.x * zoom + pan.x
                const screenY = cur.y * zoom + pan.y

                ctx.save()
                ctx.globalAlpha = alpha
                ctx.translate(screenX, screenY)

                // Cursor pointer
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(0, 14)
                ctx.lineTo(3.5, 10.5)
                ctx.lineTo(7, 17)
                ctx.lineTo(9.5, 15.5)
                ctx.lineTo(6, 9)
                ctx.lineTo(12, 9)
                ctx.closePath()
                ctx.fillStyle = cur.color || '#6366f1'
                ctx.fill()
                ctx.strokeStyle = '#ffffff'
                ctx.lineWidth = 1.2
                ctx.stroke()

                // Name badge
                const nameText = cur.name || 'User'
                ctx.font = '700 11px Inter, sans-serif'
                const textW = ctx.measureText(nameText).width
                const pW = textW + 12
                const pH = 18
                const pX = 12
                const pY = 10

                ctx.fillStyle = cur.color || '#6366f1'
                if (typeof ctx.roundRect === 'function') {
                    ctx.beginPath()
                    ctx.roundRect(pX, pY, pW, pH, 4)
                    ctx.fill()
                } else {
                    ctx.fillRect(pX, pY, pW, pH)
                }

                ctx.fillStyle = '#ffffff'
                ctx.textBaseline = 'middle'
                ctx.fillText(nameText, pX + 6, pY + pH / 2)

                ctx.restore()
            })
        }

        ctx.restore()

        if (laserTrailRef.current.length > 0 || remoteCursorsRef.current.size > 0) {
            laserAnimRef.current = requestAnimationFrame(renderLaser)
        } else {
            laserAnimRef.current = null
        }
    }, [pan, zoom])

    const triggerRenderOverlay = useCallback(() => {
        if (!laserAnimRef.current) {
            laserAnimRef.current = requestAnimationFrame(renderLaser)
        }
    }, [renderLaser])

    const addLaserPoint = useCallback((x: number, y: number) => {
        laserTrailRef.current.push({ x, y, timestamp: Date.now() })
        triggerRenderOverlay()
    }, [triggerRenderOverlay])

    useEffect(() => {
        if (isOpen) {
            setTimeout(resizeCanvas, 50)
            window.addEventListener('resize', resizeCanvas)
            return () => {
                window.removeEventListener('resize', resizeCanvas)
                if (laserAnimRef.current) cancelAnimationFrame(laserAnimRef.current)
            }
        }
    }, [isOpen, resizeCanvas])

    useEffect(() => {
        redrawAll()
    }, [selectedStrokeId, redrawAll])

    // Socket listeners
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

        const handleRemoteLaser = (payload: { x: number, y: number }) => {
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
    }, [socket, isOpen, meetingId, addLaserPoint, triggerRenderOverlay, updateUndoRedoStates, redrawAll])

    // Image Upload handler
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (dataUrl) {
                const img = new Image()
                img.onload = () => {
                    const maxW = 440
                    const maxH = 340
                    let w = img.naturalWidth || 320
                    let h = img.naturalHeight || 240
                    if (w > maxW || h > maxH) {
                        const ratio = Math.min(maxW / w, maxH / h)
                        w = Math.round(w * ratio)
                        h = Math.round(h * ratio)
                    }
                    const spawnX = (-pan.x + 120) / zoom
                    const spawnY = (-pan.y + 120) / zoom
                    const imgStrokeId = generateStrokeId()
                    const newStroke: StrokeData = {
                        id: imgStrokeId,
                        tool: 'image',
                        color: '#000000',
                        size: 1,
                        points: [{ x: spawnX, y: spawnY }],
                        imageUrl: dataUrl,
                        width: w,
                        height: h
                    }
                    strokesHistoryRef.current.push(newStroke)
                    setSelectedStrokeId(imgStrokeId)
                    selectedStrokeIdRef.current = imgStrokeId
                    updateUndoRedoStates()
                    redrawAll()
                    socket?.emit('whiteboard:sync_page', {
                        meetingId,
                        pageIndex: currentPageIndex,
                        strokes: strokesHistoryRef.current
                    })
                }
                img.src = dataUrl
            }
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    // Clipboard Paste Listener for Images and Object Cloning
    const handlePaste = useCallback((e: ClipboardEvent) => {
        const target = e.target as HTMLElement
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

        const items = e.clipboardData?.items
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile()
                    if (blob) {
                        e.preventDefault()
                        const reader = new FileReader()
                        reader.onload = (event) => {
                            const dataUrl = event.target?.result as string
                            if (dataUrl) {
                                const img = new Image()
                                img.onload = () => {
                                    const maxW = 440
                                    const maxH = 340
                                    let w = img.naturalWidth || 320
                                    let h = img.naturalHeight || 240
                                    if (w > maxW || h > maxH) {
                                        const ratio = Math.min(maxW / w, maxH / h)
                                        w = Math.round(w * ratio)
                                        h = Math.round(h * ratio)
                                    }
                                    const spawnX = (-pan.x + 120) / zoom
                                    const spawnY = (-pan.y + 120) / zoom
                                    const pastedImgId = generateStrokeId()
                                    const newStroke: StrokeData = {
                                        id: pastedImgId,
                                        tool: 'image',
                                        color: '#000000',
                                        size: 1,
                                        points: [{ x: spawnX, y: spawnY }],
                                        imageUrl: dataUrl,
                                        width: w,
                                        height: h
                                    }
                                    strokesHistoryRef.current.push(newStroke)
                                    setSelectedStrokeId(pastedImgId)
                                    selectedStrokeIdRef.current = pastedImgId
                                    updateUndoRedoStates()
                                    redrawAll()
                                    socket?.emit('whiteboard:sync_page', {
                                        meetingId,
                                        pageIndex: currentPageIndex,
                                        strokes: strokesHistoryRef.current
                                    })
                                }
                                img.src = dataUrl
                            }
                        }
                        reader.readAsDataURL(blob)
                        return
                    }
                }
            }
        }

        // Paste duplicated object from memory
        if (clipboardStrokeRef.current) {
            e.preventDefault()
            const copy = clipboardStrokeRef.current
            const offset = 24
            const pastedId = generateStrokeId()
            const newStroke: StrokeData = {
                ...copy,
                id: pastedId,
                points: copy.points.map(p => ({ x: p.x + offset, y: p.y + offset }))
            }
            strokesHistoryRef.current.push(newStroke)
            setSelectedStrokeId(pastedId)
            selectedStrokeIdRef.current = pastedId
            clipboardStrokeRef.current = newStroke
            updateUndoRedoStates()
            redrawAll()
            socket?.emit('whiteboard:sync_page', {
                meetingId,
                pageIndex: currentPageIndex,
                strokes: strokesHistoryRef.current
            })
        }
    }, [pan, zoom, meetingId, currentPageIndex, socket, updateUndoRedoStates, redrawAll])

    // Keyboard shortcuts & Paste registration
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault()
                handleUndo()
                return
            }
            if (
                ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
            ) {
                e.preventDefault()
                handleRedo()
                return
            }

            // Duplicate selected shape (Ctrl+D)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedStrokeIdRef.current) {
                e.preventDefault()
                duplicateSelectedStroke()
                return
            }

            // Copy selected shape (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedStrokeIdRef.current) {
                const s = strokesHistoryRef.current.find(st => st.id === selectedStrokeIdRef.current)
                if (s) clipboardStrokeRef.current = s
                return
            }

            // Delete selected shape
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStrokeIdRef.current) {
                e.preventDefault()
                deleteSelectedStroke()
                return
            }

            switch (e.key.toLowerCase()) {
                case 'v': setTool('select'); break
                case 'h': setTool('pan'); break
                case 'p': setTool('pen'); break
                case 'm': setTool('highlighter'); break
                case 'e': setTool('eraser'); break
                case 'a': setTool('arrow'); break
                case 'l': setTool('line'); break
                case 'r': setTool('rect'); break
                case 'c': setTool('circle'); break
                case 't': setTool('text'); break
                case 's': setTool('sticky'); break
                case 'i': imageFileInputRef.current?.click(); break
                case 'z': setTool('laser'); break
                case '=':
                case '+':
                    handleZoom(0.15)
                    break
                case '-':
                    handleZoom(-0.15)
                    break
                case '0':
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                    break
                case 'escape':
                    setSelectedStrokeId(null)
                    selectedStrokeIdRef.current = null
                    setActiveTextInput(null)
                    setActiveStickyInput(null)
                    setShowExportMenu(false)
                    setShowPatternMenu(false)
                    redrawAll()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('paste', handlePaste)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('paste', handlePaste)
        }
    }, [isOpen, zoom, deleteSelectedStroke, duplicateSelectedStroke, handlePaste, redrawAll])

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): StrokePoint => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        }
    }

    // Zoom Handlers
    const handleZoom = (delta: number) => {
        setZoom(prev => Math.min(2.5, Math.max(0.4, Number((prev + delta).toFixed(2)))))
    }

    const resetZoomAndPan = () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }

    // Multi-page Handlers
    const switchPage = (targetIndex: number) => {
        if (targetIndex < 0 || targetIndex >= pages.length || targetIndex === currentPageIndex) return

        commitActiveText()
        commitActiveSticky()

        const currentStrokes = [...strokesHistoryRef.current]
        setPages(prev => {
            const next = [...prev]
            next[currentPageIndex] = currentStrokes
            return next
        })

        const targetStrokes = pages[targetIndex] || []
        strokesHistoryRef.current = [...targetStrokes]
        redoStackRef.current = []
        setCurrentPageIndex(targetIndex)
        currentPageIndexRef.current = targetIndex
        updateUndoRedoStates()
        setTimeout(redrawAll, 20)
    }

    const addPage = () => {
        commitActiveText()
        commitActiveSticky()

        const currentStrokes = [...strokesHistoryRef.current]
        let nextIndex = 0
        setPages(prev => {
            const updated = [...prev]
            updated[currentPageIndex] = currentStrokes
            updated.push([])
            nextIndex = updated.length - 1
            return updated
        })

        setCurrentPageIndex(nextIndex)
        currentPageIndexRef.current = nextIndex
        strokesHistoryRef.current = []
        redoStackRef.current = []
        updateUndoRedoStates()
        setTimeout(redrawAll, 20)

        socket?.emit('whiteboard:page_add', { meetingId })
    }

    const deleteCurrentPage = () => {
        if (pages.length <= 1) return
        const delIdx = currentPageIndex
        const nextIndex = Math.max(0, currentPageIndex - 1)

        setPages(prev => {
            const next = prev.filter((_, idx) => idx !== delIdx)
            return next
        })

        setCurrentPageIndex(nextIndex)
        currentPageIndexRef.current = nextIndex
        strokesHistoryRef.current = [...(pages[nextIndex] || [])]
        redoStackRef.current = []
        updateUndoRedoStates()
        setTimeout(redrawAll, 20)

        socket?.emit('whiteboard:page_delete', { meetingId, pageIndex: delIdx })
    }

    // Commit active Text note
    const commitActiveText = useCallback(() => {
        if (!activeTextInput) return
        const trimmed = textValue.trim()
        if (trimmed) {
            const newStroke: StrokeData = {
                id: generateStrokeId(),
                tool: 'text',
                color,
                size,
                points: [{ x: activeTextInput.x, y: activeTextInput.y }],
                text: trimmed,
                fontSize: Math.max(16, size * 4)
            }
            strokesHistoryRef.current.push(newStroke)
            redoStackRef.current = []
            updateUndoRedoStates()
            redrawAll()

            socket?.emit(SocketEvents.WHITEBOARD_DRAW, {
                meetingId,
                stroke: newStroke,
                pageIndex: currentPageIndex
            })
        }
        setActiveTextInput(null)
        setTextValue('')
    }, [activeTextInput, textValue, color, size, meetingId, socket, currentPageIndex, updateUndoRedoStates, redrawAll])

    // Commit active Sticky note
    const commitActiveSticky = useCallback(() => {
        if (!activeStickyInput) return
        const trimmed = stickyValue.trim()
        if (trimmed) {
            const newStroke: StrokeData = {
                id: generateStrokeId(),
                tool: 'sticky',
                color: '#1e293b',
                size: 1,
                points: [{ x: activeStickyInput.x, y: activeStickyInput.y }],
                text: trimmed,
                stickyColor
            }
            strokesHistoryRef.current.push(newStroke)
            redoStackRef.current = []
            updateUndoRedoStates()
            redrawAll()

            socket?.emit(SocketEvents.WHITEBOARD_DRAW, {
                meetingId,
                stroke: newStroke,
                pageIndex: currentPageIndex
            })
        }
        setActiveStickyInput(null)
        setStickyValue('')
    }, [activeStickyInput, stickyValue, stickyColor, meetingId, socket, currentPageIndex, updateUndoRedoStates, redrawAll])

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
            commitActiveText()
            setActiveTextInput({ x: pt.x, y: pt.y })
            setTextValue('')
            setTimeout(() => textInputRef.current?.focus(), 50)
            return
        }

        if (tool === 'sticky') {
            commitActiveSticky()
            setActiveStickyInput({ x: pt.x, y: pt.y })
            setStickyValue('')
            setTimeout(() => stickyInputRef.current?.focus(), 50)
            return
        }

        if (tool === 'laser') {
            addLaserPoint(pt.x, pt.y)
            socket?.emit('whiteboard:laser', { meetingId, x: pt.x, y: pt.y })
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
            socket?.emit('whiteboard:cursor', {
                meetingId,
                x: pt.x,
                y: pt.y,
                name: myName,
                color: myColorRef.current
            })
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
                        let newW = orig.width
                        let newH = orig.height

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
            socket?.emit('whiteboard:laser', { meetingId, x: pt.x, y: pt.y })
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
            drawStroke(ctx, { tool, color, size, points: lastTwo })
            ctx.restore()
        } else {
            redrawAll(ctx)
            ctx.save()
            const dpr = window.devicePixelRatio || 1
            ctx.scale(dpr, dpr)
            ctx.translate(pan.x, pan.y)
            ctx.scale(zoom, zoom)
            drawStroke(ctx, { tool, color, size, points: currentPointsRef.current })
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
                    socket?.emit('whiteboard:sync_page', {
                        meetingId,
                        pageIndex: currentPageIndex,
                        strokes: strokesHistoryRef.current
                    })
                }
            }
            if (isDraggingObjectRef.current) {
                isDraggingObjectRef.current = false
                if (hasMovedRef.current && selectedStrokeIdRef.current) {
                    redoStackRef.current = []
                    updateUndoRedoStates()
                    socket?.emit('whiteboard:sync_page', {
                        meetingId,
                        pageIndex: currentPageIndex,
                        strokes: strokesHistoryRef.current
                    })
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

            socket?.emit(SocketEvents.WHITEBOARD_DRAW, {
                meetingId,
                stroke: newStroke,
                pageIndex: currentPageIndex
            })
        }
        currentPointsRef.current = []
    }

    const handleClear = () => {
        strokesHistoryRef.current = []
        redoStackRef.current = []
        setSelectedStrokeId(null)
        selectedStrokeIdRef.current = null
        updateUndoRedoStates()
        redrawAll()
        socket?.emit(SocketEvents.WHITEBOARD_CLEAR, { meetingId, pageIndex: currentPageIndex })
    }

    const handleUndo = () => {
        const popped = strokesHistoryRef.current.pop()
        if (popped) {
            redoStackRef.current.push(popped)
            if (selectedStrokeIdRef.current === popped.id) {
                setSelectedStrokeId(null)
                selectedStrokeIdRef.current = null
            }
            updateUndoRedoStates()
            redrawAll()
            socket?.emit('whiteboard:sync_page', {
                meetingId,
                pageIndex: currentPageIndex,
                strokes: strokesHistoryRef.current
            })
        }
    }

    const handleRedo = () => {
        const restored = redoStackRef.current.pop()
        if (restored) {
            strokesHistoryRef.current.push(restored)
            updateUndoRedoStates()
            redrawAll()
            socket?.emit('whiteboard:sync_page', {
                meetingId,
                pageIndex: currentPageIndex,
                strokes: strokesHistoryRef.current
            })
        }
    }

    // Export as Crisp PNG
    const handleExportPNG = () => {
        setShowExportMenu(false)
        const canvas = canvasRef.current
        if (!canvas) return
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = canvas.width
        exportCanvas.height = canvas.height
        const expCtx = exportCanvas.getContext('2d')
        if (expCtx) {
            expCtx.fillStyle = '#ffffff'
            expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
            const dpr = window.devicePixelRatio || 1
            expCtx.scale(dpr, dpr)
            strokesHistoryRef.current.forEach(s => drawStroke(expCtx, s))

            const link = document.createElement('a')
            link.download = `whiteboard_page_${currentPageIndex + 1}_${Date.now()}.png`
            link.href = exportCanvas.toDataURL('image/png')
            link.click()
        }
    }

    // Export as Multi-Page PDF
    const handleExportPDF = () => {
        setShowExportMenu(false)
        const canvas = canvasRef.current
        if (!canvas) return

        const allPages = [...pages]
        allPages[currentPageIndex] = [...strokesHistoryRef.current]

        const width = canvas.width
        const height = canvas.height
        const dpr = window.devicePixelRatio || 1

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [width, height]
        })

        const offscreenCanvas = document.createElement('canvas')
        offscreenCanvas.width = width
        offscreenCanvas.height = height
        const offCtx = offscreenCanvas.getContext('2d')
        if (!offCtx) return

        allPages.forEach((pageStrokes, index) => {
            if (index > 0) {
                doc.addPage([width, height], 'landscape')
            }
            offCtx.fillStyle = '#ffffff'
            offCtx.fillRect(0, 0, width, height)
            offCtx.save()
            offCtx.scale(dpr, dpr)
            pageStrokes.forEach(s => drawStroke(offCtx, s))
            offCtx.restore()

            const imgData = offscreenCanvas.toDataURL('image/png')
            doc.addImage(imgData, 'PNG', 0, 0, width, height)
        })

        doc.save(`whiteboard_${meetingId}_${Date.now()}.pdf`)
    }

    if (!isOpen) return null

    // Background style based on selected pattern
    const getPatternStyle = () => {
        switch (gridPattern) {
            case 'dots':
                return {
                    backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }
            case 'grid':
                return {
                    backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }
            case 'lines':
                return {
                    backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px)',
                    backgroundSize: `100% ${28 * zoom}px`,
                    backgroundPosition: `0px ${pan.y}px`
                }
            case 'blank':
            default:
                return {}
        }
    }

    // Categorized tools definition
    const TOOL_GROUPS: {
        id: string
        tools: { id: ToolType; label: string; shortcut: string; icon: React.ReactNode }[]
    }[] = [
            {
                id: 'navigate',
                tools: [
                    { id: 'select', label: 'Select & Move', shortcut: 'V', icon: ToolIcons.select },
                    { id: 'pan', label: 'Hand Tool', shortcut: 'H', icon: ToolIcons.pan }
                ]
            },
            {
                id: 'draw',
                tools: [
                    { id: 'pen', label: 'Pen', shortcut: 'P', icon: ToolIcons.pen },
                    { id: 'highlighter', label: 'Highlighter', shortcut: 'M', icon: ToolIcons.highlighter },
                    { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: ToolIcons.eraser }
                ]
            },
            {
                id: 'shapes',
                tools: [
                    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ToolIcons.arrow },
                    { id: 'line', label: 'Line', shortcut: 'L', icon: ToolIcons.line },
                    { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: ToolIcons.rect },
                    { id: 'circle', label: 'Circle', shortcut: 'C', icon: ToolIcons.circle }
                ]
            },
            {
                id: 'annotate',
                tools: [
                    { id: 'text', label: 'Text Note', shortcut: 'T', icon: ToolIcons.text },
                    { id: 'sticky', label: 'Sticky Note', shortcut: 'S', icon: ToolIcons.sticky },
                    { id: 'image', label: 'Insert Image', shortcut: 'I', icon: ToolIcons.image },
                    { id: 'laser', label: 'Laser Pointer', shortcut: 'Z', icon: ToolIcons.laser }
                ]
            }
        ]

    const showColorPalette = ['pen', 'highlighter', 'arrow', 'line', 'rect', 'circle', 'text'].includes(tool)
    const showStickyPalette = tool === 'sticky'
    const showFillMode = (tool === 'rect' || tool === 'circle') ||
        (tool === 'select' && !!selectedStrokeId && (() => {
            const sel = strokesHistoryRef.current.find(s => s.id === selectedStrokeId)
            return sel?.tool === 'rect' || sel?.tool === 'circle'
        })())

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9900,
            display: 'flex', flexDirection: 'column',
            background: 'rgba(10, 11, 15, 0.98)', backdropFilter: 'blur(16px)',
            fontFamily: 'Inter, -apple-system, sans-serif'
        }}>
            {/* 1. TOP HEADER: Clean, Minimal, Enterprise Grade */}
            <div style={{
                height: 52, padding: '0 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(17, 19, 27, 0.94)',
                backdropFilter: 'blur(12px)',
                zIndex: 30
            }}>
                {/* Left: Branding & Multi-Page Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                            width: 26, height: 26, borderRadius: 7,
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                        }}>
                            <span style={{ fontSize: 13, fontWeight: 900 }}>W</span>
                        </div>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                            Whiteboard
                        </span>
                        {/* Live Sync Indicator */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '2px 8px', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, color: '#34d399'
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            Live Sync
                        </div>
                    </div>

                    <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.1)' }} />

                    {/* Page Navigation Strip */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '3px 8px', borderRadius: 8
                    }}>
                        <button
                            onClick={() => switchPage(currentPageIndex - 1)}
                            disabled={currentPageIndex === 0}
                            title="Previous Slide"
                            style={{
                                border: 'none', background: 'transparent',
                                color: currentPageIndex === 0 ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                                cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                                padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4
                            }}
                        >
                            <IconChevronLeft size={14} />
                        </button>

                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9', minWidth: 64, textAlign: 'center' }}>
                            Slide {Math.min(currentPageIndex + 1, Math.max(1, pages.length))} / {Math.max(1, pages.length)}
                        </span>

                        <button
                            onClick={() => switchPage(currentPageIndex + 1)}
                            disabled={currentPageIndex >= pages.length - 1}
                            title="Next Slide"
                            style={{
                                border: 'none', background: 'transparent',
                                color: currentPageIndex >= pages.length - 1 ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                                cursor: currentPageIndex >= pages.length - 1 ? 'not-allowed' : 'pointer',
                                padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4
                            }}
                        >
                            <IconChevronRight size={14} />
                        </button>

                        <button
                            onClick={addPage}
                            title="Add New Slide"
                            style={{
                                border: 'none', background: 'rgba(99, 102, 241, 0.22)',
                                color: '#a5b4fc', cursor: 'pointer', borderRadius: 5,
                                padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3,
                                fontSize: '0.6875rem', fontWeight: 700, marginLeft: 4,
                                transition: 'background 0.15s ease'
                            }}
                        >
                            + New Slide
                        </button>

                        {pages.length > 1 && (
                            <button
                                onClick={deleteCurrentPage}
                                title="Delete Current Slide"
                                style={{
                                    border: 'none', background: 'rgba(239, 68, 68, 0.14)',
                                    color: '#f87171', cursor: 'pointer', borderRadius: 5,
                                    padding: '3px 6px', display: 'flex', alignItems: 'center', marginLeft: 2
                                }}
                            >
                                <IconTrash size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: History, Pattern, Export & Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Undo / Redo */}
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 8, padding: '2px 4px'
                    }}>
                        <button
                            onClick={handleUndo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                            style={{
                                border: 'none', background: 'transparent',
                                color: canUndo ? '#e2e8f0' : 'rgba(255,255,255,0.2)',
                                cursor: canUndo ? 'pointer' : 'not-allowed',
                                padding: '5px 7px', borderRadius: 5, display: 'flex'
                            }}
                        >
                            <IconUndo size={14} />
                        </button>
                        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
                        <button
                            onClick={handleRedo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+Y)"
                            style={{
                                border: 'none', background: 'transparent',
                                color: canRedo ? '#e2e8f0' : 'rgba(255,255,255,0.2)',
                                cursor: canRedo ? 'pointer' : 'not-allowed',
                                padding: '5px 7px', borderRadius: 5, display: 'flex'
                            }}
                        >
                            <IconRedo size={14} />
                        </button>
                    </div>

                    {/* Canvas Background Pattern */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => { setShowPatternMenu(!showPatternMenu); setShowExportMenu(false) }}
                            title="Change Canvas Grid"
                            style={{
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#e2e8f0', borderRadius: 8, padding: '5px 10px',
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 6
                            }}
                        >
                            <IconGrid size={13} color="#94a3b8" />
                            <span style={{ textTransform: 'capitalize' }}>{gridPattern}</span>
                        </button>

                        {showPatternMenu && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                                background: 'rgba(18, 20, 29, 0.98)', border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 10, padding: 6, zIndex: 60, minWidth: 125,
                                boxShadow: '0 12px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 2
                            }}>
                                {(['dots', 'grid', 'lines', 'blank'] as GridPattern[]).map((pat) => (
                                    <button
                                        key={pat}
                                        onClick={() => { setGridPattern(pat); setShowPatternMenu(false) }}
                                        style={{
                                            border: 'none',
                                            background: gridPattern === pat ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                                            color: gridPattern === pat ? '#fff' : '#cbd5e1',
                                            textAlign: 'left', padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                                            fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize'
                                        }}
                                    >
                                        {pat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => { setShowExportMenu(!showExportMenu); setShowPatternMenu(false) }}
                            title="Export Whiteboard"
                            style={{
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#e2e8f0', borderRadius: 8, padding: '5px 12px',
                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 6
                            }}
                        >
                            <IconDownload size={13} color="#a5b4fc" />
                            <span>Export</span>
                        </button>

                        {showExportMenu && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                                background: 'rgba(18, 20, 29, 0.98)', border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 10, padding: 6, zIndex: 60, minWidth: 160,
                                boxShadow: '0 12px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 4
                            }}>
                                <button
                                    onClick={handleExportPNG}
                                    style={{
                                        border: 'none', background: 'transparent', color: '#f1f5f9',
                                        textAlign: 'left', padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <IconDownload size={13} color="#818cf8" />
                                    <span>Export PNG (Slide {currentPageIndex + 1})</span>
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    style={{
                                        border: 'none', background: 'transparent', color: '#f1f5f9',
                                        textAlign: 'left', padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <IconFileText size={13} color="#f43f5e" />
                                    <span>Export PDF ({pages.length} Slides)</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleClear}
                        title="Clear Slide"
                        style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#94a3b8', borderRadius: 8, padding: '5px 8px',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                        }}
                    >
                        <IconTrash size={14} />
                    </button>

                    <button
                        onClick={onClose}
                        title="Close Whiteboard"
                        style={{
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#fff', borderRadius: 8, padding: '5px 14px',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* 2. MAIN CANVAS WORKSPACE */}
            <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                cursor: activeHandleCursor
                    ? activeHandleCursor
                    : (tool === 'select'
                        ? (isDraggingObjectRef.current ? 'grabbing' : (isHoveringObject ? 'move' : 'default'))
                        : (tool === 'pan'
                            ? (isPanningRef.current ? 'grabbing' : 'grab')
                            : (tool === 'eraser'
                                ? 'crosshair'
                                : (tool === 'text' ? 'text' : (tool === 'sticky' ? 'copy' : (tool === 'laser' ? 'none' : (tool === 'image' ? 'cell' : 'default'))))))),
                background: '#ffffff',
                ...getPatternStyle()
            }}>
                {/* Main Drawing Canvas */}
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />

                {/* Laser Overlay Canvas */}
                <canvas
                    ref={laserCanvasRef}
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        pointerEvents: 'none', zIndex: 10
                    }}
                />

                {/* Hidden file input for image upload */}
                <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                />

                {/* Floating Action Pill for Selected Object */}
                {selectedStrokeId && (() => {
                    const selStroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeId)
                    if (!selStroke) return null
                    const b = getStrokeBounds(selStroke)
                    const screenX = (b.minX + b.width / 2) * zoom + pan.x
                    const screenY = b.minY * zoom + pan.y - 12

                    return (
                        <div style={{
                            position: 'absolute',
                            left: screenX,
                            top: Math.max(12, screenY),
                            transform: 'translate(-50%, -100%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            background: 'rgba(15, 23, 42, 0.96)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            borderRadius: 10,
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                            zIndex: 45,
                            pointerEvents: 'auto',
                            userSelect: 'none'
                        }}>
                            {/* Move label */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: '0.6875rem', fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
                                    <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
                                    <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
                                </svg>
                                <span>Move</span>
                            </div>

                            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />

                            {/* Duplicate */}
                            <button
                                onClick={(e) => { e.stopPropagation(); duplicateSelectedStroke() }}
                                title="Duplicate (Ctrl+D)"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    border: 'none', background: 'rgba(99,102,241,0.22)',
                                    color: '#a5b4fc', borderRadius: 5, padding: '3px 8px',
                                    fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.45)'; e.currentTarget.style.color = '#fff' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; e.currentTarget.style.color = '#a5b4fc' }}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                </svg>
                                <span>Duplicate</span>
                            </button>

                            {/* Fill mode for rect/circle */}
                            {(selStroke.tool === 'rect' || selStroke.tool === 'circle') && (
                                <>
                                    <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
                                    {(['none', 'tint', 'solid'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={(e) => { e.stopPropagation(); handleFillModeChange(mode) }}
                                            title={`Fill: ${mode}`}
                                            style={{
                                                border: fillMode === mode ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.12)',
                                                background: fillMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                                                color: fillMode === mode ? '#a5b4fc' : '#64748b',
                                                borderRadius: 5, padding: '2px 6px',
                                                fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                                                textTransform: 'uppercase', letterSpacing: '0.04em'
                                            }}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </>
                            )}

                            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />

                            {/* Delete */}
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteSelectedStroke() }}
                                title="Delete (Del / Backspace)"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    border: 'none', background: 'rgba(239, 68, 68, 0.22)',
                                    color: '#f87171', borderRadius: 5, padding: '3px 8px',
                                    fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.45)'; e.currentTarget.style.color = '#fff' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'; e.currentTarget.style.color = '#f87171' }}
                            >
                                <IconTrash size={12} />
                                <span>Delete</span>
                            </button>

                            {/* Deselect X */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedStrokeId(null); selectedStrokeIdRef.current = null; redrawAll() }}
                                title="Deselect (Esc)"
                                style={{
                                    border: 'none', background: 'transparent', color: '#64748b',
                                    cursor: 'pointer', fontSize: '0.8125rem', padding: '2px 4px', lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )
                })()}

                {/* Inline Text Input */}
                {activeTextInput && (
                    <div style={{
                        position: 'absolute',
                        left: activeTextInput.x * zoom + pan.x,
                        top: activeTextInput.y * zoom + pan.y,
                        zIndex: 40,
                        transform: 'translate(-2px, -2px)'
                    }}>
                        <input
                            ref={textInputRef}
                            type="text"
                            value={textValue}
                            placeholder="Type here... (Enter to finish)"
                            onChange={(e) => setTextValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    commitActiveText()
                                } else if (e.key === 'Escape') {
                                    setActiveTextInput(null)
                                }
                            }}
                            onBlur={commitActiveText}
                            autoFocus
                            style={{
                                font: `600 ${Math.max(16, size * 4) * zoom}px Inter, -apple-system, sans-serif`,
                                color: color,
                                background: '#ffffff',
                                border: '2px solid #6366f1',
                                borderRadius: 6,
                                padding: '4px 10px',
                                outline: 'none',
                                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
                                minWidth: 160
                            }}
                        />
                    </div>
                )}

                {/* Sticky Note Creator */}
                {activeStickyInput && (
                    <div style={{
                        position: 'absolute',
                        left: activeStickyInput.x * zoom + pan.x,
                        top: activeStickyInput.y * zoom + pan.y,
                        width: 180 * zoom,
                        minHeight: 140 * zoom,
                        background: stickyColor,
                        borderRadius: 8,
                        boxShadow: '0 12px 28px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        zIndex: 40,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: 24 * zoom,
                            background: 'rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 8px',
                            fontSize: `${0.6875 * zoom}rem`,
                            fontWeight: 700,
                            color: '#334155'
                        }}>
                            <span>📝 Sticky Note</span>
                            <button
                                onClick={() => setActiveStickyInput(null)}
                                style={{
                                    border: 'none', background: 'transparent',
                                    cursor: 'pointer', fontSize: 14 * zoom, color: '#64748b', lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <textarea
                            ref={stickyInputRef}
                            value={stickyValue}
                            placeholder="Type note... (Ctrl+Enter to post)"
                            onChange={(e) => setStickyValue(e.target.value)}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault()
                                    commitActiveSticky()
                                } else if (e.key === 'Escape') {
                                    setActiveStickyInput(null)
                                }
                            }}
                            autoFocus
                            style={{
                                flex: 1,
                                width: '100%',
                                minHeight: 75 * zoom,
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                padding: 8,
                                fontSize: `${0.8125 * zoom}rem`,
                                fontFamily: 'Inter, sans-serif',
                                resize: 'none',
                                color: '#0f172a'
                            }}
                        />
                        <div style={{
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.04)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 6
                        }}>
                            <button
                                onClick={commitActiveSticky}
                                style={{
                                    border: 'none',
                                    background: '#0f172a',
                                    color: '#fff',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    borderRadius: 4,
                                    padding: '3px 10px',
                                    cursor: 'pointer'
                                }}
                            >
                                Post
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. FIGMA / MIRO STYLE FLOATING BOTTOM TOOLBAR DOCK */}
                <div style={{
                    position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    zIndex: 40
                }}>
                    {/* Floating Contextual Inspector (Color swatches, Fill Mode & Stroke slider) */}
                    {(showColorPalette || showStickyPalette || showFillMode) && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '6px 14px',
                            background: 'rgba(18, 20, 29, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 9999,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                            animation: 'fadeIn 0.15s ease'
                        }}>
                            {/* Sticky Color Swatches */}
                            {showStickyPalette ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>Sticky:</span>
                                    {STICKY_COLORS.map((sc) => (
                                        <button
                                            key={sc.color}
                                            onClick={() => setStickyColor(sc.color)}
                                            title={sc.name}
                                            style={{
                                                width: 18, height: 18, borderRadius: 4,
                                                background: sc.color,
                                                border: stickyColor === sc.color ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.15)',
                                                cursor: 'pointer',
                                                transform: stickyColor === sc.color ? 'scale(1.2)' : 'scale(1)',
                                                boxShadow: stickyColor === sc.color ? '0 0 8px rgba(99, 102, 241, 0.7)' : 'none',
                                                transition: 'all 0.12s ease'
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : showColorPalette ? (
                                /* Standard Color Swatches */
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => handleColorChange(c)}
                                            title={c}
                                            style={{
                                                width: 18, height: 18, borderRadius: '50%',
                                                background: c,
                                                border: color === c
                                                    ? '2px solid #6366f1'
                                                    : (c === '#ffffff' ? '1px solid #94a3b8' : '1px solid rgba(255,255,255,0.2)'),
                                                cursor: 'pointer',
                                                transform: color === c ? 'scale(1.25)' : 'scale(1)',
                                                boxShadow: color === c ? '0 0 10px rgba(99, 102, 241, 0.8)' : 'none',
                                                transition: 'all 0.12s ease'
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : null}

                            {/* Fill Mode selector (for rect/circle or selected rect/circle) */}
                            {showFillMode && (
                                <>
                                    {(showColorPalette) && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fill</span>
                                        {(['none', 'tint', 'solid'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => handleFillModeChange(mode)}
                                                style={{
                                                    border: fillMode === mode ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.12)',
                                                    background: fillMode === mode ? 'rgba(99,102,241,0.25)' : 'transparent',
                                                    color: fillMode === mode ? '#a5b4fc' : '#64748b',
                                                    borderRadius: 5, padding: '2px 7px',
                                                    fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                                                    textTransform: 'uppercase', letterSpacing: '0.04em'
                                                }}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {showColorPalette && (
                                <>
                                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />

                                    {/* Size Slider */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: Math.min(14, Math.max(4, size)),
                                            height: Math.min(14, Math.max(4, size)),
                                            borderRadius: '50%', background: color === '#ffffff' ? '#94a3b8' : color,
                                            boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                                        }} />
                                        <input
                                            type="range"
                                            min="2"
                                            max="24"
                                            value={size}
                                            onChange={(e) => handleSizeChange(Number(e.target.value))}
                                            style={{ width: 70, cursor: 'pointer', accentColor: '#6366f1' }}
                                        />
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#f1f5f9', width: 14 }}>
                                            {size}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* The Primary Island Dock */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px',
                        background: 'rgba(18, 20, 29, 0.94)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 9999,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 1px 3px rgba(255,255,255,0.08)'
                    }}>
                        {TOOL_GROUPS.map((group, groupIdx) => (
                            <React.Fragment key={group.id}>
                                {groupIdx > 0 && (
                                    <div style={{ width: 1, height: 22, background: 'rgba(255, 255, 255, 0.1)', margin: '0 3px' }} />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {group.tools.map((t) => {
                                        const isActive = tool === t.id
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    if (tool === 'text') commitActiveText()
                                                    if (tool === 'sticky') commitActiveSticky()
                                                    setTool(t.id)
                                                }}
                                                title={`${t.label} (${t.shortcut})`}
                                                style={{
                                                    width: 36, height: 36,
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    background: isActive
                                                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                                        : 'transparent',
                                                    color: isActive ? '#ffffff' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.45)' : 'none',
                                                    transform: isActive ? 'scale(1.08)' : 'scale(1)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.color = '#fff'
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.color = '#94a3b8'
                                                        e.currentTarget.style.background = 'transparent'
                                                    }
                                                }}
                                            >
                                                {t.icon}
                                            </button>
                                        )
                                    })}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* 4. BOTTOM-RIGHT ZOOM CONTROLS HUD */}
                <div style={{
                    position: 'absolute', bottom: 26, right: 24,
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 8px',
                    background: 'rgba(18, 20, 29, 0.94)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 9999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    zIndex: 30
                }}>
                    <button
                        onClick={() => handleZoom(-0.15)}
                        title="Zoom Out (-)"
                        style={{
                            border: 'none', background: 'transparent',
                            color: '#94a3b8', cursor: 'pointer', padding: 4,
                            display: 'flex', borderRadius: 4
                        }}
                    >
                        <IconZoomOut size={14} />
                    </button>

                    <button
                        onClick={resetZoomAndPan}
                        title="Reset to 100% (0)"
                        style={{
                            border: 'none', background: 'transparent',
                            color: '#a5b4fc', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 700, minWidth: 44, textAlign: 'center'
                        }}
                    >
                        {Math.round(zoom * 100)}%
                    </button>

                    <button
                        onClick={() => handleZoom(0.15)}
                        title="Zoom In (+)"
                        style={{
                            border: 'none', background: 'transparent',
                            color: '#94a3b8', cursor: 'pointer', padding: 4,
                            display: 'flex', borderRadius: 4
                        }}
                    >
                        <IconZoomIn size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}
