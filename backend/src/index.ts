import http from 'http'
import app from './app'
import { PORT } from './config'
import { initializeSocket } from './socket'
import { initializeCronJobs } from './jobs/meetingCron'
import { telephonyMediaService } from './services/telephonyMedia.service'

const server = http.createServer(app)

// Process-level safety: prevent transient unhandled Redis timeouts or network drops from crashing PM2 instances
process.on('unhandledRejection', (reason: any) => {
  if (reason?.name === 'TimeoutError' || reason?.message?.includes('Timeout') || reason?.message?.includes('Redis')) {
    console.warn('[Process] Handled transient Redis/network TimeoutError (prevented crash):', reason?.message || reason)
    return
  }
  console.error('[Process] Unhandled Promise Rejection:', reason)
})

process.on('uncaughtException', (error: Error) => {
  console.error('[Process] Uncaught Exception:', error)
  if (error?.message?.includes('Redis') || (error as any)?.code === 'ECONNRESET' || (error as any)?.code === 'EPIPE') {
    return
  }
})

// Handle raw WebSocket upgrade for Twilio PSTN Phone Call Media Streams
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/api/telephony/voice/media')) {
    telephonyMediaService.handleUpgrade(req, socket as any, head)
  }
})

async function startServer() {
  try {
    const io = await initializeSocket(server)
    ;(global as any).io = io
    app.set('io', io)
    
    // Start scheduled background jobs
    initializeCronJobs()
    
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`JTS Meet backend listening on port ${PORT}`)
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start JTS Meet backend server:', error)
    process.exit(1)
  }
}

startServer()

export default server
