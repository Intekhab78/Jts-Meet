import { Types } from 'mongoose'
import { Organization, IOrganization, IOrganizationMember, OrganizationRole, OrganizationMemberStatus } from './organization.model'
import { User } from '../../models/user.model'

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

export async function getOrganizationById(orgId: string): Promise<IOrganization | null> {
    if (!Types.ObjectId.isValid(orgId)) {
        return null
    }
    return Organization.findById(orgId).populate('members.userId', 'fullName email profileImage').exec()
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
    const org = await getOrganizationById(orgId)
    if (!org) {
        return null
    }

    const inviterMember = org.members.find((member) => member.userId.equals(new Types.ObjectId(inviterId)))
    if (!hasOrganizationRole(inviterMember, ['owner', 'admin'])) {
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

    const existingMember = org.members.find((member) => member.userId.equals(targetObjectUserId))
    if (existingMember) {
        if (existingMember.status === 'removed') {
            existingMember.status = 'pending'
            existingMember.role = payload.role
            existingMember.invitedBy = new Types.ObjectId(inviterId)
            existingMember.joinedAt = null
        }
        return org.save()
    }

    org.members.push({
        userId: targetObjectUserId,
        role: payload.role,
        joinedAt: null,
        invitedBy: new Types.ObjectId(inviterId),
        status: 'pending'
    })

    return org.save()
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

export async function listUserOrganizations(userId: string): Promise<IOrganization[]> {
    return Organization.find({
        'members.userId': new Types.ObjectId(userId),
        'members.status': 'active'
    }).exec()
}
