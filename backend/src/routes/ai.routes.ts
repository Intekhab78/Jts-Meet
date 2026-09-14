import { Router, Request, Response } from 'express'
import {
    generateMeetingSummary,
    askMeetingAssistant,
    translateCaptionText,
    generateLateJoinerCatchUp,
    generateMeetingAgenda
} from '../services/gemini.service'
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

// Real-time Captions Translation Endpoint (Zoom/Teams feature)
router.post('/translate', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { text, targetLang } = req.body
        if (!text || typeof text !== 'string') {
            res.status(400).json({ success: false, message: 'Text is required' })
            return
        }

        const translated = await translateCaptionText(text, targetLang || 'hi')
        res.status(200).json({
            success: true,
            data: { original: text, translated, targetLang: targetLang || 'hi' }
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Translation failed' })
    }
})

// Late-Joiner AI Summary: "Catch Me Up" (MS Teams Copilot feature)
router.post('/catch-up', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, transcripts, chatMessages } = req.body
        const result = await generateLateJoinerCatchUp({
            title: title || 'Team Conference',
            transcripts: Array.isArray(transcripts) ? transcripts : [],
            chatMessages: Array.isArray(chatMessages) ? chatMessages : []
        })

        res.status(200).json({
            success: true,
            data: result
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Failed to generate catch-up' })
    }
})

// AI Meeting Agenda & Prep Generator (Zoom / Teams Copilot style)
router.post('/agenda-generate', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, durationMinutes, context, participants, userPlan } = req.body

        // Free-tier gate: return upgrade prompt instead of 403 so frontend can handle gracefully
        const plan = (userPlan || 'free').toLowerCase()
        if (plan === 'free') {
            res.status(403).json({
                success: false,
                code: 'UPGRADE_REQUIRED',
                message: 'AI Agenda Generator is available on Pro and Enterprise plans. Upgrade to unlock this feature.'
            })
            return
        }

        if (!title || typeof title !== 'string') {
            res.status(400).json({ success: false, message: 'Meeting title is required' })
            return
        }

        const result = await generateMeetingAgenda({
            title,
            durationMinutes: Number(durationMinutes) || 60,
            context: context || '',
            participants: Array.isArray(participants) ? participants : []
        })

        res.status(200).json({ success: true, data: result })
    } catch (error: any) {
        console.error('[agenda-generate] Error:', error)
        res.status(500).json({ success: false, message: error.message || 'Failed to generate agenda' })
    }
})

export default router
