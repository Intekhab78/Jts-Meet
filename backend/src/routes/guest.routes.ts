import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'
import { getEffectivePlanForOrg, getEffectivePlanForUser } from '../modules/plan/planEntitlements'
import { rateLimiter } from '../middleware/rateLimiter'
import { PlatformSettings } from '../modules/admin/platformSettings.model'

const router = Router()

// In-memory cache for ad-hoc / instant meeting room configurations
export const adHocRoomSettings: Record<string, { isWaitingRoomEnabled?: boolean; isGuestJoinEnabled?: boolean; title?: string; hostName?: string }> = {}

// GET /api/guest/meeting/:meetingId
router.get('/meeting/:meetingId', async (req: Request, res: Response) => {
    try {
        const meetingId = String(req.params.meetingId)
        const meeting = await getMeetingByMeetingId(meetingId)
        
        if (!meeting) {
            // Support instant / ad-hoc meeting rooms (e.g. room-xxxx, ext_xxxx)
            if (meetingId.startsWith('room-') || meetingId.startsWith('ext_') || meetingId.length >= 4) {
                const adHoc = adHocRoomSettings[meetingId]
                const isWaitingRoom = adHoc?.isWaitingRoomEnabled === true
                res.json({
                    success: true,
                    data: {
                        title: adHoc?.title || `Room ${meetingId}`,
                        hostName: adHoc?.hostName || 'Host',
                        isWaitingRoomEnabled: isWaitingRoom,
                        isGuestJoinEnabled: adHoc?.isGuestJoinEnabled !== false
                    }
                })
                return
            }
            res.status(404).json({ success: false, message: 'Meeting not found' })
            return
        }

        if (meeting.status === 'ended') {
            res.status(400).json({ success: false, message: 'Meeting has already ended' })
            return
        }

        const orgIdRaw = (meeting.organizationId as any)?._id || meeting.organizationId
        const hostIdRaw = (meeting.host as any)?._id || meeting.host
        const effectivePlan = orgIdRaw
            ? await getEffectivePlanForOrg(String(orgIdRaw))
            : await getEffectivePlanForUser(String(hostIdRaw))

        res.json({
            success: true,
            data: {
                title: meeting.title,
                hostName: (meeting.host as any)?.fullName || 'Organizer',
                isWaitingRoomEnabled: meeting.isWaitingRoomEnabled !== false,
                isGuestJoinEnabled: (meeting as any).isGuestJoinEnabled !== false,
                meetingStatus: meeting.status,
                isHostOnline: meeting.status === 'active',
                planTier: effectivePlan.planTier,
                planLimits: {
                    planTier: effectivePlan.planTier,
                    isPaid: effectivePlan.isPaid,
                    limits: effectivePlan.limits,
                    features: effectivePlan.features
                }
            }
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error' })
    }
})

// POST /api/guest/request (Rate limited: max 60 guest requests/min per IP)
router.post('/request', rateLimiter(60 * 1000, 60), async (req: Request, res: Response) => {
    try {
        const meetingId = String(req.body.meetingId || '').trim()
        const guestName = String(req.body.guestName || '').trim()
        const email = req.body.email ? String(req.body.email).trim() : ''
        const company = req.body.company ? String(req.body.company).trim() : ''
        const rawExistingId = typeof req.body.existingUserId === 'string' ? req.body.existingUserId.trim() : ''
        const validExistingGuestId = /^guest_[a-zA-Z0-9]{4,20}$/.test(rawExistingId) ? rawExistingId : ''

        if (!meetingId || !guestName) {
            res.status(400).json({ success: false, message: 'Meeting ID and Guest Name are required' })
            return
        }

        const platformSettings = await PlatformSettings.findOne().select('allowGuestAccess').lean().exec()
        if (platformSettings && platformSettings.allowGuestAccess === false) {
            res.status(403).json({ success: false, message: 'Guest access is disabled by platform policy' })
            return
        }

        const meeting = await getMeetingByMeetingId(meetingId)
        if (meeting && meeting.isGuestJoinEnabled === false) {
            res.status(403).json({ success: false, message: 'Guest access is disabled for this meeting' })
            return
        }
        if (!meeting) {
            // Allow ad-hoc / instant rooms without database records
            if (meetingId.startsWith('room-') || meetingId.startsWith('ext_') || meetingId.length >= 4) {
                const adHoc = adHocRoomSettings[meetingId]
                const isWaitingRoom = adHoc?.isWaitingRoomEnabled === true
                const tempGuestId = validExistingGuestId || `guest_${Math.random().toString(36).substring(2, 11)}`
                const token = jwt.sign(
                    {
                        userId: tempGuestId,
                        isGuest: true,
                        guestName: guestName.trim(),
                        email,
                        company,
                        meetingId,
                        isPending: isWaitingRoom
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                )
                res.json({
                    success: true,
                    data: {
                        token,
                        userId: tempGuestId,
                        isPending: isWaitingRoom,
                        meetingTitle: adHoc?.title || `Room ${meetingId}`,
                        hostName: adHoc?.hostName || 'Host'
                    }
                })
                return
            }
            res.status(404).json({ success: false, message: 'Meeting not found' })
            return
        }

        if (meeting.status === 'ended') {
            res.status(400).json({ success: false, message: 'Meeting has already ended' })
            return
        }

        if (meeting.isLocked) {
            res.status(403).json({ success: false, message: 'This meeting is locked by the host' })
            return
        }

        const orgIdRaw = (meeting.organizationId as any)?._id || meeting.organizationId
        const hostIdRaw = (meeting.host as any)?._id || meeting.host
        const effectivePlan = orgIdRaw
            ? await getEffectivePlanForOrg(String(orgIdRaw))
            : await getEffectivePlanForUser(String(hostIdRaw))

        if (meeting.participants && meeting.participants.length >= effectivePlan.limits.maxParticipantsPerCall) {
            res.status(403).json({
                success: false,
                message: `Room capacity reached (${effectivePlan.limits.maxParticipantsPerCall} max participants for ${effectivePlan.planTier.toUpperCase()} plan).`
            })
            return
        }

        // Generate temporary guest ID (reuse existing guest ID from same browser to prevent duplicate ghost tiles on refresh)
        const tempGuestId = validExistingGuestId || `guest_${Math.random().toString(36).substring(2, 11)}`

        // Check if waiting room is enabled. Instant meetings allow direct link joining by default
        const isPending = meeting.meetingId?.startsWith('room-') 
            ? meeting.isWaitingRoomEnabled === true 
            : meeting.isWaitingRoomEnabled !== false

        // Sign JWT
        const token = jwt.sign(
            {
                userId: tempGuestId,
                isGuest: true,
                guestName: guestName.trim(),
                email,
                company,
                meetingId,
                isPending
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.json({
            success: true,
            data: {
                token,
                userId: tempGuestId,
                isPending,
                meetingTitle: meeting.title,
                hostName: (meeting.host as any)?.fullName || 'Organizer',
                planTier: effectivePlan.planTier,
                planLimits: {
                    planTier: effectivePlan.planTier,
                    isPaid: effectivePlan.isPaid,
                    limits: effectivePlan.limits,
                    features: effectivePlan.features
                }
            }
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error' })
    }
})

export default router
