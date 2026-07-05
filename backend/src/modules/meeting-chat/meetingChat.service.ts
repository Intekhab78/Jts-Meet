import { Types } from 'mongoose'
import { MeetingChat, IMeetingChat } from './meetingChat.model'
import { getMeetingByMeetingId } from '../meeting/meeting.service'

export async function createMeetingChat(
    meetingId: string,
    senderId: string,
    message: string
): Promise<IMeetingChat> {
    const meeting = await getMeetingByMeetingId(meetingId)
    if (!meeting || meeting.status !== 'active') {
        throw new Error('Meeting not active')
    }

    const isParticipant = meeting.participants.some((participant) => participant.equals(new Types.ObjectId(senderId)))
    if (!isParticipant) {
        throw new Error('User not a participant of this meeting')
    }

    const chat = new MeetingChat({
        meetingId,
        senderId: new Types.ObjectId(senderId),
        message: message.trim(),
        messageType: 'text'
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

    if (!chat.senderId.equals(new Types.ObjectId(userId))) {
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
    const userObjectId = new Types.ObjectId(userId)
    const chat = await MeetingChat.findById(messageId).exec()
    if (!chat) return null

    // Prevent duplicate reaction of same emoji from same user
    const exists = chat.reactions.some(r => r.userId.equals(userObjectId) && r.emoji === emoji)
    if (exists) {
        return chat
    }

    chat.reactions.push({ userId: userObjectId, emoji, createdAt: new Date() })
    return chat.save()
}

export async function removeMeetingChatReaction(
    messageId: string,
    userId: string,
    emoji: string
): Promise<IMeetingChat | null> {
    const userObjectId = new Types.ObjectId(userId)
    const chat = await MeetingChat.findById(messageId).exec()
    if (!chat) return null

    chat.reactions = chat.reactions.filter(r => !(r.userId.equals(userObjectId) && r.emoji === emoji))
    return chat.save()
}
