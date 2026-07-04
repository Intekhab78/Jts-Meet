import { AuthenticatedSocket } from './auth'
import { User } from '../models/user.model'

const socketMap = new Map<string, string>()

export function setUserOnline(userId: string, socketId: string) {
    socketMap.set(userId, socketId)
}

export function removeUserSocket(userId: string) {
    socketMap.delete(userId)
}

export function getUserSocket(userId: string) {
    return socketMap.get(userId)
}

export async function markUserOnline(userId: string) {
    await User.findByIdAndUpdate(userId, { status: 'online' }, { new: true }).exec()
}

export async function markUserOffline(userId: string) {
    await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }, { new: true }).exec()
}

export function getOnlineUsers() {
    return Array.from(socketMap.keys())
}
