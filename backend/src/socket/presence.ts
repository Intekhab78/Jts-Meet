import { AuthenticatedSocket } from './auth'
import { User } from '../models/user.model'

export type PresenceStatus = 'online' | 'busy' | 'away' | 'dnd' | 'in_meeting' | 'offline'

interface UserPresenceInfo {
    status: PresenceStatus
    customStatus?: string
    lastSeen?: Date
}

const socketMap = new Map<string, string>()
const userStatusMap = new Map<string, UserPresenceInfo>()

export function setUserOnline(userId: string, socketId: string) {
    socketMap.set(userId, socketId)
    const existing = userStatusMap.get(userId)
    userStatusMap.set(userId, {
        status: (existing?.status && existing.status !== 'offline') ? existing.status : 'online',
        customStatus: existing?.customStatus || ''
    })
}

export function removeUserSocket(userId: string) {
    socketMap.delete(userId)
    const existing = userStatusMap.get(userId)
    if (existing) {
        existing.status = 'offline'
        existing.lastSeen = new Date()
    }
}

export function getUserSocket(userId: string) {
    return socketMap.get(userId)
}

export function setUserPresenceState(userId: string, status: PresenceStatus, customStatus?: string) {
    const existing = userStatusMap.get(userId) || { status: 'online' }
    existing.status = status
    if (customStatus !== undefined) {
        existing.customStatus = customStatus
    }
    userStatusMap.set(userId, existing)
}

export function getUserPresenceState(userId: string): UserPresenceInfo {
    return userStatusMap.get(userId) || { 
        status: socketMap.has(userId) ? 'online' : 'offline',
        customStatus: ''
    }
}

export function getAllUserPresences(): Record<string, UserPresenceInfo> {
    const presences: Record<string, UserPresenceInfo> = {}
    for (const [uid, pres] of userStatusMap.entries()) {
        presences[uid] = pres
    }
    for (const onlineUid of socketMap.keys()) {
        if (!presences[onlineUid]) {
            presences[onlineUid] = { status: 'online', customStatus: '' }
        }
    }
    return presences
}

export async function markUserOnline(userId: string) {
    setUserPresenceState(userId, 'online')
    await User.findByIdAndUpdate(userId, { status: 'online' }, { new: true }).exec()
}

export async function markUserOffline(userId: string) {
    setUserPresenceState(userId, 'offline')
    await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }, { new: true }).exec()
}

export async function updateUserStatus(userId: string, status: PresenceStatus, customStatus?: string) {
    setUserPresenceState(userId, status, customStatus)
    const updatePayload: any = { status }
    if (customStatus !== undefined) {
        updatePayload.customStatus = customStatus
    }
    return await User.findByIdAndUpdate(userId, updatePayload, { new: true }).select('status customStatus fullName email profileImage').exec()
}

export function getOnlineUsers() {
    return Array.from(socketMap.keys())
}
