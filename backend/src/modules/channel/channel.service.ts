import { Types } from 'mongoose'
import { Channel, IChannel, IChannelMember } from './channel.model'
import { Team } from '../team/team.model'
import { getOrganizationById } from '../organization/organization.service'
import { ChannelTypes, ChannelRoles, ChannelStatuses, GeneralChannelName } from './channel.constants'

function isChannelOwnerOrModerator(channel: IChannel, userId: string) {
    return channel.members.some(
        (member) => member.userId.equals(new Types.ObjectId(userId)) && ['owner', 'moderator'].includes(member.role)
    )
}

function isChannelOwner(channel: IChannel, userId: string) {
    return channel.ownerId.equals(new Types.ObjectId(userId))
}

async function ensureTeamAndOrganizationExist(organizationId: string, teamId: string) {
    const organization = await getOrganizationById(organizationId)
    if (!organization) {
        throw { status: 404, message: 'Organization not found' }
    }

    const team = await Team.findOne({ _id: teamId, organizationId: organization._id, deletedAt: null }).exec()
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

export async function createGeneralChannel(userId: string, organizationId: string, teamId: string): Promise<IChannel> {
    const { team } = await ensureTeamAndOrganizationExist(organizationId, teamId)

    const existing = await Channel.findOne({ teamId: team._id, name: GeneralChannelName, deletedAt: null }).exec()
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

    return channel.save()
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

    const isMember = channel.members.some((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (!isMember) {
        throw { status: 403, message: 'Forbidden' }
    }

    return channel
}

export async function listTeamChannels(teamId: string): Promise<IChannel[]> {
    if (!Types.ObjectId.isValid(teamId)) {
        return []
    }
    return Channel.find({ teamId: new Types.ObjectId(teamId), deletedAt: null }).sort({ createdAt: 1 }).exec()
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

    if (!isChannelOwnerOrModerator(channel, inviterId)) {
        throw new Error('Forbidden')
    }

    const existing = channel.members.find((member) => member.userId.equals(new Types.ObjectId(payload.userId)))
    if (existing) {
        existing.role = payload.role
        existing.invitedBy = new Types.ObjectId(inviterId)
        existing.joinedAt = new Date()
    } else {
        channel.members.push({
            userId: new Types.ObjectId(payload.userId),
            role: payload.role,
            joinedAt: new Date(),
            invitedBy: new Types.ObjectId(inviterId)
        })
    }

    return channel.save()
}

export async function removeChannelMember(channelId: string, requesterId: string, targetUserId: string): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!isChannelOwnerOrModerator(channel, requesterId)) {
        throw new Error('Forbidden')
    }

    const index = channel.members.findIndex((member) => member.userId.equals(new Types.ObjectId(targetUserId)))
    if (index === -1) {
        return null
    }

    if (channel.members[index].role === ChannelRoles.OWNER) {
        throw new Error('Cannot remove channel owner')
    }

    channel.members.splice(index, 1)
    return channel.save()
}

export async function updateChannelMemberRole(channelId: string, requesterId: string, payload: { userId: string; role: 'moderator' | 'member' | 'guest' }): Promise<IChannel | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }

    if (!isChannelOwnerOrModerator(channel, requesterId)) {
        throw new Error('Forbidden')
    }

    const member = channel.members.find((member) => member.userId.equals(new Types.ObjectId(payload.userId)))
    if (!member) {
        return null
    }

    if (member.role === ChannelRoles.OWNER) {
        throw new Error('Cannot change owner role')
    }

    member.role = payload.role
    return channel.save()
}

export async function getChannelMembers(channelId: string): Promise<IChannelMember[] | null> {
    const channel = await getChannel(channelId)
    if (!channel) {
        return null
    }
    return channel.members
}
