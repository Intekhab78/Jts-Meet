import mongoose, { Types } from 'mongoose'
import { Team, ITeam, ITeamMember } from './team.model'
import { User } from '../../models/user.model'
import { TeamVisibility, TeamRoles, TeamStatuses } from './team.constants'
import { getOrganizationById } from '../organization/organization.service'
import { createGeneralChannel } from '../channel/channel.service'
import { NotificationService } from '../notification/notification.service'

function isTeamOwnerOrAdmin(team: ITeam, userId: string) {
    const member = team.members.find((member) => member.userId.equals(new Types.ObjectId(userId)))
    return !!member && ['owner', 'admin'].includes(member.role)
}

export async function createTeam(userId: string, payload: {
    organizationId: string
    name: string
    description?: string
    icon?: string
    color?: string
    visibility: 'public' | 'private'
}): Promise<ITeam> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const organization = await getOrganizationById(payload.organizationId, session)
        if (!organization) {
            throw { status: 404, message: 'Organization not found' }
        }

        const existingTeam = await Team.findOne({ organizationId: organization._id, name: payload.name.trim(), deletedAt: null }).session(session).exec()
        if (existingTeam) {
            throw { status: 409, message: 'Team name already exists in organization' }
        }

        const team = new Team({
            organizationId: organization._id,
            name: payload.name.trim(),
            description: payload.description || '',
            icon: payload.icon || '',
            color: payload.color || '#3366FF',
            visibility: payload.visibility,
            ownerId: new Types.ObjectId(userId),
            createdBy: new Types.ObjectId(userId),
            status: TeamStatuses.ACTIVE,
            members: [
                {
                    userId: new Types.ObjectId(userId),
                    role: TeamRoles.OWNER,
                    joinedAt: new Date(),
                    invitedBy: new Types.ObjectId(userId)
                }
            ]
        })

        const savedTeam = await team.save({ session })
        await createGeneralChannel(userId, savedTeam.organizationId.toHexString(), savedTeam._id.toHexString(), session)

        await session.commitTransaction()
        return savedTeam
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
}

export async function getTeam(teamId: string): Promise<ITeam | null> {
    if (!Types.ObjectId.isValid(teamId)) {
        return null
    }
    return Team.findOne({ _id: teamId, deletedAt: null }).populate('members.userId', 'fullName email profileImage').exec()
}

export async function listOrganizationTeams(organizationId: string): Promise<ITeam[]> {
    if (!Types.ObjectId.isValid(organizationId)) {
        return []
    }

    return Team.find({ organizationId: new Types.ObjectId(organizationId), deletedAt: null }).sort({ createdAt: -1 }).exec()
}

export async function updateTeam(teamId: string, userId: string, payload: {
    name?: string
    description?: string
    icon?: string
    color?: string
    visibility?: 'public' | 'private'
    status?: 'active' | 'inactive'
}): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    if (!isTeamOwnerOrAdmin(team, userId)) {
        throw new Error('Forbidden')
    }

    if (payload.name && payload.name.trim() !== team.name) {
        const duplicate = await Team.findOne({ organizationId: team.organizationId, name: payload.name.trim(), deletedAt: null }).exec()
        if (duplicate) {
            throw { status: 409, message: 'Team name already exists in organization' }
        }
        team.name = payload.name.trim()
    }

    if (payload.description !== undefined) team.description = payload.description
    if (payload.icon !== undefined) team.icon = payload.icon
    if (payload.color !== undefined) team.color = payload.color
    if (payload.visibility !== undefined) team.visibility = payload.visibility
    if (payload.status !== undefined) team.status = payload.status

    return team.save()
}

export async function deleteTeam(teamId: string, userId: string): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    if (!isTeamOwnerOrAdmin(team, userId)) {
        throw new Error('Forbidden')
    }

    team.deletedAt = new Date()
    return team.save()
}

export async function inviteTeamMember(teamId: string, inviterId: string, payload: { userId: string; role: 'admin' | 'member' | 'guest' }): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    if (!isTeamOwnerOrAdmin(team, inviterId)) {
        throw new Error('Forbidden')
    }

    let targetUserId = payload.userId.trim()
    if (!Types.ObjectId.isValid(targetUserId)) {
        const user = await User.findOne({ email: targetUserId.toLowerCase() })
        if (!user) {
            throw new Error('User not found with this email address')
        }
        targetUserId = user._id.toString()
    }

    const targetObjectUserId = new Types.ObjectId(targetUserId)

    const existing = team.members.find((member) => member.userId.equals(targetObjectUserId))
    if (existing) {
        existing.role = payload.role
        existing.invitedBy = new Types.ObjectId(inviterId)
        existing.joinedAt = new Date()
    } else {
        team.members.push({
            userId: targetObjectUserId,
            role: payload.role,
            joinedAt: new Date(),
            invitedBy: new Types.ObjectId(inviterId)
        })
    }

    const savedTeam = await team.save()

    // Trigger invitation notifications asynchronously
    if (savedTeam) {
        (async () => {
            try {
                const inviter = await User.findById(inviterId)
                const inviterName = inviter ? inviter.fullName : 'A team manager'
                
                await NotificationService.send({
                    recipientId: targetUserId,
                    title: 'Team Invitation',
                    body: `${inviterName} has added you to the team "${team.name}"`,
                    type: 'team_invite',
                    metadata: { teamId, teamName: team.name, inviterName }
                })
            } catch (err) {
                console.error('Failed to send team invitation notification:', err)
            }
        })()
    }

    return savedTeam
}

export async function joinPublicTeam(teamId: string, userId: string): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    if (team.visibility !== TeamVisibility.PUBLIC) {
        throw new Error('Team is private')
    }

    const alreadyMember = team.members.some((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (!alreadyMember) {
        team.members.push({
            userId: new Types.ObjectId(userId),
            role: TeamRoles.MEMBER,
            joinedAt: new Date(),
            invitedBy: team.ownerId
        })
    }

    return team.save()
}

export async function leaveTeam(teamId: string, userId: string): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    const memberIndex = team.members.findIndex((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (memberIndex === -1) {
        return null
    }

    const member = team.members[memberIndex]
    if (member.role === TeamRoles.OWNER) {
        throw new Error('Team owner cannot leave the team')
    }

    team.members.splice(memberIndex, 1)
    return team.save()
}

export async function removeTeamMember(teamId: string, requesterId: string, targetUserId: string): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    if (!isTeamOwnerOrAdmin(team, requesterId)) {
        throw new Error('Forbidden')
    }

    const memberIndex = team.members.findIndex((member) => member.userId.equals(new Types.ObjectId(targetUserId)))
    if (memberIndex === -1) {
        return null
    }

    const member = team.members[memberIndex]
    if (member.role === TeamRoles.OWNER) {
        throw new Error('Cannot remove team owner')
    }

    team.members.splice(memberIndex, 1)
    return team.save()
}

export async function updateTeamMemberRole(teamId: string, requesterId: string, payload: { userId: string; role: 'admin' | 'member' | 'guest' }): Promise<ITeam | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }

    if (!isTeamOwnerOrAdmin(team, requesterId)) {
        throw new Error('Forbidden')
    }

    const member = team.members.find((member) => member.userId.equals(new Types.ObjectId(payload.userId)))
    if (!member) {
        return null
    }

    if (member.role === TeamRoles.OWNER) {
        throw new Error('Cannot change owner role')
    }

    member.role = payload.role
    return team.save()
}

export async function getTeamMembers(teamId: string): Promise<ITeamMember[] | null> {
    const team = await getTeam(teamId)
    if (!team) {
        return null
    }
    return team.members
}

export async function getTeamMembersPaginated(
    teamId: string,
    limit = 20,
    cursor?: string,
    search?: string
): Promise<{ members: any[]; nextCursor: string | null } | null> {
    if (!Types.ObjectId.isValid(teamId)) {
        return null
    }

    const pipeline: any[] = [
        { $match: { _id: new Types.ObjectId(teamId), deletedAt: null } },
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

    const results = await Team.aggregate(pipeline).exec()

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

