import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { getIO } from '../socket'

interface ActivePstnCall {
    callSid: string
    streamSid: string
    meetingId: string
    caller: string
    ws: WebSocket
    joinedAt: Date
}

class TelephonyMediaService {
    private wss: WebSocketServer
    private activeCalls: Map<string, ActivePstnCall> = new Map() // keyed by streamSid

    constructor() {
        this.wss = new WebSocketServer({ noServer: true })
        this.setupWebSocketServer()
    }

    private setupWebSocketServer() {
        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`)
            const pathParts = url.pathname.split('/')
            const meetingId = pathParts[pathParts.length - 1] || 'default'
            const caller = url.searchParams.get('caller') || 'PSTN Caller'

            console.log(`[TelephonyMedia] Incoming media stream connection for meeting: ${meetingId} from: ${caller}`)

            let currentStreamSid = ''

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message)

                    switch (data.event) {
                        case 'connected':
                            console.log(`[TelephonyMedia] Twilio stream handshake received`)
                            break

                        case 'start':
                            currentStreamSid = data.start?.streamSid || ''
                            const callSid = data.start?.callSid || ''
                            const activeCall: ActivePstnCall = {
                                callSid,
                                streamSid: currentStreamSid,
                                meetingId,
                                caller,
                                ws,
                                joinedAt: new Date()
                            }
                            this.activeCalls.set(currentStreamSid, activeCall)

                            const io = getIO()
                            if (io) {
                                io.to(`meeting:${meetingId}`).emit('meeting:pstn:joined', {
                                    meetingId,
                                    streamSid: currentStreamSid,
                                    caller: caller.replace(/(\+\d{1,3}\d{3})\d{4}(\d{2})/, '$1****$2'),
                                    fullCaller: caller,
                                    joinedAt: new Date().toISOString()
                                })
                            }
                            break

                        case 'media':
                            if (data.media?.payload) {
                                const ioInstance = getIO()
                                if (ioInstance) {
                                    // Broadcast G.711 mu-law base64 audio chunk to meeting participants
                                    ioInstance.to(`meeting:${meetingId}`).emit('meeting:pstn:audio', {
                                        meetingId,
                                        caller,
                                        streamSid: currentStreamSid,
                                        payload: data.media.payload, // base64 encoded 8kHz mu-law audio
                                        timestamp: data.media.timestamp
                                    })
                                }
                            }
                            break

                        case 'stop':
                            console.log(`[TelephonyMedia] Twilio stream stopped: ${currentStreamSid}`)
                            this.handleCallerHangup(currentStreamSid, meetingId, caller)
                            break
                    }
                } catch (err: any) {
                    console.error('[TelephonyMedia] Error parsing WebSocket message:', err.message)
                }
            })

            ws.on('close', () => {
                console.log(`[TelephonyMedia] WebSocket closed for stream: ${currentStreamSid}`)
                if (currentStreamSid) {
                    this.handleCallerHangup(currentStreamSid, meetingId, caller)
                }
            })

            ws.on('error', (err) => {
                console.error(`[TelephonyMedia] WebSocket error for meeting ${meetingId}:`, err)
            })
        })
    }

    private handleCallerHangup(streamSid: string, meetingId: string, caller: string) {
        if (this.activeCalls.has(streamSid)) {
            this.activeCalls.delete(streamSid)
        }

        const io = getIO()
        if (io) {
            io.to(`meeting:${meetingId}`).emit('meeting:pstn:left', {
                meetingId,
                streamSid,
                caller: caller.replace(/(\+\d{1,3}\d{3})\d{4}(\d{2})/, '$1****$2'),
                leftAt: new Date().toISOString()
            })
        }
    }

    /**
     * Send meeting participant audio back down to the telephone caller
     */
    public sendAudioToPstn(meetingId: string, mulawBase64: string) {
        for (const call of this.activeCalls.values()) {
            if (call.meetingId === meetingId && call.ws.readyState === WebSocket.OPEN) {
                try {
                    call.ws.send(JSON.stringify({
                        event: 'media',
                        streamSid: call.streamSid,
                        media: {
                            payload: mulawBase64
                        }
                    }))
                } catch (_) {}
            }
        }
    }

    /**
     * Handle HTTP Upgrade requests matching `/api/telephony/voice/media/`
     */
    public handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
            this.wss.emit('connection', ws, req)
        })
    }

    public getActiveCallsForMeeting(meetingId: string): ActivePstnCall[] {
        return Array.from(this.activeCalls.values()).filter(c => c.meetingId === meetingId)
    }
}

export const telephonyMediaService = new TelephonyMediaService()
