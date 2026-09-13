import { Router, Request, Response } from 'express'
import { generateMeetingSummary, askMeetingAssistant } from '../services/gemini.service'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

const router = Router()

const optionalAuth = (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
            req.userId = payload.userId
        } catch (e) {}
    }
    next()
}

// Generate AI meeting summary & action items
router.post('/summary', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, participants, duration, notes, transcripts, chatMessages } = req.body
        const result = await generateMeetingSummary({
            title: title || 'Team Meeting',
            participants: Array.isArray(participants) ? participants : [],
            duration: duration || '25 mins',
            notes: notes || '',
            transcripts: Array.isArray(transcripts) ? transcripts : [],
            chatMessages: Array.isArray(chatMessages) ? chatMessages : []
        })

        res.status(200).json({
            success: true,
            data: result
        })
    } catch (error: any) {
        console.error('AI summary route error:', error)
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate meeting summary'
        })
    }
})

// Ask JTS AI Companion
router.post('/assistant', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt, meetingContext } = req.body
        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ success: false, message: 'Prompt is required' })
            return
        }

        const reply = await askMeetingAssistant({ prompt, meetingContext })
        res.status(200).json({
            success: true,
            data: { reply }
        })
    } catch (error: any) {
        console.error('AI assistant route error:', error)
        res.status(500).json({
            success: false,
            message: error.message || 'AI assistant failed to answer'
        })
    }
})

export default router
