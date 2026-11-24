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
import { authenticate, AuthRequest } from '../../middleware/authMiddleware'
import { LIVEKIT_URL } from '../../config'

/**
 * GET /api/webrtc/sfu/status
 * Returns whether LiveKit SFU server configuration is active AND actually reachable
 */
router.get('/sfu/status', async (_req: Request, res: Response) => {
    const sfuConfigured = sfuService.isConfigured()
    let sfuReachable = false

    if (sfuConfigured && LIVEKIT_URL) {
        try {
            const httpUrl = LIVEKIT_URL
                .replace(/^wss:\/\//i, 'https://')
                .replace(/^ws:\/\//i, 'http://')
                .replace(/\/$/, '')
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 800)
            const probe = await fetch(httpUrl, { method: 'GET', signal: controller.signal }).catch(() => null)
            clearTimeout(timer)
            sfuReachable = Boolean(probe && probe.status < 500)
        } catch {
            sfuReachable = false
        }
    }

    res.json({
        success: true,
        sfuConfigured,
        sfuReachable,
        livekitUrl: sfuReachable ? LIVEKIT_URL : undefined
    })
})

import { Meeting } from '../meeting/meeting.model'

/**
 * GET /api/webrtc/sfu/token/:meetingId
 * Issues a signed LiveKit SFU participant access token for high-density enterprise conferences
 */
router.get('/sfu/token/:meetingId', authenticate, async (req: AuthRequest, res: Response) => {
    const meetingId = req.params.meetingId as string
    if (!req.userId || req.isPending) {
        res.status(403).json({
            success: false,
            message: 'Forbidden: Approved participant authentication is required for SFU access'
        })
        return
    }

    const baseMeetingId = meetingId.includes('__') ? meetingId.split('__')[0] : meetingId
    if (req.isGuest && req.meetingId !== meetingId && req.meetingId !== baseMeetingId) {
        res.status(403).json({
            success: false,
            message: 'Forbidden: Guest token is not valid for this meeting'
        })
        return
    }

    const userId = req.userId
    const displayName = (req.query.displayName as string) || (req.isGuest ? 'Guest Participant' : 'Participant')

    // Never trust client query `isHost=true` directly; verify against Meeting host/coHosts when authenticated
    let isHost = false
    try {
        const meeting = await Meeting.findOne({ meetingId: baseMeetingId })
            .select('host coHosts status isLocked blockedUsers isGuestJoinEnabled')
            .lean()
            .exec()
        if (meeting) {
            if (meeting.status === 'ended') {
                res.status(403).json({
                    success: false,
                    message: 'Meeting has ended'
                })
                return
            }

            const isOwner = String(meeting.host) === String(userId)
            const isCoHost = Array.isArray((meeting as any).coHosts) && (meeting as any).coHosts.some((c: any) => String(c) === String(userId))
            isHost = !req.isGuest && (isOwner || isCoHost)

            const isBlocked = Array.isArray((meeting as any).blockedUsers) &&
                (meeting as any).blockedUsers.some((b: any) => String(b) === String(userId))
            if (isBlocked) {
                res.status(403).json({
                    success: false,
                    message: 'You have been removed or blocked from this meeting'
                })
                return
            }

            if (meeting.isLocked && !isHost) {
                res.status(403).json({
                    success: false,
                    message: 'Meeting is locked by the host'
                })
                return
            }

            if (req.isGuest && meeting.isGuestJoinEnabled === false) {
                res.status(403).json({
                    success: false,
                    message: 'Guest access is disabled for this meeting'
                })
                return
            }
        }
    } catch (_) {}

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
