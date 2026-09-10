/**
 * JTS Meet — AI Virtual Background & Person Segmentation Service
 * Uses Google MediaPipe SelfieSegmentation (WebGL) to separate the person from the background.
 * Ensures the person's face & body stay crystal-clear while only the background is blurred or replaced.
 */

export interface BackgroundPreset {
    id: string
    title: string
    category: 'none' | 'blur' | 'wallpaper' | 'custom'
    description: string
    type: 'none' | 'blur' | 'image'
    blurRadius?: number
    url?: string
    thumbnail: string
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
    {
        id: 'none',
        title: 'None',
        category: 'none',
        description: 'Original camera background with zero effects',
        type: 'none',
        thumbnail: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)'
    },
    {
        id: 'blur_light',
        title: 'Slight Blur',
        category: 'blur',
        description: 'Subtle depth-of-field portrait blur (face stays clear)',
        type: 'blur',
        blurRadius: 8,
        thumbnail: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)'
    },
    {
        id: 'blur_heavy',
        title: 'Deep Blur',
        category: 'blur',
        description: 'Maximum privacy background blur (face stays crystal clear)',
        type: 'blur',
        blurRadius: 20,
        thumbnail: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0.15) 100%)'
    },
    {
        id: 'office',
        title: 'Modern Office',
        category: 'wallpaper',
        description: 'Sunlit contemporary executive office with architectural lines',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1280&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=70'
    },
    {
        id: 'library',
        title: 'Cozy Library',
        category: 'wallpaper',
        description: 'Warm oak bookshelves, ambient lighting and reading study',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1280&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=300&q=70'
    },
    {
        id: 'studio',
        title: 'Minimal Studio',
        category: 'wallpaper',
        description: 'Clean acoustic aesthetic studio with gentle neon accents',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1280&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=300&q=70'
    },
    {
        id: 'cafe',
        title: 'Warm Cafe',
        category: 'wallpaper',
        description: 'Relaxed urban coffee house with soft bokeh lighting',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1280&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=70'
    }
]

class VirtualBackgroundService {
    private segmenter: any = null
    private isSegmenterLoading = false
    private activePresetId: string = 'none'
    private offscreenVideo: HTMLVideoElement | null = null
    private offscreenCanvas: HTMLCanvasElement | null = null
    private canvasCtx: CanvasRenderingContext2D | null = null
    private outputStream: MediaStream | null = null
    private animFrameId: number | null = null
    private isProcessing = false
    private imageCache: Map<string, HTMLImageElement> = new Map()
    private customImageUrl: string | null = null
    private hasRenderedFirstFrame = false

    constructor() {
        this.preloadWallpapers()
    }

    private preloadWallpapers() {
        if (typeof window === 'undefined') return
        BACKGROUND_PRESETS.forEach(preset => {
            if (preset.url) {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    this.imageCache.set(preset.id, img)
                }
                img.onerror = () => {
                    console.warn('[VirtualBg] Preload error for', preset.id, 'will use built-in canvas room')
                }
                img.src = preset.url
            }
        })
    }

    /**
     * Initializes Google MediaPipe SelfieSegmentation model
     */
    public async initSegmenter(): Promise<boolean> {
        if (this.segmenter) return true
        if (this.isSegmenterLoading) {
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 100))
                if (this.segmenter) return true
            }
        }

        this.isSegmenterLoading = true

        try {
            if (!(window as any).SelfieSegmentation) {
                await this.loadMediaPipeScript()
            }

            const SelfieSegmentationClass = (window as any).SelfieSegmentation
            if (!SelfieSegmentationClass) {
                console.warn('[VirtualBg] SelfieSegmentation class not found on window')
                this.isSegmenterLoading = false
                return false
            }

            const segmenter = new SelfieSegmentationClass({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            })

            segmenter.setOptions({
                modelSelection: 1, // 1 = landscape mode (optimized for 30fps webcam)
                selfieMode: false
            })

            segmenter.onResults((results: any) => {
                this.renderCompositedFrame(results)
            })

            if (typeof segmenter.initialize === 'function') {
                await segmenter.initialize()
            }

            this.segmenter = segmenter
            this.isSegmenterLoading = false
            return true
        } catch (err) {
            console.error('[VirtualBg] Failed to initialize MediaPipe segmenter:', err)
            this.isSegmenterLoading = false
            return false
        }
    }

    private async loadMediaPipeScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).SelfieSegmentation) return resolve()

            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'
            script.crossOrigin = 'anonymous'
            script.onload = () => resolve()
            script.onerror = (e) => reject(e)
            document.head.appendChild(script)
        })
    }

    /**
     * Set a custom image uploaded by the user
     */
    public setCustomWallpaper(dataUrl: string) {
        this.customImageUrl = dataUrl
        const img = new Image()
        img.onload = () => {
            this.imageCache.set('custom', img)
        }
        img.src = dataUrl
    }

    /**
     * Apply a background preset.
     * Returns the processed MediaStreamTrack (or original track if 'none').
     */
    public async applyPreset(
        presetId: string,
        rawCameraStream: MediaStream
    ): Promise<MediaStreamTrack | null> {
        this.activePresetId = presetId

        // If 'none', stop loop and return raw video track
        if (presetId === 'none') {
            this.stopProcessingLoop()
            const rawTrack = rawCameraStream.getVideoTracks()[0]
            return rawTrack || null
        }

        const preset = BACKGROUND_PRESETS.find(p => p.id === presetId) || (presetId === 'custom' ? {
            id: 'custom',
            title: 'Custom Wallpaper',
            category: 'custom' as const,
            description: 'User uploaded wallpaper',
            type: 'image' as const,
            thumbnail: this.customImageUrl || ''
        } : null)

        if (!preset) {
            console.warn('[VirtualBg] Unknown preset:', presetId)
            return rawCameraStream.getVideoTracks()[0] || null
        }

        // Initialize AI segmenter
        const ready = await this.initSegmenter()
        if (!ready) {
            console.warn('[VirtualBg] AI segmenter unavailable; falling back to original camera track')
            return rawCameraStream.getVideoTracks()[0] || null
        }

        // Setup offscreen canvas and video pipeline
        await this.setupOffscreenPipeline(rawCameraStream)

        // Reset first frame flag and start processing loop
        this.hasRenderedFirstFrame = false
        this.startProcessingLoop()

        // Wait up to 1.2s for first AI frame to be drawn onto the canvas
        for (let i = 0; i < 12; i++) {
            if (this.hasRenderedFirstFrame) break
            await new Promise(r => setTimeout(r, 100))
        }

        // Return processed video track from canvas
        if (this.outputStream) {
            const track = this.outputStream.getVideoTracks()[0]
            if (track) return track
        }

        return rawCameraStream.getVideoTracks()[0] || null
    }

    private async setupOffscreenPipeline(rawStream: MediaStream) {
        const rawVideoTrack = rawStream.getVideoTracks()[0]
        const settings = rawVideoTrack?.getSettings?.() || {}
        const width = settings.width || 640
        const height = settings.height || 480

        // 1. Offscreen Video Element
        if (!this.offscreenVideo) {
            const vid = document.createElement('video')
            vid.autoplay = true
            vid.muted = true
            vid.playsInline = true
            vid.setAttribute('playsinline', '')
            vid.setAttribute('autoplay', '')
            vid.setAttribute('muted', '')
            vid.style.position = 'fixed'
            vid.style.width = '2px'
            vid.style.height = '2px'
            vid.style.bottom = '0'
            vid.style.right = '0'
            vid.style.opacity = '0.01' // non-zero opacity prevents browser from throttling video frames
            vid.style.pointerEvents = 'none'
            vid.style.zIndex = '-9999'
            document.body.appendChild(vid)
            this.offscreenVideo = vid
        }

        if (this.offscreenVideo.srcObject !== rawStream) {
            this.offscreenVideo.srcObject = rawStream
            await new Promise<void>((resolve) => {
                const vid = this.offscreenVideo!
                if (vid.readyState >= 2) return resolve()
                const onLoaded = () => {
                    vid.removeEventListener('loadeddata', onLoaded)
                    resolve()
                }
                vid.addEventListener('loadeddata', onLoaded)
                setTimeout(resolve, 600)
            })
            await this.offscreenVideo.play().catch(e => console.warn('[VirtualBg] Video play catch:', e))
        }

        // 2. Offscreen Canvas
        if (!this.offscreenCanvas) {
            const canvas = document.createElement('canvas')
            this.offscreenCanvas = canvas
            this.canvasCtx = canvas.getContext('2d', { willReadFrequently: false })
        }

        const actualW = this.offscreenVideo.videoWidth || width
        const actualH = this.offscreenVideo.videoHeight || height
        this.offscreenCanvas.width = actualW
        this.offscreenCanvas.height = actualH

        // Draw initial fallback frame so captureStream track is immediately live
        if (this.canvasCtx) {
            this.canvasCtx.drawImage(this.offscreenVideo, 0, 0, actualW, actualH)
        }

        // 3. Captured Output Stream (30 FPS)
        if (!this.outputStream) {
            this.outputStream = this.offscreenCanvas.captureStream(30)
        }
    }

    private startProcessingLoop() {
        this.isProcessing = true
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }

        let lastSendTime = 0
        const TARGET_FPS = 30
        const FRAME_INTERVAL = 1000 / TARGET_FPS

        const processFrame = async (timestamp: number) => {
            if (!this.isProcessing) return

            if (
                this.offscreenVideo &&
                this.offscreenVideo.readyState >= 2 &&
                !this.offscreenVideo.paused &&
                this.segmenter
            ) {
                if (timestamp - lastSendTime >= FRAME_INTERVAL) {
                    lastSendTime = timestamp
                    try {
                        await this.segmenter.send({ image: this.offscreenVideo })
                    } catch (e) {
                        console.warn('[VirtualBg] Frame send warning:', e)
                    }
                }
            }

            if (this.isProcessing) {
                this.animFrameId = requestAnimationFrame(processFrame)
            }
        }

        this.animFrameId = requestAnimationFrame(processFrame)
    }

    private stopProcessingLoop() {
        this.isProcessing = false
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }
    }

    /**
     * Compositing function: Draws segmentation mask, foreground person, and blurred/wallpaper background.
     */
    private renderCompositedFrame(results: any) {
        const canvas = this.offscreenCanvas
        const ctx = this.canvasCtx
        if (!canvas || !ctx) return

        const width = canvas.width
        const height = canvas.height
        const preset = BACKGROUND_PRESETS.find(p => p.id === this.activePresetId) || 
            (this.activePresetId === 'custom' ? { id: 'custom', type: 'image' as const } : null)

        ctx.save()
        ctx.clearRect(0, 0, width, height)

        // 1. Draw person segmentation mask from MediaPipe AI
        ctx.drawImage(results.segmentationMask, 0, 0, width, height)

        // 2. Keep only person where the mask is opaque
        ctx.globalCompositeOperation = 'source-in'
        ctx.drawImage(results.image, 0, 0, width, height)

        // 3. Draw background behind the person (destination-over)
        ctx.globalCompositeOperation = 'destination-over'

        if (preset?.type === 'blur') {
            const blurPx = preset.blurRadius || 14
            ctx.filter = `blur(${blurPx}px)`
            ctx.drawImage(results.image, 0, 0, width, height)
        } else if (preset?.type === 'image') {
            ctx.filter = 'none'
            const img = this.imageCache.get(this.activePresetId)
            if (img && img.complete && img.naturalWidth > 0) {
                this.drawCover(ctx, img, width, height)
            } else {
                this.drawFallbackRoom(ctx, this.activePresetId, width, height)
            }
        } else {
            // Default raw webcam behind
            ctx.filter = 'none'
            ctx.drawImage(results.image, 0, 0, width, height)
        }

        ctx.restore()
        this.hasRenderedFirstFrame = true
    }

    /**
     * Draw image to cover canvas maintaining aspect ratio without distortion
     */
    private drawCover(
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        targetW: number,
        targetH: number
    ) {
        const imgRatio = img.naturalWidth / img.naturalHeight
        const canvasRatio = targetW / targetH

        let renderW = targetW
        let renderH = targetH
        let offsetX = 0
        let offsetY = 0

        if (imgRatio > canvasRatio) {
            renderW = targetH * imgRatio
            offsetX = (targetW - renderW) / 2
        } else {
            renderH = targetW / imgRatio
            offsetY = (targetH - renderH) / 2
        }

        ctx.drawImage(img, offsetX, offsetY, renderW, renderH)
    }

    /**
     * Built-in aesthetic room generator (100% offline-ready, renders immediately)
     */
    private drawFallbackRoom(ctx: CanvasRenderingContext2D, presetId: string, w: number, h: number) {
        if (presetId === 'library') {
            // Warm Cozy Library: Mahogany shelves, warm ambient glow
            const grad = ctx.createLinearGradient(0, 0, w, h)
            grad.addColorStop(0, '#2d1810')
            grad.addColorStop(0.5, '#4a2818')
            grad.addColorStop(1, '#1b0d07')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, w, h)

            // Bookshelf horizontal rows
            ctx.fillStyle = 'rgba(20, 10, 5, 0.7)'
            for (let y = h * 0.2; y < h; y += h * 0.22) {
                ctx.fillRect(0, y, w, 14)
            }

            // Warm study lamp glow
            const glow = ctx.createRadialGradient(w * 0.8, h * 0.35, 10, w * 0.8, h * 0.35, w * 0.5)
            glow.addColorStop(0, 'rgba(251, 191, 36, 0.45)')
            glow.addColorStop(0.5, 'rgba(217, 119, 6, 0.15)')
            glow.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = glow
            ctx.fillRect(0, 0, w, h)
        } else if (presetId === 'office') {
            // Modern Corporate Office: Glass skyline & architecture
            const grad = ctx.createLinearGradient(0, 0, 0, h)
            grad.addColorStop(0, '#1e293b')
            grad.addColorStop(0.6, '#334155')
            grad.addColorStop(1, '#0f172a')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, w, h)

            // Architectural window panes
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.3, h)
            ctx.moveTo(w * 0.7, 0); ctx.lineTo(w * 0.7, h)
            ctx.moveTo(0, h * 0.45); ctx.lineTo(w, h * 0.45)
            ctx.stroke()
        } else if (presetId === 'studio') {
            // Minimalist Neon Studio: Acoustic dark grey + purple/cyan neon
            const grad = ctx.createLinearGradient(0, 0, w, h)
            grad.addColorStop(0, '#090a0f')
            grad.addColorStop(1, '#13141f')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, w, h)

            const neon = ctx.createRadialGradient(w * 0.2, h * 0.3, 10, w * 0.2, h * 0.3, w * 0.6)
            neon.addColorStop(0, 'rgba(168, 85, 247, 0.35)')
            neon.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = neon
            ctx.fillRect(0, 0, w, h)
        } else {
            // Warm Cafe: Warm coffee tone
            const grad = ctx.createLinearGradient(0, 0, w, h)
            grad.addColorStop(0, '#3e2723')
            grad.addColorStop(1, '#1b100e')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, w, h)
        }
    }

    /**
     * Teardown all resources on meeting exit
     */
    public cleanup() {
        this.stopProcessingLoop()
        if (this.offscreenVideo) {
            this.offscreenVideo.srcObject = null
            this.offscreenVideo.remove()
            this.offscreenVideo = null
        }
        if (this.outputStream) {
            this.outputStream.getTracks().forEach(t => t.stop())
            this.outputStream = null
        }
        this.offscreenCanvas = null
        this.canvasCtx = null
        this.activePresetId = 'none'
        this.hasRenderedFirstFrame = false
    }

    public getActivePreset(): string {
        return this.activePresetId
    }
}

export const virtualBackgroundService = new VirtualBackgroundService()
