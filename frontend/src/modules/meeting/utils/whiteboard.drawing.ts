import type { StrokeData, StrokePoint, StrokeBounds } from '../whiteboard.types'

const imageCacheMap = new Map<string, HTMLImageElement>()

export function getCachedImage(url: string, onLoaded?: () => void): HTMLImageElement {
    let img = imageCacheMap.get(url)
    if (!img) {
        img = new Image()
        img.src = url
        img.onload = () => onLoaded?.()
        imageCacheMap.set(url, img)
    }
    return img
}

export function getStrokeBounds(stroke: StrokeData): StrokeBounds {
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

export function getResizeHandleAtPoint(
    pt: StrokePoint,
    bounds: StrokeBounds,
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

export function distToSegment(p: StrokePoint, v: StrokePoint, w: StrokePoint) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y)
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)))
}

export function isPointInStroke(pt: StrokePoint, stroke: StrokeData): boolean {
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

export function drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokeData,
    onImageLoaded?: () => void
) {
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
            const img = getCachedImage(stroke.imageUrl, onImageLoaded)
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
