import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'events'

// Resolve cross-platform FFmpeg executable
let resolvedFfmpegPath = 'ffmpeg'
try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    if (ffmpegInstaller && ffmpegInstaller.path) {
        resolvedFfmpegPath = ffmpegInstaller.path
    }
} catch (_) {
    resolvedFfmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'
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
}

class LiveStreamService extends EventEmitter {
    private sessions: Map<string, ActiveStreamSession> = new Map()

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
     * Start a new live stream pipeline for a meeting
     */
    public async startStream(options: LiveStreamOptions): Promise<ActiveStreamSession> {
        const { meetingId } = options

        // If a stream is already active for this meeting, stop it first
        if (this.sessions.has(meetingId)) {
            await this.stopStream(meetingId)
        }

        const targetRtmpUrl = this.resolveRtmpUrl(options)
        const videoBitrate = options.bitrate || (options.resolution === '1080p' ? '4500k' : '2500k')
        const scaleFilter = options.resolution === '1080p' ? 'scale=1920:1080' : 'scale=1280:720'

        console.log(`[LiveStream] Spawning FFmpeg for meeting ${meetingId} -> ${options.platform.toUpperCase()} (${options.resolution || '720p'})`)

        // High performance FFmpeg flags: read webm from stdin and push FLV to RTMP destination
        const ffmpegArgs = [
            '-fflags', '+genpts+nobuffer',
            '-flags', '+low_delay',
            '-i', '-',                  // Read WebM/Matroska stream from STDIN
            '-vf', scaleFilter,         // Enforce output resolution
            '-c:v', 'libx264',          // Encode H.264 video
            '-preset', 'veryfast',      // Low CPU overhead preset
            '-tune', 'zerolatency',     // Real-time zero latency tuning
            '-b:v', videoBitrate,       // Target video bitrate
            '-maxrate', videoBitrate,   // Constrain max bitrate
            '-bufsize', '5000k',        // Buffer size
            '-pix_fmt', 'yuv420p',      // Standard color space for RTMP
            '-g', '60',                 // 2-second keyframe GOP (30fps * 2)
            '-c:a', 'aac',              // AAC audio
            '-b:a', '128k',             // 128 kbps audio
            '-ar', '44100',             // 44.1 kHz sample rate
            '-f', 'flv',                // Flash Video format for RTMP ingest
            '-flvflags', 'no_duration_filesize',
            targetRtmpUrl
        ]

        let ffmpegProcess: ChildProcessWithoutNullStreams
        try {
            ffmpegProcess = spawn(resolvedFfmpegPath, ffmpegArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            })
        } catch (err: any) {
            console.error(`[LiveStream] Failed to spawn FFmpeg at path "${resolvedFfmpegPath}":`, err)
            throw new Error(`Failed to initialize streaming engine: ${err?.message || 'FFmpeg spawn error'}`)
        }

        const session: ActiveStreamSession = {
            meetingId,
            userId: options.userId,
            options,
            targetRtmpUrl,
            process: ffmpegProcess,
            startedAt: new Date(),
            bytesIngested: 0,
            lastChunkAt: Date.now(),
            status: 'starting'
        }

        this.sessions.set(meetingId, session)

        ffmpegProcess.stdin.on('error', (err: any) => {
            // Ignore broken pipe when process stops
            if (err.code !== 'EPIPE') {
                console.warn(`[LiveStream][${meetingId}] stdin error:`, err.message)
            }
        })

        ffmpegProcess.stderr.on('data', (data: Buffer) => {
            const logStr = data.toString()
            if (session.status === 'starting' && (logStr.includes('frame=') || logStr.includes('Publishing to'))) {
                session.status = 'live'
                this.emit('stream:status', { meetingId, status: 'live' })
            }
            if (logStr.includes('error') || logStr.includes('Error') || logStr.includes('failed') || logStr.includes('Connection reset')) {
                console.warn(`[LiveStream][FFmpeg][${meetingId}] ${logStr.trim()}`)
            }
        })

        ffmpegProcess.on('close', (code, signal) => {
            console.log(`[LiveStream][${meetingId}] FFmpeg process closed with code ${code}, signal: ${signal}`)
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

        return session
    }

    /**
     * Push incoming WebM audio/video chunk from browser client into FFmpeg STDIN
     */
    public pushChunk(meetingId: string, chunk: Buffer | ArrayBuffer): boolean {
        const session = this.sessions.get(meetingId)
        if (!session || !session.process || session.status === 'stopped' || session.status === 'error') {
            return false
        }

        try {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            if (session.process.stdin.writable) {
                session.process.stdin.write(buf)
                session.bytesIngested += buf.length
                session.lastChunkAt = Date.now()
                return true
            }
            return false
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

        session.status = 'stopped'
        try {
            if (session.process && !session.process.killed) {
                // Try graceful close of stdin first
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
        return !!session && (session.status === 'starting' || session.status === 'live')
    }
}

export const liveStreamService = new LiveStreamService()
