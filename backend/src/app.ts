import path from 'path'
import fs from 'fs'
import express, { Request, Response } from 'express'
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
import aiRoutes from './routes/ai.routes'
import integrationRoutes from './modules/integration/integration.routes'
import planRoutes from './modules/plan/plan.routes'
import clipRoutes from './modules/clip/clip.routes'
import calendarRoutes from './modules/calendar/calendar.routes'
import telephonyRoutes from './modules/telephony/telephony.routes'
import webrtcRoutes from './modules/webrtc/webrtc.routes'
import paymentRoutes from './modules/plan/payment.routes'
import cookieParser from 'cookie-parser'
import { seedDefaultPlans } from './modules/plan/plan.model'
import { connectDB } from './config/db'
import { rateLimiter } from './middleware/rateLimiter'
import { authenticate } from './middleware/authMiddleware'

import { FRONTEND_URL, ALLOWED_ORIGINS, NODE_ENV } from './config'

const app = express()

app.set('trust proxy', 1)

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))

const defaultAllowedOrigins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://meet.jtsmiddleeast.com',
    ...ALLOWED_ORIGINS
].filter(Boolean)

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow mobile apps, electron, curl, postman (no origin)
        if (!origin) {
            return callback(null, true)
        }

        // Allow Mobile Apps (Capacitor), Electron custom schemes and local file origin
        if (
            origin.startsWith('vscode-webview://') ||
            origin.startsWith('electron://') ||
            origin.startsWith('capacitor://') ||
            origin === 'https://localhost' ||
            origin === 'http://localhost' ||
            origin === 'null'
        ) {
            return callback(null, true)
        }

        // In development, allow localhost, 127.0.0.1 and private network IPs (LAN testing)
        if (NODE_ENV !== 'production') {
            const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+|192\.168\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+)(:\d+)?$/.test(origin)
            if (isLocal) {
                return callback(null, true)
            }
        }

        // Check against configured allowed origins
        const isWhitelisted = defaultAllowedOrigins.some((allowed) => {
            const normAllowed = allowed.replace(/\/$/, '')
            const normOrigin = origin.replace(/\/$/, '')
            return normOrigin === normAllowed
        })

        if (isWhitelisted) {
            return callback(null, true)
        }

        return callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}))

app.use(cookieParser())
app.use(json({
    limit: '50mb',
    verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf
    }
}))
app.use(urlencoded({ extended: true, limit: '50mb' }))
app.use(passport.initialize())
app.use(requestLogger)

// Static uploads directory for local file storage (avatars, attachments, media)
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

// Try connecting to DB, but don't crash on failure
connectDB()
    .then(() => {
        seedDefaultPlans()
    })
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('DB connection failed (continuing):', err?.message || err)
    })

// Health check endpoint for dev-environment detection
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).send('OK')
})

// Unrestricted access for all meeting, chat, auth, and workspace routes (No limits / Unlimited 24/7)
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/meeting', meetingRoutes)
app.use('/api/meeting/chat', meetingChatRoutes)
app.use('/api/file', fileRoutes)
app.use('/api/organization', organizationRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/channel', channelRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/guest', guestRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/clips', clipRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/telephony', telephonyRoutes)
app.use('/api/webrtc', webrtcRoutes)
app.use('/api/payment', paymentRoutes)

// Global error handler
app.use(errorHandler)

export default app
