import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'

// Resolve cross-platform FFmpeg executable
// Prefer FFMPEG_PATH env or system 'ffmpeg' if available, falling back to bundled @ffmpeg-installer
function getFfmpegPath(): string {
    if (process.env.FFMPEG_PATH) {
        return process.env.FFMPEG_PATH
    }
    // Prefer modern system-installed FFmpeg if present on Linux (e.g. apt install ffmpeg)
    if (process.platform === 'linux') {
        try {
            const { execSync } = require('child_process')
            const sysPath = execSync('which ffmpeg', { encoding: 'utf8' }).trim()
            if (sysPath && fs.existsSync(sysPath)) {
                return sysPath
            }
        } catch (_) {}
        if (fs.existsSync('/usr/bin/ffmpeg')) return '/usr/bin/ffmpeg'
        if (fs.existsSync('/usr/local/bin/ffmpeg')) return '/usr/local/bin/ffmpeg'
        if (fs.existsSync('/snap/bin/ffmpeg')) return '/snap/bin/ffmpeg'
    }
    try {
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
        if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
            return ffmpegInstaller.path
        }
    } catch (_) {}
    return 'ffmpeg'
}

export interface LiveStreamOptions {
    meetingId: string
    userId: string
    platform: 'youtube' | 'facebook' | 'twitch' | 'linkedin' | 'custom'
    serverUrl?: string
    streamKey: string
    broadcastTitle?: string
    resolution?: '720p' | '1080p'
    bitrate?: string
}

export interface ActiveStreamSession {
    meetingId: string
    userId: string
    options: LiveStreamOptions
    targetRtmpUrl: string
    process: ChildProcessWithoutNullStreams
    startedAt: Date
    bytesIngested: number
    lastChunkAt: number
    status: 'starting' | 'live' | 'error' | 'stopped'
    errorMessage?: string
    isExplicitlyStopped?: boolean
    reconnectAttempts?: number
    pendingBuffer?: Buffer[]
    initHeader?: Buffer
    headerFlushedOnReconnect?: boolean
}

class LiveStreamService extends EventEmitter {
    private sessions: Map<string, ActiveStreamSession> = new Map()

    constructor() {
        super()
        // Automatic watchdog to terminate abandoned FFmpeg streams if host disconnects or crashes (60s grace window)
        setInterval(() => {
            const now = Date.now()
            for (const [mId, s] of this.sessions.entries()) {
                if (s.status === 'live' && s.lastChunkAt && (now - s.lastChunkAt > 60000)) {
                    console.log(`[LiveStream][${mId}] Stream inactivity watchdog: no chunks for 60s, stopping FFmpeg process.`)
                    this.stopStream(mId).catch(() => {})
                }
            }
        }, 10000)
    }

    public getSessions(): Map<string, ActiveStreamSession> {
        return this.sessions
    }

    /**
     * Resolves the full RTMP target destination URL based on platform and stream key
     */
    public resolveRtmpUrl(options: LiveStreamOptions): string {
        const key = (options.streamKey || '').trim()
        const customUrl = (options.serverUrl || '').trim()

        if (customUrl) {
            // If custom serverUrl already includes the key, use as is, else append
            if (customUrl.endsWith('/') || !customUrl.includes('/')) {
                return `${customUrl}${key}`
            }
            return customUrl.endsWith(key) ? customUrl : `${customUrl}/${key}`
        }

        switch (options.platform) {
            case 'youtube':
                return `rtmp://a.rtmp.youtube.com/live2/${key}`
            case 'facebook':
                return `rtmps://live-api-s.facebook.com:443/rtmp/${key}`
            case 'twitch':
                return `rtmp://live.twitch.tv/app/${key}`
            case 'linkedin':
                return `rtmps://live-api.linkedin.com:443/rtmp/${key}`
            default:
                return `rtmp://a.rtmp.youtube.com/live2/${key}`
        }
    }

    /**
     * Spawns an FFmpeg child process for an active stream session with full error handling and auto-reconnect
     */
    private spawnFfmpegProcess(session: ActiveStreamSession): ChildProcessWithoutNullStreams {
        const { meetingId, options, targetRtmpUrl } = session
        const is1080p = options.resolution === '1080p'
        let rawBitrate = options.bitrate ? String(options.bitrate).trim() : (is1080p ? '4500k' : '2500k')
        if (!rawBitrate.toLowerCase().endsWith('k') && !rawBitrate.toLowerCase().endsWith('m')) {
            rawBitrate = `${rawBitrate}k`
        }
        const videoBitrate = rawBitrate
        const numericKbps = parseInt(rawBitrate.replace(/[^0-9]/g, ''), 10) || (is1080p ? 4500 : 2500)
        const bufSize = `${numericKbps * 2}k`
        const scaleFilter = is1080p
            ? 'format=yuv420p,scale=1920:1080:flags=fast_bilinear'
            : 'format=yuv420p,scale=1280:720:flags=fast_bilinear'

        const currentFfmpegPath = getFfmpegPath()
        console.log(`[LiveStream] Spawning FFmpeg (${currentFfmpegPath}) for meeting ${meetingId} -> ${options.platform.toUpperCase()} (${options.resolution || '720p'}) @ ${videoBitrate} (buf: ${bufSize})`)

        const ffmpegArgs = [
            '-analyzeduration', '1000000',
            '-probesize', '1000000',
            '-thread_queue_size', '4096',
            '-err_detect', 'ignore_err',
            '-fflags', '+genpts+nobuffer+discardcorrupt',
            '-f', 'matroska',
            '-i', 'pipe:0',
            '-threads', '0',
            '-max_muxing_queue_size', '4096',
            '-max_interleave_delta', '0',
            '-vf', scaleFilter,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-profile:v', 'baseline',
            '-x264-params', 'no-scenecut=1:keyint=60:min-keyint=60',
            '-bf', '0',
            '-b:v', videoBitrate,
            '-minrate', videoBitrate,
            '-maxrate', videoBitrate,
            '-bufsize', bufSize,
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-g', '60',
            '-keyint_min', '60',
            '-sc_threshold', '0',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-ac', '2',
            '-af', 'aresample=async=1000:first_pts=0',
            '-avoid_negative_ts', 'make_zero',
            '-f', 'flv',
            '-flvflags', 'no_duration_filesize',
            targetRtmpUrl
        ]

        const ffmpegProcess = spawn(currentFfmpegPath, ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        })

        // On reconnect, only write initial header if client has not already been instructed to emit a fresh one
        session.headerFlushedOnReconnect = false
        if (session.initHeader && session.reconnectAttempts && session.reconnectAttempts > 0) {
            try {
                if (ffmpegProcess.stdin && ffmpegProcess.stdin.writable) {
                    ffmpegProcess.stdin.write(session.initHeader)
                    session.headerFlushedOnReconnect = true
                }
            } catch (_) {}
        }

        ffmpegProcess.stdin.on('error', (err: any) => {
            if (err.code !== 'EPIPE') {
                console.warn(`[LiveStream][${meetingId}] stdin error:`, err.message)
            }
        })

        ffmpegProcess.stderr.on('data', (data: Buffer) => {
            const logStr = data.toString()
            try {
                fs.appendFileSync(path.join(__dirname, '../../../ffmpeg_live.log'), logStr)
            } catch (_) {}
            if (logStr.includes('frame=') || logStr.includes('Publishing to') || logStr.includes('Stream #0')) {
                console.log(`[LiveStream][FFmpeg][${meetingId}]`, logStr.trim())
            }
            if (session.status === 'starting' && (logStr.includes('frame=') || logStr.includes('Publishing to'))) {
                session.status = 'live'
                session.reconnectAttempts = 0
                this.emit('stream:status', { meetingId, status: 'live' })
            }
            if (logStr.includes('error') || logStr.includes('Error') || logStr.includes('failed') || logStr.includes('Connection reset')) {
                console.warn(`[LiveStream][FFmpeg][${meetingId}] ${logStr.trim()}`)
            }
        })

        ffmpegProcess.on('close', (code, signal) => {
            console.log(`[LiveStream][${meetingId}] FFmpeg process closed with code ${code}, signal: ${signal}`)

            // Auto-reconnect if unexpectedly closed (e.g. network reset / YouTube abort) and not stopped by user
            if (!session.isExplicitlyStopped) {
                const attempts = (session.reconnectAttempts || 0) + 1
                session.reconnectAttempts = attempts
                if (attempts <= 5) {
                    console.log(`[LiveStream][${meetingId}] Auto-reconnecting live stream (attempt ${attempts}/5)...`)
                    session.status = 'starting'
                    // Retain cached EBML container header so newly spawned FFmpeg process receives valid header
                    session.pendingBuffer = []
                    session.headerFlushedOnReconnect = false

                    // Request client browser to produce fresh EBML header & keyframe
                    this.emit('stream:request-keyframe', { meetingId })
                    setTimeout(() => {
                        if (!session.isExplicitlyStopped && this.sessions.has(meetingId)) {
                            try {
                                session.process = this.spawnFfmpegProcess(session)
                            } catch (spawnErr) {
                                console.error(`[LiveStream][${meetingId}] Auto-reconnect spawn error:`, spawnErr)
                            }
                        }
                    }, 800)
                    return
                }
            }

            session.status = 'stopped'
            this.sessions.delete(meetingId)
            this.emit('stream:status', { meetingId, status: 'stopped', code })
        })

        ffmpegProcess.on('error', (err) => {
            console.error(`[LiveStream][${meetingId}] FFmpeg process error:`, err)
            session.status = 'error'
            session.errorMessage = err.message
            this.emit('stream:status', { meetingId, status: 'error', error: err.message })
        })

        // Flush any buffered chunks upon new process start
        if (session.pendingBuffer && session.pendingBuffer.length > 0) {
            setTimeout(() => {
                if (session.process && session.process.stdin && session.process.stdin.writable) {
                    while (session.pendingBuffer && session.pendingBuffer.length > 0) {
                        const queued = session.pendingBuffer.shift()
                        if (queued) {
                            try {
                                session.process.stdin.write(queued)
                            } catch (_) {}
                        }
                    }
                }
            }, 500)
        }

        return ffmpegProcess
    }

    /**
     * Start a new live stream pipeline for a meeting
     */
    public async startStream(options: LiveStreamOptions): Promise<ActiveStreamSession> {
        const { meetingId } = options

        // If a stream is already active for this meeting, stop it first
        if (this.sessions.has(meetingId)) {
            await this.stopStream(meetingId)
        }

        const targetRtmpUrl = this.resolveRtmpUrl(options)

        const session: ActiveStreamSession = {
            meetingId,
            userId: options.userId,
            options,
            targetRtmpUrl,
            process: null as any,
            startedAt: new Date(),
            bytesIngested: 0,
            lastChunkAt: Date.now(),
            status: 'starting',
            isExplicitlyStopped: false,
            reconnectAttempts: 0,
            pendingBuffer: []
        }

        try {
            session.process = this.spawnFfmpegProcess(session)
        } catch (err: any) {
            console.error(`[LiveStream] Failed to spawn FFmpeg at path "${getFfmpegPath()}":`, err)
            throw new Error(`Failed to initialize streaming engine: ${err?.message || 'FFmpeg spawn error'}`)
        }

        this.sessions.set(meetingId, session)
        return session
    }

    /**
     * Push incoming WebM audio/video chunk from browser client into FFmpeg STDIN
     */
    public pushChunk(meetingId: string, chunk: Buffer | ArrayBuffer): boolean {
        const session = this.sessions.get(meetingId)
        if (!session || session.isExplicitlyStopped) {
            return false
        }

        try {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            session.lastChunkAt = Date.now()

            // Detect fresh EBML container header (magic bytes 0x1A45DFA3)
            const ebmlMagic = Buffer.from([0x1a, 0x45, 0xdf, 0xa3])
            const headerIdx = buf.indexOf(ebmlMagic)

            if (headerIdx !== -1) {
                const headerSlice = headerIdx === 0 ? buf : buf.subarray(headerIdx)
                session.initHeader = headerSlice

                if (session.process && session.process.stdin && session.process.stdin.writable) {
                    session.process.stdin.write(headerSlice)
                    session.bytesIngested += headerSlice.length
                    return true
                }
            } else if (!session.initHeader) {
                // Drop initial non-EBML orphan bytes before container header arrives so FFmpeg stdin is never corrupted
                return false
            }

            if (session.process && session.process.stdin && session.process.stdin.writable) {
                // If there are pending queued chunks from a brief reconnect, flush them first
                if (session.pendingBuffer && session.pendingBuffer.length > 0) {
                    while (session.pendingBuffer.length > 0) {
                        const queued = session.pendingBuffer.shift()
                        if (queued) session.process.stdin.write(queued)
                    }
                }
                session.process.stdin.write(buf)
                session.bytesIngested += buf.length
                return true
            } else {
                // Buffer incoming chunks while reconnecting or starting (keep up to ~45 chunks)
                if (!session.pendingBuffer) session.pendingBuffer = []
                if (session.pendingBuffer.length < 45) {
                    session.pendingBuffer.push(buf)
                }
                return true
            }
        } catch (err: any) {
            console.warn(`[LiveStream][${meetingId}] Error writing chunk to stdin:`, err.message)
            return false
        }
    }

    /**
     * Stop and cleanup the active live stream for a meeting
     */
    public async stopStream(meetingId: string): Promise<boolean> {
        const session = this.sessions.get(meetingId)
        if (!session) return false

        session.isExplicitlyStopped = true
        session.status = 'stopped'
        try {
            if (session.process && !session.process.killed) {
                session.process.stdin.end()
                setTimeout(() => {
                    try {
                        if (!session.process.killed) {
                            session.process.kill('SIGINT')
                        }
                    } catch (_) {}
                }, 500)
            }
        } catch (_) {}

        this.sessions.delete(meetingId)
        this.emit('stream:status', { meetingId, status: 'stopped' })
        return true
    }

    /**
     * Get status of an active stream
     */
    public getStreamSession(meetingId: string): ActiveStreamSession | undefined {
        return this.sessions.get(meetingId)
    }

    /**
     * Check if a meeting currently has an active stream
     */
    public isStreaming(meetingId: string): boolean {
        const session = this.sessions.get(meetingId)
        return !!session && !session.isExplicitlyStopped && (session.status === 'starting' || session.status === 'live')
    }
}

export const liveStreamService = new LiveStreamService()
