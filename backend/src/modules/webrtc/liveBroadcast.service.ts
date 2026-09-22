import { getIO } from '../../socket'
import { Meeting } from '../meeting/meeting.model'

export interface WebinarStageState {
    meetingId: string
    isWebinarMode: boolean
    stageSpeakers: string[]
    viewersCount: number
    handRaises: Array<{ userId: string; displayName: string; raisedAt: Date }>
}

export class LiveBroadcastService {
    private stageSessions = new Map<string, WebinarStageState>()

    private getOrCreateSession(meetingId: string): WebinarStageState {
        let session = this.stageSessions.get(meetingId)
        if (!session) {
            session = {
                meetingId,
                isWebinarMode: false,
                stageSpeakers: [],
                viewersCount: 0,
                handRaises: []
            }
            this.stageSessions.set(meetingId, session)
        }
        return session
    }

    /**
     * Toggle Webinar Mode (Interactive mesh vs 1000+ View-Only Stage broadcast)
     */
    public async toggleWebinarMode(meetingId: string, enabled: boolean): Promise<{ success: boolean; isWebinarMode: boolean }> {
        const session = this.getOrCreateSession(meetingId)
        session.isWebinarMode = enabled

        try {
            await Meeting.updateOne(
                { $or: [{ meetingId }, { customId: meetingId }] },
                { $set: { isWebinarMode: enabled } }
            )
        } catch (err) {
            console.warn('[LiveBroadcast] Failed to update meeting webinar mode in DB:', err)
        }

        const io = getIO()
        if (io) {
            io.to(`meeting:${meetingId}`).emit('webinar:mode-changed', {
                meetingId,
                isWebinarMode: enabled,
                stageSpeakers: session.stageSpeakers
            })
        }

        return { success: true, isWebinarMode: enabled }
    }

    /**
     * Attendee raises hand to request promotion to Stage Presenter
     */
    public requestToSpeak(meetingId: string, userId: string, displayName: string): boolean {
        const session = this.getOrCreateSession(meetingId)
        if (!session.handRaises.some(h => h.userId === userId)) {
            session.handRaises.push({ userId, displayName, raisedAt: new Date() })
        }

        const io = getIO()
        if (io) {
            io.to(`meeting:${meetingId}`).emit('webinar:hand-raised', {
                meetingId,
                userId,
                displayName,
                raisedAt: new Date().toISOString()
            })
        }
        return true
    }

    /**
     * Host promotes a view-only attendee to live Stage Speaker (mic + camera enabled)
     */
    public async promoteSpeaker(meetingId: string, userId: string, hostName: string = 'Host'): Promise<{ success: boolean; stageSpeakers: string[] }> {
        const session = this.getOrCreateSession(meetingId)
        if (!session.stageSpeakers.includes(userId)) {
            session.stageSpeakers.push(userId)
        }
        session.handRaises = session.handRaises.filter(h => h.userId !== userId)

        try {
            await Meeting.updateOne(
                { $or: [{ meetingId }, { customId: meetingId }] },
                { $addToSet: { stageSpeakers: userId } }
            )
        } catch (err) {
            console.warn('[LiveBroadcast] Failed to update stageSpeakers in DB:', err)
        }

        const io = getIO()
        if (io) {
            io.to(`meeting:${meetingId}`).emit('webinar:speaker-promoted', {
                meetingId,
                userId,
                promotedBy: hostName,
                stageSpeakers: session.stageSpeakers
            })
        }

        return { success: true, stageSpeakers: session.stageSpeakers }
    }

    /**
     * Host demotes a stage speaker back to view-only audience attendee
     */
    public async demoteSpeaker(meetingId: string, userId: string): Promise<{ success: boolean; stageSpeakers: string[] }> {
        const session = this.getOrCreateSession(meetingId)
        session.stageSpeakers = session.stageSpeakers.filter(id => id !== userId)

        try {
            await Meeting.updateOne(
                { $or: [{ meetingId }, { customId: meetingId }] },
                { $pull: { stageSpeakers: userId } }
            )
        } catch (err) {
            console.warn('[LiveBroadcast] Failed to remove stageSpeaker in DB:', err)
        }

        const io = getIO()
        if (io) {
            io.to(`meeting:${meetingId}`).emit('webinar:speaker-demoted', {
                meetingId,
                userId,
                stageSpeakers: session.stageSpeakers
            })
        }

        return { success: true, stageSpeakers: session.stageSpeakers }
    }

    /**
     * Broadcast live floating reactions (claps, hearts, fire, rockets) across all webinar attendees
     */
    public broadcastReaction(meetingId: string, reaction: string, userName: string = 'Attendee'): void {
        const io = getIO()
        if (io) {
            io.to(`meeting:${meetingId}`).emit('webinar:reaction', {
                meetingId,
                reaction,
                userName,
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            })
        }
    }

    /**
     * Get current webinar session state
     */
    public getStatus(meetingId: string): WebinarStageState {
        return this.getOrCreateSession(meetingId)
    }
}

export const liveBroadcastService = new LiveBroadcastService()
