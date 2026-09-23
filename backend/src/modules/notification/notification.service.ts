import webpush from 'web-push'
import { Types } from 'mongoose'
import { Notification, INotification } from './notification.model'
import { PushSubscription } from '../../models/pushSubscription.model'
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

// ─── Web Push & VAPID Initialization ─────────────────────────────────────────
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@jtsmiddleeast.com'

// If keys are not present in .env, generate runtime keys so push works out of the box
if (!vapidPublicKey || !vapidPrivateKey) {
    try {
        const generatedKeys = webpush.generateVAPIDKeys()
        vapidPublicKey = generatedKeys.publicKey
        vapidPrivateKey = generatedKeys.privateKey
        console.log('[NotificationService] Generated runtime VAPID keys for Web Push.')
    } catch (err) {
        console.warn('[NotificationService] Failed to auto-generate VAPID keys:', err)
    }
}

if (vapidPublicKey && vapidPrivateKey) {
    try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
    } catch (e) {
        console.warn('[NotificationService] setVapidDetails error:', e)
    }
}

export class NotificationService {
    static getVapidPublicKey(): string {
        return vapidPublicKey
    }

    static async savePushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
        if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            throw new Error('Invalid push subscription payload')
        }

        return PushSubscription.findOneAndUpdate(
            {
                userId: new Types.ObjectId(userId),
                endpoint: subscription.endpoint
            },
            {
                $set: {
                    keys: subscription.keys,
                    userAgent: userAgent || ''
                }
            },
            { upsert: true, new: true }
        ).exec()
    }

    static async removePushSubscription(userId: string, endpoint: string) {
        if (!userId || !endpoint) return
        return PushSubscription.deleteOne({
            userId: new Types.ObjectId(userId),
            endpoint
        }).exec()
    }

    /**
     * Dispatches a high-priority Incoming Call Web Push notification.
     * Rings/alerts the target user even if all their browser tabs are closed.
     */
    static async sendIncomingCallPush(targetUserId: string, callData: {
        meetingId: string
        callerName: string
        callerAvatar?: string
        callType?: string
        callerId?: string
    }): Promise<{ dispatched: number }> {
        if (!targetUserId || !callData?.meetingId) return { dispatched: 0 }

        try {
            const subscriptions = await PushSubscription.find({
                userId: new Types.ObjectId(targetUserId)
            }).exec()

            if (!subscriptions || subscriptions.length === 0) {
                return { dispatched: 0 }
            }

            const isAudio = callData.callType === 'audio'
            const payload = JSON.stringify({
                type: 'call_incoming',
                title: isAudio ? `📞 Incoming Audio Call` : `📹 Incoming Video Call`,
                body: `${callData.callerName || 'A colleague'} is calling you on JTS Meet...`,
                icon: callData.callerAvatar || '/favicon.ico',
                tag: `call-${callData.meetingId}`,
                data: {
                    meetingId: callData.meetingId,
                    callerName: callData.callerName,
                    callerAvatar: callData.callerAvatar,
                    callerId: callData.callerId,
                    callType: callData.callType || 'video',
                    url: `/?callMeetingId=${encodeURIComponent(callData.meetingId)}&callerId=${encodeURIComponent(callData.callerId || '')}&callerName=${encodeURIComponent(callData.callerName || '')}&callType=${encodeURIComponent(callData.callType || 'video')}&autoAccept=true`
                }
            })

            let successCount = 0
            const staleEndpoints: string[] = []

            await Promise.all(
                subscriptions.map(async (sub) => {
                    try {
                        await webpush.sendNotification(
                            {
                                endpoint: sub.endpoint,
                                keys: {
                                    p256dh: sub.keys.p256dh,
                                    auth: sub.keys.auth
                                }
                            },
                            payload,
                            {
                                TTL: 60, // 60 seconds TTL (calls are immediate)
                                urgency: 'high'
                            }
                        )
                        successCount++
                    } catch (err: any) {
                        // 404 Not Found or 410 Gone means the subscription is no longer valid / revoked
                        if (err?.statusCode === 404 || err?.statusCode === 410) {
                            staleEndpoints.push(sub.endpoint)
                        } else {
                            console.warn('[Push] Error sending push to endpoint:', err?.message || err)
                        }
                    }
                })
            )

            // Cleanup stale/expired push subscriptions
            if (staleEndpoints.length > 0) {
                await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } }).exec()
            }

            return { dispatched: successCount }
        } catch (error) {
            console.error('[NotificationService] sendIncomingCallPush error:', error)
            return { dispatched: 0 }
        }
    }

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
            // Attempt standard Web Push to user's registered devices first
            const subs = await PushSubscription.find({ userId: new Types.ObjectId(payload.recipientId) }).exec()
            if (subs && subs.length > 0) {
                const pushData = JSON.stringify({
                    type: payload.type,
                    title: payload.title,
                    body: payload.body,
                    icon: '/favicon.ico',
                    data: payload.metadata || {}
                })
                for (const sub of subs) {
                    try {
                        await webpush.sendNotification(
                            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
                            pushData,
                            { TTL: 86400, urgency: 'normal' }
                        )
                    } catch (e: any) {
                        if (e?.statusCode === 404 || e?.statusCode === 410) {
                            await PushSubscription.deleteOne({ _id: sub._id }).exec()
                        }
                    }
                }
            }

            // Fallback to legacy FCM if configured
            const fcmServerKey = process.env.FCM_SERVER_KEY || ''
            const pushEndpoint = payload.metadata?.pushSubscription?.endpoint || payload.metadata?.fcmToken
            if (fcmServerKey && pushEndpoint) {
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
            }
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

