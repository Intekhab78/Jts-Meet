import { Types } from 'mongoose'
import { MeetingChat, IMeetingChat } from './meetingChat.model'
import { getMeetingByMeetingId } from '../meeting/meeting.service'

export async function createMeetingChat(
    meetingId: string,
    senderId: string,
    message: string,
    senderNameParam?: string
): Promise<IMeetingChat> {
    const meeting = await getMeetingByMeetingId(meetingId)
    if (!meeting || meeting.status !== 'active') {
        throw new Error('Meeting not active')
    }

    const isGuest = senderId.startsWith('guest_')
    const isHostObj = meeting.host._id.toString() === senderId || meeting.host.toString() === senderId
    const isParticipant = isGuest || isHostObj || meeting.participants.some((p) => p._id.toString() === senderId)

    if (!isParticipant) {
        throw new Error('User not a participant of this meeting')
    }

    let senderName = 'Participant'
    if (isGuest) {
        senderName = senderNameParam || 'Guest'
    } else if (isHostObj) {
        senderName = (meeting.host as any).fullName || 'Host'
    } else {
        const found = meeting.participants.find(p => p._id.toString() === senderId)
        if (found) {
            senderName = (found as any).fullName || 'Participant'
        }
    }

    const chat = new MeetingChat({
        meetingId,
        senderId,
        message: message.trim(),
        messageType: 'text',
        senderName
    })
    await chat.save()
    return chat
}

export async function getMeetingChatHistory(
    meetingId: string,
    page = 1,
    limit = 50
): Promise<IMeetingChat[]> {
    const skip = (page - 1) * limit

    return MeetingChat.find({ meetingId, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()
}

export async function softDeleteMeetingChat(messageId: string, userId: string): Promise<IMeetingChat | null> {
    const chat = await MeetingChat.findById(messageId).exec()
    if (!chat) {
        return null
    }

    const isOwner = chat.senderId.equals ? chat.senderId.equals(new Types.ObjectId(userId)) : chat.senderId.toString() === userId;
    if (!isOwner) {
        throw new Error('Cannot delete message you do not own')
    }

    chat.deletedAt = new Date()
    return chat.save()
}

export async function addMeetingChatReaction(
    messageId: string,
    userId: string,
    emoji: string
): Promise<IMeetingChat | null> {

    const chat = await MeetingChat.findById(messageId).exec()
    if (!chat) return null

    // Prevent duplicate reaction of same emoji from same user
    const exists = chat.reactions.some(r => {
        const match = r.userId.equals ? r.userId.equals(new Types.ObjectId(userId)) : r.userId.toString() === userId
        return match && r.emoji === emoji
    })
    if (exists) {
        return chat
    }

    chat.reactions.push({ userId: userId as any, emoji, createdAt: new Date() })
    return chat.save()
}

export async function removeMeetingChatReaction(
    messageId: string,
    userId: string,
    emoji: string
): Promise<IMeetingChat | null> {

    const chat = await MeetingChat.findById(messageId).exec()
    if (!chat) return null

    chat.reactions = chat.reactions.filter(r => {
        const match = r.userId.equals ? r.userId.equals(new Types.ObjectId(userId)) : r.userId.toString() === userId
        return !(match && r.emoji === emoji)
    })
    return chat.save()
}
