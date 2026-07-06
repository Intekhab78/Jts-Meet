import mongoose, { Types } from 'mongoose'
import { Organization, IOrganization, IOrganizationMember, OrganizationRole, OrganizationMemberStatus } from './organization.model'
import { User } from '../../models/user.model'
import { NotificationService } from '../notification/notification.service'
import { FRONTEND_URL } from '../../config'

export function hasOrganizationRole(member: IOrganizationMember | undefined, roles: OrganizationRole[]) {
    return !!member && roles.includes(member.role)
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

    const currentMember = org.members.find((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (!hasOrganizationRole(currentMember, ['owner', 'admin'])) {
        throw new Error('Forbidden')
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
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const org = await getOrganizationById(orgId, session)
        if (!org) {
            await session.commitTransaction()
            return null
        }

        const inviterMember = org.members.find((member) => member.userId.equals(new Types.ObjectId(inviterId)))
        if (!hasOrganizationRole(inviterMember, ['owner', 'admin'])) {
            throw new Error('Forbidden')
        }

        let targetUserId = payload.userId.trim()
        let isNewUserPlaceholder = false
        let targetEmail = ''

        if (!Types.ObjectId.isValid(targetUserId)) {
            targetEmail = targetUserId.toLowerCase().trim()
            let user = await User.findOne({ email: targetEmail }).session(session)
            if (!user) {
                const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
                user = new User({
                    fullName: targetEmail.split('@')[0],
                    email: targetEmail,
                    password: randomPassword,
                    status: 'offline',
                    emailVerified: false
                })
                await user.save({ session })
                isNewUserPlaceholder = true
            } else {
                isNewUserPlaceholder = !user.emailVerified
            }
            targetUserId = user._id.toString()
        } else {
            const user = await User.findById(targetUserId).session(session)
            if (user) {
                targetEmail = user.email
                isNewUserPlaceholder = !user.emailVerified
            }
        }

        const targetObjectUserId = new Types.ObjectId(targetUserId)

        const existingMember = org.members.find((member) => member.userId.equals(targetObjectUserId))
        if (existingMember) {
            if (existingMember.status === 'removed') {
                existingMember.status = 'pending'
                existingMember.role = payload.role
                existingMember.invitedBy = new Types.ObjectId(inviterId)
                existingMember.joinedAt = null
            }
            await org.save({ session })
        } else {
            org.members.push({
                userId: targetObjectUserId,
                role: payload.role,
                joinedAt: null,
                invitedBy: new Types.ObjectId(inviterId),
                status: 'pending'
            })
            await org.save({ session })
        }

        await session.commitTransaction()

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
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
}

export async function acceptInvitation(orgId: string, userId: string): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    const member = org.members.find(
        (member) => member.userId.equals(new Types.ObjectId(userId)) && member.status === 'pending'
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

    const requestingMember = org.members.find((member) => member.userId.equals(new Types.ObjectId(userId)))
    if (!hasOrganizationRole(requestingMember, ['owner', 'admin'])) {
        throw new Error('Forbidden')
    }

    if (requestingMember?.role === 'admin' && targetUserId === userId) {
        throw new Error('Admins cannot remove themselves')
    }

    const targetIndex = org.members.findIndex((member) => member.userId.equals(new Types.ObjectId(targetUserId)))
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

    const memberIndex = org.members.findIndex((member) => member.userId.equals(new Types.ObjectId(userId)))
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
    return Organization.find({
        'members.userId': new Types.ObjectId(userId),
        'members.status': 'active'
    }).exec()
}
