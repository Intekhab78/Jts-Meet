import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import passport from 'passport'
import './config/passport'
import { json, urlencoded } from 'express'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import authRoutes from './routes/auth.routes'
import chatRoutes from './modules/chat/chat.routes'
import meetingRoutes from './modules/meeting/meeting.routes'
import meetingChatRoutes from './modules/meeting-chat/meetingChat.routes'
import fileRoutes from './modules/file/file.routes'
import organizationRoutes from './modules/organization/organization.routes'
import teamRoutes from './modules/team/team.routes'
import channelRoutes from './modules/channel/channel.routes'
import adminRoutes from './modules/admin/admin.routes'
import guestRoutes from './routes/guest.routes'
import notificationRoutes from './modules/notification/notification.routes'
import { connectDB } from './config/db'
import { rateLimiter } from './middleware/rateLimiter'

const app = express()

app.use(helmet())
app.use(cors())
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(requestLogger)

// Try connecting to DB, but don't crash on failure
connectDB().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('DB connection failed (continuing):', err?.message || err)
})

// Health check endpoint for dev-environment detection
app.get('/api/health', (req, res) => {
    res.status(200).send('OK')
})

// Register auth routes with strict limits
app.use('/api/auth', rateLimiter(15 * 60 * 1000, 100), authRoutes)
app.use('/api', rateLimiter(15 * 60 * 1000, 200))

app.use('/api/chat', chatRoutes)
app.use('/api/meeting', meetingRoutes)
app.use('/api/meeting/chat', meetingChatRoutes)
app.use('/api/file', fileRoutes)
app.use('/api/organization', organizationRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/channel', channelRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/guest', guestRoutes)
app.use('/api/notifications', notificationRoutes)

// Global error handler
app.use(errorHandler)

export default app
