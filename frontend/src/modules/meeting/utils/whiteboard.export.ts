import { jsPDF } from 'jspdf'
import type { StrokeData } from '../whiteboard.types'
import { drawStroke } from './whiteboard.drawing'

export function exportWhiteboardPNG(
    canvas: HTMLCanvasElement | null,
    currentPageIndex: number,
    strokes: StrokeData[]
) {
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
        strokes.forEach(s => drawStroke(expCtx, s))

        const link = document.createElement('a')
        link.download = `whiteboard_page_${currentPageIndex + 1}_${Date.now()}.png`
        link.href = exportCanvas.toDataURL('image/png')
        link.click()
    }
}

export function exportWhiteboardPDF(
    canvas: HTMLCanvasElement | null,
    meetingId: string,
    pages: StrokeData[][],
    currentPageIndex: number,
    currentStrokes: StrokeData[]
) {
    if (!canvas) return

    const allPages = [...pages]
    allPages[currentPageIndex] = [...currentStrokes]

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
