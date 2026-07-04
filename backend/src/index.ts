import http from 'http'
import app from './app'
import { PORT } from './config'
import { initializeSocket } from './socket'

const server = http.createServer(app)
const io = initializeSocket(server)

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`JTS Meet backend listening on port ${PORT}`)
})

export default server
