import { Router, Request, Response } from 'express'
import { Types } from 'mongoose'
import {
    generateMeetingSummary,
    askMeetingAssistant,
    translateCaptionText,
    generateLateJoinerCatchUp,
    generateMeetingAgenda,
    transcribeAudioChunk
} from '../services/gemini.service'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, ADMIN_EMAIL } from '../config'
import { User } from '../models/user.model'
import { Organization } from '../modules/organization/organization.model'
import { PlatformSettings } from '../modules/admin/platformSettings.model'
import { getEffectivePlanForOrg, getEffectivePlanForUser } from '../modules/plan/planEntitlements'
import { getMeetingByMeetingId } from '../modules/meeting/meeting.service'

const router = Router()

interface AuthenticatedAiRequest extends Request {
    userId?: string
}

const optionalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    if (!token) {
        res.status(401).json({ success: false, message: 'Authentication required for AI services' })
        return
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
        if (!payload?.userId) {
            res.status(401).json({ success: false, message: 'Invalid authentication token' })
            return
        }
        req.userId = payload.userId
        next()
    } catch (e) {
        res.status(401).json({ success: false, message: 'Invalid or expired authentication token' })
    }
}

async function getUserPlanTier(userId?: string): Promise<string> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
        return 'free'
    }

    try {
        const user = await User.findById(userId).select('isSuperAdmin email').lean()
        if (!user) return 'free'
        if (user.isSuperAdmin || (ADMIN_EMAIL && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim())) {
            return 'enterprise'
        }

        const org = await Organization.findOne({
            $or: [
                { ownerId: new Types.ObjectId(userId) },
                { 'members.userId': new Types.ObjectId(userId), 'members.status': 'active' }
            ]
        }).select('planTier').lean()

        return org?.planTier?.toLowerCase() || 'free'
    } catch {
        return 'free'
    }
}

const enforceAiPlatformPolicy = async (req: any, res: any, next: any) => {
    try {
        const settings = await PlatformSettings.findOne({ key: 'global_config' }).lean()
        if (settings) {
            if (settings.aiGlobalEnabled === false) {
                res.status(403).json({
                    success: false,
                    message: 'AI intelligence features have been temporarily disabled platform-wide by the administrator.'
                })
                return
            }

            if (settings.aiAllowFreeTier === false) {
                const planTier = await getUserPlanTier(req.userId)
                if (planTier === 'free') {
                    res.status(403).json({
                        success: false,
                        message: 'AI features require a Starter or Enterprise plan subscription. Please upgrade your organization tier.'
                    })
                    return
                }
            }
        }
        next()
    } catch (_) {
        next()
    }
}

const enforceAiFeatureEntitlement = async (req: any, res: any, next: any) => {
    try {
        let effectivePlan
        if (req.userId) {
            effectivePlan = await getEffectivePlanForUser(req.userId, req.body?.organizationId)
        } else if (req.body?.meetingId) {
            const meeting = await getMeetingByMeetingId(String(req.body.meetingId)).catch(() => null)
            if (meeting?.organizationId) {
                effectivePlan = await getEffectivePlanForOrg(String(meeting.organizationId))
            } else if (meeting?.host) {
                const hostId = (meeting.host as any)?._id || meeting.host
                effectivePlan = await getEffectivePlanForUser(String(hostId))
            } else {
                effectivePlan = await getEffectivePlanForOrg(null)
            }
        } else {
            effectivePlan = await getEffectivePlanForOrg(null)
        }

        if (!effectivePlan.features.aiSummary) {
            res.status(403).json({
                success: false,
                code: 'UPGRADE_REQUIRED',
                message: `AI features are not enabled on your ${effectivePlan.planTier.toUpperCase()} plan. Please upgrade to unlock AI Meeting Intelligence.`
            })
            return
        }
        next()
    } catch (err) {
        console.error('[AI Routes] Entitlement verification failed:', err)
        res.status(500).json({
            success: false,
            message: 'Unable to verify AI feature entitlement'
        })
    }
}

// Generate AI meeting summary & action items
router.post('/summary', optionalAuth, enforceAiPlatformPolicy, enforceAiFeatureEntitlement, async (req: Request, res: Response): Promise<void> => {
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
router.post('/assistant', optionalAuth, enforceAiPlatformPolicy, enforceAiFeatureEntitlement, async (req: Request, res: Response): Promise<void> => {
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
router.post('/translate', optionalAuth, enforceAiPlatformPolicy, enforceAiFeatureEntitlement, async (req: Request, res: Response): Promise<void> => {
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
router.post('/catch-up', optionalAuth, enforceAiPlatformPolicy, enforceAiFeatureEntitlement, async (req: Request, res: Response): Promise<void> => {
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
router.post('/agenda-generate', optionalAuth, enforceAiPlatformPolicy, enforceAiFeatureEntitlement, async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, durationMinutes, context, participants } = req.body

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

// Cross-Browser Speech-to-Text Live Transcription (for Safari, Firefox, or AI backend captions)
router.post('/transcribe', optionalAuth, enforceAiPlatformPolicy, enforceAiFeatureEntitlement, async (req: Request, res: Response): Promise<void> => {
    try {
        const { audio, mimeType } = req.body
        if (!audio || typeof audio !== 'string') {
            res.status(400).json({ success: false, message: 'Audio base64 data is required' })
            return
        }

        const text = await transcribeAudioChunk(audio, mimeType || 'audio/webm')
        res.status(200).json({ success: true, data: { text } })
    } catch (error: any) {
        console.error('[transcribe] Error:', error.message)
        res.status(500).json({ success: false, message: error.message || 'Transcription failed' })
    }
})

export default router
