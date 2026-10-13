import { useRef, useCallback, useEffect } from 'react'

export interface RemoteCursor {
    userId?: string
    x: number
    y: number
    name: string
    color: string
    timestamp: number
}

interface UseWhiteboardLaserProps {
    pan: { x: number; y: number }
    zoom: number
    isOpen: boolean
}

export function useWhiteboardLaser({ pan, zoom, isOpen }: UseWhiteboardLaserProps) {
    const laserCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const laserTrailRef = useRef<{ x: number; y: number; timestamp: number }[]>([])
    const remoteCursorsRef = useRef<Map<string, RemoteCursor>>(new Map())
    const laserAnimRef = useRef<number | null>(null)

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
        return () => {
            if (laserAnimRef.current) {
                cancelAnimationFrame(laserAnimRef.current)
                laserAnimRef.current = null
            }
        }
    }, [])

    return {
        laserCanvasRef,
        remoteCursorsRef,
        laserAnimRef,
        renderLaser,
        triggerRenderOverlay,
        addLaserPoint
    }
}
