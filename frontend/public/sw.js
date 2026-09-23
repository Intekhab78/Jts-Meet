// JTS Meet — Enterprise Web Push Service Worker
// Handles background incoming call alerts, interactive notifications, and auto-focus

const CACHE_NAME = 'jts-meet-sw-v1'

self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

// Listen for incoming Web Push events from JTS Meet Backend
self.addEventListener('push', (event) => {
    if (!event.data) return

    try {
        const payload = event.data.json()
        const isCall = payload.type === 'call_incoming' || payload.tag === 'incoming-call'

        const title = payload.title || (isCall ? 'Incoming JTS Call' : 'JTS Meet Notification')
        const options = {
            body: payload.body || 'You have an incoming notification',
            icon: payload.icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: payload.tag || (isCall ? 'incoming-call' : 'general-notif'),
            data: payload.data || {},
            renotify: true,
            requireInteraction: isCall ? true : false,
            silent: false,
            vibrate: isCall ? [300, 150, 300, 150, 300, 150, 600] : [200, 100, 200],
            actions: isCall ? [
                { action: 'accept', title: '📞 Accept' },
                { action: 'decline', title: '❌ Decline' }
            ] : [
                { action: 'open', title: 'Open JTS Meet' }
            ]
        }

        event.waitUntil(self.registration.showNotification(title, options))
    } catch (err) {
        console.error('[SW] Error parsing push event:', err)
    }
})

// Handle notification interaction (Accept, Decline, or click)
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const data = event.notification.data || {}
    const meetingId = data.meetingId

    // 1. Handle Decline action
    if (event.action === 'decline' && meetingId) {
        event.waitUntil(
            fetch('/api/notifications/call-reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId,
                    callerId: data.callerId,
                    reason: 'declined_from_push'
                })
            }).catch((err) => {
                console.warn('[SW] Failed to report call rejection:', err)
            })
        )
        return
    }

    // 2. Handle Accept action or notification body click
    const targetUrl = data.url || (meetingId
        ? `/?callMeetingId=${encodeURIComponent(meetingId)}&callerId=${encodeURIComponent(data.callerId || '')}&callerName=${encodeURIComponent(data.callerName || '')}&callType=${encodeURIComponent(data.callType || 'video')}&autoAccept=true`
        : '/')

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If tab is already open, notify client via postMessage and bring to focus
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    client.postMessage({
                        type: 'JTS_PUSH_ACCEPT_CALL',
                        data: {
                            meetingId,
                            callerId: data.callerId,
                            callerName: data.callerName,
                            callerAvatar: data.callerAvatar,
                            callType: data.callType || 'video'
                        }
                    })
                    return client.focus()
                }
            }
            // If tab is closed, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl)
            }
        })
    )
})

// Auto-resubscribe if subscription expires
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then((subscription) => {
                return fetch('/api/notifications/push-subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: subscription.toJSON() })
                })
            })
            .catch((err) => console.warn('[SW] pushsubscriptionchange failed:', err))
    )
})
