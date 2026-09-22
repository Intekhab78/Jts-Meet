import { Request, Response } from 'express'
import { telephonyService } from './telephony.service'
import { sendSuccess, sendError } from '../../utils/responseHelper'
import { getIO } from '../../socket'

export const telephonyController = {
    /**
     * Get PSTN dial-in numbers and PIN for a meeting
     */
    getDialInInfo: async (req: Request, res: Response) => {
        const meetingId = String(req.params.meetingId || '')
        if (!meetingId) {
            return sendError(res, 400, 'Meeting ID is required')
        }

        try {
            const details = await telephonyService.getDialInDetails(meetingId)
            return sendSuccess(res, details, 'Dial-in information retrieved successfully')
        } catch (error: any) {
            console.error('[getDialInInfo] Error:', error)
            return sendError(res, 500, error.message || 'Failed to retrieve dial-in information')
        }
    },

    /**
     * Webhook endpoint called by Twilio/SIP provider on incoming phone call
     */
    handleIncomingCall: async (req: Request, res: Response) => {
        try {
            const host = req.get('host') || 'localhost:4000'
            const proto = req.get('x-forwarded-proto') || 'http'
            const verifyCallbackUrl = `${proto}://${host}/api/telephony/voice/verify`

            const twiml = telephonyService.generateWelcomeTwiML(verifyCallbackUrl)
            res.type('text/xml')
            return res.send(twiml)
        } catch (error: any) {
            console.error('[handleIncomingCall] Error:', error)
            res.type('text/xml')
            return res.send(telephonyService.generateInvalidPinTwiML())
        }
    },

    /**
     * Webhook endpoint called when phone caller submits DTMF keypad digits
     */
    handleVerifyPin: async (req: Request, res: Response) => {
        try {
            const digits = String(req.body.Digits || req.query.Digits || '').trim()
            const caller = String(req.body.From || req.body.Caller || 'Unknown Caller')
            const host = req.get('host') || 'localhost:4000'
            const wsProto = req.secure || req.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws'

            const meeting = await telephonyService.verifyPin(digits)

            if (!meeting) {
                res.type('text/xml')
                return res.send(telephonyService.generateInvalidPinTwiML())
            }

            // Broadcast to all participants that a PSTN phone caller joined the audio bridge
            const io = getIO()
            if (io) {
                io.to(`meeting:${meeting.meetingId}`).emit('meeting:pstn:joined', {
                    meetingId: meeting.meetingId,
                    caller: caller.replace(/(\+\d{1,3}\d{3})\d{4}(\d{2})/, '$1****$2'),
                    dialedAt: new Date().toISOString()
                })
            }

            const streamUrl = `${wsProto}://${host}/api/telephony/voice/media/${meeting.meetingId}?caller=${encodeURIComponent(caller)}`
            const bridgeTwiml = telephonyService.generateBridgeTwiML(meeting.title, streamUrl)

            res.type('text/xml')
            return res.send(bridgeTwiml)
        } catch (error: any) {
            console.error('[handleVerifyPin] Error:', error)
            res.type('text/xml')
            return res.send(telephonyService.generateInvalidPinTwiML())
        }
    }
}
