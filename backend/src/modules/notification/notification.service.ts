import { Types } from 'mongoose'
import { Notification, INotification } from './notification.model'
import { sendOTPEmail, sendResetPasswordEmail, sendMeetingInvitationEmail, sendOrganizationInvitationEmail } from '../../services/email.service'

export interface NotificationPayload {
    recipientId: string
    title: string
    body: string
    type: string
    metadata?: Record<string, any>
    emailData?: {
        to: string
        template: 'otp' | 'reset' | 'meeting_invite' | 'org_invite'
        params: Record<string, any>
    }
}

export class NotificationService {
    static async send(payload: NotificationPayload): Promise<INotification> {
        // 1. In-App Notification (Persisted in DB)
        const notif = new Notification({
            recipientId: new Types.ObjectId(payload.recipientId),
            title: payload.title,
            body: payload.body,
            type: payload.type,
            metadata: payload.metadata || {}
        })
        await notif.save()

        // 2. Real-Time Socket.IO (Broadcast)
        try {
            const globalIo = (global as any).io
            if (globalIo) {
                globalIo.to(`user:${payload.recipientId}`).emit('notification:receive', notif.toObject())
            }
        } catch (err) {
            console.error('Failed to dispatch notification over socket:', err)
        }

        // 3. Email Notification Dispatch
        if (payload.emailData) {
            try {
                const { to, template, params } = payload.emailData
                switch (template) {
                    case 'otp':
                        await sendOTPEmail(to, params.code)
                        break
                    case 'reset':
                        await sendResetPasswordEmail(to, params.code)
                        break
                    case 'meeting_invite':
                        await sendMeetingInvitationEmail(to, params.meetingId, params.meetingTitle, params.hostName, params.inviteLink)
                        break
                    case 'org_invite':
                        await sendOrganizationInvitationEmail(to, params.orgName, params.inviterName, params.joinLink, params.isRegistered || false)
                        break
                }
            } catch (err) {
                console.error('Failed to dispatch notification email:', err)
            }
        }

        // 4. Future Ready channels placeholders (SMS, Push notifications, Webhooks)
        await this.dispatchPushNotification(payload)
        await this.dispatchSMSNotification(payload)
        await this.dispatchWebhookNotification(payload)

        return notif
    }

    private static async dispatchPushNotification(payload: NotificationPayload): Promise<void> {
        // Placeholder for FCM / APNs push notifications
        console.log(`[Push Notification Mock] Title: "${payload.title}" dispatched to user ${payload.recipientId}`)
    }

    private static async dispatchSMSNotification(payload: NotificationPayload): Promise<void> {
        // Placeholder for Twilio / SMS Gateway
        console.log(`[SMS Gateway Mock] Dispatched alert text: "${payload.body}" to user ${payload.recipientId}`)
    }

    private static async dispatchWebhookNotification(payload: NotificationPayload): Promise<void> {
        // Placeholder for Webhooks callbacks
        console.log(`[Webhook Callback Mock] Sent event type "${payload.type}" payload to user registered endpoints`)
    }

    // Notification Retrieval & State Modification Actions
    static async getUserNotifications(recipientId: string, limit = 20, cursor?: string): Promise<{ items: INotification[]; nextCursor?: string }> {
        const query: Record<string, any> = {
            recipientId: new Types.ObjectId(recipientId)
        }

        if (cursor && Types.ObjectId.isValid(cursor)) {
            query._id = { $lt: new Types.ObjectId(cursor) }
        }

        const items = await Notification.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .exec()

        const nextCursor = items.length === limit ? items[items.length - 1]._id.toString() : undefined

        return { items, nextCursor }
    }

    static async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
        return Notification.findOneAndUpdate(
            { _id: new Types.ObjectId(notificationId), recipientId: new Types.ObjectId(userId) },
            { $set: { isRead: true, readAt: new Date() } },
            { new: true }
        ).exec()
    }

    static async markAllAsRead(userId: string): Promise<void> {
        await Notification.updateMany(
            { recipientId: new Types.ObjectId(userId), isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        ).exec()
    }
}
