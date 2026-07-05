import http from 'http'
import app from './app'
import { PORT } from './config'
import { initializeSocket } from './socket'
import { initializeCronJobs } from './jobs/meetingCron'

const server = http.createServer(app)

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
