import webpush from 'web-push'
import { Types } from 'mongoose'
import { Notification, INotification } from './notification.model'
import { PushSubscription } from '../../models/pushSubscription.model'
import { FcmDevice } from '../../models/fcmDevice.model'
import { getFirebaseMessaging } from '../../config/firebase'
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

const sanitizePushAvatar = (avatar?: string): string => {
    if (!avatar || typeof avatar !== 'string') return ''
    const trimmed = avatar.trim()
    // Never embed base64 data URIs or oversized strings in FCM / Web Push payloads (strict 4KB max limit)
    if (!trimmed || trimmed.startsWith('data:') || trimmed.length > 500) return ''
    return trimmed
}

export class NotificationService {
    static getVapidPublicKey(): string {
        return vapidPublicKey
    }

    static async savePushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string, origin?: string) {
        if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            throw new Error('Invalid push subscription payload')
        }

        // Reassign endpoint to current user; purge any previous user associations on this physical browser
        await PushSubscription.deleteMany({
            endpoint: subscription.endpoint,
            userId: { $ne: new Types.ObjectId(userId) }
        }).exec()

        return PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                $set: {
                    userId: new Types.ObjectId(userId),
                    keys: subscription.keys,
                    userAgent: userAgent || '',
                    origin: origin || ''
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

    static async registerFcmDevice(userId: string, fcmToken: string, platform: string = 'android') {
        if (!userId || !fcmToken) return null
        return FcmDevice.findOneAndUpdate(
            { fcmToken },
            {
                userId: new Types.ObjectId(userId),
                fcmToken,
                platform
            },
            { upsert: true, new: true }
        ).exec()
    }

    static async removeFcmDevice(fcmToken: string) {
        if (!fcmToken) return
        return FcmDevice.deleteOne({ fcmToken }).exec()
    }

    /**
     * Dispatches a high-priority Incoming Call Push notification via both Web Push & Native Android FCM.
     * Rings/alerts the target user even if all their browser tabs or mobile apps are closed.
     */
    static async sendIncomingCallPush(targetUserId: string, callData: {
        meetingId: string
        callerName: string
        callerAvatar?: string
        callType?: string
        callerId?: string
    }): Promise<{ dispatched: number }> {
        if (!targetUserId || !callData?.meetingId) return { dispatched: 0 }

        // Hard Guard: Never dispatch incoming call push to the caller themselves!
        if (callData.callerId && String(targetUserId) === String(callData.callerId)) {
            console.log(`[Push] Suppressed self-push: callerId (${callData.callerId}) matches targetUserId`)
            return { dispatched: 0 }
        }

        let successCount = 0

        try {
            // Retrieve caller's registered device tokens/endpoints to avoid notifying any device where caller is logged in
            const callerFcmTokens = new Set<string>()
            const callerPushEndpoints = new Set<string>()
            if (callData.callerId) {
                try {
                    const cUserQuery = Types.ObjectId.isValid(callData.callerId)
                        ? { $or: [{ userId: new Types.ObjectId(callData.callerId) }, { userId: callData.callerId }] }
                        : { userId: callData.callerId }
                    const [cDevices, cSubs] = await Promise.all([
                        FcmDevice.find(cUserQuery).select('fcmToken').lean().exec(),
                        PushSubscription.find(cUserQuery).select('endpoint').lean().exec()
                    ])
                    cDevices?.forEach((d) => callerFcmTokens.add(d.fcmToken))
                    cSubs?.forEach((s) => callerPushEndpoints.add(s.endpoint))
                } catch (_) {}
            }

            // ── 1. Native Android FCM High-Priority Push (Wakes up phone & Rings like WhatsApp) ──
            const userQuery = Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ userId: new Types.ObjectId(targetUserId) }, { userId: targetUserId }] }
                : { userId: targetUserId }
            const fcmDevices = await FcmDevice.find(userQuery).exec()

            console.log(`[FCM] Looking up devices for user ${targetUserId}: found ${fcmDevices?.length || 0} registered devices`)

            // Collect all unique FCM device tokens registered to the callee
            const targetTokens = Array.from(new Set(
                fcmDevices ? fcmDevices.map((d) => d.fcmToken).filter(Boolean) : []
            ))

            if (targetTokens.length > 0) {
                const messaging = getFirebaseMessaging()
                if (messaging) {
                    const isAudio = callData.callType === 'audio'

                    try {
                        const callTitle = isAudio ? `📞 Incoming Audio Call` : `📹 Incoming Video Call`
                        const callBody = `${callData.callerName || 'A colleague'} is calling you on JTS Meet...`
                        const safeCallerAvatar = sanitizePushAvatar(callData.callerAvatar)

                        // For incoming calls, send as High-Priority DATA-ONLY FCM message.
                        // This guarantees Android OS always invokes CallNotificationService.onMessageReceived()
                        // even when the app is completely closed or phone is locked, allowing FullScreenIntent to wake up screen.
                        const fcmResponse = await messaging.sendEachForMulticast({
                            tokens: targetTokens,
                            data: {
                                type: 'incoming_call',
                                meetingId: String(callData.meetingId),
                                callerName: String(callData.callerName || 'Colleague').slice(0, 120),
                                callerAvatar: safeCallerAvatar,
                                callType: String(callData.callType || 'video'),
                                callerId: String(callData.callerId || ''),
                                sentAt: String(Date.now()), // Server NTP timestamp prevents client clock skew drops
                                title: callTitle,
                                body: callBody.slice(0, 200),
                            },
                            android: {
                                priority: 'high',
                                ttl: 60 * 1000, // 60 seconds TTL (in milliseconds for Firebase Admin SDK)
                            }
                        })
                        console.log(`[FCM] Dispatched incoming call push to ${targetUserId}: ${fcmResponse.successCount}/${targetTokens.length} delivered`)
                        successCount += fcmResponse.successCount

                        // Log failures and purge invalid tokens
                        if (fcmResponse.failureCount > 0) {
                            const invalidTokens: string[] = []
                            fcmResponse.responses.forEach((resp: any, idx: number) => {
                                if (!resp.success) {
                                    console.warn(`[FCM] Call push token[${idx}] failed for user ${targetUserId}:`, resp.error?.code, resp.error?.message)
                                    if (
                                        resp.error?.code === 'messaging/registration-token-not-registered' ||
                                        resp.error?.code === 'messaging/invalid-registration-token'
                                    ) {
                                        invalidTokens.push(targetTokens[idx])
                                    }
                                }
                            })
                            if (invalidTokens.length > 0) {
                                FcmDevice.deleteMany({ fcmToken: { $in: invalidTokens } }).exec().catch(() => {})
                            }
                        }
                    } catch (fcmErr: any) {
                        console.warn('[FCM] Error dispatching incoming call push:', fcmErr?.message || fcmErr)
                    }
                }
            }

            // ── 2. Browser Web Push (VAPID) ──
            const subscriptions = await PushSubscription.find({
                userId: new Types.ObjectId(targetUserId)
            }).exec()

            // Filter out stale developer localhost / test endpoints (:3000)
            const validSubscriptions = subscriptions
                ? subscriptions.filter((sub) => {
                    if (!sub.endpoint) return false
                    if (sub.origin && (sub.origin.includes('localhost') || sub.origin.includes('127.0.0.1') || sub.origin.includes(':3000'))) {
                        return false
                    }
                    if (sub.userAgent && (sub.userAgent.includes('localhost') || sub.userAgent.includes('127.0.0.1') || sub.userAgent.includes(':3000'))) {
                        return false
                    }
                    return true
                })
                : []

            if (validSubscriptions.length > 0) {
                const isAudio = callData.callType === 'audio'
                const safePushAvatar = sanitizePushAvatar(callData.callerAvatar)
                const frontendBaseUrl = (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost'))
                    ? process.env.FRONTEND_URL
                    : 'https://meet.jtsmiddleeast.com'

                const callDirectUrl = `${frontendBaseUrl}/?callMeetingId=${encodeURIComponent(callData.meetingId)}&callerId=${encodeURIComponent(callData.callerId || '')}&callerName=${encodeURIComponent(callData.callerName || '')}&callType=${encodeURIComponent(callData.callType || 'video')}&autoAccept=true`

                const payload = JSON.stringify({
                    type: 'call_incoming',
                    title: isAudio ? `📞 Incoming Audio Call` : `📹 Incoming Video Call`,
                    body: `${callData.callerName || 'A colleague'} is calling you on JTS Meet...`,
                    icon: safePushAvatar || '/favicon.ico',
                    tag: `call-${callData.meetingId}`,
                    data: {
                        meetingId: callData.meetingId,
                        callerName: callData.callerName,
                        callerAvatar: safePushAvatar,
                        callerId: callData.callerId,
                        callType: callData.callType || 'video',
                        url: callDirectUrl
                    }
                })

                const staleEndpoints: string[] = []

                await Promise.all(
                    validSubscriptions.map(async (sub) => {
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
                            if ([400, 401, 403, 404, 410].includes(err?.statusCode)) {
                                staleEndpoints.push(sub.endpoint)
                            } else {
                                console.warn('[Push] Error sending push to endpoint:', err?.message || err)
                            }
                        }
                    })
                )

                if (staleEndpoints.length > 0) {
                    await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } }).exec()
                }
            }

            return { dispatched: successCount }
        } catch (error) {
            console.error('[NotificationService] sendIncomingCallPush error:', error)
            return { dispatched: successCount }
        }
    }

    /**
     * Dispatches a silent/high-priority FCM data signal to stop ringing & dismiss call notification
     * on Android devices when the caller cancels/hangs up before the closed app answers.
     */
    static async sendCancelCallPush(targetUserId: string, meetingId?: string): Promise<void> {
        if (!targetUserId) return
        try {
            const userQuery = Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ userId: new Types.ObjectId(targetUserId) }, { userId: targetUserId }] }
                : { userId: targetUserId }
            const fcmDevices = await FcmDevice.find(userQuery).exec()
            const messaging = getFirebaseMessaging()
            if (messaging && fcmDevices && fcmDevices.length > 0) {
                const tokens = Array.from(new Set(fcmDevices.map((d) => d.fcmToken).filter(Boolean)))
                await messaging.sendEachForMulticast({
                    tokens,
                    data: {
                        type: 'call_cancelled',
                        meetingId: String(meetingId || ''),
                    },
                    android: {
                        priority: 'high',
                        ttl: 30 * 1000,
                    }
                }).catch(() => {})
            }
        } catch (_) {}
    }

    /**
     * Dispatches Missed Call notification via FCM & Web Push when a call rings out without answer
     */
    static async sendMissedCallPush(targetUserId: string, data: {
        callerName: string
        callerAvatar?: string
        callType?: string
    }): Promise<void> {
        if (!targetUserId) return

        try {
            const userQuery = Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ userId: new Types.ObjectId(targetUserId) }, { userId: targetUserId }] }
                : { userId: targetUserId }
            const fcmDevices = await FcmDevice.find(userQuery).exec()

            const messaging = getFirebaseMessaging()
            if (messaging && fcmDevices && fcmDevices.length > 0) {
                const tokens = Array.from(new Set(fcmDevices.map((d) => d.fcmToken).filter(Boolean)))
                await messaging.sendEachForMulticast({
                    tokens,
                    data: {
                        type: 'missed_call',
                        callerName: String(data.callerName || 'Colleague'),
                        callType: String(data.callType || 'video'),
                    },
                    notification: {
                        title: 'Missed Call',
                        body: `You missed a ${data.callType || 'video'} call from ${data.callerName}`,
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'missed_calls',
                            priority: 'high',
                            defaultSound: true,
                        }
                    }
                }).catch(() => {})
            }
        } catch (e) {
            console.warn('[NotificationService] sendMissedCallPush error:', e)
        }
    }

    /**
     * Dispatches real-time WhatsApp-style Push Notification for Direct & Channel chat messages
     * Rings/alerts Android device & browser even when app is closed.
     */
    static async sendChatMessagePush(targetUserId: string, messageData: {
        senderId: string
        senderName: string
        senderAvatar?: string
        text: string
        messageId?: string
        isChannel?: boolean
        channelName?: string
    }): Promise<{ dispatched: number }> {
        if (!targetUserId || !messageData?.text) return { dispatched: 0 }

        let successCount = 0

        try {
            const userQuery = Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ userId: new Types.ObjectId(targetUserId) }, { userId: targetUserId }] }
                : { userId: targetUserId }
            const fcmDevices = await FcmDevice.find(userQuery).exec()
            const safeSenderAvatar = sanitizePushAvatar(messageData.senderAvatar)

            const title = messageData.isChannel && messageData.channelName
                ? `#${messageData.channelName} • ${messageData.senderName}`
                : messageData.senderName

            const bodyPreview = messageData.text.length > 120
                ? messageData.text.substring(0, 117) + '...'
                : messageData.text

            // 1. Native Android FCM Push
            const messaging = getFirebaseMessaging()
            if (messaging && fcmDevices && fcmDevices.length > 0) {
                const tokens = Array.from(new Set(fcmDevices.map((d) => d.fcmToken).filter(Boolean)))
                try {
                    const fcmResponse = await messaging.sendEachForMulticast({
                        tokens,
                        notification: {
                            title,
                            body: bodyPreview,
                        },
                        data: {
                            type: 'chat_message',
                            senderId: String(messageData.senderId),
                            senderName: String(messageData.senderName).slice(0, 120),
                            senderAvatar: safeSenderAvatar,
                            message: String(bodyPreview),
                            isChannel: messageData.isChannel ? 'true' : 'false',
                            channelName: String(messageData.channelName || ''),
                            messageId: String(messageData.messageId || '')
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                title,
                                body: bodyPreview,
                                channelId: 'chat_messages',
                                priority: 'high',
                                defaultSound: true,
                                defaultVibrateTimings: true,
                                tag: `chat_${messageData.senderId}`
                            }
                        }
                    })
                    successCount += fcmResponse.successCount
                    console.log(`[FCM] Dispatched chat push to ${targetUserId}: ${fcmResponse.successCount}/${tokens.length} delivered`)

                    // Clean stale tokens if any
                    if (fcmResponse.failureCount > 0) {
                        const invalidTokens: string[] = []
                        fcmResponse.responses.forEach((resp: any, idx: number) => {
                            if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                                invalidTokens.push(tokens[idx])
                            }
                        })
                        if (invalidTokens.length > 0) {
                            FcmDevice.deleteMany({ fcmToken: { $in: invalidTokens } }).exec().catch(() => {})
                        }
                    }
                } catch (fcmErr) {
                    console.warn('[FCM] Error dispatching chat message push:', fcmErr)
                }
            }

            // 2. Web Push (VAPID)
            const subscriptions = await PushSubscription.find({
                userId: new Types.ObjectId(targetUserId)
            }).exec()

            if (subscriptions && subscriptions.length > 0) {
                const payload = JSON.stringify({
                    type: 'chat_message',
                    title,
                    body: bodyPreview,
                    icon: safeSenderAvatar || '/favicon.ico',
                    tag: `chat-${messageData.senderId}`,
                    data: {
                        senderId: messageData.senderId,
                        senderName: messageData.senderName,
                        isChannel: messageData.isChannel,
                        channelName: messageData.channelName,
                        url: `/#chat?userId=${encodeURIComponent(messageData.senderId)}`
                    }
                })

                await Promise.all(
                    subscriptions.map(async (sub) => {
                        try {
                            await webpush.sendNotification(
                                {
                                    endpoint: sub.endpoint,
                                    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
                                },
                                payload,
                                { TTL: 24 * 3600, urgency: 'high' }
                            )
                            successCount++
                        } catch (_) {}
                    })
                )
            }

            return { dispatched: successCount }
        } catch (error) {
            console.error('[NotificationService] sendChatMessagePush error:', error)
            return { dispatched: successCount }
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
                        if ([400, 401, 403, 404, 410].includes(e?.statusCode)) {
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

