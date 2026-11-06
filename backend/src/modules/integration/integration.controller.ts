import { Request, Response } from 'express'
import { AuthRequest } from '../../middleware/authMiddleware'
import { sendSuccess, sendError } from '../../utils/responseHelper'
import * as integrationService from './integration.service'
import { FRONTEND_URL } from '../../config'
import { adHocRoomSettings } from '../../routes/guest.routes'

export const integrationController = {
    handleInboundWebhook: async (req: Request, res: Response) => {
        try {
            const body = req.body || {}
            const meetingId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            const title = body.roomName || body.title || body.name || 'External Website Consultation'
            const hostName = body.hostName || body.agentName || body.user || 'Website Agent'

            // Register in ad-hoc room cache for immediate guest & host join
            adHocRoomSettings[meetingId] = {
                title,
                hostName,
                isWaitingRoomEnabled: false,
                isGuestJoinEnabled: true
            }

            // Always resolve to frontend client app URL (localhost:3000 in dev, meet.jtsmiddleeast.com in prod)
            let frontendBase = FRONTEND_URL || ''
            if (!frontendBase || frontendBase.includes('localhost:4000')) {
                const host = req.get('host') || 'meet.jtsmiddleeast.com'
                const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
                frontendBase = `${proto}://${host.replace(':4000', ':3000')}`
            }
            frontendBase = frontendBase.replace(/\/+$/, '')
            const joinUrl = `${frontendBase}/meet/${meetingId}`

            return res.status(200).json({
                success: true,
                status: 'operational',
                message: 'JTS Meet Inbound Gateway Handshake Successful',
                receivedAt: new Date().toISOString(),
                room: {
                    id: meetingId,
                    title,
                    hostName,
                    joinUrl,
                    guestJoinUrl: joinUrl,
                    createdAt: new Date().toISOString()
                }
            })
        } catch (err: any) {
            return res.status(500).json({
                success: false,
                error: err.message || 'Failed to process inbound webhook'
            })
        }
    },

    list: async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) return sendError(res, 401, 'Unauthorized')
            const orgId = (req.query.orgId as string) || (req as any).user?.organizationId
            const data = await integrationService.listIntegrations(req.userId, orgId)
            return sendSuccess(res, data, 'Integrations retrieved successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to list integrations')
        }
    },

    create: async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) return sendError(res, 401, 'Unauthorized')
            const orgId = req.body.organizationId || (req.query.orgId as string) || (req as any).user?.organizationId
            const { name, type, url, secret, events, config } = req.body

            if (!name || !type || !url) {
                return sendError(res, 400, 'Name, Type and URL are required')
            }

            const item = await integrationService.createIntegration(req.userId, orgId, {
                name,
                type,
                url,
                secret,
                events,
                config
            })

            return sendSuccess(res, item, 'Integration endpoint configured successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to create integration')
        }
    },

    delete: async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) return sendError(res, 401, 'Unauthorized')
            const id = req.params.id as string
            await integrationService.deleteIntegration(req.userId, id)
            return sendSuccess(res, { success: true }, 'Integration removed successfully')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to delete integration')
        }
    },

    toggle: async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) return sendError(res, 401, 'Unauthorized')
            const id = req.params.id as string
            const { status } = req.body
            if (!['active', 'paused'].includes(status)) {
                return sendError(res, 400, 'Invalid status. Must be active or paused')
            }
            const updated = await integrationService.toggleIntegration(req.userId, id, status)
            return sendSuccess(res, updated, `Integration ${status === 'active' ? 'resumed' : 'paused'} successfully`)
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to toggle integration')
        }
    },

    test: async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) return sendError(res, 401, 'Unauthorized')
            const id = req.params.id as string
            const result = await integrationService.testIntegration(req.userId, id)
            return sendSuccess(res, result, 'Test simulation payload sent')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'Failed to execute integration test')
        }
    }
}
