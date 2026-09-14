import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import { AuthRequest } from '../../middleware/authMiddleware'
import { Clip } from './clip.model'
import { sendError, sendSuccess } from '../../utils/responseHelper'
import { Organization } from '../organization/organization.model'

export class ClipController {
    static uploadClip = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
        try {
            const userId = req.userId
            if (!userId) {
                return sendError(res, 401, 'Unauthorized')
            }

            const file = req.file
            if (!file) {
                return sendError(res, 400, 'No video file provided')
            }

            const { title, duration, channelId, recipientId } = req.body
            const durationSec = Number(duration) || 0

            // Check plan limits (Free: max 120s & 3 clips/month; Pro/Enterprise: 600s & unlimited)
            let userPlan = 'free'
            const userOrg = await Organization.findOne({
                $or: [{ ownerId: userId }, { 'members.userId': userId }]
            }).lean()
            if (userOrg && userOrg.planTier) {
                userPlan = userOrg.planTier.toLowerCase()
            }

            const isPaid = userPlan === 'pro' || userPlan === 'enterprise'

            if (!isPaid) {
                if (durationSec > 125) { // 2 mins with small buffer
                    // cleanup uploaded file
                    try { fs.unlinkSync(file.path) } catch (_) {}
                    return sendError(res, 403, 'Free tier clips are limited to 2 minutes. Upgrade to Pro or Enterprise for up to 10 minutes HD recording.')
                }

                // Check monthly count
                const startOfMonth = new Date()
                startOfMonth.setDate(1)
                startOfMonth.setHours(0, 0, 0, 0)
                const monthlyCount = await Clip.countDocuments({
                    senderId: userId,
                    createdAt: { $gte: startOfMonth }
                })
                if (monthlyCount >= 3) {
                    try { fs.unlinkSync(file.path) } catch (_) {}
                    return sendError(res, 403, 'Free tier limit reached (3 clips/month). Upgrade to Pro or Enterprise for unlimited Zoom Clips.')
                }
            } else {
                if (durationSec > 610) {
                    try { fs.unlinkSync(file.path) } catch (_) {}
                    return sendError(res, 400, 'Video clips exceed maximum length of 10 minutes.')
                }
            }

            const videoUrl = `/uploads/clips/${file.filename}`
            const clip = await Clip.create({
                title: title?.trim() || 'Quick Video Clip',
                senderId: userId,
                videoUrl,
                duration: durationSec,
                fileSize: file.size,
                mimeType: file.mimetype || 'video/webm',
                channelId: channelId || null,
                recipientId: recipientId || null
            })

            const populatedClip = await Clip.findById(clip._id)
                .populate('senderId', 'fullName email profileImage')
                .lean()

            return sendSuccess(res, populatedClip, 'Video clip uploaded successfully')
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to upload video clip')
        }
    }

    static getClip = async (req: AuthRequest, res: Response) => {
        try {
            const { clipId } = req.params
            const clip = await Clip.findByIdAndUpdate(
                clipId,
                { $inc: { views: 1 } },
                { new: true }
            )
                .populate('senderId', 'fullName email profileImage')
                .lean()

            if (!clip) {
                return sendError(res, 404, 'Video clip not found')
            }

            return sendSuccess(res, clip)
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to fetch video clip')
        }
    }

    static getMyClips = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.userId
            const clips = await Clip.find({ senderId: userId })
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('senderId', 'fullName email profileImage')
                .lean()

            return sendSuccess(res, clips)
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to fetch clips')
        }
    }

    static deleteClip = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.userId
            const { clipId } = req.params
            const clip = await Clip.findById(clipId)

            if (!clip) {
                return sendError(res, 404, 'Clip not found')
            }

            if (clip.senderId.toString() !== userId) {
                return sendError(res, 403, 'Unauthorized to delete this clip')
            }

            // Remove file from disk
            if (clip.videoUrl) {
                const filePath = path.join(process.cwd(), clip.videoUrl.replace(/^\//, ''))
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath) } catch (_) {}
                }
            }

            await Clip.findByIdAndDelete(clipId)
            return sendSuccess(res, { deleted: true }, 'Clip deleted successfully')
        } catch (error: any) {
            return sendError(res, 500, error.message || 'Failed to delete clip')
        }
    }
}
