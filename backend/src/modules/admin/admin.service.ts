import { Types } from 'mongoose'
import { User } from '../../models/user.model'
import { Meeting } from '../meeting/meeting.model'
import { AuditLog, IAuditLog } from './audit.model'

export async function logActivity(userId: string, action: string, details: string, ipAddress = ''): Promise<IAuditLog> {
    return AuditLog.create({
        userId: new Types.ObjectId(userId),
        action,
        details,
        ipAddress
    })
}

export async function getDashboardStats() {
    const totalUsers = await User.countDocuments().exec()
    const totalMeetings = await Meeting.countDocuments().exec()
    const activeMeetings = await Meeting.countDocuments({ status: 'active' }).exec()
    const endedMeetings = await Meeting.countDocuments({ status: 'ended' }).exec()

    // Aggregate daily meetings count for the last 7 days (Trends)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const trends = await Meeting.aggregate([
        {
            $match: {
                createdAt: { $gte: sevenDaysAgo }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]).exec()

    return {
        users: { total: totalUsers },
        meetings: {
            total: totalMeetings,
            active: activeMeetings,
            ended: endedMeetings
        },
        trends
    }
}

export async function getRecentMeetings(payload: {
    page?: number
    limit?: number
    search?: string
    status?: string
}) {
    const page = payload.page || 1
    const limit = payload.limit || 20
    const skip = (page - 1) * limit

    const query: any = {}
    if (payload.status) {
        query.status = payload.status
    }

    if (payload.search) {
        query.$or = [
            { title: { $regex: payload.search, $options: 'i' } },
            { meetingId: { $regex: payload.search, $options: 'i' } }
        ]
    }

    const meetings = await Meeting.find(query)
        .populate('host', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()

    const total = await Meeting.countDocuments(query).exec()

    return {
        meetings,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    }
}

export async function getAuditLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const logs = await AuditLog.find()
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()

    const total = await AuditLog.countDocuments().exec()

    return {
        logs,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    }
}
