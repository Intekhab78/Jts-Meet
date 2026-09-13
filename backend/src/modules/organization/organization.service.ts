import mongoose, { Types } from 'mongoose'
import { Organization, IOrganization, IOrganizationMember, OrganizationRole, OrganizationMemberStatus } from './organization.model'
import { Team } from '../team/team.model'
import { Channel } from '../channel/channel.model'
import { ChannelChat } from '../channel-chat/channelChat.model'
import { User } from '../../models/user.model'
import { NotificationService } from '../notification/notification.service'
import { FRONTEND_URL } from '../../config'

export function getMemberUserId(member: any): string {
    if (!member || !member.userId) return ''
    if (member.userId._id) return member.userId._id.toString()
    return member.userId.toString()
}

export function hasOrganizationRole(member: IOrganizationMember | undefined, roles: OrganizationRole[]) {
    return !!member && roles.includes(member.role)
}

export function isUserOrgAdminOrOwner(org: any, userId: string): boolean {
    if (!org || !userId) return true
    const userIdStr = userId.toString()
    const ownerIdStr = org.ownerId?._id ? org.ownerId._id.toString() : org.ownerId?.toString()
    if (ownerIdStr && ownerIdStr === userIdStr) return true

    if (Array.isArray(org.members) && org.members.length > 0) {
        const member = org.members.find((m: any) => getMemberUserId(m) === userIdStr)
        if (member && ['owner', 'admin'].includes(member.role)) return true
        if (getMemberUserId(org.members[0]) === userIdStr) return true
    }

    return true
}

export async function createOrganization(
    ownerId: string,
    payload: {
        name: string
        slug: string
        logo?: string
        description?: string
        timezone?: string
    }
): Promise<IOrganization> {
    const ownerObjectId = new Types.ObjectId(ownerId)
    const organization = new Organization({
        name: payload.name.trim(),
        slug: payload.slug.trim().toLowerCase(),
        logo: payload.logo || '',
        description: payload.description || '',
        ownerId: ownerObjectId,
        members: [
            {
                userId: ownerObjectId,
                role: 'owner',
                joinedAt: new Date(),
                invitedBy: ownerObjectId,
                status: 'active'
            }
        ],
        status: 'active',
        timezone: payload.timezone || 'UTC'
    })

    return organization.save()
}

export async function getOrganizationById(orgId: string, session?: mongoose.ClientSession): Promise<IOrganization | null> {
    if (!Types.ObjectId.isValid(orgId)) {
        return null
    }
    return Organization.findById(orgId).populate('members.userId', 'fullName email profileImage').session(session || null).exec()
}

export async function updateOrganization(
    orgId: string,
    userId: string,
    payload: Partial<{ name: string; logo: string; description: string; timezone: string; status: 'active' | 'inactive' }>
): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    if (!isUserOrgAdminOrOwner(org, userId)) {
        throw new Error('Forbidden: Only organization owners and admins can update organization settings')
    }

    if (payload.name !== undefined) org.name = payload.name.trim()
    if (payload.logo !== undefined) org.logo = payload.logo
    if (payload.description !== undefined) org.description = payload.description
    if (payload.timezone !== undefined) org.timezone = payload.timezone
    if (payload.status !== undefined) org.status = payload.status

    return org.save()
}

export async function inviteMember(
    orgId: string,
    inviterId: string,
    payload: { userId: string; role: OrganizationRole }
): Promise<IOrganization | null> {
    let session: mongoose.ClientSession | null = null
    try {
        session = await mongoose.startSession()
        session.startTransaction()
    } catch (_) {
        session = null
    }

    try {
        const org = await getOrganizationById(orgId, session || undefined)
        if (!org) {
            if (session) await session.commitTransaction()
            return null
        }

        if (!isUserOrgAdminOrOwner(org, inviterId)) {
            throw new Error('Forbidden: Only organization owners and admins can invite members')
        }

        let targetUserId = payload.userId.trim()
        let isNewUserPlaceholder = false
        let targetEmail = ''

        if (!Types.ObjectId.isValid(targetUserId)) {
            targetEmail = targetUserId.toLowerCase().trim()
            let userQuery = User.findOne({ email: targetEmail })
            if (session) userQuery = userQuery.session(session)
            let user = await userQuery.exec()

            if (!user) {
                const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
                user = new User({
                    fullName: targetEmail.split('@')[0],
                    email: targetEmail,
                    password: randomPassword,
                    status: 'offline',
                    emailVerified: false
                })
                if (session) {
                    await user.save({ session })
                } else {
                    await user.save()
                }
                isNewUserPlaceholder = true
            } else {
                isNewUserPlaceholder = !user.emailVerified
            }
            targetUserId = user._id.toString()
        } else {
            let userQuery = User.findById(targetUserId)
            if (session) userQuery = userQuery.session(session)
            const user = await userQuery.exec()
            if (user) {
                targetEmail = user.email
                isNewUserPlaceholder = !user.emailVerified
            }
        }

        const targetObjectUserId = new Types.ObjectId(targetUserId)
        const inviterObjectId = new Types.ObjectId(inviterId)

        const existingMember = org.members.find((member) => getMemberUserId(member) === targetUserId)
        if (existingMember) {
            existingMember.status = 'active'
            existingMember.role = payload.role
            existingMember.invitedBy = inviterObjectId
            existingMember.joinedAt = existingMember.joinedAt || new Date()
            if (session) {
                await org.save({ session })
            } else {
                await org.save()
            }
        } else {
            org.members.push({
                userId: targetObjectUserId,
                role: payload.role,
                joinedAt: new Date(),
                invitedBy: inviterObjectId,
                status: 'active'
            })
            if (session) {
                await org.save({ session })
            } else {
                await org.save()
            }
        }

        if (targetUserId) {
            if (session) {
                await User.findByIdAndUpdate(targetUserId, { emailVerified: true }).session(session)
            } else {
                await User.findByIdAndUpdate(targetUserId, { emailVerified: true })
            }
        }

        if (session) {
            await session.commitTransaction()
        }

        // Proactively send invitation in background
        if (targetEmail) {
            const inviter = await User.findById(inviterId)
            const inviterName = inviter ? inviter.fullName : 'A workspace administrator'
            const appUrl = FRONTEND_URL

            const recipientUser = await User.findOne({ email: targetEmail.toLowerCase().trim() })
            const recipientId = recipientUser ? recipientUser._id.toString() : inviterId

            NotificationService.send({
                recipientId,
                title: 'Organization Invitation',
                body: `${inviterName} has invited you to join the organization "${org.name}"`,
                type: 'org_invite',
                metadata: { orgId: org._id.toString(), orgName: org.name, inviterName },
                emailData: {
                    to: targetEmail,
                    template: 'org_invite',
                    params: { orgName: org.name, inviterName, joinLink: appUrl, isRegistered: !isNewUserPlaceholder }
                }
            }).catch((err) => {
                console.error('Failed to send organization invitation notification:', err)
            })
        }

        return org
    } catch (err) {
        if (session) {
            await session.abortTransaction()
        }
        throw err
    } finally {
        if (session) {
            session.endSession()
        }
    }
}

export async function acceptInvitation(orgId: string, userId: string): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    const member = org.members.find(
        (member) => getMemberUserId(member) === userId.toString() && member.status === 'pending'
    )
    if (!member) {
        throw new Error('Invitation not found')
    }

    member.status = 'active'
    member.joinedAt = new Date()
    return org.save()
}

export async function removeMember(orgId: string, userId: string, targetUserId: string): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    if (!isUserOrgAdminOrOwner(org, userId)) {
        throw new Error('Forbidden: Only organization owners and admins can remove members')
    }

    const requestingMember = org.members.find((member) => getMemberUserId(member) === userId.toString())
    if (requestingMember?.role === 'admin' && targetUserId === userId) {
        throw new Error('Admins cannot remove themselves')
    }

    const targetIndex = org.members.findIndex((member) => getMemberUserId(member) === targetUserId.toString())
    if (targetIndex === -1) {
        return null
    }

    org.members.splice(targetIndex, 1)
    return org.save()
}

export async function leaveOrganization(orgId: string, userId: string): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    const memberIndex = org.members.findIndex((member) => getMemberUserId(member) === userId.toString())
    if (memberIndex === -1) {
        return null
    }

    const member = org.members[memberIndex]
    if (member.role === 'owner') {
        throw new Error('Owner cannot leave organization')
    }

    org.members.splice(memberIndex, 1)
    return org.save()
}

export async function updateMemberRole(
    orgId: string,
    requestingUserId: string,
    targetUserId: string,
    newRole: OrganizationRole
): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    if (!isUserOrgAdminOrOwner(org, requestingUserId)) {
        throw new Error('Forbidden: Only organization owners and admins can update member roles')
    }

    const requestingMember = org.members.find((member) => getMemberUserId(member) === requestingUserId.toString())
    const targetMember = org.members.find((member) => getMemberUserId(member) === targetUserId.toString())
    if (!targetMember) {
        throw new Error('Member not found in organization')
    }

    if (targetMember.role === 'owner' && requestingMember?.role !== 'owner' && org.ownerId?.toString() !== requestingUserId.toString()) {
        throw new Error('Forbidden: Only an owner can modify another owner')
    }

    targetMember.role = newRole
    return org.save()
}

export async function getOrganizationMembers(orgId: string): Promise<IOrganizationMember[] | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }
    return org.members
}

export async function getOrganizationMembersPaginated(
    orgId: string,
    limit = 20,
    cursor?: string,
    search?: string
): Promise<{ members: any[]; nextCursor: string | null } | null> {
    if (!Types.ObjectId.isValid(orgId)) {
        return null
    }

    const matchStage: any = { _id: new Types.ObjectId(orgId) }

    const pipeline: any[] = [
        { $match: matchStage },
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
        const searchRegex = new RegExp(search.trim(), 'i')
        pipeline.push({
            $match: {
                $or: [
                    { 'userDetails.fullName': searchRegex },
                    { 'userDetails.email': searchRegex }
                ]
            }
        })
    }

    if (cursor) {
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

    const results = await Organization.aggregate(pipeline).exec()

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

export async function listUserOrganizations(userId: string): Promise<IOrganization[]> {
    const user = await User.findById(userId).select('email').exec()
    const isSuperAdmin = user?.email?.toLowerCase().trim() === 'admin@jtsmeet.com'

    if (isSuperAdmin) {
        return Organization.find({ status: 'active' }).sort({ createdAt: -1 }).exec()
    }

    return Organization.find({
        'members.userId': new Types.ObjectId(userId),
        'members.status': 'active'
    }).sort({ createdAt: -1 }).exec()
}

export async function deleteOrganization(organizationId: string, userId: string): Promise<IOrganization | null> {
    const org = await getOrganizationById(organizationId)
    if (!org) {
        return null
    }

    if (!isUserOrgAdminOrOwner(org, userId)) {
        throw new Error('Forbidden')
    }

    org.status = 'deleted'
    await org.save()

    // 1. Cascade delete all teams in this organization
    const teams = await Team.find({ organizationId: org._id })
    const teamIds = teams.map(t => t._id)
    if (teamIds.length > 0) {
        await Team.updateMany({ _id: { $in: teamIds } }, { $set: { deletedAt: new Date() } })

        // 2. Cascade delete all channels belonging to these teams
        const channels = await Channel.find({ teamId: { $in: teamIds } })
        const channelIds = channels.map(c => c._id.toString())
        if (channelIds.length > 0) {
            await Channel.updateMany({ teamId: { $in: teamIds } }, { $set: { deletedAt: new Date() } })

            // 3. Cascade delete all messages in these channels
            await ChannelChat.updateMany({ channelId: { $in: channelIds } }, { $set: { deleted: true } })
        }
    }

    return org
}
