import mongoose, { Types } from 'mongoose'
import { Channel, IChannel, IChannelMember } from './channel.model'
import { Team } from '../team/team.model'
import { getOrganizationById } from '../organization/organization.service'
import { ChannelTypes, ChannelRoles, ChannelStatuses, GeneralChannelName } from './channel.constants'
import { User } from '../../models/user.model'
import { NotificationService } from '../notification/notification.service'

async function isChannelOwnerOrModerator(channel: IChannel, userId: string): Promise<boolean> {
    try {
        const user = await User.findById(userId).select('email').exec()
        if (user?.email?.toLowerCase().trim() === 'admin@jtsmeet.com') return true
    } catch (_) {}

    const targetIdStr = userId.toString()
    if (channel.ownerId) {
        const ownerIdStr = (channel.ownerId as any)?._id ? (channel.ownerId as any)._id.toString() : channel.ownerId.toString()
        if (ownerIdStr === targetIdStr) return true
    }
    const isDirectMod = channel.members.some((member) => {
        const mUserId = (member.userId as any)?._id ? (member.userId as any)._id.toString() : (member.userId ? member.userId.toString() : '')
        return mUserId === targetIdStr && ['owner', 'moderator', 'admin'].includes(member.role)
    })
    if (isDirectMod) return true

    // Check if user is Team owner/admin or Org owner/admin
    try {
        const team = await Team.findById(channel.teamId)
        if (team) {
            const isTeamAdmin = team.members.some((m) => {
                const tuId = (m.userId as any)?._id ? (m.userId as any)._id.toString() : m.userId.toString()
                return tuId === targetIdStr && ['owner', 'admin'].includes(m.role)
            })
            if (isTeamAdmin) return true

            const org = await getOrganizationById(team.organizationId.toString())
            if (org) {
                const orgOwnerStr = (org.ownerId as any)?._id ? (org.ownerId as any)._id.toString() : org.ownerId.toString()
                if (orgOwnerStr === targetIdStr) return true
                const isOrgAdmin = org.members.some((m: any) => {
                    const omId = (m.userId as any)?._id ? (m.userId as any)._id.toString() : m.userId.toString()
                    return omId === targetIdStr && ['owner', 'admin'].includes(m.role) && m.status === 'active'
                })
                if (isOrgAdmin) return true
            }
        }
    } catch (_) {}

    return false
}

function isChannelOwner(channel: IChannel, userId: string): boolean {
    const targetIdStr = userId.toString()
    const ownerIdStr = (channel.ownerId as any)?._id ? (channel.ownerId as any)._id.toString() : channel.ownerId.toString()
    return ownerIdStr === targetIdStr
}

async function ensureTeamAndOrganizationExist(organizationId: string, teamId: string, session?: mongoose.ClientSession) {
    const organization = await getOrganizationById(organizationId, session)
    if (!organization) {
        throw { status: 404, message: 'Organization not found' }
    }

    const team = await Team.findOne({ _id: teamId, organizationId: organization._id, deletedAt: null }).session(session || null).exec()
    if (!team) {
        throw { status: 404, message: 'Team not found' }
    }

    return { organization, team }
}

export async function createChannel(userId: string, payload: {
    organizationId: string
    teamId: string
    name: string
    description?: string
    type: 'public' | 'private'
}): Promise<IChannel> {
    const { team } = await ensureTeamAndOrganizationExist(payload.organizationId, payload.teamId)

    const normalizedName = payload.name.trim()
    const existing = await Channel.findOne({ teamId: team._id, name: normalizedName, deletedAt: null }).exec()
    if (existing) {
        throw { status: 409, message: 'Channel name already exists in team' }
    }

    const ownerObjectId = new Types.ObjectId(userId)
    const channel = new Channel({
        organizationId: team.organizationId,
        teamId: team._id,
        name: normalizedName,
        description: payload.description || '',
        type: payload.type,
        createdBy: ownerObjectId,
        ownerId: ownerObjectId,
        members: [
            {
                userId: ownerObjectId,
                role: ChannelRoles.OWNER,
                joinedAt: new Date(),
                invitedBy: ownerObjectId
            }
        ],
        status: ChannelStatuses.ACTIVE,
        archived: false
    })

    return channel.save()
}

export async function createGeneralChannel(userId: string, organizationId: string, teamId: string, session?: mongoose.ClientSession): Promise<IChannel> {
    const { team } = await ensureTeamAndOrganizationExist(organizationId, teamId, session)

    const existing = await Channel.findOne({ teamId: team._id, name: GeneralChannelName, deletedAt: null }).session(session || null).exec()
    if (existing) {
        return existing
    }

    const ownerObjectId = new Types.ObjectId(userId)
    const channel = new Channel({
        organizationId: team.organizationId,
        teamId: team._id,
        name: GeneralChannelName,
        description: 'Default team channel',
        type: ChannelTypes.PUBLIC,
        createdBy: ownerObjectId,
        ownerId: ownerObjectId,
        members: [
            {
                userId: ownerObjectId,
                role: ChannelRoles.OWNER,
                joinedAt: new Date(),
                invitedBy: ownerObjectId
            }
        ],
        status: ChannelStatuses.ACTIVE,
        archived: false
    })

    return channel.save({ session })
}

export async function getChannel(channelId: string): Promise<IChannel | null> {
    if (!Types.ObjectId.isValid(channelId)) {
        return null
    }
    return Channel.findOne({ _id: channelId, deletedAt: null }).populate('members.userId', 'fullName email profileImage').exec()
}

export async function ensureMember(channelId: string, userId: string): Promise<IChannel> {
    const channel = await getChannel(channelId)
    if (!channel) {
        throw { status: 404, message: 'Channel not found' }
    }

    // Check Super Admin, Channel Owner, Moderator, Team Owner/Admin, Org Owner/Admin
    const isPrivileged = await isChannelOwnerOrModerator(channel, userId)
    if (isPrivileged) {
        return channel
    }

    const isMember = channel.members.some((member) => {
        const mId = (member.userId as any)?._id ? (member.userId as any)._id.toString() : (member.userId ? member.userId.toString() : '')
        return mId === userId.toString()
    })

    if (isMember) {
        return channel
    }

    // If channel is public, allow team members or public team users
    if (channel.type === 'public') {
        try {
            const team = await Team.findById(channel.teamId)
            if (team) {
                const isTeamMember = team.members.some((m) => {
                    const tuId = (m.userId as any)?._id ? (m.userId as any)._id.toString() : m.userId.toString()
                    return tuId === userId.toString()
                })
                if (isTeamMember || team.visibility === 'public') {
                    return channel
                }
            }
        } catch (_) { }
    }

    throw { status: 403, message: 'Forbidden' }
}

export async function listTeamChannels(teamId: string): Promise<IChannel[]> {
    if (!Types.ObjectId.isValid(teamId)) {
        return []
    }
    return Channel.find({ teamId: new Types.ObjectId(teamId), deletedAt: null })
        .populate('members.userId', 'fullName email profileImage')
        .sort({ createdAt: 1 })
        .exec()
}

export async function updateChannel(channelId: string, userId: string, payload: {
    name?: string
    description?: string
    type?: 'public' | 'private'
    status?: 'active' | 'inactive'
}): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!isChannelOwnerOrModerator(channel, userId)) {
        throw new Error('Forbidden')
    }

    if (channel.name === GeneralChannelName && payload.name && payload.name !== channel.name) {
        throw { status: 403, message: 'General channel name cannot be changed' }
    }

    if (payload.name && payload.name.trim() !== channel.name) {
        const duplicate = await Channel.findOne({ teamId: channel.teamId, name: payload.name.trim(), deletedAt: null }).exec()
        if (duplicate) {
            throw { status: 409, message: 'Channel name already exists in team' }
        }
        channel.name = payload.name.trim()
    }

    if (payload.description !== undefined) channel.description = payload.description
    if (payload.type !== undefined) channel.type = payload.type
    if (payload.status !== undefined) channel.status = payload.status

    return channel.save()
}

export async function archiveChannel(channelId: string, userId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!isChannelOwnerOrModerator(channel, userId)) {
        throw new Error('Forbidden')
    }

    channel.archived = true
    return channel.save()
}

export async function restoreChannel(channelId: string, userId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!isChannelOwner(channel, userId)) {
        throw new Error('Forbidden')
    }

    channel.archived = false
    return channel.save()
}

export async function deleteChannel(channelId: string, userId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (channel.name === GeneralChannelName) {
        throw { status: 403, message: 'General channel cannot be deleted' }
    }

    if (!isChannelOwnerOrModerator(channel, userId)) {
        throw new Error('Forbidden')
    }

    channel.deletedAt = new Date()
    return channel.save()
}

export async function joinChannel(channelId: string, userId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (channel.type !== ChannelTypes.PUBLIC) {
        throw new Error('Channel is private')
    }

    const already = channel.members.some((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (!already) {
        channel.members.push({
            userId: new Types.ObjectId(userId),
            role: ChannelRoles.MEMBER,
            joinedAt: new Date(),
            invitedBy: channel.ownerId
        })
    }

    return channel.save()
}

export async function leaveChannel(channelId: string, userId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    const index = channel.members.findIndex((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (index === -1) {
        return null
    }

    const member = channel.members[index]
    if (member.role === ChannelRoles.OWNER) {
        throw new Error('Channel owner cannot leave channel')
    }

    channel.members.splice(index, 1)
    return channel.save()
}

export async function inviteChannelMember(channelId: string, inviterId: string, payload: { userId: string; role: 'moderator' | 'member' | 'guest' }): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!(await isChannelOwnerOrModerator(channel, inviterId))) {
        throw new Error('Forbidden')
    }

    let targetUserId = payload.userId.trim()
    if (!Types.ObjectId.isValid(targetUserId) || targetUserId.includes('@')) {
        const user = await User.findOne({ email: targetUserId.toLowerCase() })
        if (!user) {
            throw new Error('User not found with this email address')
        }
        targetUserId = user._id.toString()
    }

    const targetObjectUserId = new Types.ObjectId(targetUserId)

    const existing = channel.members.find((member) => {
        const mId = (member.userId as any)?._id ? (member.userId as any)._id.toString() : member.userId.toString()
        return mId === targetUserId
    })

    if (existing) {
        existing.role = payload.role
        existing.invitedBy = new Types.ObjectId(inviterId)
        existing.joinedAt = new Date()
    } else {
        channel.members.push({
            userId: targetObjectUserId,
            role: payload.role,
            joinedAt: new Date(),
            invitedBy: new Types.ObjectId(inviterId)
        })
    }

    const savedChannel = await channel.save()
    await savedChannel.populate('members.userId', 'fullName email profileImage')

    // Trigger invitation notifications asynchronously
    if (savedChannel) {
        (async () => {
            try {
                const inviter = await User.findById(inviterId)
                const inviterName = inviter ? inviter.fullName : 'A channel moderator'
                
                await NotificationService.send({
                    recipientId: targetUserId,
                    title: 'Channel Invitation',
                    body: `${inviterName} has added you to the channel "#${channel.name}"`,
                    type: 'channel_invite',
                    metadata: { channelId, channelName: channel.name, inviterName }
                })
            } catch (err) {
                console.error('Failed to send channel invitation notification:', err)
            }
        })()
    }

    return savedChannel
}

export async function removeChannelMember(channelId: string, requesterId: string, targetUserId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!(await isChannelOwnerOrModerator(channel, requesterId))) {
        throw new Error('Forbidden')
    }

    let resolvedTargetId = targetUserId.trim()
    if (!Types.ObjectId.isValid(resolvedTargetId) || resolvedTargetId.includes('@')) {
        const user = await User.findOne({ email: resolvedTargetId.toLowerCase() })
        if (user) {
            resolvedTargetId = user._id.toString()
        }
    }

    const index = channel.members.findIndex((member) => {
        const mId = (member.userId as any)?._id ? (member.userId as any)._id.toString() : member.userId.toString()
        return mId === resolvedTargetId
    })

    if (index === -1) {
        return null
    }

    if (channel.members[index].role === ChannelRoles.OWNER) {
        throw new Error('Cannot remove channel owner')
    }

    channel.members.splice(index, 1)
    const saved = await channel.save()
    await saved.populate('members.userId', 'fullName email profileImage')
    return saved
}

export async function updateChannelMemberRole(channelId: string, requesterId: string, payload: { userId: string; role: 'moderator' | 'member' | 'guest' }): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!(await isChannelOwnerOrModerator(channel, requesterId))) {
        throw new Error('Forbidden')
    }

    let resolvedTargetId = payload.userId.trim()
    if (!Types.ObjectId.isValid(resolvedTargetId) || resolvedTargetId.includes('@')) {
        const user = await User.findOne({ email: resolvedTargetId.toLowerCase() })
        if (user) {
            resolvedTargetId = user._id.toString()
        }
    }

    const member = channel.members.find((member) => {
        const mId = (member.userId as any)?._id ? (member.userId as any)._id.toString() : member.userId.toString()
        return mId === resolvedTargetId
    })

    if (!member) {
        return null
    }

    if (member.role === ChannelRoles.OWNER) {
        throw new Error('Cannot change owner role')
    }

    member.role = payload.role
    const saved = await channel.save()
    await saved.populate('members.userId', 'fullName email profileImage')
    return saved
}

export async function getChannelMembers(channelId: string): Promise<IChannelMember[] | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }
    return channel.members
}

export async function getChannelMembersPaginated(
    channelId: string,
    limit = 20,
    cursor?: string,
    search?: string
): Promise<{ members: any[]; nextCursor: string | null } | null> {
    if (!Types.ObjectId.isValid(channelId)) {
        return null
    }

    const pipeline: any[] = [
        { $match: { _id: new Types.ObjectId(channelId), deletedAt: null } },
        { $unwind: '$members' },
        {
            $lookup: {
                from: 'users',
                localField: 'members.userId',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } }
    ]

    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
        pipeline.push({
            $match: {
                $or: [
                    { 'userDetails.fullName': searchRegex },
                    { 'userDetails.email': searchRegex }
                ]
            }
        })
    }

    if (cursor && Types.ObjectId.isValid(cursor)) {
        pipeline.push({
            $match: {
                'members.userId': { $gt: new Types.ObjectId(cursor) }
            }
        })
    }

    pipeline.push({ $sort: { 'members.userId': 1 } })
    pipeline.push({ $limit: limit + 1 })

    pipeline.push({
        $project: {
            _id: 0,
            userId: '$members.userId',
            role: '$members.role',
            joinedAt: '$members.joinedAt',
            status: '$members.status',
            user: {
                _id: '$userDetails._id',
                fullName: '$userDetails.fullName',
                email: '$userDetails.email',
                profileImage: '$userDetails.profileImage'
            }
        }
    })

    const results = await Channel.aggregate(pipeline).exec()

    let nextCursor: string | null = null
    const hasNextPage = results.length > limit
    if (hasNextPage) {
        results.pop()
        const lastItem = results[results.length - 1]
        nextCursor = lastItem.userId.toString()
    }

    return {
        members: results,
        nextCursor
    }
}

