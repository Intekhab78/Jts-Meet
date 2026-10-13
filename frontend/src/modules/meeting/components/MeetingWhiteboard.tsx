import React, { useEffect, useRef, useState, useCallback } from 'react'
import type {
    MeetingWhiteboardProps,
    ToolType,
    GridPattern,
    StrokePoint,
    StrokeData
} from '../whiteboard.types'
import { USER_COLORS, generateStrokeId } from '../whiteboard.types'
import { getStrokeBounds, drawStroke } from '../utils/whiteboard.drawing'
import { exportWhiteboardPNG, exportWhiteboardPDF } from '../utils/whiteboard.export'
import { useWhiteboardLaser } from '../hooks/useWhiteboardLaser'
import { useWhiteboardSocket } from '../hooks/useWhiteboardSocket'
import { useWhiteboardDrawing } from '../hooks/useWhiteboardDrawing'
import { WhiteboardHeader } from './whiteboard/WhiteboardHeader'
import { WhiteboardToolbar } from './whiteboard/WhiteboardToolbar'
import { WhiteboardSelectedActions } from './whiteboard/WhiteboardSelectedActions'
import { WhiteboardInlineInputs } from './whiteboard/WhiteboardInlineInputs'
import { WhiteboardZoomControls } from './whiteboard/WhiteboardZoomControls'

export function MeetingWhiteboard({
    isOpen,
    onClose,
    meetingId,
    socket,
    userName
}: MeetingWhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

    // Selection state
    const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null)
    const selectedStrokeIdRef = useRef<string | null>(null)
    selectedStrokeIdRef.current = selectedStrokeId

    // Clipboard & Identity
    const clipboardStrokeRef = useRef<StrokeData | null>(null)
    const myColorRef = useRef<string>(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)])
    const myName = userName || (typeof window !== 'undefined' ? localStorage.getItem('user_name') || 'Participant' : 'Participant')

    // Drawing state history
    const strokesHistoryRef = useRef<StrokeData[]>([])
    const redoStackRef = useRef<StrokeData[]>([])

    // Interactive text/sticky note inputs
    const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number } | null>(null)
    const [textValue, setTextValue] = useState('')
    const textInputRef = useRef<HTMLInputElement | null>(null)

    const [activeStickyInput, setActiveStickyInput] = useState<{ x: number; y: number } | null>(null)
    const [stickyValue, setStickyValue] = useState('')
    const stickyInputRef = useRef<HTMLTextAreaElement | null>(null)

    // UI Menus and History toggles
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [showPatternMenu, setShowPatternMenu] = useState(false)

    const updateUndoRedoStates = useCallback(() => {
        setCanUndo(strokesHistoryRef.current.length > 0)
        setCanRedo(redoStackRef.current.length > 0)
    }, [])

    // Laser & collaborator cursors overlay hook
    const {
        laserCanvasRef,
        remoteCursorsRef,
        renderLaser,
        triggerRenderOverlay,
        addLaserPoint
    } = useWhiteboardLaser({ pan, zoom, isOpen })

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

        strokesHistoryRef.current.forEach((stroke) => drawStroke(context, stroke, () => redrawAll()))

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

    // Realtime synchronization hook
    const {
        syncPage,
        emitDraw,
        emitClear,
        emitLaser,
        emitCursor,
        emitPageAdd,
        emitPageDelete
    } = useWhiteboardSocket({
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
    })

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

        syncPage(strokesHistoryRef.current, currentPageIndex)
    }, [currentPageIndex, syncPage, updateUndoRedoStates, redrawAll])

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

        syncPage(strokesHistoryRef.current, currentPageIndex)
    }, [currentPageIndex, syncPage, updateUndoRedoStates, redrawAll])

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
                syncPage(strokesHistoryRef.current, currentPageIndex)
            }
        }
    }, [fillMode, currentPageIndex, syncPage, redrawAll])

    const handleSizeChange = useCallback((newSize: number) => {
        setSize(newSize)
        if (selectedStrokeIdRef.current) {
            const stroke = strokesHistoryRef.current.find(s => s.id === selectedStrokeIdRef.current)
            if (stroke) {
                stroke.size = newSize
                redrawAll()
                syncPage(strokesHistoryRef.current, currentPageIndex)
            }
        }
    }, [currentPageIndex, syncPage, redrawAll])

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
                syncPage(strokesHistoryRef.current, currentPageIndex)
            }
        }
    }, [color, currentPageIndex, syncPage, redrawAll])

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
    }, [laserCanvasRef, redrawAll])

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(resizeCanvas, 50)
            window.addEventListener('resize', resizeCanvas)
            return () => {
                clearTimeout(timer)
                window.removeEventListener('resize', resizeCanvas)
            }
        }
    }, [isOpen, resizeCanvas])

    useEffect(() => {
        redrawAll()
    }, [selectedStrokeId, redrawAll])

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

            emitDraw(newStroke, currentPageIndex)
        }
        setActiveTextInput(null)
        setTextValue('')
    }, [activeTextInput, textValue, color, size, currentPageIndex, emitDraw, updateUndoRedoStates, redrawAll])

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

            emitDraw(newStroke, currentPageIndex)
        }
        setActiveStickyInput(null)
        setStickyValue('')
    }, [activeStickyInput, stickyValue, stickyColor, currentPageIndex, emitDraw, updateUndoRedoStates, redrawAll])

    // Drawing interactions hook
    const {
        isPanningRef,
        isDraggingObjectRef,
        isHoveringObject,
        activeHandleCursor,
        startDrawing,
        draw,
        stopDrawing
    } = useWhiteboardDrawing({
        canvasRef,
        imageFileInputRef,
        tool,
        color,
        size,
        fillMode,
        pan,
        setPan,
        zoom,
        selectedStrokeId,
        setSelectedStrokeId,
        selectedStrokeIdRef,
        strokesHistoryRef,
        redoStackRef,
        currentPageIndex,
        myName,
        myColor: myColorRef.current,
        redrawAll,
        updateUndoRedoStates,
        emitDraw,
        syncPage,
        emitCursor,
        emitLaser,
        addLaserPoint,
        onStartText: (pt: StrokePoint) => {
            commitActiveText()
            setActiveTextInput({ x: pt.x, y: pt.y })
            setTextValue('')
            setTimeout(() => textInputRef.current?.focus(), 50)
        },
        onStartSticky: (pt: StrokePoint) => {
            commitActiveSticky()
            setActiveStickyInput({ x: pt.x, y: pt.y })
            setStickyValue('')
            setTimeout(() => stickyInputRef.current?.focus(), 50)
        }
    })

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
                    syncPage(strokesHistoryRef.current, currentPageIndex)
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
                                    syncPage(strokesHistoryRef.current, currentPageIndex)
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
            syncPage(strokesHistoryRef.current, currentPageIndex)
        }
    }, [pan, zoom, currentPageIndex, syncPage, updateUndoRedoStates, redrawAll])

    const handleZoom = (delta: number) => {
        setZoom(prev => Math.min(2.5, Math.max(0.4, Number((prev + delta).toFixed(2)))))
    }

    const resetZoomAndPan = () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }

    const handleUndo = useCallback(() => {
        const popped = strokesHistoryRef.current.pop()
        if (popped) {
            redoStackRef.current.push(popped)
            if (selectedStrokeIdRef.current === popped.id) {
                setSelectedStrokeId(null)
                selectedStrokeIdRef.current = null
            }
            updateUndoRedoStates()
            redrawAll()
            syncPage(strokesHistoryRef.current, currentPageIndex)
        }
    }, [currentPageIndex, syncPage, updateUndoRedoStates, redrawAll])

    const handleRedo = useCallback(() => {
        const restored = redoStackRef.current.pop()
        if (restored) {
            strokesHistoryRef.current.push(restored)
            updateUndoRedoStates()
            redrawAll()
            syncPage(strokesHistoryRef.current, currentPageIndex)
        }
    }, [currentPageIndex, syncPage, updateUndoRedoStates, redrawAll])

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
    }, [isOpen, deleteSelectedStroke, duplicateSelectedStroke, handlePaste, handleUndo, handleRedo, redrawAll])

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

        emitPageAdd()
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

        emitPageDelete(delIdx)
    }

    const handleClear = () => {
        strokesHistoryRef.current = []
        redoStackRef.current = []
        setSelectedStrokeId(null)
        selectedStrokeIdRef.current = null
        updateUndoRedoStates()
        redrawAll()
        emitClear(currentPageIndex)
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

    const showColorPalette = ['pen', 'highlighter', 'arrow', 'line', 'rect', 'circle', 'text'].includes(tool)
    const showStickyPalette = tool === 'sticky'
    const selectedStroke = selectedStrokeId
        ? strokesHistoryRef.current.find(s => s.id === selectedStrokeId)
        : undefined
    const showFillMode = (tool === 'rect' || tool === 'circle') ||
        (tool === 'select' && !!selectedStroke && (selectedStroke.tool === 'rect' || selectedStroke.tool === 'circle'))

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9900,
            display: 'flex', flexDirection: 'column',
            background: 'rgba(10, 11, 15, 0.98)', backdropFilter: 'blur(16px)',
            fontFamily: 'Inter, -apple-system, sans-serif'
        }}>
            {/* 1. TOP HEADER: Clean, Minimal, Enterprise Grade */}
            <WhiteboardHeader
                currentPageIndex={currentPageIndex}
                totalPages={pages.length}
                canUndo={canUndo}
                canRedo={canRedo}
                gridPattern={gridPattern}
                showPatternMenu={showPatternMenu}
                showExportMenu={showExportMenu}
                onSwitchPage={switchPage}
                onAddPage={addPage}
                onDeletePage={deleteCurrentPage}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onTogglePatternMenu={() => { setShowPatternMenu(!showPatternMenu); setShowExportMenu(false) }}
                onSelectPattern={(pat) => { setGridPattern(pat); setShowPatternMenu(false) }}
                onToggleExportMenu={() => { setShowExportMenu(!showExportMenu); setShowPatternMenu(false) }}
                onExportPNG={() => {
                    setShowExportMenu(false)
                    exportWhiteboardPNG(canvasRef.current, currentPageIndex, strokesHistoryRef.current)
                }}
                onExportPDF={() => {
                    setShowExportMenu(false)
                    exportWhiteboardPDF(canvasRef.current, meetingId, pages, currentPageIndex, strokesHistoryRef.current)
                }}
                onClear={handleClear}
                onClose={onClose}
            />

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
                {selectedStroke && (
                    <WhiteboardSelectedActions
                        stroke={selectedStroke}
                        zoom={zoom}
                        pan={pan}
                        fillMode={fillMode}
                        onDuplicate={duplicateSelectedStroke}
                        onDelete={deleteSelectedStroke}
                        onChangeFillMode={handleFillModeChange}
                        onDeselect={() => {
                            setSelectedStrokeId(null)
                            selectedStrokeIdRef.current = null
                            redrawAll()
                        }}
                    />
                )}

                {/* Inline Text and Sticky Note Editors */}
                <WhiteboardInlineInputs
                    activeTextInput={activeTextInput}
                    textValue={textValue}
                    color={color}
                    size={size}
                    zoom={zoom}
                    pan={pan}
                    textInputRef={textInputRef}
                    onChangeTextValue={setTextValue}
                    onCommitText={commitActiveText}
                    onCancelText={() => setActiveTextInput(null)}
                    activeStickyInput={activeStickyInput}
                    stickyValue={stickyValue}
                    stickyColor={stickyColor}
                    stickyInputRef={stickyInputRef}
                    onChangeStickyValue={setStickyValue}
                    onCommitSticky={commitActiveSticky}
                    onCancelSticky={() => setActiveStickyInput(null)}
                />

                {/* 3. FIGMA / MIRO STYLE FLOATING BOTTOM TOOLBAR DOCK */}
                <WhiteboardToolbar
                    tool={tool}
                    color={color}
                    fillMode={fillMode}
                    size={size}
                    stickyColor={stickyColor}
                    showColorPalette={showColorPalette}
                    showStickyPalette={showStickyPalette}
                    showFillMode={showFillMode}
                    onSelectTool={(t) => {
                        if (tool === 'text') commitActiveText()
                        if (tool === 'sticky') commitActiveSticky()
                        setTool(t)
                    }}
                    onChangeColor={handleColorChange}
                    onChangeStickyColor={setStickyColor}
                    onChangeFillMode={handleFillModeChange}
                    onChangeSize={handleSizeChange}
                />

                {/* 4. BOTTOM-RIGHT ZOOM CONTROLS HUD */}
                <WhiteboardZoomControls
                    zoom={zoom}
                    onZoomIn={() => handleZoom(0.15)}
                    onZoomOut={() => handleZoom(-0.15)}
                    onResetZoomAndPan={resetZoomAndPan}
                />
            </div>
        </div>
    )
}
