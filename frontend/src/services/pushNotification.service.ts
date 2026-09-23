/**
 * JTS Meet — Web Push & Desktop Notification Service
 * Manages Service Worker registration, VAPID key negotiation, and Web Push subscriptions
 */

import { API_BASE } from '../config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

class PushNotificationService {
    private swRegistration: ServiceWorkerRegistration | null = null
    private isSubscribed: boolean = false

    public isSupported(): boolean {
        return (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        )
    }

    public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
        if (!this.isSupported()) return null
        if (this.swRegistration) return this.swRegistration

        try {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
            this.swRegistration = reg
            console.log('[PushService] Service worker registered with scope:', reg.scope)
            return reg
        } catch (error) {
            console.warn('[PushService] Service worker registration failed:', error)
            return null
        }
    }

    /**
     * Requests notification permission from user and subscribes device to Web Push
     */
    public async subscribeUser(token?: string): Promise<boolean> {
        if (!this.isSupported()) return false

        try {
            // 1. Request permission
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                console.log('[PushService] Notification permission was not granted:', permission)
                return false
            }

            // 2. Register Service Worker
            const registration = await this.registerServiceWorker()
            if (!registration) return false

            // Wait for SW to be ready
            const readyReg = await navigator.serviceWorker.ready

            // 3. Fetch VAPID Public Key from backend
            const authToken = token || localStorage.getItem('token') || ''
            const res = await fetch(`${API_BASE}/api/notifications/vapid-public-key`, {
                headers: {
                    'Authorization': authToken ? `Bearer ${authToken}` : '',
                    'Content-Type': 'application/json'
                }
            })

            if (!res.ok) {
                console.warn('[PushService] Failed to fetch VAPID public key:', res.status)
                return false
            }

            const data = await res.json()
            const vapidPublicKey = data?.data?.publicKey
            if (!vapidPublicKey) {
                console.warn('[PushService] No VAPID public key received from backend')
                return false
            }

            // 4. Subscribe to Push Manager
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
            let subscription = await readyReg.pushManager.getSubscription()

            // If existing subscription is invalid or from previous key, refresh it
            if (subscription) {
                try {
                    // Send to backend to ensure it's recorded
                    await fetch(`${API_BASE}/api/notifications/push-subscribe`, {
                        method: 'POST',
                        headers: {
                            'Authorization': authToken ? `Bearer ${authToken}` : '',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ subscription: subscription.toJSON() })
                    })
                } catch {}
            } else {
                subscription = await readyReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey as any
                })
                await fetch(`${API_BASE}/api/notifications/push-subscribe`, {
                    method: 'POST',
                    headers: {
                        'Authorization': authToken ? `Bearer ${authToken}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ subscription: subscription.toJSON() })
                })
            }

            this.isSubscribed = true
            localStorage.setItem('jts_push_subscribed', 'true')
            console.log('[PushService] Web push subscription registered with server!')
            return true
        } catch (error) {
            console.error('[PushService] Error subscribing user to push:', error)
            return false
        }
    }

    /**
     * Show interactive system notification with [Accept] and [Decline] buttons.
     * Uses identical tag: 'incoming-call' so Chrome / Windows deduplicates it to exactly ONE notification!
     */
    public async showIncomingCallNotification(call: {
        callerName: string
        callType?: string
        meetingId: string
        callerAvatar?: string
        callerId?: string
    }) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return
        }

        try {
            const isAudio = call.callType === 'audio'
            const title = isAudio ? '📞 Incoming Audio Call' : '📹 Incoming Video Call'
            const options: any = {
                body: `${call.callerName || 'A colleague'} is calling you on JTS Meet...`,
                icon: call.callerAvatar || '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'incoming-call', // Consistent single tag prevents duplicate notifications!
                renotify: true,
                requireInteraction: true,
                silent: false,
                vibrate: [300, 150, 300, 150, 300, 150, 600],
                data: {
                    meetingId: call.meetingId,
                    callerId: call.callerId,
                    callerName: call.callerName,
                    callerAvatar: call.callerAvatar,
                    callType: call.callType || 'video',
                    url: `/?callMeetingId=${encodeURIComponent(call.meetingId)}&callerId=${encodeURIComponent(call.callerId || '')}&callerName=${encodeURIComponent(call.callerName || '')}&callType=${encodeURIComponent(call.callType || 'video')}&autoAccept=true`
                },
                actions: [
                    { action: 'accept', title: '📞 Accept' },
                    { action: 'decline', title: '❌ Decline' }
                ]
            }

            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready
                if (reg && reg.showNotification) {
                    await reg.showNotification(title, options)
                    return
                }
            }

            // Fallback to standard Notification if service worker is not ready
            const notif = new Notification(title, {
                body: options.body,
                icon: options.icon,
                tag: 'incoming-call',
                requireInteraction: true
            })
            notif.onclick = () => {
                window.focus()
                notif.close()
            }
        } catch (e) {
            console.warn('[PushService] Notification display error:', e)
        }
    }
}

export const pushNotificationService = new PushNotificationService()
