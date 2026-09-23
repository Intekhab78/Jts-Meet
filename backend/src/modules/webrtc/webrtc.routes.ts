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
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
        {
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: process.env.TURN_USERNAME || 'openrelay',
            credential: process.env.TURN_CREDENTIAL || 'openrelay'
        },
        {
            urls: [
                'turns:openrelay.metered.ca:443?transport=tcp',
                'turns:openrelay.metered.ca:5349?transport=tcp'
            ],
            username: process.env.TURN_USERNAME || 'openrelay',
            credential: process.env.TURN_CREDENTIAL || 'openrelay'
        }
    ]

    res.json({
        success: true,
        iceServers
    })
})

export default router
