import { Router, Request, Response } from 'express'

const router = Router()

/**
 * GET /api/webrtc/ice-servers
 * Returns production STUN + TURN configurations.
 * Allows production deployments to dynamically provide custom coturn / Twilio / Metered credentials
 * without requiring client-side hardcoding.
 */
router.get('/ice-servers', (req: Request, res: Response) => {
    const customTurnUrl = process.env.TURN_URL
    const customTurnUser = process.env.TURN_USERNAME
    const customTurnPass = process.env.TURN_CREDENTIAL

    const customTurnList: any[] = []
    if (customTurnUrl) {
        customTurnList.push({
            urls: customTurnUrl.split(',').map((u: string) => u.trim()),
            username: customTurnUser || undefined,
            credential: customTurnPass || undefined
        })
    }

    const iceServers = [
        ...customTurnList,
        // High-Reliability OpenRelay Global Community TURN servers (UDP, TCP, and Port 443 TLS)
        // Pierces through Symmetric NAT (Jio 4G/5G, Airtel, Vi), corporate firewalls, and campus networks
        {
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp',
                'turns:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
    ]

    res.json({
        success: true,
        iceServers
    })
})

import { sfuService } from '../../services/sfu.service'
import { optionalAuthenticate, AuthRequest } from '../../middleware/authMiddleware'

/**
 * GET /api/webrtc/sfu/status
 * Returns whether LiveKit SFU server configuration is active
 */
router.get('/sfu/status', (_req: Request, res: Response) => {
    res.json({
        success: true,
        sfuConfigured: sfuService.isConfigured()
    })
})

/**
 * GET /api/webrtc/sfu/token/:meetingId
 * Issues a signed LiveKit SFU participant access token for high-density enterprise conferences
 */
router.get('/sfu/token/:meetingId', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    const meetingId = req.params.meetingId as string
    const userId = req.userId || (req.query.userId as string) || `guest_${Math.random().toString(36).slice(2, 8)}`
    const displayName = (req.query.displayName as string) || 'Participant'
    const isHost = req.query.isHost === 'true'

    const result = await sfuService.generateParticipantToken({
        meetingId,
        userId,
        displayName,
        isHost
    })

    res.json({
        success: true,
        ...result
    })
})

export default router
