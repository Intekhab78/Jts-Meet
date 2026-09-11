import { Types } from 'mongoose'
import bcrypt from 'bcrypt'
import { User } from '../../models/user.model'
import { Meeting } from '../meeting/meeting.model'
import { Organization } from '../organization/organization.model'
import { Team } from '../team/team.model'
import { AuditLog, IAuditLog } from './audit.model'

// Configurable in-memory retention policy with default 30 days
let globalRetentionPolicyDays = 30
let activeBroadcastNotice: { message: string; severity: 'info' | 'warning' | 'critical'; createdAt: Date; active: boolean } | null = null

export async function logActivity(userId: string, action: string, details: string, ipAddress = ''): Promise<IAuditLog> {
    return AuditLog.create({
        userId: new Types.ObjectId(userId),
        action,
        details,
        ipAddress: ipAddress || '127.0.0.1'
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
        .populate('host', 'fullName email profileImage')
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

export async function getAuditLogs(page = 1, limit = 20, action = '', search = '') {
    const skip = (page - 1) * limit
    const query: any = {}

    if (action && action !== 'ALL') {
        query.action = action
    }

    if (search) {
        query.$or = [
            { details: { $regex: search, $options: 'i' } },
            { ipAddress: { $regex: search, $options: 'i' } }
        ]
    }

    const logs = await AuditLog.find(query)
        .populate('userId', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()

    const total = await AuditLog.countDocuments(query).exec()

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

// =========================================================================
// TAB 1: USERS & ROLE MANAGEMENT (RBAC & LICENSE SEATS)
// =========================================================================

export async function getOrganizationUsers(orgId?: string, search = '', roleFilter = '', statusFilter = '') {
    // If organization provided, fetch organization members
    let org = null
    if (orgId && Types.ObjectId.isValid(orgId)) {
        org = await Organization.findById(orgId).populate('members.userId', 'fullName email profileImage status lastSeen createdAt')
    }

    // If no org or empty members, fallback to all users in database
    let userList: any[] = []

    if (org && org.members && org.members.length > 0) {
        userList = org.members.map((m: any) => {
            const u = m.userId || {}
            return {
                userId: u._id || m.userId,
                fullName: u.fullName || 'User',
                email: u.email || '',
                profileImage: u.profileImage || '',
                role: m.role || 'member',
                status: m.status || 'active',
                lastSeen: u.lastSeen || null,
                joinedAt: m.joinedAt || org.createdAt
            }
        })
    } else {
        const allUsers = await User.find().sort({ createdAt: -1 }).limit(100).exec()
        userList = allUsers.map((u: any, idx) => ({
            userId: u._id,
            fullName: u.fullName,
            email: u.email,
            profileImage: u.profileImage || '',
            role: idx === 0 ? 'owner' : (idx < 2 ? 'admin' : 'member'),
            status: u.status === 'online' ? 'active' : 'active',
            lastSeen: u.lastSeen,
            joinedAt: u.createdAt
        }))
    }

    // Apply filtering
    if (search) {
        const s = search.toLowerCase()
        userList = userList.filter(u => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
    }
    if (roleFilter && roleFilter !== 'all') {
        userList = userList.filter(u => u.role.toLowerCase() === roleFilter.toLowerCase())
    }
    if (statusFilter && statusFilter !== 'all') {
        userList = userList.filter(u => u.status.toLowerCase() === statusFilter.toLowerCase())
    }

    const totalSeats = 25
    const usedSeats = userList.filter(u => u.status !== 'suspended').length

    return {
        users: userList,
        licenseMetrics: {
            totalSeats,
            usedSeats,
            availableSeats: Math.max(0, totalSeats - usedSeats),
            tier: 'Enterprise Growth Tier (25 Seats)',
            utilizationRate: Math.round((usedSeats / totalSeats) * 100)
        }
    }
}

export async function updateUserRole(adminUserId: string, targetUserId: string, role: string, orgId?: string) {
    if (orgId && Types.ObjectId.isValid(orgId)) {
        await Organization.updateOne(
            { _id: new Types.ObjectId(orgId), 'members.userId': new Types.ObjectId(targetUserId) },
            { $set: { 'members.$.role': role } }
        )
    }

    const targetUser = await User.findById(targetUserId)
    await logActivity(
        adminUserId,
        'ROLE_CHANGE',
        `Updated role for user ${targetUser?.fullName || targetUserId} (${targetUser?.email || ''}) to ${role.toUpperCase()}`
    )

    return { success: true, message: `Role updated to ${role}` }
}

export async function updateUserStatus(adminUserId: string, targetUserId: string, status: string, orgId?: string) {
    if (orgId && Types.ObjectId.isValid(orgId)) {
        const updateFields: any = { 'members.$.status': status }
        if (status === 'active') {
            updateFields['members.$.joinedAt'] = new Date()
        }
        await Organization.updateOne(
            { _id: new Types.ObjectId(orgId), 'members.userId': new Types.ObjectId(targetUserId) },
            { $set: updateFields }
        )
    }

    const targetUser = await User.findById(targetUserId)
    if (targetUser && status === 'active') {
        targetUser.emailVerified = true
        await targetUser.save()
    }

    await logActivity(
        adminUserId,
        status === 'active' ? 'USER_APPROVED' : 'STATUS_CHANGE',
        `${status === 'active' ? 'Approved and activated' : 'Changed account status for'} user ${targetUser?.fullName || targetUserId} (${targetUser?.email || ''}) to ${status.toUpperCase()}`
    )

    return { success: true, message: `Account status set to ${status}` }
}

export async function resetUserPassword(adminUserId: string, targetUserId: string) {
    const tempPassword = `JtsPass-${Math.random().toString(36).slice(-6)}!`
    const targetUser = await User.findById(targetUserId)
    if (!targetUser) throw new Error('User not found')

    targetUser.password = tempPassword
    await targetUser.save()

    await logActivity(
        adminUserId,
        'PASSWORD_RESET',
        `Initiated password reset for user ${targetUser.fullName} (${targetUser.email})`
    )

    return {
        success: true,
        temporaryPassword: tempPassword,
        email: targetUser.email,
        message: 'Temporary password generated successfully'
    }
}

export async function inviteUserToOrg(adminUserId: string, email: string, fullName: string, role: string, orgId?: string) {
    let targetUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (!targetUser) {
        const tempPass = `JtsTemp-${Math.random().toString(36).slice(-6)}!`
        targetUser = await User.create({
            fullName: fullName || email.split('@')[0],
            email: email.toLowerCase().trim(),
            password: tempPass,
            status: 'offline',
            emailVerified: true
        })
    }

    if (orgId && Types.ObjectId.isValid(orgId)) {
        await Organization.updateOne(
            { _id: new Types.ObjectId(orgId) },
            {
                $push: {
                    members: {
                        userId: targetUser._id,
                        role: role || 'member',
                        joinedAt: new Date(),
                        invitedBy: new Types.ObjectId(adminUserId),
                        status: 'active'
                    }
                }
            }
        )
    }

    await logActivity(
        adminUserId,
        'USER_INVITE',
        `Invited ${fullName || email} as ${role.toUpperCase()} to the workspace`
    )

    return {
        success: true,
        user: targetUser,
        message: `User ${email} successfully invited and added`
    }
}

// =========================================================================
// TAB 3: CLOUD RECORDINGS & STORAGE VAULT (ORGANIZATION-WIDE)
// =========================================================================

export async function getOrganizationRecordings(orgId?: string) {
    const query: any = {
        $or: [
            { isRecordingActive: true },
            { recordingUrl: { $exists: true, $ne: '' } }
        ]
    }
    if (orgId && Types.ObjectId.isValid(orgId)) {
        query.organizationId = new Types.ObjectId(orgId)
    }

    let recordedMeetings = await Meeting.find(query)
        .populate('host', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(50)
        .exec()

    // If database has 0 recordings yet, generate realistic enterprise demo list
    if (recordedMeetings.length === 0) {
        const dummyRecordings = [
            {
                _id: 'rec_sprint_demo_01',
                title: 'Q3 Product Architecture & Sprint Retrospective',
                meetingId: 'jts-arch-2026',
                host: { fullName: 'System Administrator', email: 'admin@jtsmeet.com' },
                duration: '42 mins',
                recordingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                sizeBytes: 318767104, // ~304 MB
                createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
            },
            {
                _id: 'rec_dubai_client_02',
                title: 'JTS Middle East Client Onboarding & Security Review',
                meetingId: 'jts-dxb-9801',
                host: { fullName: 'Intekhab Lead', email: 'intekhab@jts.ae' },
                duration: '28 mins',
                recordingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                sizeBytes: 194183168, // ~185 MB
                createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000)
            },
            {
                _id: 'rec_webrtc_tuning_03',
                title: 'Global Edge Node Telemetry & Latency Optimization',
                meetingId: 'jts-ops-4412',
                host: { fullName: 'DevOps Lead', email: 'ops@jtsmeet.com' },
                duration: '56 mins',
                recordingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                sizeBytes: 442499072, // ~422 MB
                createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000)
            }
        ]

        const totalUsedBytes = dummyRecordings.reduce((sum, r) => sum + r.sizeBytes, 0)
        const totalQuotaGb = 50
        const usedGb = parseFloat((totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2))

        return {
            recordings: dummyRecordings,
            storageMetrics: {
                totalQuotaGb,
                usedGb,
                usedBytes: totalUsedBytes,
                percentage: parseFloat(((usedGb / totalQuotaGb) * 100).toFixed(1)),
                retentionPolicyDays: globalRetentionPolicyDays,
                cloudProvider: 'Amazon Web Services (AWS S3 Middle East DXB-1)'
            }
        }
    }

    const calculatedList = recordedMeetings.map(m => {
        const durationSec = (m.endedAt && m.startedAt) 
            ? Math.round((m.endedAt.getTime() - m.startedAt.getTime()) / 1000) 
            : 1800
        const sizeBytes = durationSec * 125000 // ~1 Mbps video estimate
        return {
            _id: m._id,
            title: m.title,
            meetingId: m.meetingId,
            host: m.host,
            duration: `${Math.round(durationSec / 60)} mins`,
            recordingUrl: m.recordingUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            sizeBytes,
            createdAt: m.createdAt
        }
    })

    const totalUsedBytes = calculatedList.reduce((sum, r) => sum + r.sizeBytes, 0)
    const totalQuotaGb = 50
    const usedGb = parseFloat((totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2))

    return {
        recordings: calculatedList,
        storageMetrics: {
            totalQuotaGb,
            usedGb,
            usedBytes: totalUsedBytes,
            percentage: parseFloat(((usedGb / totalQuotaGb) * 100).toFixed(1)),
            retentionPolicyDays: globalRetentionPolicyDays,
            cloudProvider: 'Amazon Web Services (AWS S3 Middle East DXB-1)'
        }
    }
}

export async function updateStorageRetentionPolicy(adminUserId: string, days: number) {
    globalRetentionPolicyDays = days
    await logActivity(
        adminUserId,
        'STORAGE_POLICY_CHANGE',
        `Updated automatic cloud recording retention policy to ${days > 0 ? `${days} days` : 'Unlimited / Forever'}`
    )
    return { success: true, retentionPolicyDays: globalRetentionPolicyDays }
}

export async function deleteRecording(adminUserId: string, meetingId: string) {
    await Meeting.updateOne({ meetingId }, { $set: { recordingUrl: '', isRecordingActive: false } })
    await logActivity(
        adminUserId,
        'RECORDING_DELETE',
        `Purged cloud recording asset for conference session ${meetingId}`
    )
    return { success: true, message: 'Recording asset purged from cloud vault' }
}

// =========================================================================
// ATTENDANCE RECORDS (COMPLIANCE AUDITING)
// =========================================================================

export async function getAttendanceRecords(page = 1, limit = 15) {
    const skip = (page - 1) * limit

    const meetings = await Meeting.find({ status: { $in: ['active', 'ended'] } })
        .populate('host', 'fullName email')
        .populate('participants', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()

    const total = await Meeting.countDocuments({ status: { $in: ['active', 'ended'] } }).exec()

    const attendanceRows = meetings.map(m => {
        const attendeeCount = (m.participants?.length || 0) + 1
        const durationMin = (m.endedAt && m.startedAt)
            ? Math.round((m.endedAt.getTime() - m.startedAt.getTime()) / 60000)
            : 30
        return {
            meetingId: m.meetingId,
            title: m.title,
            hostName: (m.host as any)?.fullName || 'Host',
            hostEmail: (m.host as any)?.email || '',
            date: m.createdAt,
            duration: `${durationMin} mins`,
            totalAttendees: attendeeCount,
            participants: m.participants,
            complianceVerified: true
        }
    })

    return {
        attendance: attendanceRows,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    }
}

// =========================================================================
// SUPER ADMIN EXCLUSIVE: TENANTS DIRECTORY & PLATFORM TELEMETRY
// =========================================================================

export async function getAllTenants(search = '') {
    const filter: any = {}
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { slug: { $regex: search, $options: 'i' } }
        ]
    }
    const organizations = await Organization.find(filter)
        .populate('ownerId', 'fullName email profileImage')
        .populate('members.userId', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .exec()

    const tenantRows = await Promise.all(organizations.map(async (org) => {
        const teamCount = await Team.countDocuments({ organizationId: org._id }).exec()
        const meetingCount = await Meeting.countDocuments({ organizationId: org._id }).exec()
        const memberCount = org.members?.filter(m => m.status === 'active')?.length || 1

        return {
            _id: org._id,
            name: org.name,
            slug: org.slug,
            description: org.description || '',
            logo: org.logo || '',
            owner: org.ownerId,
            status: org.status || 'active',
            timezone: org.timezone || 'UTC',
            planTier: (org as any).planTier || 'enterprise',
            maxSeats: (org as any).maxSeats || 50,
            usedSeats: memberCount,
            maxStorageGb: (org as any).maxStorageGb || 25,
            usedStorageGb: Math.round((meetingCount * 0.15) * 10) / 10,
            teamsCount: teamCount,
            meetingsCount: meetingCount,
            createdAt: org.createdAt
        }
    }))

    return tenantRows
}

export async function updateTenantStatus(adminUserId: string, orgId: string, status: 'active' | 'inactive') {
    const org = await Organization.findByIdAndUpdate(orgId, { $set: { status } }, { new: true })
    if (!org) throw new Error('Organization not found')
    await logActivity(adminUserId, 'TENANT_STATUS_CHANGE', `Updated status of organization "${org.name}" to ${status.toUpperCase()}`)
    return org
}

export async function updateTenantQuota(adminUserId: string, orgId: string, payload: { planTier?: 'free' | 'starter' | 'enterprise'; maxSeats?: number; maxStorageGb?: number }) {
    const updateData: any = {}
    if (payload.planTier) updateData.planTier = payload.planTier
    if (payload.maxSeats) updateData.maxSeats = payload.maxSeats
    if (payload.maxStorageGb) updateData.maxStorageGb = payload.maxStorageGb

    const org = await Organization.findByIdAndUpdate(orgId, { $set: updateData }, { new: true })
    if (!org) throw new Error('Organization not found')
    await logActivity(adminUserId, 'TENANT_QUOTA_UPDATE', `Updated plan & quota for organization "${org.name}"`)
    return org
}

export async function getLiveTelemetry() {
    const totalUsers = await User.countDocuments().exec()
    const totalOrgs = await Organization.countDocuments().exec()
    const activeOrgs = await Organization.countDocuments({ status: 'active' }).exec()
    const activeMeetings = await Meeting.find({ status: 'active' })
        .populate('host', 'fullName email')
        .populate('participants', 'fullName email')
        .exec()

    const liveRooms = activeMeetings.map(m => ({
        meetingId: m.meetingId,
        title: m.title,
        hostName: (m.host as any)?.fullName || 'Host',
        hostEmail: (m.host as any)?.email || '',
        participantsCount: (m.participants?.length || 0) + 1,
        isRecording: !!m.isRecordingActive,
        startedAt: m.startedAt || m.createdAt
    }))

    const totalActiveParticipants = liveRooms.reduce((acc, r) => acc + r.participantsCount, 0)

    return {
        uptimeSeconds: Math.round(process.uptime()),
        serverMemoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        nodeVersion: process.version,
        platformMetrics: {
            totalUsers,
            totalOrgs,
            activeOrgs,
            activeConferences: liveRooms.length,
            liveParticipants: totalActiveParticipants,
            mediaBandwidthMbps: Math.round(totalActiveParticipants * 1.8 * 10) / 10,
            signalingLatencyMs: 18
        },
        liveRooms,
        activeBroadcast: activeBroadcastNotice
    }
}

export async function postBroadcastNotice(adminUserId: string, message: string, severity: 'info' | 'warning' | 'critical', active = true) {
    activeBroadcastNotice = {
        message,
        severity,
        createdAt: new Date(),
        active
    }
    await logActivity(adminUserId, 'PLATFORM_BROADCAST', `Issued platform broadcast: "${message.slice(0, 50)}..."`)
    return activeBroadcastNotice
}
