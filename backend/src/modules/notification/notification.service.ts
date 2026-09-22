import { Types } from 'mongoose'
import { Notification, INotification } from './notification.model'
import { sendOTPEmail, sendResetPasswordEmail, sendMeetingInvitationEmail, sendOrganizationInvitationEmail, sendTeamInvitationEmail } from '../../services/email.service'

export interface NotificationPayload {
    recipientId: string
    title: string
    body: string
    type: string
    metadata?: Record<string, any>
    emailData?: {
        to: string
        template: 'otp' | 'reset' | 'meeting_invite' | 'org_invite' | 'team_invite'
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
                        await sendMeetingInvitationEmail(to, params.meetingId, params.meetingTitle, params.hostName, params.inviteLink, {
                            scheduledDate: params.scheduledDate,
                            scheduledTime: params.scheduledTime,
                            teamName: params.teamName
                        })
                        break
                    case 'org_invite':
                        await sendOrganizationInvitationEmail(to, params.orgName, params.inviterName, params.joinLink, params.isRegistered || false)
                        break
                    case 'team_invite':
                        await sendTeamInvitationEmail(to, params.teamName, params.inviterName, params.role || 'member', params.teamLink)
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
        try {
            const fcmServerKey = process.env.FCM_SERVER_KEY || ''
            const pushEndpoint = payload.metadata?.pushSubscription?.endpoint || payload.metadata?.fcmToken
            if (!fcmServerKey || !pushEndpoint) {
                return
            }

            await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${fcmServerKey}`
                },
                body: JSON.stringify({
                    to: pushEndpoint,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        icon: '/favicon.ico',
                        click_action: payload.metadata?.actionUrl || 'https://meet.jtsmiddleeast.com'
                    },
                    data: payload.metadata || {}
                })
            })
        } catch (err) {
            console.warn('[Push Notification] Dispatch failed:', (err as any)?.message || err)
        }
    }

    private static async dispatchSMSNotification(payload: NotificationPayload): Promise<void> {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
            const authToken = process.env.TWILIO_AUTH_TOKEN || ''
            const fromNumber = process.env.TWILIO_PHONE_NUMBER || ''
            const toNumber = payload.metadata?.phoneNumber || payload.metadata?.toPhone

            if (!accountSid || !authToken || !fromNumber || !toNumber) {
                return
            }

            const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
            const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
            const params = new URLSearchParams()
            params.append('From', fromNumber)
            params.append('To', toNumber)
            params.append('Body', `[JTS Meet] ${payload.title}: ${payload.body}`)

            await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            })
        } catch (err) {
            console.warn('[SMS Gateway] Dispatch failed:', (err as any)?.message || err)
        }
    }

    private static async dispatchWebhookNotification(payload: NotificationPayload): Promise<void> {
        try {
            const webhookUrl = payload.metadata?.webhookUrl || process.env.GLOBAL_WEBHOOK_URL
            const webhookSecret = process.env.WEBHOOK_SECRET || 'jts-webhook-secret'

            if (!webhookUrl) return

            const bodyString = JSON.stringify({
                event: payload.type,
                title: payload.title,
                body: payload.body,
                recipientId: payload.recipientId,
                metadata: payload.metadata,
                timestamp: new Date().toISOString()
            })

            const crypto = await import('crypto')
            const signature = crypto.createHmac('sha256', webhookSecret).update(bodyString).digest('hex')

            await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-JTS-Signature': `sha256=${signature}`,
                    'X-JTS-Event': payload.type
                },
                body: bodyString,
                signal: AbortSignal.timeout(5000)
            })
        } catch (err) {
            console.warn('[Webhook] Dispatch failed:', (err as any)?.message || err)
        }
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
