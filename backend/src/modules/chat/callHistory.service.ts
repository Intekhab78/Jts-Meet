import { Server } from 'socket.io'
import { Types } from 'mongoose'
import { Message } from './chat.model'
import { SocketEvents } from '../../socket/events'

/**
 * WhatsApp-style Call History for 1-on-1 direct calls.
 *
 * Tracks the lifecycle of every direct call (ringing -> accepted -> ended / missed / declined)
 * and persists a single `messageType: 'call'` entry inside the direct conversation once the call finishes.
 * The `message` text is human readable so older web/mobile clients that only render text keep working.
 */

export type CallLogStatus = 'completed' | 'missed' | 'declined' | 'cancelled'

interface CallSession {
    meetingId: string
    callerId: string
    calleeId: string
    callType: 'audio' | 'video' | 'screenshare'
    startedAt: number
    acceptedAt?: number
    finalized: boolean
}

const callSessions = new Map<string, CallSession>()
// Auto-cleanup for sessions that never receive an end signal (e.g. app killed mid-call)
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000

function formatDuration(totalSeconds: number): string {
    const secs = Math.max(0, Math.round(totalSeconds))
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

function buildCallText(status: CallLogStatus, callType: string, duration: number): string {
    const label = callType === 'video' ? 'video call' : 'voice call'
    const icon = callType === 'video' ? '📹' : '📞'
    switch (status) {
        case 'completed':
            return `${icon} ${label.charAt(0).toUpperCase() + label.slice(1)} • ${formatDuration(duration)}`
        case 'declined':
            return `${icon} Declined ${label}`
        case 'cancelled':
            return `${icon} Cancelled ${label}`
        default:
            return `${icon} Missed ${label}`
    }
}

export function registerCallSession(data: {
    meetingId: string
    callerId: string
    calleeId: string
    callType?: 'audio' | 'video' | 'screenshare'
}) {
    if (!data.meetingId || !data.callerId || !data.calleeId) return
    if (!Types.ObjectId.isValid(data.callerId) || !Types.ObjectId.isValid(data.calleeId)) return
    if (callSessions.has(data.meetingId)) return

    callSessions.set(data.meetingId, {
        meetingId: data.meetingId,
        callerId: String(data.callerId),
        calleeId: String(data.calleeId),
        callType: data.callType || 'audio',
        startedAt: Date.now(),
        finalized: false
    })

    setTimeout(() => {
        const s = callSessions.get(data.meetingId)
        if (s && !s.finalized) {
            // Call was accepted but never received an end signal -> log as completed with elapsed time
            finalizeCallSession(null, data.meetingId, s.acceptedAt ? 'completed' : 'missed').catch(() => {})
        }
        callSessions.delete(data.meetingId)
    }, SESSION_MAX_AGE_MS)
}

export function markCallAccepted(meetingId?: string) {
    if (!meetingId) return
    const s = callSessions.get(meetingId)
    if (s && !s.acceptedAt && !s.finalized) {
        s.acceptedAt = Date.now()
    }
}

export function isCallAccepted(meetingId?: string): boolean {
    if (!meetingId) return false
    return Boolean(callSessions.get(meetingId)?.acceptedAt)
}

/**
 * Resolves the final status when someone ends/cancels a call.
 * - Accepted call ended by anyone => completed
 * - Not accepted, ended by caller => missed (for callee)
 * - Not accepted, ended by callee => declined
 */
export async function endCallSession(io: Server | null, meetingId: string | undefined, endedByUserId?: string) {
    if (!meetingId) return
    const s = callSessions.get(meetingId)
    if (!s || s.finalized) return
    let status: CallLogStatus
    if (s.acceptedAt) {
        status = 'completed'
    } else if (endedByUserId && String(endedByUserId) === s.calleeId) {
        status = 'declined'
    } else {
        status = 'missed'
    }
    await finalizeCallSession(io, meetingId, status)
}

export async function finalizeCallSession(io: Server | null, meetingId: string | undefined, status: CallLogStatus) {
    if (!meetingId) return
    const s = callSessions.get(meetingId)
    if (!s || s.finalized) return
    s.finalized = true

    const endedAt = Date.now()
    const duration = status === 'completed' && s.acceptedAt ? Math.round((endedAt - s.acceptedAt) / 1000) : 0

    try {
        // Idempotent: never write two call log entries for the same meetingId
        const existing = await Message.findOne({ 'callInfo.meetingId': meetingId }).select('_id').lean().exec()
        if (existing) return

        const saved = await new Message({
            sender: new Types.ObjectId(s.callerId),
            receiver: new Types.ObjectId(s.calleeId),
            messageType: 'call',
            message: buildCallText(status, s.callType, duration),
            isDelivered: true,
            isSeen: status !== 'missed',
            callInfo: {
                meetingId,
                callType: s.callType,
                status,
                duration,
                callerId: new Types.ObjectId(s.callerId),
                startedAt: new Date(s.startedAt),
                endedAt: new Date(endedAt)
            }
        }).save()

        const globalIo: Server | null = io || (global as any).io || null
        if (globalIo) {
            const populated: any = await Message.findById(saved._id)
                .populate('sender', 'fullName email profileImage')
                .populate('receiver', 'fullName email profileImage')
                .lean()
                .exec()
            const payload = { ...(populated || saved.toObject()), receiverId: s.calleeId, senderId: s.callerId }
            globalIo.to(`user:${s.calleeId}`).emit(SocketEvents.CHAT_RECEIVE, payload)
            globalIo.to(`user:${s.callerId}`).emit(SocketEvents.CHAT_RECEIVE, payload)
        }
    } catch (err) {
        console.warn('[CallHistory] Failed to persist call log:', (err as any)?.message || err)
    } finally {
        // Keep the finalized marker briefly so late duplicate end signals are ignored
        setTimeout(() => callSessions.delete(meetingId), 30000)
    }
}

