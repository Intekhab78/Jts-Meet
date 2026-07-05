import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'

const router = Router()

// GET /api/guest/meeting/:meetingId
router.get('/meeting/:meetingId', async (req: Request, res: Response) => {
    try {
        const meetingId = String(req.params.meetingId)
        const meeting = await getMeetingByMeetingId(meetingId)
        
        if (!meeting) {
            res.status(404).json({ success: false, message: 'Meeting not found' })
            return
        }

        if (meeting.status === 'ended') {
            res.status(400).json({ success: false, message: 'Meeting has already ended' })
            return
        }

        res.json({
            success: true,
            data: {
                title: meeting.title,
                hostName: (meeting.host as any)?.fullName || 'Organizer',
                isWaitingRoomEnabled: meeting.isWaitingRoomEnabled
            }
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error' })
    }
})

// POST /api/guest/request
router.post('/request', async (req: Request, res: Response) => {
    try {
        const meetingId = String(req.body.meetingId || '').trim()
        const guestName = String(req.body.guestName || '').trim()
        const email = req.body.email ? String(req.body.email).trim() : ''
        const company = req.body.company ? String(req.body.company).trim() : ''

        if (!meetingId || !guestName) {
            res.status(400).json({ success: false, message: 'Meeting ID and Guest Name are required' })
            return
        }

        const meeting = await getMeetingByMeetingId(meetingId)
        if (!meeting) {
            res.status(404).json({ success: false, message: 'Meeting not found' })
            return
        }

        if (meeting.status === 'ended') {
            res.status(400).json({ success: false, message: 'Meeting has already ended' })
            return
        }

        // Generate temporary guest ID
        const tempGuestId = `guest_${Math.random().toString(36).substring(2, 11)}`

        // Check if waiting room is enabled. If disabled, guest is auto-approved (isPending: false)
        const isPending = meeting.isWaitingRoomEnabled

        // Sign JWT
        const token = jwt.sign(
            {
                userId: tempGuestId,
                isGuest: true,
                guestName: guestName.trim(),
                meetingId,
                isPending
            },
            JWT_SECRET,
            { expiresIn: '6h' }
        )

        res.json({
            success: true,
            data: {
                token,
                userId: tempGuestId,
                isPending,
                meetingTitle: meeting.title,
                hostName: (meeting.host as any)?.fullName || 'Organizer'
            }
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error' })
    }
})

export default router
